/**
 * CBLIndex – Pool-Scoped CBL Tracking Property-Based Tests.
 *
 * Feature: architectural-gaps
 *
 * Uses fast-check to validate pool deletion reporting and
 * cross-pool dependency tracking properties.
 */

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
  const db = new BrightChainDb(store as never, {
    name: 'pbt-pool-db',
    headRegistry: registry,
  });
  const index = new CBLIndex(db, store as never);
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

/** Arbitrary for a pool ID. */
const poolIdArb: fc.Arbitrary<string> = identifierArb.map((s) => `pool-${s}`);

/** Arbitrary for a pair of distinct pool IDs. */
const distinctPoolPairArb: fc.Arbitrary<{ poolA: string; poolB: string }> = fc
  .tuple(poolIdArb, poolIdArb)
  .filter(([a, b]) => a !== b)
  .map(([a, b]) => ({ poolA: a, poolB: b }));

// ══════════════════════════════════════════════════════════════
// Property 12: CBL Index pool deletion reporting
// ══════════════════════════════════════════════════════════════

describe('CBLIndex Pool Tracking Property-Based Tests', () => {
  /**
   * Property 12: CBL Index pool deletion reporting
   *
   * Feature: architectural-gaps, Property 12: CBL Index pool deletion reporting
   *
   * For any pool containing N CBL index entries, requesting deletion
   * validation should report all N entries. The count should match the
   * actual number of entries with that pool ID.
   *
   * **Validates: Requirements 5.3**
   */
  it('Property 12: CBL Index pool deletion reporting', async () => {
    await fc.assert(
      fc.asyncProperty(
        blockIdPairArb,
        poolIdArb,
        fc.integer({ min: 1, max: 10 }),
        fc.integer({ min: 0, max: 5 }),
        async (ids, targetPool, targetCount, otherCount) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          // Insert targetCount entries in the target pool
          for (let i = 0; i < targetCount; i++) {
            await index.addEntry({
              magnetUrl: `magnet:?pool-del-target=${i}-${targetPool}`,
              blockId1: ids.blockId1,
              blockId2: ids.blockId2,
              blockSize: 256,
              createdAt: new Date(),
              poolId: targetPool,
              visibility: CBLVisibility.Private,
            });
          }

          // Insert otherCount entries in a different pool
          const otherPool = targetPool + '-other';
          for (let i = 0; i < otherCount; i++) {
            await index.addEntry({
              magnetUrl: `magnet:?pool-del-other=${i}-${otherPool}`,
              blockId1: ids.blockId1,
              blockId2: ids.blockId2,
              blockSize: 256,
              createdAt: new Date(),
              poolId: otherPool,
              visibility: CBLVisibility.Private,
            });
          }

          // Validate pool deletion reporting via getPoolEntries
          const poolEntries = await index.getPoolEntries(targetPool);
          expect(poolEntries.length).toBe(targetCount);
          for (const entry of poolEntries) {
            expect(entry.poolId).toBe(targetPool);
          }

          // Validate via getPoolCBLCounts
          const counts = await index.getPoolCBLCounts();
          expect(counts.get(targetPool)).toBe(targetCount);

          // Other pool count should also be correct
          if (otherCount > 0) {
            expect(counts.get(otherPool)).toBe(otherCount);
          }

          // Verify total pools reported matches what we inserted
          const expectedPoolCount =
            (targetCount > 0 ? 1 : 0) + (otherCount > 0 ? 1 : 0);
          expect(counts.size).toBe(expectedPoolCount);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ══════════════════════════════════════════════════════════════
  // Property 13: CBL Index cross-pool dependency tracking
  // ══════════════════════════════════════════════════════════════

  /**
   * Property 13: CBL Index cross-pool dependency tracking
   *
   * Feature: architectural-gaps, Property 13: CBL Index cross-pool dependency tracking
   *
   * For any CBL whose XOR component blocks reside in different pools,
   * the CBL Index should report both pools as having a dependency, and
   * neither pool should pass deletion validation while the cross-pool
   * CBL exists.
   *
   * **Validates: Requirements 5.4, 5.5**
   */
  it('Property 13: CBL Index cross-pool dependency tracking', async () => {
    await fc.assert(
      fc.asyncProperty(
        distinctPoolPairArb,
        blockIdPairArb,
        async ({ poolA, poolB }, ids) => {
          const { index, store } = makeCBLIndex();
          await seedBlocks(store, ids.blockId1, ids.blockId2);

          // Create a CBL entry in poolA that uses blockId1 and blockId2
          await index.addEntry({
            magnetUrl: `magnet:?cross-pool-a=${ids.blockId1}`,
            blockId1: ids.blockId1,
            blockId2: ids.blockId2,
            blockSize: 256,
            createdAt: new Date(),
            poolId: poolA,
            visibility: CBLVisibility.Private,
          });

          // Create a CBL entry in poolB that shares one of the same block IDs
          // This simulates XOR component blocks residing in different pools
          await index.addEntry({
            magnetUrl: `magnet:?cross-pool-b=${ids.blockId2}`,
            blockId1: ids.blockId1,
            blockId2: ids.blockId2,
            blockSize: 256,
            createdAt: new Date(),
            poolId: poolB,
            visibility: CBLVisibility.Private,
          });

          // getCrossPoolDependencies for poolA should report dependencies
          const depsA = await index.getCrossPoolDependencies(poolA);
          expect(depsA.length).toBeGreaterThan(0);

          // Both block IDs should show cross-pool dependencies
          const depBlockIds = new Set(depsA.map((d) => d.blockId));
          expect(depBlockIds.has(ids.blockId1)).toBe(true);
          expect(depBlockIds.has(ids.blockId2)).toBe(true);

          // Each dependency should list both pools
          for (const dep of depsA) {
            expect(dep.pools).toContain(poolA);
            expect(dep.pools).toContain(poolB);
          }

          // getCrossPoolDependencies for poolB should also report dependencies
          const depsB = await index.getCrossPoolDependencies(poolB);
          expect(depsB.length).toBeGreaterThan(0);

          const depBlockIdsB = new Set(depsB.map((d) => d.blockId));
          expect(depBlockIdsB.has(ids.blockId1)).toBe(true);
          expect(depBlockIdsB.has(ids.blockId2)).toBe(true);

          for (const dep of depsB) {
            expect(dep.pools).toContain(poolA);
            expect(dep.pools).toContain(poolB);
          }

          // Both pools should have entries (neither is safe to delete)
          const countsBeforeDeletion = await index.getPoolCBLCounts();
          expect(countsBeforeDeletion.get(poolA)).toBeGreaterThan(0);
          expect(countsBeforeDeletion.get(poolB)).toBeGreaterThan(0);

          // Verify getPoolEntries reports entries for both pools
          const entriesA = await index.getPoolEntries(poolA);
          const entriesB = await index.getPoolEntries(poolB);
          expect(entriesA.length).toBeGreaterThan(0);
          expect(entriesB.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
