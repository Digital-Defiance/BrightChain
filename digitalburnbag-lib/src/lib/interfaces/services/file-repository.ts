import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';
import type { IFileVersionBase } from '../bases/file-version';
import type { IFileSearchQuery } from '../params/file-service-params';

/**
 * Repository interface abstracting BrightDB access for file operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface IFileRepository<TID extends PlatformID> {
  /** Get a file by ID, or null if not found */
  getFileById(fileId: TID): Promise<IFileMetadataBase<TID> | null>;

  /** Create a new file metadata record */
  createFile(metadata: IFileMetadataBase<TID>): Promise<IFileMetadataBase<TID>>;

  /** Update an existing file metadata record */
  updateFile(metadata: IFileMetadataBase<TID>): Promise<IFileMetadataBase<TID>>;

  /** Delete a file metadata record */
  deleteFile(fileId: TID): Promise<void>;

  /** Get all files in a folder */
  getFilesByFolder(folderId: TID): Promise<IFileMetadataBase<TID>[]>;

  /** Search files with query filters, scoped to accessible file IDs */
  searchFiles(
    query: IFileSearchQuery<TID>,
    accessibleFileIds: TID[],
  ): Promise<{ results: IFileMetadataBase<TID>[]; totalCount: number }>;

  /** Get all soft-deleted files */
  getDeletedFiles(): Promise<IFileMetadataBase<TID>[]>;

  /** Get all versions of a file */
  getFileVersions(fileId: TID): Promise<IFileVersionBase<TID>[]>;

  /** Get a specific version of a file */
  getFileVersion(
    fileId: TID,
    versionId: TID,
  ): Promise<IFileVersionBase<TID> | null>;

  /** Create a new file version record */
  createFileVersion(
    version: IFileVersionBase<TID>,
  ): Promise<IFileVersionBase<TID>>;

  /** Update an existing file version record */
  updateFileVersion(
    version: IFileVersionBase<TID>,
  ): Promise<IFileVersionBase<TID>>;
}
