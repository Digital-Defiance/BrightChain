import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { PermissionFlag } from '../enumerations/permission-flag';
import {
  FileNotFoundError,
  FileVersionNotFoundError,
  PermissionDeniedError,
  VaultDestroyedError,
} from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IFileVersionBase } from '../interfaces/bases/file-version';
import type { IAccessContext } from '../interfaces/params/access-context';
import type { IFileRepository } from '../interfaces/services/file-repository';
import { FileService, IFileServiceDeps } from '../services/file-service';

// ── Helpers ─────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

function makeAccessContext(
  overrides: Partial<IAccessContext> = {},
): IAccessContext {
  return {
    ipAddress: '127.0.0.1',
    timestamp: new Date(),
    ...overrides,
  };
}

function makeFileMetadata(
  overrides: Partial<IFileMetadataBase<string>> = {},
): IFileMetadataBase<string> {
  const now = new Date().toISOString();
  return {
    id: 'file-1',
    ownerId: 'owner-1',
    vaultContainerId: 'vc-1',
    folderId: 'folder-1',
    fileName: 'test-file.txt',
    mimeType: 'text/plain',
    sizeBytes: 1024,
    tags: [],
    currentVersionId: 'version-1',
    vaultCreationLedgerEntryHash: new Uint8Array([1, 2, 3]),
    approvalGoverned: false,
    visibleWatermark: false,
    invisibleWatermark: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'owner-1',
    updatedBy: 'owner-1',
    ...overrides,
  };
}

