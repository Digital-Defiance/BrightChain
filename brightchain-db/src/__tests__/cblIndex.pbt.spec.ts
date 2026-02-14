/**
 * CBLIndex – Property-Based Tests.
 *
 * Feature: architectural-gaps
 *
 * Uses fast-check to validate universal correctness properties
 * of CBLIndex across randomly generated inputs.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ICBLIndexEntry } from '@brightchain/brightchain-lib';
import { CBLVisibility } from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { CBLIndex } from '../lib/cblIndex';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { MockBlockStore } from './helpers/mockBlockStore';

// ══════════════════════════════════════════════════════════════
// Helpers & Arbitraries
// ══════════════════════════════════════════════════════════════

/** Create a fresh db + store + CBLIndex for each property run. */
function makeCBLIndex(): {
  index: CBLIndex;
  store: MockBlockStore;
  db: BrightChainDb;
} {
  const store = new MockBlockStore();
  const registry = InMemoryHeadRegistry.createIsolated();
  const db = new BrightChainDb(store as any, {
    name: 'pbt-db',
    headRegistry: registry,
  });
  const index = new CBLIndex(db, store as any);
  return { index, store, db };
}

/** Seed two blocks in the store and return their IDs. */
async function seedBlocks(
  store: MockBlockStore,
  id1: string,
  id2: string,
): Promise<void> {
  await store.put(id1, new Uint8Array([1, 2, 3]));
  await store.put(id2, new Uint8Array([4, 5, 6]));
}

/** Alphanumeric character set for generating safe identifiers. */
const alphaChars = 'abcdefghijklmnopqrstuvwxyz0123456789';

/** Arbitrary for safe identifier strings (no special chars). */
const identifierArb: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...alphaChars.split('')), {
    minLength: 3,
    maxLength: 12,
  })
  .map((chars) => chars.join(''));

/** Arbitrary for a unique block ID pair. */
const blockIdPairArb: fc.Arbitrary<{ blockId1: string; blockId2: string }> = fc
  .tuple(identifierArb, identifierArb)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => ({ blockId1: `blk-${a}`, blockId2: `blk-${b}` }));

/** Arbitrary for CBLVisibility. */
const visibilityArb: fc.Arbitrary<CBLVisibility> = fc.constantFrom(
  CBLVisibility.Private,
  CBLVisibility.Shared,
  CBLVisibility.Public,
);

/** Arbitrary for optional metadata. */
const metadataArb = fc.record({
  fileName: fc.option(
    identifierArb.map((s) => `${s}.txt`),
    { nil: undefined },
  ),
  mimeType: fc.option(
    fc.constantFrom('text/plain', 'application/pdf', 'image/png'),
    { nil: undefined },
  ),
  originalSize: fc.option(fc.integer({ min: 1, max: 10_000_000 }), {
    nil: undefined,
  }),
  tags: fc.option(fc.array(identifierArb, { minLength: 0, maxLength: 3 }), {
    nil: undefined,
  }),
});

/** Arbitrary for a complete entry input (without _id and sequenceNumber). */
function entryArb(blockIds: {
  blockId1: string;
  blockId2: string;
}): fc.Arbitrary<Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'>> {
  return fc
    .record({
      magnetUrl: identifierArb.map((s) => `magnet:?pbt=${s}`),
      poolId: fc.option(
        identifierArb.map((s) => `pool-${s}`),
        {
          nil: undefined,
        },
      ),
      createdBy: fc.option(identifierArb, { nil: undefined }),
      visibility: visibilityArb,
      metadata: fc.option(metadataArb, { nil: undefined }),
      userCollection: fc.option(identifierArb, { nil: undefined }),
    })
    .map((fields) => ({
      ...fields,
      blockId1: blockIds.blockId1,
      blockId2: blockIds.blockId2,
      blockSize: 256,
      createdAt: new Date(),
    }));
}

// ══════════════════════════════════════════════════════════════
// Property 7: CBL Index entry completeness
// ══════════════════════════════════════════════════════════════

