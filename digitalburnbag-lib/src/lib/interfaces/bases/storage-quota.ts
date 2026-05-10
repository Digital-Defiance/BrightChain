import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Per-user storage quota tracking.
 */
export interface IStorageQuotaBase<TID extends PlatformID> {
  userId: TID;
  quotaBytes: number;
  usedBytes: number;
  updatedAt: Date | string;
}
