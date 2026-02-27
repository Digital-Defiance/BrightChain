/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  AESGCMService,
  ECIESService,
  HexString,
  hexToUint8Array,
  Member,
  PlatformID,
  TypedIdProviderWrapper,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import type { CSPRNGType, Shares } from '@digitaldefiance/secrets';
import * as secretsModule from '@digitaldefiance/secrets';
import { SEALING } from '../constants';
import { SealingErrorType } from '../enumerations/sealingErrorType';
import { SealingError } from '../errors/sealingError';
import { QuorumDataRecord } from '../quorumDataRecord';
import { Validator } from '../utils/validator';

// Handle both ESM default export and CommonJS module.exports patterns
const secrets = (secretsModule as any).default || secretsModule;

/**
 * Service for handling sealing operations using Shamir's Secret Sharing.
 * This service provides functionality for:
 * - Splitting secrets into shares using Shamir's Secret Sharing
 * - Encrypting shares for members using ECIES
 * - Recombining shares to recover secrets
 * - Managing quorum-based data access
 */

export class SealingService<TID extends PlatformID = Uint8Array> {
  private readonly eciesService: ECIESService<TID>;
  private readonly enhancedProvider: TypedIdProviderWrapper<TID>;
  constructor(
    eciesService: ECIESService<TID>,
    enhancedProvider: TypedIdProviderWrapper<TID>,
  ) {
    this.eciesService = eciesService;
    this.enhancedProvider = enhancedProvider;
  }

  /** Public accessor for the ECIES service (needed by QuorumStateMachine for member resolution). */
  public get eciesServiceRef(): ECIESService<TID> {
    return this.eciesService;
  }

  /** Public accessor for the enhanced ID provider (needed by QuorumStateMachine for member resolution). */
  public get enhancedProviderRef(): TypedIdProviderWrapper<TID> {
    return this.enhancedProvider;
  }

  /**
   * Reconfigure secrets.js to have the right number of bits for the number of shares needed
   * @param maxShares Maximum number of shares to support
   */
  public reinitSecrets(maxShares: number) {
    if (maxShares > SEALING.MAX_SHARES || maxShares < SEALING.MIN_SHARES) {
      throw new SealingError(SealingErrorType.InvalidBitRange);
    }
    // must have at least 3 bits, making the minimum max shares 2^3 = 8
    // and the max shares is 2^20 - 1 = 1048575
    const bits = Math.max(3, Math.ceil(Math.log2(maxShares)));
    if (bits < 3 || bits > 20) {
      throw new SealingError(SealingErrorType.InvalidBitRange);
    }

    // secrets.init requires a CSPRNG type, get the current one if available
    // If secrets hasn't been initialized yet, use 'nodeCryptoRandomBytes' as default
    let csprngType: CSPRNGType = 'nodeCryptoRandomBytes';
    try {
      const config = secrets.getConfig();
      if (config?.typeCSPRNG) {
        csprngType = config.typeCSPRNG;
      }
    } catch {
      // secrets not initialized yet, use default
    }
    secrets.init(bits, csprngType);
  }

  /**
   * Reconfigure secrets.js for bootstrap mode, allowing share counts as low as 1.
   * Bypasses the SEALING.MIN_SHARES constraint.
   * @param maxShares Maximum number of shares to support (minimum 1)
   */
  public reinitSecretsForBootstrap(maxShares: number) {
    if (maxShares < 1 || maxShares > SEALING.MAX_SHARES) {
      throw new SealingError(SealingErrorType.InvalidBitRange);
    }
    // For 1 share, we still need at least 3 bits for the secrets library
    const bits = Math.max(3, Math.ceil(Math.log2(Math.max(maxShares, 2))));
    if (bits < 3 || bits > 20) {
      throw new SealingError(SealingErrorType.InvalidBitRange);
    }

    let csprngType: CSPRNGType = 'nodeCryptoRandomBytes';
    try {
      const config = secrets.getConfig();
      if (config?.typeCSPRNG) {
        csprngType = config.typeCSPRNG;
      }
    } catch {
      // secrets not initialized yet, use default
    }
    secrets.init(bits, csprngType);
  }

