/**
 * Unit tests for IdentityExpirationScheduler.
 *
 * Tests:
 * - runOnce with expired records
 * - runOnce with no expired records
 * - batch continuation (nextBatchAvailable)
 * - start/stop lifecycle
 * - config loading (statute of limitations)
 * - computeExpirationDate with per-content-type durations
 * - failure handling (failedIds)
 */

import {
  DEFAULT_STATUTE_FALLBACK_DURATION_MS,
  IdentityMode,
  IdentityRecoveryRecord,
  IQuorumDatabase,
  QuorumAuditLogEntry,
  StatuteOfLimitationsConfig,
} from '@brightchain/brightchain-lib';
import { ShortHexGuid } from '@digitaldefiance/ecies-lib';
import { IdentityExpirationScheduler } from './identityExpirationScheduler';

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeShortHexGuid(suffix: string): ShortHexGuid {
  return suffix.padStart(32, '0') as ShortHexGuid;
}

function makeExpiredRecord(
  id: string,
  contentType = 'post',
  hoursAgoExpired = 24,
): IdentityRecoveryRecord {
  const now = Date.now();
  return {
    id: makeShortHexGuid(id),
    contentId: makeShortHexGuid(`content-${id}`),
    contentType,
    encryptedShardsByMemberId: new Map([
      [makeShortHexGuid('member1'), new Uint8Array([1, 2, 3])],
    ]),
    memberIds: [makeShortHexGuid('member1')],
    threshold: 1,
    epochNumber: 1,
    expiresAt: new Date(now - hoursAgoExpired * 3600000),
    createdAt: new Date(now - 2 * hoursAgoExpired * 3600000),
    identityMode: IdentityMode.Anonymous,
  };
}

function makeNonExpiredRecord(id: string): IdentityRecoveryRecord {
  const now = Date.now();
  return {
    id: makeShortHexGuid(id),
    contentId: makeShortHexGuid(`content-${id}`),
    contentType: 'post',
    encryptedShardsByMemberId: new Map([
      [makeShortHexGuid('member1'), new Uint8Array([1, 2, 3])],
    ]),
    memberIds: [makeShortHexGuid('member1')],
    threshold: 1,
    epochNumber: 1,
    expiresAt: new Date(now + 365 * 24 * 3600000), // 1 year in the future
    createdAt: new Date(now),
    identityMode: IdentityMode.Real,
  };
}

/**
 * Creates a mock IQuorumDatabase with in-memory identity record storage.
 */
