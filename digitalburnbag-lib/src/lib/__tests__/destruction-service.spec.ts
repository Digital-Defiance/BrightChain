import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import {
  FileNotFoundError,
  ScheduledDestructionNotFoundError,
} from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IFileVersionBase } from '../interfaces/bases/file-version';
import type { IDestructionRepository } from '../interfaces/services/destruction-repository';
import type {
  IFileDestructionProof,
  IFileVerificationBundle,
} from '../interfaces/services/destruction-service';
import {
  DestructionService,
  IDestructionServiceDeps,
} from '../services/destruction-service';

// ── Helpers ─────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

function makeMockRepository(): jest.Mocked<IDestructionRepository<string>> {
  return {
    getFileMetadata: jest.fn(),
    getFileVersions: jest.fn(),
    updateFileMetadata: jest.fn(),
    getFilesScheduledForDestruction: jest.fn(),
    getExpiredTrashItems: jest.fn(),
  };
}

function makeMockDeps(): jest.Mocked<IDestructionServiceDeps<string>> {
  return {
    destroyVault: jest
      .fn()
      .mockResolvedValue({ destructionHash: new Uint8Array([10, 20, 30]) }),
    revokeAllWrappings: jest.fn().mockResolvedValue(2),
    recordOnLedger: jest.fn().mockResolvedValue(new Uint8Array([7, 8, 9])),
    verifyProof: jest.fn().mockReturnValue({ valid: true }),
    onAuditLog: jest.fn().mockResolvedValue(undefined),
  };
}

