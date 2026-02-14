/**
 * CBLIndex – reconciliation unit tests.
 *
 * Tests the CBL index manifest generation and reconciliation logic:
 * - getCBLIndexManifest(): generates a manifest of (magnetUrl, sequenceNumber) pairs for a pool
 * - reconcileCBLIndex(): compares local vs remote manifests and merges missing entries
 *
 * Validates: Requirements 8.4
 */

import type {
  CBLIndexManifest,
  ICBLIndexEntry,
} from '@brightchain/brightchain-lib';
import { CBLVisibility } from '@brightchain/brightchain-lib';
import { CBLIndex } from '../lib/cblIndex';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { MockBlockStore } from './helpers/mockBlockStore';

/** Create a fresh db + store + CBLIndex. */
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

// ══════════════════════════════════════════════════════════════
// Requirement 8.4: getCBLIndexManifest
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – getCBLIndexManifest (Req 8.4)', () => {
  it('should return an empty manifest for a pool with no entries', async () => {
    const { index } = makeCBLIndex();

    const manifest = await index.getCBLIndexManifest('pool-a', 'node-1');

    expect(manifest.poolId).toBe('pool-a');
    expect(manifest.nodeId).toBe('node-1');
    expect(manifest.entries).toHaveLength(0);
    expect(manifest.generatedAt).toBeInstanceOf(Date);
  });

  it('should return manifest entries for the specified pool only', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // Add entries to two different pools
    await index.addEntry({
      magnetUrl: 'magnet:pool-a-entry-1',
      blockId1,
      blockId2,
      blockSize: 256,
      poolId: 'pool-a',
      createdAt: new Date(),
      visibility: CBLVisibility.Public,
    });

    await seedBlocks(store, 'block-ccc-333', 'block-ddd-444');
    await index.addEntry({
      magnetUrl: 'magnet:pool-b-entry-1',
      blockId1: 'block-ccc-333',
      blockId2: 'block-ddd-444',
      blockSize: 256,
      poolId: 'pool-b',
      createdAt: new Date(),
      visibility: CBLVisibility.Public,
    });

    const manifest = await index.getCBLIndexManifest('pool-a', 'node-1');

    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0].magnetUrl).toBe('magnet:pool-a-entry-1');
    expect(typeof manifest.entries[0].sequenceNumber).toBe('number');
  });

  it('should exclude soft-deleted entries from the manifest', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry({
      magnetUrl: 'magnet:active-entry',
      blockId1,
      blockId2,
      blockSize: 256,
      poolId: 'pool-a',
      createdAt: new Date(),
      visibility: CBLVisibility.Public,
    });

    await seedBlocks(store, 'block-eee-555', 'block-fff-666');
    await index.addEntry({
      magnetUrl: 'magnet:deleted-entry',
      blockId1: 'block-eee-555',
      blockId2: 'block-fff-666',
      blockSize: 256,
      poolId: 'pool-a',
      createdAt: new Date(),
      visibility: CBLVisibility.Public,
    });

    await index.softDelete('magnet:deleted-entry');

    const manifest = await index.getCBLIndexManifest('pool-a', 'node-1');

    expect(manifest.entries).toHaveLength(1);
    expect(manifest.entries[0].magnetUrl).toBe('magnet:active-entry');
  });

  it('should include multiple entries with correct sequence numbers', async () => {
    const { index, store } = makeCBLIndex();

    // Add 3 entries to the same pool
    for (let i = 0; i < 3; i++) {
      const id1 = `block-${i}-a`;
      const id2 = `block-${i}-b`;
      await seedBlocks(store, id1, id2);
      await index.addEntry({
        magnetUrl: `magnet:entry-${i}`,
        blockId1: id1,
        blockId2: id2,
        blockSize: 256,
        poolId: 'pool-a',
        createdAt: new Date(),
        visibility: CBLVisibility.Public,
      });
    }

    const manifest = await index.getCBLIndexManifest('pool-a', 'node-1');

    expect(manifest.entries).toHaveLength(3);
    // Sequence numbers should be monotonically increasing
    const seqNums = manifest.entries.map((e) => e.sequenceNumber);
    for (let i = 1; i < seqNums.length; i++) {
      expect(seqNums[i]).toBeGreaterThan(seqNums[i - 1]);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 8.4: reconcileCBLIndex
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – reconcileCBLIndex (Req 8.4)', () => {
  /** Build a remote manifest with the given entries. */
  function makeRemoteManifest(
    poolId: string,
    entries: Array<{ magnetUrl: string; sequenceNumber: number }>,
  ): CBLIndexManifest {
    return {
      poolId,
      nodeId: 'remote-node',
      entries,
      generatedAt: new Date(),
    };
  }

  /** Build a full ICBLIndexEntry as if it came from a remote peer. */
  function makeRemoteEntry(
    magnetUrl: string,
    blockId1: string,
    blockId2: string,
    poolId: string,
  ): ICBLIndexEntry {
    return {
      _id: `remote-${magnetUrl}`,
      magnetUrl,
      blockId1,
      blockId2,
      blockSize: 256,
      poolId,
      createdAt: new Date('2025-01-15T10:00:00Z'),
      visibility: CBLVisibility.Public,
      sequenceNumber: 10,
    };
  }

  it('should merge entries missing locally from the remote manifest', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // Local has one entry
    await index.addEntry({
      magnetUrl: 'magnet:local-entry',
      blockId1,
      blockId2,
      blockSize: 256,
      poolId: 'pool-a',
      createdAt: new Date(),
      visibility: CBLVisibility.Public,
    });

    // Remote manifest has two entries: the local one + a new one
    const remoteManifest = makeRemoteManifest('pool-a', [
      { magnetUrl: 'magnet:local-entry', sequenceNumber: 1 },
      { magnetUrl: 'magnet:remote-only-entry', sequenceNumber: 5 },
    ]);

    const remoteEntry = makeRemoteEntry(
      'magnet:remote-only-entry',
      blockId1,
      blockId2,
      'pool-a',
    );

    const fetchEntry = jest.fn().mockResolvedValue(remoteEntry);

    const merged = await index.reconcileCBLIndex(
      'pool-a',
      remoteManifest,
      fetchEntry,
    );

    expect(merged).toBe(1);
    expect(fetchEntry).toHaveBeenCalledTimes(1);
    expect(fetchEntry).toHaveBeenCalledWith('magnet:remote-only-entry');

    // Verify the entry was actually merged
    const result = await index.getByMagnetUrl('magnet:remote-only-entry');
    expect(result).not.toBeNull();
    expect(result?.magnetUrl).toBe('magnet:remote-only-entry');
  });

  it('should not fetch entries that already exist locally', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry({
      magnetUrl: 'magnet:shared-entry',
      blockId1,
      blockId2,
      blockSize: 256,
      poolId: 'pool-a',
      createdAt: new Date(),
      visibility: CBLVisibility.Public,
    });

    const remoteManifest = makeRemoteManifest('pool-a', [
      { magnetUrl: 'magnet:shared-entry', sequenceNumber: 1 },
    ]);

    const fetchEntry = jest.fn();

    const merged = await index.reconcileCBLIndex(
      'pool-a',
      remoteManifest,
      fetchEntry,
    );

    expect(merged).toBe(0);
    expect(fetchEntry).not.toHaveBeenCalled();
  });

  it('should handle empty remote manifest gracefully', async () => {
    const { index } = makeCBLIndex();

    const remoteManifest = makeRemoteManifest('pool-a', []);
    const fetchEntry = jest.fn();

    const merged = await index.reconcileCBLIndex(
      'pool-a',
      remoteManifest,
      fetchEntry,
    );

    expect(merged).toBe(0);
    expect(fetchEntry).not.toHaveBeenCalled();
  });

  it('should skip entries when fetchEntry returns null', async () => {
    const { index } = makeCBLIndex();

    const remoteManifest = makeRemoteManifest('pool-a', [
      { magnetUrl: 'magnet:unfetchable-entry', sequenceNumber: 1 },
    ]);

    const fetchEntry = jest.fn().mockResolvedValue(null);

    const merged = await index.reconcileCBLIndex(
      'pool-a',
      remoteManifest,
      fetchEntry,
    );

    expect(merged).toBe(0);
    expect(fetchEntry).toHaveBeenCalledTimes(1);
  });

  it('should include soft-deleted local entries when comparing manifests', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // Add and soft-delete an entry locally
    await index.addEntry({
      magnetUrl: 'magnet:deleted-locally',
      blockId1,
      blockId2,
      blockSize: 256,
      poolId: 'pool-a',
      createdAt: new Date(),
      visibility: CBLVisibility.Public,
    });
    await index.softDelete('magnet:deleted-locally');

    // Remote manifest has the same entry
    const remoteManifest = makeRemoteManifest('pool-a', [
      { magnetUrl: 'magnet:deleted-locally', sequenceNumber: 1 },
    ]);

    const fetchEntry = jest.fn();

    const merged = await index.reconcileCBLIndex(
      'pool-a',
      remoteManifest,
      fetchEntry,
    );

    // Should NOT try to fetch — the entry exists locally (even if soft-deleted)
    expect(merged).toBe(0);
    expect(fetchEntry).not.toHaveBeenCalled();
  });

  it('should merge multiple missing entries from a single reconciliation', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const remoteManifest = makeRemoteManifest('pool-a', [
      { magnetUrl: 'magnet:missing-1', sequenceNumber: 1 },
      { magnetUrl: 'magnet:missing-2', sequenceNumber: 2 },
      { magnetUrl: 'magnet:missing-3', sequenceNumber: 3 },
    ]);

    const fetchEntry = jest
      .fn()
      .mockImplementation((magnetUrl: string) =>
        Promise.resolve(
          makeRemoteEntry(magnetUrl, blockId1, blockId2, 'pool-a'),
        ),
      );

    const merged = await index.reconcileCBLIndex(
      'pool-a',
      remoteManifest,
      fetchEntry,
    );

    expect(merged).toBe(3);
    expect(fetchEntry).toHaveBeenCalledTimes(3);

    // Verify all entries were merged
    for (let i = 1; i <= 3; i++) {
      const entry = await index.getByMagnetUrl(`magnet:missing-${i}`);
      expect(entry).not.toBeNull();
    }
  });
});
