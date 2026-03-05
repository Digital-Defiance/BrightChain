/**
 * Feature: cloud-block-store-drivers, Properties 11, 12, 13
 *
 * Property 11: Pool isolation
 * For any two distinct pool IDs and any block, storing a block in pool A via
 * putInPool(poolA, data) should not make it visible via hasInPool(poolB, hash)
 * where poolB ≠ poolA.
 *
 * Property 12: Pool listing completeness
 * For any set of blocks stored in a pool, listBlocksInPool(pool) should yield
 * exactly the set of checksums that were stored in that pool and not deleted.
 *
 * Property 13: Pool deletion completeness
 * For any pool containing blocks, after deletePool(pool), listBlocksInPool(pool)
 * should yield zero results and hasInPool(pool, hash) should return false for
 * all previously stored block hashes.
 *
 * **Validates: Requirements 8.1–8.6**
 */
import {
  BlockSize,
  ICloudBlockStoreConfig,
  initializeBrightChain,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { beforeAll, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { MockCloudBlockStore } from './__tests__/helpers/mockCloudBlockStore';

/**
 * Block sizes suitable for property testing — smaller sizes for speed.
 */
const testBlockSizes: BlockSize[] = [
  BlockSize.Message, // 512 bytes
  BlockSize.Tiny, // 1024 bytes
  BlockSize.Small, // 4096 bytes
];

const arbBlockSize: fc.Arbitrary<BlockSize> = fc.constantFrom(
  ...testBlockSizes,
);

/**
 * Arbitrary generator for valid pool IDs: 1–16 alphanumeric chars.
 * Kept short to avoid unnecessary overhead while still exercising the pattern.
 */
const arbPoolId: fc.Arbitrary<string> = fc
  .array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(
        '',
      ),
    ),
    { minLength: 1, maxLength: 16 },
  )
  .map((chars) => chars.join(''));

/**
 * Arbitrary generator for a pair of distinct pool IDs.
 */
const arbDistinctPoolIds: fc.Arbitrary<[string, string]> = fc
  .tuple(arbPoolId, arbPoolId)
  .filter(([a, b]) => a !== b);

/**
 * Arbitrary generator that produces a tuple of [BlockSize, Uint8Array]
 * where the data length exactly matches the block size.
 */
const arbBlockSizeAndData: fc.Arbitrary<[BlockSize, Uint8Array]> =
  arbBlockSize.chain((blockSize) =>
    fc
      .uint8Array({ minLength: blockSize, maxLength: blockSize })
      .map((data) => [blockSize, data] as [BlockSize, Uint8Array]),
  );

/**
 * Arbitrary generator for a small array (1–5) of block data payloads
 * of the given block size.
 */
function arbBlockDataArray(blockSize: BlockSize): fc.Arbitrary<Uint8Array[]> {
  return fc.array(
    fc.uint8Array({ minLength: blockSize, maxLength: blockSize }),
    { minLength: 1, maxLength: 5 },
  );
}

/**
 * Creates a MockCloudBlockStore configured for the given block size.
 */
function createStore(blockSize: BlockSize): MockCloudBlockStore {
  const config: ICloudBlockStoreConfig = {
    region: 'test-region',
    containerOrBucketName: 'test-bucket',
    blockSize,
  };
  return new MockCloudBlockStore(config);
}

/**
 * Collect all hashes from an AsyncIterable into an array.
 */
async function collectHashes(
  iterable: AsyncIterable<string>,
): Promise<string[]> {
  const hashes: string[] = [];
  for await (const hash of iterable) {
    hashes.push(hash);
  }
  return hashes;
}

