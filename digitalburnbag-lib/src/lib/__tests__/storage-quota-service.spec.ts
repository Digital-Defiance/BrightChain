import { QuotaNotFoundError } from '../errors';
import type { IFileVersionBase } from '../interfaces/bases/file-version';
import type { IStorageQuotaBase } from '../interfaces/bases/storage-quota';
import type { IStorageQuotaRepository } from '../interfaces/services/storage-quota-repository';
import { StorageQuotaService } from '../services/storage-quota-service';

/**
 * In-memory repository for testing StorageQuotaService.
 * Uses string as TID for simplicity.
 */
class InMemoryQuotaRepository implements IStorageQuotaRepository<string> {
  public quotas = new Map<string, IStorageQuotaBase<string>>();
  public fileVersions: IFileVersionBase<string>[] = [];

  async getQuota(userId: string): Promise<IStorageQuotaBase<string> | null> {
    return this.quotas.get(userId) ?? null;
  }

  async upsertQuota(quota: IStorageQuotaBase<string>): Promise<void> {
    this.quotas.set(quota.userId, { ...quota });
  }

  async getNonDeletedFileVersions(
    userId: string,
  ): Promise<IFileVersionBase<string>[]> {
    return this.fileVersions.filter((v) => v.uploaderId === userId);
  }
}

function makeVersion(
  id: string,
  uploaderId: string,
  sizeBytes: number,
): IFileVersionBase<string> {
  return {
    id,
    fileId: `file-${id}`,
    versionNumber: 1,
    sizeBytes,
    vaultCreationLedgerEntryHash: new Uint8Array(64),
    vaultState: 'sealed',
    uploaderId,
    createdAt: new Date().toISOString(),
  };
}

