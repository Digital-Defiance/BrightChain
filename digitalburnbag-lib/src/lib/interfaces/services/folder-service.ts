import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';
import type { IFolderMetadataBase } from '../bases/folder-metadata';
import type {
  ICreateFolderParams,
  IFolderContents,
  ISortOptions,
} from '../params/folder-service-params';

/**
 * Service interface for folder hierarchy management.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export interface IFolderService<TID extends PlatformID> {
  /** Create a folder */
  createFolder(
    params: ICreateFolderParams<TID>,
  ): Promise<IFolderMetadataBase<TID>>;
  /** Get folder contents (files + subfolders) */
  getFolderContents(
    folderId: TID,
    requesterId: TID,
    sort?: ISortOptions,
  ): Promise<IFolderContents<TID>>;
  /** Move a file or folder to a new parent */
  move(
    itemId: TID,
    itemType: 'file' | 'folder',
    newParentId: TID,
    requesterId: TID,
  ): Promise<void>;
  /** Get or create root folder for a vault container */
  getRootFolder(
    userId: TID,
    vaultContainerId?: TID,
  ): Promise<IFolderMetadataBase<TID>>;
  /** Get folder path (breadcrumbs) */
  getFolderPath(folderId: TID): Promise<IFolderMetadataBase<TID>[]>;

  /**
   * Resolve a virtual path (e.g. "my-folder/test/blah") starting from the
   * vault container's root folder. Returns the chain of folders traversed
   * and, if the final segment matches a file, the file metadata.
   */
  resolvePath(
    userId: TID,
    segments: string[],
    vaultContainerId?: TID,
  ): Promise<{
    folders: IFolderMetadataBase<TID>[];
    file: IFileMetadataBase<TID> | null;
  }>;

  /** Soft-delete a folder */
  softDeleteFolder(folderId: TID, requesterId: TID): Promise<void>;
}