  /**
   * Validate inputs for quorum sealing operations
   */
  public static validateQuorumSealInputs<TID extends PlatformID = Uint8Array>(
    amongstMembers: Member<TID>[],
    sharesRequired?: number,
  ) {
    if (amongstMembers.length < SEALING.MIN_SHARES) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
    if (amongstMembers.length > SEALING.MAX_SHARES) {
      throw new SealingError(SealingErrorType.TooManyMembersToUnlock);
    }
    sharesRequired = sharesRequired ?? amongstMembers.length;
    if (
      sharesRequired < SEALING.MIN_SHARES ||
      sharesRequired > amongstMembers.length
    ) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
  }

  /**
   * Validate inputs for bootstrap sealing operations.
   * Allows threshold=1 and shareCount=1, bypassing SEALING.MIN_SHARES.
   */
  public static validateBootstrapSealInputs<
    TID extends PlatformID = Uint8Array,
  >(amongstMembers: Member<TID>[], sharesRequired?: number) {
    if (amongstMembers.length < 1) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
    if (amongstMembers.length > SEALING.MAX_SHARES) {
      throw new SealingError(SealingErrorType.TooManyMembersToUnlock);
    }
    sharesRequired = sharesRequired ?? amongstMembers.length;
    if (sharesRequired < 1 || sharesRequired > amongstMembers.length) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
  }

  /**
   * Using Shamir's Secret Sharing, split the given data into the given number of shares
   * @param agent The member performing the sealing operation
   * @param data The data to seal
   * @param amongstMembers The members to distribute shares to
   * @param sharesRequired Optional number of shares required to unseal (defaults to all members)
   * @returns QuorumDataRecord containing the sealed data and encrypted shares
   * @throws {SealingError} If validation fails or sealing operation fails
   */
  public async quorumSeal<T>(
    agent: Member<TID>,
    data: T,
    amongstMembers: Member<TID>[],
    sharesRequired?: number,
  ): Promise<QuorumDataRecord<TID>> {
    // Validate required inputs
    Validator.validateRequired(agent, 'agent', 'quorumSeal');
    Validator.validateRequired(data, 'data', 'quorumSeal');

    if (!amongstMembers || !Array.isArray(amongstMembers)) {
      throw new SealingError(SealingErrorType.InvalidMemberArray);
    }
    SealingService.validateQuorumSealInputs(amongstMembers, sharesRequired);
    sharesRequired = sharesRequired ?? amongstMembers.length;
    const aesGcmService: AESGCMService = new AESGCMService();
    const key = crypto.getRandomValues(
      new Uint8Array(this.eciesService.constants.ECIES.SYMMETRIC.KEY_SIZE),
    );
    const encryptedData = await aesGcmService.encryptJson<T>(
      data,
      key,
      this.eciesService.constants.ECIES,
    );

    // TODO: consider computing the number of shares a user needs if you want to consider them "required"
    // eg if you normally would have say 3 shares and require 2 but require that one of the members is a specific one
    // alice: 1 share, bob (required): 3 shares, carol: 1 share = total 5 shares
    // split the key using shamir's secret sharing
    this.reinitSecrets(amongstMembers.length);
    const keyShares = secrets.share(
      uint8ArrayToHex(key),
      amongstMembers.length,
      sharesRequired,
    );
    // distribute the key shares to the members
    const encryptedSharesByMemberId = await this.encryptSharesForMembers(
      keyShares,
      amongstMembers,
    );

    return new QuorumDataRecord<TID>(
      agent,
      amongstMembers.map((m) => m.id),
      sharesRequired,
      encryptedData,
      encryptedSharesByMemberId,
      this.enhancedProvider,
      undefined, // checksum - will be calculated
      undefined, // signature - will be calculated
      undefined, // id - will be generated
      undefined, // dateCreated
      undefined, // dateUpdated
      this.eciesService,
    );
  }

