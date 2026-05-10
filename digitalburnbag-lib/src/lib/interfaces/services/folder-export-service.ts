import { PlatformID } from '@digitaldefiance/ecies-lib';

/** Options for folder export to TCBL */
export interface IFolderExportOptions {
  /** Include only files matching these MIME type patterns (e.g., ['application/pdf', 'image/*']) */
  mimeTypeFilters?: string[];
  /** Maximum folder recursion depth (undefined = unlimited) */
  maxDepth?: number;
  /** Glob patterns for relative paths to exclude (e.g., ['*.tmp', 'drafts/**']) */
  excludePatterns?: string[];
}

/** A skipped file entry in the export result */
export interface ISkippedFileEntry<TID extends PlatformID> {
  fileId: TID;
  relativePath: string;
  reason: 'acl_denied' | 'filtered_by_type' | 'filtered_by_pattern';
}

/** Result of a folder export to TCBL */
export interface IFolderExportResult<TID extends PlatformID> {
  /** Opaque handle to the TCBL block (caller manages from here) */
  tcblHandle: unknown;
  /** The recipe for reconstructing the TCBL */
  recipe: unknown;
  /** Summary of the manifest */
  manifestSummary: {
    entryCount: number;
    totalSizeBytes: number;
  };
  /** Files that were skipped during export */
  skippedFiles: ISkippedFileEntry<TID>[];
}

export interface IFolderExportService<TID extends PlatformID> {
  exportFolderToTCBL(
    folderId: TID,
    requesterId: TID,
    options?: IFolderExportOptions,
  ): Promise<IFolderExportResult<TID>>;
}
