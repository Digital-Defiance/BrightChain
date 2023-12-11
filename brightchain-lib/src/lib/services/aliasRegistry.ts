/**
 * @fileoverview AliasRegistry — manages pseudonymous alias registration,
 * deregistration, and lookup.
 *
 * Aliases map back to a member's real identity through the BrightTrust.
 * The alias-to-identity mapping is sealed via IdentitySealingPipeline.
 *
 * @see Requirements 15
 * @see Design: AliasRegistry (Section 5)
 */

import {
  ECIESService,
  HexString,
  PlatformID,
} from '@digitaldefiance/ecies-lib';
import { BrightTrustErrorType } from '../enumerations/brightTrustErrorType';
import { BrightTrustError } from '../errors/brightTrustError';
import { AliasRecord } from '../interfaces/aliasRecord';
import { BrightTrustEpoch } from '../interfaces/brightTrustEpoch';
import { IdentityMode } from '../interfaces/contentWithIdentity';
import { IBrightTrustDatabase } from '../interfaces/services/brightTrustDatabase';
import { IdentitySealingPipeline } from './identitySealingPipeline';

/**
 * AliasRegistry manages pseudonymous alias registration, deregistration,
 * and identity lookup for the BrightTrust system.
 *
 * - Registration validates uniqueness, generates an alias keypair,
 *   seals the alias-to-identity mapping via IdentitySealingPipeline,
 *   and stores the AliasRecord.
 * - Deregistration marks an alias as inactive.
 * - Lookup recovers the real identity behind an alias given sufficient
 *   BrightTrust shares.
 *
 * @template TID - Platform ID type for frontend/backend DTO compatibility
 */
export class AliasRegistry<TID extends PlatformID = Uint8Array> {
  constructor(
    private readonly db: IBrightTrustDatabase<TID>,
    private readonly identitySealingPipeline: IdentitySealingPipeline<TID>,
    private readonly eciesService: ECIESService<TID>,
    private readonly currentEpoch: () => Promise<BrightTrustEpoch<TID>>,
  ) {}

  /**
   * Register a new alias for a BrightTrust member.
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
   * @throws BrightTrustError with AliasAlreadyTaken if alias name is not available
   * @throws BrightTrustError with IdentitySealingFailed if sealing fails
   */
  async registerAlias(
    aliasName: string,
    ownerMemberId: HexString,
    ownerPublicKey: Uint8Array,
  ): Promise<AliasRecord<TID>> {
    // 1. Validate alias uniqueness
    const available = await this.db.isAliasAvailable(aliasName);
    if (!available) {
      throw new BrightTrustError(BrightTrustErrorType.AliasAlreadyTaken);
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

    const contentId = idProvider.toString(
      idProvider.generate(),
      'hex',
    ) as HexString;

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
      ownerMemberId: ownerMemberId as unknown as TID,
      aliasPublicKey: aliasKeyPair.publicKey,
      identityRecoveryRecordId: sealResult.recoveryRecordId as unknown as TID,
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
   * @throws BrightTrustError with AliasNotFound if alias does not exist
   * @throws BrightTrustError with AliasInactive if alias is already inactive
   */
  async deregisterAlias(aliasName: string): Promise<void> {
    const alias = await this.db.getAlias(aliasName);
    if (!alias) {
      throw new BrightTrustError(BrightTrustErrorType.AliasNotFound);
    }

    if (!alias.isActive) {
      throw new BrightTrustError(BrightTrustErrorType.AliasInactive);
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
   * Look up the real identity behind an alias given sufficient BrightTrust shares.
   *
   * Uses the alias's identityRecoveryRecordId to recover the real identity
   * via IdentitySealingPipeline.recoverIdentity().
   *
   * @param aliasName - The alias name to look up
   * @param decryptedShares - Map of member ID to decrypted share string
   * @returns The recovered real identity
   * @throws BrightTrustError with AliasNotFound if alias does not exist
   * @throws BrightTrustError with InsufficientSharesForReconstruction if not enough shares
   */
  async lookupAlias(
    aliasName: string,
    decryptedShares: Map<HexString, string>,
  ): Promise<TID> {
    const alias = await this.db.getAlias(aliasName);
    if (!alias) {
      throw new BrightTrustError(BrightTrustErrorType.AliasNotFound);
    }

    return this.identitySealingPipeline.recoverIdentity(
      alias.identityRecoveryRecordId as unknown as HexString,
      decryptedShares,
    );
  }
}
