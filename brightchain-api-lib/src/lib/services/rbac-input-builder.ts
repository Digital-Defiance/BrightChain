/**
 * @fileoverview RbacInputBuilder — reusable builder that produces a complete
 * IBrightChainRbacInitInput (plus credentials) from environment-level user
 * identity data.
 *
 * Extracts the crypto-heavy "build user init entry" logic that was previously
 * duplicated between brightchain-inituserdb/src/main.ts and the integration
 * tests. Both the CLI tool and the database plugin now consume this builder.
 *
 * Lives in brightchain-api-lib because it depends on node-specific packages
 * (@digitaldefiance/node-ecies-lib, @digitaldefiance/node-express-suite).
 */

import type {
  IBrightChainRbacInitInput,
  IBrightChainUserCredentials,
  IBrightChainUserInitEntry,
  IPasswordWrappedPrivateKey,
} from '@brightchain/brightchain-lib';
import { EciesConfig } from '@brightchain/brightchain-lib';
import {
  EmailString,
  type IECIESConfig,
  MemberType,
  SecureString,
} from '@digitaldefiance/ecies-lib';
import type { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ECIESService,
  GuidV4Provider,
  Member,
} from '@digitaldefiance/node-ecies-lib';
import type { IConstants } from '@digitaldefiance/node-express-suite';
import {
  BackupCode,
  KeyWrappingService,
} from '@digitaldefiance/node-express-suite';
import type { IBackupCode } from '@digitaldefiance/suite-core-lib';
import { createHmac, randomBytes } from 'crypto';
import { AppConstants } from '../appConstants';

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Per-user identity input — the minimal data the caller must supply.
 * Everything else (keys, wrapped keys, mnemonics, backup codes) is derived.
 */
export interface IRbacUserInput<TID extends PlatformID> {
  /** Short ID (member_index key) */
  id: TID;
  /** Full platform ID */
  fullId: TID;
  type: MemberType;
  username: string;
  email: string;
  /** Role document _id */
  roleId: TID;
  /** User-role junction document _id */
  userRoleId: TID;
  roleName: string;
  roleAdmin: boolean;
  roleMember: boolean;
  roleSystem: boolean;
  /** Existing mnemonic (if restoring); omit to generate a new one */
  mnemonic?: SecureString;
  /** Existing password; omit to generate a random one */
  password?: SecureString;
}

/**
 * Result of building a single user's init entry.
 * Carries the entry, credentials, and the live Member (for backup code
 * encryption). Caller is responsible for disposing the Member when done.
 */
export interface IRbacUserBuildResult<TID extends PlatformID> {
  entry: IBrightChainUserInitEntry<TID>;
  creds: IBrightChainUserCredentials<TID>;
  member: Member<TID>;
}

/**
 * Complete result of building all three users' RBAC input.
 */
export interface IRbacBuildResult<TID extends PlatformID> {
  rbacInput: IBrightChainRbacInitInput<TID>;
  credentials: {
    system: IBrightChainUserCredentials<TID>;
    admin: IBrightChainUserCredentials<TID>;
    member: IBrightChainUserCredentials<TID>;
  };
  /** Live Members — caller MUST call disposeMembers() when done. */
  members: {
    system: Member<TID>;
    admin: Member<TID>;
    member: Member<TID>;
  };
}

// ─── Builder configuration ───────────────────────────────────────────────────

export interface IRbacInputBuilderConfig {
  /** ECIES config; defaults to BrightChain's canonical EciesConfig */
  eciesConfig?: IECIESConfig;
  /** HMAC secret for mnemonic uniqueness checks (hex string; generated if omitted) */
  hmacSecretHex?: string;
  /** Constants for password validation, backup code generation, etc. */
  constants?: IConstants;
}

// ─── Builder ─────────────────────────────────────────────────────────────────

