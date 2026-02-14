/**
 * CBLIndex – unit tests.
 *
 * Tests the CBL Index class: entry creation with block validation,
 * lookups, querying, soft-delete, pool counts, cross-pool dependencies,
 * sharing, version history, and sequence counter monotonicity.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

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
  const db = new BrightChainDb(store as any, {
    name: 'testdb',
    headRegistry: registry,
  });
  const index = new CBLIndex(db, store as any);
  return { index, store, db };
}

/** Seed two blocks in the store and return their IDs. */
async function seedBlocks(
  store: MockBlockStore,
): Promise<{ blockId1: string; blockId2: string }> {
  const blockId1 = 'block-aaa-111';
  const blockId2 = 'block-bbb-222';
  await store.put(blockId1, new Uint8Array([1, 2, 3]));
  await store.put(blockId2, new Uint8Array([4, 5, 6]));
  return { blockId1, blockId2 };
}

/** Build a minimal valid entry (without _id and sequenceNumber). */
function makeEntry(
  overrides: Partial<Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'>> = {},
): Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'> {
  return {
    magnetUrl: `magnet:?xt=urn:brightchain:cbl&bs=256&b1=block-aaa-111&b2=block-bbb-222`,
    blockId1: 'block-aaa-111',
    blockId2: 'block-bbb-222',
    blockSize: 256,
    createdAt: new Date(),
    visibility: CBLVisibility.Private,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// addEntry
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – addEntry', () => {
  it('should create an entry with _id and sequenceNumber', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const result = await index.addEntry(makeEntry({ blockId1, blockId2 }));

    expect(result._id).toBeDefined();
    expect(result.sequenceNumber).toBe(1);
    expect(result.magnetUrl).toContain('magnet:');
    expect(result.blockId1).toBe(blockId1);
    expect(result.blockId2).toBe(blockId2);
  });

  it('should assign monotonically increasing sequence numbers', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const e1 = await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:1' }),
    );
    const e2 = await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:2' }),
    );
    const e3 = await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:3' }),
    );

    expect(e1.sequenceNumber).toBe(1);
    expect(e2.sequenceNumber).toBe(2);
    expect(e3.sequenceNumber).toBe(3);
  });

  it('should reject entry when blockId1 does not exist', async () => {
    const { index, store } = makeCBLIndex();
    await store.put('block-bbb-222', new Uint8Array([4, 5, 6]));

    await expect(
      index.addEntry(
        makeEntry({ blockId1: 'nonexistent', blockId2: 'block-bbb-222' }),
      ),
    ).rejects.toThrow('Block validation failed');
  });

  it('should reject entry when blockId2 does not exist', async () => {
    const { index, store } = makeCBLIndex();
    await store.put('block-aaa-111', new Uint8Array([1, 2, 3]));

    await expect(
      index.addEntry(
        makeEntry({ blockId1: 'block-aaa-111', blockId2: 'nonexistent' }),
      ),
    ).rejects.toThrow('Block validation failed');
  });

  it('should reject entry when both block IDs do not exist', async () => {
    const { index } = makeCBLIndex();

    await expect(
      index.addEntry(makeEntry({ blockId1: 'nope1', blockId2: 'nope2' })),
    ).rejects.toThrow('Block validation failed');
  });
});

