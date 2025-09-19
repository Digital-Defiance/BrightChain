import {
  AppConstants,
  BackupCodeString,
  IBackupCode,
  InvalidBackupCodeError,
  MemberType,
  PrivateKeyRequiredError,
} from '@brightchain/brightchain-lib';
import * as argon2 from 'argon2';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { BrightChainMember } from './backendMember';
import { ApiConstants } from './constants';
import { InvalidBackupCodeVersionError } from './errors/invalid-backup-code-version';
import { SymmetricService } from './services/symmetric';

/**
 * Class representing a backup code string with associated operations.
 *
 * v1 scheme:
 * - Code: 32 lowercase alphanumerics (a–z0–9), displayed as 8 groups of 4: xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx-xxxx
 * - Checksum/tag: HKDF-SHA256(codeUtf8, salt, "backup-checksum") → 32 bytes (stored as hex)
 * - KDF for encryption key: Argon2id(codeUtf8, salt) → 32 bytes
 * - Encryption: SymmetricService AEAD (encryptedData must embed IV + authTag + ciphertext)
 * - Wrapping: AEAD blob wrapped with system user's asymmetric key (ECIES)
 */
export class BackupCode extends BackupCodeString {
  /** Current backup code scheme version implemented by this service. */
  public static readonly BackupCodeVersion = '1.0.0';
  // Centralized Argon2id parameters (tunable)
  private static readonly Argon2Params = {
    type: argon2.argon2id,
    hashLength: 32, // derive AES-256 key
    timeCost: 3,
    memoryCost: 65536, // 64 MiB
    parallelism: 1,
    raw: true as const,
  } as const;

  constructor(code: string) {
    super(code);
  }

  /**
   * Generate the configured number of backup codes.
   * Note: If generation alphabet/length is controlled elsewhere, prefer that path.
   */
  public static override generateBackupCodes(): Array<BackupCode> {
    const codes: Array<BackupCode> = [];
    for (let i = 0; i < AppConstants.BACKUP_CODES.Count; i++) {
      codes.push(new BackupCode(BackupCode.generateBackupCode()));
    }
    return codes;
  }

  /**
   * HKDF-Extract-and-Expand using HMAC-SHA-256.
   *
   * PRK = HMAC(salt, ikm)
   * T(0) = empty
   * T(i) = HMAC(PRK, T(i-1) || info || i)
   * OKM = first 'length' bytes of T(1) || T(2) || ...
   */
  public static hkdfSha256(
    ikm: Buffer,
    salt: Buffer,
    info: Buffer,
    length: number,
  ): Buffer {
    if (length === 0) {
      return Buffer.alloc(0);
    }

    // HKDF-Extract: PRK = HMAC-Hash(salt, IKM)
    // If salt is empty, use a string of HashLen zeros
    const actualSalt = salt.length === 0 ? Buffer.alloc(32, 0) : salt;
    const prk = createHmac('sha256', actualSalt).update(ikm).digest();

    // HKDF-Expand
    const blocks: Buffer[] = [];
    let prev = Buffer.alloc(0);
    const n = Math.ceil(length / 32);

    for (let i = 1; i <= n; i++) {
      const hmac = createHmac('sha256', prk);
      hmac.update(prev);
      hmac.update(info);
      hmac.update(Buffer.from([i]));
      prev = Buffer.from(hmac.digest());
      blocks.push(prev);
    }

    return Buffer.concat(blocks).subarray(0, length);
  }

  /**
   * v1: Derive a 32-byte encryption key from a normalized backup code using Argon2id and the per-code salt.
   * Uses UTF-8 bytes of the normalized code (not hex).
   */
  public static async getBackupKeyV1(
    checksumSaltHex: string,
    normalizedCode: string,
  ): Promise<Buffer> {
    if (!AppConstants.BACKUP_CODES.NormalizedHexRegex.test(normalizedCode)) {
      throw new InvalidBackupCodeError();
    }
    const codeBytes = Buffer.from(normalizedCode, 'utf8');
    const checksumSalt = Buffer.from(checksumSaltHex, 'hex');
    try {
      const key = (await argon2.hash(codeBytes, {
        ...BackupCode.Argon2Params,
        salt: checksumSalt,
      })) as unknown as Buffer;
      return key; // 32-byte Buffer
    } finally {
      codeBytes.fill(0);
    }
  }

  /**
   * v1: Compute a 32-byte checksum/tag for a normalized code using HKDF-SHA256(codeUtf8, salt, "backup-checksum").
   */
  private static computeChecksumV1(
    normalizedCode: string,
    checksumSalt: Buffer,
  ): Buffer {
    const codeBytes = Buffer.from(normalizedCode, 'utf8');
    try {
      return BackupCode.hkdfSha256(
        codeBytes,
        checksumSalt,
        Buffer.from('backup-checksum'),
        32,
      );
    } finally {
      codeBytes.fill(0);
    }
  }

