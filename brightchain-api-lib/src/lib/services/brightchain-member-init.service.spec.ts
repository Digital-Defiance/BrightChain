/**
 * @fileoverview Unit tests for BrightChainMemberInitService — tasks 5.1–5.7.
 *
 * Tests cover:
 *  - Getter guard tests (db/memberCblIndex throw before initialize)
 *  - Store selection and connect behaviour
 *  - Property 1: Persistence round-trip
 *  - Property 2: Schema validation rejects invalid documents atomically
 *  - Property 3: Idempotency
 *  - Property 4: Transaction atomicity on insert failure
 *  - Property 5: Accurate result counts
 *
 * All tests use in-memory stores — no disk I/O (except the PersistentHeadRegistry test).
 */

import {
  IBrightChainMemberInitInput,
  IMemberIndexDocument,
  initializeBrightChain,
  MemberStatusType,
  resetInitialization,
} from '@brightchain/brightchain-lib';
import { BrightChainDb } from '@brightchain/db';
import { MemberType } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { mkdtempSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { BrightChainApiStrings } from '../enumerations/brightChainApiStrings';
import { MemberIndexSchemaValidationError } from '../errors/memberIndexSchemaValidationError';
import {
  BrightChainMemberInitService,
  IBrightChainMemberInitConfig,
} from './brightchain-member-init.service';

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_POOL = 'TestPool';
const SYSTEM_ID = 'a0b1c2d3';
const ADMIN_ID = 'e4f5a6b7';
const MEMBER_ID = 'c8d9e0f1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeService(): BrightChainMemberInitService {
  return new BrightChainMemberInitService();
}

function makeConfig(
  overrides: Partial<IBrightChainMemberInitConfig> = {},
): IBrightChainMemberInitConfig {
  return { memberPoolName: VALID_POOL, useMemoryStore: true, ...overrides };
}

function makeInput(
  systemId = SYSTEM_ID,
  adminId = ADMIN_ID,
  memberId = MEMBER_ID,
): IBrightChainMemberInitInput {
  return {
    systemUser: { id: systemId, type: MemberType.System },
    adminUser: { id: adminId, type: MemberType.User },
    memberUser: { id: memberId, type: MemberType.User },
  };
}

/**
 * fast-check arbitrary for a valid ShortHexGuid (exactly 8 lowercase hex chars).
 */
const shortHexGuidArb: fc.Arbitrary<string> = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 8, maxLength: 8 })
  .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * fast-check arbitrary for a set of 3 unique ShortHexGuid IDs.
 */
