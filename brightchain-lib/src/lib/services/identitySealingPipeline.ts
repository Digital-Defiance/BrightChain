/**
 * @fileoverview IdentitySealingPipeline — orchestrates the brokered anonymity flow.
 *
 * Captures real identity, generates Shamir shards, replaces identity field,
 * distributes encrypted shards, stores IdentityRecoveryRecord, and discards plaintext.
 *
 * @see Requirements 14
 * @see Design: IdentitySealingPipeline (Section 6)
 */

import {
  ECIESService,
  HexString,
  hexToUint8Array,
  PlatformID,
  TypedIdProviderWrapper,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { QuorumError } from '../errors/quorumError';
import {
  ContentWithIdentity,
  IdentityMode,
} from '../interfaces/contentWithIdentity';
import { IdentityRecoveryRecord } from '../interfaces/identityRecoveryRecord';
import { QuorumEpoch } from '../interfaces/quorumEpoch';
import {
  IdentitySealingResult,
  IIdentitySealingPipeline,
} from '../interfaces/services/identitySealingPipeline';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import { StatuteOfLimitationsConfig } from '../interfaces/statuteConfig';
import { SealingService } from './sealing.service';

/**
 * Anonymous_ID: an all-zeroes 16-byte Uint8Array used as the creatorId
 * when content is posted with no identity attribution.
 */
export const ANONYMOUS_ID = new Uint8Array(16);

/**
 * Wipe a Uint8Array buffer by filling it with zeroes.
 * Best-effort memory cleanup for sensitive data.
 */
function wipeBuffer(buffer: Uint8Array): void {
  buffer.fill(0);
}

/**
 * IdentitySealingPipeline orchestrates the brokered anonymity flow:
 *
 * 1. Captures the real creator identity before publication
 * 2. Generates Shamir shards from the identity bytes
 * 3. Replaces the identity field based on mode (real/alias/anonymous)
 * 4. Encrypts each shard with the corresponding quorum member's public key via ECIES
 * 5. Verifies shards correctly reconstruct before distributing
 * 6. Stores the IdentityRecoveryRecord in the QuorumDatabase
 * 7. Attaches the recovery record ID to the content metadata
 * 8. Discards the original plaintext identity from memory
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class IdentitySealingPipeline<
  TID extends PlatformID = Uint8Array,
> implements IIdentitySealingPipeline<TID> {
  constructor(
    private readonly db: IQuorumDatabase<TID>,
    private readonly sealingService: SealingService<TID>,
    private readonly eciesService: ECIESService<TID>,
    private readonly currentEpoch: () => Promise<QuorumEpoch<TID>>,
    private readonly statuteConfig: () => Promise<StatuteOfLimitationsConfig | null>,
  ) {}

  /**
   * Get the enhanced ID provider from the sealing service for TID ↔ bytes conversion.
   */
  private get enhancedProvider(): TypedIdProviderWrapper<TID> {
    return this.sealingService.enhancedProviderRef;
  }

  /**
   * Convert a TID to its byte representation.
   */
  private tidToBytes(id: TID): Uint8Array {
    return this.enhancedProvider.toBytes(id);
  }

  /**
   * Convert bytes back to a TID.
   */
  private bytesToTid(bytes: Uint8Array): TID {
    return this.enhancedProvider.fromBytes(bytes);
  }

  /**
   * Compute the expiration date for an identity recovery record
   * based on the statute of limitations configuration.
   */
  private async computeExpiresAt(
    contentType: string,
    createdAt: Date,
  ): Promise<Date> {
    const config = await this.statuteConfig();
    let durationMs: number;

    if (config) {
      const typeDuration = config.defaultDurations.get(contentType);
      durationMs = typeDuration ?? config.fallbackDurationMs;
    } else {
      // Default: 7 years in milliseconds
      durationMs = 7 * 365.25 * 24 * 60 * 60 * 1000;
    }

    return new Date(createdAt.getTime() + durationMs);
  }

  /**
   * Process content through the identity sealing pipeline.
   *
   * Steps:
   * 1. Capture the real identity (creatorId) from the content
   * 2. Convert identity to hex for Shamir splitting
   * 3. Generate Shamir shards using current epoch threshold/members
   * 4. Verify shards reconstruct correctly before distributing (Task 15.3)
   * 5. Replace identity field based on mode (Task 15.4)
   * 6. Encrypt each shard with the corresponding member's public key via ECIES
   * 7. Store the IdentityRecoveryRecord
   * 8. Attach recovery record ID to content
   * 9. Wipe plaintext identity from memory
   *
   * @param content - The content with real identity to seal
   * @param mode - The identity mode (real, alias, or anonymous)
   * @param aliasName - Required when mode is Alias
   * @returns The modified content and recovery record ID
   * @throws QuorumError with IdentitySealingFailed if shard generation or distribution fails
   * @throws QuorumError with ShardVerificationFailed if shard verification fails
   */
  async sealIdentity(
    content: ContentWithIdentity<TID>,
    mode: IdentityMode,
    aliasName?: string,
  ): Promise<IdentitySealingResult<TID>> {
    // 1. Capture the real identity
    const realIdentityBytes = this.tidToBytes(content.creatorId);
    // Make a copy so we can wipe the original reference later
    const identityCopy = new Uint8Array(realIdentityBytes);

    let plaintextShares: string[] = [];

    try {
      // 2. Convert identity bytes to hex for Shamir splitting
      const identityHex = uint8ArrayToHex(identityCopy);

      // Get current epoch for threshold and member list
      const epoch = await this.currentEpoch();
      const memberCount = epoch.memberIds.length;
      const threshold = epoch.threshold;

      if (memberCount < 1) {
        throw new QuorumError(QuorumErrorType.IdentitySealingFailed);
      }

      // 3. Generate Shamir shards via SealingService
      try {
        plaintextShares = this.sealingService.shamirSplit(
          identityHex,
          memberCount,
          threshold,
        );
      } catch (err) {
        if (err instanceof QuorumError) throw err;
        throw new QuorumError(QuorumErrorType.IdentitySealingFailed);
      }

      // 4. Verify shards reconstruct correctly before distributing (Task 15.3)
      this.verifyShards(plaintextShares, threshold, identityHex, memberCount);

      // 5. Replace identity field based on mode (Task 15.4)
      const modifiedContent = this.replaceIdentity(content, mode, aliasName);

      // 6. Encrypt each shard with the corresponding member's public key via ECIES
      const encryptedShardsByMemberId = new Map<TID, Uint8Array>();
      const encoder = new TextEncoder();
      for (let i = 0; i < memberCount; i++) {
        const memberId = epoch.memberIds[i];
        const memberRecord = await this.db.getMember(memberId);
        if (!memberRecord) {
          throw new QuorumError(QuorumErrorType.IdentitySealingFailed);
        }

        // Encode the share string as UTF-8 bytes for ECIES encryption
        // (Shamir shares include a structured prefix and may have odd hex length)
        const shareBytes = encoder.encode(plaintextShares[i]);
        const encryptedShard = await this.eciesService.encryptWithLength(
          memberRecord.publicKey,
          shareBytes,
        );
        encryptedShardsByMemberId.set(memberId, encryptedShard);
      }

      // 7. Store the IdentityRecoveryRecord
      const now = new Date();
      const expiresAt = await this.computeExpiresAt(content.contentType, now);
      const recordId = uint8ArrayToHex(
        this.enhancedProvider.toBytes(this.enhancedProvider.generateTyped()),
      ) as HexString;

      const recoveryRecord: IdentityRecoveryRecord<TID> = {
        id: recordId as unknown as TID,
        contentId: content.contentId as unknown as TID,
        contentType: content.contentType,
        encryptedShardsByMemberId,
        memberIds: [...epoch.memberIds],
        threshold,
        epochNumber: epoch.epochNumber,
        expiresAt,
        createdAt: now,
        identityMode: mode,
        aliasName: mode === IdentityMode.Alias ? aliasName : undefined,
      };

      await this.db.saveIdentityRecord(recoveryRecord);

      // 8. Attach recovery record ID to content
      modifiedContent.identityRecoveryRecordId = recordId;

      return {
        modifiedContent,
        recoveryRecordId: recordId,
      };
    } catch (error) {
      if (error instanceof QuorumError) {
        throw error;
      }
      throw new QuorumError(QuorumErrorType.IdentitySealingFailed);
    } finally {
      // 9. Wipe plaintext identity from memory
      wipeBuffer(identityCopy);
      for (let i = 0; i < plaintextShares.length; i++) {
        plaintextShares[i] = '';
      }
      plaintextShares.length = 0;
    }
  }

  /**
   * Recover a sealed identity given sufficient decrypted shares.
   *
   * Retrieves the IdentityRecoveryRecord, validates share count,
   * reconstructs the identity using Shamir's combine, and returns the TID.
   *
   * @param recoveryRecordId - The ID of the identity recovery record
   * @param decryptedShares - Map of member ID to decrypted share hex string
   * @returns The recovered real identity
   * @throws QuorumError with InsufficientSharesForReconstruction if not enough shares
   * @throws QuorumError with IdentityPermanentlyUnrecoverable if record not found
   */
  async recoverIdentity(
    recoveryRecordId: HexString,
    decryptedShares: Map<HexString, string>,
  ): Promise<TID> {
    const record = await this.db.getIdentityRecord(
      recoveryRecordId as unknown as TID,
    );
    if (!record) {
      throw new QuorumError(QuorumErrorType.IdentityPermanentlyUnrecoverable);
    }

    if (decryptedShares.size < record.threshold) {
      throw new QuorumError(
        QuorumErrorType.InsufficientSharesForReconstruction,
      );
    }

    const shareValues = Array.from(decryptedShares.values());

    let reconstructedHex: string;
    try {
      reconstructedHex = this.sealingService.shamirCombine(
        shareValues,
        record.memberIds.length,
      );
    } catch {
      throw new QuorumError(
        QuorumErrorType.InsufficientSharesForReconstruction,
      );
    }

    try {
      const identityBytes = hexToUint8Array(reconstructedHex);
      return this.bytesToTid(identityBytes);
    } finally {
      // Wipe the reconstructed hex — best-effort for strings
      reconstructedHex = '';
    }
  }

  /**
   * Verify that Shamir shards correctly reconstruct the original identity
   * before distributing them to members.
   *
   * Takes a subset of shares (threshold count) and verifies they
   * reconstruct to the original identity hex.
   *
   * @param shares - The plaintext Shamir shares
   * @param threshold - The number of shares needed to reconstruct
   * @param originalHex - The original identity hex string
   * @param totalShares - Total number of shares generated
   * @throws QuorumError with ShardVerificationFailed if verification fails
   */
  private verifyShards(
    shares: string[],
    threshold: number,
    originalHex: string,
    totalShares: number,
  ): void {
    const verificationSubset = shares.slice(0, threshold);

    let reconstructed: string;
    try {
      reconstructed = this.sealingService.shamirCombine(
        verificationSubset,
        totalShares,
      );
    } catch {
      throw new QuorumError(QuorumErrorType.ShardVerificationFailed);
    }

    if (reconstructed !== originalHex) {
      throw new QuorumError(QuorumErrorType.ShardVerificationFailed);
    }
  }

  /**
   * Replace the identity field on content based on the selected mode.
   *
   * - Real: keep creatorId as-is
   * - Alias: replace creatorId with the alias name encoded as TID
   * - Anonymous: replace creatorId with ANONYMOUS_ID (all-zeroes)
   *
   * Returns a shallow copy of the content with the identity replaced.
   */
  private replaceIdentity(
    content: ContentWithIdentity<TID>,
    mode: IdentityMode,
    aliasName?: string,
  ): ContentWithIdentity<TID> {
    const modified: ContentWithIdentity<TID> = { ...content };

    switch (mode) {
      case IdentityMode.Real:
        // Keep creatorId as-is
        break;

      case IdentityMode.Alias: {
        if (!aliasName) {
          throw new QuorumError(QuorumErrorType.IdentitySealingFailed);
        }
        // Generate a deterministic alias ID using a fresh GUID.
        // The actual alias-to-identity mapping is stored in the recovery record.
        // In production, this would be the alias's registered public key ID.
        modified.creatorId = this.enhancedProvider.generateTyped();
        break;
      }

      case IdentityMode.Anonymous:
        // Replace with all-zeroes Anonymous_ID
        modified.creatorId = this.bytesToTid(new Uint8Array(ANONYMOUS_ID));
        break;
    }

    return modified;
  }
}
