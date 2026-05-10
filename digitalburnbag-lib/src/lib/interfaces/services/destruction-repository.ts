import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';
import type { IFileVersionBase } from '../bases/file-version';

/**
 * Repository interface abstracting BrightDB access for destruction operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface IDestructionRepository<TID extends PlatformID> {
  /** Get file metadata by ID, or null if not found */
  getFileMetadata(fileId: TID): Promise<IFileMetadataBase<TID> | null>;

  /** Get all versions of a file */
  getFileVersions(fileId: TID): Promise<IFileVersionBase<TID>[]>;

  /** Update file metadata with partial updates */
  updateFileMetadata(
    fileId: TID,
    updates: Partial<IFileMetadataBase<TID>>,
  ): Promise<void>;

  /** Get files whose scheduledDestructionAt is before the given date */
  getFilesScheduledForDestruction(
    before: Date,
  ): Promise<IFileMetadataBase<TID>[]>;

  /** Get trash items whose deletedAt is before the given retention date */
  getExpiredTrashItems(before: Date): Promise<IFileMetadataBase<TID>[]>;
}
