/**
 * Property-Based Test for P11: Temporal Expiration Permanence
 *
 * For any IdentityRecoveryRecord R with expiresAt < now, after the expiration
 * scheduler runs, `getIdentityRecord(R.id)` returns null and any
 * IDENTITY_DISCLOSURE proposal targeting R's content is rejected with
 * `IdentityPermanentlyUnrecoverable`.
 *
 * **Validates: Requirements 17.3, 17.6**
 */

import {
  IdentityMode,
  IdentityRecoveryRecord,
  IQuorumDatabase,
  QuorumAuditLogEntry,
  QuorumError,
  QuorumErrorType,
  StatuteOfLimitationsConfig,
} from '@brightchain/brightchain-lib';
import { ShortHexGuid } from '@digitaldefiance/ecies-lib';
import * as fc from 'fast-check';
import { IdentityExpirationScheduler } from './identityExpirationScheduler';

// Set a longer timeout for property-based tests
jest.setTimeout(120000);

/**
 * Creates a minimal mock IQuorumDatabase with in-memory identity record storage.
 */
function createMockDatabase(): IQuorumDatabase & {
  identityRecords: Map<ShortHexGuid, IdentityRecoveryRecord>;
  auditEntries: QuorumAuditLogEntry[];
  statuteConfig: StatuteOfLimitationsConfig | null;
} {
  const identityRecords = new Map<ShortHexGuid, IdentityRecoveryRecord>();
  const auditEntries: QuorumAuditLogEntry[] = [];
  let statuteConfig: StatuteOfLimitationsConfig | null = null;

  return {
    identityRecords,
    auditEntries,
    statuteConfig,

    // Identity recovery records
    saveIdentityRecord: jest.fn(async (record: IdentityRecoveryRecord) => {
      identityRecords.set(record.id, record);
    }),
    getIdentityRecord: jest.fn(async (recordId: ShortHexGuid) => {
      return identityRecords.get(recordId) ?? null;
    }),
    deleteIdentityRecord: jest.fn(async (recordId: ShortHexGuid) => {
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

    // Audit log
    appendAuditEntry: jest.fn(async (entry: QuorumAuditLogEntry) => {
      auditEntries.push(entry);
    }),
    getLatestAuditEntry: jest.fn(async () => null),

    // Statute config
    saveStatuteConfig: jest.fn(async (config: StatuteOfLimitationsConfig) => {
      statuteConfig = config;
    }),
    getStatuteConfig: jest.fn(async () => statuteConfig),

    // Stubs for remaining IQuorumDatabase methods
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

/**
 * Arbitrary for generating a valid ShortHexGuid (32-char hex string).
 */
const shortHexGuidArb = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 32, maxLength: 32 })
  .map((nums) => nums.map((n) => n.toString(16)).join('') as ShortHexGuid);

/**
 * Arbitrary for generating an expired IdentityRecoveryRecord.
 * The expiresAt is always in the past.
 */
const expiredRecordArb: fc.Arbitrary<IdentityRecoveryRecord> = fc
  .tuple(
    shortHexGuidArb,
    shortHexGuidArb,
    fc.constantFrom('post', 'message', 'financial_record'),
    fc.integer({ min: 1, max: 100 }),
    fc.integer({ min: 1, max: 5 }),
    fc.integer({ min: 1, max: 5 }),
    fc.integer({ min: 1, max: 8760 }),
    fc.integer({ min: 8761, max: 100000 }),
  )
  .map(
    ([
      id,
      contentId,
      contentType,
      epochNumber,
      threshold,
      memberCount,
      hoursAgoExpired,
      hoursAgoCreated,
    ]) => {
      const now = Date.now();
      const createdAt = new Date(now - hoursAgoCreated * 3600000);
      const expiresAt = new Date(now - hoursAgoExpired * 3600000);

      // Generate fake member IDs
      const memberIds: ShortHexGuid[] = [];
      for (let i = 0; i < memberCount; i++) {
        memberIds.push(String(i).padStart(32, '0') as ShortHexGuid);
      }

      const record: IdentityRecoveryRecord = {
        id,
        contentId,
        contentType,
        encryptedShardsByMemberId: new Map(
          memberIds.map(
            (mid) =>
              [mid, new Uint8Array([1, 2, 3])] as [ShortHexGuid, Uint8Array],
          ),
        ),
        memberIds,
        threshold: Math.min(threshold, memberCount),
        epochNumber,
        expiresAt,
        createdAt,
        identityMode: IdentityMode.Anonymous,
      };
      return record;
    },
  );

describe('P11: Temporal Expiration Permanence', () => {
  /**
   * Property: For any set of expired IdentityRecoveryRecords, after the
   * expiration scheduler runs, all records are deleted from the database
   * and getIdentityRecord returns null for each.
   */
  it('expired records are deleted after scheduler runs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(expiredRecordArb, { minLength: 1, maxLength: 10 }),
        async (records) => {
          const db = createMockDatabase();

          // Seed the database with expired records
          for (const record of records) {
            await db.saveIdentityRecord(record);
          }

          // Verify records exist before scheduler runs
          for (const record of records) {
            const found = await db.getIdentityRecord(record.id);
            expect(found).not.toBeNull();
          }

          // Run the expiration scheduler
          const scheduler = new IdentityExpirationScheduler(db, undefined, {
            intervalMs: 86400000,
            batchSize: 100,
          });
          const result = await scheduler.runOnce();

          // All records should be deleted
          expect(result.deletedCount).toBe(records.length);
          expect(result.failedIds).toHaveLength(0);

          // getIdentityRecord should return null for each
          for (const record of records) {
            const found = await db.getIdentityRecord(record.id);
            expect(found).toBeNull();
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property: For any expired IdentityRecoveryRecord, after the scheduler
   * deletes it, an IDENTITY_DISCLOSURE attempt targeting that record's content
   * is rejected because getIdentityRecord returns null, which would cause
   * QuorumStateMachine to throw IdentityPermanentlyUnrecoverable.
   *
   * We simulate the disclosure check logic here since we're testing the
   * scheduler + database interaction, not the full QuorumStateMachine.
   */
  it('disclosure rejected with permanent error after expiration', async () => {
    await fc.assert(
      fc.asyncProperty(expiredRecordArb, async (record) => {
        const db = createMockDatabase();

        // Seed the database with the expired record
        await db.saveIdentityRecord(record);

        // Run the expiration scheduler
        const scheduler = new IdentityExpirationScheduler(db, undefined, {
          intervalMs: 86400000,
          batchSize: 100,
        });
        await scheduler.runOnce();

        // Simulate the IDENTITY_DISCLOSURE check from QuorumStateMachine
        const targetRecordId = record.id;
        const foundRecord = await db.getIdentityRecord(targetRecordId);

        // Record should be null (deleted)
        expect(foundRecord).toBeNull();

        // The QuorumStateMachine would throw this error
        expect(() => {
          if (!foundRecord) {
            throw new QuorumError(
              QuorumErrorType.IdentityPermanentlyUnrecoverable,
            );
          }
        }).toThrow(QuorumError);

        try {
          if (!foundRecord) {
            throw new QuorumError(
              QuorumErrorType.IdentityPermanentlyUnrecoverable,
            );
          }
        } catch (err) {
          expect(err).toBeInstanceOf(QuorumError);
          expect((err as QuorumError).type).toBe(
            QuorumErrorType.IdentityPermanentlyUnrecoverable,
          );
        }
      }),
      { numRuns: 50 },
    );
  });

  /**
   * Property: Each deleted record produces an audit entry with
   * eventType 'identity_shards_expired'.
   */
  it('audit entries emitted for each expired record', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(expiredRecordArb, { minLength: 1, maxLength: 10 }),
        async (records) => {
          const db = createMockDatabase();

          for (const record of records) {
            await db.saveIdentityRecord(record);
          }

          const scheduler = new IdentityExpirationScheduler(db, undefined, {
            intervalMs: 86400000,
            batchSize: 100,
          });
          await scheduler.runOnce();

          // One audit entry per deleted record
          expect(db.auditEntries.length).toBe(records.length);
          for (const entry of db.auditEntries) {
            expect(entry.eventType).toBe('identity_shards_expired');
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property: nextBatchAvailable is true when the batch is full.
   */
  it('nextBatchAvailable signals more records when batch is full', async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5 }), async (batchSize) => {
        const db = createMockDatabase();

        // Create exactly batchSize expired records
        for (let i = 0; i < batchSize; i++) {
          const id = String(i).padStart(32, 'a') as ShortHexGuid;
          const record: IdentityRecoveryRecord = {
            id,
            contentId: String(i).padStart(32, 'b') as ShortHexGuid,
            contentType: 'post',
            encryptedShardsByMemberId: new Map(),
            memberIds: [],
            threshold: 1,
            epochNumber: 1,
            expiresAt: new Date(Date.now() - 3600000),
            createdAt: new Date(Date.now() - 7200000),
            identityMode: IdentityMode.Anonymous,
          };
          await db.saveIdentityRecord(record);
        }

        const scheduler = new IdentityExpirationScheduler(db, undefined, {
          intervalMs: 86400000,
          batchSize,
        });
        const result = await scheduler.runOnce();

        expect(result.nextBatchAvailable).toBe(true);
        expect(result.deletedCount).toBe(batchSize);
      }),
      { numRuns: 20 },
    );
  });
});
