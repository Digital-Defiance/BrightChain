import { IStoredBackupCode, MemberStore } from '@brightchain/brightchain-lib';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const DEFAULT_BCRYPT_ROUNDS = 12;
const BACKUP_CODE_COUNT = 10;
const BACKUP_CODE_BYTES = 8;

/**
 * Formats a 8-byte buffer as XXXX-XXXX-XXXX-XXXX hex groups.
 */
function formatBackupCode(buf: Buffer): string {
  const hex = buf.toString('hex'); // 16 hex chars from 8 bytes
  return `${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}`;
}

/**
 * Service for generating, validating, and managing one-time-use backup codes.
 *
 * Backup codes are bcrypt-hashed for storage — plaintext codes are returned
 * once at generation time and never persisted.
 */
export class BackupCodeService {
  private readonly memberStore: MemberStore;
  private readonly bcryptRounds: number;

  constructor(memberStore: MemberStore, bcryptRounds?: number) {
    this.memberStore = memberStore;
    this.bcryptRounds = bcryptRounds ?? DEFAULT_BCRYPT_ROUNDS;
  }

  /**
   * Generate 10 backup codes, bcrypt-hash each, store hashes in the member's
   * private profile, and return the plaintext codes (one-time display).
   */
  async generateCodes(memberId: Uint8Array): Promise<string[]> {
    const plaintextCodes: string[] = [];
    const storedCodes: IStoredBackupCode[] = [];
    const now = Date.now();

    for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
      const buf = crypto.randomBytes(BACKUP_CODE_BYTES);
      const code = formatBackupCode(buf);
      plaintextCodes.push(code);

      const hash = await bcrypt.hash(code, this.bcryptRounds);
      storedCodes.push({ hash, used: false, createdAt: now });
    }

    await this.memberStore.updateMember(memberId, {
      id: memberId,
      privateChanges: {
        backupCodes: storedCodes,
      },
    });

    return plaintextCodes;
  }

  /**
   * Return the count of unused backup codes for the given member.
   */
  async getCodeCount(memberId: Uint8Array): Promise<number> {
    const codes = await this.getStoredCodes(memberId);
    return codes.filter((c) => !c.used).length;
  }

  /**
   * Validate a submitted backup code against stored hashes.
   * If a match is found, mark it as used and persist the update.
   */
  async validateCode(memberId: Uint8Array, code: string): Promise<boolean> {
    const codes = await this.getStoredCodes(memberId);

    for (let i = 0; i < codes.length; i++) {
      const entry = codes[i];
      if (entry.used) {
        continue;
      }

      const isMatch = await bcrypt.compare(code, entry.hash);
      if (isMatch) {
        // Mark as used and persist
        const updatedCodes = codes.map((c, idx) =>
          idx === i ? { ...c, used: true } : c,
        );

        await this.memberStore.updateMember(memberId, {
          id: memberId,
          privateChanges: {
            backupCodes: updatedCodes,
          },
        });

        return true;
      }
    }

    return false;
  }

  /**
   * Invalidate all existing codes and generate a fresh set.
   */
  async regenerateCodes(memberId: Uint8Array): Promise<string[]> {
    // Clear existing codes first
    await this.memberStore.updateMember(memberId, {
      id: memberId,
      privateChanges: {
        backupCodes: [],
      },
    });

    return this.generateCodes(memberId);
  }

  /**
   * Retrieve stored backup codes from the member's private profile.
   */
  private async getStoredCodes(
    memberId: Uint8Array,
  ): Promise<IStoredBackupCode[]> {
    const profile = await this.memberStore.getMemberProfile(memberId);
    if (!profile.privateProfile) {
      throw new Error('Member not found');
    }
    return profile.privateProfile.backupCodes ?? [];
  }
}