// ══════════════════════════════════════════════════════════════
// Lookups: getByMagnetUrl, getByBlockId
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – lookups', () => {
  it('should find entry by magnet URL', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const magnetUrl = 'magnet:?test=lookup';

    await index.addEntry(makeEntry({ blockId1, blockId2, magnetUrl }));

    const found = await index.getByMagnetUrl(magnetUrl);
    expect(found).not.toBeNull();
    expect(found!.magnetUrl).toBe(magnetUrl);
  });

  it('should return null for unknown magnet URL', async () => {
    const { index } = makeCBLIndex();
    const found = await index.getByMagnetUrl('magnet:?nonexistent');
    expect(found).toBeNull();
  });

  it('should find entries by blockId1', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:a' }),
    );

    const results = await index.getByBlockId(blockId1);
    expect(results.length).toBe(1);
    expect(results[0].blockId1).toBe(blockId1);
  });

  it('should find entries by blockId2', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:b' }),
    );

    const results = await index.getByBlockId(blockId2);
    expect(results.length).toBe(1);
    expect(results[0].blockId2).toBe(blockId2);
  });

  it('should not return soft-deleted entries in lookups', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const magnetUrl = 'magnet:?deleted';

    await index.addEntry(makeEntry({ blockId1, blockId2, magnetUrl }));
    await index.softDelete(magnetUrl);

    expect(await index.getByMagnetUrl(magnetUrl)).toBeNull();
    expect(await index.getByBlockId(blockId1)).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// query
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – query', () => {
  it('should filter by poolId', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:p1',
        poolId: 'pool-a',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:p2',
        poolId: 'pool-b',
      }),
    );

    const results = await index.query({ poolId: 'pool-a' });
    expect(results).toHaveLength(1);
    expect(results[0].poolId).toBe('pool-a');
  });

  it('should filter by createdBy', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:u1',
        createdBy: 'alice',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:u2',
        createdBy: 'bob',
      }),
    );

    const results = await index.query({ createdBy: 'alice' });
    expect(results).toHaveLength(1);
    expect(results[0].createdBy).toBe('alice');
  });

  it('should filter by visibility', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:v1',
        visibility: CBLVisibility.Private,
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:v2',
        visibility: CBLVisibility.Public,
      }),
    );

    const results = await index.query({ visibility: CBLVisibility.Public });
    expect(results).toHaveLength(1);
    expect(results[0].visibility).toBe(CBLVisibility.Public);
  });

  it('should exclude soft-deleted entries by default', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:del' }),
    );
    await index.softDelete('magnet:del');

    const results = await index.query({});
    expect(results).toHaveLength(0);
  });

  it('should include soft-deleted entries when includeDeleted is true', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:del2' }),
    );
    await index.softDelete('magnet:del2');

    const results = await index.query({ includeDeleted: true });
    expect(results).toHaveLength(1);
    expect(results[0].deletedAt).toBeDefined();
  });

  it('should support pagination with limit and offset', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    for (let i = 0; i < 5; i++) {
      await index.addEntry(
        makeEntry({
          blockId1,
          blockId2,
          magnetUrl: `magnet:page-${i}`,
          createdAt: new Date(2025, 0, i + 1),
        }),
      );
    }

    const page1 = await index.query({
      limit: 2,
      offset: 0,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });
    const page2 = await index.query({
      limit: 2,
      offset: 2,
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });

    expect(page1).toHaveLength(2);
    expect(page2).toHaveLength(2);
    // Pages should not overlap
    const page1Ids = page1.map((e) => e._id);
    const page2Ids = page2.map((e) => e._id);
    expect(page1Ids.filter((id) => page2Ids.includes(id))).toHaveLength(0);
  });

  it('should sort by createdAt ascending', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:late',
        createdAt: new Date(2025, 6, 1),
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:early',
        createdAt: new Date(2025, 0, 1),
      }),
    );

    const results = await index.query({
      sortBy: 'createdAt',
      sortOrder: 'asc',
    });
    expect(results).toHaveLength(2);
    expect(results[0].magnetUrl).toBe('magnet:early');
    expect(results[1].magnetUrl).toBe('magnet:late');
  });
});

// ══════════════════════════════════════════════════════════════
// softDelete
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – softDelete', () => {
  it('should set deletedAt timestamp on the entry', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const magnetUrl = 'magnet:?soft-del';

    await index.addEntry(makeEntry({ blockId1, blockId2, magnetUrl }));
    await index.softDelete(magnetUrl);

    // Entry should still exist with includeDeleted
    const results = await index.query({ includeDeleted: true });
    const deleted = results.find((e) => e.magnetUrl === magnetUrl);
    expect(deleted).toBeDefined();
    expect(deleted!.deletedAt).toBeInstanceOf(Date);
  });
});

// ══════════════════════════════════════════════════════════════
// getPoolCBLCounts
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – getPoolCBLCounts', () => {
  it('should return counts per pool', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:c1',
        poolId: 'pool-x',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:c2',
        poolId: 'pool-x',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:c3',
        poolId: 'pool-y',
      }),
    );

    const counts = await index.getPoolCBLCounts();
    expect(counts.get('pool-x')).toBe(2);
    expect(counts.get('pool-y')).toBe(1);
  });

  it('should exclude soft-deleted entries from counts', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:cd1',
        poolId: 'pool-z',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:cd2',
        poolId: 'pool-z',
      }),
    );
    await index.softDelete('magnet:cd1');

    const counts = await index.getPoolCBLCounts();
    expect(counts.get('pool-z')).toBe(1);
  });

  it('should not count entries without poolId', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:nopool' }),
    );

    const counts = await index.getPoolCBLCounts();
    expect(counts.size).toBe(0);
  });
});

// ══════════════════════════════════════════════════════════════
// getCrossPoolDependencies
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – getCrossPoolDependencies', () => {
  it('should detect blocks shared across pools', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // Same block IDs used in two different pools
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:xp1',
        poolId: 'pool-1',
      }),
    );
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:xp2',
        poolId: 'pool-2',
      }),
    );

    const deps = await index.getCrossPoolDependencies('pool-1');
    expect(deps.length).toBeGreaterThan(0);
    for (const dep of deps) {
      expect(dep.pools).toContain('pool-1');
      expect(dep.pools).toContain('pool-2');
    }
  });

  it('should return empty when no cross-pool dependencies exist', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // Only one pool has entries
    await index.addEntry(
      makeEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:solo',
        poolId: 'pool-only',
      }),
    );

    const deps = await index.getCrossPoolDependencies('pool-only');
    expect(deps).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════════════