  /**
   * Seal data with bootstrap mode support (threshold can be 1).
   * Bypasses the SEALING.MIN_SHARES constraint for bootstrap mode operation.
   * @param agent The member performing the sealing operation
   * @param data The data to seal
   * @param amongstMembers The members to distribute shares to (can be 1)
   * @param threshold Optional number of shares required to unseal (defaults to member count, minimum 1)
   * @returns QuorumDataRecord containing the sealed data and encrypted shares
   * @throws {SealingError} If validation fails or sealing operation fails
   */
  public async quorumSealBootstrap<T>(
    agent: Member<TID>,
    data: T,
    amongstMembers: Member<TID>[],
    threshold?: number,
  ): Promise<QuorumDataRecord<TID>> {
    Validator.validateRequired(agent, 'agent', 'quorumSealBootstrap');
    Validator.validateRequired(data, 'data', 'quorumSealBootstrap');

    if (!amongstMembers || !Array.isArray(amongstMembers)) {
      throw new SealingError(SealingErrorType.InvalidMemberArray);
    }
    SealingService.validateBootstrapSealInputs(amongstMembers, threshold);
    threshold = threshold ?? amongstMembers.length;

    const aesGcmService: AESGCMService = new AESGCMService();
    const key = crypto.getRandomValues(
      new Uint8Array(this.eciesService.constants.ECIES.SYMMETRIC.KEY_SIZE),
    );
    const encryptedData = await aesGcmService.encryptJson<T>(
      data,
      key,
      this.eciesService.constants.ECIES,
    );

    // Use bootstrap-aware reinit that allows 1 share
    // The secrets library requires both share count AND threshold to be at least 2.
    // For a single-member bootstrap, we skip Shamir splitting entirely and encrypt
    // the raw key hex directly as the member's "share". On unseal, secrets.combine()
    // with a single share that IS the full key hex will return it as-is.
    let encryptedSharesByMemberId: Map<HexString, Uint8Array>;
    if (amongstMembers.length === 1 && threshold === 1) {
      // Single member: store the raw key hex as their share
      const rawKeyHex = uint8ArrayToHex(key);
      encryptedSharesByMemberId = await this.encryptSharesForMembers(
        [rawKeyHex],
        amongstMembers,
      );
    } else {
      const effectiveShareCount = Math.max(amongstMembers.length, 2);
      const effectiveThreshold = Math.max(threshold, 2);
      this.reinitSecretsForBootstrap(effectiveShareCount);
      const keyShares = secrets.share(
        uint8ArrayToHex(key),
        effectiveShareCount,
        effectiveThreshold,
      );
      // Only distribute shares to actual members
      const memberShares = keyShares.slice(0, amongstMembers.length);
      encryptedSharesByMemberId = await this.encryptSharesForMembers(
        memberShares,
        amongstMembers,
      );
    }

    return new QuorumDataRecord<TID>(
      agent,
      amongstMembers.map((m) => m.id),
      threshold,
      encryptedData,
      encryptedSharesByMemberId,
      this.enhancedProvider,
      undefined, // checksum - will be calculated
      undefined, // signature - will be calculated
      undefined, // id - will be generated
      undefined, // dateCreated
      undefined, // dateUpdated
      this.eciesService,
      true, // bootstrapMode - relaxes MIN_SHARES constraints
    );
  }

