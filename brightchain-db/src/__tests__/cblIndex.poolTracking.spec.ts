/**
 * CBLIndex – pool-scoped tracking unit tests.
 *
 * Tests pool deletion reporting (getPoolEntries, getPoolCBLCounts),
 * cross-pool dependency detection (getCrossPoolDependencies),
 * and query-by-pool filtering.
 *
 * Validates: Requirements 5.3, 5.4, 5.5
 */

import type { ICBLIndexEntry } from '@brightchain/brightchain-lib';
import { CBLVisibility } from '@brightchain/brightchain-lib';
import { CBLIndex } from '../lib/cblIndex';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { MockBlockStore } from './helpers/mockBlockStore';

/** Create a fresh db + store + CBLIndex for each test. */
function makeCBLIndex(): {
  index: CBLIndex;
  store: MockBlockStore;
  db: BrightChainDb;
} {
  const store = new MockBlockStore();
  const registry = InMemoryHeadRegistry.createIsolated();

  const db = new BrightChainDb(store as never, {
    name: 'testdb',
    headRegistry: registry,
  });

  const index = new CBLIndex(db, store as never);
  return { index, store, db };
}

/** Seed two blocks in the store and return their IDs. */
async function seedBlocks(
  store: MockBlockStore,
  id1 = 'block-aaa-111',
  id2 = 'block-bbb-222',
): Promise<{ blockId1: string; blockId2: string }> {
  await store.put(id1, new Uint8Array([1, 2, 3]));
  await store.put(id2, new Uint8Array([4, 5, 6]));
  return { blockId1: id1, blockId2: id2 };
}