function makeFileMetadata(
  overrides: Partial<IFileMetadataBase<string>> = {},
): IFileMetadataBase<string> {
  return {
    id: 'file-1',
    ownerId: 'owner-1',
    vaultContainerId: 'vc-1',
    folderId: 'folder-1',
    fileName: 'test.txt',
    mimeType: 'text/plain',
    sizeBytes: 1024,
    tags: [],
    currentVersionId: 'version-1',
    vaultCreationLedgerEntryHash: new Uint8Array([1, 2, 3]),
    approvalGoverned: false,
    visibleWatermark: false,
    invisibleWatermark: false,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
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
    createdAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('DestructionService', () => {
  let mockRepo: jest.Mocked<IDestructionRepository<string>>;
  let mockDeps: jest.Mocked<IDestructionServiceDeps<string>>;
  let service: DestructionService<string>;

  beforeEach(() => {
    idCounter = 0;
    mockRepo = makeMockRepository();
    mockDeps = makeMockDeps();
    service = new DestructionService(mockRepo, mockDeps, generateId);
  });

  // ── destroyFile ─────────────────────────────────────────────────

  describe('destroyFile', () => {
    it('should destroy all versions and revoke all key wrappings', async () => {
      const versions = [
        makeFileVersion({ id: 'v-1', versionNumber: 1 }),
        makeFileVersion({ id: 'v-2', versionNumber: 2 }),
      ];
      mockRepo.getFileMetadata.mockResolvedValue(makeFileMetadata());
      mockRepo.getFileVersions.mockResolvedValue(versions);

      await service.destroyFile('file-1', 'owner-1');

      // Each version's vault should be destroyed
      expect(mockDeps.destroyVault).toHaveBeenCalledTimes(2);
      expect(mockDeps.destroyVault).toHaveBeenCalledWith(
        versions[0].vaultCreationLedgerEntryHash,
      );
      expect(mockDeps.destroyVault).toHaveBeenCalledWith(
        versions[1].vaultCreationLedgerEntryHash,
      );

      // Each version's key wrappings should be revoked
      expect(mockDeps.revokeAllWrappings).toHaveBeenCalledTimes(2);
      expect(mockDeps.revokeAllWrappings).toHaveBeenCalledWith(
        'v-1',
        'owner-1',
      );
      expect(mockDeps.revokeAllWrappings).toHaveBeenCalledWith(
        'v-2',
        'owner-1',
      );
    });

    it('should throw FileNotFoundError when file not found', async () => {
      mockRepo.getFileMetadata.mockResolvedValue(null);

      await expect(
        service.destroyFile('nonexistent', 'owner-1'),
      ).rejects.toThrow(FileNotFoundError);
    });

    it('should record destruction on ledger', async () => {
      mockRepo.getFileMetadata.mockResolvedValue(makeFileMetadata());
      mockRepo.getFileVersions.mockResolvedValue([makeFileVersion()]);

      const proof = await service.destroyFile('file-1', 'owner-1');

      expect(mockDeps.recordOnLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'file_destroyed',
          fileId: 'file-1',
          versionCount: 1,
          destroyedBy: 'owner-1',
        }),
      );
      expect(proof.ledgerEntryHash).toEqual(new Uint8Array([7, 8, 9]));
    });

    it('should log audit entry', async () => {
      mockRepo.getFileMetadata.mockResolvedValue(makeFileMetadata());
      mockRepo.getFileVersions.mockResolvedValue([makeFileVersion()]);

      await service.destroyFile('file-1', 'owner-1');

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.FileDestroyed,
          actorId: 'owner-1',
          targetId: 'file-1',
          targetType: 'file',
          metadata: expect.objectContaining({
            versionCount: 1,
          }),
        }),
      );
    });
  });

  // ── batchDestroy ──────────────────────────────────────────────────

  describe('batchDestroy', () => {
    it('should collect succeeded and failed results', async () => {
      // file-1 succeeds
      mockRepo.getFileMetadata
        .mockResolvedValueOnce(makeFileMetadata({ id: 'file-1' }))
        // file-2 not found
        .mockResolvedValueOnce(null);
      mockRepo.getFileVersions.mockResolvedValueOnce([makeFileVersion()]);

      const result = await service.batchDestroy(
        ['file-1', 'file-2'],
        'owner-1',
      );

      expect(result.succeeded).toHaveLength(1);
      expect(result.succeeded[0].fileId).toBe('file-1');
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].fileId).toBe('file-2');
    });

    it('should not throw when individual files fail', async () => {
      mockRepo.getFileMetadata.mockResolvedValue(null);

      await expect(
        service.batchDestroy(['bad-1', 'bad-2'], 'owner-1'),
      ).resolves.toBeDefined();

      const result = await service.batchDestroy(['bad-1', 'bad-2'], 'owner-1');
      expect(result.failed).toHaveLength(2);
      expect(result.succeeded).toHaveLength(0);
    });

    it('should produce proof for each succeeded file', async () => {
      mockRepo.getFileMetadata
        .mockResolvedValueOnce(makeFileMetadata({ id: 'file-1' }))
        .mockResolvedValueOnce(makeFileMetadata({ id: 'file-2' }));
      mockRepo.getFileVersions
        .mockResolvedValueOnce([
          makeFileVersion({ id: 'v-1', fileId: 'file-1' }),
        ])
        .mockResolvedValueOnce([
          makeFileVersion({ id: 'v-2', fileId: 'file-2' }),
        ]);

      const result = await service.batchDestroy(
        ['file-1', 'file-2'],
        'owner-1',
      );

      expect(result.succeeded).toHaveLength(2);
      for (const entry of result.succeeded) {
        expect(entry.proof).toBeDefined();
        expect(entry.proof.fileId).toBeDefined();
        expect(entry.proof.destructionHash).toBeDefined();
        expect(entry.proof.ledgerEntryHash).toBeDefined();
        expect(entry.proof.timestamp).toBeInstanceOf(Date);
      }
    });
  });

  // ── scheduleDestruction ───────────────────────────────────────────

  describe('scheduleDestruction', () => {
    it('should set scheduledDestructionAt on file metadata', async () => {
      mockRepo.getFileMetadata.mockResolvedValue(makeFileMetadata());
      mockRepo.updateFileMetadata.mockResolvedValue(undefined);

      const scheduledAt = new Date('2025-06-01T00:00:00Z');
      await service.scheduleDestruction('file-1', scheduledAt, 'owner-1');

      expect(mockRepo.updateFileMetadata).toHaveBeenCalledWith(
        'file-1',
        expect.objectContaining({
          scheduledDestructionAt: scheduledAt.toISOString(),
          updatedBy: 'owner-1',
        }),
      );
    });

    it('should throw FileNotFoundError when file not found', async () => {
      mockRepo.getFileMetadata.mockResolvedValue(null);

      await expect(
        service.scheduleDestruction('nonexistent', new Date(), 'owner-1'),
      ).rejects.toThrow(FileNotFoundError);
    });

    it('should log audit entry with scheduled time', async () => {
      mockRepo.getFileMetadata.mockResolvedValue(makeFileMetadata());
      mockRepo.updateFileMetadata.mockResolvedValue(undefined);

      const scheduledAt = new Date('2025-06-01T00:00:00Z');
      await service.scheduleDestruction('file-1', scheduledAt, 'owner-1');

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.DestructionScheduled,
          actorId: 'owner-1',
          targetId: 'file-1',
          targetType: 'file',
          metadata: expect.objectContaining({
            scheduledAt: scheduledAt.toISOString(),
          }),
        }),
      );
    });
  });

  // ── cancelScheduledDestruction ────────────────────────────────────

  describe('cancelScheduledDestruction', () => {
    it('should clear scheduledDestructionAt', async () => {
      mockRepo.getFileMetadata.mockResolvedValue(
        makeFileMetadata({
          scheduledDestructionAt: '2025-06-01T00:00:00Z',
        }),
      );
      mockRepo.updateFileMetadata.mockResolvedValue(undefined);

      await service.cancelScheduledDestruction('file-1', 'owner-1');

      expect(mockRepo.updateFileMetadata).toHaveBeenCalledWith(
        'file-1',
        expect.objectContaining({
          scheduledDestructionAt: undefined,
          updatedBy: 'owner-1',
        }),
      );
    });

    it('should throw FileNotFoundError when file not found', async () => {
      mockRepo.getFileMetadata.mockResolvedValue(null);

      await expect(
        service.cancelScheduledDestruction('nonexistent', 'owner-1'),
      ).rejects.toThrow(FileNotFoundError);
    });

    it('should throw ScheduledDestructionNotFoundError when no schedule exists', async () => {
      mockRepo.getFileMetadata.mockResolvedValue(
        makeFileMetadata({ scheduledDestructionAt: undefined }),
      );

      await expect(
        service.cancelScheduledDestruction('file-1', 'owner-1'),
      ).rejects.toThrow(ScheduledDestructionNotFoundError);
    });
  });

  // ── executeScheduledDestructions ──────────────────────────────────

  describe('executeScheduledDestructions', () => {
    it('should destroy files past their scheduled time', async () => {
      const scheduledFiles = [
        makeFileMetadata({ id: 'file-1' }),
        makeFileMetadata({ id: 'file-2' }),
      ];
      mockRepo.getFilesScheduledForDestruction.mockResolvedValue(
        scheduledFiles,
      );
      // Each file needs metadata + versions for destroyFile
      mockRepo.getFileMetadata
        .mockResolvedValueOnce(makeFileMetadata({ id: 'file-1' }))
        .mockResolvedValueOnce(makeFileMetadata({ id: 'file-2' }));
      mockRepo.getFileVersions
        .mockResolvedValueOnce([
          makeFileVersion({ id: 'v-1', fileId: 'file-1' }),
        ])
        .mockResolvedValueOnce([
          makeFileVersion({ id: 'v-2', fileId: 'file-2' }),
        ]);

      const result = await service.executeScheduledDestructions();

      expect(result.succeeded).toHaveLength(2);
      expect(mockRepo.getFilesScheduledForDestruction).toHaveBeenCalledWith(
        expect.any(Date),
      );
    });

    it('should return empty result when no files are scheduled', async () => {
      mockRepo.getFilesScheduledForDestruction.mockResolvedValue([]);

      const result = await service.executeScheduledDestructions();

      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });
  });

  // ── verifyDestruction ─────────────────────────────────────────────

  describe('verifyDestruction', () => {
    it('should delegate to deps.verifyProof', () => {
      const proof: IFileDestructionProof = {
        fileId: 'file-1',
        destructionHash: new Uint8Array([10, 20, 30]),
        ledgerEntryHash: new Uint8Array([7, 8, 9]),
        timestamp: new Date(),
      };
      const bundle: IFileVerificationBundle = {
        proof,
        ledgerEntryHash: new Uint8Array([7, 8, 9]),
      };

      const result = service.verifyDestruction(proof, bundle);

      expect(mockDeps.verifyProof).toHaveBeenCalledWith(proof, bundle);
      expect(result).toEqual({ valid: true });
    });
  });

  // ── purgeExpiredTrash ─────────────────────────────────────────────

  describe('purgeExpiredTrash', () => {
    it('should destroy expired trash items', async () => {
      const expiredItems = [
        makeFileMetadata({ id: 'trash-1', deletedAt: '2024-01-01T00:00:00Z' }),
        makeFileMetadata({ id: 'trash-2', deletedAt: '2024-01-02T00:00:00Z' }),
      ];
      mockRepo.getExpiredTrashItems.mockResolvedValue(expiredItems);
      mockRepo.getFileMetadata
        .mockResolvedValueOnce(makeFileMetadata({ id: 'trash-1' }))
        .mockResolvedValueOnce(makeFileMetadata({ id: 'trash-2' }));
      mockRepo.getFileVersions
        .mockResolvedValueOnce([
          makeFileVersion({ id: 'v-1', fileId: 'trash-1' }),
        ])
        .mockResolvedValueOnce([
          makeFileVersion({ id: 'v-2', fileId: 'trash-2' }),
        ]);

      const result = await service.purgeExpiredTrash();

      expect(result.succeeded).toHaveLength(2);
      expect(mockRepo.getExpiredTrashItems).toHaveBeenCalledWith(
        expect.any(Date),
      );
    });

    it('should return empty result when no expired items', async () => {
      mockRepo.getExpiredTrashItems.mockResolvedValue([]);

      const result = await service.purgeExpiredTrash();

      expect(result.succeeded).toHaveLength(0);
      expect(result.failed).toHaveLength(0);
    });
  });
});