const uniqueTripleIdArb: fc.Arbitrary<{
  sysId: string;
  admId: string;
  memId: string;
}> = fc
  .tuple(shortHexGuidArb, shortHexGuidArb, shortHexGuidArb)
  .filter(([a, b, c]) => a !== b && b !== c && a !== c)
  .map(([sysId, admId, memId]) => ({ sysId, admId, memId }));

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('BrightChainMemberInitService — unit', () => {
  beforeAll(() => {
    initializeBrightChain();
  });

  afterAll(() => {
    resetInitialization();
  });

  // ── 5.1 / 5.2: Getter guards and store selection ───────────────────────────

  describe('getter guards', () => {
    it('db getter throws before initialize()', () => {
      const service = makeService();
      expect(() => service.db).toThrow(
        BrightChainApiStrings.BrightChainMemberInitServiceNotInitialized,
      );
    });

    it('memberCblIndex getter throws before initialize()', () => {
      const service = makeService();
      expect(() => service.memberCblIndex).toThrow(
        BrightChainApiStrings.BrightChainMemberInitServiceNotInitialized,
      );
    });
  });

  describe('store selection and connect', () => {
    it('db.isConnected() is true after initialize()', async () => {
      const service = makeService();
      await service.initialize(makeConfig(), makeInput());
      expect(service.db.isConnected()).toBe(true);
    });

    it('uses in-memory head registry when useMemoryStore is true', async () => {
      const service = makeService();
      await service.initialize(
        makeConfig({ useMemoryStore: true }),
        makeInput(),
      );
      expect(service.db).toBeInstanceOf(BrightChainDb);
      expect(service.db.isConnected()).toBe(true);
    });

    it('uses persistent head registry when blockStorePath is set and useMemoryStore is false', async () => {
      const tmpDir = mkdtempSync(join(tmpdir(), 'bc-unit-'));
      try {
        const service = makeService();
        const config = makeConfig({
          blockStorePath: tmpDir,
          useMemoryStore: false,
        });
        await service.initialize(config, makeInput());
        expect(service.db).toBeInstanceOf(BrightChainDb);
        expect(service.db.isConnected()).toBe(true);
      } finally {
        rmSync(tmpDir, { recursive: true, force: true });
      }
    });

    it('memberCblIndex is available after initialize()', async () => {
      const service = makeService();
      await service.initialize(makeConfig(), makeInput());
      expect(service.memberCblIndex).toBeDefined();
    });
  });

  // ── 5.3: Property 1 — Persistence round-trip ───────────────────────────────

  describe('Feature: brightchain-db-member-init, Property 1: Persistence round-trip', () => {
    /**
     * **Validates: Requirements 2.1**
     *
     * For any set of 3 unique valid ShortHexGuid IDs, after initialize()
     * completes, querying the member_index collection for each ID returns
     * a document with matching fields.
     */
    it('every inserted member is retrievable by id', async () => {
      await fc.assert(
        fc.asyncProperty(uniqueTripleIdArb, async ({ sysId, admId, memId }) => {
          const service = makeService();
          const config = makeConfig();
          const input = makeInput(sysId, admId, memId);

          await service.initialize(config, input);

          const collection =
            service.db.collection<IMemberIndexDocument>('member_index');

          for (const expectedId of [sysId, admId, memId]) {
            const doc = await collection.findOne({ id: expectedId });
            expect(doc).not.toBeNull();
            expect(doc?.id).toBe(expectedId);
            expect(doc?.poolId).toBe(VALID_POOL);
            expect(doc?.status).toBe(MemberStatusType.Active);
            expect(doc?.reputation).toBe(0);
            expect(doc?.publicCBL).toBe('0'.repeat(64));
            expect(doc?.privateCBL).toBe('0'.repeat(64));
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── 5.4: Property 2 — Schema validation rejects invalid documents atomically

  describe('Feature: brightchain-db-member-init, Property 2: Schema validation rejects invalid documents atomically', () => {
    /**
     * **Validates: Requirements 2.3, 2.4, 5.1**
     *
     * For any set of IDs where one ID is invalid (empty string),
     * initialize() throws MemberIndexSchemaValidationError and the
     * collection contains zero entries.
     */
    it('invalid id causes MemberIndexSchemaValidationError with no inserts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom<'system' | 'admin' | 'member'>(
            'system',
            'admin',
            'member',
          ),
          uniqueTripleIdArb,
          async (slot, { sysId, admId, memId }) => {
            const service = makeService();
            const config = makeConfig();

            // Inject an empty string into one of the three slots
            const ids = { system: sysId, admin: admId, member: memId };
            ids[slot] = '';

            const input = makeInput(ids.system, ids.admin, ids.member);

            await expect(service.initialize(config, input)).rejects.toThrow(
              MemberIndexSchemaValidationError,
            );

            // The db was connected before validation ran, so we can check
            // that no documents were inserted.
            const collection =
              service.db.collection<IMemberIndexDocument>('member_index');
            expect(await collection.countDocuments({})).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── 5.5: Property 3 — Idempotency ─────────────────────────────────────────

  describe('Feature: brightchain-db-member-init, Property 3: Idempotency', () => {
    /**
     * **Validates: Requirements 3.1, 3.3**
     *
     * Calling initialize() twice with the same candidates produces the
     * same collection state — no duplicates, same count, and the second
     * call returns alreadyInitialized: true.
     */
    it('second call returns alreadyInitialized with same doc count', async () => {
      await fc.assert(
        fc.asyncProperty(uniqueTripleIdArb, async ({ sysId, admId, memId }) => {
          const service = makeService();
          const config = makeConfig();
          const input = makeInput(sysId, admId, memId);

          const first = await service.initialize(config, input);
          expect(first.alreadyInitialized).toBe(false);
          expect(first.insertedCount).toBe(3);

          const second = await service.initialize(config, input);
          expect(second.alreadyInitialized).toBe(true);
          expect(second.insertedCount).toBe(0);
          expect(second.skippedCount).toBe(3);

          const collection =
            service.db.collection<IMemberIndexDocument>('member_index');
          expect(await collection.countDocuments({})).toBe(3);
        }),
        { numRuns: 100 },
      );
    });
  });

  // ── 5.6: Property 4 — Transaction atomicity on insert failure ──────────────

  describe('Feature: brightchain-db-member-init, Property 4: Transaction atomicity on insert failure', () => {
    /**
     * **Validates: Requirements 4.1**
     *
     * When an insert fails mid-transaction, the collection should contain
     * no new entries — the pre-call state is fully restored.
     *
     * Strategy: seed the service with 3 members, then on a second call
     * with 3 new members, spy on collection.insertOne and throw on the
     * second insert. The collection should still have exactly 3 docs.
     */
    it('failed insert leaves collection unchanged', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueTripleIdArb,
          uniqueTripleIdArb,
          async (first3, second3) => {
            // Ensure the two triples don't overlap
            const allIds = new Set([
              first3.sysId,
              first3.admId,
              first3.memId,
              second3.sysId,
              second3.admId,
              second3.memId,
            ]);
            fc.pre(allIds.size === 6);

            const service = makeService();
            const config = makeConfig();

            // Seed with first 3 members
            await service.initialize(
              config,
              makeInput(first3.sysId, first3.admId, first3.memId),
            );

            const collection =
              service.db.collection<IMemberIndexDocument>('member_index');
            const preCount = await collection.countDocuments({});
            expect(preCount).toBe(3);

            // Spy on insertOne — throw on the second call
            const originalInsertOne = collection.insertOne.bind(collection);
            let insertCallCount = 0;
            jest
              .spyOn(collection, 'insertOne')
              .mockImplementation(
                (...args: Parameters<typeof collection.insertOne>) => {
                  insertCallCount++;
                  if (insertCallCount === 2) {
                    throw new Error('Simulated insert failure');
                  }
                  return originalInsertOne(...args);
                },
              );

            // Attempt to insert second batch — should fail
            await expect(
              service.initialize(
                config,
                makeInput(second3.sysId, second3.admId, second3.memId),
              ),
            ).rejects.toThrow('Simulated insert failure');

            // Restore spy
            jest.restoreAllMocks();

            // Collection should be unchanged — still exactly 3 docs from the first batch
            expect(await collection.countDocuments({})).toBe(preCount);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // ── 5.7: Property 5 — Accurate result counts ──────────────────────────────

  describe('Feature: brightchain-db-member-init, Property 5: Accurate result counts', () => {
    /**
     * **Validates: Requirements 6.2**
     *
     * For any call to initialize() with 3 candidates where K are already
     * present (0 ≤ K ≤ 3), the result satisfies:
     *   insertedCount + skippedCount === 3
     *   skippedCount === K
     *   insertedCount === 3 - K
     */
    it('insertedCount + skippedCount === total candidates', async () => {
      await fc.assert(
        fc.asyncProperty(
          uniqueTripleIdArb,
          fc.integer({ min: 0, max: 3 }),
          async ({ sysId, admId, memId }, preSeedCount) => {
            const service = makeService();
            const config = makeConfig();
            const input = makeInput(sysId, admId, memId);

            // Pre-seed K members by initializing with a subset
            if (preSeedCount > 0) {
              // First initialize with all 3 to get the db connected
              await service.initialize(config, input);

              // Then remove (3 - preSeedCount) entries to simulate partial state
              const collection =
                service.db.collection<IMemberIndexDocument>('member_index');
              const allIds = [sysId, admId, memId];
              const toRemove = allIds.slice(preSeedCount);
              for (const id of toRemove) {
                await collection.deleteOne({ id });
              }

              // Now re-initialize — should insert only the missing ones
              const result = await service.initialize(config, input);

              expect(result.insertedCount + result.skippedCount).toBe(3);
              expect(result.skippedCount).toBe(preSeedCount);
              expect(result.insertedCount).toBe(3 - preSeedCount);
            } else {
              // No pre-seeding — all 3 should be inserted
              const result = await service.initialize(config, input);

              expect(result.insertedCount + result.skippedCount).toBe(3);
              expect(result.skippedCount).toBe(0);
              expect(result.insertedCount).toBe(3);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
