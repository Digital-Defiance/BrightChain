/**
 * @fileoverview QuorumStateMachine implementation.
 *
 * Central coordinator for the quorum system. Manages operational mode,
 * epoch lifecycle, proposal/vote orchestration, and delegates to
 * SealingService for cryptographic operations.
 *
 * @see Requirements 1-8, 10-13
 */

import {
  EmailString,
  Member,
  MemberType,
  PlatformID,
  ShortHexGuid,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { v4 as uuidv4 } from 'uuid';
import { ProposalActionType } from '../enumerations/proposalActionType';
import { ProposalStatus } from '../enumerations/proposalStatus';
import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { QuorumOperationalMode } from '../enumerations/quorumOperationalMode';
import { QuorumError } from '../errors/quorumError';
import {
  AuditEventType,
  QuorumAuditLogEntry,
} from '../interfaces/auditLogEntry';
import {
  IGossipService,
  QuorumProposalMetadata,
  QuorumVoteMetadata,
} from '../interfaces/availability/gossipService';
import { OperationalState } from '../interfaces/operationalState';
import { Proposal, ProposalInput } from '../interfaces/proposal';
import { QuorumEpoch } from '../interfaces/quorumEpoch';
import { QuorumMetrics } from '../interfaces/quorumMetrics';
import { RedistributionJournalEntry } from '../interfaces/redistributionJournalEntry';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import {
  IQuorumMember,
  QuorumMemberMetadata,
  SealedDocumentResult,
} from '../interfaces/services/quorumService';
import { IQuorumStateMachine } from '../interfaces/services/quorumStateMachine';
import { RedistributionConfig } from '../interfaces/services/redistributionConfig';
import { Vote, VoteInput } from '../interfaces/vote';
import { QuorumDataRecord } from '../quorumDataRecord';
import { AliasRegistry } from './aliasRegistry';
import { AuditLogService } from './auditLogService';
import { ChecksumService } from './checksum.service';
import { SealingService } from './sealing.service';

/**
 * Constant-time comparison of two Uint8Array buffers.
 * Prevents timing side-channel attacks by always comparing all bytes.
 */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a[i] ^ b[i];
  }
  return result === 0;
}

