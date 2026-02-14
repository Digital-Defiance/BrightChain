/**
 * CBLIndex – file version history unit tests.
 *
 * Tests addVersion auto-numbering, getVersionHistory ordering,
 * getLatestVersion retrieval, first-version handling, soft-deleted
 * version chain integrity, and fileId queryability alongside other filters.
 *
 * Validates: Requirements 27.4, 27.5, 27.6, 27.7, 27.8, 27.9
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
): Promise<{ blockId1: string; blockId2: string }> {
  const blockId1 = 'block-aaa-111';
  const blockId2 = 'block-bbb-222';
  await store.put(blockId1, new Uint8Array([1, 2, 3]));
  await store.put(blockId2, new Uint8Array([4, 5, 6]));
  return { blockId1, blockId2 };
}

/** Build a minimal valid entry for addVersion (omits version-specific fields). */
function makeVersionEntry(
  overrides: Partial<
    Omit<
      ICBLIndexEntry,
      '_id' | 'sequenceNumber' | 'fileId' | 'versionNumber' | 'previousVersion'
    >
  > = {},
): Omit<
  ICBLIndexEntry,
  '_id' | 'sequenceNumber' | 'fileId' | 'versionNumber' | 'previousVersion'
> {
  return {
    magnetUrl: `magnet:v-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    blockId1: 'block-aaa-111',
    blockId2: 'block-bbb-222',
    blockSize: 256,
    createdAt: new Date(),
    visibility: CBLVisibility.Private,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// Requirement 27.4: addVersion auto-assigns versionNumber and previousVersion
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – addVersion auto-numbering (Req 27.4)', () => {
  it('should auto-assign sequential version numbers', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-auto-num';

    const v1 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:an-v1' }),
    );
    const v2 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:an-v2' }),
    );
    const v3 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:an-v3' }),
    );

    expect(v1.versionNumber).toBe(1);
    expect(v2.versionNumber).toBe(2);
    expect(v3.versionNumber).toBe(3);
  });

  it('should set previousVersion to the prior version magnet URL', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-prev-ver';

    const v1 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:pv-v1' }),
    );
    const v2 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:pv-v2' }),
    );
    const v3 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:pv-v3' }),
    );

    expect(v1.previousVersion).toBeUndefined();
    expect(v2.previousVersion).toBe('magnet:pv-v1');
    expect(v3.previousVersion).toBe('magnet:pv-v2');
  });

  it('should set fileId on all versions', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-id-check';

    const v1 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:fid-v1' }),
    );
    const v2 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:fid-v2' }),
    );

    expect(v1.fileId).toBe(fileId);
    expect(v2.fileId).toBe(fileId);
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 27.5: First version handling
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – first version handling (Req 27.5)', () => {
  it('should treat first version as version 1 with no previousVersion', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-first';

    const v1 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:first-v1' }),
    );

    expect(v1.versionNumber).toBe(1);
    expect(v1.previousVersion).toBeUndefined();
    expect(v1.fileId).toBe(fileId);
  });

  it('should handle multiple independent files starting at version 1', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const fileA = await index.addVersion(
      'file-a',
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:a-v1' }),
    );
    const fileB = await index.addVersion(
      'file-b',
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:b-v1' }),
    );

    expect(fileA.versionNumber).toBe(1);
    expect(fileA.previousVersion).toBeUndefined();
    expect(fileB.versionNumber).toBe(1);
    expect(fileB.previousVersion).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 27.6: getVersionHistory returns versions in order
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – getVersionHistory (Req 27.6)', () => {
  it('should return all versions sorted by versionNumber ascending', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-history';

    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:h-v1' }),
    );
    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:h-v2' }),
    );
    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:h-v3' }),
    );

    const history = await index.getVersionHistory(fileId);

    expect(history).toHaveLength(3);
    expect(history[0].versionNumber).toBe(1);
    expect(history[1].versionNumber).toBe(2);
    expect(history[2].versionNumber).toBe(3);
  });

  it('should return empty array for unknown fileId', async () => {
    const { index } = makeCBLIndex();
    const history = await index.getVersionHistory('nonexistent-file');
    expect(history).toHaveLength(0);
  });

  it('should not include versions from other files', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addVersion(
      'file-x',
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:x-v1' }),
    );
    await index.addVersion(
      'file-y',
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:y-v1' }),
    );
    await index.addVersion(
      'file-x',
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:x-v2' }),
    );

    const historyX = await index.getVersionHistory('file-x');
    const historyY = await index.getVersionHistory('file-y');

    expect(historyX).toHaveLength(2);
    expect(historyX.every((e) => e.fileId === 'file-x')).toBe(true);
    expect(historyY).toHaveLength(1);
    expect(historyY[0].fileId).toBe('file-y');
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 27.7: getLatestVersion via sort + limit 1
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – getLatestVersion (Req 27.7)', () => {
  it('should return the version with the highest versionNumber', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-latest';

    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:l-v1' }),
    );
    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:l-v2' }),
    );
    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:l-v3' }),
    );

    const latest = await index.getLatestVersion(fileId);

    expect(latest).not.toBeNull();
    expect(latest!.versionNumber).toBe(3);
    expect(latest!.magnetUrl).toBe('magnet:l-v3');
  });

  it('should return null for unknown fileId', async () => {
    const { index } = makeCBLIndex();
    const latest = await index.getLatestVersion('nonexistent-file');
    expect(latest).toBeNull();
  });

  it('should return the only version when there is just one', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-single';

    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:s-v1' }),
    );

    const latest = await index.getLatestVersion(fileId);

    expect(latest).not.toBeNull();
    expect(latest!.versionNumber).toBe(1);
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 27.8: Soft-deleted versions don't break the chain
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – soft-deleted version chain integrity (Req 27.8)', () => {
  it('should preserve previousVersion pointers when a version is soft-deleted', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-softdel';

    const v1 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:sd-v1' }),
    );
    const v2 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:sd-v2' }),
    );
    const _v3 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:sd-v3' }),
    );

    // Soft-delete version 2
    await index.softDelete(v2.magnetUrl);

    // getVersionHistory without includeDeleted should skip v2
    const historyActive = await index.getVersionHistory(fileId);
    expect(historyActive).toHaveLength(2);
    expect(historyActive[0].versionNumber).toBe(1);
    expect(historyActive[1].versionNumber).toBe(3);

    // But the previousVersion pointers remain intact
    expect(historyActive[0].previousVersion).toBeUndefined(); // v1
    expect(historyActive[1].previousVersion).toBe(v2.magnetUrl); // v3 still points to v2

    // getVersionHistory with includeDeleted should return all 3
    const historyAll = await index.getVersionHistory(fileId, true);
    expect(historyAll).toHaveLength(3);
    expect(historyAll[0].versionNumber).toBe(1);
    expect(historyAll[1].versionNumber).toBe(2);
    expect(historyAll[2].versionNumber).toBe(3);

    // Chain integrity: v1 -> v2 -> v3
    expect(historyAll[0].previousVersion).toBeUndefined();
    expect(historyAll[1].previousVersion).toBe(v1.magnetUrl);
    expect(historyAll[2].previousVersion).toBe(v2.magnetUrl);
  });

  it('should continue numbering correctly after soft-deleting the latest version', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-del-latest';

    const _v1 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:dl-v1' }),
    );
    const v2 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:dl-v2' }),
    );

    // Soft-delete the latest version
    await index.softDelete(v2.magnetUrl);

    // Adding a new version should still be version 3 (not 2 again)
    // because addVersion considers soft-deleted versions
    const v3 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:dl-v3' }),
    );

    expect(v3.versionNumber).toBe(3);
    expect(v3.previousVersion).toBe(v2.magnetUrl);
  });

  it('should not modify previousVersion pointers of subsequent versions on soft-delete', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-no-modify';

    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:nm-v1' }),
    );
    const v2 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:nm-v2' }),
    );
    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:nm-v3' }),
    );

    // Record v3's previousVersion before soft-deleting v2
    const historyBefore = await index.getVersionHistory(fileId);
    const v3Before = historyBefore.find((e) => e.versionNumber === 3);
    expect(v3Before!.previousVersion).toBe(v2.magnetUrl);

    // Soft-delete v2
    await index.softDelete(v2.magnetUrl);

    // v3's previousVersion should still point to v2
    const historyAfter = await index.getVersionHistory(fileId, true);
    const v3After = historyAfter.find((e) => e.versionNumber === 3);
    expect(v3After!.previousVersion).toBe(v2.magnetUrl);
  });

  it('getLatestVersion should skip soft-deleted versions by default', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-latest-skip';

    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:ls-v1' }),
    );
    const v2 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:ls-v2' }),
    );

    await index.softDelete(v2.magnetUrl);

    const latest = await index.getLatestVersion(fileId);
    expect(latest).not.toBeNull();
    expect(latest!.versionNumber).toBe(1);
    expect(latest!.magnetUrl).toBe('magnet:ls-v1');
  });

  it('getLatestVersion with includeDeleted should return soft-deleted latest', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);
    const fileId = 'file-latest-incl';

    await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:li-v1' }),
    );
    const v2 = await index.addVersion(
      fileId,
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:li-v2' }),
    );

    await index.softDelete(v2.magnetUrl);

    const latest = await index.getLatestVersion(fileId, true);
    expect(latest).not.toBeNull();
    expect(latest!.versionNumber).toBe(2);
    expect(latest!.magnetUrl).toBe('magnet:li-v2');
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 27.9: fileId queryable alongside other filters
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – fileId queryable with other filters (Req 27.9)', () => {
  it('should filter by fileId and poolId together', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addVersion(
      'file-pool-a',
      makeVersionEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:fpa-v1',
        poolId: 'pool-alpha',
      }),
    );
    await index.addVersion(
      'file-pool-a',
      makeVersionEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:fpa-v2',
        poolId: 'pool-alpha',
      }),
    );
    await index.addVersion(
      'file-pool-b',
      makeVersionEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:fpb-v1',
        poolId: 'pool-beta',
      }),
    );

    const results = await index.query({
      fileId: 'file-pool-a',
      poolId: 'pool-alpha',
    });

    expect(results).toHaveLength(2);
    expect(results.every((e) => e.fileId === 'file-pool-a')).toBe(true);
    expect(results.every((e) => e.poolId === 'pool-alpha')).toBe(true);
  });

  it('should filter by fileId and createdBy together', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addVersion(
      'file-creator',
      makeVersionEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:fc-v1',
        createdBy: 'alice',
      }),
    );
    await index.addVersion(
      'file-creator',
      makeVersionEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:fc-v2',
        createdBy: 'alice',
      }),
    );
    // Different file, same creator
    await index.addVersion(
      'file-other',
      makeVersionEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:fo-v1',
        createdBy: 'alice',
      }),
    );

    const results = await index.query({
      fileId: 'file-creator',
      createdBy: 'alice',
    });

    expect(results).toHaveLength(2);
    expect(results.every((e) => e.fileId === 'file-creator')).toBe(true);
  });

  it('should filter by fileId and mimeType together', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addVersion(
      'file-mime',
      makeVersionEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:fm-v1',
        metadata: { mimeType: 'application/pdf' },
      }),
    );
    await index.addVersion(
      'file-mime',
      makeVersionEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:fm-v2',
        metadata: { mimeType: 'text/plain' },
      }),
    );

    const results = await index.query({
      fileId: 'file-mime',
      mimeType: 'application/pdf',
    });

    expect(results).toHaveLength(1);
    expect(results[0].magnetUrl).toBe('magnet:fm-v1');
  });

  it('should sort by versionNumber when querying by fileId', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addVersion(
      'file-sort',
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:fs-v1' }),
    );
    await index.addVersion(
      'file-sort',
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:fs-v2' }),
    );
    await index.addVersion(
      'file-sort',
      makeVersionEntry({ blockId1, blockId2, magnetUrl: 'magnet:fs-v3' }),
    );

    const results = await index.query({
      fileId: 'file-sort',
      sortBy: 'versionNumber',
      sortOrder: 'desc',
    });

    expect(results).toHaveLength(3);
    expect(results[0].versionNumber).toBe(3);
    expect(results[1].versionNumber).toBe(2);
    expect(results[2].versionNumber).toBe(1);
  });

  it('should combine fileId filter with visibility access control', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addVersion(
      'file-vis',
      makeVersionEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:fv-v1',
        createdBy: 'alice',
        visibility: CBLVisibility.Private,
      }),
    );
    await index.addVersion(
      'file-vis',
      makeVersionEntry({
        blockId1,
        blockId2,
        magnetUrl: 'magnet:fv-v2',
        createdBy: 'alice',
        visibility: CBLVisibility.Public,
      }),
    );

    // Bob can only see the public version
    const bobResults = await index.query({
      fileId: 'file-vis',
      requestingUserId: 'bob',
    });
    expect(bobResults).toHaveLength(1);
    expect(bobResults[0].magnetUrl).toBe('magnet:fv-v2');

    // Alice can see both
    const aliceResults = await index.query({
      fileId: 'file-vis',
      requestingUserId: 'alice',
    });
    expect(aliceResults).toHaveLength(2);
  });
});
