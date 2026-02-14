/**
 * @fileoverview Property-based test for database pool routing.
 *
 * **Feature: pool-based-storage-isolation, Property 12: Database pool routing**
 *
 * *For any* document inserted into a BrightChainDb instance configured with a poolId,
 * the underlying `IPooledBlockStore` contains the document's block in the configured
 * pool (verifiable via `hasInPool`).
 *
 * **Validates: Requirements 10.2**
 */

import {
  BlockSize,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { BrightChainDb } from '../lib/database';
import { InMemoryHeadRegistry } from '../lib/headRegistry';

// Property tests can be slow due to async operations
jest.setTimeout(60000);

/**
 * Arbitrary that generates valid pool ID strings:
 * 1-64 characters from [a-zA-Z0-9_-]
 */
const validPoolIdArb: fc.Arbitrary<string> = fc.stringMatching(
  /^[a-zA-Z0-9_-]{1,64}$/,
);

/**
 * Arbitrary that generates simple document objects with a string _id and
 * at least one data field. We keep documents small to avoid block-size issues.
 */
const simpleDocArb = fc
  .tuple(
    fc.stringMatching(/^[a-f0-9]{8,16}$/),
    fc.string({ minLength: 1, maxLength: 64 }),
  )
  .map(([id, value]) => ({ _id: id, value }));

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

describe('Database Pool Property Tests', () => {
  describe('Property 12: Database pool routing', () => {
    /**
     * **Property 12: Database pool routing**
     *
     * For any document inserted into a BrightChainDb instance configured with
     * a poolId, the underlying IPooledBlockStore contains at least one block
     * in the configured pool (verifiable via listBlocksInPool / hasInPool).
     *
     * **Validates: Requirements 10.2**
     */
    it('documents inserted via a pooled BrightChainDb are stored in the configured pool', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPoolIdArb,
          simpleDocArb,
          async (poolId: string, doc: { _id: string; value: string }) => {
            // 1. Create a PooledMemoryBlockStore (in-memory)
            const store = new PooledMemoryBlockStore(BlockSize.Small);

            // 2. Create a BrightChainDb with that store and the random poolId
            const registry = InMemoryHeadRegistry.createIsolated();
            const db = new BrightChainDb(store, {
              name: 'test-pool-routing',
              headRegistry: registry,
              poolId,
            });

            // 3. Insert a document into a collection
            const coll = db.collection('items');
            await coll.insertOne(doc);

            // 4. Verify the underlying store has blocks in the configured pool
            const blocksInPool = await collectAsyncIterable(
              store.listBlocksInPool(poolId),
            );

            // After inserting a document, the collection writes:
            //   - the document block
            //   - the collection metadata block
            // Both should be in the configured pool.
            expect(blocksInPool.length).toBeGreaterThanOrEqual(1);

            // Additionally verify each block is individually findable via hasInPool
            for (const hash of blocksInPool) {
              const exists = await store.hasInPool(poolId, hash);
              expect(exists).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Documents inserted via a pooled BrightChainDb should NOT appear in
     * other pools. This verifies the routing is correct — blocks go to
     * the configured pool and nowhere else.
     *
     * **Validates: Requirements 10.2**
     */
    it('documents inserted via a pooled BrightChainDb do not appear in other pools', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPoolIdArb,
          validPoolIdArb,
          simpleDocArb,
          async (
            poolA: string,
            poolB: string,
            doc: { _id: string; value: string },
          ) => {
            // Ensure the two pools are distinct
            fc.pre(poolA !== poolB);

            const store = new PooledMemoryBlockStore(BlockSize.Small);
            const registry = InMemoryHeadRegistry.createIsolated();

            // Create db scoped to poolA
            const db = new BrightChainDb(store, {
              name: 'test-isolation',
              headRegistry: registry,
              poolId: poolA,
            });

            const coll = db.collection('items');
            await coll.insertOne(doc);

            // Blocks should exist in poolA
            const blocksInA = await collectAsyncIterable(
              store.listBlocksInPool(poolA),
            );
            expect(blocksInA.length).toBeGreaterThanOrEqual(1);

            // No blocks should exist in poolB
            const blocksInB = await collectAsyncIterable(
              store.listBlocksInPool(poolB),
            );
            expect(blocksInB.length).toBe(0);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 13: Database drop deletes pool', () => {
    /**
     * **Property 13: Database drop deletes pool**
     *
     * For any BrightChainDb instance configured with a poolId, dropping the
     * database causes `listPools()` on the underlying store to no longer
     * include that poolId.
     *
     * **Validates: Requirements 10.4**
     */
    it('dropping a pooled database removes the pool from listPools', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPoolIdArb,
          simpleDocArb,
          async (poolId: string, doc: { _id: string; value: string }) => {
            // 1. Create a PooledMemoryBlockStore
            const store = new PooledMemoryBlockStore(BlockSize.Small);

            // 2. Create a BrightChainDb with the random poolId
            const registry = InMemoryHeadRegistry.createIsolated();
            const db = new BrightChainDb(store, {
              name: 'test-drop',
              headRegistry: registry,
              poolId,
            });

            // 3. Insert a document so the pool has blocks
            const coll = db.collection('items');
            await coll.insertOne(doc);

            // 4. Verify pool exists in listPools
            const poolsBefore = await store.listPools();
            expect(poolsBefore).toContain(poolId);

            // 5. Drop the database
            await db.dropDatabase();

            // 6. Verify pool no longer in listPools
            const poolsAfter = await store.listPools();
            expect(poolsAfter).not.toContain(poolId);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
