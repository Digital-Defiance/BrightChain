import type { BurnbagStorageTier } from '../../joule/burnbagDurability';

/**
 * Result of a quota check.
 */
export interface IQuotaCheckResult {
  allowed: boolean;
  currentUsageBytes: number;
  quotaBytes: number;
  remainingBytes: number;
  /**
   * Machine-readable denial reason.
   * Present only when `allowed` is false.
   *
   * - `'QUOTA_EXCEEDED'` — bytes-based quota would be exceeded
   * - `'INSUFFICIENT_JOULE_FOR_STORAGE'` — user has insufficient Joule balance for the requested tier/duration
   */
  reason?: 'QUOTA_EXCEEDED' | 'INSUFFICIENT_JOULE_FOR_STORAGE';
}

/**
 * Current storage usage summary.
 */
export interface IStorageUsage {
  usedBytes: number;
  quotaBytes: number;
  percentUsed: number;
}

/**
 * Optional parameters for a storage quota check.
 * When BURNBAG_JOULE_ENABLED=true, the quota service also validates
 * whether the user has sufficient Joule balance for the requested tier and duration.
 */
export interface IStorageQuotaCheckOptions {
  /** Storage tier to check; controls Joule cost projection. */
  tier?: BurnbagStorageTier;
  /** Intended storage duration in days; controls Joule cost projection. */
  durationDays?: number;
}
