/**
 * CBLIndex – merge logic unit tests.
 *
 * Tests the receiving side of cross-node CBL Index synchronization:
 * - mergeEntry(): idempotent merge, conflict detection
 * - mergeSoftDelete(): soft-delete propagation from remote peers
 *
 * Validates: Requirements 8.2, 8.3, 8.6
 */

import type { ICBLIndexEntry } from '@brightchain/brightchain-lib';
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

/** Build a full ICBLIndexEntry as if it came from a remote peer. */
function makeRemoteEntry(
  overrides: Partial<ICBLIndexEntry> = {},
): ICBLIndexEntry {
  return {
    _id: 'remote-entry-001',
    magnetUrl:
      'magnet:?xt=urn:brightchain:cbl&bs=256&b1=block-aaa-111&b2=block-bbb-222',
    blockId1: 'block-aaa-111',
    blockId2: 'block-bbb-222',
    blockSize: 256,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    visibility: CBLVisibility.Private,
    sequenceNumber: 10,
    ...overrides,
  };
}

// ══════════════════════════════════════════════════════════════
// Requirement 8.2: Idempotent merge of incoming entries
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – mergeEntry idempotent (Req 8.2)', () => {
  it('should insert a new entry when no matching magnet URL exists', async () => {
    const { index } = makeCBLIndex();
    const remote = makeRemoteEntry();

    const result = await index.mergeEntry(remote);

    expect(result.magnetUrl).toBe(remote.magnetUrl);
    expect(result.blockId1).toBe(remote.blockId1);
    expect(result.blockId2).toBe(remote.blockId2);
    expect(result.sequenceNumber).toBe(1); // local sequence
  });

  it('should skip duplicate when same magnet URL and same content exists', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // First: add via normal addEntry
    const original = await index.addEntry({
      magnetUrl: 'magnet:dup-test',
      blockId1,
      blockId2,
      blockSize: 256,
      createdAt: new Date(),
      visibility: CBLVisibility.Private,
    });

    // Second: merge the same content from a remote peer
    const remote = makeRemoteEntry({
      _id: 'remote-dup',
      magnetUrl: 'magnet:dup-test',
      blockId1,
      blockId2,
      blockSize: 256,
    });

    const result = await index.mergeEntry(remote);

    // Should return the existing entry, not create a new one
    expect(result._id).toBe(original._id);
    expect(result.sequenceNumber).toBe(original.sequenceNumber);
    expect(result.hasConflict).toBeUndefined();
  });

  it('should be idempotent: merging the same entry twice produces one entry', async () => {
    const { index } = makeCBLIndex();
    const remote = makeRemoteEntry({ magnetUrl: 'magnet:idempotent' });

    await index.mergeEntry(remote);
    await index.mergeEntry(remote);

    const results = await index.query({
      includeDeleted: true,
    });
    const matching = results.filter((e) => e.magnetUrl === 'magnet:idempotent');
    expect(matching).toHaveLength(1);
  });

  it('should assign a local sequence number to merged entries', async () => {
    const { index } = makeCBLIndex();

    const entry1 = await index.mergeEntry(
      makeRemoteEntry({
        _id: 'r1',
        magnetUrl: 'magnet:seq1',
        sequenceNumber: 99,
      }),
    );
    const entry2 = await index.mergeEntry(
      makeRemoteEntry({
        _id: 'r2',
        magnetUrl: 'magnet:seq2',
        sequenceNumber: 50,
      }),
    );

    // Local sequence numbers should be monotonically increasing
    expect(entry1.sequenceNumber).toBe(1);
    expect(entry2.sequenceNumber).toBe(2);
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 8.3: Conflict detection and preservation
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – mergeEntry conflict detection (Req 8.3)', () => {
  it('should flag conflict when same magnet URL has different blockId1', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    // Add original entry
    const original = await index.addEntry({
      magnetUrl: 'magnet:conflict-test',
      blockId1,
      blockId2,
      blockSize: 256,
      createdAt: new Date(),
      visibility: CBLVisibility.Private,
    });

    // Merge a remote entry with same magnet URL but different blockId1
    const remote = makeRemoteEntry({
      _id: 'remote-conflict',
      magnetUrl: 'magnet:conflict-test',
      blockId1: 'different-block-111',
      blockId2,
      blockSize: 256,
    });

    const result = await index.mergeEntry(remote);

    // The new entry should be flagged as conflict
    expect(result.hasConflict).toBe(true);
    expect(result.conflictsWith).toContain(original._id);

    // The original entry should also be flagged
    const allEntries = await index.query({ includeDeleted: true });
    const origEntry = allEntries.find((e) => e._id === original._id);
    expect(origEntry?.hasConflict).toBe(true);
    expect(origEntry?.conflictsWith).toContain(result._id);
  });

  it('should flag conflict when same magnet URL has different blockSize', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const original = await index.addEntry({
      magnetUrl: 'magnet:size-conflict',
      blockId1,
      blockId2,
      blockSize: 256,
      createdAt: new Date(),
      visibility: CBLVisibility.Private,
    });

    const remote = makeRemoteEntry({
      _id: 'remote-size-conflict',
      magnetUrl: 'magnet:size-conflict',
      blockId1,
      blockId2,
      blockSize: 512, // different size
    });

    const result = await index.mergeEntry(remote);

    expect(result.hasConflict).toBe(true);
    expect(result.conflictsWith).toContain(original._id);
  });

  it('should preserve both entries on conflict', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry({
      magnetUrl: 'magnet:preserve-both',
      blockId1,
      blockId2,
      blockSize: 256,
      createdAt: new Date(),
      visibility: CBLVisibility.Private,
    });

    await index.mergeEntry(
      makeRemoteEntry({
        _id: 'remote-preserve',
        magnetUrl: 'magnet:preserve-both',
        blockId1: 'different-block-xxx',
        blockId2,
        blockSize: 256,
      }),
    );

    // Both entries should exist
    const allEntries = await index.query({ includeDeleted: true });
    const matching = allEntries.filter(
      (e) => e.magnetUrl === 'magnet:preserve-both',
    );
    expect(matching).toHaveLength(2);
    expect(matching.every((e) => e.hasConflict === true)).toBe(true);
  });

  it('should not flag conflict when metadata differs but content is same', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    const original = await index.addEntry({
      magnetUrl: 'magnet:meta-diff',
      blockId1,
      blockId2,
      blockSize: 256,
      createdAt: new Date(),
      visibility: CBLVisibility.Private,
      metadata: { fileName: 'local.pdf' },
    });

    // Same content (blockId1, blockId2, blockSize) but different metadata
    const remote = makeRemoteEntry({
      _id: 'remote-meta-diff',
      magnetUrl: 'magnet:meta-diff',
      blockId1,
      blockId2,
      blockSize: 256,
      metadata: { fileName: 'remote.pdf' },
    });

    const result = await index.mergeEntry(remote);

    // Should be idempotent — same content means no conflict
    expect(result._id).toBe(original._id);
    expect(result.hasConflict).toBeUndefined();
  });
});