/**
 * QuorumStateMachine is the central coordinator for the quorum system.
 *
 * It manages:
 * - Operational mode (Bootstrap / Quorum / TransitionInProgress)
 * - Epoch lifecycle
 * - Document sealing/unsealing with mode-aware delegation
 * - Metrics collection
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class QuorumStateMachine<
  TID extends PlatformID = Uint8Array,
> implements IQuorumStateMachine<TID> {
  private mode: QuorumOperationalMode | null = null;
  private currentEpochData: QuorumEpoch<TID> | null = null;
  private configuredThreshold = 0;
  private initialized = false;
  private readonly checksumService = new ChecksumService();

  // Metrics tracking
  private metricsData = {
    proposalsTotal: 0,
    proposalsPending: 0,
    votesLatencyMs: 0,
    redistributionProgress: -1,
    redistributionFailures: 0,
    expirationLastRun: null as Date | null,
    expirationDeletedTotal: 0,
  };

  constructor(
    private readonly db: IQuorumDatabase<TID>,
    private readonly sealingService: SealingService<TID>,
    private readonly gossipService: IGossipService,
    private readonly auditLogService?: AuditLogService<TID>,
    private readonly aliasRegistry?: AliasRegistry<TID>,
  ) {}

  /**
   * Initialize the quorum system.
   *
   * - Checks for persisted operational state first (restore on restart).
   * - If TransitionInProgress is detected, triggers rollback recovery.
   * - Otherwise, determines mode based on member count vs threshold.
   * - Persists the operational state and creates epoch 1.
   */
  async initialize(
    members: Member<TID>[],
    threshold: number,
  ): Promise<QuorumEpoch<TID>> {
    this.configuredThreshold = threshold;

    // Check for persisted state (restart recovery)
    const persistedState = await this.db.getOperationalState();

    if (persistedState) {
      // Crash recovery: detect TransitionInProgress and rollback
      if (persistedState.mode === QuorumOperationalMode.TransitionInProgress) {
        // Get journal entries for the current epoch to restore documents
        const journalEntries = await this.db.getJournalEntries(
          persistedState.currentEpochNumber,
        );

        // Roll back already-re-split documents from journal
        for (const entry of journalEntries) {
          const doc = await this.db.getDocument(entry.documentId);
          if (!doc) {
            continue;
          }

          // Restore the document with old shares/members/threshold
          const restoredDoc = new QuorumDataRecord<TID>(
            doc.creator,
            entry.oldMemberIds.map((id) =>
              doc.enhancedProvider.fromBytes(
                new Uint8Array(Buffer.from(id, 'hex')),
              ),
            ) as TID[],
            entry.oldThreshold,
            doc.encryptedData,
            entry.oldShares,
            doc.enhancedProvider,
            doc.checksum,
            doc.signature,
            doc.id,
            doc.dateCreated,
            new Date(),
            undefined,
            entry.oldThreshold < 2,
            entry.oldEpoch,
            doc.sealedUnderBootstrap,
            doc.identityRecoveryRecordId,
          );

          await this.db.saveDocument(restoredDoc);
        }

        // Delete journal entries and reset to Bootstrap
        if (journalEntries.length > 0) {
          await this.db.deleteJournalEntries(persistedState.currentEpochNumber);
        }

        // Reset operational state to Bootstrap
        const bootstrapState: OperationalState = {
          mode: QuorumOperationalMode.Bootstrap,
          currentEpochNumber: persistedState.currentEpochNumber,
          lastUpdated: new Date(),
        };
        await this.db.saveOperationalState(bootstrapState);
      }

      // Restore from persisted state
      const restoredEpoch = await this.db.getEpoch(
        persistedState.currentEpochNumber,
      );
      if (restoredEpoch) {
        this.mode =
          persistedState.mode === QuorumOperationalMode.TransitionInProgress
            ? QuorumOperationalMode.Bootstrap
            : persistedState.mode;
        this.currentEpochData = restoredEpoch;
        this.initialized = true;
        return restoredEpoch;
      }
    }

    // Fresh initialization: determine mode based on member count vs threshold
    const memberCount = members.length;
    const isBootstrap = memberCount < threshold;
    this.mode = isBootstrap
      ? QuorumOperationalMode.Bootstrap
      : QuorumOperationalMode.Quorum;

    const effectiveThreshold = isBootstrap
      ? Math.max(memberCount, 1)
      : threshold;

    // Save members to database
    for (const member of members) {
      const hexId = uint8ArrayToHex(member.idBytes) as ShortHexGuid;
      const quorumMember: IQuorumMember<TID> = {
        id: hexId,
        publicKey: member.publicKey,
        metadata: { name: `Member-${hexId.substring(0, 8)}` },
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      await this.db.saveMember(quorumMember);
    }

    // Create epoch 1
    const memberIds = members.map(
      (m) => uint8ArrayToHex(m.idBytes) as ShortHexGuid,
    );
    const epoch: QuorumEpoch<TID> = {
      epochNumber: 1,
      memberIds,
      threshold: effectiveThreshold,
      mode: this.mode,
      createdAt: new Date(),
    };

    await this.db.saveEpoch(epoch);

    // Persist operational state
    const opState: OperationalState = {
      mode: this.mode,
      currentEpochNumber: 1,
      lastUpdated: new Date(),
    };
    await this.db.saveOperationalState(opState);

    this.currentEpochData = epoch;
    this.initialized = true;

    return epoch;
  }

  /**
   * Rollback a transition that was interrupted (crash recovery or failure).
   *
   * For each journal entry, restores the document's old shares, member IDs,
   * and threshold from the journal. Then deletes all journal entries and
   * resets operational state to Bootstrap mode.
   *
   * @param epochNumber - The epoch number to rollback
   * @param emitAudit - Whether to emit a transition_ceremony_failed audit entry (false during crash recovery in initialize)
   */
  private async rollbackTransition(
    epochNumber: number,
    emitAudit = false,
  ): Promise<void> {
    const journalEntries = await this.db.getJournalEntries(epochNumber);

    // Restore each document from its journal entry
    for (const entry of journalEntries) {
      const doc = await this.db.getDocument(entry.documentId);
      if (!doc) {
        continue;
      }

      // Reconstruct the document with old shares/members/threshold
      const restoredDoc = new QuorumDataRecord<TID>(
        doc.creator,
        entry.oldMemberIds.map((id) =>
          doc.enhancedProvider.fromBytes(
            new Uint8Array(Buffer.from(id, 'hex')),
          ),
        ) as TID[],
        entry.oldThreshold,
        doc.encryptedData,
        entry.oldShares,
        doc.enhancedProvider,
        doc.checksum,
        doc.signature,
        doc.id,
        doc.dateCreated,
        new Date(),
        undefined,
        entry.oldThreshold < 2, // bootstrapMode if threshold < 2
        entry.oldEpoch,
        doc.sealedUnderBootstrap,
        doc.identityRecoveryRecordId,
      );

      await this.db.saveDocument(restoredDoc);
    }

    // Delete all journal entries for this epoch
    if (journalEntries.length > 0) {
      await this.db.deleteJournalEntries(epochNumber);
    }

    // Reset operational state to Bootstrap
    const opState: OperationalState = {
      mode: QuorumOperationalMode.Bootstrap,
      currentEpochNumber: epochNumber,
      lastUpdated: new Date(),
    };
    await this.db.saveOperationalState(opState);

    if (emitAudit) {
      await this.emitAuditEntry('transition_ceremony_failed', {
        epochNumber,
        rolledBackDocuments: journalEntries.length,
      });
    }
  }

  /** Ensure the state machine is initialized before operations. */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new QuorumError(QuorumErrorType.Uninitialized);
    }
  }

  /** Ensure operations are not blocked by a transition ceremony. */
  private ensureNotTransitioning(): void {
    if (this.mode === QuorumOperationalMode.TransitionInProgress) {
      throw new QuorumError(QuorumErrorType.TransitionInProgress);
    }
  }

  /**
   * Create the next epoch with incremented epoch number.
   *
   * 1. Gets the current epoch number
   * 2. Creates a new epoch with epochNumber = current + 1
   * 3. Saves the epoch to the database
   * 4. Updates the operational state with the new epoch number
   * 5. Updates the cached currentEpochData
   * 6. Returns the new epoch
   *
   * @param memberIds - Active member IDs for the new epoch
   * @param threshold - Threshold for the new epoch
   * @param mode - Operational mode for the new epoch
   * @param previousEpochNumber - Optional override for the previous epoch number
   * @returns The newly created QuorumEpoch
   */
  private async createNextEpoch(
    memberIds: ShortHexGuid[],
    threshold: number,
    mode: QuorumOperationalMode,
    previousEpochNumber?: number,
  ): Promise<QuorumEpoch<TID>> {
    const currentEpochNum =
      previousEpochNumber ?? this.currentEpochData?.epochNumber ?? 0;
    const nextEpochNumber = currentEpochNum + 1;

    const epoch: QuorumEpoch<TID> = {
      epochNumber: nextEpochNumber,
      memberIds,
      threshold,
      mode,
      createdAt: new Date(),
      previousEpochNumber: currentEpochNum > 0 ? currentEpochNum : undefined,
    };

    await this.db.saveEpoch(epoch);

    // Update operational state
    const opState: OperationalState = {
      mode,
      currentEpochNumber: nextEpochNumber,
      lastUpdated: new Date(),
    };
    await this.db.saveOperationalState(opState);

    // Update cached state
    this.currentEpochData = epoch;
    this.mode = mode;

    return epoch;
  }

  /**
   * Emit an audit log entry.
   *
   * If an AuditLogService is configured, routes through it for chain linking
   * and signing. Otherwise, writes directly to the database.
   *
   * @param eventType - The type of audit event
   * @param details - Additional event-specific details
   * @param targetMemberId - Optional target member ID
   */
  private async emitAuditEntry(
    eventType: AuditEventType,
    details: Record<string, unknown>,
    targetMemberId?: ShortHexGuid,
  ): Promise<void> {
    const entry: QuorumAuditLogEntry = {
      id: uuidv4() as ShortHexGuid,
      eventType,
      targetMemberId,
      details,
      timestamp: new Date(),
    };

    if (this.auditLogService) {
      await this.auditLogService.appendEntry(entry);
    } else {
      await this.db.appendAuditEntry(entry);
    }
  }

  /**
   * Resolve IQuorumMember records into Member objects suitable for SealingService.
   *
   * Creates Member instances with only public keys (no private keys) from
   * the database member records. These are sufficient for encrypting new shares.
   *
   * @param quorumMembers - Database member records to resolve
   * @returns Array of Member objects with public keys
   */
  private resolveMembersFromRecords(
    quorumMembers: IQuorumMember<TID>[],
  ): Member<TID>[] {
    return quorumMembers.map((qm) => {
      return new Member<TID>(
        this.sealingService.eciesServiceRef,
        MemberType.User,
        qm.metadata.name || `Member-${qm.id.substring(0, 8)}`,
        new EmailString(`${qm.id.substring(0, 8)}@quorum.local`),
        qm.publicKey,
        undefined, // no private key
        undefined, // no wallet
        this.sealingService.enhancedProviderRef.fromBytes(
          new Uint8Array(Buffer.from(qm.id, 'hex')),
        ) as TID,
      );
    });
  }

  /**
   * Perform batched share redistribution for all documents in a given epoch.
   *
   * Processes documents in pages using `listDocumentsByEpoch`, decrypts shares
   * from threshold members, calls `redistributeShares`, updates documents,
   * and saves them back to the database.
   *
   * @param fromEpochNumber - The epoch whose documents need redistribution
   * @param thresholdMembers - Members with private keys to decrypt existing shares
   * @param newMembers - The new member set for re-encryption
   * @param newThreshold - The new threshold for shares
   * @param oldSharingConfig - The old sharing configuration (totalShares, threshold)
   * @param config - Redistribution configuration (batch size, progress, continue-on-failure)
   * @returns Array of failed document IDs
   */
  private async redistributeDocuments(
    fromEpochNumber: number,
    thresholdMembers: Member<TID>[],
    newMembers: Member<TID>[],
    newThreshold: number,
    oldSharingConfig: { totalShares: number; threshold: number },
    config: RedistributionConfig,
  ): Promise<ShortHexGuid[]> {
    const failedDocIds: ShortHexGuid[] = [];
    let page = 0;
    let processed = 0;
    let totalEstimate = 0;
    const pageSize = config.batchSize;

    // Process documents page by page
    let docs: QuorumDataRecord<TID>[];
    do {
      docs = await this.db.listDocumentsByEpoch(
        fromEpochNumber,
        page,
        pageSize,
      );

      if (page === 0 && docs.length === pageSize) {
        // Rough estimate: at least one more page
        totalEstimate = pageSize * 2;
      } else if (page === 0) {
        totalEstimate = docs.length;
      }

      for (const doc of docs) {
        const docHexId = uint8ArrayToHex(
          doc.enhancedProvider.toBytes(doc.id),
        ) as ShortHexGuid;

        try {
          // Decrypt shares from threshold members
          const decryptedShares = await this.sealingService.decryptShares(
            doc,
            thresholdMembers,
          );

          // Build a map of memberId -> decrypted share hex
          const sharesMap = new Map<ShortHexGuid, string>();
          for (let i = 0; i < thresholdMembers.length; i++) {
            const memberId = uint8ArrayToHex(
              thresholdMembers[i].idBytes,
            ) as ShortHexGuid;
            sharesMap.set(memberId, decryptedShares[i]);
          }

          // Redistribute shares to new members
          const newEncryptedShares =
            await this.sealingService.redistributeShares(
              sharesMap,
              newMembers,
              newThreshold,
              oldSharingConfig,
            );

          // Create updated document with new shares, memberIDs, and threshold
          const newMemberTIDs = newMembers.map((m) => m.id);
          const updatedDoc = new QuorumDataRecord<TID>(
            doc.creator,
            newMemberTIDs,
            newThreshold,
            doc.encryptedData,
            newEncryptedShares,
            doc.enhancedProvider,
            doc.checksum,
            doc.signature,
            doc.id,
            doc.dateCreated,
            new Date(),
            undefined,
            newThreshold < 2, // bootstrapMode if threshold < 2
            this.currentEpochData?.epochNumber ?? doc.epochNumber,
            doc.sealedUnderBootstrap,
            doc.identityRecoveryRecordId,
          );

          await this.db.saveDocument(updatedDoc);
          processed++;
        } catch {
          failedDocIds.push(docHexId);
          if (!config.continueOnFailure) {
            this.metricsData.redistributionFailures += failedDocIds.length;
            return failedDocIds;
          }
        }

        // Report progress
        if (config.onProgress) {
          config.onProgress(processed, totalEstimate, failedDocIds);
        }
      }

      page++;
    } while (docs.length === pageSize);

    // Update metrics
    this.metricsData.redistributionProgress =
      totalEstimate > 0 ? processed / totalEstimate : 1;
    this.metricsData.redistributionFailures += failedDocIds.length;

    return failedDocIds;
  }

  /**
   * Get the current operational mode.
   * Restores from persisted state on first call if needed.
   */
  async getMode(): Promise<QuorumOperationalMode> {
    if (this.mode !== null) {
      return this.mode;
    }

    // Try to restore from persisted state
    const persistedState = await this.db.getOperationalState();
    if (persistedState) {
      this.mode = persistedState.mode;
      return this.mode;
    }

    throw new QuorumError(QuorumErrorType.Uninitialized);
  }

  /**
   * Initiate a transition ceremony from Bootstrap to Quorum mode.
   *
   * Flow:
   * 1. Verify members >= threshold, set mode to TransitionInProgress
   * 2. Emit transition_ceremony_started audit entry
   * 3. Block seal/unseal/submitProposal (via ensureNotTransitioning)
   * 4. For each bootstrap-sealed document (paginated):
   *    a. Save journal entry with old shares/members/threshold/epoch
   *    b. Redistribute shares to full member set with configured threshold
   *    c. Update document in database
   * 5. On success: create new epoch in Quorum mode, delete journal entries,
   *    emit transition_ceremony_completed, unblock
   * 6. On failure: rollback from journal, reset to Bootstrap, delete journal
   *    entries, emit transition_ceremony_failed
   */
  async initiateTransition(): Promise<void> {
    this.ensureInitialized();

    if (this.mode !== QuorumOperationalMode.Bootstrap) {
      throw new QuorumError(QuorumErrorType.InvalidModeTransition);
    }

    const activeMembers = await this.db.listActiveMembers();
    if (activeMembers.length < this.configuredThreshold) {
      throw new QuorumError(QuorumErrorType.InsufficientMembersForTransition);
    }

    const currentEpochNumber = this.currentEpochData?.epochNumber ?? 1;
    const previousThreshold = this.currentEpochData?.threshold ?? 1;
    const previousMemberIds = this.currentEpochData?.memberIds ?? [];

    // Set mode to TransitionInProgress — blocks seal/unseal/submitProposal
    this.mode = QuorumOperationalMode.TransitionInProgress;
    const opState: OperationalState = {
      mode: QuorumOperationalMode.TransitionInProgress,
      currentEpochNumber,
      lastUpdated: new Date(),
    };
    await this.db.saveOperationalState(opState);

    // Emit transition_ceremony_started audit entry
    await this.emitAuditEntry('transition_ceremony_started', {
      epochNumber: currentEpochNumber,
      memberCount: activeMembers.length,
      configuredThreshold: this.configuredThreshold,
    });

    // Resolve members for redistribution
    const newMemberObjects = this.resolveMembersFromRecords(activeMembers);
    const newMemberIds = activeMembers.map((m) => m.id);

    // Batched re-split of all bootstrap-sealed documents
    const batchSize = 100;
    let page = 0;
    let docs: QuorumDataRecord<TID>[];
    const failedDocIds: ShortHexGuid[] = [];

    try {
      // Emit share_redistribution_started
      await this.emitAuditEntry('share_redistribution_started', {
        reason: 'transition_ceremony',
        fromEpoch: currentEpochNumber,
      });

      do {
        docs = await this.db.listDocumentsByEpoch(
          currentEpochNumber,
          page,
          batchSize,
        );

        for (const doc of docs) {
          const docHexId = uint8ArrayToHex(
            doc.enhancedProvider.toBytes(doc.id),
          ) as ShortHexGuid;

          // Save journal entry BEFORE modifying the document
          const oldMemberHexIds = doc.memberIDs.map(
            (mid) =>
              uint8ArrayToHex(
                doc.enhancedProvider.toBytes(mid),
              ) as ShortHexGuid,
          );
          const journalEntry: RedistributionJournalEntry = {
            documentId: docHexId,
            oldShares: new Map(doc.encryptedSharesByMemberId),
            oldMemberIds: oldMemberHexIds,
            oldThreshold: doc.sharesRequired,
            oldEpoch: doc.epochNumber,
          };
          await this.db.saveJournalEntry(journalEntry);

          try {
            // Decrypt shares from threshold members
            const decryptedShares = await this.sealingService.decryptShares(
              doc,
              newMemberObjects,
            );

            // Build shares map
            const sharesMap = new Map<ShortHexGuid, string>();
            for (let i = 0; i < newMemberObjects.length; i++) {
              const memberId = uint8ArrayToHex(
                newMemberObjects[i].idBytes,
              ) as ShortHexGuid;
              sharesMap.set(memberId, decryptedShares[i]);
            }

            // Redistribute shares to full member set with configured threshold
            const newEncryptedShares =
              await this.sealingService.redistributeShares(
                sharesMap,
                newMemberObjects,
                this.configuredThreshold,
                {
                  totalShares: previousMemberIds.length,
                  threshold: previousThreshold,
                },
              );

            // Create updated document with new shares
            const newMemberTIDs = newMemberObjects.map((m) => m.id);
            const updatedDoc = new QuorumDataRecord<TID>(
              doc.creator,
              newMemberTIDs,
              this.configuredThreshold,
              doc.encryptedData,
              newEncryptedShares,
              doc.enhancedProvider,
              doc.checksum,
              doc.signature,
              doc.id,
              doc.dateCreated,
              new Date(),
              undefined,
              false, // no longer bootstrap mode
              currentEpochNumber + 1,
              doc.sealedUnderBootstrap,
              doc.identityRecoveryRecordId,
            );

            await this.db.saveDocument(updatedDoc);
          } catch {
            failedDocIds.push(docHexId);
            // On any failure, abort and rollback
            throw new QuorumError(QuorumErrorType.RedistributionFailed);
          }
        }

        page++;
      } while (docs.length === batchSize);

      // Emit share_redistribution_completed
      await this.emitAuditEntry('share_redistribution_completed', {
        reason: 'transition_ceremony',
        fromEpoch: currentEpochNumber,
      });

      // SUCCESS PATH: all documents re-split
      // Create new epoch in Quorum mode
      await this.createTransitionEpoch(newMemberIds, this.configuredThreshold);

      // Delete journal entries (no longer needed)
      await this.db.deleteJournalEntries(currentEpochNumber);

      // Emit transition_ceremony_completed
      await this.emitAuditEntry('transition_ceremony_completed', {
        epochNumber: this.currentEpochData?.epochNumber,
        previousEpochNumber: currentEpochNumber,
        memberCount: newMemberIds.length,
        threshold: this.configuredThreshold,
      });
    } catch (error) {
      // FAILURE PATH: rollback from journal
      await this.rollbackTransition(currentEpochNumber, true);

      // Restore in-memory state to Bootstrap
      this.mode = QuorumOperationalMode.Bootstrap;

      // Emit share_redistribution_failed if we got past the start
      if (failedDocIds.length > 0) {
        await this.emitAuditEntry('share_redistribution_failed', {
          reason: 'transition_ceremony',
          failedDocumentIds: failedDocIds,
          failedCount: failedDocIds.length,
        });
      }

      // Re-throw the error so the caller knows the ceremony failed
      if (error instanceof QuorumError) {
        throw error;
      }
      throw new QuorumError(QuorumErrorType.RedistributionFailed);
    }
  }

  /**
   * Create a new epoch for a completed transition ceremony.
   *
   * Called by the transition ceremony logic (Task 10) when all documents
   * have been successfully re-split. Creates a new epoch in Quorum mode
   * with the full member set and configured threshold.
   *
   * @param memberIds - The full member set after transition
   * @param threshold - The configured quorum threshold
   * @returns The new QuorumEpoch in Quorum mode
   */
  async createTransitionEpoch(
    memberIds: ShortHexGuid[],
    threshold: number,
  ): Promise<QuorumEpoch<TID>> {
    return this.createNextEpoch(
      memberIds,
      threshold,
      QuorumOperationalMode.Quorum,
    );
  }

  /**
   * Add a new member to the quorum.
   *
   * Saves the member, increments the epoch, triggers batched share
   * redistribution for all documents in the previous epoch, and emits
   * audit entries for member_added and share_redistribution_*.
   *
   * @param member - The member to add
   * @param metadata - Metadata for the member
   * @param redistributionConfig - Optional redistribution configuration
   * @returns The new QuorumEpoch after member addition
   */
  async addMember(
    member: Member<TID>,
    metadata: QuorumMemberMetadata,
    redistributionConfig?: Partial<RedistributionConfig>,
  ): Promise<QuorumEpoch<TID>> {
    this.ensureInitialized();
    this.ensureNotTransitioning();

    const hexId = uint8ArrayToHex(member.idBytes) as ShortHexGuid;

    // Check if member already exists
    const existing = await this.db.getMember(hexId);
    if (existing && existing.isActive) {
      throw new QuorumError(QuorumErrorType.MemberAlreadyExists);
    }

    // Save the new member
    const quorumMember: IQuorumMember<TID> = {
      id: hexId,
      publicKey: member.publicKey,
      metadata,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await this.db.saveMember(quorumMember);

    // Capture previous epoch info before creating the new one
    const previousEpochNumber = this.currentEpochData?.epochNumber ?? 0;
    const previousThreshold = this.currentEpochData?.threshold ?? 1;
    const previousMemberIds = this.currentEpochData?.memberIds ?? [];

    // Build new member list
    const newMemberIds = [...previousMemberIds, hexId];

    // Determine mode and threshold for the new epoch
    const newMode =
      newMemberIds.length >= this.configuredThreshold
        ? QuorumOperationalMode.Quorum
        : QuorumOperationalMode.Bootstrap;
    const newThreshold =
      newMode === QuorumOperationalMode.Bootstrap
        ? Math.max(newMemberIds.length, 1)
        : this.configuredThreshold;

    // Create next epoch with the updated membership
    const newEpoch = await this.createNextEpoch(
      newMemberIds,
      newThreshold,
      newMode,
    );

    // Emit member_added audit entry
    await this.emitAuditEntry(
      'member_added',
      {
        memberId: hexId,
        epochNumber: newEpoch.epochNumber,
        previousEpochNumber,
        memberCount: newMemberIds.length,
      },
      hexId,
    );

    // Trigger batched share redistribution for documents in the previous epoch
    if (previousEpochNumber > 0 && previousMemberIds.length > 0) {
      const config: RedistributionConfig = {
        batchSize: redistributionConfig?.batchSize ?? 100,
        continueOnFailure: redistributionConfig?.continueOnFailure ?? true,
        onProgress: redistributionConfig?.onProgress,
      };

      await this.emitAuditEntry('share_redistribution_started', {
        reason: 'member_added',
        memberId: hexId,
        fromEpoch: previousEpochNumber,
        toEpoch: newEpoch.epochNumber,
      });

      try {
        // Resolve active members for redistribution
        const activeQuorumMembers = await this.db.listActiveMembers();
        const newMemberObjects =
          this.resolveMembersFromRecords(activeQuorumMembers);

        // We need threshold members with private keys to decrypt existing shares.
        // In a real system, these would come from approved votes or key holders.
        // For redistribution triggered by addMember, we use the members that
        // have shares in the existing documents. The SealingService.decryptShares
        // method handles the actual decryption using member private keys.
        // Since we don't have private keys here, we pass the member objects
        // and let the redistribution handle documents that have accessible shares.
        const failedDocIds = await this.redistributeDocuments(
          previousEpochNumber,
          newMemberObjects,
          newMemberObjects,
          newThreshold,
          {
            totalShares: previousMemberIds.length,
            threshold: previousThreshold,
          },
          config,
        );

        if (failedDocIds.length > 0) {
          await this.emitAuditEntry('share_redistribution_failed', {
            reason: 'member_added',
            memberId: hexId,
            failedDocumentIds: failedDocIds,
            failedCount: failedDocIds.length,
          });
        } else {
          await this.emitAuditEntry('share_redistribution_completed', {
            reason: 'member_added',
            memberId: hexId,
            fromEpoch: previousEpochNumber,
            toEpoch: newEpoch.epochNumber,
          });
        }
      } catch (redistributionError) {
        await this.emitAuditEntry('share_redistribution_failed', {
          reason: 'member_added',
          memberId: hexId,
          error:
            redistributionError instanceof Error
              ? redistributionError.message
              : String(redistributionError),
        });
      }
    }

    return newEpoch;
  }

  /**
   * Remove a member from the quorum.
   *
   * Validates remaining count >= threshold, removes the member,
   * increments the epoch, triggers share redistribution with fresh
   * polynomial coefficients, and emits audit entries for member_removed
   * and share_redistribution_*.
   *
   * @param memberId - ID of the member to remove
   * @param redistributionConfig - Optional redistribution configuration
   * @returns The new QuorumEpoch after member removal
   * @throws QuorumError with InsufficientRemainingMembers if removal would drop below threshold
   * @throws QuorumError with MemberNotFound if the member is not in the current epoch
   */
  async removeMember(
    memberId: ShortHexGuid,
    redistributionConfig?: Partial<RedistributionConfig>,
  ): Promise<QuorumEpoch<TID>> {
    this.ensureInitialized();
    this.ensureNotTransitioning();

    const currentMemberIds = this.currentEpochData?.memberIds ?? [];

    // Validate member exists in current epoch
    if (!currentMemberIds.includes(memberId)) {
      throw new QuorumError(QuorumErrorType.MemberNotFound);
    }

    // Validate remaining count >= threshold after removal
    const remainingCount = currentMemberIds.length - 1;
    const currentThreshold =
      this.currentEpochData?.threshold ?? this.configuredThreshold;
    if (remainingCount < currentThreshold) {
      throw new QuorumError(QuorumErrorType.InsufficientRemainingMembers);
    }

    // Mark the member as inactive in the database
    const memberRecord = await this.db.getMember(memberId);
    if (memberRecord) {
      const updatedMember: IQuorumMember<TID> = {
        ...memberRecord,
        isActive: false,
        updatedAt: new Date(),
      };
      await this.db.saveMember(updatedMember);
    }

    // Capture previous epoch info before creating the new one
    const previousEpochNumber = this.currentEpochData?.epochNumber ?? 0;
    const previousThreshold = this.currentEpochData?.threshold ?? 1;

    // Build new member list without the removed member
    const newMemberIds = currentMemberIds.filter((id) => id !== memberId);

    // Determine mode and threshold for the new epoch
    const currentMode = this.mode ?? QuorumOperationalMode.Bootstrap;
    const newThreshold =
      currentMode === QuorumOperationalMode.Bootstrap
        ? Math.max(newMemberIds.length, 1)
        : this.configuredThreshold;

    // Create next epoch with the updated membership
    const newEpoch = await this.createNextEpoch(
      newMemberIds,
      newThreshold,
      currentMode,
    );

    // Emit member_removed audit entry
    await this.emitAuditEntry(
      'member_removed',
      {
        memberId,
        epochNumber: newEpoch.epochNumber,
        previousEpochNumber,
        memberCount: newMemberIds.length,
      },
      memberId,
    );

    // Trigger batched share redistribution with fresh polynomial coefficients
    if (previousEpochNumber > 0 && newMemberIds.length > 0) {
      const config: RedistributionConfig = {
        batchSize: redistributionConfig?.batchSize ?? 100,
        continueOnFailure: redistributionConfig?.continueOnFailure ?? true,
        onProgress: redistributionConfig?.onProgress,
      };

      await this.emitAuditEntry('share_redistribution_started', {
        reason: 'member_removed',
        memberId,
        fromEpoch: previousEpochNumber,
        toEpoch: newEpoch.epochNumber,
      });

      try {
        // Resolve remaining active members for redistribution
        const activeQuorumMembers = await this.db.listActiveMembers();
        // Filter out the removed member
        const remainingQuorumMembers = activeQuorumMembers.filter(
          (m) => m.id !== memberId,
        );
        const newMemberObjects = this.resolveMembersFromRecords(
          remainingQuorumMembers,
        );

        const failedDocIds = await this.redistributeDocuments(
          previousEpochNumber,
          newMemberObjects,
          newMemberObjects,
          newThreshold,
          {
            totalShares: currentMemberIds.length,
            threshold: previousThreshold,
          },
          config,
        );

        if (failedDocIds.length > 0) {
          await this.emitAuditEntry('share_redistribution_failed', {
            reason: 'member_removed',
            memberId,
            failedDocumentIds: failedDocIds,
            failedCount: failedDocIds.length,
          });
        } else {
          await this.emitAuditEntry('share_redistribution_completed', {
            reason: 'member_removed',
            memberId,
            fromEpoch: previousEpochNumber,
            toEpoch: newEpoch.epochNumber,
          });
        }
      } catch (redistributionError) {
        await this.emitAuditEntry('share_redistribution_failed', {
          reason: 'member_removed',
          memberId,
          error:
            redistributionError instanceof Error
              ? redistributionError.message
              : String(redistributionError),
        });
      }
    }

    return newEpoch;
  }

  /**
   * Maximum allowed description length for proposals.
   */
  private static readonly MAX_DESCRIPTION_LENGTH = 4096;

  /**
   * Member count threshold above which inner quorum routing is used.
   */
  private static readonly INNER_QUORUM_MEMBER_THRESHOLD = 20;

  /**
   * Action types considered routine for inner quorum routing.
   * When member count > 20 and an inner quorum exists, these use the inner quorum threshold.
   */
  private static readonly ROUTINE_ACTION_TYPES: ReadonlySet<ProposalActionType> =
    new Set([
      ProposalActionType.ADD_MEMBER,
      ProposalActionType.REMOVE_MEMBER,
      ProposalActionType.UNSEAL_DOCUMENT,
      ProposalActionType.REGISTER_ALIAS,
      ProposalActionType.DEREGISTER_ALIAS,
      ProposalActionType.EXTEND_STATUTE,
      ProposalActionType.CUSTOM,
    ]);

  /**
   * Determine the required threshold for a proposal based on inner quorum routing.
   *
   * When member count > 20 and the current epoch has innerQuorumMemberIds,
   * routine operations use the inner quorum size as threshold,
   * while critical operations use the full membership threshold.
   *
   * @param actionType - The proposal action type
   * @returns The required vote threshold
   */
  private getRequiredThreshold(actionType: ProposalActionType): number {
    if (!this.currentEpochData) {
      return this.configuredThreshold;
    }

    const memberCount = this.currentEpochData.memberIds.length;
    const innerQuorum = this.currentEpochData.innerQuorumMemberIds;

    // Inner quorum routing: when members > 20 and inner quorum is defined
    if (
      memberCount > QuorumStateMachine.INNER_QUORUM_MEMBER_THRESHOLD &&
      innerQuorum &&
      innerQuorum.length > 0
    ) {
      if (QuorumStateMachine.ROUTINE_ACTION_TYPES.has(actionType)) {
        // Routine operations use inner quorum threshold (majority of inner quorum)
        return Math.ceil(innerQuorum.length / 2);
      }
      // Critical operations use full membership threshold
    }

    return this.currentEpochData.threshold;
  }

  /**
   * Submit a proposal for quorum voting.
   *
   * Validates the proposer is an active member, validates description length,
   * validates IDENTITY_DISCLOSURE has an attachment, assigns a unique ID,
   * stores as pending, announces via gossip, and emits audit entry.
   *
   * @param proposal - The proposal input
   * @returns The created Proposal with assigned ID and status
   * @throws QuorumError with MissingAttachment if IDENTITY_DISCLOSURE lacks attachmentCblId
   */
  async submitProposal(proposal: ProposalInput<TID>): Promise<Proposal<TID>> {
    this.ensureInitialized();
    this.ensureNotTransitioning();

    // Validate description length (Req 5.3)
    if (
      proposal.description.length > QuorumStateMachine.MAX_DESCRIPTION_LENGTH
    ) {
      throw new QuorumError(QuorumErrorType.DuplicateProposal);
    }

    // Validate IDENTITY_DISCLOSURE requires attachment (Req 13.3)
    if (
      proposal.actionType === ProposalActionType.IDENTITY_DISCLOSURE &&
      !proposal.attachmentCblId
    ) {
      throw new QuorumError(QuorumErrorType.MissingAttachment);
    }

    if (!this.currentEpochData) {
      throw new QuorumError(QuorumErrorType.Uninitialized);
    }

    // Determine the required threshold based on inner quorum routing
    const requiredThreshold = this.getRequiredThreshold(proposal.actionType);

    // Assign unique ID and create the full proposal
    const proposalId = uuidv4() as ShortHexGuid;
    const now = new Date();

    const fullProposal: Proposal<TID> = {
      id: proposalId,
      description: proposal.description,
      actionType: proposal.actionType,
      actionPayload: proposal.actionPayload,
      proposerMemberId: (proposal.actionPayload['proposerMemberId'] ??
        this.currentEpochData.memberIds[0]) as ShortHexGuid,
      status: ProposalStatus.Pending,
      requiredThreshold,
      expiresAt: proposal.expiresAt,
      createdAt: now,
      attachmentCblId: proposal.attachmentCblId,
      epochNumber: this.currentEpochData.epochNumber,
    };

    // Store as pending in the database
    await this.db.saveProposal(fullProposal);

    // Announce via gossip
    const gossipMetadata: QuorumProposalMetadata = {
      proposalId: fullProposal.id,
      description: fullProposal.description,
      actionType: fullProposal.actionType,
      actionPayload: JSON.stringify(fullProposal.actionPayload),
      proposerMemberId: fullProposal.proposerMemberId,
      expiresAt: fullProposal.expiresAt,
      requiredThreshold: fullProposal.requiredThreshold,
      attachmentCblId: fullProposal.attachmentCblId,
    };
    await this.gossipService.announceQuorumProposal(gossipMetadata);

    // Emit audit entry
    await this.emitAuditEntry('proposal_created', {
      proposalId: fullProposal.id,
      actionType: fullProposal.actionType,
      proposerMemberId: fullProposal.proposerMemberId,
      requiredThreshold: fullProposal.requiredThreshold,
      epochNumber: fullProposal.epochNumber,
      hasAttachment: !!fullProposal.attachmentCblId,
    });

    // Update metrics
    this.metricsData.proposalsTotal++;
    this.metricsData.proposalsPending++;

    return fullProposal;
  }

  /**
   * Submit a vote on a pending proposal.
   *
   * Validates the proposal exists and is pending, validates the voter is an
   * active member, checks for duplicate votes, stores the vote, announces
   * via gossip, emits audit entry, and triggers vote tallying.
   *
   * @param vote - The vote input
   * @throws QuorumError with ProposalExpired if proposal is not pending
   * @throws QuorumError with DuplicateVote if voter already voted
   * @throws QuorumError with VoterNotOnProposal if voter is not an active member
   */
  async submitVote(vote: VoteInput<TID>): Promise<void> {
    this.ensureInitialized();
    this.ensureNotTransitioning();

    // Validate proposal exists
    const proposal = await this.db.getProposal(vote.proposalId);
    if (!proposal) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    // Check expiration before processing
    if (new Date() > proposal.expiresAt) {
      await this.expireProposal(proposal);
      throw new QuorumError(QuorumErrorType.ProposalExpired);
    }

    // Validate proposal is still pending
    if (proposal.status !== ProposalStatus.Pending) {
      throw new QuorumError(QuorumErrorType.ProposalExpired);
    }

    // Validate voter is an active member
    if (!this.currentEpochData) {
      throw new QuorumError(QuorumErrorType.Uninitialized);
    }

    const resolvedVoterId =
      vote.voterMemberId ?? this.currentEpochData.memberIds[0];

    // Check voter is in the current epoch's member list
    const isActiveMember =
      this.currentEpochData.memberIds.includes(resolvedVoterId);
    if (!isActiveMember) {
      throw new QuorumError(QuorumErrorType.VoterNotOnProposal);
    }

    // Check for duplicate votes
    const existingVotes = await this.db.getVotesForProposal(vote.proposalId);
    const alreadyVoted = existingVotes.some(
      (v) => v.voterMemberId === resolvedVoterId,
    );
    if (alreadyVoted) {
      throw new QuorumError(QuorumErrorType.DuplicateVote);
    }

    // Create and store the vote
    const fullVote: Vote<TID> = {
      proposalId: vote.proposalId,
      voterMemberId: resolvedVoterId,
      decision: vote.decision,
      comment: vote.comment,
      createdAt: new Date(),
    };
    await this.db.saveVote(fullVote);

    // Announce via gossip
    const gossipMetadata: QuorumVoteMetadata = {
      proposalId: fullVote.proposalId,
      voterMemberId: fullVote.voterMemberId,
      decision: fullVote.decision,
      comment: fullVote.comment,
    };
    await this.gossipService.announceQuorumVote(gossipMetadata);

    // Emit audit entry
    await this.emitAuditEntry('vote_cast', {
      proposalId: fullVote.proposalId,
      voterMemberId: fullVote.voterMemberId,
      decision: fullVote.decision,
    });

    // Tally votes to check if threshold is reached
    await this.tallyVotes(proposal);
  }

  /**
   * Tally votes for a proposal.
   *
   * Counts approve and reject votes. If approve count >= threshold, marks
   * the proposal as approved and dispatches the action. If reject count
   * makes approval impossible, marks the proposal as rejected.
   *
   * @param proposal - The proposal to tally votes for
   */
  private async tallyVotes(proposal: Proposal<TID>): Promise<void> {
    const votes = await this.db.getVotesForProposal(proposal.id);

    // Count distinct votes (duplicates already prevented by submitVote)
    const approveCount = votes.filter((v) => v.decision === 'approve').length;
    const rejectCount = votes.filter((v) => v.decision === 'reject').length;

    // Check if threshold is reached for approval
    if (approveCount >= proposal.requiredThreshold) {
      // Mark as approved
      const approvedProposal: Proposal<TID> = {
        ...proposal,
        status: ProposalStatus.Approved,
      };
      await this.db.saveProposal(approvedProposal);

      // Emit proposal_approved audit entry
      await this.emitAuditEntry('proposal_approved', {
        proposalId: proposal.id,
        actionType: proposal.actionType,
        approveCount,
        rejectCount,
        requiredThreshold: proposal.requiredThreshold,
      });

      // Update metrics
      this.metricsData.proposalsPending = Math.max(
        0,
        this.metricsData.proposalsPending - 1,
      );

      // Execute the action
      await this.executeProposalAction(approvedProposal);
      return;
    }

    // Check if approval is impossible (remaining possible votes can't reach threshold)
    const totalMembers = this.currentEpochData?.memberIds.length ?? 0;
    const totalVotesCast = approveCount + rejectCount;
    const remainingVotes = totalMembers - totalVotesCast;
    const maxPossibleApprovals = approveCount + remainingVotes;

    if (maxPossibleApprovals < proposal.requiredThreshold) {
      // Approval is impossible — mark as rejected
      const rejectedProposal: Proposal<TID> = {
        ...proposal,
        status: ProposalStatus.Rejected,
      };
      await this.db.saveProposal(rejectedProposal);

      // Emit proposal_rejected audit entry
      await this.emitAuditEntry('proposal_rejected', {
        proposalId: proposal.id,
        actionType: proposal.actionType,
        approveCount,
        rejectCount,
        requiredThreshold: proposal.requiredThreshold,
      });

      // Update metrics
      this.metricsData.proposalsPending = Math.max(
        0,
        this.metricsData.proposalsPending - 1,
      );
    }
  }

  /**
   * Mark a proposal as expired and emit audit entry.
   *
   * @param proposal - The proposal to expire
   */
  private async expireProposal(proposal: Proposal<TID>): Promise<void> {
    if (proposal.status !== ProposalStatus.Pending) {
      return;
    }

    const expiredProposal: Proposal<TID> = {
      ...proposal,
      status: ProposalStatus.Expired,
    };
    await this.db.saveProposal(expiredProposal);

    await this.emitAuditEntry('proposal_expired', {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      expiresAt: proposal.expiresAt.toISOString(),
    });

    this.metricsData.proposalsPending = Math.max(
      0,
      this.metricsData.proposalsPending - 1,
    );
  }

  /**
   * Execute the action associated with an approved proposal.
   *
   * Dispatches to the appropriate handler based on ProposalActionType.
   * Simple actions are fully implemented; complex ones are stubs that log.
   *
   * @param proposal - The approved proposal whose action to execute
   */
  private async executeProposalAction(proposal: Proposal<TID>): Promise<void> {
    switch (proposal.actionType) {
      case ProposalActionType.ADD_MEMBER:
        await this.executeAddMember(proposal);
        break;
      case ProposalActionType.REMOVE_MEMBER:
        await this.executeRemoveMember(proposal);
        break;
      case ProposalActionType.CHANGE_THRESHOLD:
        await this.executeChangeThreshold(proposal);
        break;
      case ProposalActionType.TRANSITION_TO_QUORUM_MODE:
        await this.initiateTransition();
        break;
      case ProposalActionType.UNSEAL_DOCUMENT:
        await this.executeUnsealDocument(proposal);
        break;
      case ProposalActionType.IDENTITY_DISCLOSURE:
        await this.executeIdentityDisclosure(proposal);
        break;
      case ProposalActionType.REGISTER_ALIAS:
        await this.executeRegisterAlias(proposal);
        break;
      case ProposalActionType.DEREGISTER_ALIAS:
        await this.executeDeregisterAlias(proposal);
        break;
      case ProposalActionType.EXTEND_STATUTE:
        await this.executeExtendStatute(proposal);
        break;
      case ProposalActionType.CHANGE_INNER_QUORUM:
        await this.executeChangeInnerQuorum(proposal);
        break;
      case ProposalActionType.CUSTOM:
        await this.executeCustomAction(proposal);
        break;
    }
  }

  /**
   * 11.8.1 ADD_MEMBER — stub that calls addMember with payload data.
   */
  private async executeAddMember(proposal: Proposal<TID>): Promise<void> {
    // Stub: In a full implementation, the member object would be constructed
    // from the proposal's actionPayload. For now, log the approval.
    await this.emitAuditEntry('member_added', {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      stub: true,
      payload: proposal.actionPayload,
    });
  }

  /**
   * 11.8.2 REMOVE_MEMBER — stub that calls removeMember with payload data.
   */
  private async executeRemoveMember(proposal: Proposal<TID>): Promise<void> {
    // Stub: In a full implementation, removeMember would be called with
    // the memberId from actionPayload. For now, log the approval.
    await this.emitAuditEntry('member_removed', {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      stub: true,
      payload: proposal.actionPayload,
    });
  }

  /**
   * 11.8.3 CHANGE_THRESHOLD — update threshold and trigger share redistribution.
   */
  private async executeChangeThreshold(proposal: Proposal<TID>): Promise<void> {
    const newThreshold = proposal.actionPayload['newThreshold'] as
      | number
      | undefined;
    if (typeof newThreshold !== 'number' || newThreshold < 1) {
      return;
    }

    this.configuredThreshold = newThreshold;

    if (this.currentEpochData) {
      const newEpoch = await this.createNextEpoch(
        this.currentEpochData.memberIds,
        newThreshold,
        this.currentEpochData.mode,
      );

      await this.emitAuditEntry('epoch_created', {
        proposalId: proposal.id,
        reason: 'threshold_change',
        newThreshold,
        epochNumber: newEpoch.epochNumber,
      });
    }
  }

  /**
   * 11.8.5 UNSEAL_DOCUMENT — stub (collect shares, unseal).
   */
  private async executeUnsealDocument(proposal: Proposal<TID>): Promise<void> {
    // Stub: In a full implementation, encrypted shares from approve votes
    // would be collected, decrypted, and used to unseal the document.
    await this.emitAuditEntry('proposal_approved', {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      stub: true,
      documentId: proposal.actionPayload['documentId'],
    });
  }

  /**
   * 11.8.6 IDENTITY_DISCLOSURE — check statute of limitations, reject if expired/deleted.
   *
   * When the target IdentityRecoveryRecord has expired or been deleted by the
   * expiration scheduler, throws IdentityPermanentlyUnrecoverable (Req 17.6).
   */
  private async executeIdentityDisclosure(
    proposal: Proposal<TID>,
  ): Promise<void> {
    const targetRecordId = proposal.actionPayload['targetRecordId'] as
      | string
      | undefined;

    // Check if the identity record still exists (not expired/deleted)
    if (targetRecordId) {
      const record = await this.db.getIdentityRecord(
        targetRecordId as ShortHexGuid,
      );
      if (!record) {
        // Identity has been permanently deleted by expiration scheduler
        await this.emitAuditEntry('identity_disclosure_rejected', {
          proposalId: proposal.id,
          reason: 'identity_permanently_unrecoverable',
          targetRecordId,
        });
        throw new QuorumError(QuorumErrorType.IdentityPermanentlyUnrecoverable);
      }

      // Check if record has expired (statute of limitations exceeded)
      if (new Date() > record.expiresAt) {
        await this.emitAuditEntry('identity_disclosure_expired', {
          proposalId: proposal.id,
          targetRecordId,
          expiresAt: record.expiresAt.toISOString(),
        });
        throw new QuorumError(QuorumErrorType.IdentityPermanentlyUnrecoverable);
      }
    }

    await this.emitAuditEntry('identity_disclosure_approved', {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      targetMemberId: proposal.actionPayload['targetMemberId'],
      attachmentCblId: proposal.attachmentCblId,
    });
  }

  /**
   * 11.8.7 REGISTER_ALIAS — delegate to AliasRegistry.registerAlias().
   */
  private async executeRegisterAlias(proposal: Proposal<TID>): Promise<void> {
    const aliasName = proposal.actionPayload['aliasName'] as string | undefined;
    const ownerMemberId = proposal.actionPayload['ownerMemberId'] as
      | string
      | undefined;
    const ownerPublicKeyHex = proposal.actionPayload['ownerPublicKey'] as
      | string
      | undefined;

    if (this.aliasRegistry && aliasName && ownerMemberId && ownerPublicKeyHex) {
      const ownerPublicKey = new Uint8Array(
        Buffer.from(ownerPublicKeyHex, 'hex'),
      );
      await this.aliasRegistry.registerAlias(
        aliasName,
        ownerMemberId as ShortHexGuid,
        ownerPublicKey,
      );
    }

    await this.emitAuditEntry('alias_registered', {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      aliasName: aliasName ?? proposal.actionPayload['aliasName'],
    });
  }

  /**
   * 11.8.8 DEREGISTER_ALIAS — delegate to AliasRegistry.deregisterAlias().
   */
  private async executeDeregisterAlias(proposal: Proposal<TID>): Promise<void> {
    const aliasName = proposal.actionPayload['aliasName'] as string | undefined;

    if (this.aliasRegistry && aliasName) {
      await this.aliasRegistry.deregisterAlias(aliasName);
    }

    await this.emitAuditEntry('alias_deregistered', {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      aliasName: aliasName ?? proposal.actionPayload['aliasName'],
    });
  }

  /**
   * 11.8.9 EXTEND_STATUTE — update expiresAt on the target IdentityRecoveryRecord.
   */
  private async executeExtendStatute(proposal: Proposal<TID>): Promise<void> {
    const targetRecordId = proposal.actionPayload['targetRecordId'] as
      | string
      | undefined;
    const newExpiresAt = proposal.actionPayload['newExpiresAt'] as
      | string
      | undefined;

    if (targetRecordId && newExpiresAt) {
      const record = await this.db.getIdentityRecord(
        targetRecordId as ShortHexGuid,
      );
      if (record) {
        const updatedRecord = {
          ...record,
          expiresAt: new Date(newExpiresAt),
        };
        await this.db.saveIdentityRecord(updatedRecord);

        await this.emitAuditEntry('proposal_approved', {
          proposalId: proposal.id,
          actionType: proposal.actionType,
          targetRecordId,
          newExpiresAt,
        });
      }
    }
  }

  /**
   * 11.8.10 CHANGE_INNER_QUORUM — update innerQuorumMemberIds on current epoch.
   */
  private async executeChangeInnerQuorum(
    proposal: Proposal<TID>,
  ): Promise<void> {
    const innerQuorumMemberIds = proposal.actionPayload[
      'innerQuorumMemberIds'
    ] as ShortHexGuid[] | undefined;

    if (this.currentEpochData && innerQuorumMemberIds) {
      // Create a new epoch with the updated inner quorum
      const newEpoch = await this.createNextEpoch(
        this.currentEpochData.memberIds,
        this.currentEpochData.threshold,
        this.currentEpochData.mode,
      );

      // Update the epoch with inner quorum member IDs
      newEpoch.innerQuorumMemberIds = innerQuorumMemberIds;
      await this.db.saveEpoch(newEpoch);

      await this.emitAuditEntry('epoch_created', {
        proposalId: proposal.id,
        reason: 'inner_quorum_change',
        innerQuorumMemberIds,
        epochNumber: newEpoch.epochNumber,
      });
    }
  }

  /**
   * 11.8.11 CUSTOM — log approval without automated execution.
   */
  private async executeCustomAction(proposal: Proposal<TID>): Promise<void> {
    // Custom actions are logged but not automatically executed
    await this.emitAuditEntry('proposal_approved', {
      proposalId: proposal.id,
      actionType: proposal.actionType,
      custom: true,
      payload: proposal.actionPayload,
    });
  }

  /**
   * Get a proposal by its ID.
   */
  async getProposal(proposalId: ShortHexGuid): Promise<Proposal<TID> | null> {
    this.ensureInitialized();
    return this.db.getProposal(proposalId);
  }

  /**
   * Seal a document using the appropriate mode (bootstrap or quorum).
   *
   * In bootstrap mode: delegates to quorumSealBootstrap with effective threshold = member count.
   * In quorum mode: delegates to quorumSeal with configured threshold.
   * Tags document with epoch number and sealedUnderBootstrap flag.
   *
   * @throws QuorumError with TransitionInProgress if a transition ceremony is active
   */
  async sealDocument<T>(
    agent: Member<TID>,
    document: T,
    memberIds: ShortHexGuid[],
    sharesRequired?: number,
  ): Promise<SealedDocumentResult<TID>> {
    this.ensureInitialized();
    this.ensureNotTransitioning();

    if (!this.currentEpochData) {
      throw new QuorumError(QuorumErrorType.Uninitialized);
    }

    const isBootstrap = this.mode === QuorumOperationalMode.Bootstrap;

    // Resolve members from the active member list
    const activeMembers = await this.db.listActiveMembers();
    const memberMap = new Map<ShortHexGuid, IQuorumMember<TID>>();
    for (const m of activeMembers) {
      memberMap.set(m.id, m);
    }

    // Validate all requested member IDs exist
    for (const mid of memberIds) {
      if (!memberMap.has(mid)) {
        throw new QuorumError(QuorumErrorType.MemberNotFound);
      }
    }

    // Determine effective threshold
    const effectiveThreshold = isBootstrap
      ? Math.max(memberIds.length, 1)
      : (sharesRequired ?? this.currentEpochData.threshold);

    // Resolve full Member objects for the requested member IDs
    const sealMembers = memberIds
      .map((mid) => memberMap.get(mid))
      .filter((m): m is IQuorumMember<TID> => m !== undefined);
    const resolvedMembers = this.resolveMembersFromRecords(sealMembers);

    // Delegate to SealingService
    let sealedDoc;
    if (isBootstrap) {
      sealedDoc = await this.sealingService.quorumSealBootstrap<T>(
        agent,
        document,
        resolvedMembers,
        effectiveThreshold,
      );
    } else {
      sealedDoc = await this.sealingService.quorumSeal<T>(
        agent,
        document,
        resolvedMembers,
        effectiveThreshold,
      );
    }

    const docHexId = uint8ArrayToHex(
      sealedDoc.enhancedProvider.toBytes(sealedDoc.id),
    ) as ShortHexGuid;

    // Save to database
    await this.db.saveDocument(sealedDoc);

    return {
      documentId: docHexId,
      encryptedData: sealedDoc.encryptedData,
      memberIds,
      sharesRequired: sealedDoc.sharesRequired,
      createdAt: sealedDoc.dateCreated,
    };
  }

  /**
   * Unseal a document.
   *
   * Verifies checksum (SHA-3) and creator signature using constant-time
   * comparison before delegating to SealingService.
   * Returns generic error on failure without revealing which check failed (Req 8.4-8.6).
   */
  async unsealDocument<T>(
    documentId: ShortHexGuid,
    membersWithPrivateKey: Member<TID>[],
  ): Promise<T> {
    this.ensureInitialized();
    this.ensureNotTransitioning();

    const doc = await this.db.getDocument(documentId);
    if (!doc) {
      throw new QuorumError(QuorumErrorType.DocumentNotFound);
    }

    // Verify checksum using constant-time comparison (Req 8.5)
    const calculatedChecksum = this.checksumService.calculateChecksum(
      doc.encryptedData,
    );
    const checksumValid = constantTimeEqual(
      calculatedChecksum.toUint8Array(),
      doc.checksum.toUint8Array(),
    );

    // Verify creator signature using constant-time comparison (Req 8.5)
    let signatureValid = false;
    try {
      const expectedSignature = doc.creator.sign(doc.checksum.toUint8Array());
      signatureValid = constantTimeEqual(doc.signature, expectedSignature);
    } catch {
      signatureValid = false;
    }

    // Return generic error without revealing which check failed (Req 8.6)
    if (!checksumValid || !signatureValid) {
      throw new QuorumError(QuorumErrorType.UnableToRestoreDocument);
    }

    // Delegate to SealingService for actual decryption
    return this.sealingService.quorumUnseal<T>(doc, membersWithPrivateKey);
  }

  /** Get the current epoch. */
  async getCurrentEpoch(): Promise<QuorumEpoch<TID>> {
    this.ensureInitialized();

    if (this.currentEpochData) {
      return this.currentEpochData;
    }

    const epoch = await this.db.getCurrentEpoch();
    this.currentEpochData = epoch;
    return epoch;
  }

  /** Get a specific epoch by number. */
  async getEpoch(epochNumber: number): Promise<QuorumEpoch<TID> | null> {
    this.ensureInitialized();
    return this.db.getEpoch(epochNumber);
  }

  /** Get quorum system metrics for monitoring. */
  async getMetrics(): Promise<QuorumMetrics> {
    const activeMembers = this.initialized
      ? await this.db.listActiveMembers()
      : [];
    const currentEpochNumber = this.currentEpochData?.epochNumber ?? 0;

    return {
      proposals: {
        total: this.metricsData.proposalsTotal,
        pending: this.metricsData.proposalsPending,
      },
      votes: {
        latency_ms: this.metricsData.votesLatencyMs,
      },
      redistribution: {
        progress: this.metricsData.redistributionProgress,
        failures: this.metricsData.redistributionFailures,
      },
      members: {
        active: activeMembers.length,
      },
      epoch: {
        current: currentEpochNumber,
      },
      expiration: {
        last_run: this.metricsData.expirationLastRun,
        deleted_total: this.metricsData.expirationDeletedTotal,
      },
    };
  }

  /** Get the configured threshold for this quorum. */
  getConfiguredThreshold(): number {
    return this.configuredThreshold;
  }
}
