import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { FolderExportError } from '../errors';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type {
  IExportableFile,
  IFolderExportRepository,
} from '../interfaces/services/folder-export-repository';
import type {
  IFolderExportOptions,
  IFolderExportResult,
  IFolderExportService,
  ISkippedFileEntry,
} from '../interfaces/services/folder-export-service';

/**
 * Dependencies injected into FolderExportService that come from other services.
 */
export interface IFolderExportServiceDeps<TID extends PlatformID> {
  /** Check if a user has Viewer+ permission on a file */
  checkFilePermission: (fileId: TID, requesterId: TID) => Promise<boolean>;
  /** Get file content as bytes */
  getFileContent: (fileId: TID) => Promise<Uint8Array>;
  /** Build a TCBL from entry descriptors. Returns { tcblHandle, recipe } */
  buildTCBL: (
    entries: Array<{ fileName: string; mimeType: string; content: Uint8Array }>,
  ) => Promise<{ tcblHandle: unknown; recipe: unknown }>;
  /** Log an audit entry */
  onAuditLog?: (entry: IAuditEntryParams<TID>) => Promise<void>;
}

/**
 * Exports a folder's contents to a TCBL archive.
 *
 * Recursively collects files, applies ACL checks and optional filters
 * (MIME type, max depth, exclude patterns), builds a TCBL via the
 * injected builder, and logs the export to the audit trail.
 *
 * Delegates persistence to an `IFolderExportRepository`, which is
 * implemented in `digitalburnbag-api-lib` backed by BrightDB.
 */
export class FolderExportService<TID extends PlatformID>
  implements IFolderExportService<TID>
{
  constructor(
    private readonly repository: IFolderExportRepository<TID>,
    private readonly deps: IFolderExportServiceDeps<TID>,
  ) {}

  /**
   * Export a folder's contents to a TCBL archive.
   */
  async exportFolderToTCBL(
    folderId: TID,
    requesterId: TID,
    options?: IFolderExportOptions,
  ): Promise<IFolderExportResult<TID>> {
    const allFiles = await this.collectFiles(
      folderId,
      '',
      0,
      options?.maxDepth,
    );

    if (allFiles.length === 0) {
      throw new FolderExportError('Folder contains no files');
    }

    const skippedFiles: ISkippedFileEntry<TID>[] = [];
    const includedFiles: IExportableFile<TID>[] = [];

    for (const file of allFiles) {
      // ACL check
      const hasPermission = await this.deps.checkFilePermission(
        file.fileId,
        requesterId,
      );
      if (!hasPermission) {
        skippedFiles.push({
          fileId: file.fileId,
          relativePath: file.relativePath,
          reason: 'acl_denied',
        });
        continue;
      }

      // MIME type filter
      if (
        options?.mimeTypeFilters &&
        options.mimeTypeFilters.length > 0 &&
        !this.matchesMimeType(file.mimeType, options.mimeTypeFilters)
      ) {
        skippedFiles.push({
          fileId: file.fileId,
          relativePath: file.relativePath,
          reason: 'filtered_by_type',
        });
        continue;
      }

      // Exclude patterns
      if (
        options?.excludePatterns &&
        options.excludePatterns.length > 0 &&
        this.matchesExcludePattern(file.relativePath, options.excludePatterns)
      ) {
        skippedFiles.push({
          fileId: file.fileId,
          relativePath: file.relativePath,
          reason: 'filtered_by_pattern',
        });
        continue;
      }

      includedFiles.push(file);
    }

    if (includedFiles.length === 0) {
      throw new FolderExportError('No exportable files remain after filtering');
    }

    // Build entry descriptors
    const entries: Array<{
      fileName: string;
      mimeType: string;
      content: Uint8Array;
    }> = [];
    let totalSizeBytes = 0;

    for (const file of includedFiles) {
      const content = await this.deps.getFileContent(file.fileId);
      entries.push({
        fileName: file.relativePath,
        mimeType: file.mimeType,
        content,
      });
      totalSizeBytes += file.sizeBytes;
    }

    const { tcblHandle, recipe } = await this.deps.buildTCBL(entries);

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.FolderExported,
        actorId: requesterId,
        targetId: folderId,
        targetType: 'folder',
        metadata: {
          exportedCount: includedFiles.length,
          skippedCount: skippedFiles.length,
          totalSizeBytes,
        },
      });
    }

    return {
      tcblHandle,
      recipe,
      manifestSummary: {
        entryCount: includedFiles.length,
        totalSizeBytes,
      },
      skippedFiles,
    };
  }

  /**
   * Recursively collect all files from a folder and its subfolders.
   */
  private async collectFiles(
    folderId: TID,
    basePath: string,
    currentDepth: number,
    maxDepth: number | undefined,
  ): Promise<IExportableFile<TID>[]> {
    const files = await this.repository.getFilesInFolder(folderId);

    const result: IExportableFile<TID>[] = files.map((f) => ({
      ...f,
      relativePath: basePath ? `${basePath}/${f.fileName}` : f.fileName,
      depth: currentDepth,
    }));

    // Recurse into subfolders if within depth limit
    if (maxDepth === undefined || currentDepth < maxDepth) {
      const subfolders = await this.repository.getSubfolders(folderId);
      for (const subfolder of subfolders) {
        const subPath = basePath
          ? `${basePath}/${subfolder.name}`
          : subfolder.name;
        const subFiles = await this.collectFiles(
          subfolder.folderId,
          subPath,
          currentDepth + 1,
          maxDepth,
        );
        result.push(...subFiles);
      }
    }

    return result;
  }

  /**
   * Check if a MIME type matches any of the given patterns.
   * Supports exact match ('application/pdf') and wildcard ('image/*').
   */
  private matchesMimeType(mimeType: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (pattern === mimeType) {
        return true;
      }
      if (pattern.endsWith('/*')) {
        const prefix = pattern.slice(0, -2);
        if (mimeType.startsWith(prefix + '/')) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Check if a relative path matches any of the given exclude patterns.
   * Supports `*.ext` (extension match) and `prefix/**` (directory prefix match).
   */
  private matchesExcludePattern(
    relativePath: string,
    patterns: string[],
  ): boolean {
    for (const pattern of patterns) {
      // Extension match: *.ext
      if (pattern.startsWith('*.')) {
        const ext = pattern.slice(1); // e.g., '.tmp'
        if (relativePath.endsWith(ext)) {
          return true;
        }
      }
      // Directory prefix match: prefix/**
      if (pattern.endsWith('/**')) {
        const prefix = pattern.slice(0, -3); // e.g., 'drafts'
        if (relativePath.startsWith(prefix + '/') || relativePath === prefix) {
          return true;
        }
      }
    }
    return false;
  }
}
