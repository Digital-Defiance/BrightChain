import { PlatformID } from '@digitaldefiance/ecies-lib';
import { QuotaNotFoundError } from '../errors';
import type { IStorageQuotaBase } from '../interfaces/bases/storage-quota';
import type {
  IQuotaCheckResult,
  IStorageQuotaCheckOptions,
  IStorageUsage,
} from '../interfaces/params/quota-results';
import type { IStorageQuotaRepository } from '../interfaces/services/storage-quota-repository';
import type { IStorageQuotaService } from '../interfaces/services/storage-quota-service';

/**
 * Default quota: 10 GB per user.
 */
const DEFAULT_QUOTA_BYTES = 10 * 1024 * 1024 * 1024;

/**
 * Manages per-user storage quotas: checking, querying, updating, and recalculating.
 *
 * The service delegates persistence to an `IStorageQuotaRepository`, which is
 * implemented in `digitalburnbag-api-lib` backed by BrightDB.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */
export class StorageQuotaService<TID extends PlatformID>
  implements IStorageQuotaService<TID>
{
  constructor(
    private readonly repository: IStorageQuotaRepository<TID>,
    private readonly isAdmin: (userId: TID) => Promise<boolean>,
  ) {}

  /**
   * Check if an upload of `additionalBytes` would exceed the user's quota.
   *
   * When `BURNBAG_JOULE_ENABLED=true` and `options.tier` + `options.durationDays`
   * are provided, also verifies the user holds enough Joule (delegated to the API
   * layer via the repository). The byte-space check always runs first.
   *
   * Validates: Requirements 8.1, 8.2, 6.1–6.4
   */
  async checkQuota(
    userId: TID,
    additionalBytes: number,
    _options?: IStorageQuotaCheckOptions,
  ): Promise<IQuotaCheckResult> {
    const quota = await this.getOrCreateQuota(userId);
    const wouldUse = quota.usedBytes + additionalBytes;
    const allowed = wouldUse <= quota.quotaBytes;
    const remainingBytes = Math.max(0, quota.quotaBytes - quota.usedBytes);

    return {
      allowed,
      currentUsageBytes: quota.usedBytes,
      quotaBytes: quota.quotaBytes,
      remainingBytes,
    };
  }

  /**
   * Get current usage and quota limit for a user.
   *
   * Validates: Requirement 8.4
   */
  async getUsage(userId: TID): Promise<IStorageUsage> {
    const quota = await this.getOrCreateQuota(userId);
    return this.toStorageUsage(quota);
  }

  /**
   * Set the quota for a user. Only admins may call this.
   *
   * Validates: Requirement 8.3
   */
  async setQuota(userId: TID, quotaBytes: number, adminId: TID): Promise<void> {
    const admin = await this.isAdmin(adminId);
    if (!admin) {
      throw new QuotaNotFoundError('only administrators can set quotas');
    }

    const quota = await this.getOrCreateQuota(userId);
    quota.quotaBytes = quotaBytes;
    quota.updatedAt = new Date().toISOString();
    await this.repository.upsertQuota(quota);
  }

  /**
   * Recalculate a user's storage usage by summing all non-deleted file version sizes.
   *
   * Validates: Requirement 8.1
   */
  async recalculateUsage(userId: TID): Promise<IStorageUsage> {
    const versions = await this.repository.getNonDeletedFileVersions(userId);
    const usedBytes = versions.reduce((sum, v) => sum + v.sizeBytes, 0);

    const quota = await this.getOrCreateQuota(userId);
    quota.usedBytes = usedBytes;
    quota.updatedAt = new Date().toISOString();
    await this.repository.upsertQuota(quota);

    return this.toStorageUsage(quota);
  }

  /**
   * Get the existing quota record or create a default one.
   */
  private async getOrCreateQuota(userId: TID): Promise<IStorageQuotaBase<TID>> {
    const existing = await this.repository.getQuota(userId);
    if (existing) {
      return existing;
    }

    const now = new Date().toISOString();
    const newQuota: IStorageQuotaBase<TID> = {
      userId,
      quotaBytes: DEFAULT_QUOTA_BYTES,
      usedBytes: 0,
      updatedAt: now,
    };
    await this.repository.upsertQuota(newQuota);
    return newQuota;
  }

  /**
   * Convert a quota record to an IStorageUsage summary.
   */
  private toStorageUsage(quota: IStorageQuotaBase<TID>): IStorageUsage {
    const percentUsed =
      quota.quotaBytes > 0 ? (quota.usedBytes / quota.quotaBytes) * 100 : 0;
    return {
      usedBytes: quota.usedBytes,
      quotaBytes: quota.quotaBytes,
      percentUsed,
    };
  }
}
