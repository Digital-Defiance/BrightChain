/**
 * CBLIndex snapshot and restore – unit tests.
 *
 * Tests that the CBLIndex can:
 * - Create snapshots (serialize state, store as CBL, return magnet URL)
 * - Restore from snapshots (retrieve CBL, deserialize, replace state)
 * - Auto-snapshot after a configurable mutation count threshold
 * - Handle auto-snapshot failures gracefully (best-effort)
 *
 * Validates: Requirements 7.2, 7.3
 */

import type { ICBLIndexEntry } from '@brightchain/brightchain-lib';
import { CBLVisibility } from '@brightchain/brightchain-lib';
import { CBLIndex } from '../lib/cblIndex';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { MockBlockStore } from './helpers/mockBlockStore';

// ── Helpers ──────────────────────────────────────────────────

/** Create a fresh db + store + CBLIndex with optional snapshot interval. */
function makeCBLIndex(snapshotInterval = 0): {
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
  const index = new CBLIndex(db, store as never, { snapshotInterval });
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

/** Build a minimal valid entry with unique magnet URL. */
function makeEntry(
  overrides: Partial<Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'>> = {},
  suffix = '',
): Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'> {
  return {
    magnetUrl: `magnet:?xt=urn:brightchain:cbl&bs=256&b1=block-aaa-111&b2=block-bbb-222${suffix}`,
    blockId1: 'block-aaa-111',
    blockId2: 'block-bbb-222',
    blockSize: 256,
    createdAt: new Date('2025-01-15T10:00:00Z'),
    visibility: CBLVisibility.Private,
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────

describe('CBLIndex snapshot and restore (Requirements 7.2, 7.3)', () => {
  describe('snapshot()', () => {
    it('should serialize index state and return a magnet URL', async () => {
      const { index, store } = makeCBLIndex();
      await seedBlocks(store);

      await index.addEntry(makeEntry({}, '&v=1'));
      await index.addEntry(makeEntry({}, '&v=2'));

      const magnetUrl = await index.snapshot();

      expect(magnetUrl).toBeDefined();
      expect(typeof magnetUrl).toBe('string');
      expect(magnetUrl).toContain('magnet:');
    });

    it('should store the snapshot data as a CBL in the block store', async () => {
      const { index, store } = makeCBLIndex();
      await seedBlocks(store);

      const initialBlockCount = store.size;
      await index.addEntry(makeEntry());

      await index.snapshot();

      // Snapshot should have added blocks to the store (the CBL components)
      expect(store.size).toBeGreaterThan(initialBlockCount);
    });

    it('should include all entries including soft-deleted in the snapshot', async () => {
      const { index, store } = makeCBLIndex();
      await seedBlocks(store);

      const entry1 = await index.addEntry(makeEntry({}, '&v=1'));
      await index.addEntry(makeEntry({}, '&v=2'));
      await index.softDelete(entry1.magnetUrl);

      const magnetUrl = await index.snapshot();

      // Parse and retrieve the snapshot data to verify contents
      const components = store.parseCBLMagnetUrl(magnetUrl);
      const data = await store.retrieveCBL(
        components.blockId1,
        components.blockId2,
      );
      const json = new TextDecoder().decode(data);
      const snapshotData = JSON.parse(json);

      // Should have both entries (including the soft-deleted one)
      expect(snapshotData.entries).toHaveLength(2);
      expect(snapshotData.sequenceCounter).toBe(2);
    });

    it('should preserve the sequence counter in the snapshot', async () => {
      const { index, store } = makeCBLIndex();
      await seedBlocks(store);

      await index.addEntry(makeEntry({}, '&v=1'));
      await index.addEntry(makeEntry({}, '&v=2'));
      await index.addEntry(makeEntry({}, '&v=3'));

      const magnetUrl = await index.snapshot();

      const components = store.parseCBLMagnetUrl(magnetUrl);
      const data = await store.retrieveCBL(
        components.blockId1,
        components.blockId2,
      );
      const snapshotData = JSON.parse(new TextDecoder().decode(data));

      expect(snapshotData.sequenceCounter).toBe(3);
    });
  });

  describe('restoreFromSnapshot()', () => {
    it('should restore index state from a snapshot magnet URL', async () => {
      const { index, store } = makeCBLIndex();
      await seedBlocks(store);

      // Add entries and snapshot
      await index.addEntry(makeEntry({ createdBy: 'user-a' }, '&v=1'));
      await index.addEntry(makeEntry({ createdBy: 'user-b' }, '&v=2'));
      const magnetUrl = await index.snapshot();

      // Create a new index on the same store (simulating restart)
      const registry2 = InMemoryHeadRegistry.createIsolated();
      const db2 = new BrightChainDb(store as never, {
        name: 'testdb2',
        headRegistry: registry2,
      });
      const index2 = new CBLIndex(db2, store as never);

      // Restore from snapshot
      await index2.restoreFromSnapshot(magnetUrl);

      // Verify entries are restored
      const entries = await index2.query({ includeDeleted: true });
      expect(entries).toHaveLength(2);
    });

    it('should clear existing state before restoring', async () => {
      const { index, store } = makeCBLIndex();
      await seedBlocks(store);

      // Add one entry and snapshot
      await index.addEntry(makeEntry({}, '&v=1'));
      const magnetUrl = await index.snapshot();

      // Add more entries after snapshot
      await index.addEntry(makeEntry({}, '&v=2'));
      await index.addEntry(makeEntry({}, '&v=3'));

      // Verify we have 3 entries now
      const beforeRestore = await index.query({});
      expect(beforeRestore).toHaveLength(3);

      // Restore from snapshot (which only had 1 entry)
      await index.restoreFromSnapshot(magnetUrl);

      // Should only have the 1 entry from the snapshot
      const afterRestore = await index.query({});
      expect(afterRestore).toHaveLength(1);
    });

    it('should restore soft-deleted entries with their deletedAt timestamps', async () => {
      const { index, store } = makeCBLIndex();
      await seedBlocks(store);

      const entry = await index.addEntry(makeEntry({}, '&v=1'));
      await index.softDelete(entry.magnetUrl);
      const magnetUrl = await index.snapshot();

      // Restore into a new index
      const registry2 = InMemoryHeadRegistry.createIsolated();
      const db2 = new BrightChainDb(store as never, {
        name: 'testdb2',
        headRegistry: registry2,
      });
      const index2 = new CBLIndex(db2, store as never);
      await index2.restoreFromSnapshot(magnetUrl);

      // The entry should be soft-deleted
      const allEntries = await index2.query({ includeDeleted: true });
      expect(allEntries).toHaveLength(1);
      expect(allEntries[0].deletedAt).toBeDefined();

      // Should not appear in default queries
      const activeEntries = await index2.query({});
      expect(activeEntries).toHaveLength(0);
    });

    it('should restore the sequence counter so new entries continue numbering', async () => {
      const { index, store } = makeCBLIndex();
      await seedBlocks(store);

      await index.addEntry(makeEntry({}, '&v=1'));
      await index.addEntry(makeEntry({}, '&v=2'));
      const magnetUrl = await index.snapshot();

      // Restore into a new index
      const registry2 = InMemoryHeadRegistry.createIsolated();
      const db2 = new BrightChainDb(store as never, {
        name: 'testdb2',
        headRegistry: registry2,
      });
      const index2 = new CBLIndex(db2, store as never);
      await index2.restoreFromSnapshot(magnetUrl);

      // Add a new entry — its sequence number should continue from 2
      const newEntry = await index2.addEntry(makeEntry({}, '&v=3'));
      expect(newEntry.sequenceNumber).toBe(3);
    });
  });

  describe('auto-snapshot (Requirement 7.3)', () => {
    it('should trigger auto-snapshot after reaching the configured interval', async () => {
      // Set interval to 3 mutations for easy testing
      const { index, store } = makeCBLIndex(3);
      await seedBlocks(store);

      // Spy on storeCBLWithWhitening to detect snapshot calls
      const storeSpy = jest.spyOn(store, 'storeCBLWithWhitening');

      await index.addEntry(makeEntry({}, '&v=1'));
      await index.addEntry(makeEntry({}, '&v=2'));
      expect(storeSpy).not.toHaveBeenCalled();

      // Third mutation should trigger auto-snapshot
      await index.addEntry(makeEntry({}, '&v=3'));
      expect(storeSpy).toHaveBeenCalledTimes(1);

      storeSpy.mockRestore();
    });

    it('should reset mutation counter after auto-snapshot', async () => {
      const { index, store } = makeCBLIndex(2);
      await seedBlocks(store);

      const storeSpy = jest.spyOn(store, 'storeCBLWithWhitening');

      // First 2 mutations trigger auto-snapshot
      await index.addEntry(makeEntry({}, '&v=1'));
      await index.addEntry(makeEntry({}, '&v=2'));
      expect(storeSpy).toHaveBeenCalledTimes(1);

      // Next 2 mutations should trigger another auto-snapshot
      await index.addEntry(makeEntry({}, '&v=3'));
      expect(storeSpy).toHaveBeenCalledTimes(1); // not yet

      await index.addEntry(makeEntry({}, '&v=4'));
      expect(storeSpy).toHaveBeenCalledTimes(2); // second auto-snapshot

      storeSpy.mockRestore();
    });

    it('should count softDelete and shareWith as mutations for auto-snapshot', async () => {
      const { index, store } = makeCBLIndex(3);
      await seedBlocks(store);

      const storeSpy = jest.spyOn(store, 'storeCBLWithWhitening');

      const entry = await index.addEntry(
        makeEntry({ createdBy: 'user-a' }, '&v=1'),
      );
      await index.softDelete(entry.magnetUrl);
      expect(storeSpy).not.toHaveBeenCalled();

      // Add another entry with unique magnet URL for shareWith
      const _entry2 = await index.addEntry(
        makeEntry({ createdBy: 'user-a' }, '&v=2'),
      );
      // 3rd mutation triggers auto-snapshot
      expect(storeSpy).toHaveBeenCalledTimes(1);

      storeSpy.mockRestore();
    });

    it('should not trigger auto-snapshot when interval is 0 (disabled)', async () => {
      const { index, store } = makeCBLIndex(0);
      await seedBlocks(store);

      const storeSpy = jest.spyOn(store, 'storeCBLWithWhitening');

      // Add many entries — no auto-snapshot should fire
      for (let i = 0; i < 200; i++) {
        await index.addEntry(makeEntry({}, `&v=${i}`));
      }

      expect(storeSpy).not.toHaveBeenCalled();
      storeSpy.mockRestore();
    });

    it('should not break mutations when auto-snapshot fails', async () => {
      const { index, store } = makeCBLIndex(2);
      await seedBlocks(store);

      // Make storeCBLWithWhitening fail after the first call
      const originalMethod = store.storeCBLWithWhitening.bind(store);
      let callCount = 0;
      jest
        .spyOn(store, 'storeCBLWithWhitening')
        .mockImplementation(async (data: Uint8Array) => {
          callCount++;
          if (callCount >= 1) {
            throw new Error('Simulated CBL storage failure');
          }
          return originalMethod(data);
        });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // First two mutations trigger auto-snapshot which fails
      const entry1 = await index.addEntry(makeEntry({}, '&v=1'));
      const entry2 = await index.addEntry(makeEntry({}, '&v=2'));

      // Entries should still be created successfully
      expect(entry1).toBeDefined();
      expect(entry1._id).toBeTruthy();
      expect(entry2).toBeDefined();
      expect(entry2._id).toBeTruthy();

      // Warning should have been logged
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CBLIndex] Auto-snapshot failed'),
        expect.stringContaining('Simulated CBL storage failure'),
      );

      warnSpy.mockRestore();
    });
  });

  describe('snapshot + restore round-trip', () => {
    it('should preserve entry metadata through snapshot and restore', async () => {
      const { index, store } = makeCBLIndex();
      await seedBlocks(store);

      const originalEntry = await index.addEntry(
        makeEntry({
          createdBy: 'user-x',
          poolId: 'pool-1',
          visibility: CBLVisibility.Shared,
          sharedWith: ['user-y'],
          userCollection: 'My Files',
          metadata: {
            fileName: 'test.pdf',
            mimeType: 'application/pdf',
            originalSize: 1024,
            tags: ['important', 'docs'],
          },
        }),
      );

      const magnetUrl = await index.snapshot();

      // Restore into a new index
      const registry2 = InMemoryHeadRegistry.createIsolated();
      const db2 = new BrightChainDb(store as never, {
        name: 'testdb2',
        headRegistry: registry2,
      });
      const index2 = new CBLIndex(db2, store as never);
      await index2.restoreFromSnapshot(magnetUrl);

      const restored = await index2.query({ includeDeleted: true });
      expect(restored).toHaveLength(1);

      const restoredEntry = restored[0];
      expect(restoredEntry._id).toBe(originalEntry._id);
      expect(restoredEntry.magnetUrl).toBe(originalEntry.magnetUrl);
      expect(restoredEntry.blockId1).toBe(originalEntry.blockId1);
      expect(restoredEntry.blockId2).toBe(originalEntry.blockId2);
      expect(restoredEntry.blockSize).toBe(originalEntry.blockSize);
      expect(restoredEntry.createdBy).toBe('user-x');
      expect(restoredEntry.poolId).toBe('pool-1');
      expect(restoredEntry.visibility).toBe(CBLVisibility.Shared);
      expect(restoredEntry.sharedWith).toEqual(['user-y']);
      expect(restoredEntry.userCollection).toBe('My Files');
      expect(restoredEntry.metadata?.fileName).toBe('test.pdf');
      expect(restoredEntry.metadata?.mimeType).toBe('application/pdf');
      expect(restoredEntry.metadata?.originalSize).toBe(1024);
      expect(restoredEntry.metadata?.tags).toEqual(['important', 'docs']);
      expect(restoredEntry.sequenceNumber).toBe(originalEntry.sequenceNumber);
    });

    it('should preserve version history through snapshot and restore', async () => {
      const { index, store } = makeCBLIndex();
      await seedBlocks(store);

      await index.addVersion('file-1', makeEntry({}, '&v=1'));
      await index.addVersion('file-1', makeEntry({}, '&v=2'));
      await index.addVersion('file-1', makeEntry({}, '&v=3'));

      const magnetUrl = await index.snapshot();

      // Restore into a new index
      const registry2 = InMemoryHeadRegistry.createIsolated();
      const db2 = new BrightChainDb(store as never, {
        name: 'testdb2',
        headRegistry: registry2,
      });
      const index2 = new CBLIndex(db2, store as never);
      await index2.restoreFromSnapshot(magnetUrl);

      const history = await index2.getVersionHistory('file-1');
      expect(history).toHaveLength(3);
      expect(history[0].versionNumber).toBe(1);
      expect(history[1].versionNumber).toBe(2);
      expect(history[2].versionNumber).toBe(3);
      expect(history[0].previousVersion).toBeUndefined();
      expect(history[1].previousVersion).toBe(history[0].magnetUrl);
      expect(history[2].previousVersion).toBe(history[1].magnetUrl);
    });
  });
});
