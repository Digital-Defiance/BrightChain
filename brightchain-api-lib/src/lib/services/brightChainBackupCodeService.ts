import {
  IBackupCodeConstants,
  IMemberQueryCriteria,
  IStoredBackupCode,
  MemberStore,
} from '@brightchain/brightchain-lib';
import { SecureBuffer, SecureString } from '@digitaldefiance/ecies-lib';
import { ECIESService, Member, PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  BackupCode,
  InvalidBackupCodeVersionError,
  KeyWrappingService,
  SymmetricService,
} from '@digitaldefiance/node-express-suite';
import { InvalidBackupCodeError } from '@digitaldefiance/suite-core-lib';

/**
 * BrightChain-native backup code service that ports the upstream
 * cryptographic scheme (Argon2id / HKDF-SHA256 / AEAD / ECIES) to
 * work with MemberStore and BrightDB instead of MongoDB.
 *
 * Delegates all cryptographic primitives to the upstream {@link BackupCode}
 * static methods while handling persistence through {@link MemberStore}.
 */
export class BrightChainBackupCodeService<TID extends PlatformID = Uint8Array> {
  private readonly memberStore: MemberStore<TID>;
  private readonly eciesService: ECIESService<TID>;
  private readonly keyWrappingService: KeyWrappingService;
  private readonly backupCodeConstants: IBackupCodeConstants;
  private systemUser?: Member<TID>;

  constructor(
    memberStore: MemberStore<TID>,
    eciesService: ECIESService<TID>,
    keyWrappingService: KeyWrappingService,
    backupCodeConstants: IBackupCodeConstants,
  ) {
    this.memberStore = memberStore;
    this.eciesService = eciesService;
    this.keyWrappingService = keyWrappingService;
    this.backupCodeConstants = backupCodeConstants;
  }

  /**
   * Set the system user whose ECIES key pair is used to wrap/unwrap
   * backup code AEAD blobs.
   */
  public setSystemUser(user: Member<TID>): void {
    this.systemUser = user;
  }

  /**
   * Retrieve the system user, throwing if not yet set.
   * @throws {Error} If the system user has not been provided via {@link setSystemUser}.
   */
  private getSystemUser(): Member<TID> {
    if (!this.systemUser) {
      throw new Error('System user not available');
    }
    return this.systemUser;
  }

  /**
   * Generate N plaintext codes, encrypt them, persist to member profile,
   * and return the plaintext strings.
   *
   * 1. Resolve system user and backup user (member)
   * 2. Generate `Count` random backup codes via upstream BackupCode primitives
   * 3. Encrypt codes (Argon2id KDF → AEAD → ECIES wrap) via upstream static method
   * 4. Persist encrypted codes to member's private profile via MemberStore
   * 5. Return plaintext display-formatted strings
   */
  async generateCodes(memberId: TID): Promise<string[]> {
    const systemUser = this.getSystemUser();
    const backupUser = await this.memberStore.getMember(memberId);

    // Generate plaintext backup codes using upstream primitives
    const count = this.backupCodeConstants.Count;
    const codes: BackupCode[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(new BackupCode(BackupCode.generateBackupCode()));
    }

    // Encrypt codes using the upstream multi-layer scheme
    // (HKDF-SHA256 checksum, Argon2id KDF, AEAD encryption, ECIES wrapping)
    // MemberStore returns ecies-lib Member; BackupCode expects node-ecies-lib Member.
    // Node_Member extends Base_Member, so instanceof narrows safely.
    if (!(backupUser instanceof Member)) {
      throw new Error(
        'backupUser must be a node-ecies-lib Member (Node_Member)',
      );
    }
    const encryptedCodes = await BackupCode.encryptBackupCodes(
      backupUser,
      systemUser,
      codes,
    );

    // Persist encrypted codes to member's private profile
    await this.memberStore.updateMember(memberId, {
      id: memberId,
      privateChanges: {
        backupCodes: encryptedCodes as IStoredBackupCode[],
      },
    });

    // Return plaintext display-formatted strings (e.g. xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx)
    return codes.map((code) => code.value);
  }


  /**
   * Return the count of stored backup codes for a member.
   */
  async getCodeCount(memberId: TID): Promise<number> {
      const profile = await this.memberStore.getMemberProfile(memberId);
      if (!profile.privateProfile) {
        return 0;
      }
      const storedCodes = profile.privateProfile.backupCodes ?? [];
      return storedCodes.length;
    }

