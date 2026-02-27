/**
 * @fileoverview AuditLogService — immutable chained audit log.
 *
 * Computes SHA-3 content hashes, links entries via previousEntryHash,
 * signs with the node operator's key, and optionally persists to the
 * block store via storeCBLWithWhitening.
 *
 * @see Design: Immutable Chained Audit Log
 * @see Requirements 13.6, 13.7
 */

import {
  ECIESService,
  Member,
  PlatformID,
  SignatureUint8Array,
} from '@digitaldefiance/ecies-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { QuorumError } from '../errors/quorumError';
import { QuorumAuditLogEntry } from '../interfaces/auditLogEntry';
import { ChainedAuditLogEntry } from '../interfaces/chainedAuditLogEntry';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import { CBLStorageResult } from '../interfaces/storage/cblWhitening';

/**
 * Callback interface for persisting audit entries to the block store.
 * Implementations live in brightchain-api-lib where the actual block store is available.
 */
export interface IAuditBlockStorePersistence {
  /**
   * Store serialized audit entry data via storeCBLWithWhitening.
   * @param data - Serialized chained audit entry
   * @returns The CBL storage result with blockId1 and blockId2
   */
  storeCBLWithWhitening(data: Uint8Array): Promise<CBLStorageResult>;

  /**
   * Retrieve a stored audit entry from the block store.
   * @param blockId1 - First CBL block ID
   * @param blockId2 - Second CBL block ID
   * @returns The reconstructed data
   */
  retrieveCBL(blockId1: string, blockId2: string): Promise<Uint8Array>;
}

/**
 * Serializes an audit log entry (excluding signature and blockIds) into
 * a deterministic JSON string suitable for hashing.
 *
 * Fields are sorted alphabetically to ensure deterministic output.
 * The `signature`, `blockId1`, and `blockId2` fields are excluded
 * since they are computed after the content hash.
 */
export function serializeEntryForHashing(
  entry: QuorumAuditLogEntry<PlatformID> & {
    previousEntryHash?: string | null;
  },
): string {
  const obj: Record<string, unknown> = {
    id: entry.id,
    eventType: entry.eventType,
    timestamp:
      entry.timestamp instanceof Date
        ? entry.timestamp.toISOString()
        : entry.timestamp,
    details: entry.details,
  };

  // Include optional fields only when present
  if (entry.previousEntryHash !== undefined) {
    obj['previousEntryHash'] = entry.previousEntryHash;
  }
  if (entry.proposalId !== undefined) {
    obj['proposalId'] = entry.proposalId;
  }
  if (entry.targetMemberId !== undefined) {
    obj['targetMemberId'] = entry.targetMemberId;
  }
  if (entry.proposerMemberId !== undefined) {
    obj['proposerMemberId'] = entry.proposerMemberId;
  }
  if (entry.attachmentCblId !== undefined) {
    obj['attachmentCblId'] = entry.attachmentCblId;
  }

  // Sort keys for deterministic serialization
  const sortedKeys = Object.keys(obj).sort();
  const sorted: Record<string, unknown> = {};
  for (const key of sortedKeys) {
    sorted[key] = obj[key];
  }
  return JSON.stringify(sorted);
}

/**
 * Compute the SHA-3-512 content hash of a serialized entry string.
 * Returns the hash as a hex string.
 */
export function computeContentHash(serialized: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(serialized);
  const hashBytes = sha3_512(data);
  return Buffer.from(hashBytes).toString('hex');
}

