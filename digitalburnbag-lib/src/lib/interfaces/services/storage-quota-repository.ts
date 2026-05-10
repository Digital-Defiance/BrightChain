import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileVersionBase } from '../bases/file-version';
import type { IStorageQuotaBase } from '../bases/storage-quota';

/**
 * Repository interface abstracting BrightDB access for storage quota operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface IStorageQuotaRepository<TID extends PlatformID> {
  /** Get the quota record for a user, or null if none exists */
  getQuota(userId: TID): Promise<IStorageQuotaBase<TID> | null>;
  /** Create or update a quota record */
  upsertQuota(quota: IStorageQuotaBase<TID>): Promise<void>;
  /**
   * Get all non-deleted file versions owned by a user.
   * "Non-deleted" means the parent file's deletedAt is null/undefined.
   */
  getNonDeletedFileVersions(userId: TID): Promise<IFileVersionBase<TID>[]>;
}