function makeFileVersion(
  overrides: Partial<IFileVersionBase<string>> = {},
): IFileVersionBase<string> {
  return {
    id: 'version-1',
    fileId: 'file-1',
    versionNumber: 1,
    sizeBytes: 1024,
    vaultCreationLedgerEntryHash: new Uint8Array([1, 2, 3]),
    vaultState: 'sealed',
    uploaderId: 'owner-1',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeMockRepository(): jest.Mocked<IFileRepository<string>> {
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

function makeMockDeps(
  overrides: Partial<IFileServiceDeps<string>> = {},
): jest.Mocked<IFileServiceDeps<string>> {
  return {
    checkPermissionFlag: jest.fn().mockResolvedValue(true),
    readVault: jest.fn().mockResolvedValue({
      symmetricKey: new Uint8Array([1, 2, 3]),
      recipe: {},
    }),
    reconstructAndDecrypt: jest.fn().mockResolvedValue(new ReadableStream()),
    onAuditLog: jest.fn().mockResolvedValue(undefined),
    verifyNonAccess: jest.fn().mockResolvedValue({ verified: true }),
    ...overrides,
  } as jest.Mocked<IFileServiceDeps<string>>;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('FileService', () => {
  let mockRepo: jest.Mocked<IFileRepository<string>>;
  let mockDeps: jest.Mocked<IFileServiceDeps<string>>;
  let service: FileService<string>;

  beforeEach(() => {
    idCounter = 0;
    mockRepo = makeMockRepository();
    mockDeps = makeMockDeps();
    service = new FileService(mockRepo, mockDeps, generateId);
  });

  // ── createFile ──────────────────────────────────────────────────

  describe('createFile', () => {
    it('creates file metadata and initial version', async () => {
      const storedFile = makeFileMetadata({
        id: 'id-1',
        currentVersionId: 'id-2',
      });
      mockRepo.createFile.mockResolvedValue(storedFile);
      mockRepo.createFileVersion.mockResolvedValue(makeFileVersion());

      const result = await service.createFile({
        fileName: 'test.txt',
        mimeType: 'text/plain',
        sizeBytes: 512,
        folderId: 'folder-1',
        ownerId: 'owner-1',
        tags: ['important'],
        encryptionKey: new Uint8Array([10, 20]),
        recipe: {},
      });

      expect(result).toBe(storedFile);
      expect(mockRepo.createFile).toHaveBeenCalledTimes(1);

      // Verify the metadata shape passed to createFile
      const createdMeta = mockRepo.createFile.mock.calls[0][0];
      expect(createdMeta.id).toBe('id-1');
      expect(createdMeta.currentVersionId).toBe('id-2');
      expect(createdMeta.fileName).toBe('test.txt');
      expect(createdMeta.tags).toEqual(['important']);

      // Verify initial version was created
      expect(mockRepo.createFileVersion).toHaveBeenCalledTimes(1);
      const createdVersion = mockRepo.createFileVersion.mock.calls[0][0];
      expect(createdVersion.id).toBe('id-2');
      expect(createdVersion.fileId).toBe('id-1');
      expect(createdVersion.versionNumber).toBe(1);
      expect(createdVersion.vaultState).toBe('sealed');
    });

    it('logs FileUploaded audit event', async () => {
      mockRepo.createFile.mockResolvedValue(makeFileMetadata({ id: 'id-1' }));
      mockRepo.createFileVersion.mockResolvedValue(makeFileVersion());

      await service.createFile({
        fileName: 'audit-test.txt',
        mimeType: 'text/plain',
        sizeBytes: 256,
        folderId: 'folder-1',
        ownerId: 'owner-1',
        encryptionKey: new Uint8Array([1]),
        recipe: {},
      });

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.FileUploaded,
          actorId: 'owner-1',
          targetId: 'id-1',
          targetType: 'file',
        }),
      );
    });
  });

  // ── getFileContent ──────────────────────────────────────────────

  describe('getFileContent', () => {
    it('returns stream when user has Read permission', async () => {
      const file = makeFileMetadata();
      const version = makeFileVersion({ vaultState: 'sealed' });
      mockRepo.getFileById.mockResolvedValue(file);
      mockRepo.getFileVersion.mockResolvedValue(version);

      const expectedStream = new ReadableStream<Uint8Array>();
      mockDeps.reconstructAndDecrypt.mockResolvedValue(expectedStream);

      const result = await service.getFileContent(
        'file-1',
        'user-1',
        makeAccessContext(),
      );

      expect(result).toBe(expectedStream);
      expect(mockDeps.readVault).toHaveBeenCalledWith(
        file.vaultCreationLedgerEntryHash,
      );
      expect(mockDeps.reconstructAndDecrypt).toHaveBeenCalled();
    });

    it('throws PermissionDeniedError when user lacks Read permission', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.getFileContent('file-1', 'user-1', makeAccessContext()),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('throws VaultDestroyedError when vault state is destroyed', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockRepo.getFileVersion.mockResolvedValue(
        makeFileVersion({ vaultState: 'destroyed' }),
      );

      await expect(
        service.getFileContent('file-1', 'user-1', makeAccessContext()),
      ).rejects.toThrow(VaultDestroyedError);
    });

    it('throws FileNotFoundError when file does not exist', async () => {
      mockRepo.getFileById.mockResolvedValue(null);

      await expect(
        service.getFileContent('nonexistent', 'user-1', makeAccessContext()),
      ).rejects.toThrow(FileNotFoundError);
    });

    it('logs FileDownloaded audit event', async () => {
      const file = makeFileMetadata();
      mockRepo.getFileById.mockResolvedValue(file);
      mockRepo.getFileVersion.mockResolvedValue(makeFileVersion());

      const ctx = makeAccessContext({ ipAddress: '10.0.0.1' });
      await service.getFileContent('file-1', 'user-1', ctx);

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.FileDownloaded,
          actorId: 'user-1',
          targetId: 'file-1',
          targetType: 'file',
          ipAddress: '10.0.0.1',
        }),
      );
    });
  });

  // ── getFileMetadata ─────────────────────────────────────────────

  describe('getFileMetadata', () => {
    it('returns metadata when user has Read permission', async () => {
      const file = makeFileMetadata();
      mockRepo.getFileById.mockResolvedValue(file);

      const result = await service.getFileMetadata('file-1', 'user-1');

      expect(result).toBe(file);
      expect(mockDeps.checkPermissionFlag).toHaveBeenCalledWith(
        'file-1',
        'file',
        'user-1',
        PermissionFlag.Read,
        expect.any(Object),
      );
    });

    it('throws PermissionDeniedError when user lacks Read permission', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(service.getFileMetadata('file-1', 'user-1')).rejects.toThrow(
        PermissionDeniedError,
      );
    });

    it('throws FileNotFoundError when file does not exist', async () => {
      mockRepo.getFileById.mockResolvedValue(null);

      await expect(
        service.getFileMetadata('nonexistent', 'user-1'),
      ).rejects.toThrow(FileNotFoundError);
    });
  });

  // ── updateFileMetadata ──────────────────────────────────────────

  describe('updateFileMetadata', () => {
    it('updates file name and logs FileRenamed audit', async () => {
      const file = makeFileMetadata({ fileName: 'old-name.txt' });
      mockRepo.getFileById.mockResolvedValue(file);
      mockRepo.updateFile.mockResolvedValue(
        makeFileMetadata({ fileName: 'new-name.txt' }),
      );

      await service.updateFileMetadata(
        'file-1',
        { fileName: 'new-name.txt' },
        'user-1',
      );

      expect(mockRepo.updateFile).toHaveBeenCalledTimes(1);
      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.FileRenamed,
          actorId: 'user-1',
          targetId: 'file-1',
          targetType: 'file',
        }),
      );
    });

    it('updates tags', async () => {
      const file = makeFileMetadata({ tags: ['old'] });
      mockRepo.getFileById.mockResolvedValue(file);
      mockRepo.updateFile.mockResolvedValue(
        makeFileMetadata({ tags: ['new', 'updated'] }),
      );

      await service.updateFileMetadata(
        'file-1',
        { tags: ['new', 'updated'] },
        'user-1',
      );

      // Verify the file passed to updateFile has the new tags
      const updatedFile = mockRepo.updateFile.mock.calls[0][0];
      expect(updatedFile.tags).toEqual(['new', 'updated']);
    });

    it('throws PermissionDeniedError when user lacks Write permission', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.updateFileMetadata('file-1', { fileName: 'x' }, 'user-1'),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('checks Write permission flag', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockRepo.updateFile.mockResolvedValue(makeFileMetadata());

      await service.updateFileMetadata(
        'file-1',
        { fileName: 'renamed.txt' },
        'user-1',
      );

      expect(mockDeps.checkPermissionFlag).toHaveBeenCalledWith(
        'file-1',
        'file',
        'user-1',
        PermissionFlag.Write,
        expect.any(Object),
      );
    });
  });

  // ── softDelete ──────────────────────────────────────────────────

  describe('softDelete', () => {
    it('sets deletedAt and deletedFromPath', async () => {
      const file = makeFileMetadata({ folderId: 'folder-42' });
      mockRepo.getFileById.mockResolvedValue(file);
      mockRepo.updateFile.mockResolvedValue(file);

      await service.softDelete('file-1', 'user-1');

      const updatedFile = mockRepo.updateFile.mock.calls[0][0];
      expect(updatedFile.deletedAt).toBeDefined();
      expect(updatedFile.deletedFromPath).toBe('folder-42');
    });

    it('throws PermissionDeniedError when user lacks Delete permission', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(service.softDelete('file-1', 'user-1')).rejects.toThrow(
        PermissionDeniedError,
      );
    });

    it('logs FileDeleted audit event', async () => {
      const file = makeFileMetadata({ folderId: 'folder-42' });
      mockRepo.getFileById.mockResolvedValue(file);
      mockRepo.updateFile.mockResolvedValue(file);

      await service.softDelete('file-1', 'user-1');

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.FileDeleted,
          actorId: 'user-1',
          targetId: 'file-1',
          targetType: 'file',
        }),
      );
    });

    it('checks Delete permission flag', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockRepo.updateFile.mockResolvedValue(makeFileMetadata());

      await service.softDelete('file-1', 'user-1');

      expect(mockDeps.checkPermissionFlag).toHaveBeenCalledWith(
        'file-1',
        'file',
        'user-1',
        PermissionFlag.Delete,
        expect.any(Object),
      );
    });
  });

  // ── restoreFromTrash ────────────────────────────────────────────

  describe('restoreFromTrash', () => {
    it('clears deletedAt and deletedFromPath', async () => {
      const file = makeFileMetadata({
        deletedAt: new Date().toISOString(),
        deletedFromPath: 'folder-42',
      });
      mockRepo.getFileById.mockResolvedValue(file);
      mockRepo.updateFile.mockResolvedValue(file);

      await service.restoreFromTrash('file-1', 'user-1');

      const updatedFile = mockRepo.updateFile.mock.calls[0][0];
      expect(updatedFile.deletedAt).toBeUndefined();
      expect(updatedFile.deletedFromPath).toBeUndefined();
    });

    it('throws error when file is not in trash', async () => {
      const file = makeFileMetadata({ deletedAt: undefined });
      mockRepo.getFileById.mockResolvedValue(file);

      await expect(
        service.restoreFromTrash('file-1', 'user-1'),
      ).rejects.toThrow('is not in trash');
    });

    it('logs FileRestored audit event', async () => {
      const file = makeFileMetadata({
        deletedAt: new Date().toISOString(),
        deletedFromPath: 'folder-42',
      });
      mockRepo.getFileById.mockResolvedValue(file);
      mockRepo.updateFile.mockResolvedValue(file);

      await service.restoreFromTrash('file-1', 'user-1');

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.FileRestored,
          actorId: 'user-1',
          targetId: 'file-1',
          targetType: 'file',
        }),
      );
    });

    it('throws PermissionDeniedError when user lacks Delete permission', async () => {
      const file = makeFileMetadata({
        deletedAt: new Date().toISOString(),
        deletedFromPath: 'folder-42',
      });
      mockRepo.getFileById.mockResolvedValue(file);
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.restoreFromTrash('file-1', 'user-1'),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  // ── soft-delete and restore round-trip ──────────────────────────

  describe('soft-delete and restore round-trip', () => {
    it('restores file to original state after soft-delete', async () => {
      const originalFile = makeFileMetadata({ folderId: 'folder-original' });
      mockRepo.getFileById.mockResolvedValue(originalFile);
      mockRepo.updateFile.mockImplementation(async (f) => ({ ...f }));

      // Soft-delete
      await service.softDelete('file-1', 'user-1');

      const afterDelete = mockRepo.updateFile.mock.calls[0][0];
      expect(afterDelete.deletedAt).toBeDefined();
      expect(afterDelete.deletedFromPath).toBe('folder-original');

      // Restore — the file now has deletedAt set from the soft-delete
      await service.restoreFromTrash('file-1', 'user-1');

      const afterRestore = mockRepo.updateFile.mock.calls[1][0];
      expect(afterRestore.deletedAt).toBeUndefined();
      expect(afterRestore.deletedFromPath).toBeUndefined();
    });
  });

  // ── getVersionHistory ───────────────────────────────────────────

  describe('getVersionHistory', () => {
    it('returns versions sorted by versionNumber', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockRepo.getFileVersions.mockResolvedValue([
        makeFileVersion({ id: 'v3', versionNumber: 3 }),
        makeFileVersion({ id: 'v1', versionNumber: 1 }),
        makeFileVersion({ id: 'v2', versionNumber: 2 }),
      ]);

      const result = await service.getVersionHistory('file-1', 'user-1');

      expect(result).toHaveLength(3);
      expect(result[0].versionNumber).toBe(1);
      expect(result[1].versionNumber).toBe(2);
      expect(result[2].versionNumber).toBe(3);
    });

    it('throws PermissionDeniedError when user lacks Read permission', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.getVersionHistory('file-1', 'user-1'),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('throws FileNotFoundError when file does not exist', async () => {
      mockRepo.getFileById.mockResolvedValue(null);

      await expect(
        service.getVersionHistory('nonexistent', 'user-1'),
      ).rejects.toThrow(FileNotFoundError);
    });
  });

  // ── restoreVersion ──────────────────────────────────────────────

  describe('restoreVersion', () => {
    it('updates currentVersionId to restored version without deleting others', async () => {
      const file = makeFileMetadata({ currentVersionId: 'v1' });
      mockRepo.getFileById.mockResolvedValue(file);
      mockRepo.getFileVersion.mockResolvedValue(
        makeFileVersion({
          id: 'v2',
          versionNumber: 2,
          vaultState: 'sealed',
          vaultCreationLedgerEntryHash: new Uint8Array([10, 20]),
        }),
      );
      mockRepo.updateFile.mockImplementation(async (f) => ({ ...f }));

      const result = await service.restoreVersion('file-1', 'v2', 'user-1');

      // currentVersionId should now point to v2
      expect(result.currentVersionId).toBe('v2');
      // vaultCreationLedgerEntryHash should be updated to the restored version's hash
      expect(result.vaultCreationLedgerEntryHash).toEqual(
        new Uint8Array([10, 20]),
      );
      // No versions should have been deleted
      expect(mockRepo.deleteFile).not.toHaveBeenCalled();
    });

    it('throws VaultDestroyedError when version vault is destroyed', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockRepo.getFileVersion.mockResolvedValue(
        makeFileVersion({ vaultState: 'destroyed' }),
      );

      await expect(
        service.restoreVersion('file-1', 'v2', 'user-1'),
      ).rejects.toThrow(VaultDestroyedError);
    });

    it('throws FileVersionNotFoundError when version does not exist', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockRepo.getFileVersion.mockResolvedValue(null);

      await expect(
        service.restoreVersion('file-1', 'nonexistent', 'user-1'),
      ).rejects.toThrow(FileVersionNotFoundError);
    });

    it('logs FileVersionRestored audit event', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockRepo.getFileVersion.mockResolvedValue(
        makeFileVersion({ id: 'v2', versionNumber: 2, vaultState: 'sealed' }),
      );
      mockRepo.updateFile.mockImplementation(async (f) => ({ ...f }));

      await service.restoreVersion('file-1', 'v2', 'user-1');

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.FileVersionRestored,
          actorId: 'user-1',
          targetId: 'file-1',
          targetType: 'file',
          metadata: expect.objectContaining({
            restoredVersionId: 'v2',
            versionNumber: 2,
          }),
        }),
      );
    });

    it('throws PermissionDeniedError when user lacks ManageVersions permission', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.restoreVersion('file-1', 'v2', 'user-1'),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  // ── getNonAccessProof ───────────────────────────────────────────

  describe('getNonAccessProof', () => {
    it('returns verification result', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      (mockDeps.verifyNonAccess as jest.Mock).mockResolvedValue({
        verified: true,
        proof: 'abc',
      });

      const result = await service.getNonAccessProof('file-1', 'user-1');

      expect(result).toEqual({ verified: true, proof: 'abc' });
      expect(mockDeps.verifyNonAccess).toHaveBeenCalledWith(
        new Uint8Array([1, 2, 3]),
      );
    });

    it('throws when verifyNonAccess is not configured', async () => {
      const depsWithout = makeMockDeps({ verifyNonAccess: undefined });
      const svc = new FileService(mockRepo, depsWithout, generateId);
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());

      await expect(svc.getNonAccessProof('file-1', 'user-1')).rejects.toThrow(
        'Non-access proof verification not configured',
      );
    });

    it('logs NonAccessProofGenerated audit event', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());

      await service.getNonAccessProof('file-1', 'user-1');

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.NonAccessProofGenerated,
          actorId: 'user-1',
          targetId: 'file-1',
          targetType: 'file',
        }),
      );
    });

    it('throws PermissionDeniedError when user lacks Read permission', async () => {
      mockRepo.getFileById.mockResolvedValue(makeFileMetadata());
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.getNonAccessProof('file-1', 'user-1'),
      ).rejects.toThrow(PermissionDeniedError);
    });
  });

  // ── search ──────────────────────────────────────────────────────

  describe('search', () => {
    it('delegates to repository and returns results', async () => {
      const files = [
        makeFileMetadata({ id: 'f1', fileName: 'doc.pdf' }),
        makeFileMetadata({ id: 'f2', fileName: 'report.pdf' }),
      ];
      mockRepo.searchFiles.mockResolvedValue({
        results: files,
        totalCount: 2,
      });

      const result = await service.search(
        { query: 'pdf', mimeType: 'application/pdf' },
        'user-1',
      );

      expect(result.results).toEqual(files);
      expect(result.totalCount).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(50);
      expect(mockRepo.searchFiles).toHaveBeenCalledWith(
        { query: 'pdf', mimeType: 'application/pdf' },
        [],
      );
    });

    it('returns empty results when no files match', async () => {
      mockRepo.searchFiles.mockResolvedValue({
        results: [],
        totalCount: 0,
      });

      const result = await service.search({ query: 'nonexistent' }, 'user-1');

      expect(result.results).toEqual([]);
      expect(result.totalCount).toBe(0);
    });
  });
});