// shareWith
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – shareWith', () => {
  it('should add user to sharedWith and set visibility to Shared', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const magnetUrl = 'magnet:?share-test';

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl, createdBy: 'alice' }),
    );
    await index.shareWith(magnetUrl, 'bob');

    const entry = await index.getByMagnetUrl(magnetUrl);
    expect(entry).not.toBeNull();
    expect(entry!.sharedWith).toContain('bob');
    expect(entry!.visibility).toBe(CBLVisibility.Shared);
  });

  it('should not duplicate user in sharedWith', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const magnetUrl = 'magnet:?share-dup';

    await index.addEntry(makeEntry({ blockId1, blockId2, magnetUrl }));
    await index.shareWith(magnetUrl, 'bob');
    await index.shareWith(magnetUrl, 'bob');

    const entry = await index.getByMagnetUrl(magnetUrl);
    const bobCount = entry!.sharedWith!.filter((u) => u === 'bob').length;
    expect(bobCount).toBe(1);
  });

  it('should throw when magnet URL not found', async () => {
    const { index } = makeCBLIndex();
    await expect(index.shareWith('magnet:?nonexistent', 'bob')).rejects.toThrow(
      'CBL index entry not found',
    );
  });
});

// ══════════════════════════════════════════════════════════════
// Version history
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – version history', () => {
  it('should create first version with versionNumber 1 and no previousVersion', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const v1 = await index.addVersion(
      'file-1',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:v1' }),
    );

    expect(v1.fileId).toBe('file-1');
    expect(v1.versionNumber).toBe(1);
    expect(v1.previousVersion).toBeUndefined();
  });

  it('should auto-increment versionNumber and set previousVersion', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const v1 = await index.addVersion(
      'file-2',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f2v1' }),
    );
    const v2 = await index.addVersion(
      'file-2',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f2v2' }),
    );
    const v3 = await index.addVersion(
      'file-2',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f2v3' }),
    );

    expect(v1.versionNumber).toBe(1);
    expect(v2.versionNumber).toBe(2);
    expect(v2.previousVersion).toBe('magnet:f2v1');
    expect(v3.versionNumber).toBe(3);
    expect(v3.previousVersion).toBe('magnet:f2v2');
  });

  it('should return version history in ascending order', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addVersion(
      'file-3',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f3v1' }),
    );
    await index.addVersion(
      'file-3',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f3v2' }),
    );
    await index.addVersion(
      'file-3',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f3v3' }),
    );

    const history = await index.getVersionHistory('file-3');
    expect(history).toHaveLength(3);
    expect(history[0].versionNumber).toBe(1);
    expect(history[1].versionNumber).toBe(2);
    expect(history[2].versionNumber).toBe(3);
  });

  it('should return latest version', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addVersion(
      'file-4',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f4v1' }),
    );
    await index.addVersion(
      'file-4',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f4v2' }),
    );

    const latest = await index.getLatestVersion('file-4');
    expect(latest).not.toBeNull();
    expect(latest!.versionNumber).toBe(2);
    expect(latest!.magnetUrl).toBe('magnet:f4v2');
  });

  it('should return null for unknown fileId', async () => {
    const { index } = makeCBLIndex();
    const latest = await index.getLatestVersion('nonexistent-file');
    expect(latest).toBeNull();
  });

  it('should exclude soft-deleted versions from history', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addVersion(
      'file-5',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f5v1' }),
    );
    await index.addVersion(
      'file-5',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f5v2' }),
    );
    await index.addVersion(
      'file-5',
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:f5v3' }),
    );

    await index.softDelete('magnet:f5v2');

    const history = await index.getVersionHistory('file-5');
    expect(history).toHaveLength(2);
    expect(history.map((e) => e.versionNumber)).toEqual([1, 3]);
  });
});

// ══════════════════════════════════════════════════════════════
// initialize (sequence counter recovery)
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – initialize', () => {
  it('should resume sequence counter from existing entries', async () => {
    const { index, store, db } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:init1' }),
    );
    await index.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:init2' }),
    );

    // Create a new CBLIndex instance pointing at the same db
    const index2 = new CBLIndex(db, store as any);
    await index2.initialize();

    const e3 = await index2.addEntry(
      makeEntry({ blockId1, blockId2, magnetUrl: 'magnet:init3' }),
    );
    // Should continue from 2, so next is 3
    expect(e3.sequenceNumber).toBe(3);
  });
});

// ══════════════════════════════════════════════════════════════
// snapshot / restoreFromSnapshot – see cblIndex.snapshot.spec.ts
// ══════════════════════════════════════════════════════════════
