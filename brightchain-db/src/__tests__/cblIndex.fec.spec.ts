/**
 * CBLIndex FEC redundancy – unit tests.
 *
 * Tests that the CBLIndex generates FEC parity blocks for the collection's
 * metadata (head) block after mutations when parityCount > 0, and that
 * FEC failures don't break mutations.
 *
 * Validates: Requirement 7.1
 */

import type { ICBLIndexEntry } from '@brightchain/brightchain-lib';
import { CBLVisibility } from '@brightchain/brightchain-lib';
import { CBLIndex } from '../lib/cblIndex';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { MockBlockStore } from './helpers/mockBlockStore';

// ── Helpers ──────────────────────────────────────────────────

/**
 * Extended MockBlockStore that tracks generateParityBlocks calls
 * instead of throwing.
 */
class FecTrackingMockBlockStore extends MockBlockStore {
  public parityCallLog: Array<{ key: string; parityCount: number }> = [];
  public shouldFailParity = false;

  constructor() {
    super();
    // Override generateParityBlocks with a tracking implementation.
    // The base MockBlockStore declares it with no params, but IBlockStore
    // expects (key, parityCount). We assign directly to satisfy the interface.
    (this as Record<string, unknown>)['generateParityBlocks'] = async (
      key: string,
      parityCount: number,
    ): Promise<string[]> => {
      this.parityCallLog.push({ key, parityCount });
      if (this.shouldFailParity) {
        throw new Error('Simulated FEC failure');
      }
      return Array.from(
        { length: parityCount },
        (_, i) => `parity-${key}-${i}`,
      );
    };
  }
}

/** Create a fresh db + store + CBLIndex with optional parityCount. */
function makeCBLIndex(parityCount = 0): {
  index: CBLIndex;
  store: FecTrackingMockBlockStore;
  db: BrightChainDb;
} {
  const store = new FecTrackingMockBlockStore();
  const registry = InMemoryHeadRegistry.createIsolated();
  const db = new BrightChainDb(store as never, {
    name: 'testdb',
    headRegistry: registry,
  });
  const index = new CBLIndex(db, store as never, { parityCount });
  return { index, store, db };
}

/** Seed two blocks in the store and return their IDs. */
async function seedBlocks(
  store: FecTrackingMockBlockStore,
): Promise<{ blockId1: string; blockId2: string }> {
  const blockId1 = 'block-aaa-111';
  const blockId2 = 'block-bbb-222';
  await store.put(blockId1, new Uint8Array([1, 2, 3]));
  await store.put(blockId2, new Uint8Array([4, 5, 6]));
  return { blockId1, blockId2 };
}

/** Build a minimal valid entry. */
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

// ── Tests ────────────────────────────────────────────────────

describe('CBLIndex FEC redundancy (Requirement 7.1)', () => {
  describe('default behavior (parityCount = 0)', () => {
    it('should not call generateParityBlocks when parityCount is 0', async () => {
      const { index, store } = makeCBLIndex(0);
      await seedBlocks(store);
      await index.addEntry(makeEntry());

      expect(store.parityCallLog).toHaveLength(0);
    });

    it('should not call generateParityBlocks when no options provided', async () => {
      // Construct without options at all
      const store = new FecTrackingMockBlockStore();
      const registry = InMemoryHeadRegistry.createIsolated();
      const db = new BrightChainDb(store as never, {
        name: 'testdb',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as never);
      await store.put('block-aaa-111', new Uint8Array([1, 2, 3]));
      await store.put('block-bbb-222', new Uint8Array([4, 5, 6]));

      await index.addEntry(makeEntry());
      expect(store.parityCallLog).toHaveLength(0);
    });
  });

  describe('FEC parity generation (parityCount > 0)', () => {
    it('should call generateParityBlocks after addEntry', async () => {
      const { index, store } = makeCBLIndex(3);
      await seedBlocks(store);

      await index.addEntry(makeEntry());

      expect(store.parityCallLog).toHaveLength(1);
      expect(store.parityCallLog[0].parityCount).toBe(3);
      // The key should be a non-empty string (the head block ID)
      expect(store.parityCallLog[0].key).toBeTruthy();
    });

    it('should call generateParityBlocks after softDelete', async () => {
      const { index, store } = makeCBLIndex(2);
      await seedBlocks(store);

      const entry = await index.addEntry(makeEntry());
      store.parityCallLog = []; // reset after addEntry

      await index.softDelete(entry.magnetUrl);

      expect(store.parityCallLog).toHaveLength(1);
      expect(store.parityCallLog[0].parityCount).toBe(2);
    });

    it('should call generateParityBlocks after shareWith', async () => {
      const { index, store } = makeCBLIndex(2);
      await seedBlocks(store);

      const entry = await index.addEntry(makeEntry({ createdBy: 'user-a' }));
      store.parityCallLog = []; // reset

      await index.shareWith(entry.magnetUrl, 'user-b');

      expect(store.parityCallLog).toHaveLength(1);
      expect(store.parityCallLog[0].parityCount).toBe(2);
    });

    it('should call generateParityBlocks after addVersion (via addEntry)', async () => {
      const { index, store } = makeCBLIndex(1);
      await seedBlocks(store);

      store.parityCallLog = [];
      await index.addVersion('file-1', makeEntry());

      // addVersion delegates to addEntry, which generates parity
      expect(store.parityCallLog).toHaveLength(1);
      expect(store.parityCallLog[0].parityCount).toBe(1);
    });

    it('should pass the head block ID to generateParityBlocks', async () => {
      const { index, store, db } = makeCBLIndex(2);
      await seedBlocks(store);

      await index.addEntry(makeEntry());

      const headBlockId = db
        .getHeadRegistry()
        .getHead('testdb', '__cbl_index__');
      expect(headBlockId).toBeTruthy();
      expect(store.parityCallLog[0].key).toBe(headBlockId);
    });
  });

  describe('FEC failure resilience', () => {
    it('should not fail addEntry when FEC parity generation fails', async () => {
      const { index, store } = makeCBLIndex(2);
      await seedBlocks(store);
      store.shouldFailParity = true;

      // Suppress console.warn during this test
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      const entry = await index.addEntry(makeEntry());

      expect(entry).toBeDefined();
      expect(entry._id).toBeTruthy();
      expect(entry.sequenceNumber).toBe(1);

      // Verify warning was logged
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('[CBLIndex] FEC parity generation failed'),
        expect.stringContaining('Simulated FEC failure'),
      );

      warnSpy.mockRestore();
    });

    it('should not fail softDelete when FEC parity generation fails', async () => {
      const { index, store } = makeCBLIndex(2);
      await seedBlocks(store);

      const entry = await index.addEntry(makeEntry());
      store.shouldFailParity = true;

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      // softDelete should succeed despite FEC failure
      await expect(index.softDelete(entry.magnetUrl)).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should not fail shareWith when FEC parity generation fails', async () => {
      const { index, store } = makeCBLIndex(2);
      await seedBlocks(store);

      const entry = await index.addEntry(makeEntry({ createdBy: 'user-a' }));
      store.shouldFailParity = true;

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

      await expect(
        index.shareWith(entry.magnetUrl, 'user-b'),
      ).resolves.toBeUndefined();

      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