/** Build a minimal valid entry (without _id and sequenceNumber). */
function makeEntry(
  overrides: Partial<Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'>> = {},
): Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'> {
  return {
    magnetUrl:
      'magnet:?xt=urn:brightchain:cbl&bs=256&b1=block-aaa-111&b2=block-bbb-222',
    blockId1: 'block-aaa-111',
    blockId2: 'block-bbb-222',
    blockSize: 256,
    createdAt: new Date(),
    visibility: CBLVisibility.Private,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// Requirement 5.5: getPoolCBLCounts – list all pools with counts
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – getPoolCBLCounts (Req 5.5)', () => {
  it('should return counts for multiple pools', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:pa1',
        poolId: 'pool-a',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:pa2',
        poolId: 'pool-a',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:pa3',
        poolId: 'pool-a',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:pb1',
        poolId: 'pool-b',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:pc1',
        poolId: 'pool-c',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:pc2',
        poolId: 'pool-c',
      }),
    );

    const counts = await index.getPoolCBLCounts();

    expect(counts.size).toBe(3);
    expect(counts.get('pool-a')).toBe(3);
    expect(counts.get('pool-b')).toBe(1);
    expect(counts.get('pool-c')).toBe(2);
  });

  it('should return empty map when no entries have pool IDs', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:nopool1' }),
    );
    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:nopool2' }),
    );

    const counts = await index.getPoolCBLCounts();
    expect(counts.size).toBe(0);
  });

  it('should exclude soft-deleted entries from pool counts', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:sd1',
        poolId: 'pool-x',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:sd2',
        poolId: 'pool-x',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:sd3',
        poolId: 'pool-x',
      }),
    );

    await index.softDelete('magnet:sd1');
    await index.softDelete('magnet:sd2');

    const counts = await index.getPoolCBLCounts();
    expect(counts.get('pool-x')).toBe(1);
  });

  it('should remove pool from counts when all its entries are soft-deleted', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:gone1',
        poolId: 'pool-gone',
      }),
    );
    await index.softDelete('magnet:gone1');

    const counts = await index.getPoolCBLCounts();
    expect(counts.has('pool-gone')).toBe(false);
  });

  it('should handle mix of pooled and non-pooled entries', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:mix1',
        poolId: 'pool-m',
      }),
    );
    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:mix2' }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:mix3',
        poolId: 'pool-m',
      }),
    );

    const counts = await index.getPoolCBLCounts();
    expect(counts.size).toBe(1);
    expect(counts.get('pool-m')).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 5.3: getPoolEntries – pool deletion reporting
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – getPoolEntries (Req 5.3)', () => {
  it('should return all non-deleted entries for a pool', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:pe1',
        poolId: 'pool-del',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:pe2',
        poolId: 'pool-del',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:pe3',
        poolId: 'pool-other',
      }),
    );

    const entries = await index.getPoolEntries('pool-del');

    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.poolId === 'pool-del')).toBe(true);
  });

  it('should return empty array for pool with no entries', async () => {
    const { index } = makeCBLIndex();

    const entries = await index.getPoolEntries('nonexistent-pool');
    expect(entries).toHaveLength(0);
  });

  it('should exclude soft-deleted entries from pool reporting', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:psd1',
        poolId: 'pool-sd',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:psd2',
        poolId: 'pool-sd',
      }),
    );
    await index.softDelete('magnet:psd1');

    const entries = await index.getPoolEntries('pool-sd');

    expect(entries).toHaveLength(1);
    expect(entries[0].magnetUrl).toBe('magnet:psd2');
  });

  it('should return count matching getPoolCBLCounts for the same pool', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:cnt1',
        poolId: 'pool-cnt',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:cnt2',
        poolId: 'pool-cnt',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:cnt3',
        poolId: 'pool-cnt',
      }),
    );

    const entries = await index.getPoolEntries('pool-cnt');
    const counts = await index.getPoolCBLCounts();

    expect(entries.length).toBe(counts.get('pool-cnt'));
  });

  it('should report entries with full metadata for deletion validation', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:meta1',
        poolId: 'pool-meta',
        metadata: {
          fileName: 'report.pdf',
          mimeType: 'application/pdf',
          originalSize: 1024,
        },
        createdBy: 'alice',
      }),
    );

    const entries = await index.getPoolEntries('pool-meta');

    expect(entries).toHaveLength(1);
    expect(entries[0].metadata?.fileName).toBe('report.pdf');
    expect(entries[0].createdBy).toBe('alice');
    expect(entries[0].blockId1).toBe(blockId1);
    expect(entries[0].blockId2).toBe(blockId2);
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 5.3 via query({ poolId }): pool deletion reporting
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – query by poolId (Req 5.3)', () => {
  it('should return only entries for the specified pool', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:qp1',
        poolId: 'pool-q1',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:qp2',
        poolId: 'pool-q2',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:qp3',
        poolId: 'pool-q1',
      }),
    );

    const results = await index.query({ poolId: 'pool-q1' });

    expect(results).toHaveLength(2);
    expect(results.every((e) => e.poolId === 'pool-q1')).toBe(true);
  });

  it('should match getPoolEntries results for the same pool', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:match1',
        poolId: 'pool-match',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:match2',
        poolId: 'pool-match',
      }),
    );

    const queryResults = await index.query({ poolId: 'pool-match' });
    const poolEntries = await index.getPoolEntries('pool-match');

    expect(queryResults.length).toBe(poolEntries.length);
    const queryMagnets = queryResults.map((e) => e.magnetUrl).sort();
    const poolMagnets = poolEntries.map((e) => e.magnetUrl).sort();
    expect(queryMagnets).toEqual(poolMagnets);
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 5.4: getCrossPoolDependencies – cross-pool detection
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – getCrossPoolDependencies (Req 5.4)', () => {
  it('should detect when same block IDs appear in multiple pools', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // Same block IDs referenced by entries in two different pools
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:cp1',
        poolId: 'pool-alpha',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:cp2',
        poolId: 'pool-beta',
      }),
    );

    const deps = await index.getCrossPoolDependencies('pool-alpha');

    expect(deps.length).toBeGreaterThan(0);
    // Both block IDs should be flagged as cross-pool
    const depBlockIds = deps.map((d) => d.blockId);
    expect(depBlockIds).toContain(blockId1);
    expect(depBlockIds).toContain(blockId2);

    // Each dependency should list both pools
    for (const dep of deps) {
      expect(dep.pools).toContain('pool-alpha');
      expect(dep.pools).toContain('pool-beta');
    }
  });

  it('should return empty when pool has no cross-pool dependencies', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // Different block IDs per pool
    const blockId3 = 'block-ccc-333';
    const blockId4 = 'block-ddd-444';
    await store.put(blockId3, new Uint8Array([7, 8, 9]));
    await store.put(blockId4, new Uint8Array([10, 11, 12]));

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:iso1',
        poolId: 'pool-iso1',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1: blockId3,
        blockId2: blockId4,
        magnetUrl: 'magnet:iso2',
        poolId: 'pool-iso2',
      }),
    );

    const deps = await index.getCrossPoolDependencies('pool-iso1');
    expect(deps).toHaveLength(0);
  });

  it('should detect partial overlap (only one block ID shared)', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const blockId3 = 'block-ccc-333';
    await store.put(blockId3, new Uint8Array([7, 8, 9]));

    // pool-1 uses blockId1 + blockId2
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:part1',
        poolId: 'pool-1',
      }),
    );
    // pool-2 uses blockId1 + blockId3 (shares blockId1 with pool-1)
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2: blockId3,
        magnetUrl: 'magnet:part2',
        poolId: 'pool-2',
      }),
    );

    const deps = await index.getCrossPoolDependencies('pool-1');

    // Only blockId1 should be flagged (blockId2 is unique to pool-1)
    expect(deps.length).toBe(1);
    expect(deps[0].blockId).toBe(blockId1);
    expect(deps[0].pools).toContain('pool-1');
    expect(deps[0].pools).toContain('pool-2');
  });

  it('should detect dependencies across three or more pools', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:3p1',
        poolId: 'pool-x',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:3p2',
        poolId: 'pool-y',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:3p3',
        poolId: 'pool-z',
      }),
    );

    const deps = await index.getCrossPoolDependencies('pool-x');

    expect(deps.length).toBeGreaterThan(0);
    for (const dep of deps) {
      expect(dep.pools).toContain('pool-x');
      expect(dep.pools).toContain('pool-y');
      expect(dep.pools).toContain('pool-z');
    }
  });

  it('should exclude soft-deleted entries from dependency detection', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:dsd1',
        poolId: 'pool-d1',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:dsd2',
        poolId: 'pool-d2',
      }),
    );

    // Soft-delete the entry in pool-d2 — dependency should disappear
    await index.softDelete('magnet:dsd2');

    const deps = await index.getCrossPoolDependencies('pool-d1');
    expect(deps).toHaveLength(0);
  });

  it('should handle entries without poolId using __default__ sentinel', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // Entry in a named pool
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:def1',
        poolId: 'pool-named',
      }),
    );
    // Entry without poolId (default pool)
    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:def2' }),
    );

    const deps = await index.getCrossPoolDependencies('pool-named');

    // Should detect cross-pool dependency with __default__
    expect(deps.length).toBeGreaterThan(0);
    for (const dep of deps) {
      expect(dep.pools).toContain('pool-named');
      expect(dep.pools).toContain('__default__');
    }
  });

  it('should return empty for a pool with no entries', async () => {
    const { index } = makeCBLIndex();

    const deps = await index.getCrossPoolDependencies('empty-pool');
    expect(deps).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// Integration: pool counts + entries + dependencies together
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – pool tracking integration', () => {
  it('should provide consistent data across all pool tracking methods', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const blockId3 = 'block-ccc-333';
    const blockId4 = 'block-ddd-444';
    await store.put(blockId3, new Uint8Array([7, 8, 9]));
    await store.put(blockId4, new Uint8Array([10, 11, 12]));

    // pool-1: 2 entries, shares blockId1 with pool-2
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:int1',
        poolId: 'pool-1',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2: blockId3,
        magnetUrl: 'magnet:int2',
        poolId: 'pool-1',
      }),
    );
    // pool-2: 1 entry, shares blockId1 with pool-1
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2: blockId4,
        magnetUrl: 'magnet:int3',
        poolId: 'pool-2',
      }),
    );

    // Counts should reflect 2 pools
    const counts = await index.getPoolCBLCounts();
    expect(counts.get('pool-1')).toBe(2);
    expect(counts.get('pool-2')).toBe(1);

    // Pool entries should match counts
    const pool1Entries = await index.getPoolEntries('pool-1');
    expect(pool1Entries.length).toBe(counts.get('pool-1'));

    const pool2Entries = await index.getPoolEntries('pool-2');
    expect(pool2Entries.length).toBe(counts.get('pool-2'));

    // Cross-pool deps for pool-1 should flag blockId1
    const deps = await index.getCrossPoolDependencies('pool-1');
    expect(deps.length).toBe(1);
    expect(deps[0].blockId).toBe(blockId1);
    expect(deps[0].pools).toContain('pool-1');
    expect(deps[0].pools).toContain('pool-2');
  });
});