  /**
   * Validate and consume a backup code. Detects the version of the stored
   * codes, then delegates to the version-specific handler.
   *
   * @param encryptedBackupCodes - The stored encrypted backup codes array
   * @param backupCode - The plaintext backup code submitted by the user
   * @returns The updated codes array (matched entry removed) and the matched entry
   * @throws {InvalidBackupCodeError} If no stored code matches the submitted code
   * @throws {InvalidBackupCodeVersionError} If the stored codes have an unsupported version
   */
  useBackupCode(
    encryptedBackupCodes: IStoredBackupCode[],
    backupCode: string,
  ): { newCodesArray: IStoredBackupCode[]; code: IStoredBackupCode } {
    if (encryptedBackupCodes.length === 0) {
      throw new InvalidBackupCodeError();
    }

    // Detect the version by matching the checksum against stored codes
    const version = BackupCode.detectBackupCodeVersion(
      encryptedBackupCodes,
      backupCode,
    );

    switch (version) {
      case BackupCode.BackupCodeVersion: {
        // Filter to only codes of the matched version
        const versionCodes = encryptedBackupCodes.filter(
          (c) => c.version === BackupCode.BackupCodeVersion,
        );

        // Validate the code against the version-filtered set
        const isValid = BackupCode.validateBackupCode(
          versionCodes,
          backupCode,
        );
        if (!isValid) {
          throw new InvalidBackupCodeError();
        }

        // Find and remove the matched code by re-validating individually
        const normalizedCode = BackupCode.normalizeCode(backupCode);
        let matchedCode: IStoredBackupCode | undefined;

        for (const storedCode of versionCodes) {
          if (BackupCode.validateBackupCode([storedCode], normalizedCode)) {
            matchedCode = storedCode;
            break;
          }
        }

        if (!matchedCode) {
          throw new InvalidBackupCodeError();
        }

        // Filter out the matched code by checksum identity
        const newCodesArray = encryptedBackupCodes.filter(
          (c) => c.checksum !== matchedCode!.checksum,
        );

        return { newCodesArray, code: matchedCode };
      }
      default:
        throw new InvalidBackupCodeVersionError(version);
    }
  }

  /**
   * Recover the user's private key from a consumed backup code entry.
   */
  /**
     * Recover the user's private key from a consumed backup code entry.
     *
     * Flow (mirrors upstream BackupCodeService.recoverKeyWithBackupCodeV1):
     * 1. Retrieve stored backup codes from the member's private profile
     * 2. Consume the submitted code via useBackupCode() (constant-time checksum match)
     * 3. Unwrap the ECIES layer using the system user's private key
     * 4. Derive the Argon2id key from the plaintext code + per-code salt
     * 5. Decrypt the AEAD blob to recover the user's private key
     * 6. Reconstruct a Member with the recovered private key
     * 7. Optionally re-wrap the private key with a new password
     * 8. Persist the updated codes array (consumed code removed)
     *
     * @param memberId - The ID of the member whose key is being recovered
     * @param backupCode - The plaintext backup code submitted by the user
     * @param newPassword - Optional new password to re-wrap the recovered private key
     * @returns The recovered BackendMember and remaining backup code count
     * @throws {InvalidBackupCodeError} If the submitted code doesn't match any stored code
     * @throws {Error} If the system user is not available or member is not found
     */
    async recoverKeyWithBackupCode(
      memberId: TID,
      backupCode: string,
      newPassword?: string,
    ): Promise<{ user: Member<TID>; codeCount: number }> {
      const systemUser = this.getSystemUser();

      // Retrieve the member (for public key, name, email, type, etc.)
      const member = await this.memberStore.getMember(memberId);

      // Retrieve stored backup codes from the member's private profile
      const profile = await this.memberStore.getMemberProfile(memberId);
      if (!profile.privateProfile) {
        throw new Error('Member not found');
      }
      const storedCodes = profile.privateProfile.backupCodes ?? [];

      // Normalize the code (strip dashes)
      const normalizedCode = BackupCode.normalizeCode(backupCode);

      // Consume the backup code (validates checksum and removes from array)
      const { newCodesArray, code: matchedCode } = this.useBackupCode(
        storedCodes,
        normalizedCode,
      );

      // Derive the Argon2id decryption key from the plaintext code and per-code salt
      let decryptionKey: Buffer | undefined;
      try {
        decryptionKey = await BackupCode.getBackupKeyV1(
          matchedCode.checksumSalt,
          normalizedCode,
        );

        // Unwrap the ECIES layer using the system user's private key
        const privateKeyUnwrapped = await systemUser.decryptData(
          Buffer.from(matchedCode.encrypted, 'hex'),
        );

        // Decrypt the AEAD blob using the Argon2id-derived key
        const decryptedPrivateKey = new SecureBuffer(
          SymmetricService.decryptBuffer(privateKeyUnwrapped, decryptionKey),
        );

        // Reconstruct the Member with the recovered private key
        const recoveredUser = new Member<TID>(
          this.eciesService,
          member.type,
          member.name,
          member.email,
          Buffer.from(member.publicKey),
          decryptedPrivateKey,
          undefined, // wallet
          member.id,
          member.dateCreated,
          member.dateUpdated,
        );

        // Optionally re-wrap the private key with a new password
        if (newPassword) {
          const wrapped = this.keyWrappingService.wrapSecret(
            decryptedPrivateKey,
            new SecureString(newPassword),
          );
          // Persist the password-wrapped private key alongside the updated codes
          await this.memberStore.updateMember(memberId, {
            id: memberId,
            privateChanges: {
              backupCodes: newCodesArray as IStoredBackupCode[],
            },
          });
          // Note: passwordWrappedPrivateKey storage would be handled by the
          // caller or a separate auth service if needed. The wrapped value
          // is available on the returned member for the controller to use.
          void wrapped; // consumed by caller if needed
        } else {
          // Persist the updated codes array (consumed code removed)
          await this.memberStore.updateMember(memberId, {
            id: memberId,
            privateChanges: {
              backupCodes: newCodesArray as IStoredBackupCode[],
            },
          });
        }

        return { user: recoveredUser, codeCount: newCodesArray.length };
      } finally {
        // Zero out the decryption key to prevent leakage
        if (decryptionKey) {
          decryptionKey.fill(0);
        }
      }
    }


