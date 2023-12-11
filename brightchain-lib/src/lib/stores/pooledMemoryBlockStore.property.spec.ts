/**
 * @fileoverview Property-based tests for PooledMemoryBlockStore
 *
 * This file contains property-based tests for Properties 3-11, 14
 * of the pool-based-storage-isolation feature.
 *
 * **Feature: pool-based-storage-isolation**
 */

import fc from 'fast-check';
import { BlockSize } from '../enumerations/blockSize';
import { DEFAULT_POOL } from '../interfaces/storage/pooledBlockStore';
import { Checksum } from '../types/checksum';
import { PooledMemoryBlockStore } from './pooledMemoryBlockStore';

// Set a longer timeout for property tests
jest.setTimeout(30000);

/**
 * Arbitrary that generates valid pool ID strings:
 * 1-64 characters from [a-zA-Z0-9_-]
 */
const validPoolIdArb = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

/**
 * Arbitrary that generates non-empty Uint8Array data (1-1024 bytes).
 */
const blockDataArb = fc.uint8Array({ minLength: 1, maxLength: 1024 });

describe('PooledMemoryBlockStore Property Tests', () => {
  describe('Property 3: Put/get round-trip within a pool', () => {
    /**
     * **Feature: pool-based-storage-isolation, Property 3: Put/get round-trip within a pool**
     *
     * For any valid PoolId and any block data (non-empty Uint8Array),
     * storing the data with putInPool(pool, data) and then retrieving it
     * with getFromPool(pool, returnedHash) yields data identical to the original.
     *
     * **Validates: Requirements 2.4, 2.6, 8.3, 8.4**
     */
    it('putInPool followed by getFromPool returns identical data', async () => {
      await fc.assert(
        fc.asyncProperty(validPoolIdArb, blockDataArb, async (poolId, data) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);
          const hash = await store.putInPool(poolId, data);
          const retrieved = await store.getFromPool(poolId, hash);
          expect(retrieved).toEqual(data);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * The hash returned by putInPool is deterministic — storing the same
     * data in the same pool twice returns the same hash.
     *
     * **Validates: Requirements 2.6, 8.3**
     */
    it('putInPool returns the same hash for the same data', async () => {
      await fc.assert(
        fc.asyncProperty(validPoolIdArb, blockDataArb, async (poolId, data) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);
          const hash1 = await store.putInPool(poolId, data);
          const hash2 = await store.putInPool(poolId, data);
          expect(hash1).toBe(hash2);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * After putInPool, hasInPool returns true for the stored block.
     *
     * **Validates: Requirements 2.4, 8.3**
     */
    it('hasInPool returns true after putInPool', async () => {
      await fc.assert(
        fc.asyncProperty(validPoolIdArb, blockDataArb, async (poolId, data) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);
          const hash = await store.putInPool(poolId, data);
          const exists = await store.hasInPool(poolId, hash);
          expect(exists).toBe(true);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 4: Cross-pool isolation', () => {
    /**
     * **Feature: pool-based-storage-isolation, Property 4: Cross-pool isolation**
     *
     * For any two distinct valid PoolIds (poolA ≠ poolB) and any block data,
     * storing the data in poolA and then calling hasInPool(poolB, hash)
     * returns false. The same hash in different pools represents separate
     * storage entries.
     *
     * **Validates: Requirements 2.3, 3.4, 9.1**
     */
    it('storing in poolA means hasInPool(poolB) returns false for the same hash', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPoolIdArb,
          validPoolIdArb,
          blockDataArb,
          async (poolA, poolB, data) => {
            fc.pre(poolA !== poolB);

            const store = new PooledMemoryBlockStore(BlockSize.Small);
            const hash = await store.putInPool(poolA, data);

            const existsInPoolB = await store.hasInPool(poolB, hash);
            expect(existsInPoolB).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Storing the same data in two distinct pools creates independent entries.
     * Both pools have the block, and deleting from one does not affect the other.
     *
     * **Validates: Requirements 3.4, 9.1**
     */
    it('same data stored in two pools exists independently in each', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPoolIdArb,
          validPoolIdArb,
          blockDataArb,
          async (poolA, poolB, data) => {
            fc.pre(poolA !== poolB);

            const store = new PooledMemoryBlockStore(BlockSize.Small);
            const hashA = await store.putInPool(poolA, data);
            const hashB = await store.putInPool(poolB, data);

            // Same data produces the same hash
            expect(hashA).toBe(hashB);

            // Both pools have the block
            expect(await store.hasInPool(poolA, hashA)).toBe(true);
            expect(await store.hasInPool(poolB, hashB)).toBe(true);

            // Deleting from poolA does not affect poolB
            await store.deleteFromPool(poolA, hashA);
            expect(await store.hasInPool(poolA, hashA)).toBe(false);
            expect(await store.hasInPool(poolB, hashB)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

describe('Property 5: Delete removes block from pool', () => {
  /**
   * **Feature: pool-based-storage-isolation, Property 5: Delete removes block from pool**
   *
   * For any valid PoolId and any block stored in that pool,
   * calling deleteFromPool(pool, hash) causes hasInPool(pool, hash)
   * to return false.
   *
   * **Validates: Requirements 2.7**
   */
  it('deleteFromPool causes hasInPool to return false', async () => {
    await fc.assert(
      fc.asyncProperty(validPoolIdArb, blockDataArb, async (poolId, data) => {
        const store = new PooledMemoryBlockStore(BlockSize.Small);

        // Store a block in the pool
        const hash = await store.putInPool(poolId, data);

        // Confirm it exists
        expect(await store.hasInPool(poolId, hash)).toBe(true);

        // Delete the block
        await store.deleteFromPool(poolId, hash);

        // Confirm it no longer exists
        expect(await store.hasInPool(poolId, hash)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Deleting a block that was already deleted is a no-op and does not throw.
   *
   * **Validates: Requirements 2.7**
   */
  it('deleting an already-deleted block is a no-op', async () => {
    await fc.assert(
      fc.asyncProperty(validPoolIdArb, blockDataArb, async (poolId, data) => {
        const store = new PooledMemoryBlockStore(BlockSize.Small);

        const hash = await store.putInPool(poolId, data);
        await store.deleteFromPool(poolId, hash);

        // Second delete should not throw
        await store.deleteFromPool(poolId, hash);

        expect(await store.hasInPool(poolId, hash)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 6: Pool stats consistency', () => {
  /**
   * **Feature: pool-based-storage-isolation, Property 6: Pool stats consistency**
   *
   * For any sequence of putInPool and deleteFromPool operations on a pool,
   * getPoolStats(pool).blockCount equals the number of distinct blocks
   * currently in the pool, and getPoolStats(pool).totalBytes equals the
   * sum of their sizes.
   *
   * **Validates: Requirements 4.1, 4.2, 4.3, 8.5**
   */
  it('blockCount and totalBytes match the actual pool contents after puts', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPoolIdArb,
        fc.array(blockDataArb, { minLength: 1, maxLength: 20 }),
        async (poolId, dataBlocks) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);

          // Track distinct blocks by hash to handle duplicates
          const storedBlocks = new Map<string, Uint8Array>();

          for (const data of dataBlocks) {
            const hash = await store.putInPool(poolId, data);
            // putInPool is idempotent, so only the first put for a hash counts
            if (!storedBlocks.has(hash)) {
              storedBlocks.set(hash, data);
            }
          }

          const stats = await store.getPoolStats(poolId);
          const expectedCount = storedBlocks.size;
          const expectedBytes = Array.from(storedBlocks.values()).reduce(
            (sum, d) => sum + d.length,
            0,
          );

          expect(stats.poolId).toBe(poolId);
          expect(stats.blockCount).toBe(expectedCount);
          expect(stats.totalBytes).toBe(expectedBytes);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('blockCount and totalBytes reflect remaining blocks after puts and deletes', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPoolIdArb,
        fc.array(blockDataArb, { minLength: 2, maxLength: 20 }),
        fc.integer({ min: 1, max: 9 }).map((n) => n / 10),
        async (poolId, dataBlocks, deleteFraction) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);

          // Put all blocks, tracking distinct entries
          const storedBlocks = new Map<string, Uint8Array>();
          for (const data of dataBlocks) {
            const hash = await store.putInPool(poolId, data);
            if (!storedBlocks.has(hash)) {
              storedBlocks.set(hash, data);
            }
          }

          // Delete a fraction of the distinct blocks
          const hashes = Array.from(storedBlocks.keys());
          const deleteCount = Math.max(
            1,
            Math.floor(hashes.length * deleteFraction),
          );
          const toDelete = hashes.slice(0, deleteCount);

          for (const hash of toDelete) {
            await store.deleteFromPool(poolId, hash);
            storedBlocks.delete(hash);
          }

          const expectedCount = storedBlocks.size;
          const expectedBytes = Array.from(storedBlocks.values()).reduce(
            (sum, d) => sum + d.length,
            0,
          );

          if (expectedCount === 0) {
            // Pool stats may throw if all blocks are deleted and pool is gone
            // but the pool entry should still exist since it was created
            // Verify via hasInPool that deleted blocks are gone
            for (const hash of toDelete) {
              expect(await store.hasInPool(poolId, hash)).toBe(false);
            }
          } else {
            const stats = await store.getPoolStats(poolId);
            expect(stats.blockCount).toBe(expectedCount);
            expect(stats.totalBytes).toBe(expectedBytes);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('deleting all blocks results in blockCount 0 and totalBytes 0', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPoolIdArb,
        fc.array(blockDataArb, { minLength: 1, maxLength: 10 }),
        async (poolId, dataBlocks) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);

          const storedHashes = new Map<string, Uint8Array>();
          for (const data of dataBlocks) {
            const hash = await store.putInPool(poolId, data);
            if (!storedHashes.has(hash)) {
              storedHashes.set(hash, data);
            }
          }

          // Delete every distinct block
          for (const hash of storedHashes.keys()) {
            await store.deleteFromPool(poolId, hash);
          }

          const stats = await store.getPoolStats(poolId);
          expect(stats.blockCount).toBe(0);
          expect(stats.totalBytes).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 7: deletePool removes exactly the target pool', () => {
  /**
   * **Feature: pool-based-storage-isolation, Property 7: deletePool removes exactly the target pool**
   *
   * For any two distinct pools (poolA, poolB) each containing blocks,
   * calling deletePool(poolA) removes all blocks from poolA
   * (hasInPool returns false for all) and removes poolA from listPools(),
   * while all blocks in poolB remain accessible.
   *
   * **Validates: Requirements 5.1, 5.2, 9.2**
   */
  it('deletePool(poolA) removes poolA blocks and leaves poolB blocks intact', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPoolIdArb,
        validPoolIdArb,
        fc.array(blockDataArb, { minLength: 1, maxLength: 10 }),
        fc.array(blockDataArb, { minLength: 1, maxLength: 10 }),
        async (poolA, poolB, dataBlocksA, dataBlocksB) => {
          fc.pre(poolA !== poolB);

          const store = new PooledMemoryBlockStore(BlockSize.Small);

          // Store blocks in poolA
          const hashesA: string[] = [];
          for (const data of dataBlocksA) {
            const hash = await store.putInPool(poolA, data);
            if (!hashesA.includes(hash)) {
              hashesA.push(hash);
            }
          }

          // Store blocks in poolB
          const hashesB: string[] = [];
          for (const data of dataBlocksB) {
            const hash = await store.putInPool(poolB, data);
            if (!hashesB.includes(hash)) {
              hashesB.push(hash);
            }
          }

          // Both pools should be listed
          const poolsBefore = await store.listPools();
          expect(poolsBefore).toContain(poolA);
          expect(poolsBefore).toContain(poolB);

          // Delete poolA
          await store.deletePool(poolA);

          // All poolA blocks should be gone
          for (const hash of hashesA) {
            expect(await store.hasInPool(poolA, hash)).toBe(false);
          }

          // poolA should no longer appear in listPools
          const poolsAfter = await store.listPools();
          expect(poolsAfter).not.toContain(poolA);

          // All poolB blocks should still be accessible
          for (const hash of hashesB) {
            expect(await store.hasInPool(poolB, hash)).toBe(true);
          }

          // poolB should still appear in listPools
          expect(poolsAfter).toContain(poolB);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Deleting a pool that does not exist completes without error.
   *
   * **Validates: Requirements 5.1, 5.2**
   */
  it('deletePool on a non-existent pool is a no-op', async () => {
    await fc.assert(
      fc.asyncProperty(validPoolIdArb, async (poolId) => {
        const store = new PooledMemoryBlockStore(BlockSize.Small);

        // Should not throw
        await store.deletePool(poolId);

        const pools = await store.listPools();
        expect(pools).not.toContain(poolId);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 8: listPools returns exactly pools with blocks', () => {
  /**
   * **Feature: pool-based-storage-isolation, Property 8: listPools returns exactly pools with blocks**
   *
   * For any set of pools that have had blocks stored in them (and not fully deleted),
   * listPools() returns exactly those pool identifiers.
   *
   * **Validates: Requirements 2.8**
   */
  it('listPools returns exactly the set of pools that have blocks stored', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(validPoolIdArb, { minLength: 1, maxLength: 8 }),
        fc.array(blockDataArb, { minLength: 1, maxLength: 8 }),
        async (poolIds, dataBlocks) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);

          // Store at least one block in each pool
          for (const poolId of poolIds) {
            const data = dataBlocks[0];
            await store.putInPool(poolId, data);
          }

          const pools = await store.listPools();
          const poolSet = new Set(pools);

          // listPools should return exactly the pools we stored blocks in
          expect(poolSet.size).toBe(poolIds.length);
          for (const poolId of poolIds) {
            expect(poolSet.has(poolId)).toBe(true);
          }

          // No extra pools should be present
          for (const pool of pools) {
            expect(poolIds).toContain(pool);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * After deleting all blocks from a pool, listPools no longer includes that pool.
   *
   * **Validates: Requirements 2.8**
   */
  it('listPools excludes pools whose blocks have all been deleted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(validPoolIdArb, { minLength: 2, maxLength: 6 }),
        blockDataArb,
        async (poolIds, data) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);

          // Store a block in each pool
          const hashByPool = new Map<string, string>();
          for (const poolId of poolIds) {
            const hash = await store.putInPool(poolId, data);
            hashByPool.set(poolId, hash);
          }

          // Pick the first pool to fully empty
          const emptyPool = poolIds[0];
          const emptyHash = hashByPool.get(emptyPool)!;
          await store.deleteFromPool(emptyPool, emptyHash);

          const pools = await store.listPools();
          const poolSet = new Set(pools);

          // The emptied pool should not appear
          expect(poolSet.has(emptyPool)).toBe(false);

          // All other pools should still appear
          for (const poolId of poolIds.slice(1)) {
            expect(poolSet.has(poolId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("Property 9: listBlocksInPool returns exactly the pool's hashes", () => {
  /**
   * Helper to collect all items from an AsyncIterable into an array.
   */
  async function collectAsync(iter: AsyncIterable<string>): Promise<string[]> {
    const result: string[] = [];
    for await (const item of iter) {
      result.push(item);
    }
    return result;
  }

  /**
   * **Feature: pool-based-storage-isolation, Property 9: listBlocksInPool returns exactly the pool's hashes**
   *
   * For any pool with a known set of stored block hashes, collecting all items
   * from listBlocksInPool(pool) yields exactly that set of hashes (no more, no less).
   *
   * **Validates: Requirements 2.9, 9.3**
   */
  it('listBlocksInPool yields exactly the hashes stored in the pool', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPoolIdArb,
        fc.array(blockDataArb, { minLength: 1, maxLength: 20 }),
        async (poolId, dataBlocks) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);

          // Store blocks and track distinct hashes
          const expectedHashes = new Set<string>();
          for (const data of dataBlocks) {
            const hash = await store.putInPool(poolId, data);
            expectedHashes.add(hash);
          }

          // Collect all hashes from listBlocksInPool
          const listedHashes = await collectAsync(
            store.listBlocksInPool(poolId),
          );
          const listedSet = new Set(listedHashes);

          // No duplicates in the listing
          expect(listedHashes.length).toBe(listedSet.size);

          // Exact match: same size and same elements
          expect(listedSet.size).toBe(expectedHashes.size);
          for (const hash of expectedHashes) {
            expect(listedSet.has(hash)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * listBlocksInPool for a pool returns only that pool's hashes,
   * not hashes from other pools (cross-pool isolation for listing).
   *
   * **Validates: Requirements 9.3**
   */
  it('listBlocksInPool does not include hashes from other pools', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPoolIdArb,
        validPoolIdArb,
        fc.array(blockDataArb, { minLength: 1, maxLength: 10 }),
        fc.array(blockDataArb, { minLength: 1, maxLength: 10 }),
        async (poolA, poolB, dataA, dataB) => {
          fc.pre(poolA !== poolB);

          const store = new PooledMemoryBlockStore(BlockSize.Small);

          // Store blocks in poolA
          const hashesA = new Set<string>();
          for (const data of dataA) {
            const hash = await store.putInPool(poolA, data);
            hashesA.add(hash);
          }

          // Store blocks in poolB
          const hashesB = new Set<string>();
          for (const data of dataB) {
            const hash = await store.putInPool(poolB, data);
            hashesB.add(hash);
          }

          // List blocks in poolA — should contain exactly poolA's hashes
          const listedA = new Set(
            await collectAsync(store.listBlocksInPool(poolA)),
          );
          for (const hash of hashesA) {
            expect(listedA.has(hash)).toBe(true);
          }
          expect(listedA.size).toBe(hashesA.size);

          // List blocks in poolB — should contain exactly poolB's hashes
          const listedB = new Set(
            await collectAsync(store.listBlocksInPool(poolB)),
          );
          for (const hash of hashesB) {
            expect(listedB.has(hash)).toBe(true);
          }
          expect(listedB.size).toBe(hashesB.size);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property 10: Legacy operations equivalent to default pool', () => {
  /**
   * **Feature: pool-based-storage-isolation, Property 10: Legacy operations equivalent to default pool**
   *
   * For any block data, storing via legacy put(hash, data) and then retrieving
   * via getFromPool("default", hash) returns the same data. Conversely, storing
   * via putInPool("default", data) and retrieving via legacy getData(hash)
   * returns the same data.
   *
   * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5**
   */

  it('legacy put then getFromPool("default") returns the same data', async () => {
    await fc.assert(
      fc.asyncProperty(blockDataArb, async (data) => {
        const store = new PooledMemoryBlockStore(BlockSize.Small);

        // Use putInPool to get the deterministic hash for this data
        const hash = await store.putInPool(DEFAULT_POOL, data);

        // Clear and re-create to start fresh
        store.clear();

        // Store via legacy put (key, data)
        await store.put(hash, data);

        // Retrieve via pool-scoped getFromPool with "default"
        const retrieved = await store.getFromPool(DEFAULT_POOL, hash);
        expect(retrieved).toEqual(data);
      }),
      { numRuns: 100 },
    );
  });

  it('putInPool("default") then legacy getData returns the same data', async () => {
    await fc.assert(
      fc.asyncProperty(blockDataArb, async (data) => {
        const store = new PooledMemoryBlockStore(BlockSize.Small);

        // Store via pool-scoped putInPool with "default"
        const hash = await store.putInPool(DEFAULT_POOL, data);

        // Retrieve via legacy getData (requires a Checksum object)
        const checksum = Checksum.fromHex(hash);
        const rawDataBlock = await store.getData(checksum);

        // RawDataBlock.data should contain the original data
        expect(new Uint8Array(rawDataBlock.data)).toEqual(data);
      }),
      { numRuns: 100 },
    );
  });

  it('legacy has delegates to hasInPool("default")', async () => {
    await fc.assert(
      fc.asyncProperty(blockDataArb, async (data) => {
        const store = new PooledMemoryBlockStore(BlockSize.Small);

        // Store via putInPool with "default"
        const hash = await store.putInPool(DEFAULT_POOL, data);

        // Legacy has should find it
        expect(await store.has(hash)).toBe(true);

        // hasInPool("default") should agree
        expect(await store.hasInPool(DEFAULT_POOL, hash)).toBe(true);

        // Delete via legacy delete
        await store.delete(hash);

        // Both should now return false
        expect(await store.has(hash)).toBe(false);
        expect(await store.hasInPool(DEFAULT_POOL, hash)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('legacy delete and deleteFromPool("default") are equivalent', async () => {
    await fc.assert(
      fc.asyncProperty(blockDataArb, async (data) => {
        const store = new PooledMemoryBlockStore(BlockSize.Small);

        // Store via putInPool, delete via legacy delete
        const hash = await store.putInPool(DEFAULT_POOL, data);
        await store.delete(hash);
        expect(await store.hasInPool(DEFAULT_POOL, hash)).toBe(false);

        // Store again via legacy put, delete via deleteFromPool
        await store.put(hash, data);
        await store.deleteFromPool(DEFAULT_POOL, hash);
        expect(await store.has(hash)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 11: Metadata poolId matches storage pool', () => {
  /**
   * **Feature: pool-based-storage-isolation, Property 11: Metadata poolId matches storage pool**
   *
   * For any block stored in a specific pool, getMetadata(key).poolId equals
   * the PoolId used during storage. For blocks stored via legacy methods,
   * poolId is "default" or undefined.
   *
   * **Validates: Requirements 7.2, 7.3**
   */
  it('metadata poolId equals the pool used during putInPool', async () => {
    await fc.assert(
      fc.asyncProperty(validPoolIdArb, blockDataArb, async (poolId, data) => {
        const store = new PooledMemoryBlockStore(BlockSize.Small);
        const hash = await store.putInPool(poolId, data);

        const metadata = await store.getMetadata(hash);
        expect(metadata).not.toBeNull();
        expect(metadata!.poolId).toBe(poolId);
      }),
      { numRuns: 100 },
    );
  });

  it('metadata poolId is "default" for blocks stored via legacy put', async () => {
    await fc.assert(
      fc.asyncProperty(blockDataArb, async (data) => {
        const store = new PooledMemoryBlockStore(BlockSize.Small);

        // First get the hash by storing in default pool, then clear and use legacy put
        const hash = await store.putInPool(DEFAULT_POOL, data);
        store.clear();

        await store.put(hash, data);

        const metadata = await store.getMetadata(hash);
        expect(metadata).not.toBeNull();

        // Legacy put delegates to putInPool(DEFAULT_POOL, ...), so poolId should be "default"
        expect(
          metadata!.poolId === DEFAULT_POOL || metadata!.poolId === undefined,
        ).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});

describe('Property 14: Pagination in listBlocksInPool', () => {
  /**
   * Helper to collect all items from an AsyncIterable into an array.
   */
  async function collectAsync(iter: AsyncIterable<string>): Promise<string[]> {
    const result: string[] = [];
    for await (const item of iter) {
      result.push(item);
    }
    return result;
  }

  /**
   * **Feature: pool-based-storage-isolation, Property 14: Pagination in listBlocksInPool**
   *
   * For any pool with N blocks and any limit L > 0, paginating through
   * listBlocksInPool(pool, { limit: L }) using cursors yields exactly N
   * total hashes with no duplicates and no omissions.
   *
   * **Validates: Requirements 2.10**
   */
  it('paginating with any limit L > 0 yields all N hashes with no duplicates', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPoolIdArb,
        fc.array(blockDataArb, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 20 }),
        async (poolId, dataBlocks, limit) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);

          // Store blocks and track distinct hashes
          const expectedHashes = new Set<string>();
          for (const data of dataBlocks) {
            const hash = await store.putInPool(poolId, data);
            expectedHashes.add(hash);
          }

          // Paginate through all blocks using limit and cursor
          const collectedHashes: string[] = [];
          let cursor: string | undefined;

          for (;;) {
            const page = await collectAsync(
              store.listBlocksInPool(poolId, { limit, cursor }),
            );

            if (page.length === 0) {
              break;
            }

            collectedHashes.push(...page);
            cursor = page[page.length - 1];

            // Safety: if page is smaller than limit, we've reached the end
            if (page.length < limit) {
              break;
            }
          }

          const collectedSet = new Set(collectedHashes);

          // No duplicates across pages
          expect(collectedHashes.length).toBe(collectedSet.size);

          // Total count matches expected
          expect(collectedSet.size).toBe(expectedHashes.size);

          // Exact same set of hashes
          for (const hash of expectedHashes) {
            expect(collectedSet.has(hash)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Paginating with limit equal to N (total blocks) returns all hashes in a single page.
   *
   * **Validates: Requirements 2.10**
   */
  it('limit >= N returns all hashes in a single page', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPoolIdArb,
        fc.array(blockDataArb, { minLength: 1, maxLength: 15 }),
        async (poolId, dataBlocks) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);

          const expectedHashes = new Set<string>();
          for (const data of dataBlocks) {
            const hash = await store.putInPool(poolId, data);
            expectedHashes.add(hash);
          }

          // Use a limit larger than the number of blocks
          const page = await collectAsync(
            store.listBlocksInPool(poolId, { limit: expectedHashes.size + 10 }),
          );

          const pageSet = new Set(page);
          expect(page.length).toBe(pageSet.size); // no duplicates
          expect(pageSet.size).toBe(expectedHashes.size);
          for (const hash of expectedHashes) {
            expect(pageSet.has(hash)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Paginating with limit = 1 yields one hash per page and covers all blocks.
   *
   * **Validates: Requirements 2.10**
   */
  it('limit = 1 yields one hash per page and covers all blocks', async () => {
    await fc.assert(
      fc.asyncProperty(
        validPoolIdArb,
        fc.array(blockDataArb, { minLength: 1, maxLength: 15 }),
        async (poolId, dataBlocks) => {
          const store = new PooledMemoryBlockStore(BlockSize.Small);

          const expectedHashes = new Set<string>();
          for (const data of dataBlocks) {
            const hash = await store.putInPool(poolId, data);
            expectedHashes.add(hash);
          }

          const collectedHashes: string[] = [];
          let cursor: string | undefined;

          for (;;) {
            const page = await collectAsync(
              store.listBlocksInPool(poolId, { limit: 1, cursor }),
            );

            if (page.length === 0) {
              break;
            }

            // Each page should have exactly 1 item (except possibly the last)
            expect(page.length).toBe(1);
            collectedHashes.push(...page);
            cursor = page[0];
          }

          const collectedSet = new Set(collectedHashes);
          expect(collectedHashes.length).toBe(collectedSet.size);
          expect(collectedSet.size).toBe(expectedHashes.size);
          for (const hash of expectedHashes) {
            expect(collectedSet.has(hash)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