function createMockDatabase(options?: {
  failOnDelete?: Set<ShortHexGuid>;
}): IQuorumDatabase & {
  identityRecords: Map<ShortHexGuid, IdentityRecoveryRecord>;
  auditEntries: QuorumAuditLogEntry[];
  statuteConfig: StatuteOfLimitationsConfig | null;
} {
  const identityRecords = new Map<ShortHexGuid, IdentityRecoveryRecord>();
  const auditEntries: QuorumAuditLogEntry[] = [];
  let statuteConfig: StatuteOfLimitationsConfig | null = null;
  const failOnDelete = options?.failOnDelete ?? new Set<ShortHexGuid>();

  return {
    identityRecords,
    auditEntries,
    statuteConfig,

    saveIdentityRecord: jest.fn(async (record: IdentityRecoveryRecord) => {
      identityRecords.set(record.id, record);
    }),
    getIdentityRecord: jest.fn(async (recordId: ShortHexGuid) => {
      return identityRecords.get(recordId) ?? null;
    }),
    deleteIdentityRecord: jest.fn(async (recordId: ShortHexGuid) => {
      if (failOnDelete.has(recordId)) {
        throw new Error(`Simulated delete failure for ${recordId}`);
      }
      identityRecords.delete(recordId);
    }),
    listExpiredIdentityRecords: jest.fn(
      async (before: Date, _page: number, pageSize: number) => {
        const expired: IdentityRecoveryRecord[] = [];
        for (const record of identityRecords.values()) {
          if (record.expiresAt < before) {
            expired.push(record);
            if (expired.length >= pageSize) break;
          }
        }
        return expired;
      },
    ),

    appendAuditEntry: jest.fn(async (entry: QuorumAuditLogEntry) => {
      auditEntries.push(entry);
    }),
    getLatestAuditEntry: jest.fn(async () => null),

    saveStatuteConfig: jest.fn(async (config: StatuteOfLimitationsConfig) => {
      statuteConfig = config;
    }),
    getStatuteConfig: jest.fn(async () => statuteConfig),

    // Stubs
    saveEpoch: jest.fn(async () => {}),
    getEpoch: jest.fn(async () => null),
    getCurrentEpoch: jest.fn(async () => {
      throw new Error('No epochs');
    }),
    saveMember: jest.fn(async () => {}),
    getMember: jest.fn(async () => null),
    listActiveMembers: jest.fn(async () => []),
    saveDocument: jest.fn(async () => {}),
    getDocument: jest.fn(async () => null),
    listDocumentsByEpoch: jest.fn(async () => []),
    saveProposal: jest.fn(async () => {}),
    getProposal: jest.fn(async () => null),
    saveVote: jest.fn(async () => {}),
    getVotesForProposal: jest.fn(async () => []),
    saveAlias: jest.fn(async () => {}),
    getAlias: jest.fn(async () => null),
    isAliasAvailable: jest.fn(async () => true),
    saveJournalEntry: jest.fn(async () => {}),
    getJournalEntries: jest.fn(async () => []),
    deleteJournalEntries: jest.fn(async () => {}),
    saveOperationalState: jest.fn(async () => {}),
    getOperationalState: jest.fn(async () => null),
    withTransaction: jest.fn(async <R>(fn: () => Promise<R>) => fn()),
    isAvailable: jest.fn(async () => true),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('IdentityExpirationScheduler', () => {
  describe('runOnce', () => {
    it('should delete expired records and return correct count', async () => {
      const db = createMockDatabase();
      const r1 = makeExpiredRecord('1');
      const r2 = makeExpiredRecord('2');
      await db.saveIdentityRecord(r1);
      await db.saveIdentityRecord(r2);

      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });
      const result = await scheduler.runOnce();

      expect(result.deletedCount).toBe(2);
      expect(result.failedIds).toHaveLength(0);
      expect(result.nextBatchAvailable).toBe(false);

      // Records should be gone
      expect(await db.getIdentityRecord(r1.id)).toBeNull();
      expect(await db.getIdentityRecord(r2.id)).toBeNull();
    });

    it('should return zero counts when no expired records exist', async () => {
      const db = createMockDatabase();
      const r1 = makeNonExpiredRecord('1');
      await db.saveIdentityRecord(r1);

      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });
      const result = await scheduler.runOnce();

      expect(result.deletedCount).toBe(0);
      expect(result.failedIds).toHaveLength(0);
      expect(result.nextBatchAvailable).toBe(false);

      // Non-expired record should still exist
      expect(await db.getIdentityRecord(r1.id)).not.toBeNull();
    });

    it('should emit identity_shards_expired audit entry for each deleted record', async () => {
      const db = createMockDatabase();
      const r1 = makeExpiredRecord('1');
      const r2 = makeExpiredRecord('2');
      await db.saveIdentityRecord(r1);
      await db.saveIdentityRecord(r2);

      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });
      await scheduler.runOnce();

      expect(db.auditEntries).toHaveLength(2);
      for (const entry of db.auditEntries) {
        expect(entry.eventType).toBe('identity_shards_expired');
        expect(entry.details).toHaveProperty('identityRecordId');
        expect(entry.details).toHaveProperty('contentId');
        expect(entry.details).toHaveProperty('contentType');
      }
    });

    it('should report failedIds when deletion fails', async () => {
      const failId = makeShortHexGuid('fail1');
      const db = createMockDatabase({ failOnDelete: new Set([failId]) });

      const r1 = makeExpiredRecord('1');
      const rFail: IdentityRecoveryRecord = {
        ...makeExpiredRecord('fail1'),
        id: failId,
      };
      await db.saveIdentityRecord(r1);
      await db.saveIdentityRecord(rFail);

      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });
      const result = await scheduler.runOnce();

      // One succeeded, one failed
      expect(result.deletedCount).toBe(1);
      expect(result.failedIds).toContain(failId);
    });
  });

  describe('batch continuation (nextBatchAvailable)', () => {
    it('should set nextBatchAvailable=true when batch is full', async () => {
      const db = createMockDatabase();
      // Create exactly batchSize records
      const batchSize = 3;
      for (let i = 0; i < batchSize; i++) {
        await db.saveIdentityRecord(makeExpiredRecord(`batch-${i}`));
      }

      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize,
      });
      const result = await scheduler.runOnce();

      expect(result.deletedCount).toBe(batchSize);
      expect(result.nextBatchAvailable).toBe(true);
    });

    it('should set nextBatchAvailable=false when batch is not full', async () => {
      const db = createMockDatabase();
      const batchSize = 5;
      // Create fewer than batchSize records
      for (let i = 0; i < 3; i++) {
        await db.saveIdentityRecord(makeExpiredRecord(`partial-${i}`));
      }

      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize,
      });
      const result = await scheduler.runOnce();

      expect(result.deletedCount).toBe(3);
      expect(result.nextBatchAvailable).toBe(false);
    });
  });

  describe('start/stop lifecycle', () => {
    it('should start and stop without errors', () => {
      const db = createMockDatabase();
      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });

      expect(scheduler.isRunning).toBe(false);

      scheduler.start();
      expect(scheduler.isRunning).toBe(true);

      scheduler.stop();
      expect(scheduler.isRunning).toBe(false);
    });

    it('should be idempotent on start (no error on double start)', () => {
      const db = createMockDatabase();
      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });

      scheduler.start();
      // Second start should not throw
      expect(() => scheduler.start()).not.toThrow();
      expect(scheduler.isRunning).toBe(true);

      scheduler.stop();
    });

    it('should be safe to stop when not running', () => {
      const db = createMockDatabase();
      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });

      expect(() => scheduler.stop()).not.toThrow();
      expect(scheduler.isRunning).toBe(false);
    });

    it('should use default config when none provided', () => {
      const db = createMockDatabase();
      const scheduler = new IdentityExpirationScheduler(db);

      // Should not throw — defaults are applied internally
      expect(scheduler.isRunning).toBe(false);
    });
  });

  describe('config loading', () => {
    it('should load statute config from database', async () => {
      const db = createMockDatabase();
      const config: StatuteOfLimitationsConfig = {
        defaultDurations: new Map([
          ['post', 365 * 24 * 3600000],
          ['financial_record', 10 * 365 * 24 * 3600000],
        ]),
        fallbackDurationMs: 7 * 365.25 * 24 * 3600000,
      };
      await db.saveStatuteConfig(config);

      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });
      const loaded = await scheduler.loadStatuteConfig();

      expect(loaded.defaultDurations.get('post')).toBe(365 * 24 * 3600000);
      expect(loaded.defaultDurations.get('financial_record')).toBe(
        10 * 365 * 24 * 3600000,
      );
      expect(loaded.fallbackDurationMs).toBe(7 * 365.25 * 24 * 3600000);
    });

    it('should return default config when none stored', async () => {
      const db = createMockDatabase();
      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });
      const loaded = await scheduler.loadStatuteConfig();

      expect(loaded.defaultDurations.size).toBe(0);
      expect(loaded.fallbackDurationMs).toBe(
        DEFAULT_STATUTE_FALLBACK_DURATION_MS,
      );
    });

    it('should compute expiration date using content-type duration', async () => {
      const db = createMockDatabase();
      const oneYearMs = 365 * 24 * 3600000;
      const config: StatuteOfLimitationsConfig = {
        defaultDurations: new Map([['post', oneYearMs]]),
        fallbackDurationMs: DEFAULT_STATUTE_FALLBACK_DURATION_MS,
      };
      await db.saveStatuteConfig(config);

      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const expiresAt = await scheduler.computeExpirationDate(
        'post',
        createdAt,
      );

      expect(expiresAt.getTime()).toBe(createdAt.getTime() + oneYearMs);
    });

    it('should use fallback duration for unknown content types', async () => {
      const db = createMockDatabase();
      const config: StatuteOfLimitationsConfig = {
        defaultDurations: new Map([['post', 365 * 24 * 3600000]]),
        fallbackDurationMs: DEFAULT_STATUTE_FALLBACK_DURATION_MS,
      };
      await db.saveStatuteConfig(config);

      const scheduler = new IdentityExpirationScheduler(db, undefined, {
        intervalMs: 86400000,
        batchSize: 100,
      });
      const createdAt = new Date('2024-01-01T00:00:00Z');
      const expiresAt = await scheduler.computeExpirationDate(
        'unknown_type',
        createdAt,
      );

      expect(expiresAt.getTime()).toBe(
        createdAt.getTime() + DEFAULT_STATUTE_FALLBACK_DURATION_MS,
      );
    });
  });
});
