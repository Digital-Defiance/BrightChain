import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { AuditLogError } from '../errors';
import type { IAuditEntryBase } from '../interfaces/bases/audit-entry';
import type {
  IAuditEntryParams,
  IAuditQueryFilters,
  IComplianceReportParams,
} from '../interfaces/params/audit-service-params';
import type { IAuditRepository } from '../interfaces/services/audit-repository';
import { AuditService, IAuditServiceDeps } from '../services/audit-service';

// ── Helpers ─────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

function makeMockRepository(): jest.Mocked<IAuditRepository<string>> {
  return {
    appendEntry: jest.fn().mockResolvedValue(undefined),
    queryEntries: jest.fn().mockResolvedValue([]),
    getNextSequenceNumber: jest.fn().mockResolvedValue(1),
  };
}

function makeMockDeps(): jest.Mocked<IAuditServiceDeps<string>> {
  return {
    recordOnLedger: jest.fn().mockResolvedValue(new Uint8Array([7, 8, 9])),
    generateMerkleProof: jest
      .fn()
      .mockResolvedValue([new Uint8Array([10, 11, 12])]),
  };
}

function makeAuditEntry(
  overrides: Partial<IAuditEntryBase<string>> = {},
): IAuditEntryBase<string> {
  return {
    sequenceNumber: 1,
    operationType: FileAuditOperationType.FileUploaded,
    actorId: 'user-1',
    targetId: 'file-1',
    targetType: 'file',
    timestamp: '2024-01-01T00:00:00Z',
    metadata: {},
    ledgerEntryHash: new Uint8Array([1, 2, 3]),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('AuditService', () => {
  let mockRepo: jest.Mocked<IAuditRepository<string>>;
  let mockDeps: jest.Mocked<IAuditServiceDeps<string>>;
  let service: AuditService<string>;

  beforeEach(() => {
    idCounter = 0;
    mockRepo = makeMockRepository();
    mockDeps = makeMockDeps();
    service = new AuditService(mockRepo, mockDeps, generateId);
  });

  // ── logOperation ──────────────────────────────────────────────────

  describe('logOperation', () => {
    const baseParams: IAuditEntryParams<string> = {
      operationType: FileAuditOperationType.FileUploaded,
      actorId: 'user-1',
      targetId: 'file-1',
      targetType: 'file',
      metadata: { size: 1024 },
    };

    it('should get next sequence number and record on ledger', async () => {
      await service.logOperation(baseParams);

      expect(mockRepo.getNextSequenceNumber).toHaveBeenCalledTimes(1);
      expect(mockDeps.recordOnLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'audit_log',
          sequenceNumber: 1,
          operationType: FileAuditOperationType.FileUploaded,
          actorId: 'user-1',
          targetId: 'file-1',
          targetType: 'file',
          metadata: { size: 1024 },
        }),
      );
    });

    it('should store audit entry in repository with correct fields', async () => {
      await service.logOperation(baseParams);

      expect(mockRepo.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          sequenceNumber: 1,
          operationType: FileAuditOperationType.FileUploaded,
          actorId: 'user-1',
          targetId: 'file-1',
          targetType: 'file',
          metadata: { size: 1024 },
          ledgerEntryHash: new Uint8Array([7, 8, 9]),
        }),
      );
    });

    it('should include ipAddress when provided', async () => {
      await service.logOperation({ ...baseParams, ipAddress: '192.168.1.1' });

      expect(mockRepo.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({ ipAddress: '192.168.1.1' }),
      );
    });

    it('should include isDuress flag when set', async () => {
      await service.logOperation({ ...baseParams, isDuress: true });

      expect(mockRepo.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({ isDuress: true }),
      );
    });

    it('should include isRubberStamped flag when set', async () => {
      await service.logOperation({ ...baseParams, isRubberStamped: true });

      expect(mockRepo.appendEntry).toHaveBeenCalledWith(
        expect.objectContaining({ isRubberStamped: true }),
      );
    });

    it('should throw AuditLogError when ledger recording fails', async () => {
      mockDeps.recordOnLedger.mockRejectedValue(new Error('ledger down'));

      await expect(service.logOperation(baseParams)).rejects.toThrow(
        AuditLogError,
      );
    });

    it('should throw AuditLogError when repository append fails', async () => {
      mockRepo.appendEntry.mockRejectedValue(new Error('db write failed'));

      await expect(service.logOperation(baseParams)).rejects.toThrow(
        AuditLogError,
      );
    });
  });

  // ── queryAuditLog ─────────────────────────────────────────────────

  describe('queryAuditLog', () => {
    it('should delegate to repository.queryEntries with filters', async () => {
      const filters: IAuditQueryFilters<string> = {
        actorId: 'user-1',
        operationType: FileAuditOperationType.FileUploaded,
      };

      await service.queryAuditLog(filters);

      expect(mockRepo.queryEntries).toHaveBeenCalledWith(filters);
    });

    it('should return entries from repository', async () => {
      const entries = [makeAuditEntry(), makeAuditEntry({ sequenceNumber: 2 })];
      mockRepo.queryEntries.mockResolvedValue(entries);

      const result = await service.queryAuditLog({});

      expect(result).toEqual(entries);
    });
  });

  // ── exportAuditLog ────────────────────────────────────────────────

  describe('exportAuditLog', () => {
    it('should query entries and generate Merkle proofs for each', async () => {
      const entries = [
        makeAuditEntry({ ledgerEntryHash: new Uint8Array([1]) }),
        makeAuditEntry({
          sequenceNumber: 2,
          ledgerEntryHash: new Uint8Array([2]),
        }),
      ];
      mockRepo.queryEntries.mockResolvedValue(entries);

      await service.exportAuditLog({});

      expect(mockDeps.generateMerkleProof).toHaveBeenCalledTimes(2);
      expect(mockDeps.generateMerkleProof).toHaveBeenCalledWith(
        new Uint8Array([1]),
      );
      expect(mockDeps.generateMerkleProof).toHaveBeenCalledWith(
        new Uint8Array([2]),
      );
    });

    it('should return entries and merkle proofs in export', async () => {
      const entries = [makeAuditEntry()];
      mockRepo.queryEntries.mockResolvedValue(entries);

      const result = await service.exportAuditLog({});

      expect(result.entries).toEqual(entries);
      expect(result.merkleProofs).toEqual([new Uint8Array([10, 11, 12])]);
    });

    it('should return empty export when no entries match', async () => {
      mockRepo.queryEntries.mockResolvedValue([]);

      const result = await service.exportAuditLog({});

      expect(result.entries).toEqual([]);
      expect(result.merkleProofs).toEqual([]);
    });
  });

  // ── generateComplianceReport ──────────────────────────────────────

  describe('generateComplianceReport', () => {
    const baseParams: IComplianceReportParams<string> = {
      dateFrom: new Date('2024-01-01T00:00:00Z'),
      dateTo: new Date('2024-12-31T23:59:59Z'),
    };

    // A mix of entries covering all categories
    const mixedEntries: IAuditEntryBase<string>[] = [
      makeAuditEntry({
        sequenceNumber: 1,
        operationType: FileAuditOperationType.FileUploaded,
        actorId: 'user-1',
        ledgerEntryHash: new Uint8Array([1]),
      }),
      makeAuditEntry({
        sequenceNumber: 2,
        operationType: FileAuditOperationType.FileDownloaded,
        actorId: 'user-1',
        ledgerEntryHash: new Uint8Array([2]),
      }),
      makeAuditEntry({
        sequenceNumber: 3,
        operationType: FileAuditOperationType.FileDestroyed,
        actorId: 'user-2',
        ledgerEntryHash: new Uint8Array([3]),
      }),
      makeAuditEntry({
        sequenceNumber: 4,
        operationType: FileAuditOperationType.DestructionScheduled,
        actorId: 'user-2',
        ledgerEntryHash: new Uint8Array([4]),
      }),
      makeAuditEntry({
        sequenceNumber: 5,
        operationType: FileAuditOperationType.ShareCreated,
        actorId: 'user-1',
        ledgerEntryHash: new Uint8Array([5]),
      }),
      makeAuditEntry({
        sequenceNumber: 6,
        operationType: FileAuditOperationType.ShareLinkAccessed,
        actorId: 'user-3',
        ledgerEntryHash: new Uint8Array([6]),
      }),
      makeAuditEntry({
        sequenceNumber: 7,
        operationType: FileAuditOperationType.NonAccessProofGenerated,
        actorId: 'user-3',
        ledgerEntryHash: new Uint8Array([7]),
      }),
    ];

    it('should compute operation breakdown by type', async () => {
      mockRepo.queryEntries.mockResolvedValue(mixedEntries);

      const report = await service.generateComplianceReport({
        ...baseParams,
        includeDestructionEvents: true,
        includeSharingActivity: true,
        includeNonAccessProofs: true,
      });

      // Destruction events: FileDestroyed + DestructionScheduled = 2
      expect(report.destructionEvents).toHaveLength(2);
      // Sharing events: ShareCreated + ShareLinkAccessed = 2
      expect(report.sharingActivity).toHaveLength(2);
      // Non-access proofs: 1
      expect(report.nonAccessProofs).toHaveLength(1);
    });

    it('should compute access patterns per actor', async () => {
      mockRepo.queryEntries.mockResolvedValue(mixedEntries);

      const report = await service.generateComplianceReport({
        ...baseParams,
        includeAccessPatterns: true,
      });

      expect(report.accessPatterns).toBeDefined();
      // user-1: 3 ops (FileUploaded, FileDownloaded, ShareCreated)
      // user-2: 2 ops (FileDestroyed, DestructionScheduled)
      // user-3: 2 ops (ShareLinkAccessed, NonAccessProofGenerated)
      expect(report.accessPatterns).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ actorId: 'user-1', operationCount: 3 }),
          expect.objectContaining({ actorId: 'user-2', operationCount: 2 }),
          expect.objectContaining({ actorId: 'user-3', operationCount: 2 }),
        ]),
      );
    });

    it('should count destruction events correctly', async () => {
      mockRepo.queryEntries.mockResolvedValue(mixedEntries);

      const report = await service.generateComplianceReport({
        ...baseParams,
        includeDestructionEvents: true,
      });

      // FileDestroyed + DestructionScheduled = 2
      expect(report.destructionEvents).toHaveLength(2);
    });

    it('should count sharing events correctly', async () => {
      mockRepo.queryEntries.mockResolvedValue(mixedEntries);

      const report = await service.generateComplianceReport({
        ...baseParams,
        includeSharingActivity: true,
      });

      // ShareCreated + ShareLinkAccessed = 2
      expect(report.sharingActivity).toHaveLength(2);
    });

    it('should count non-access proofs correctly', async () => {
      mockRepo.queryEntries.mockResolvedValue(mixedEntries);

      const report = await service.generateComplianceReport({
        ...baseParams,
        includeNonAccessProofs: true,
      });

      expect(report.nonAccessProofs).toHaveLength(1);
    });

    it('should include access patterns when includeAccessPatterns is true', async () => {
      mockRepo.queryEntries.mockResolvedValue(mixedEntries);

      const report = await service.generateComplianceReport({
        ...baseParams,
        includeAccessPatterns: true,
      });

      expect(report.accessPatterns).toBeDefined();
      expect(report.accessPatterns!.length).toBeGreaterThan(0);
    });

    it('should exclude access patterns when includeAccessPatterns is false/undefined', async () => {
      mockRepo.queryEntries.mockResolvedValue(mixedEntries);

      const report = await service.generateComplianceReport({
        ...baseParams,
        includeAccessPatterns: false,
      });

      expect(report.accessPatterns).toBeUndefined();

      const report2 = await service.generateComplianceReport(baseParams);

      expect(report2.accessPatterns).toBeUndefined();
    });

    it('should generate Merkle proofs for all entries', async () => {
      mockRepo.queryEntries.mockResolvedValue(mixedEntries);

      const report = await service.generateComplianceReport(baseParams);

      expect(mockDeps.generateMerkleProof).toHaveBeenCalledTimes(
        mixedEntries.length,
      );
      expect(report.merkleProofs).toHaveLength(mixedEntries.length);
    });

    it('should return empty report for empty date range', async () => {
      mockRepo.queryEntries.mockResolvedValue([]);

      const report = await service.generateComplianceReport(baseParams);

      expect(report.merkleProofs).toEqual([]);
      expect(report.dateRange.from).toBe(baseParams.dateFrom.toISOString());
      expect(report.dateRange.to).toBe(baseParams.dateTo.toISOString());
    });
  });
});
