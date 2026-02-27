/**
 * @fileoverview IIdentitySealingPipeline interface.
 *
 * Orchestrates the brokered anonymity flow: captures real identity,
 * generates Shamir shards, replaces identity field, distributes
 * encrypted shards, and discards plaintext.
 *
 * @see Requirements 14
 */

import { HexString, PlatformID } from '@digitaldefiance/ecies-lib';
import { ContentWithIdentity, IdentityMode } from '../contentWithIdentity';

/**
 * Result of the identity sealing pipeline.
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface IdentitySealingResult<TID extends PlatformID = Uint8Array> {
  /** Content with identity field replaced according to the selected mode */
  modifiedContent: ContentWithIdentity<TID>;
  /** ID of the stored identity recovery record */
  recoveryRecordId: HexString;
}

/**
 * Interface for the identity sealing pipeline.
 *
 * Processes content through the brokered anonymity flow:
 * 1. Captures the real creator identity
 * 2. Generates Shamir shards from the identity
 * 3. Replaces the identity field (real/alias/anonymous)
 * 4. Encrypts shards per quorum member via ECIES
 * 5. Stores the IdentityRecoveryRecord
 * 6. Discards the original plaintext identity from memory
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export interface IIdentitySealingPipeline<TID extends PlatformID = Uint8Array> {
  /**
   * Process content through the identity sealing pipeline.
   * Returns the content with identity replaced and the identity recovery record ID.
   * @param content - The content with real identity to seal
   * @param mode - The identity mode (real, alias, or anonymous)
   * @param aliasName - Required when mode is Alias
   * @returns The modified content and recovery record ID
   * @throws QuorumError with IdentitySealingFailed if shard generation or distribution fails
   * @throws QuorumError with ShardVerificationFailed if shard verification fails
   */
  sealIdentity(
    content: ContentWithIdentity<TID>,
    mode: IdentityMode,
    aliasName?: string,
  ): Promise<IdentitySealingResult<TID>>;

  /**
   * Recover a sealed identity given sufficient decrypted shares.
   * @param recoveryRecordId - The ID of the identity recovery record
   * @param decryptedShares - Map of member ID to decrypted share string
   * @returns The recovered real identity
   * @throws QuorumError with InsufficientSharesForReconstruction if not enough shares
   */
  recoverIdentity(
    recoveryRecordId: HexString,
    decryptedShares: Map<HexString, string>,
  ): Promise<TID>;
}