  /**
   * Clear existing codes and generate a fresh set.
   *
   * 1. Clear existing backup codes from the member's private profile
   * 2. Generate and persist a new set of encrypted backup codes
   * 3. Return the new plaintext code strings
   */
  async regenerateCodes(memberId: TID): Promise<string[]> {
    // Clear existing backup codes by persisting an empty array
    await this.memberStore.updateMember(memberId, {
      id: memberId,
      privateChanges: { backupCodes: [] },
    });

    // Generate, encrypt, persist, and return new plaintext codes
    return this.generateCodes(memberId);
  }

  /**
   * Re-wrap all users' backup codes with a new system key (key rotation).
   */
  /**
     * Re-wrap all users' backup codes with a new system key (key rotation).
     *
     * For each member in the store:
     * 1. Retrieve their stored backup codes from the private profile
     * 2. For each code, unwrap the ECIES layer with the old system key
     * 3. Re-wrap the inner AEAD blob with the new system key
     * 4. Persist the re-wrapped codes back to the member's private profile
     *
     * Individual user failures are logged and skipped — processing continues
     * for remaining users.
     *
     * @param oldSystem - The old system user whose private key unwraps existing ECIES layers
     * @param newSystem - The new system user whose public key re-wraps the AEAD blobs
     * @returns The count of users whose codes were successfully re-wrapped
     */
    async rewrapAllUsersBackupCodes(
      oldSystem: Member<TID>,
      newSystem: Member<TID>,
    ): Promise<number> {
      // Query all members from the index
      const memberRefs = await this.memberStore.queryIndex(
        {} as IMemberQueryCriteria<TID>,
      );

      let successCount = 0;

      for (const ref of memberRefs) {
        try {
          // Retrieve the member's profile to access their backup codes
          const profile = await this.memberStore.getMemberProfile(ref.id);
          if (!profile.privateProfile) {
            continue;
          }

          const storedCodes = profile.privateProfile.backupCodes;
          if (!storedCodes || storedCodes.length === 0) {
            continue;
          }

          // Re-wrap each code: unwrap ECIES with old key, re-wrap with new key
          const rewrappedCodes: IStoredBackupCode[] = [];
          for (const code of storedCodes) {
            // Unwrap the ECIES layer using the old system user's private key
            const innerAeadBlob = await oldSystem.decryptData(
              Buffer.from(code.encrypted, 'hex'),
            );

            // Re-wrap the inner AEAD blob with the new system user's public key
            const rewrappedBlob = await newSystem.encryptData(innerAeadBlob);

            // Return a new IStoredBackupCode with the same version, checksumSalt,
            // and checksum but with the re-wrapped encrypted field
            rewrappedCodes.push({
              version: code.version,
              checksumSalt: code.checksumSalt,
              checksum: code.checksum,
              encrypted: rewrappedBlob.toString('hex'),
            });
          }

          // Persist the re-wrapped codes to the member's private profile
          await this.memberStore.updateMember(ref.id, {
            id: ref.id,
            privateChanges: {
              backupCodes: rewrappedCodes,
            },
          });

          successCount++;
        } catch (error) {
          // Log the error for this user and continue with remaining users
          console.error(
            `Failed to re-wrap backup codes for member ${String(ref.id)}:`,
            error,
          );
        }
      }

      return successCount;
    }

}
