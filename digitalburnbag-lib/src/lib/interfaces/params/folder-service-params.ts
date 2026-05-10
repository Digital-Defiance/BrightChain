import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';
import type { IFolderMetadataBase } from '../bases/folder-metadata';

/**
 * Parameters for creating a new folder.
 */
export interface ICreateFolderParams<TID extends PlatformID> {
  name: string;
  vaultContainerId: TID;
  parentFolderId: TID;
  ownerId: TID;
}

/**
 * Contents of a folder (files + subfolders).
 */
export interface IFolderContents<TID extends PlatformID> {
  folders: IFolderMetadataBase<TID>[];
  files: IFileMetadataBase<TID>[];
}

/**
 * Sort options for folder contents listing.
 */
export interface ISortOptions {
  field: 'name' | 'size' | 'modifiedDate' | 'type';
  direction: 'asc' | 'desc';
}