/**
 * Builds a complete IBrightChainRbacInitInput from per-user identity data.
 *
 * Encapsulates all crypto work: ECIES member creation, private key wrapping,
 * mnemonic encryption/HMAC, and backup code generation + encryption.
 *
 * Usage:
 * ```ts
 * const builder = new RbacInputBuilder<GuidV4Buffer>({ hmacSecretHex });
 * const result = await builder.buildAll({ system, admin, member });
 * // result.rbacInput → pass to initializeWithRbac()
 * // result.credentials → pass to printServerInitResults() / formatDotEnv()
 * result.disposeMembers();
 * ```
 */
export class RbacInputBuilder<TID extends PlatformID> {
  private readonly eciesService: ECIESService<TID>;
  private readonly keyWrappingService: KeyWrappingService;
  private readonly hmacSecret: Buffer;
  private readonly constants: IConstants;
  private readonly guidProvider: GuidV4Provider;

  constructor(config: IRbacInputBuilderConfig = {}) {
    this.eciesService = new ECIESService<TID>(
      config.eciesConfig ?? EciesConfig,
    );
    this.keyWrappingService = new KeyWrappingService();
    this.hmacSecret = Buffer.from(
      config.hmacSecretHex ?? randomBytes(32).toString('hex'),
      'hex',
    );
    this.constants = (config.constants ?? AppConstants) as IConstants;
    this.guidProvider = new GuidV4Provider();
  }

  /** The HMAC secret hex — callers may want to persist this. */
  get hmacSecretHex(): string {
    return this.hmacSecret.toString('hex');
  }

  /**
   * Build a single user's IBrightChainUserInitEntry + credentials.
   *
   * The returned Member is live (holds key material) and must be disposed
   * by the caller after backup code encryption is complete.
   */
  buildUserEntry(
    input: IRbacUserInput<TID>,
    _systemMember?: Member<TID>,
  ): IRbacUserBuildResult<TID> {
    const { member, mnemonic: resolvedMnemonic } = Member.newMember<TID>(
      this.eciesService,
      input.type,
      input.username,
      new EmailString(input.email),
      input.mnemonic,
    );

    const resolvedPassword =
      input.password ??
      new SecureString(
        Array.from(randomBytes(16))
          .map((b) => String.fromCharCode(33 + (b % 94)))
          .join(''),
      );

    // Wrap private key with password
    let wrappedKey: IPasswordWrappedPrivateKey | undefined;
    if (member.privateKey) {
      const wrapped = this.keyWrappingService.wrapSecret(
        member.privateKey,
        resolvedPassword,
        this.constants,
      );
      wrappedKey = {
        salt: wrapped.salt,
        iv: wrapped.iv,
        authTag: wrapped.authTag,
        ciphertext: wrapped.ciphertext,
        iterations: wrapped.iterations,
      };
    }

    // Encrypt mnemonic for recovery
    const mnemonicRecovery = member
      .encryptData(Buffer.from(resolvedMnemonic.value ?? '', 'utf-8'))
      .toString('hex');

    // HMAC for uniqueness checks
    const mnemonicHmac = createHmac('sha256', this.hmacSecret)
      .update(Buffer.from(resolvedMnemonic.value ?? '', 'utf-8'))
      .digest('hex');

    const mnemonicDocId = this.guidProvider.fromBytes(
      this.guidProvider.generate(),
    ) as TID;

    const publicKeyHex = member.publicKey.toString('hex');

    const entry: IBrightChainUserInitEntry<TID> = {
      id: input.id,
      type: input.type,
      fullId: input.fullId,
      username: input.username,
      email: input.email,
      publicKeyHex,
      passwordWrappedPrivateKey: wrappedKey,
      mnemonicRecovery,
      mnemonicHmac,
      backupCodes: [], // filled in by buildAll() after async encryption
      roleId: input.roleId,
      userRoleId: input.userRoleId,
      mnemonicDocId,
      roleName: input.roleName,
      roleAdmin: input.roleAdmin,
      roleMember: input.roleMember,
      roleSystem: input.roleSystem,
      plaintextMnemonic: resolvedMnemonic.value ?? '',
      plaintextPassword: resolvedPassword.value ?? '',
      plaintextBackupCodes: [], // filled in by buildAll()
    };

    const creds: IBrightChainUserCredentials<TID> = {
      id: input.id,
      fullId: input.fullId,
      type: input.type,
      username: input.username,
      email: input.email,
      mnemonic: resolvedMnemonic.value ?? '',
      password: resolvedPassword.value ?? '',
      backupCodes: [], // filled in by buildAll()
      publicKeyHex,
      roleId: input.roleId,
      userRoleId: input.userRoleId,
    };

    return { entry, creds, member };
  }

