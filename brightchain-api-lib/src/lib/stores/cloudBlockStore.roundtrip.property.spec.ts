/**
 * Feature: cloud-block-store-drivers, Property 2: Block store/retrieve round-trip
 *
 * For any valid RawDataBlock with a valid checksum and block size, calling
 * setData(block) followed by getData(block.checksum) on a cloud block store
 * should return a RawDataBlock whose data bytes are identical to the original
 * block's data.
 *
 * **Validates: Requirements 2.3, 2.4, 3.3, 3.4**
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
    supportedBlockSizes: [blockSize],
  };
  return new MockCloudBlockStore(config);
}

// Feature: cloud-block-store-drivers, Property 2: Block store/retrieve round-trip
describe('Property 2: Block store/retrieve round-trip', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  it('setData followed by getData returns a block with identical data bytes', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
        const store = createStore(blockSize);

        // Create a RawDataBlock — checksum is auto-calculated
        const originalBlock = new RawDataBlock(blockSize, data);

        // Store the block
        await store.setData(originalBlock);

        // Retrieve the block by its checksum
        const retrievedBlock = await store.getData(originalBlock.idChecksum);

        // The retrieved block's data must be byte-identical to the original
        expect(retrievedBlock).toBeInstanceOf(RawDataBlock);
        expect(retrievedBlock.data.length).toBe(originalBlock.data.length);
        expect(Buffer.from(retrievedBlock.data)).toEqual(
          Buffer.from(originalBlock.data),
        );
      }),
      { numRuns: 100 },
    );
  });

  it('setData followed by getData preserves the block size', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
        const store = createStore(blockSize);

        const originalBlock = new RawDataBlock(blockSize, data);
        await store.setData(originalBlock);
        const retrievedBlock = await store.getData(originalBlock.idChecksum);

        expect(retrievedBlock.blockSize).toBe(blockSize);
      }),
      { numRuns: 100 },
    );
  });

  it('storing the same block twice is idempotent and getData still returns correct data', async () => {
    await fc.assert(
      fc.asyncProperty(arbBlockSizeAndData, async ([blockSize, data]) => {
        const store = createStore(blockSize);

        const block = new RawDataBlock(blockSize, data);

        // Store twice
        await store.setData(block);
        await store.setData(block);

        // Retrieve should still work and return identical data
        const retrieved = await store.getData(block.idChecksum);
        expect(Buffer.from(retrieved.data)).toEqual(Buffer.from(block.data));
      }),
      { numRuns: 100 },
    );
  });
});
