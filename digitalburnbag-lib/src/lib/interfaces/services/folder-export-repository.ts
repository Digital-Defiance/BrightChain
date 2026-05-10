import { PlatformID } from '@digitaldefiance/ecies-lib';

/** Describes a file within a folder for export purposes */
export interface IExportableFile<TID extends PlatformID> {
  fileId: TID;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  relativePath: string;
  depth: number;
}

/** Describes a subfolder for recursive traversal */
export interface IExportableFolder<TID extends PlatformID> {
  folderId: TID;
  name: string;
}

export interface IFolderExportRepository<TID extends PlatformID> {
  /** Get files directly in a folder */
  getFilesInFolder(folderId: TID): Promise<IExportableFile<TID>[]>;
  /** Get subfolders directly in a folder */
  getSubfolders(folderId: TID): Promise<IExportableFolder<TID>[]>;
}
