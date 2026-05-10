import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { FolderExportError } from '../errors';
import type {
  IExportableFile,
  IExportableFolder,
  IFolderExportRepository,
} from '../interfaces/services/folder-export-repository';
import {
  FolderExportService,
  IFolderExportServiceDeps,
} from '../services/folder-export-service';

// ── Helpers ─────────────────────────────────────────────────────────

function makeMockRepository(): jest.Mocked<IFolderExportRepository<string>> {
  return {
    getFilesInFolder: jest.fn().mockResolvedValue([]),
    getSubfolders: jest.fn().mockResolvedValue([]),
  };
}

function makeMockDeps(): jest.Mocked<IFolderExportServiceDeps<string>> {
  return {
    checkFilePermission: jest.fn().mockResolvedValue(true),
    getFileContent: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
    buildTCBL: jest
      .fn()
      .mockResolvedValue({ tcblHandle: 'handle-1', recipe: 'recipe-1' }),
    onAuditLog: jest.fn().mockResolvedValue(undefined),
  };
}

function makeFile(
  overrides: Partial<IExportableFile<string>> = {},
): IExportableFile<string> {
  return {
    fileId: 'file-1',
    fileName: 'test.txt',
    mimeType: 'text/plain',
    sizeBytes: 1024,
    relativePath: 'test.txt',
    depth: 0,
    ...overrides,
  };
}

