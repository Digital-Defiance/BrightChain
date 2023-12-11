/**
 * Feature: cloud-block-store-drivers, Property 15: Random blocks subset invariant
 *
 * For any cloud block store containing N blocks and any requested count M,
 * `getRandomBlocks(M)` should return an array of checksums where:
 *   (a) every returned checksum exists in the store,
 *   (b) the array length is `min(M, N)`, and
 *   (c) there are no duplicate checksums.
 *
 * **Validates: Requirements 10.1, 10.2, 10.5**
 */
import {
  BlockSize,
  ICloudBlockStoreConfig,
  initializeBrightChain,
  RawDataBlock,
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
 * Creates a MockCloudBlockStore configured for the given block size.
 */
function createStore(blockSize: BlockSize): MockCloudBlockStore {
  const config: ICloudBlockStoreConfig = {
    region: 'test-region',
    containerOrBucketName: 'test-bucket',
    supportedBlockSizes: [blockSize],
  };
  return new MockCloudBlockStore(config);
}

// Feature: cloud-block-store-drivers, Property 15: Random blocks subset invariant
describe('Property 15: Random blocks subset invariant', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  it('(a) every returned checksum exists in the store, (b) length is min(M, N), (c) no duplicates', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockSize.chain((bs) =>
          fc.tuple(
            fc.constant(bs),
            // N: number of blocks to store (1–8, kept small for speed)
            fc.integer({ min: 1, max: 8 }),
          ),
        ),
        // M: requested count (0 to N+5)
        fc.integer({ min: 0, max: 13 }),
        async ([blockSize, n], m) => {
          const store = createStore(blockSize);

          // Store N blocks with distinct random data
          const storedChecksums = new Set<string>();
          for (let i = 0; i < n; i++) {
            const data = new Uint8Array(blockSize);
            // Fill with unique-ish data to get distinct checksums
            crypto.getRandomValues(data);
            const block = new RawDataBlock(blockSize, data);
            await store.setData(block);
            storedChecksums.add(block.idChecksum.toHex());
          }

          const actualN = storedChecksums.size; // may be < n if hash collisions (extremely unlikely)

          // Request M random blocks
          const result = await store.getRandomBlocks(m, blockSize);

          // (b) length is min(M, N)
          expect(result.length).toBe(Math.min(m, actualN));

          // (a) every returned checksum exists in the store
          for (const checksum of result) {
            const exists = await store.has(checksum);
            expect(exists).toBe(true);
          }

          // (c) no duplicate checksums
          const hexSet = new Set(result.map((c) => c.toHex()));
          expect(hexSet.size).toBe(result.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns empty array when store is empty', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockSize,
        fc.integer({ min: 0, max: 10 }),
        async (blockSize, m) => {
          const store = createStore(blockSize);

          const result = await store.getRandomBlocks(m, blockSize);
          expect(result.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('returns all blocks when M >= N', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockSize.chain((bs) =>
          fc.tuple(fc.constant(bs), fc.integer({ min: 1, max: 6 })),
        ),
        async ([blockSize, n]) => {
          const store = createStore(blockSize);

          const storedChecksums = new Set<string>();
          for (let i = 0; i < n; i++) {
            const data = new Uint8Array(blockSize);
            crypto.getRandomValues(data);
            const block = new RawDataBlock(blockSize, data);
            await store.setData(block);
            storedChecksums.add(block.idChecksum.toHex());
          }

          const actualN = storedChecksums.size;

          // Request more than available
          const m = actualN + 5;
          const result = await store.getRandomBlocks(m, blockSize);

          // Should return exactly actualN blocks (all of them)
          expect(result.length).toBe(actualN);

          // Every stored checksum should appear in the result
          const resultHexes = new Set(result.map((c) => c.toHex()));
          for (const hex of storedChecksums) {
            expect(resultHexes.has(hex)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
