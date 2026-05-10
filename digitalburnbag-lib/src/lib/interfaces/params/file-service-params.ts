import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';

/**
 * Parameters for creating a new file after upload finalization.
 */
export interface ICreateFileParams<TID extends PlatformID> {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  vaultContainerId: TID;
  folderId: TID;
  ownerId: TID;
  tags?: string[];
  description?: string;
  encryptionKey: Uint8Array;
  recipe: unknown;
}

/**
 * Partial update fields for file metadata.
 */
export interface IFileMetadataUpdate<TID extends PlatformID> {
  fileName?: string;
  tags?: string[];
  folderId?: TID;
  description?: string;
}

/**
 * Search query parameters for file search.
 */
export interface IFileSearchQuery<TID extends PlatformID> {
  query?: string;
  tags?: string[];
  mimeType?: string;
  folderId?: TID;
  dateFrom?: Date | string;
  dateTo?: Date | string;
  sizeMin?: number;
  sizeMax?: number;
  fileType?: string;
  /** When true, return only soft-deleted (trash) files */
  deleted?: boolean;
}

/**
 * Paginated search results.
 */
export interface ISearchResults<TID extends PlatformID> {
  results: IFileMetadataBase<TID>[];
  totalCount: number;
  page: number;
  pageSize: number;
}