describe('StorageQuotaService', () => {
  let repo: InMemoryQuotaRepository;
  let service: StorageQuotaService<string>;
  const adminId = 'admin-1';
  const userId = 'user-1';

  /** Default: adminId is admin, everyone else is not */
  const isAdmin = async (id: string) => id === adminId;

  beforeEach(() => {
    repo = new InMemoryQuotaRepository();
    service = new StorageQuotaService(repo, isAdmin);
  });

  describe('checkQuota', () => {
    it('allows upload when within quota', async () => {
      // Pre-seed a quota with 1 GB limit and 0 usage
      repo.quotas.set(userId, {
        userId,
        quotaBytes: 1_073_741_824,
        usedBytes: 0,
        updatedAt: new Date().toISOString(),
      });

      const result = await service.checkQuota(userId, 500);
      expect(result.allowed).toBe(true);
      expect(result.currentUsageBytes).toBe(0);
      expect(result.quotaBytes).toBe(1_073_741_824);
      expect(result.remainingBytes).toBe(1_073_741_824);
    });

    it('rejects upload when it would exceed quota', async () => {
      repo.quotas.set(userId, {
        userId,
        quotaBytes: 1000,
        usedBytes: 900,
        updatedAt: new Date().toISOString(),
      });

      const result = await service.checkQuota(userId, 200);
      expect(result.allowed).toBe(false);
      expect(result.currentUsageBytes).toBe(900);
      expect(result.remainingBytes).toBe(100);
    });

    it('allows upload that exactly fills quota', async () => {
      repo.quotas.set(userId, {
        userId,
        quotaBytes: 1000,
        usedBytes: 500,
        updatedAt: new Date().toISOString(),
      });

      const result = await service.checkQuota(userId, 500);
      expect(result.allowed).toBe(true);
    });

    it('creates default quota for new user', async () => {
      const result = await service.checkQuota(userId, 100);
      expect(result.allowed).toBe(true);
      // Default is 10 GB
      expect(result.quotaBytes).toBe(10 * 1024 * 1024 * 1024);
      expect(result.currentUsageBytes).toBe(0);
      // Verify it was persisted
      expect(repo.quotas.has(userId)).toBe(true);
    });
  });

  describe('getUsage', () => {
    it('returns current usage and quota', async () => {
      repo.quotas.set(userId, {
        userId,
        quotaBytes: 2000,
        usedBytes: 500,
        updatedAt: new Date().toISOString(),
      });

      const usage = await service.getUsage(userId);
      expect(usage.usedBytes).toBe(500);
      expect(usage.quotaBytes).toBe(2000);
      expect(usage.percentUsed).toBe(25);
    });

    it('returns 0% for empty usage', async () => {
      repo.quotas.set(userId, {
        userId,
        quotaBytes: 1000,
        usedBytes: 0,
        updatedAt: new Date().toISOString(),
      });

      const usage = await service.getUsage(userId);
      expect(usage.percentUsed).toBe(0);
    });

    it('creates default quota for unknown user', async () => {
      const usage = await service.getUsage('unknown-user');
      expect(usage.usedBytes).toBe(0);
      expect(usage.quotaBytes).toBe(10 * 1024 * 1024 * 1024);
      expect(usage.percentUsed).toBe(0);
    });
  });

  describe('setQuota', () => {
    it('allows admin to set quota', async () => {
      await service.setQuota(userId, 5000, adminId);

      const stored = repo.quotas.get(userId);
      expect(stored).toBeDefined();
      expect(stored!.quotaBytes).toBe(5000);
    });

    it('applies new quota immediately to subsequent checks', async () => {
      // Start with default quota
      await service.getUsage(userId);

      // Admin sets a small quota
      await service.setQuota(userId, 100, adminId);

      // Now a 200-byte upload should be rejected
      const result = await service.checkQuota(userId, 200);
      expect(result.allowed).toBe(false);
      expect(result.quotaBytes).toBe(100);
    });

    it('rejects non-admin quota update', async () => {
      await expect(
        service.setQuota(userId, 5000, 'non-admin-user'),
      ).rejects.toThrow(QuotaNotFoundError);
    });

    it('preserves existing usage when updating quota', async () => {
      repo.quotas.set(userId, {
        userId,
        quotaBytes: 1000,
        usedBytes: 750,
        updatedAt: new Date().toISOString(),
      });

      await service.setQuota(userId, 2000, adminId);

      const stored = repo.quotas.get(userId);
      expect(stored!.quotaBytes).toBe(2000);
      expect(stored!.usedBytes).toBe(750);
    });
  });

  describe('recalculateUsage', () => {
    it('sums all non-deleted file version sizes', async () => {
      repo.quotas.set(userId, {
        userId,
        quotaBytes: 10000,
        usedBytes: 999, // stale value
        updatedAt: new Date().toISOString(),
      });

      repo.fileVersions = [
        makeVersion('v1', userId, 100),
        makeVersion('v2', userId, 250),
        makeVersion('v3', userId, 650),
      ];

      const usage = await service.recalculateUsage(userId);
      expect(usage.usedBytes).toBe(1000);
      expect(usage.quotaBytes).toBe(10000);
      expect(usage.percentUsed).toBe(10);
    });

    it('returns zero when user has no files', async () => {
      repo.quotas.set(userId, {
        userId,
        quotaBytes: 5000,
        usedBytes: 500, // stale
        updatedAt: new Date().toISOString(),
      });

      repo.fileVersions = [];

      const usage = await service.recalculateUsage(userId);
      expect(usage.usedBytes).toBe(0);
    });

    it('only counts versions belonging to the user', async () => {
      repo.quotas.set(userId, {
        userId,
        quotaBytes: 10000,
        usedBytes: 0,
        updatedAt: new Date().toISOString(),
      });

      repo.fileVersions = [
        makeVersion('v1', userId, 300),
        makeVersion('v2', 'other-user', 700),
        makeVersion('v3', userId, 200),
      ];

      const usage = await service.recalculateUsage(userId);
      expect(usage.usedBytes).toBe(500);
    });

    it('persists recalculated usage', async () => {
      repo.quotas.set(userId, {
        userId,
        quotaBytes: 10000,
        usedBytes: 0,
        updatedAt: new Date().toISOString(),
      });

      repo.fileVersions = [makeVersion('v1', userId, 400)];

      await service.recalculateUsage(userId);

      const stored = repo.quotas.get(userId);
      expect(stored!.usedBytes).toBe(400);
    });
  });
});