function makeFolder(
  overrides: Partial<IExportableFolder<string>> = {},
): IExportableFolder<string> {
  return {
    folderId: 'subfolder-1',
    name: 'subfolder',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('FolderExportService', () => {
  let mockRepo: jest.Mocked<IFolderExportRepository<string>>;
  let mockDeps: jest.Mocked<IFolderExportServiceDeps<string>>;
  let service: FolderExportService<string>;

  beforeEach(() => {
    mockRepo = makeMockRepository();
    mockDeps = makeMockDeps();
    service = new FolderExportService(mockRepo, mockDeps);
  });

  // ── Recursive file collection ───────────────────────────────────

  describe('recursive file collection', () => {
    it('should preserve relative paths through nested folders', async () => {
      // Root folder has a subfolder "reports"
      mockRepo.getFilesInFolder.mockImplementation(async (folderId) => {
        if (folderId === 'root') {
          return [
            makeFile({
              fileId: 'f1',
              fileName: 'readme.md',
              mimeType: 'text/markdown',
              sizeBytes: 100,
            }),
          ];
        }
        if (folderId === 'reports-folder') {
          return [
            makeFile({
              fileId: 'f2',
              fileName: 'annual.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 200,
            }),
          ];
        }
        if (folderId === 'q1-folder') {
          return [
            makeFile({
              fileId: 'f3',
              fileName: 'summary.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 300,
            }),
          ];
        }
        return [];
      });

      mockRepo.getSubfolders.mockImplementation(async (folderId) => {
        if (folderId === 'root') {
          return [makeFolder({ folderId: 'reports-folder', name: 'reports' })];
        }
        if (folderId === 'reports-folder') {
          return [makeFolder({ folderId: 'q1-folder', name: 'q1' })];
        }
        return [];
      });

      const result = await service.exportFolderToTCBL('root', 'user-1');

      expect(result.manifestSummary.entryCount).toBe(3);
      expect(mockDeps.buildTCBL).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ fileName: 'readme.md' }),
          expect.objectContaining({ fileName: 'reports/annual.pdf' }),
          expect.objectContaining({ fileName: 'reports/q1/summary.pdf' }),
        ]),
      );
    });
  });

  // ── ACL filtering ───────────────────────────────────────────────

  describe('ACL filtering', () => {
    it('should skip files without permission and report them as acl_denied', async () => {
      mockRepo.getFilesInFolder.mockResolvedValue([
        makeFile({ fileId: 'f1', fileName: 'allowed.txt', sizeBytes: 100 }),
        makeFile({ fileId: 'f2', fileName: 'denied.txt', sizeBytes: 200 }),
      ]);

      mockDeps.checkFilePermission.mockImplementation(async (fileId) => {
        return fileId === 'f1';
      });

      const result = await service.exportFolderToTCBL('root', 'user-1');

      expect(result.manifestSummary.entryCount).toBe(1);
      expect(result.skippedFiles).toHaveLength(1);
      expect(result.skippedFiles[0]).toEqual(
        expect.objectContaining({
          fileId: 'f2',
          reason: 'acl_denied',
        }),
      );
    });

    it('should throw FolderExportError when all files are ACL-denied', async () => {
      mockRepo.getFilesInFolder.mockResolvedValue([
        makeFile({ fileId: 'f1', fileName: 'denied1.txt' }),
        makeFile({ fileId: 'f2', fileName: 'denied2.txt' }),
      ]);

      mockDeps.checkFilePermission.mockResolvedValue(false);

      await expect(
        service.exportFolderToTCBL('root', 'user-1'),
      ).rejects.toThrow(FolderExportError);
    });
  });

  // ── MIME type filtering ─────────────────────────────────────────

  describe('MIME type filtering', () => {
    it('should include only files matching exact MIME type', async () => {
      mockRepo.getFilesInFolder.mockResolvedValue([
        makeFile({
          fileId: 'f1',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100,
        }),
        makeFile({
          fileId: 'f2',
          fileName: 'pic.png',
          mimeType: 'image/png',
          sizeBytes: 200,
        }),
      ]);

      const result = await service.exportFolderToTCBL('root', 'user-1', {
        mimeTypeFilters: ['application/pdf'],
      });

      expect(result.manifestSummary.entryCount).toBe(1);
      expect(result.skippedFiles).toHaveLength(1);
      expect(result.skippedFiles[0]).toEqual(
        expect.objectContaining({
          fileId: 'f2',
          reason: 'filtered_by_type',
        }),
      );
    });

    it('should support wildcard MIME type patterns', async () => {
      mockRepo.getFilesInFolder.mockResolvedValue([
        makeFile({
          fileId: 'f1',
          fileName: 'pic.png',
          mimeType: 'image/png',
          sizeBytes: 100,
        }),
        makeFile({
          fileId: 'f2',
          fileName: 'pic.jpg',
          mimeType: 'image/jpeg',
          sizeBytes: 200,
        }),
        makeFile({
          fileId: 'f3',
          fileName: 'doc.txt',
          mimeType: 'text/plain',
          sizeBytes: 300,
        }),
      ]);

      const result = await service.exportFolderToTCBL('root', 'user-1', {
        mimeTypeFilters: ['image/*'],
      });

      expect(result.manifestSummary.entryCount).toBe(2);
      expect(result.skippedFiles).toHaveLength(1);
      expect(result.skippedFiles[0].fileId).toBe('f3');
    });
  });

  // ── Max depth ───────────────────────────────────────────────────

  describe('max depth option', () => {
    it('should limit recursion to maxDepth', async () => {
      mockRepo.getFilesInFolder.mockImplementation(async (folderId) => {
        if (folderId === 'root') {
          return [
            makeFile({ fileId: 'f1', fileName: 'root.txt', sizeBytes: 100 }),
          ];
        }
        if (folderId === 'sub1') {
          return [
            makeFile({ fileId: 'f2', fileName: 'level1.txt', sizeBytes: 200 }),
          ];
        }
        if (folderId === 'sub2') {
          return [
            makeFile({ fileId: 'f3', fileName: 'level2.txt', sizeBytes: 300 }),
          ];
        }
        return [];
      });

      mockRepo.getSubfolders.mockImplementation(async (folderId) => {
        if (folderId === 'root') {
          return [makeFolder({ folderId: 'sub1', name: 'level1' })];
        }
        if (folderId === 'sub1') {
          return [makeFolder({ folderId: 'sub2', name: 'level2' })];
        }
        return [];
      });

      // maxDepth=1 means root (depth 0) + one level of subfolders (depth 1)
      const result = await service.exportFolderToTCBL('root', 'user-1', {
        maxDepth: 1,
      });

      expect(result.manifestSummary.entryCount).toBe(2);
      expect(mockDeps.buildTCBL).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ fileName: 'root.txt' }),
          expect.objectContaining({ fileName: 'level1/level1.txt' }),
        ]),
      );
      // level2 files should NOT be included
      expect(mockDeps.buildTCBL).toHaveBeenCalledWith(
        expect.not.arrayContaining([
          expect.objectContaining({ fileName: 'level1/level2/level2.txt' }),
        ]),
      );
    });
  });

  // ── Exclude patterns ────────────────────────────────────────────

  describe('exclude patterns', () => {
    it('should skip files matching *.ext pattern', async () => {
      mockRepo.getFilesInFolder.mockResolvedValue([
        makeFile({
          fileId: 'f1',
          fileName: 'doc.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 100,
        }),
        makeFile({
          fileId: 'f2',
          fileName: 'temp.tmp',
          mimeType: 'application/octet-stream',
          sizeBytes: 200,
        }),
      ]);

      const result = await service.exportFolderToTCBL('root', 'user-1', {
        excludePatterns: ['*.tmp'],
      });

      expect(result.manifestSummary.entryCount).toBe(1);
      expect(result.skippedFiles).toHaveLength(1);
      expect(result.skippedFiles[0]).toEqual(
        expect.objectContaining({
          fileId: 'f2',
          reason: 'filtered_by_pattern',
        }),
      );
    });

    it('should skip files matching prefix/** pattern', async () => {
      mockRepo.getFilesInFolder.mockImplementation(async (folderId) => {
        if (folderId === 'root') {
          return [
            makeFile({ fileId: 'f1', fileName: 'readme.md', sizeBytes: 100 }),
          ];
        }
        if (folderId === 'drafts-folder') {
          return [
            makeFile({ fileId: 'f2', fileName: 'draft.txt', sizeBytes: 200 }),
          ];
        }
        return [];
      });

      mockRepo.getSubfolders.mockImplementation(async (folderId) => {
        if (folderId === 'root') {
          return [makeFolder({ folderId: 'drafts-folder', name: 'drafts' })];
        }
        return [];
      });

      const result = await service.exportFolderToTCBL('root', 'user-1', {
        excludePatterns: ['drafts/**'],
      });

      expect(result.manifestSummary.entryCount).toBe(1);
      expect(result.skippedFiles).toHaveLength(1);
      expect(result.skippedFiles[0]).toEqual(
        expect.objectContaining({
          fileId: 'f2',
          relativePath: 'drafts/draft.txt',
          reason: 'filtered_by_pattern',
        }),
      );
    });
  });

  // ── Audit logging ───────────────────────────────────────────────

  describe('audit logging', () => {
    it('should log export event with correct counts', async () => {
      mockRepo.getFilesInFolder.mockResolvedValue([
        makeFile({ fileId: 'f1', fileName: 'a.txt', sizeBytes: 100 }),
        makeFile({ fileId: 'f2', fileName: 'b.txt', sizeBytes: 200 }),
        makeFile({ fileId: 'f3', fileName: 'c.txt', sizeBytes: 300 }),
      ]);

      // f3 is ACL-denied
      mockDeps.checkFilePermission.mockImplementation(async (fileId) => {
        return fileId !== 'f3';
      });

      await service.exportFolderToTCBL('root', 'user-1');

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.FolderExported,
          actorId: 'user-1',
          targetId: 'root',
          targetType: 'folder',
          metadata: expect.objectContaining({
            exportedCount: 2,
            skippedCount: 1,
          }),
        }),
      );
    });
  });

  // ── Empty folder ────────────────────────────────────────────────

  describe('empty folder', () => {
    it('should throw FolderExportError for empty folder', async () => {
      mockRepo.getFilesInFolder.mockResolvedValue([]);
      mockRepo.getSubfolders.mockResolvedValue([]);

      await expect(
        service.exportFolderToTCBL('root', 'user-1'),
      ).rejects.toThrow(FolderExportError);
    });
  });

  // ── Successful export result ────────────────────────────────────

  describe('successful export', () => {
    it('should return correct manifestSummary', async () => {
      mockRepo.getFilesInFolder.mockResolvedValue([
        makeFile({ fileId: 'f1', fileName: 'a.txt', sizeBytes: 512 }),
        makeFile({ fileId: 'f2', fileName: 'b.txt', sizeBytes: 1024 }),
      ]);

      const result = await service.exportFolderToTCBL('root', 'user-1');

      expect(result.tcblHandle).toBe('handle-1');
      expect(result.recipe).toBe('recipe-1');
      expect(result.manifestSummary).toEqual({
        entryCount: 2,
        totalSizeBytes: 1536,
      });
      expect(result.skippedFiles).toHaveLength(0);
    });
  });
});
