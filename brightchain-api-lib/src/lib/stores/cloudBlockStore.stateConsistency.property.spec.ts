/**
 * Feature: cloud-block-store-drivers, Property 3: Store state consistency (has/delete)
 *
 * For any cloud block store and any valid block, `has(checksum)` should return
 * `true` after `setData` and `false` after `deleteData`. Furthermore, after
 * `deleteData`, `getMetadata(checksum)` should return `null` and
 * `getParityBlocks(checksum)` should return an empty array.
 *
 * **Validates: Requirements 2.5, 2.6, 3.5, 3.6**
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
 * Block sizes suitable for property testing.
 * We use only the smaller sizes to keep test execution fast while still
 * covering multiple block size variants.
 */
const testBlockSizes: BlockSize[] = [
  BlockSize.Message, // 512 bytes
  BlockSize.Tiny, // 1024 bytes
  BlockSize.Small, // 4096 bytes
];

/**
 * Arbitrary generator for a block size from the test-friendly subset.
 */
const arbBlockSize: fc.Arbitrary<BlockSize> = fc.constantFrom(
  ...testBlockSizes,
);

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

// Feature: cloud-block-store-drivers, Property 3: Store state consistency (has/delete)
describe('Property 3: Store state consistency (has/delete)', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  it('has() returns true after setData', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
        const store = createStore(blockSize);

        const block = new RawDataBlock(blockSize, data);
        await store.setData(block);

        const exists = await store.has(block.idChecksum);
        expect(exists).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('has() returns false after deleteData', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
        const store = createStore(blockSize);

        const block = new RawDataBlock(blockSize, data);
        await store.setData(block);

        // Confirm it exists first
        expect(await store.has(block.idChecksum)).toBe(true);

        // Delete and verify
        await store.deleteData(block.idChecksum);
        const exists = await store.has(block.idChecksum);
        expect(exists).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  it('getMetadata() returns null after deleteData', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
        const store = createStore(blockSize);

        const block = new RawDataBlock(blockSize, data);
        await store.setData(block);

        // Metadata should exist after setData
        const metaBefore = await store.getMetadata(block.idChecksum);
        expect(metaBefore).not.toBeNull();

        // Delete and verify metadata is gone
        await store.deleteData(block.idChecksum);
        const metaAfter = await store.getMetadata(block.idChecksum);
        expect(metaAfter).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('getParityBlocks() returns empty array after deleteData', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
        const store = createStore(blockSize);

        const block = new RawDataBlock(blockSize, data);
        await store.setData(block);

        // Delete and verify parity blocks are empty
        await store.deleteData(block.idChecksum);
        const parityBlocks = await store.getParityBlocks(block.idChecksum);
        expect(parityBlocks).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });
});