  /**
   * Build the complete RBAC input for all three users.
   *
   * Orchestrates: system user first (needed as encryptor for others),
   * then admin and member. Generates and encrypts backup codes for all three.
   *
   * Returns the rbacInput ready for initializeWithRbac(), grouped credentials
   * for printing/persistence, and live Members that must be disposed.
   */
  async buildAll(input: {
    system: IRbacUserInput<TID>;
    admin: IRbacUserInput<TID>;
    member: IRbacUserInput<TID>;
  }): Promise<IRbacBuildResult<TID>> {
    // Build system user first — needed as encryptor for admin/member backup codes
    const systemResult = this.buildUserEntry(input.system);
    const adminResult = this.buildUserEntry(input.admin, systemResult.member);
    const memberResult = this.buildUserEntry(input.member, systemResult.member);

    // Generate and encrypt backup codes
    const generateCodes = (): BackupCode[] =>
      Array.from(
        { length: this.constants.BACKUP_CODES.Count },
        () => new BackupCode(BackupCode.generateBackupCode()),
      );

    const systemCodes = generateCodes();
    const adminCodes = generateCodes();
    const memberCodes = generateCodes();

    const [encSystemCodes, encAdminCodes, encMemberCodes]: IBackupCode[][] =
      await Promise.all([
        BackupCode.encryptBackupCodes(
          systemResult.member,
          systemResult.member, // system encrypts its own
          systemCodes,
        ),
        BackupCode.encryptBackupCodes(
          adminResult.member,
          systemResult.member,
          adminCodes,
        ),
        BackupCode.encryptBackupCodes(
          memberResult.member,
          systemResult.member,
          memberCodes,
        ),
      ]);

    // Wire encrypted backup codes into entries
    systemResult.entry.backupCodes = encSystemCodes;
    adminResult.entry.backupCodes = encAdminCodes;
    memberResult.entry.backupCodes = encMemberCodes;

    // Wire plaintext backup codes
    const toPlaintext = (codes: BackupCode[]): string[] =>
      codes.map((c) => c.value ?? '');

    systemResult.entry.plaintextBackupCodes = toPlaintext(systemCodes);
    adminResult.entry.plaintextBackupCodes = toPlaintext(adminCodes);
    memberResult.entry.plaintextBackupCodes = toPlaintext(memberCodes);

    // Wire credential backup codes (plaintext for display)
    systemResult.creds.backupCodes = toPlaintext(systemCodes);
    adminResult.creds.backupCodes = toPlaintext(adminCodes);
    memberResult.creds.backupCodes = toPlaintext(memberCodes);

    const rbacInput: IBrightChainRbacInitInput<TID> = {
      systemUser: systemResult.entry,
      adminUser: adminResult.entry,
      memberUser: memberResult.entry,
    };

    return {
      rbacInput,
      credentials: {
        system: systemResult.creds,
        admin: adminResult.creds,
        member: memberResult.creds,
      },
      members: {
        system: systemResult.member,
        admin: adminResult.member,
        member: memberResult.member,
      },
    };
  }

  /**
   * Convenience: dispose all live Members from a build result.
   */
  static disposeMembers<TID extends PlatformID>(
    members: IRbacBuildResult<TID>['members'],
  ): void {
    members.system.dispose();
    members.admin.dispose();
    members.member.dispose();
  }
}
