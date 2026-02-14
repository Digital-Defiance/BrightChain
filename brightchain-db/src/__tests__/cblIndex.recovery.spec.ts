/**
 * CBLIndex recovery – unit tests.
 *
 * Tests that the CBLIndex can recover its state on startup via:
 *   1. Snapshot recovery (preferred)
 *   2. FEC parity rebuild
 *   3. Partial rebuild from block store scan (metadata lost)
 *   4. Recovery ordering (snapshot > FEC > scan)
 *
 * Validates: Requirements 7.4, 7.5
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { ICBLIndexEntry } from '@brightchain/brightchain-lib';
import { CBLVisibility } from '@brightchain/brightchain-lib';
import { CBLIndex } from '../lib/cblIndex';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';
import { MockBlockStore, MockPooledBlockStore } from './helpers/mockBlockStore';

// ══════════════════════════════════════════════════════════════
// Extended mocks for recovery testing
// ══════════════════════════════════════════════════════════════

class RecoverableMockBlockStore extends MockBlockStore {
  public recoverBlockResult = { success: false };
  public recoverBlockCalled = false;
  private recoverBlockIdToRestore: string | undefined;

  setRecoverTarget(blockId: string): void {
    this.recoverBlockIdToRestore = blockId;
  }

  override async recoverBlock(): Promise<any> {
    this.recoverBlockCalled = true;
    if (this.recoverBlockResult.success && this.recoverBlockIdToRestore) {
      await this.put(
        this.recoverBlockIdToRestore,
        new Uint8Array([0x01, 0x02]),
      );
    }
    return this.recoverBlockResult;
  }
}

class RecoverablePooledMockBlockStore extends MockPooledBlockStore {
  public recoverBlockResult = { success: false };
  public recoverBlockCalled = false;

  override async recoverBlock(): Promise<any> {
    this.recoverBlockCalled = true;
    return this.recoverBlockResult;
  }
}

// ══════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════

async function seedBlocks(
  store: MockBlockStore,
): Promise<{ blockId1: string; blockId2: string }> {
  const blockId1 = 'block-aaa-111';
  const blockId2 = 'block-bbb-222';
  await store.put(blockId1, new Uint8Array([1, 2, 3]));
  await store.put(blockId2, new Uint8Array([4, 5, 6]));
  return { blockId1, blockId2 };
}

function makeEntry(
  suffix = '',
  overrides: Partial<Omit<ICBLIndexEntry, '_id' | 'sequenceNumber'>> = {},
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

// ══════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════

describe('CBLIndex recovery (Requirements 7.4, 7.5)', () => {
  // ── Recovery from snapshot (via restoreFromSnapshot) ─────────

  describe('recovery from snapshot', () => {
    it('should recover entries from a snapshot', async () => {
      const store = new MockBlockStore();
      const registry = InMemoryHeadRegistry.createIsolated();
      const db = new BrightChainDb(store as any, {
        name: 'testdb',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any);
      await seedBlocks(store);

      await index.addEntry(makeEntry('&v=1'));
      await index.addEntry(makeEntry('&v=2'));
      const magnetUrl = await index.snapshot();

      // Restore into a fresh index on the same store
      const db2 = new BrightChainDb(store as any, {
        name: 'testdb2',
        headRegistry: registry,
      });
      const index2 = new CBLIndex(db2, store as any);
      await index2.restoreFromSnapshot(magnetUrl);

      const entries = await index2.query({});
      expect(entries).toHaveLength(2);
    });

    it('should restore the sequence counter so new entries continue numbering', async () => {
      const store = new MockBlockStore();
      const registry = InMemoryHeadRegistry.createIsolated();
      const db = new BrightChainDb(store as any, {
        name: 'testdb',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any);
      await seedBlocks(store);

      await index.addEntry(makeEntry('&v=1'));
      await index.addEntry(makeEntry('&v=2'));
      await index.addEntry(makeEntry('&v=3'));
      const magnetUrl = await index.snapshot();

      const db2 = new BrightChainDb(store as any, {
        name: 'testdb-seq',
        headRegistry: registry,
      });
      const index2 = new CBLIndex(db2, store as any);
      await index2.restoreFromSnapshot(magnetUrl);

      const newEntry = await index2.addEntry(makeEntry('&v=4'));
      expect(newEntry.sequenceNumber).toBe(4);
    });

    it('should recover soft-deleted entries from snapshot', async () => {
      const store = new MockBlockStore();
      const registry = InMemoryHeadRegistry.createIsolated();
      const db = new BrightChainDb(store as any, {
        name: 'testdb',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any);
      await seedBlocks(store);

      const entry = await index.addEntry(makeEntry('&v=1'));
      await index.softDelete(entry.magnetUrl);
      const magnetUrl = await index.snapshot();

      const db2 = new BrightChainDb(store as any, {
        name: 'testdb-del',
        headRegistry: registry,
      });
      const index2 = new CBLIndex(db2, store as any);
      await index2.restoreFromSnapshot(magnetUrl);

      expect(await index2.query({})).toHaveLength(0);
      const all = await index2.query({ includeDeleted: true });
      expect(all).toHaveLength(1);
      expect(all[0].deletedAt).toBeDefined();
    });

    it('should persist snapshot magnet URL in head registry for recovery', async () => {
      const store = new MockBlockStore();
      const registry = InMemoryHeadRegistry.createIsolated();
      const db = new BrightChainDb(store as any, {
        name: 'testdb',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any);
      await seedBlocks(store);

      await index.addEntry(makeEntry('&v=1'));
      const magnetUrl = await index.snapshot();

      // Verify the snapshot magnet URL is stored in the head registry
      const storedMagnet = registry.getHead('testdb', '__cbl_index_snapshot__');
      expect(storedMagnet).toBe(magnetUrl);
    });
  });

  // ── Recovery from FEC parity ────────────────────────────────

  describe('recovery from FEC parity', () => {
    it('should attempt FEC recovery when no snapshot is available', async () => {
      const store = new RecoverableMockBlockStore();
      store.recoverBlockResult = { success: true };
      store.setRecoverTarget('head-block-123');
      const registry = InMemoryHeadRegistry.createIsolated();
      await registry.setHead('testdb-fec', '__cbl_index__', 'head-block-123');

      const db = new BrightChainDb(store as any, {
        name: 'testdb-fec',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any, { enableRecovery: true });

      const infoSpy = jest.spyOn(console, 'info').mockImplementation();
      await index.initialize();
      infoSpy.mockRestore();

      expect(store.recoverBlockCalled).toBe(true);
    });

    it('should fall through when FEC recovery fails on non-pooled store', async () => {
      const store = new RecoverableMockBlockStore();
      store.recoverBlockResult = { success: false };
      const registry = InMemoryHeadRegistry.createIsolated();
      await registry.setHead(
        'testdb-fec-fail',
        '__cbl_index__',
        'head-block-missing',
      );

      const db = new BrightChainDb(store as any, {
        name: 'testdb-fec-fail',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any, { enableRecovery: true });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      await index.initialize();
      warnSpy.mockRestore();
      errorSpy.mockRestore();

      // Non-pooled store can't do block scan, so no entries recovered
      const entries = await index.query({});
      expect(entries).toHaveLength(0);
    });
  });

  // ── Partial rebuild from block store scan ───────────────────

  describe('partial rebuild from block store scan', () => {
    it('should scan pooled block store for CBL-like blocks', async () => {
      const store = new RecoverablePooledMockBlockStore();
      store.recoverBlockResult = { success: false };
      const registry = InMemoryHeadRegistry.createIsolated();

      const cblData1 = new Uint8Array([0xbc, 0x01, 0x02, 0x03, 0x04]);
      const cblData2 = new Uint8Array([0xbc, 0x05, 0x06, 0x07, 0x08]);
      const nonCblData = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04]);

      await store.putInPool('test-pool', cblData1);
      await store.putInPool('test-pool', cblData2);
      await store.putInPool('test-pool', nonCblData);

      const db = new BrightChainDb(store as any, {
        name: 'testdb-scan',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any, { enableRecovery: true });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await index.initialize();

      // The warning is a single concatenated string
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('partial rebuild from block store scan'),
      );
      warnSpy.mockRestore();

      const entries = await index.query({ includeDeleted: true });
      expect(entries).toHaveLength(2);

      for (const e of entries) {
        expect(e.magnetUrl).toBeDefined();
        expect(e.blockId1).toBeDefined();
        expect(e.blockSize).toBeGreaterThan(0);
        expect(e.poolId).toBe('test-pool');
        // No user metadata recovered in partial rebuild
        expect(e.metadata).toBeUndefined();
        expect(e.createdBy).toBeUndefined();
        expect(e.userCollection).toBeUndefined();
      }
    });

    it('should log warning about lost metadata during partial rebuild', async () => {
      const store = new RecoverablePooledMockBlockStore();
      store.recoverBlockResult = { success: false };
      const registry = InMemoryHeadRegistry.createIsolated();

      await store.putInPool(
        'pool-a',
        new Uint8Array([0xbc, 0x01, 0x02, 0x03, 0x04]),
      );

      const db = new BrightChainDb(store as any, {
        name: 'testdb-warn',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any, { enableRecovery: true });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await index.initialize();

      // Verify the warning mentions metadata loss
      const warnCalls = warnSpy.mock.calls.map((args) => args.join(' '));
      const hasMetadataWarning = warnCalls.some(
        (msg) =>
          msg.includes('User metadata') &&
          msg.includes('partial rebuild from block store scan'),
      );
      expect(hasMetadataWarning).toBe(true);

      warnSpy.mockRestore();
    });

    it('should not recover non-CBL blocks during scan', async () => {
      const store = new RecoverablePooledMockBlockStore();
      store.recoverBlockResult = { success: false };
      const registry = InMemoryHeadRegistry.createIsolated();

      await store.putInPool('pool-a', new Uint8Array([0x00, 0x01, 0x02, 0x03]));
      await store.putInPool('pool-a', new Uint8Array([0xff, 0xfe, 0xfd, 0xfc]));

      const db = new BrightChainDb(store as any, {
        name: 'testdb-nocbl',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any, { enableRecovery: true });

      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      await index.initialize();
      errorSpy.mockRestore();

      const entries = await index.query({ includeDeleted: true });
      expect(entries).toHaveLength(0);
    });

    it('should skip blocks that are too small during scan', async () => {
      const store = new RecoverablePooledMockBlockStore();
      store.recoverBlockResult = { success: false };
      const registry = InMemoryHeadRegistry.createIsolated();

      // CBL prefix but too small (< 4 bytes)
      await store.putInPool('pool-a', new Uint8Array([0xbc, 0x01, 0x02]));
      // Valid CBL-like block
      await store.putInPool(
        'pool-a',
        new Uint8Array([0xbc, 0x01, 0x02, 0x03, 0x04]),
      );

      const db = new BrightChainDb(store as any, {
        name: 'testdb-small',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any, { enableRecovery: true });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      await index.initialize();
      warnSpy.mockRestore();

      const entries = await index.query({ includeDeleted: true });
      expect(entries).toHaveLength(1);
    });
  });

  // ── Recovery ordering ───────────────────────────────────────

  describe('recovery ordering (snapshot preferred over FEC over scan)', () => {
    it('should use snapshot when available, skipping FEC', async () => {
      // Use a non-pooled store so block scan can't run
      const store = new RecoverableMockBlockStore();
      store.recoverBlockResult = { success: false };
      const registry = InMemoryHeadRegistry.createIsolated();

      // Create a snapshot with known entries using a separate index
      const setupStore = new MockBlockStore();
      // Share the same underlying block data
      const setupRegistry = InMemoryHeadRegistry.createIsolated();
      const setupDb = new BrightChainDb(setupStore as any, {
        name: 'setup',
        headRegistry: setupRegistry,
      });
      const setupIndex = new CBLIndex(setupDb, setupStore as any);
      await seedBlocks(setupStore);
      await setupIndex.addEntry(makeEntry('&v=snap1'));
      await setupIndex.addEntry(makeEntry('&v=snap2'));
      const magnetUrl = await setupIndex.snapshot();

      // Copy all blocks from setupStore to the test store
      for (const [key, data] of setupStore.blocks) {
        await store.put(key, data);
      }

      // Set the snapshot key and a fake FEC head
      await registry.setHead(
        'testdb-order',
        '__cbl_index_snapshot__',
        magnetUrl,
      );
      await registry.setHead('testdb-order', '__cbl_index__', 'fake-head');

      const db = new BrightChainDb(store as any, {
        name: 'testdb-order',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any, { enableRecovery: true });

      const infoSpy = jest.spyOn(console, 'info').mockImplementation();
      await index.initialize();
      infoSpy.mockRestore();

      const entries = await index.query({});
      expect(entries).toHaveLength(2);

      // FEC should NOT have been attempted
      expect(store.recoverBlockCalled).toBe(false);
    });

    it('should fall through to FEC when snapshot is unavailable', async () => {
      const store = new RecoverableMockBlockStore();
      store.recoverBlockResult = { success: false };
      const registry = InMemoryHeadRegistry.createIsolated();
      await registry.setHead('testdb-nofec', '__cbl_index__', 'head-block-xyz');

      const db = new BrightChainDb(store as any, {
        name: 'testdb-nofec',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any, { enableRecovery: true });

      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const errorSpy = jest.spyOn(console, 'error').mockImplementation();
      await index.initialize();
      warnSpy.mockRestore();
      errorSpy.mockRestore();

      expect(store.recoverBlockCalled).toBe(true);
    });

    it('should not attempt recovery when enableRecovery is false', async () => {
      const store = new RecoverablePooledMockBlockStore();
      const registry = InMemoryHeadRegistry.createIsolated();

      await store.putInPool(
        'pool-z',
        new Uint8Array([0xbc, 0x01, 0x02, 0x03, 0x04]),
      );

      const db = new BrightChainDb(store as any, {
        name: 'testdb-norecovery',
        headRegistry: registry,
      });
      const index = new CBLIndex(db, store as any, {
        enableRecovery: false,
      });
      await index.initialize();

      const entries = await index.query({ includeDeleted: true });
      expect(entries).toHaveLength(0);
    });
  });
});