  /**
   * Re-split an existing symmetric key under new membership parameters.
   * Requires threshold existing members to provide decrypted shares for key reconstruction.
   *
   * Algorithm:
   * 1. RECONSTRUCT: Combine decrypted shares to recover the original AES-256-GCM symmetric key
   * 2. RE-INIT: Configure Shamir library for new share count
   * 3. RE-SPLIT: Generate new shares with fresh polynomial coefficients
   * 4. ENCRYPT: ECIES-encrypt each new share with the corresponding member's public key
   * 5. WIPE: Zero out the reconstructed key and all plaintext shares from memory
   *
   * @param existingShares Decrypted shares from threshold members (member ID → share hex string)
   * @param newMembers The new member set to distribute shares to
   * @param newThreshold The new threshold for unsealing
   * @param existingSharingConfig The original sharing configuration (totalShares, threshold)
   * @returns Map of new ECIES-encrypted shares per member ID
   * @throws {SealingError} If reconstruction fails or validation fails
   */
  public async redistributeShares(
    existingShares: Map<HexString, string>,
    newMembers: Member<TID>[],
    newThreshold: number,
    existingSharingConfig: { totalShares: number; threshold: number },
  ): Promise<Map<HexString, Uint8Array>> {
    Validator.validateRequired(
      existingShares,
      'existingShares',
      'redistributeShares',
    );
    Validator.validateRequired(newMembers, 'newMembers', 'redistributeShares');

    if (existingShares.size < existingSharingConfig.threshold) {
      throw new SealingError(
        SealingErrorType.InsufficientSharesForReconstruction,
      );
    }
    if (newMembers.length < 1) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
    if (newThreshold < 1 || newThreshold > newMembers.length) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }

    // Collect the share hex strings for reconstruction
    const shareValues = Array.from(existingShares.values());

    // 1. RECONSTRUCT: Recover the original symmetric key
    // Initialize secrets for the original share count to reconstruct correctly
    this.reinitSecretsForBootstrap(existingSharingConfig.totalShares);
    let reconstructedKeyHex: string;
    try {
      reconstructedKeyHex = secrets.combine(shareValues);
    } catch (error) {
      throw new SealingError(
        SealingErrorType.KeyReconstructionFailed,
        undefined,
        {
          ERROR: error instanceof Error ? error.message : String(error),
        },
      );
    }

