/**
 * @fileoverview AliasRegistry — manages pseudonymous alias registration,
 * deregistration, and lookup.
 *
 * Aliases map back to a member's real identity through the quorum.
 * The alias-to-identity mapping is sealed via IdentitySealingPipeline.
 *
 * @see Requirements 15
 * @see Design: AliasRegistry (Section 5)
 */

import {
  ECIESService,
  PlatformID,
  ShortHexGuid,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { QuorumErrorType } from '../enumerations/quorumErrorType';
import { QuorumError } from '../errors/quorumError';
import { AliasRecord } from '../interfaces/aliasRecord';
import { IdentityMode } from '../interfaces/contentWithIdentity';
import { QuorumEpoch } from '../interfaces/quorumEpoch';
import { IQuorumDatabase } from '../interfaces/services/quorumDatabase';
import { IdentitySealingPipeline } from './identitySealingPipeline';

/**
 * AliasRegistry manages pseudonymous alias registration, deregistration,
 * and identity lookup for the quorum system.
 *
 * - Registration validates uniqueness, generates an alias keypair,
 *   seals the alias-to-identity mapping via IdentitySealingPipeline,
 *   and stores the AliasRecord.
 * - Deregistration marks an alias as inactive.
 * - Lookup recovers the real identity behind an alias given sufficient
 *   quorum shares.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class AliasRegistry<TID extends PlatformID = Uint8Array> {
  constructor(
    private readonly db: IQuorumDatabase<TID>,
    private readonly identitySealingPipeline: IdentitySealingPipeline<TID>,
    private readonly eciesService: ECIESService<TID>,
    private readonly currentEpoch: () => Promise<QuorumEpoch<TID>>,
  ) {}

  /**
   * Register a new alias for a quorum member.
   *
   * Steps:
   * 1. Validate alias uniqueness via db.isAliasAvailable
   * 2. Generate a new keypair for the alias using eciesService
   * 3. Seal the alias-to-identity mapping via IdentitySealingPipeline
   *    (creates a ContentWithIdentity with the owner's real ID, sealed in Alias mode)
   * 4. Store the AliasRecord with the recovery record ID
   *
   * @param aliasName - The unique pseudonym to register
   * @param ownerMemberId - The real member ID of the alias owner
   * @param ownerPublicKey - The owner's public key (used as creatorId for sealing)
   * @returns The created AliasRecord
   * @throws QuorumError with AliasAlreadyTaken if alias name is not available
   * @throws QuorumError with IdentitySealingFailed if sealing fails
   */
  async registerAlias(
    aliasName: string,
    ownerMemberId: ShortHexGuid,
    ownerPublicKey: Uint8Array,
  ): Promise<AliasRecord<TID>> {
    // 1. Validate alias uniqueness
    const available = await this.db.isAliasAvailable(aliasName);
    if (!available) {
      throw new QuorumError(QuorumErrorType.AliasAlreadyTaken);
    }

    // 2. Generate a new keypair for the alias
    const mnemonic = this.eciesService.generateNewMnemonic();
    const aliasKeyPair = this.eciesService.mnemonicToSimpleKeyPair(mnemonic);

    // 3. Seal the alias-to-identity mapping via IdentitySealingPipeline
    // Create a ContentWithIdentity with the owner's real member ID as creatorId
    const idProvider = this.eciesService.idProvider;

    // Convert the owner member ID hex string to a TID for the creatorId
    const ownerMemberIdBytes = new Uint8Array(
      Buffer.from(ownerMemberId, 'hex'),
    );
    const creatorId = idProvider.fromBytes(ownerMemberIdBytes);

    const contentId = uint8ArrayToHex(idProvider.generate()) as ShortHexGuid;

    const sealResult = await this.identitySealingPipeline.sealIdentity(
      {
        creatorId,
        contentId,
        contentType: 'alias',
        signature: ownerPublicKey,
      },
      IdentityMode.Alias,
      aliasName,
    );

    // 4. Store the AliasRecord
    const epoch = await this.currentEpoch();
    const now = new Date();

    const aliasRecord: AliasRecord<TID> = {
      aliasName,
      ownerMemberId,
      aliasPublicKey: aliasKeyPair.publicKey,
      identityRecoveryRecordId: sealResult.recoveryRecordId,
      isActive: true,
      registeredAt: now,
      epochNumber: epoch.epochNumber,
    };

    await this.db.saveAlias(aliasRecord);

    return aliasRecord;
  }

  /**
   * Deregister an alias by marking it as inactive.
   *
   * After deregistration, the alias cannot be used for further content publication.
   *
   * @param aliasName - The alias name to deregister
   * @throws QuorumError with AliasNotFound if alias does not exist
   * @throws QuorumError with AliasInactive if alias is already inactive
   */
  async deregisterAlias(aliasName: string): Promise<void> {
    const alias = await this.db.getAlias(aliasName);
    if (!alias) {
      throw new QuorumError(QuorumErrorType.AliasNotFound);
    }

    if (!alias.isActive) {
      throw new QuorumError(QuorumErrorType.AliasInactive);
    }

    // Mark as inactive and set deactivation timestamp
    const updatedAlias: AliasRecord<TID> = {
      ...alias,
      isActive: false,
      deactivatedAt: new Date(),
    };

    await this.db.saveAlias(updatedAlias);
  }

  /**
   * Look up the real identity behind an alias given sufficient quorum shares.
   *
   * Uses the alias's identityRecoveryRecordId to recover the real identity
   * via IdentitySealingPipeline.recoverIdentity().
   *
   * @param aliasName - The alias name to look up
   * @param decryptedShares - Map of member ID to decrypted share string
   * @returns The recovered real identity
   * @throws QuorumError with AliasNotFound if alias does not exist
   * @throws QuorumError with InsufficientSharesForReconstruction if not enough shares
   */
  async lookupAlias(
    aliasName: string,
    decryptedShares: Map<ShortHexGuid, string>,
  ): Promise<TID> {
    const alias = await this.db.getAlias(aliasName);
    if (!alias) {
      throw new QuorumError(QuorumErrorType.AliasNotFound);
    }

    return this.identitySealingPipeline.recoverIdentity(
      alias.identityRecoveryRecordId,
      decryptedShares,
    );
  }
}
