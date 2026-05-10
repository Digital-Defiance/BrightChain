import { PlatformID } from '@digitaldefiance/ecies-lib';
import type {
  IQuotaCheckResult,
  IStorageQuotaCheckOptions,
  IStorageUsage,
} from '../params/quota-results';

/**
 * Service interface for managing per-user storage quotas.
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4, 6.1–6.4
 */
export interface IStorageQuotaService<TID extends PlatformID> {
  /**
   * Check if an upload of given size would exceed quota.
   *
   * When `BURNBAG_JOULE_ENABLED=true` and `options.tier` + `options.durationDays`
   * are provided, also verifies the user holds enough Joule for the storage cost.
   * Returns `{ allowed: false, reason: 'INSUFFICIENT_JOULE_FOR_STORAGE' }` if not.
   */
  checkQuota(
    userId: TID,
    additionalBytes: number,
    options?: IStorageQuotaCheckOptions,
  ): Promise<IQuotaCheckResult>;
  /** Get current usage and limit */
  getUsage(userId: TID): Promise<IStorageUsage>;
  /** Set quota for a user (admin only) */
  setQuota(userId: TID, quotaBytes: number, adminId: TID): Promise<void>;
  /** Recalculate usage (e.g., after destruction) */
  recalculateUsage(userId: TID): Promise<IStorageUsage>;
}
