/**
 * @fileoverview Property-based test for PooledStoreAdapter random block routing.
 *
 * **Feature: pool-scoped-whitening, Property 3: PooledStoreAdapter routes random blocks through pool**
 *
 * For any PooledStoreAdapter configured with PoolId P and any inner
 * IPooledBlockStore containing blocks in multiple pools, calling
 * `getRandomBlocks(count)` on the adapter SHALL return only checksums
 * that exist in pool P on the inner store.
 *
 * **Validates: Requirements 2.1, 2.3, 8.4**
 */

import {
  BlockSize,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { PooledStoreAdapter } from './pooledStoreAdapter';

// Property tests can be slow due to async operations
jest.setTimeout(60000);

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Valid pool ID strings matching /^[a-zA-Z0-9_-]{1,64}$/ */
const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

/** Two or more distinct valid pool IDs */
const arbDistinctPoolIds = fc
  .uniqueArray(arbPoolId, { minLength: 2, maxLength: 5 })
  .filter((ids) => new Set(ids).size >= 2);

/** A small block size suitable for fast property tests */
const arbBlockSize: fc.Arbitrary<BlockSize> = fc.constantFrom(
  BlockSize.Message, // 512 bytes
  BlockSize.Tiny, // 1024 bytes
);

/** Reasonable block count per pool for test scenarios */
const arbBlockCount = fc.integer({ min: 1, max: 10 });

/** Reasonable request count */
const arbRequestCount = fc.integer({ min: 1, max: 15 });

// ---------------------------------------------------------------------------
// Property 3: PooledStoreAdapter routes random blocks through pool
// ---------------------------------------------------------------------------

describe('PooledStoreAdapter Pool Routing Property Tests', () => {
  describe('Property 3: PooledStoreAdapter routes random blocks through pool', () => {
    /**
     * **Feature: pool-scoped-whitening, Property 3: PooledStoreAdapter routes random blocks through pool**
     *
     * For any PooledStoreAdapter configured with PoolId P and any inner
     * IPooledBlockStore containing blocks in multiple pools, calling
     * `getRandomBlocks(count)` on the adapter SHALL return only checksums
     * that exist in pool P on the inner store.
     *
     * **Validates: Requirements 2.1, 2.3, 8.4**
     */
    it('getRandomBlocks on adapter returns only checksums from the configured pool', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbDistinctPoolIds,
          arbBlockSize,
          arbBlockCount,
          arbRequestCount,
          async (poolIds, blockSize, countPerPool, requestCount) => {
            // 1. Create a PooledMemoryBlockStore with blocks in multiple pools
            const innerStore = new PooledMemoryBlockStore(blockSize);

            const hashesByPool = new Map<string, Set<string>>();
            for (const pool of poolIds) {
              hashesByPool.set(pool, new Set());
              for (let i = 0; i < countPerPool; i++) {
                const data = new Uint8Array(blockSize);
                crypto.getRandomValues(data);
                const hash = await innerStore.putInPool(pool, data);
                hashesByPool.get(pool)!.add(hash);
              }
            }

            // 2. For each pool, create a PooledStoreAdapter and verify routing
            for (const targetPool of poolIds) {
              const adapter = new PooledStoreAdapter(innerStore, targetPool);

              // 3. Call getRandomBlocks on the adapter
              const checksums = await adapter.getRandomBlocks(requestCount);

              // 4. Every returned checksum must exist in the configured pool
              for (const checksum of checksums) {
                const hex = checksum.toHex();
                const inTarget = await innerStore.hasInPool(targetPool, hex);
                expect(inTarget).toBe(true);
              }

              // 5. No returned checksum should exist in any other pool
              for (const checksum of checksums) {
                const hex = checksum.toHex();
                for (const otherPool of poolIds) {
                  if (otherPool === targetPool) continue;
                  const inOther = await innerStore.hasInPool(otherPool, hex);
                  expect(inOther).toBe(false);
                }
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * When the adapter's pool has fewer blocks than requested,
     * getRandomBlocks returns the available blocks without error.
     *
     * **Validates: Requirements 2.2**
     */
    it('getRandomBlocks on adapter returns available blocks when pool has fewer than requested', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbPoolId,
          arbBlockSize,
          arbBlockCount,
          async (pool, blockSize, numBlocks) => {
            const innerStore = new PooledMemoryBlockStore(blockSize);

            // Store a known number of blocks
            for (let i = 0; i < numBlocks; i++) {
              const data = new Uint8Array(blockSize);
              crypto.getRandomValues(data);
              await innerStore.putInPool(pool, data);
            }

            const adapter = new PooledStoreAdapter(innerStore, pool);

            // Request more than available
            const largeRequest = numBlocks + 10;
            const checksums = await adapter.getRandomBlocks(largeRequest);

            // Should return at most numBlocks (no error)
            expect(checksums.length).toBeLessThanOrEqual(numBlocks);
            expect(checksums.length).toBeGreaterThan(0);

            // All returned checksums must be in the pool
            for (const checksum of checksums) {
              const hex = checksum.toHex();
              const exists = await innerStore.hasInPool(pool, hex);
              expect(exists).toBe(true);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