  public async encrypt(
    backupUser: BrightChainMember,
    systemUser: BrightChainMember,
  ): Promise<IBackupCode> {
    if (!backupUser.hasPrivateKey) {
      throw new PrivateKeyRequiredError();
    }
    if (systemUser.type !== MemberType.System) {
      throw new Error('System user must be of MemberType.System');
    }
    const raw = this.value ?? '';
    const normalized = BackupCode.normalizeCode(raw);
    if (
      !(
        AppConstants.BACKUP_CODES.DisplayRegex.test(raw) ||
        AppConstants.BACKUP_CODES.NormalizedHexRegex.test(normalized)
      )
    ) {
      throw new InvalidBackupCodeError();
    }

    const checksumSalt = randomBytes(ApiConstants.PBKDF2.SALT_BYTES);
    const checksumBuf = BackupCode.computeChecksumV1(normalized, checksumSalt);
    const encryptionKey = await BackupCode.getBackupKeyV1(
      checksumSalt.toString('hex'),
      normalized,
    );

    try {
      const sealed = SymmetricService.encryptBuffer(
        Buffer.from(backupUser.privateKey!.value),
        encryptionKey,
      );
      const wrappedEncryptedPrivateKey = systemUser
        .encryptData(sealed.encryptedData)
        .toString('hex');

      return {
        version: BackupCode.BackupCodeVersion,
        checksumSalt: checksumSalt.toString('hex'),
        checksum: checksumBuf.toString('hex'),
        encrypted: wrappedEncryptedPrivateKey,
      } as IBackupCode;
    } finally {
      encryptionKey.fill(0);
      checksumBuf.fill(0);
    }
  }

  /**
   * v1: Encrypt and wrap backup codes for a user.
   * - Validates code format (display or normalized)
   * - Computes HKDF checksum/tag
   * - Derives Argon2id encryption key (32 bytes) from UTF-8 code
   * - Encrypts the private key with AEAD and wraps with system user
   */
  public static async encryptBackupCodesV1(
    backupUser: BrightChainMember,
    systemUser: BrightChainMember,
    codes: Array<BackupCode>,
  ): Promise<Array<IBackupCode>> {
    const encryptedCodes: Array<IBackupCode> = [];
    for (const code of codes) {
      encryptedCodes.push(await code.encrypt(backupUser, systemUser));
    }
    return encryptedCodes;
  }

  /** Delegate to current version. */
  public static encryptBackupCodes(
    backupUser: BrightChainMember,
    systemUser: BrightChainMember,
    codes: Array<BackupCode>,
  ): Promise<Array<IBackupCode>> {
    return BackupCode.encryptBackupCodesV1(backupUser, systemUser, codes);
  }

  /**
   * v1: Validate whether a backup code exists (unused) in the provided collection.
   * Uses constant-time comparison of binary checksums (codeUtf8 + salt).
   */
  public static validateBackupCodeV1(
    encryptedBackupCodes: Array<IBackupCode>,
    backupCode: string,
  ): boolean {
    const normalizedCode = BackupCodeString.normalizeCode(backupCode);
    if (!AppConstants.BACKUP_CODES.NormalizedHexRegex.test(normalizedCode)) {
      return false;
    }
    const codeBytes = Buffer.from(normalizedCode, 'utf8');
    try {
      for (const code of encryptedBackupCodes) {
        if (code.version !== BackupCode.BackupCodeVersion) continue;
        const checksumSalt = Buffer.from(code.checksumSalt, 'hex');
        const expected = BackupCode.hkdfSha256(
          codeBytes,
          checksumSalt,
          Buffer.from('backup-checksum'),
          32,
        );
        if (
          code.checksum.length === expected.length * 2 &&
          timingSafeEqual(Buffer.from(code.checksum, 'hex'), expected)
        ) {
          return true;
        }
      }
      return false;
    } finally {
      codeBytes.fill(0);
    }
  }

  /**
   * Validate a backup code against any supported version present in the collection.
   */
  public static validateBackupCode(
    encryptedBackupCodes: Array<IBackupCode>,
    backupCode: string,
  ): boolean {
    const normalizedCode = BackupCodeString.normalizeCode(backupCode);
    if (!AppConstants.BACKUP_CODES.NormalizedHexRegex.test(normalizedCode)) {
      return false;
    }
    if (
      encryptedBackupCodes.some(
        (c) => c.version === BackupCode.BackupCodeVersion,
      )
    ) {
      return this.validateBackupCodeV1(
        encryptedBackupCodes.filter(
          (c) => c.version === BackupCode.BackupCodeVersion,
        ),
        normalizedCode,
      );
    }
    return false;
  }

  /**
   * Detect the version by matching checksum against stored codes; returns the matched version.
   */
  public static detectBackupCodeVersion(
    encryptedBackupCodes: Array<IBackupCode>,
    backupCode: string,
  ): string {
    const normalizedCode = BackupCodeString.normalizeCode(backupCode);
    if (!AppConstants.BACKUP_CODES.NormalizedHexRegex.test(normalizedCode)) {
      throw new InvalidBackupCodeError();
    }

    const v1Set = encryptedBackupCodes.filter(
      (c) => c.version === BackupCode.BackupCodeVersion,
    );
    if (v1Set.length) {
      const codeBytes = Buffer.from(normalizedCode, 'utf8');
      try {
        for (const c of v1Set) {
          const checksumSalt = Buffer.from(c.checksumSalt, 'hex');
          const expected = BackupCode.hkdfSha256(
            codeBytes,
            checksumSalt,
            Buffer.from('backup-checksum'),
            32,
          );
          if (
            c.checksum.length === expected.length * 2 &&
            timingSafeEqual(Buffer.from(c.checksum, 'hex'), expected)
          ) {
            return c.version;
          }
        }
      } finally {
        // zeroize
        codeBytes.fill(0);
      }
    }

    const versionsInSet = new Set(encryptedBackupCodes.map((c) => c.version));
    if (
      versionsInSet.size > 0 &&
      !versionsInSet.has(BackupCode.BackupCodeVersion)
    ) {
      throw new InvalidBackupCodeVersionError([...versionsInSet][0]);
    }
    throw new InvalidBackupCodeError();
  }
}