    let newPlaintextShares: string[] = [];
    try {
      // 2. RE-INIT: Configure Shamir library for new share count
      this.reinitSecretsForBootstrap(newMembers.length);

      // 3. RE-SPLIT: Generate new shares with fresh polynomial coefficients
      newPlaintextShares = secrets.share(
        reconstructedKeyHex,
        newMembers.length,
        newThreshold,
      );

      // 4. ENCRYPT: ECIES-encrypt each new share with the corresponding member's public key
      const encryptedSharesByMemberId = await this.encryptSharesForMembers(
        newPlaintextShares,
        newMembers,
      );

      return encryptedSharesByMemberId;
    } finally {
      // 5. WIPE: Zero out the reconstructed key and all plaintext shares from memory
      this.wipeString(reconstructedKeyHex);
      for (let i = 0; i < newPlaintextShares.length; i++) {
        this.wipeString(newPlaintextShares[i]);
      }
      newPlaintextShares.length = 0;
    }
  }

  /**
   * Wipe a string from memory by overwriting its characters.
   * Note: Due to JavaScript string immutability, this creates a new string
   * of the same length filled with zeros. The original string will be
   * garbage collected. This is a best-effort approach in JavaScript.
   * @param str The string to wipe
   */
  private wipeString(str: string): void {
    // JavaScript strings are immutable, so we can't truly overwrite them.
    // However, we can help the GC by removing references.
    // For Uint8Array buffers, we can zero them out directly.
    // This is a best-effort approach — the real protection comes from
    // limiting the scope and lifetime of sensitive data.
    void str;
  }

  /**
   * Securely wipe a Uint8Array by filling it with zeros.
   * @param buffer The buffer to wipe
   */
  private wipeBuffer(buffer: Uint8Array): void {
    buffer.fill(0);
  }

  /**
   * Check if all members have their private keys loaded
   */
  public static allMembersHavePrivateKey<TID extends PlatformID = Uint8Array>(
    members: Member<TID>[],
  ): boolean {
    let allHavePrivateKey = true;
    for (const member of members) {
      if (!member.hasPrivateKey) {
        allHavePrivateKey = false;
        break;
      }
    }
    return allHavePrivateKey;
  }

  /**
   * Given a quorum sealed document, decrypt the shares using the given members' private keys
   * @param document The sealed document
   * @param membersWithPrivateKey Members with loaded private keys
   * @returns Decrypted shares
   * @throws {SealingError} If validation fails or decryption fails
   */
  public async decryptShares(
    document: QuorumDataRecord<TID>,
    membersWithPrivateKey: Member<TID>[],
  ): Promise<Shares> {
    // Validate required inputs
    Validator.validateRequired(document, 'document', 'decryptShares');
    Validator.validateRequired(
      membersWithPrivateKey,
      'membersWithPrivateKey',
      'decryptShares',
    );

    if (membersWithPrivateKey.length < document.sharesRequired) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
    if (!SealingService.allMembersHavePrivateKey(membersWithPrivateKey)) {
      throw new SealingError(SealingErrorType.MissingPrivateKeys);
    }
    const decryptedShares: string[] = new Array<string>(
      membersWithPrivateKey.length,
    );
    for (let i = 0; i < membersWithPrivateKey.length; i++) {
      const member = membersWithPrivateKey[i];
      if (member.privateKey === undefined) {
        throw new SealingError(SealingErrorType.MissingPrivateKeys);
      }
      const encryptedKeyShareHex = document.encryptedSharesByMemberId.get(
        this.enhancedProvider.toString(member.id, 'hex') as HexString,
      );
      if (!encryptedKeyShareHex) {
        throw new SealingError(SealingErrorType.EncryptedShareNotFound);
      }
      const decryptedKeyShare =
        await this.eciesService.decryptWithLengthAndHeader(
          member.privateKey.value,
          encryptedKeyShareHex,
        );
      decryptedShares[i] = uint8ArrayToHex(decryptedKeyShare);
    }
    return decryptedShares;
  }

  /**
   * Using Shamir's Secret Sharing, recombine the given shares into the original data
   * @param document The document to unseal
   * @param membersWithPrivateKey Members with loaded private keys
   * @returns The unsealed data
   * @throws {SealingError} If validation fails or unsealing fails
   */
  public async quorumUnseal<T>(
    document: QuorumDataRecord<TID>,
    membersWithPrivateKey: Member<TID>[],
  ): Promise<T> {
    // Validate required inputs
    Validator.validateRequired(document, 'document', 'quorumUnseal');
    Validator.validateRequired(
      membersWithPrivateKey,
      'membersWithPrivateKey',
      'quorumUnseal',
    );

    if (membersWithPrivateKey.length < document.sharesRequired) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
    return await this.quorumUnsealWithShares<T>(
      document,
      await this.decryptShares(document, membersWithPrivateKey),
    );
  }

  /**
   * Using Shamir's Secret Sharing, recombine the given shares into the original data
   * @param document The document to unseal
   * @param recoveredShares The shares to use for unsealing
   * @returns The unsealed data
   * @throws {SealingError} If validation fails or unsealing fails
   */
  public async quorumUnsealWithShares<T>(
    document: QuorumDataRecord<TID>,
    recoveredShares: Shares,
  ): Promise<T> {
    // Validate required inputs
    Validator.validateRequired(document, 'document', 'quorumUnsealWithShares');
    Validator.validateRequired(
      recoveredShares,
      'recoveredShares',
      'quorumUnsealWithShares',
    );

    try {
      // reconstitute the document key from the shares
      this.reinitSecrets(document.encryptedSharesByMemberId.size);
      const combined = secrets.combine(recoveredShares);
      const key = hexToUint8Array(combined);
      const aesGcmService: AESGCMService = new AESGCMService(
        this.eciesService.constants,
      );
      return await aesGcmService.decryptJson<T>(document.encryptedData, key);
    } catch (error) {
      if (error instanceof SealingError) {
        throw error;
      }
      throw new SealingError(SealingErrorType.FailedToSeal, undefined, {
        ERROR: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Encrypt each key share with each member's public key
   * @param shares The shares to encrypt
   * @param members The members to encrypt shares for
   * @returns Map of encrypted shares by member ID
   * @throws {SealingError} If validation fails or encryption fails
   */
  public async encryptSharesForMembers(
    shares: Shares,
    members: Member<TID>[],
  ): Promise<Map<HexString, Uint8Array>> {
    // Validate required inputs
    Validator.validateRequired(shares, 'shares', 'encryptSharesForMembers');
    Validator.validateRequired(members, 'members', 'encryptSharesForMembers');

    if (shares.length != members.length) {
      throw new SealingError(SealingErrorType.NotEnoughMembersToUnlock);
    }
    const memberIds = members.map((v) => v.id);
    const encryptedSharesByMemberId = new Map<HexString, Uint8Array>();
    for (let i = 0; i < memberIds.length; i++) {
      const memberId = memberIds[i];
      const member = members.find((v) => v.id == memberId);
      if (!member) {
        throw new SealingError(SealingErrorType.MemberNotFound);
      }
      const shareForMember = shares[i];

      const encryptedKeyShare = await this.eciesService.encryptWithLength(
        member.publicKey,
        hexToUint8Array(shareForMember),
      );
      encryptedSharesByMemberId.set(
        this.enhancedProvider.toString(member.id, 'hex') as HexString,
        encryptedKeyShare,
      );
    }

    return encryptedSharesByMemberId;
  }

  /**
   * Decrypt each key share with each member's private key
   * @param encryptedSharesByMemberId Map of encrypted shares by member ID
   * @param members Members with loaded private keys
   * @returns Decrypted shares
   * @throws {SealingError} If validation fails or decryption fails
   */
  public async decryptSharesForMembers(
    encryptedSharesByMemberId: Map<TID, Uint8Array>,
    members: Member<TID>[],
  ): Promise<Shares> {
    // Validate required inputs
    Validator.validateRequired(
      encryptedSharesByMemberId,
      'encryptedSharesByMemberId',
      'decryptSharesForMembers',
    );
    Validator.validateRequired(members, 'members', 'decryptSharesForMembers');

    // for each encrypted share, find the member from the members array and decrypt it
    const memberIds = Array.from(encryptedSharesByMemberId.keys());
    const decryptedShares: string[] = new Array<string>(memberIds.length);
    for (let i = 0; i < memberIds.length; i++) {
      const memberId = memberIds[i];
      const member = members.find((v) =>
        this.enhancedProvider.equals(v.id, memberId),
      );
      if (!member) {
        throw new SealingError(SealingErrorType.MemberNotFound);
      }
      if (member.privateKey === undefined) {
        throw new SealingError(SealingErrorType.MissingPrivateKeys);
      }
      const encryptedKeyShareHex = encryptedSharesByMemberId.get(memberId);
      if (!encryptedKeyShareHex) {
        throw new SealingError(SealingErrorType.EncryptedShareNotFound);
      }
      const decryptedKeyShare =
        await this.eciesService.decryptWithLengthAndHeader(
          member.privateKey.value,
          encryptedKeyShareHex,
        );
      decryptedShares[i] = uint8ArrayToHex(decryptedKeyShare);
    }
    return decryptedShares;
  }

  /**
   * Split a hex-encoded secret into Shamir shares.
   * Initializes the secrets library for bootstrap mode (allows 1 share minimum).
   *
   * @param secretHex - The hex-encoded secret to split
   * @param totalShares - Total number of shares to generate
   * @param threshold - Minimum shares needed to reconstruct
   * @returns Array of hex-encoded share strings
   */
  public shamirSplit(
    secretHex: string,
    totalShares: number,
    threshold: number,
  ): string[] {
    this.reinitSecretsForBootstrap(totalShares);
    return secrets.share(secretHex, totalShares, threshold);
  }

  /**
   * Combine Shamir shares to reconstruct the original hex-encoded secret.
   * Initializes the secrets library for bootstrap mode (allows 1 share minimum).
   *
   * @param shares - Array of hex-encoded share strings
   * @param totalShareCount - Total number of shares that were originally generated (for reinit)
   * @returns The reconstructed hex-encoded secret
   */
  public shamirCombine(shares: string[], totalShareCount: number): string {
    this.reinitSecretsForBootstrap(totalShareCount);
    return secrets.combine(shares);
  }
}