describe('CBLIndex Property-Based Tests', () => {
  /**
   * Property 7: CBL Index entry completeness
   *
   * Feature: architectural-gaps, Property 7: CBL Index entry completeness
   *
   * For any valid CBL storage result and optional metadata, creating a CBL
   * index entry should produce a document containing all input fields
   * faithfully preserved.
   *
   * **Validates: Requirements 4.2, 5.1, 6.1**
   */
  it('Property 7: CBL Index entry completeness', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb.chain((ids) =>
          entryArb(ids).map((entry) => ({ ids, entry })),
        ),
        async ({ ids, entry }) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          const result = await index.addEntry(entry);

          // _id and sequenceNumber must be assigned
          expect(result._id).toBeDefined();
          expect(typeof result._id).toBe('string');
          expect(result._id.length).toBeGreaterThan(0);
          expect(result.sequenceNumber).toBeGreaterThanOrEqual(1);

          // All input fields must be faithfully preserved
          expect(result.magnetUrl).toBe(entry.magnetUrl);
          expect(result.blockId1).toBe(entry.blockId1);
          expect(result.blockId2).toBe(entry.blockId2);
          expect(result.blockSize).toBe(entry.blockSize);
          expect(result.visibility).toBe(entry.visibility);

          // Optional fields preserved when provided
          if (entry.poolId !== undefined) {
            expect(result.poolId).toBe(entry.poolId);
          }
          if (entry.createdBy !== undefined) {
            expect(result.createdBy).toBe(entry.createdBy);
          }
          if (entry.metadata !== undefined) {
            expect(result.metadata).toEqual(entry.metadata);
          }
          if (entry.userCollection !== undefined) {
            expect(result.userCollection).toBe(entry.userCollection);
          }

          // createdAt must be a Date
          expect(result.createdAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 8: CBL Index query correctness
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 8: CBL Index query correctness
   *
   * Feature: architectural-gaps, Property 8: CBL Index query correctness
   *
   * For any set of CBL index entries with known attributes, querying by any
   * single attribute should return exactly the entries that match that
   * attribute and no others.
   *
   * **Validates: Requirements 4.3, 5.2, 6.2**
   */
  it('Property 8: CBL Index query correctness', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        fc.array(
          fc.record({
            poolId: fc.constantFrom('pool-alpha', 'pool-beta'),
            createdBy: fc.constantFrom('alice', 'bob'),
            visibility: fc.constantFrom(
              CBLVisibility.Private,
              CBLVisibility.Public,
            ),
            fileName: fc.constantFrom('report.txt', 'image.png'),
            mimeType: fc.constantFrom('text/plain', 'image/png'),
          }),
          { minLength: 2, maxLength: 8 },
        ),
        async (ids, entrySpecs) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          // Insert entries with distinct magnet URLs
          const inserted: ICBLIndexEntry[] = [];
          for (let i = 0; i < entrySpecs.length; i++) {
            const spec = entrySpecs[i];
            const result = await index.addEntry({
              magnetUrl: `magnet:?pbt-q=${i}`,
              blockId1: ids.blockId1,
              blockId2: ids.blockId2,
              blockSize: 256,
              createdAt: new Date(),
              poolId: spec.poolId,
              createdBy: spec.createdBy,
              visibility: spec.visibility,
              metadata: {
                fileName: spec.fileName,
                mimeType: spec.mimeType,
              },
            });
            inserted.push(result);
          }

          // Query by poolId
          for (const targetPool of ['pool-alpha', 'pool-beta']) {
            const results = await index.query({ poolId: targetPool });
            const expected = inserted.filter((e) => e.poolId === targetPool);
            expect(results.length).toBe(expected.length);
            for (const r of results) {
              expect(r.poolId).toBe(targetPool);
            }
          }

          // Query by createdBy
          for (const targetUser of ['alice', 'bob']) {
            const results = await index.query({ createdBy: targetUser });
            const expected = inserted.filter((e) => e.createdBy === targetUser);
            expect(results.length).toBe(expected.length);
            for (const r of results) {
              expect(r.createdBy).toBe(targetUser);
            }
          }

          // Query by visibility
          for (const vis of [CBLVisibility.Private, CBLVisibility.Public]) {
            const results = await index.query({ visibility: vis });
            const expected = inserted.filter((e) => e.visibility === vis);
            expect(results.length).toBe(expected.length);
            for (const r of results) {
              expect(r.visibility).toBe(vis);
            }
          }

          // Query by fileName
          for (const fn of ['report.txt', 'image.png']) {
            const results = await index.query({ fileName: fn });
            const expected = inserted.filter(
              (e) => e.metadata?.fileName === fn,
            );
            expect(results.length).toBe(expected.length);
          }

          // Query by mimeType
          for (const mt of ['text/plain', 'image/png']) {
            const results = await index.query({ mimeType: mt });
            const expected = inserted.filter(
              (e) => e.metadata?.mimeType === mt,
            );
            expect(results.length).toBe(expected.length);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 9: CBL Index block existence validation
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 9: CBL Index block existence validation
   *
   * Feature: architectural-gaps, Property 9: CBL Index block existence validation
   *
   * For any CBL index entry creation attempt, if either blockId1 or blockId2
   * does not exist in the block store, creation should fail. If both exist,
   * creation should succeed.
   *
   * **Validates: Requirements 4.4**
   */
  it('Property 9: CBL Index block existence validation', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        fc.record({
          seedBlock1: fc.boolean(),
          seedBlock2: fc.boolean(),
        }),
        async (ids, { seedBlock1, seedBlock2 }) => {
          const { index, store } = makeCBLIndex();

          // Conditionally seed each block
          if (seedBlock1) {
            await store.put(ids.blockId1, new Uint8Array([1, 2, 3]));
          }
          if (seedBlock2) {
            await store.put(ids.blockId2, new Uint8Array([4, 5, 6]));
          }

          const entry: Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'> = {
            magnetUrl: `magnet:?pbt-val=${ids.blockId1}`,
            blockId1: ids.blockId1,
            blockId2: ids.blockId2,
            blockSize: 256,
            createdAt: new Date(),
            visibility: CBLVisibility.Private,
          };

          if (seedBlock1 && seedBlock2) {
            // Both exist → should succeed
            const result = await index.addEntry(entry);
            expect(result._id).toBeDefined();
            expect(result.sequenceNumber).toBeGreaterThanOrEqual(1);
          } else {
            // At least one missing → should fail
            await expect(index.addEntry(entry)).rejects.toThrow(
              'Block validation failed',
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 10: CBL Index soft-delete preserves entry
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 10: CBL Index soft-delete preserves entry
   *
   * Feature: architectural-gaps, Property 10: CBL Index soft-delete preserves entry
   *
   * For any existing CBL index entry, after soft-deletion, the entry should
   * still be retrievable with includeDeleted: true and have a non-null
   * deletedAt. It should not appear in default queries.
   *
   * **Validates: Requirements 4.6**
   */
  it('Property 10: CBL Index soft-delete preserves entry', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb.chain((ids) =>
          entryArb(ids).map((entry) => ({ ids, entry })),
        ),
        async ({ ids, entry }) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          const created = await index.addEntry(entry);

          // Before soft-delete: entry appears in default queries
          const beforeDefault = await index.query({});
          expect(beforeDefault.some((e) => e._id === created._id)).toBe(true);

          // Soft-delete
          await index.softDelete(created.magnetUrl);

          // After soft-delete: entry should NOT appear in default queries
          const afterDefault = await index.query({});
          expect(afterDefault.some((e) => e._id === created._id)).toBe(false);

          // After soft-delete: entry SHOULD appear with includeDeleted: true
          const afterIncluded = await index.query({ includeDeleted: true });
          const deletedEntry = afterIncluded.find((e) => e._id === created._id);
          expect(deletedEntry).toBeDefined();
          expect(deletedEntry!.deletedAt).toBeDefined();
          expect(deletedEntry!.deletedAt).toBeInstanceOf(Date);

          // All original fields should still be preserved
          expect(deletedEntry!.magnetUrl).toBe(created.magnetUrl);
          expect(deletedEntry!.blockId1).toBe(created.blockId1);
          expect(deletedEntry!.blockId2).toBe(created.blockId2);
          expect(deletedEntry!.sequenceNumber).toBe(created.sequenceNumber);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 11: CBL Index pagination completeness and ordering
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 11: CBL Index pagination completeness and ordering
   *
   * Feature: architectural-gaps, Property 11: CBL Index pagination completeness and ordering
   *
   * For any set of N entries and any page size P, iterating through all pages
   * should yield exactly N entries with no duplicates and no gaps. Sort order
   * should be respected.
   *
   * **Validates: Requirements 4.7**
   */
  it('Property 11: CBL Index pagination completeness and ordering', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        fc.integer({ min: 3, max: 12 }),
        fc.integer({ min: 1, max: 5 }),
        async (ids, entryCount, pageSize) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          // Insert N entries with distinct createdAt timestamps for deterministic sort
          const insertedIds: string[] = [];
          for (let i = 0; i < entryCount; i++) {
            const result = await index.addEntry({
              magnetUrl: `magnet:?pbt-page=${i}-${ids.blockId1}`,
              blockId1: ids.blockId1,
              blockId2: ids.blockId2,
              blockSize: 256,
              createdAt: new Date(2025, 0, 1, 0, 0, i),
              visibility: CBLVisibility.Private,
            });
            insertedIds.push(result._id);
          }

          // Paginate through all entries
          const allCollected: ICBLIndexEntry[] = [];
          let offset = 0;
          while (true) {
            const page = await index.query({
              limit: pageSize,
              offset,
              sortBy: 'createdAt',
              sortOrder: 'asc',
            });
            if (page.length === 0) break;
            allCollected.push(...page);
            offset += page.length;
            // Safety: prevent infinite loop
            if (offset > entryCount + 10) break;
          }

          // Completeness: should have exactly N entries
          expect(allCollected.length).toBe(entryCount);

          // No duplicates
          const collectedIds = allCollected.map((e) => e._id);
          const uniqueIds = new Set(collectedIds);
          expect(uniqueIds.size).toBe(entryCount);

          // No gaps: every inserted ID should appear
          for (const id of insertedIds) {
            expect(uniqueIds.has(id)).toBe(true);
          }

          // Sort order respected: createdAt should be ascending
          for (let i = 1; i < allCollected.length; i++) {
            const prev = new Date(allCollected[i - 1].createdAt).getTime();
            const curr = new Date(allCollected[i].createdAt).getTime();
            expect(curr).toBeGreaterThanOrEqual(prev);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
