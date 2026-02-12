/**
 * @fileoverview Unit tests for BrightChainDb pool integration.
 *
 * Tests:
 * 1. Constructor with poolId wraps store in PooledStoreAdapter
 * 2. Constructor without poolId uses store directly
 * 3. Two databases with different pools sharing same store are isolated
 *
 * Requirements: 10.1, 10.2, 10.3
 */

import {
  BlockSize,
  DEFAULT_POOL,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import { HeadRegistry } from '../lib/collection';
import { BrightChainDb } from '../lib/database';

/**
 * Collect all hashes from an async iterable into an array.
 */
async function collectAsyncIterable(
  iterable: AsyncIterable<string>,
): Promise<string[]> {
  const results: string[] = [];
  for await (const item of iterable) {
    results.push(item);
  }
  return results;
}

describe('BrightChainDb pool integration', () => {
  // ══════════════════════════════════════════════════════════════
  // Test 1: Constructor with poolId wraps store in adapter
  // ══════════════════════════════════════════════════════════════

  describe('constructor with poolId', () => {
    it('should route inserted document blocks into the configured pool', async () => {
      const poolId = 'test-pool-alpha';
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const registry = HeadRegistry.createIsolated();

      const db = new BrightChainDb(store, {
        name: 'pooled-db',
        headRegistry: registry,
        poolId,
      });

      const coll = db.collection('users');
      await coll.insertOne({ _id: 'u1', name: 'Alice' });

      // Blocks should exist in the configured pool
      const blocksInPool = await collectAsyncIterable(
        store.listBlocksInPool(poolId),
      );
      expect(blocksInPool.length).toBeGreaterThanOrEqual(1);

      // Each block should be individually verifiable via hasInPool
      for (const hash of blocksInPool) {
        expect(await store.hasInPool(poolId, hash)).toBe(true);
      }
    });

    it('should not place blocks in the default pool when poolId is specified', async () => {
      const poolId = 'isolated-pool';
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const registry = HeadRegistry.createIsolated();

      const db = new BrightChainDb(store, {
        name: 'pooled-db',
        headRegistry: registry,
        poolId,
      });

      const coll = db.collection('items');
      await coll.insertOne({ _id: 'i1', value: 'hello' });

      // Blocks should NOT be in the default pool
      const blocksInDefault = await collectAsyncIterable(
        store.listBlocksInPool(DEFAULT_POOL),
      );
      expect(blocksInDefault.length).toBe(0);

      // Blocks should be in the configured pool
      const blocksInPool = await collectAsyncIterable(
        store.listBlocksInPool(poolId),
      );
      expect(blocksInPool.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Test 2: Constructor without poolId uses store directly
  // ══════════════════════════════════════════════════════════════

  describe('constructor without poolId', () => {
    it('should place blocks in the default pool via legacy methods', async () => {
      const store = new PooledMemoryBlockStore(BlockSize.Small);
      const registry = HeadRegistry.createIsolated();

      const db = new BrightChainDb(store, {
        name: 'unpooled-db',
        headRegistry: registry,
        // No poolId — uses store directly
      });

      const coll = db.collection('docs');
      await coll.insertOne({ _id: 'd1', content: 'test document' });

      // Legacy methods delegate to DEFAULT_POOL, so blocks end up there
      const blocksInDefault = await collectAsyncIterable(
        store.listBlocksInPool(DEFAULT_POOL),
      );
      expect(blocksInDefault.length).toBeGreaterThanOrEqual(1);

      for (const hash of blocksInDefault) {
        expect(await store.hasInPool(DEFAULT_POOL, hash)).toBe(true);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════
  // Test 3: Two databases with different pools are isolated
  // ══════════════════════════════════════════════════════════════

  describe('two databases with different pools sharing same store', () => {
    it('should isolate blocks between pools', async () => {
      const poolA = 'tenant-alpha';
      const poolB = 'tenant-beta';
      const store = new PooledMemoryBlockStore(BlockSize.Small);

      // Each db gets its own isolated HeadRegistry to avoid collection name collisions
      const registryA = HeadRegistry.createIsolated();
      const registryB = HeadRegistry.createIsolated();

      const dbA = new BrightChainDb(store, {
        name: 'db-alpha',
        headRegistry: registryA,
        poolId: poolA,
      });

      const dbB = new BrightChainDb(store, {
        name: 'db-beta',
        headRegistry: registryB,
        poolId: poolB,
      });

      // Insert different documents in each database
      const collA = dbA.collection('records');
      await collA.insertOne({ _id: 'a1', data: 'alpha-record' });

      const collB = dbB.collection('records');
      await collB.insertOne({ _id: 'b1', data: 'beta-record' });

      // Collect blocks from each pool
      const blocksA = await collectAsyncIterable(store.listBlocksInPool(poolA));
      const blocksB = await collectAsyncIterable(store.listBlocksInPool(poolB));

      // Both pools should have blocks
      expect(blocksA.length).toBeGreaterThanOrEqual(1);
      expect(blocksB.length).toBeGreaterThanOrEqual(1);

      // Blocks in pool A should NOT be in pool B
      for (const hash of blocksA) {
        expect(await store.hasInPool(poolA, hash)).toBe(true);
        expect(await store.hasInPool(poolB, hash)).toBe(false);
      }

      // Blocks in pool B should NOT be in pool A
      for (const hash of blocksB) {
        expect(await store.hasInPool(poolB, hash)).toBe(true);
        expect(await store.hasInPool(poolA, hash)).toBe(false);
      }
    });

    it("should list only each pool's blocks via listBlocksInPool", async () => {
      const poolA = 'workspace-one';
      const poolB = 'workspace-two';
      const store = new PooledMemoryBlockStore(BlockSize.Small);

      const registryA = HeadRegistry.createIsolated();
      const registryB = HeadRegistry.createIsolated();

      const dbA = new BrightChainDb(store, {
        name: 'ws-one',
        headRegistry: registryA,
        poolId: poolA,
      });

      const dbB = new BrightChainDb(store, {
        name: 'ws-two',
        headRegistry: registryB,
        poolId: poolB,
      });

      // Insert multiple documents in each
      const collA = dbA.collection('notes');
      await collA.insertOne({ _id: 'n1', text: 'note one' });
      await collA.insertOne({ _id: 'n2', text: 'note two' });

      const collB = dbB.collection('notes');
      await collB.insertOne({ _id: 'n3', text: 'note three' });

      const blocksA = await collectAsyncIterable(store.listBlocksInPool(poolA));
      const blocksB = await collectAsyncIterable(store.listBlocksInPool(poolB));

      // Pool A has more documents, so should have at least as many blocks
      expect(blocksA.length).toBeGreaterThanOrEqual(2);
      expect(blocksB.length).toBeGreaterThanOrEqual(1);

      // The two sets of hashes should be completely disjoint
      const setA = new Set(blocksA);
      const setB = new Set(blocksB);
      for (const hash of setA) {
        expect(setB.has(hash)).toBe(false);
      }
      for (const hash of setB) {
        expect(setA.has(hash)).toBe(false);
      }

      // listPools should include both
      const pools = await store.listPools();
      expect(pools).toContain(poolA);
      expect(pools).toContain(poolB);
    });
  });
});