// Feature: cloud-block-store-drivers, Properties 11, 12, 13
describe('Properties 11, 12, 13: Pool operations', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  // =========================================================================
  // Property 11: Pool isolation
  // **Validates: Requirements 8.1, 8.2**
  // =========================================================================
  describe('Property 11: Pool isolation', () => {
    it('a block stored in poolA is not visible in poolB', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockSizeAndData,
          arbDistinctPoolIds,
          async ([blockSize, data], [poolA, poolB]) => {
            const store = createStore(blockSize);

            // Store block in poolA
            const hash = await store.putInPool(poolA, data);

            // Block should be visible in poolA
            const inA = await store.hasInPool(poolA, hash);
            expect(inA).toBe(true);

            // Block should NOT be visible in poolB
            const inB = await store.hasInPool(poolB, hash);
            expect(inB).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("blocks stored in different pools do not appear in each other's listings", async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockSizeAndData,
          arbDistinctPoolIds,
          async ([blockSize, data], [poolA, poolB]) => {
            const store = createStore(blockSize);

            const hashA = await store.putInPool(poolA, data);

            // Create different data for poolB
            const dataB = new Uint8Array(blockSize);
            dataB.fill(data[0] ^ 0xff); // Invert first byte to get different data
            const hashB = await store.putInPool(poolB, dataB);

            const listA = await collectHashes(store.listBlocksInPool(poolA));
            const listB = await collectHashes(store.listBlocksInPool(poolB));

            // poolA should contain hashA but not hashB
            expect(listA).toContain(hashA);
            if (hashA !== hashB) {
              expect(listA).not.toContain(hashB);
            }

            // poolB should contain hashB but not hashA
            expect(listB).toContain(hashB);
            if (hashA !== hashB) {
              expect(listB).not.toContain(hashA);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // Property 12: Pool listing completeness
  // **Validates: Requirements 8.3, 8.4**
  // =========================================================================
  describe('Property 12: Pool listing completeness', () => {
    it('listBlocksInPool yields exactly the set of stored (non-deleted) hashes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockSize.chain((bs) =>
            fc.tuple(fc.constant(bs), arbBlockDataArray(bs), arbPoolId),
          ),
          async ([blockSize, dataArrays, pool]) => {
            const store = createStore(blockSize);

            // Store all blocks and collect their hashes
            const storedHashes = new Set<string>();
            for (const data of dataArrays) {
              const hash = await store.putInPool(pool, data);
              storedHashes.add(hash);
            }

            // List blocks in the pool
            const listedHashes = await collectHashes(
              store.listBlocksInPool(pool),
            );

            // Listed hashes should be exactly the stored hashes
            expect(new Set(listedHashes)).toEqual(storedHashes);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('listBlocksInPool reflects deletions correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockSize.chain((bs) =>
            fc.tuple(fc.constant(bs), arbBlockDataArray(bs), arbPoolId),
          ),
          async ([blockSize, dataArrays, pool]) => {
            const store = createStore(blockSize);

            // Store all blocks
            const storedHashes: string[] = [];
            for (const data of dataArrays) {
              const hash = await store.putInPool(pool, data);
              storedHashes.push(hash);
            }

            // Deduplicate (same data produces same hash)
            const uniqueHashes = [...new Set(storedHashes)];

            if (uniqueHashes.length > 1) {
              // Delete the first unique hash
              const deletedHash = uniqueHashes[0];
              await store.deleteFromPool(pool, deletedHash);

              const remaining = new Set(uniqueHashes.slice(1));
              const listed = await collectHashes(store.listBlocksInPool(pool));

              expect(new Set(listed)).toEqual(remaining);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // =========================================================================
  // Property 13: Pool deletion completeness
  // **Validates: Requirements 8.5, 8.6**
  // =========================================================================
  describe('Property 13: Pool deletion completeness', () => {
    it('after deletePool, listBlocksInPool yields zero results', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockSize.chain((bs) =>
            fc.tuple(fc.constant(bs), arbBlockDataArray(bs), arbPoolId),
          ),
          async ([blockSize, dataArrays, pool]) => {
            const store = createStore(blockSize);

            // Store blocks in the pool
            for (const data of dataArrays) {
              await store.putInPool(pool, data);
            }

            // Delete the entire pool
            await store.deletePool(pool);

            // Listing should yield zero results
            const listed = await collectHashes(store.listBlocksInPool(pool));
            expect(listed).toEqual([]);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('after deletePool, hasInPool returns false for all previously stored hashes', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockSize.chain((bs) =>
            fc.tuple(fc.constant(bs), arbBlockDataArray(bs), arbPoolId),
          ),
          async ([blockSize, dataArrays, pool]) => {
            const store = createStore(blockSize);

            // Store blocks and collect hashes
            const storedHashes = new Set<string>();
            for (const data of dataArrays) {
              const hash = await store.putInPool(pool, data);
              storedHashes.add(hash);
            }

            // Delete the entire pool
            await store.deletePool(pool);

            // Every previously stored hash should now return false
            for (const hash of storedHashes) {
              const exists = await store.hasInPool(pool, hash);
              expect(exists).toBe(false);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
