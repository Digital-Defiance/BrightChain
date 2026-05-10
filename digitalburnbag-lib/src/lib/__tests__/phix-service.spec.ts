import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { PermissionFlag } from '../enumerations/permission-flag';
import { PhixPlanType } from '../enumerations/phix-plan-type';
import {
  DuplicateFolderNameError,
  FileNotFoundError,
  FolderNotFoundError,
  PermissionDeniedError,
} from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IFolderMetadataBase } from '../interfaces/bases/folder-metadata';
import type { IPhixPlan } from '../interfaces/params/phix-service-params';
import type { IFileRepository } from '../interfaces/services/file-repository';
import type { IFolderRepository } from '../interfaces/services/folder-repository';
import { IPhixServiceDeps, PhixService } from '../services/phix-service';

// ── Helpers ─────────────────────────────────────────────────────────

const NOW = '2025-01-15T12:00:00.000Z';

function makeFileMetadata(
  overrides: Partial<IFileMetadataBase<string>> = {},
): IFileMetadataBase<string> {
  return {
    id: 'file-1',
    ownerId: 'owner-1',
    vaultContainerId: 'vc-1',
    folderId: 'folder-1',
    fileName: 'old-name.txt',
    mimeType: 'text/plain',
    sizeBytes: 2048,
    tags: [],
    currentVersionId: 'version-1',
    vaultCreationLedgerEntryHash: new Uint8Array([1, 2, 3]),
    approvalGoverned: false,
    visibleWatermark: false,
    invisibleWatermark: false,
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: 'owner-1',
    updatedBy: 'owner-1',
    ...overrides,
  };
}

function makeFolderMetadata(
  overrides: Partial<IFolderMetadataBase<string>> = {},
): IFolderMetadataBase<string> {
  return {
    id: 'folder-1',
    ownerId: 'owner-1',
    vaultContainerId: 'vc-1',
    parentFolderId: 'parent-1',
    name: 'old-folder',
    approvalGoverned: false,
    createdAt: NOW,
    updatedAt: NOW,
    createdBy: 'owner-1',
    updatedBy: 'owner-1',
    ...overrides,
  };
}

function makeMockFileRepository(): jest.Mocked<IFileRepository<string>> {
  return {
    getFileById: jest.fn(),
    createFile: jest.fn(),
    updateFile: jest.fn(),
    deleteFile: jest.fn(),
    getFilesByFolder: jest.fn(),
    searchFiles: jest.fn(),
    getDeletedFiles: jest.fn(),
    getFileVersions: jest.fn(),
    getFileVersion: jest.fn(),
    createFileVersion: jest.fn(),
    updateFileVersion: jest.fn(),
  };
}

function makeMockFolderRepository(): jest.Mocked<IFolderRepository<string>> {
  return {
    getFolderById: jest.fn(),
    getRootFolder: jest.fn(),
    createFolder: jest.fn(),
    folderExistsInParent: jest.fn(),
    getSubfolders: jest.fn(),
    getFilesInFolder: jest.fn(),
    updateParentFolder: jest.fn(),
    updateFileFolder: jest.fn(),
    updateFolderName: jest.fn(),
  };
}

function makeMockDeps(
  overrides: Partial<IPhixServiceDeps<string>> = {},
): jest.Mocked<IPhixServiceDeps<string>> {
  return {
    checkPermissionFlag: jest.fn().mockResolvedValue(true),
    onAuditLog: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  } as jest.Mocked<IPhixServiceDeps<string>>;
}

