import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';
import type { IFolderMetadataBase } from '../bases/folder-metadata';

/**
 * Repository interface abstracting BrightDB access for folder operations.
 * The API layer (digitalburnbag-api-lib) provides the concrete implementation
 * backed by BrightDB collections.
 */
export interface IFolderRepository<TID extends PlatformID> {
  /** Get a folder by ID, or null if not found */
  getFolderById(folderId: TID): Promise<IFolderMetadataBase<TID> | null>;

  /** Get the root folder for a user within a vault container, or null if none exists */
  getRootFolder(
    userId: TID,
    vaultContainerId?: TID,
  ): Promise<IFolderMetadataBase<TID> | null>;

  /** Create a new folder and return it */
  createFolder(
    folder: IFolderMetadataBase<TID>,
  ): Promise<IFolderMetadataBase<TID>>;

  /**
   * Check if a folder with the given name already exists
   * under the specified parent for the given owner.
   */
  folderExistsInParent(
    name: string,
    parentFolderId: TID,
    ownerId: TID,
  ): Promise<boolean>;

  /** Get all non-deleted subfolders of a folder */
  getSubfolders(folderId: TID): Promise<IFolderMetadataBase<TID>[]>;

  /** Get all non-deleted files in a folder */
  getFilesInFolder(folderId: TID): Promise<IFileMetadataBase<TID>[]>;

  /** Update a folder's parent reference (for move operations) */
  updateParentFolder(folderId: TID, newParentId: TID): Promise<void>;

  /** Update a file's parent folder reference (for move operations) */
  updateFileFolder(fileId: TID, newFolderId: TID): Promise<void>;

  /** Update a folder's name (for phix/rename operations) */
  updateFolderName(folderId: TID, newName: string): Promise<void>;

  /** Soft-delete a folder by setting its deletedAt timestamp */
  softDeleteFolder(folderId: TID, deletedFromPath: string): Promise<void>;
}
