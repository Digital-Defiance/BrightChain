/**
 * Seed Runner – Property-Based Tests
 *
 * Feature: org-role-dev-seeding
 *
 * Validates ConsoleSeedLogger output formatting and idempotent
 * upsert behavior of seedOrgRoles.
 */

import * as fc from 'fast-check';
import {
  ConsoleSeedLogger,
  seedOrgRoles,
  type SeedResult,
} from './orgRoleSeedRunner';
import {
  SEED_ORGANIZATIONS,
  SEED_HEALTHCARE_ROLES,
  SEED_INVITATIONS,
} from './orgRoleSeedData';
import type { BrightDb } from '@brightchain/db';

// ── Property 4: Summary log contains correct counts ─────────────

describe('Feature: org-role-dev-seeding, Property 4: Summary log contains correct counts', () => {
  /**
   * **Validates: Requirements 1.3, 7.3**
   *
   * For any combination of inserted/skipped counts across the three
   * collections, the summary log message SHALL contain the exact
   * inserted and skipped counts for organizations, healthcare roles,
   * and invitations.
   */

  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('summary output contains exact inserted/skipped counts for all three collections', () => {
    const logger = new ConsoleSeedLogger();

    fc.assert(
      fc.property(
        fc.nat(1000),
        fc.nat(1000),
        fc.nat(1000),
        fc.nat(1000),
        fc.nat(1000),
        fc.nat(1000),
        (orgIns, orgSkip, roleIns, roleSkip, invIns, invSkip) => {
          logSpy.mockClear();

          const result: SeedResult = {
            organizations: { inserted: orgIns, skipped: orgSkip },
            healthcareRoles: { inserted: roleIns, skipped: roleSkip },
            invitations: { inserted: invIns, skipped: invSkip },
          };

          logger.summary(result);

          expect(logSpy).toHaveBeenCalledTimes(1);
          const output = logSpy.mock.calls[0][0] as string;

          // Verify each count appears in the output
          expect(output).toContain(`organizations ${orgIns} inserted / ${orgSkip} skipped`);
          expect(output).toContain(`healthcareRoles ${roleIns} inserted / ${roleSkip} skipped`);
          expect(output).toContain(`invitations ${invIns} inserted / ${invSkip} skipped`);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ── Property 5: Operation log contains record identifier and action ──

describe('Feature: org-role-dev-seeding, Property 5: Operation log contains record identifier and action', () => {
  /**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any seed record and any operation outcome (inserted or skipped),
   * the corresponding log message SHALL contain the record's _id value.
   * For insert operations, the log SHALL additionally contain the
   * collection name and a human-readable label.
   */

  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  it('inserted() log contains the record _id, collection name, and label', () => {
    const logger = new ConsoleSeedLogger();

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.string({ minLength: 1, maxLength: 64 }),
        (id, collection, label) => {
          logSpy.mockClear();

          logger.inserted(collection, id, label);

          expect(logSpy).toHaveBeenCalledTimes(1);
          const output = logSpy.mock.calls[0][0] as string;

          expect(output).toContain(id);
          expect(output).toContain(collection);
          expect(output).toContain(label);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('skipped() log contains the record _id', () => {
    const logger = new ConsoleSeedLogger();

    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 64 }),
        fc.string({ minLength: 1, maxLength: 64 }),
        (id, collection) => {
          logSpy.mockClear();

          logger.skipped(collection, id);

          expect(logSpy).toHaveBeenCalledTimes(1);
          const output = logSpy.mock.calls[0][0] as string;

          expect(output).toContain(id);
        },
      ),
      { numRuns: 100 },
    );
  });
});


// ── Property 2: Idempotent upsert preserves existing data ───────

describe('Feature: org-role-dev-seeding, Property 2: Idempotent upsert preserves existing data', () => {
  /**
   * **Validates: Requirements 2.3, 3.3, 4.4, 5.1, 5.2**
   *
   * For any subset of seed records pre-inserted into the database,
   * running the seed runner SHALL insert only the records whose _id
   * is not already present, skip all records whose _id already exists,
   * and leave the pre-existing records completely unchanged. The total
   * count of inserted + skipped records SHALL equal the total number
   * of seed records (7).
   */

  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  // Collect all seed record IDs in seeding order
  const ALL_SEED_IDS: string[] = [
    ...SEED_ORGANIZATIONS.map((o) => o._id),
    ...SEED_HEALTHCARE_ROLES.map((r) => r._id),
    ...SEED_INVITATIONS.map((i) => i._id),
  ];

  const TOTAL_SEED_COUNT = ALL_SEED_IDS.length; // 3 orgs + 3 roles + 1 invitation = 7

  it('only missing records get insertOne called; pre-existing are untouched; inserted + skipped = 7', () => {
    fc.assert(
      fc.asyncProperty(
        fc.subarray(ALL_SEED_IDS, { minLength: 0, maxLength: ALL_SEED_IDS.length }),
        async (preExistingIds) => {
          const preExistingSet = new Set(preExistingIds);
          const insertedIds: string[] = [];

          const mockCollection = () => ({
            findOne: jest.fn(async (filter: { _id: string }) =>
              preExistingSet.has(filter._id) ? { _id: filter._id } : null,
            ),
            insertOne: jest.fn(async (doc: Record<string, unknown>) => {
              insertedIds.push(doc._id as string);
            }),
          });

          const mockDb = {
            collection: jest.fn(() => mockCollection()),
          } as unknown as BrightDb;

          const silentLogger = {
            inserted: jest.fn(),
            skipped: jest.fn(),
            summary: jest.fn(),
            error: jest.fn(),
          };

          const result = await seedOrgRoles(mockDb, silentLogger);

          // 1. Only missing records get insertOne called
          for (const id of insertedIds) {
            expect(preExistingSet.has(id)).toBe(false);
          }

          // 2. Pre-existing records are NOT inserted
          for (const id of preExistingIds) {
            expect(insertedIds).not.toContain(id);
          }

          // 3. inserted + skipped = total seed count (7)
          const totalInserted =
            result.organizations.inserted +
            result.healthcareRoles.inserted +
            result.invitations.inserted;
          const totalSkipped =
            result.organizations.skipped +
            result.healthcareRoles.skipped +
            result.invitations.skipped;

          expect(totalInserted + totalSkipped).toBe(TOTAL_SEED_COUNT);
          expect(insertedIds.length).toBe(totalInserted);
        },
      ),
      { numRuns: 100 },
    );
  });
});