function createService() {
  const fileRepo = makeMockFileRepository();
  const folderRepo = makeMockFolderRepository();
  const deps = makeMockDeps();
  const service = new PhixService(fileRepo, folderRepo, deps);
  return { service, fileRepo, folderRepo, deps };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('PhixService', () => {
  // ── plan() — Permission checks ──────────────────────────────────

  describe('plan() — permission checks', () => {
    it('should check Write permission on the target item', async () => {
      const { service, fileRepo, deps } = createService();
      fileRepo.getFileById.mockResolvedValue(makeFileMetadata());

      await service.plan({
        itemId: 'file-1',
        itemType: 'file',
        newName: 'new-name.txt',
        requesterId: 'user-1',
      });

      expect(deps.checkPermissionFlag).toHaveBeenCalledWith(
        'file-1',
        'file',
        'user-1',
        PermissionFlag.Write,
      );
    });

    it('should throw PermissionDeniedError when user lacks Write permission', async () => {
      const { service, deps } = createService();
      deps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.plan({
          itemId: 'file-1',
          itemType: 'file',
          newName: 'new-name.txt',
          requesterId: 'user-1',
        }),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('should include item type and id in the permission error message', async () => {
      const { service, deps } = createService();
      deps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.plan({
          itemId: 'folder-42',
          itemType: 'folder',
          newName: 'renamed',
          requesterId: 'user-1',
        }),
      ).rejects.toThrow(/folder.*folder-42/);
    });
  });

  // ── plan() — File phix ──────────────────────────────────────────

  describe('plan() — file phix', () => {
    it('should return a metadata-only plan for a file rename', async () => {
      const { service, fileRepo } = createService();
      const file = makeFileMetadata({ sizeBytes: 5000 });
      fileRepo.getFileById.mockResolvedValue(file);

      const plan = await service.plan({
        itemId: 'file-1',
        itemType: 'file',
        newName: 'new-name.txt',
        requesterId: 'user-1',
      });

      expect(plan.planType).toBe(PhixPlanType.MetadataOnly);
      expect(plan.itemType).toBe('file');
      expect(plan.oldName).toBe('old-name.txt');
      expect(plan.newName).toBe('new-name.txt');
      expect(plan.affectedFileCount).toBe(1);
      expect(plan.affectedFolderCount).toBe(0);
      expect(plan.totalSizeBytes).toBe(5000);
      expect(plan.requiresReEncryption).toBe(false);
      expect(plan.estimatedDurationMs).toBe(0);
      expect(plan.estimatedJoules).toBe(0.003);
    });

    it('should include old and new names in the summary', async () => {
      const { service, fileRepo } = createService();
      fileRepo.getFileById.mockResolvedValue(
        makeFileMetadata({ fileName: 'typo.doc' }),
      );

      const plan = await service.plan({
        itemId: 'file-1',
        itemType: 'file',
        newName: 'fixed.doc',
        requesterId: 'user-1',
      });

      expect(plan.summary).toContain('typo.doc');
      expect(plan.summary).toContain('fixed.doc');
    });

    it('should throw FileNotFoundError when file does not exist', async () => {
      const { service, fileRepo } = createService();
      fileRepo.getFileById.mockResolvedValue(null);

      await expect(
        service.plan({
          itemId: 'nonexistent',
          itemType: 'file',
          newName: 'new.txt',
          requesterId: 'user-1',
        }),
      ).rejects.toThrow(FileNotFoundError);
    });
  });

  // ── plan() — Folder phix ────────────────────────────────────────

  describe('plan() — folder phix', () => {
    it('should return a metadata-only plan for a folder rename', async () => {
      const { service, folderRepo } = createService();
      const folder = makeFolderMetadata();
      folderRepo.getFolderById.mockResolvedValue(folder);
      folderRepo.folderExistsInParent.mockResolvedValue(false);
      folderRepo.getFilesInFolder.mockResolvedValue([]);
      folderRepo.getSubfolders.mockResolvedValue([]);

      const plan = await service.plan({
        itemId: 'folder-1',
        itemType: 'folder',
        newName: 'new-folder',
        requesterId: 'user-1',
      });

      expect(plan.planType).toBe(PhixPlanType.MetadataOnly);
      expect(plan.itemType).toBe('folder');
      expect(plan.oldName).toBe('old-folder');
      expect(plan.newName).toBe('new-folder');
      expect(plan.requiresReEncryption).toBe(false);
      expect(plan.estimatedDurationMs).toBe(0);
    });

    it('should throw FolderNotFoundError when folder does not exist', async () => {
      const { service, folderRepo } = createService();
      folderRepo.getFolderById.mockResolvedValue(null);

      await expect(
        service.plan({
          itemId: 'nonexistent',
          itemType: 'folder',
          newName: 'new-folder',
          requesterId: 'user-1',
        }),
      ).rejects.toThrow(FolderNotFoundError);
    });

    it('should throw DuplicateFolderNameError when name already exists in parent', async () => {
      const { service, folderRepo } = createService();
      folderRepo.getFolderById.mockResolvedValue(makeFolderMetadata());
      folderRepo.folderExistsInParent.mockResolvedValue(true);

      await expect(
        service.plan({
          itemId: 'folder-1',
          itemType: 'folder',
          newName: 'duplicate-name',
          requesterId: 'user-1',
        }),
      ).rejects.toThrow(DuplicateFolderNameError);
    });

    it('should skip duplicate check for root folders (no parentFolderId)', async () => {
      const { service, folderRepo } = createService();
      const rootFolder = makeFolderMetadata({ parentFolderId: undefined });
      folderRepo.getFolderById.mockResolvedValue(rootFolder);
      folderRepo.getFilesInFolder.mockResolvedValue([]);
      folderRepo.getSubfolders.mockResolvedValue([]);

      const plan = await service.plan({
        itemId: 'folder-1',
        itemType: 'folder',
        newName: 'new-root',
        requesterId: 'user-1',
      });

      expect(folderRepo.folderExistsInParent).not.toHaveBeenCalled();
      expect(plan.newName).toBe('new-root');
    });

    it('should count files and subfolders recursively', async () => {
      const { service, folderRepo } = createService();
      folderRepo.getFolderById.mockResolvedValue(makeFolderMetadata());
      folderRepo.folderExistsInParent.mockResolvedValue(false);

      // Root folder has 2 files and 1 subfolder
      folderRepo.getFilesInFolder
        .mockResolvedValueOnce([
          makeFileMetadata({ id: 'f1', sizeBytes: 1000 }),
          makeFileMetadata({ id: 'f2', sizeBytes: 2000 }),
        ])
        // Subfolder has 1 file
        .mockResolvedValueOnce([
          makeFileMetadata({ id: 'f3', sizeBytes: 3000 }),
        ]);

      folderRepo.getSubfolders
        .mockResolvedValueOnce([
          makeFolderMetadata({ id: 'sub-1', name: 'sub' }),
        ])
        // Subfolder has no children
        .mockResolvedValueOnce([]);

      const plan = await service.plan({
        itemId: 'folder-1',
        itemType: 'folder',
        newName: 'renamed',
        requesterId: 'user-1',
      });

      expect(plan.affectedFileCount).toBe(3);
      expect(plan.affectedFolderCount).toBe(1);
      expect(plan.totalSizeBytes).toBe(6000);
    });

    it('should handle empty folders', async () => {
      const { service, folderRepo } = createService();
      folderRepo.getFolderById.mockResolvedValue(makeFolderMetadata());
      folderRepo.folderExistsInParent.mockResolvedValue(false);
      folderRepo.getFilesInFolder.mockResolvedValue([]);
      folderRepo.getSubfolders.mockResolvedValue([]);

      const plan = await service.plan({
        itemId: 'folder-1',
        itemType: 'folder',
        newName: 'empty-renamed',
        requesterId: 'user-1',
      });

      expect(plan.affectedFileCount).toBe(0);
      expect(plan.affectedFolderCount).toBe(0);
      expect(plan.totalSizeBytes).toBe(0);
      expect(plan.summary).toContain('Empty folder');
    });

    it('should build summary with file and subfolder counts', async () => {
      const { service, folderRepo } = createService();
      folderRepo.getFolderById.mockResolvedValue(makeFolderMetadata());
      folderRepo.folderExistsInParent.mockResolvedValue(false);
      folderRepo.getFilesInFolder.mockResolvedValue([
        makeFileMetadata({ sizeBytes: 1024 }),
      ]);
      folderRepo.getSubfolders.mockResolvedValue([]);

      const plan = await service.plan({
        itemId: 'folder-1',
        itemType: 'folder',
        newName: 'renamed',
        requesterId: 'user-1',
      });

      expect(plan.summary).toContain('1 file');
      expect(plan.summary).not.toContain('1 files');
    });

    it('should pluralize correctly for multiple files', async () => {
      const { service, folderRepo } = createService();
      folderRepo.getFolderById.mockResolvedValue(makeFolderMetadata());
      folderRepo.folderExistsInParent.mockResolvedValue(false);
      folderRepo.getFilesInFolder.mockResolvedValue([
        makeFileMetadata({ id: 'f1', sizeBytes: 100 }),
        makeFileMetadata({ id: 'f2', sizeBytes: 200 }),
      ]);
      folderRepo.getSubfolders.mockResolvedValue([]);

      const plan = await service.plan({
        itemId: 'folder-1',
        itemType: 'folder',
        newName: 'renamed',
        requesterId: 'user-1',
      });

      expect(plan.summary).toContain('2 files');
    });
  });

  // ── execute() — File phix ───────────────────────────────────────

  describe('execute() — file phix', () => {
    function makeFilePlan(
      overrides: Partial<IPhixPlan<string>> = {},
    ): IPhixPlan<string> {
      return {
        itemId: 'file-1',
        itemType: 'file',
        oldName: 'old-name.txt',
        newName: 'new-name.txt',
        planType: PhixPlanType.MetadataOnly,
        affectedFileCount: 1,
        affectedFolderCount: 0,
        totalSizeBytes: 2048,
        summary: 'test summary',
        estimatedDurationMs: 0,
        requiresReEncryption: false,
        estimatedJoules: 0.003,
        ...overrides,
      };
    }

    it('should update the file name, updatedAt, and updatedBy', async () => {
      const { service, fileRepo } = createService();
      const file = makeFileMetadata();
      fileRepo.getFileById.mockResolvedValue(file);
      fileRepo.updateFile.mockResolvedValue(file);

      await service.execute(makeFilePlan(), 'user-1');

      expect(fileRepo.updateFile).toHaveBeenCalledTimes(1);
      const updated = fileRepo.updateFile.mock.calls[0][0];
      expect(updated.fileName).toBe('new-name.txt');
      expect(updated.updatedBy).toBe('user-1');
      expect(updated.updatedAt).toBeDefined();
    });

    it('should throw FileNotFoundError if file disappears before execute', async () => {
      const { service, fileRepo } = createService();
      fileRepo.getFileById.mockResolvedValue(null);

      await expect(service.execute(makeFilePlan(), 'user-1')).rejects.toThrow(
        FileNotFoundError,
      );
    });

    it('should return a successful result with the plan and completedAt', async () => {
      const { service, fileRepo } = createService();
      fileRepo.getFileById.mockResolvedValue(makeFileMetadata());
      fileRepo.updateFile.mockResolvedValue(makeFileMetadata());

      const plan = makeFilePlan();
      const result = await service.execute(plan, 'user-1');

      expect(result.success).toBe(true);
      expect(result.plan).toBe(plan);
      expect(result.completedAt).toBeDefined();
      expect(new Date(result.completedAt).getTime()).not.toBeNaN();
    });

    it('should log a FilePhixed audit entry', async () => {
      const { service, fileRepo, deps } = createService();
      fileRepo.getFileById.mockResolvedValue(makeFileMetadata());
      fileRepo.updateFile.mockResolvedValue(makeFileMetadata());

      const plan = makeFilePlan();
      await service.execute(plan, 'user-1');

      expect(deps.onAuditLog).toHaveBeenCalledTimes(1);
      const auditEntry = deps.onAuditLog!.mock.calls[0][0];
      expect(auditEntry.operationType).toBe(FileAuditOperationType.FilePhixed);
      expect(auditEntry.actorId).toBe('user-1');
      expect(auditEntry.targetId).toBe('file-1');
      expect(auditEntry.targetType).toBe('file');
      expect(auditEntry.metadata).toEqual(
        expect.objectContaining({
          oldName: 'old-name.txt',
          newName: 'new-name.txt',
          planType: PhixPlanType.MetadataOnly,
        }),
      );
    });

    it('should succeed even when onAuditLog is not provided', async () => {
      const fileRepo = makeMockFileRepository();
      const folderRepo = makeMockFolderRepository();
      const deps: IPhixServiceDeps<string> = {
        checkPermissionFlag: jest.fn().mockResolvedValue(true),
        // no onAuditLog
      };
      const service = new PhixService(fileRepo, folderRepo, deps);

      fileRepo.getFileById.mockResolvedValue(makeFileMetadata());
      fileRepo.updateFile.mockResolvedValue(makeFileMetadata());

      const result = await service.execute(makeFilePlan(), 'user-1');
      expect(result.success).toBe(true);
    });
  });

  // ── execute() — Folder phix ─────────────────────────────────────

  describe('execute() — folder phix', () => {
    function makeFolderPlan(
      overrides: Partial<IPhixPlan<string>> = {},
    ): IPhixPlan<string> {
      return {
        itemId: 'folder-1',
        itemType: 'folder',
        oldName: 'old-folder',
        newName: 'new-folder',
        planType: PhixPlanType.MetadataOnly,
        affectedFileCount: 0,
        affectedFolderCount: 0,
        totalSizeBytes: 0,
        summary: 'test summary',
        estimatedDurationMs: 0,
        requiresReEncryption: false,
        estimatedJoules: 0.003,
        ...overrides,
      };
    }

    it('should call updateFolderName with the new name', async () => {
      const { service, folderRepo } = createService();
      folderRepo.getFolderById.mockResolvedValue(makeFolderMetadata());

      await service.execute(makeFolderPlan(), 'user-1');

      expect(folderRepo.updateFolderName).toHaveBeenCalledWith(
        'folder-1',
        'new-folder',
      );
    });

    it('should throw FolderNotFoundError if folder disappears before execute', async () => {
      const { service, folderRepo } = createService();
      folderRepo.getFolderById.mockResolvedValue(null);

      await expect(service.execute(makeFolderPlan(), 'user-1')).rejects.toThrow(
        FolderNotFoundError,
      );
    });

    it('should log a FolderPhixed audit entry', async () => {
      const { service, folderRepo, deps } = createService();
      folderRepo.getFolderById.mockResolvedValue(makeFolderMetadata());

      const plan = makeFolderPlan({
        affectedFileCount: 5,
        affectedFolderCount: 2,
        totalSizeBytes: 10000,
      });
      await service.execute(plan, 'user-1');

      expect(deps.onAuditLog).toHaveBeenCalledTimes(1);
      const auditEntry = deps.onAuditLog!.mock.calls[0][0];
      expect(auditEntry.operationType).toBe(
        FileAuditOperationType.FolderPhixed,
      );
      expect(auditEntry.metadata).toEqual(
        expect.objectContaining({
          affectedFileCount: 5,
          affectedFolderCount: 2,
          totalSizeBytes: 10000,
        }),
      );
    });
  });

  // ── estimateCost() ──────────────────────────────────────────────

  describe('estimateCost()', () => {
    it('should return zero duration and 0.003 joules for MetadataOnly', () => {
      const cost = PhixService.estimateCost(PhixPlanType.MetadataOnly, 1e9);

      expect(cost.estimatedDurationMs).toBe(0);
      expect(cost.estimatedJoules).toBe(0.003);
      expect(cost.requiresReEncryption).toBe(false);
    });

    it('should compute duration and joules for FullCycle based on size', () => {
      const oneGB = 1024 * 1024 * 1024;
      const cost = PhixService.estimateCost(PhixPlanType.FullCycle, oneGB);

      expect(cost.requiresReEncryption).toBe(true);
      expect(cost.estimatedDurationMs).toBeGreaterThan(0);
      // ~50 J/GB
      expect(cost.estimatedJoules).toBeCloseTo(50, 0);
    });

    it('should scale linearly with size for FullCycle', () => {
      const oneGB = 1024 * 1024 * 1024;
      const cost1 = PhixService.estimateCost(PhixPlanType.FullCycle, oneGB);
      const cost2 = PhixService.estimateCost(PhixPlanType.FullCycle, 2 * oneGB);

      expect(cost2.estimatedJoules).toBeCloseTo(cost1.estimatedJoules * 2, 5);
      // Allow ±1ms tolerance due to Math.ceil() rounding in duration calculation
      expect(
        Math.abs(cost2.estimatedDurationMs - cost1.estimatedDurationMs * 2),
      ).toBeLessThanOrEqual(1);
    });

    it('should return zero joules for FullCycle with zero bytes', () => {
      const cost = PhixService.estimateCost(PhixPlanType.FullCycle, 0);

      expect(cost.estimatedJoules).toBe(0);
      expect(cost.estimatedDurationMs).toBe(0);
      expect(cost.requiresReEncryption).toBe(true);
    });
  });

  // ── formatBytes() ───────────────────────────────────────────────

  describe('formatBytes()', () => {
    it('should return "0 B" for zero bytes', () => {
      expect(PhixService.formatBytes(0)).toBe('0 B');
    });

    it('should format bytes correctly', () => {
      expect(PhixService.formatBytes(512)).toBe('512 B');
    });

    it('should format kilobytes', () => {
      expect(PhixService.formatBytes(1024)).toBe('1.0 KB');
    });

    it('should format megabytes', () => {
      expect(PhixService.formatBytes(1024 * 1024)).toBe('1.0 MB');
    });

    it('should format gigabytes', () => {
      expect(PhixService.formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
    });

    it('should format terabytes', () => {
      expect(PhixService.formatBytes(1024 ** 4)).toBe('1.0 TB');
    });

    it('should show one decimal place for non-byte units', () => {
      expect(PhixService.formatBytes(1536)).toBe('1.5 KB');
    });
  });

  // ── Full plan → execute round-trip ──────────────────────────────

  describe('plan → execute round-trip', () => {
    it('should plan and execute a file phix end-to-end', async () => {
      const { service, fileRepo, deps } = createService();
      const file = makeFileMetadata();
      fileRepo.getFileById.mockResolvedValue(file);
      fileRepo.updateFile.mockResolvedValue(file);

      const plan = await service.plan({
        itemId: 'file-1',
        itemType: 'file',
        newName: 'corrected.txt',
        requesterId: 'user-1',
      });

      expect(plan.planType).toBe(PhixPlanType.MetadataOnly);

      const result = await service.execute(plan, 'user-1');

      expect(result.success).toBe(true);
      expect(result.plan.newName).toBe('corrected.txt');
      expect(deps.onAuditLog).toHaveBeenCalledTimes(1);
    });

    it('should plan and execute a folder phix end-to-end', async () => {
      const { service, folderRepo, deps } = createService();
      folderRepo.getFolderById.mockResolvedValue(makeFolderMetadata());
      folderRepo.folderExistsInParent.mockResolvedValue(false);
      folderRepo.getFilesInFolder.mockResolvedValue([]);
      folderRepo.getSubfolders.mockResolvedValue([]);

      const plan = await service.plan({
        itemId: 'folder-1',
        itemType: 'folder',
        newName: 'corrected-folder',
        requesterId: 'user-1',
      });

      const result = await service.execute(plan, 'user-1');

      expect(result.success).toBe(true);
      expect(folderRepo.updateFolderName).toHaveBeenCalledWith(
        'folder-1',
        'corrected-folder',
      );
      expect(deps.onAuditLog).toHaveBeenCalledTimes(1);
    });
  });
});