/**
 * AuditLogService creates tamper-evident chained audit log entries.
 *
 * Each entry is:
 * 1. Serialized deterministically (excluding signature/blockIds)
 * 2. Hashed with SHA-3-512 to produce contentHash
 * 3. Linked to the previous entry via previousEntryHash
 * 4. Signed by the node operator's key
 * 5. Optionally persisted to the block store via storeCBLWithWhitening
 * 6. Stored in the database audit_log collection
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class AuditLogService<TID extends PlatformID = Uint8Array> {
  constructor(
    private readonly db: IQuorumDatabase<TID>,
    private readonly signingMember: Member<TID>,
    private readonly eciesService: ECIESService,
    private readonly blockStore?: IAuditBlockStorePersistence,
  ) {}

  /**
   * Append an audit entry to the chained log.
   *
   * 1. Fetches the latest entry to get previousEntryHash
   * 2. Computes contentHash = SHA-3(serialized entry excluding signature/blockIds)
   * 3. Signs contentHash with the node operator key
   * 4. Optionally stores via storeCBLWithWhitening
   * 5. Persists the chained entry to the database
   *
   * @param entry - The base audit log entry to append
   * @returns The fully chained audit log entry
   */
  async appendEntry(
    entry: QuorumAuditLogEntry<TID>,
  ): Promise<ChainedAuditLogEntry<TID>> {
    // 1. Get the latest entry for chain linking
    const latestEntry = await this.db.getLatestAuditEntry();
    const previousEntryHash = latestEntry?.contentHash ?? null;

    // 2. Compute contentHash from serialized entry (excluding signature/blockIds)
    const serialized = serializeEntryForHashing({
      ...entry,
      previousEntryHash,
    });
    const contentHash = computeContentHash(serialized);

    // 3. Sign the contentHash with the node operator's key
    const contentHashBytes = new TextEncoder().encode(contentHash);
    const signature = this.signingMember.sign(
      contentHashBytes,
    ) as SignatureUint8Array;

    // 4. Optionally persist to block store
    let blockId1 = '';
    let blockId2 = '';

    if (this.blockStore) {
      const chainedData = new TextEncoder().encode(
        JSON.stringify({
          ...entry,
          previousEntryHash,
          contentHash,
          signature: Array.from(signature),
        }),
      );
      const result = await this.blockStore.storeCBLWithWhitening(chainedData);
      blockId1 = result.blockId1;
      blockId2 = result.blockId2;
    }

    // 5. Build the chained entry
    const chainedEntry: ChainedAuditLogEntry<TID> = {
      ...entry,
      previousEntryHash,
      contentHash,
      signature,
      blockId1,
      blockId2,
    };

    // 6. Persist to database
    await this.db.appendAuditEntry(chainedEntry);

    return chainedEntry;
  }

  /**
   * Verify the integrity of the entire audit chain.
   *
   * Walks backward from the latest entry:
   * 1. Recomputes contentHash from entry fields
   * 2. Verifies signature against the signing node's public key
   * 3. Optionally retrieves from block store and confirms match
   * 4. Verifies previousEntryHash links
   * 5. Detects tampering at any point
   *
   * @param signerPublicKey - The public key of the node that signed the entries
   * @param entries - The full chain of entries to verify (ordered newest-first or oldest-first)
   * @returns True if the chain is valid
   * @throws QuorumError with AuditChainCorrupted if tampering is detected
   */
  async verifyChain(
    signerPublicKey: Uint8Array,
    entries: ChainedAuditLogEntry<TID>[],
  ): Promise<boolean> {
    if (entries.length === 0) {
      return true;
    }

    // Sort entries oldest-first by timestamp for chain walking
    const sorted = [...entries].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    for (let i = 0; i < sorted.length; i++) {
      const entry = sorted[i];

      // 1. Verify previousEntryHash link
      if (i === 0) {
        // Genesis entry must have null previousEntryHash
        if (entry.previousEntryHash !== null) {
          throw new QuorumError(QuorumErrorType.AuditChainCorrupted);
        }
      } else {
        const previousEntry = sorted[i - 1];
        if (entry.previousEntryHash !== previousEntry.contentHash) {
          throw new QuorumError(QuorumErrorType.AuditChainCorrupted);
        }
      }

      // 2. Recompute contentHash and verify
      const serialized = serializeEntryForHashing({
        id: entry.id,
        eventType: entry.eventType,
        timestamp: entry.timestamp,
        details: entry.details,
        proposalId: entry.proposalId,
        targetMemberId: entry.targetMemberId,
        proposerMemberId: entry.proposerMemberId,
        attachmentCblId: entry.attachmentCblId,
        previousEntryHash: entry.previousEntryHash,
      });
      const recomputedHash = computeContentHash(serialized);

      if (recomputedHash !== entry.contentHash) {
        throw new QuorumError(QuorumErrorType.AuditChainCorrupted);
      }

      // 3. Verify signature
      const contentHashBytes = new TextEncoder().encode(entry.contentHash);
      const signatureValid = this.eciesService.verifyMessage(
        signerPublicKey,
        contentHashBytes,
        entry.signature,
      );

      if (!signatureValid) {
        throw new QuorumError(QuorumErrorType.AuditChainCorrupted);
      }

      // 4. Optionally verify against block store
      if (this.blockStore && entry.blockId1 && entry.blockId2) {
        try {
          const storedData = await this.blockStore.retrieveCBL(
            entry.blockId1,
            entry.blockId2,
          );
          const storedJson = new TextDecoder().decode(storedData);
          const storedEntry = JSON.parse(storedJson) as Record<string, unknown>;

          // Verify the stored entry's contentHash matches
          if (storedEntry['contentHash'] !== entry.contentHash) {
            throw new QuorumError(QuorumErrorType.AuditChainCorrupted);
          }
        } catch (err) {
          if (err instanceof QuorumError) {
            throw err;
          }
          throw new QuorumError(QuorumErrorType.AuditChainCorrupted);
        }
      }
    }

    return true;
  }
}