// ══════════════════════════════════════════════════════════════
// Requirement 8.6: Soft-delete propagation from remote peers
// ══════════════════════════════════════════════════════════════

describe('CBLIndex – mergeSoftDelete (Req 8.6)', () => {
  it('should soft-delete an existing entry with the remote timestamp', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry({
      magnetUrl: 'magnet:remote-del',
      blockId1,
      blockId2,
      blockSize: 256,
      createdAt: new Date(),
      visibility: CBLVisibility.Private,
    });

    const remoteDeletedAt = new Date('2025-06-01T12:00:00Z');
    await index.mergeSoftDelete('magnet:remote-del', remoteDeletedAt);

    // Entry should be soft-deleted
    const entry = await index.getByMagnetUrl('magnet:remote-del');
    expect(entry).toBeNull(); // not visible in default queries

    // But should exist with includeDeleted
    const allEntries = await index.query({ includeDeleted: true });
    const deleted = allEntries.find((e) => e.magnetUrl === 'magnet:remote-del');
    expect(deleted).toBeDefined();
    expect(deleted?.deletedAt).toEqual(remoteDeletedAt);
  });

  it('should be a no-op when entry does not exist locally', async () => {
    const { index } = makeCBLIndex();

    // Should not throw
    await expect(
      index.mergeSoftDelete('magnet:nonexistent', new Date()),
    ).resolves.toBeUndefined();
  });

  it('should be a no-op when entry is already soft-deleted', async () => {
    const { index, store } = makeCBLIndex();
    const { blockId1, blockId2 } = await seedBlocks(store);

    await index.addEntry({
      magnetUrl: 'magnet:already-del',
      blockId1,
      blockId2,
      blockSize: 256,
      createdAt: new Date(),
      visibility: CBLVisibility.Private,
    });

    // First soft-delete
    await index.softDelete('magnet:already-del');

    // Second soft-delete from remote — should not overwrite
    const secondDeletedAt = new Date('2025-06-01T00:00:00Z');
    await index.mergeSoftDelete('magnet:already-del', secondDeletedAt);

    const allEntries = await index.query({ includeDeleted: true });
    const entry = allEntries.find((e) => e.magnetUrl === 'magnet:already-del');
    expect(entry?.deletedAt).toBeDefined();
    // The original deletedAt should be preserved (not overwritten)
    expect(entry?.deletedAt).not.toEqual(secondDeletedAt);
  });

  it('should propagate soft-delete for entries received via merge', async () => {
    const { index } = makeCBLIndex();

    // First merge a remote entry
    await index.mergeEntry(
      makeRemoteEntry({
        magnetUrl: 'magnet:merge-then-del',
      }),
    );

    // Then propagate a soft-delete for it
    const deletedAt = new Date('2025-07-01T00:00:00Z');
    await index.mergeSoftDelete('magnet:merge-then-del', deletedAt);

    const entry = await index.getByMagnetUrl('magnet:merge-then-del');
    expect(entry).toBeNull();

    const allEntries = await index.query({ includeDeleted: true });
    const deleted = allEntries.find(
      (e) => e.magnetUrl === 'magnet:merge-then-del',
    );
    expect(deleted?.deletedAt).toEqual(deletedAt);
  });
});
