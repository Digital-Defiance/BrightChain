/**
 * Property 1: Fault Condition — Multi-Size Block Storage Rejected by Single-Size Store
 *
 * This test encodes the EXPECTED (fixed) behavior: a store configured with
 * supportedBlockSizes: [B1, B2] should accept blocks of both sizes, store them,
 * and retrieve each by checksum with identical data.
 *
 * On UNFIXED code, this test MUST FAIL because:
 * - MemoryBlockStore constructor only accepts a single BlockSize
 * - There is no supportedBlockSizes property on the store
 * - The store cannot be configured for multiple block sizes
 *
 * **Validates: Requirements 1.1, 1.2, 1.4, 2.1, 2.4**
 */
import { arraysEqual } from '@digitaldefiance/ecies-lib';
import { afterEach, beforeAll, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { RawDataBlock } from '../blocks/rawData';
import { BlockSize } from '../enumerations/blockSize';
import { initializeBrightChain } from '../init';
import { ServiceProvider } from '../services/service.provider';
import { ServiceLocator } from '../services/serviceLocator';
import { MemoryBlockStore } from './memoryBlockStore';

/**
 * Block sizes suitable for property testing — use smaller sizes for speed.
 * Excludes Medium/Large/Huge to avoid allocating huge buffers in tests.
 */
const testableBlockSizes: BlockSize[] = [
  BlockSize.Message, // 512 bytes
  BlockSize.Tiny, // 1024 bytes
  BlockSize.Small, // 4096 bytes
];

/**
 * Arbitrary: a pair of distinct BlockSize values from the testable set.
 */
const arbDistinctBlockSizePair: fc.Arbitrary<[BlockSize, BlockSize]> = fc
  .tuple(
    fc.constantFrom(...testableBlockSizes),
    fc.constantFrom(...testableBlockSizes),
  )
  .filter(([b1, b2]) => b1 !== b2);

/**
 * Arbitrary: random data of exactly the given block size length.
 */
function arbDataForSize(blockSize: BlockSize): fc.Arbitrary<Uint8Array> {
  return fc.uint8Array({
    minLength: blockSize as number,
    maxLength: blockSize as number,
  });
}

/**
 * Arbitrary: a pair of distinct block sizes with random data for each.
 */
const arbDistinctBlockSizePairWithData: fc.Arbitrary<{
  b1: BlockSize;
  b2: BlockSize;
  data1: Uint8Array;
  data2: Uint8Array;
}> = arbDistinctBlockSizePair.chain(([b1, b2]) =>
  fc.tuple(arbDataForSize(b1), arbDataForSize(b2)).map(([data1, data2]) => ({
    b1,
    b2,
    data1,
    data2,
  })),
);

describe('Property 1: Fault Condition — Multi-Size Block Storage Rejected by Single-Size Store', () => {
  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  /**
   * Property: For any two distinct valid BlockSize values B1 and B2,
   * a store configured with supportedBlockSizes: [B1, B2] should:
   * 1. Accept blocks of both sizes via setData()
   * 2. Store them successfully
   * 3. Retrieve each by checksum with identical data
   *
   * On unfixed code, this fails because:
   * - MemoryBlockStore has no `supportedBlockSizes` property
   * - The constructor only accepts a single BlockSize
   * - There is no way to create a multi-size store
   */
  it('should accept and retrieve blocks of two distinct sizes in a multi-size store', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbDistinctBlockSizePairWithData,
        async ({ b1, b2, data1, data2 }) => {
          // === BUG CONDITION ===
          // On unfixed code, MemoryBlockStore only accepts a single BlockSize.
          // The constructor signature was: new MemoryBlockStore(blockSize: BlockSize)
          // There was no supportedBlockSizes parameter.
          //
          // The fixed behavior accepts an array of supported block sizes:
          //   new MemoryBlockStore([b1, b2])

          // Create a multi-size store with both block sizes
          const store = new MemoryBlockStore([b1, b2]);

          // Verify the store exposes supportedBlockSizes containing both sizes
          expect(store.supportedBlockSizes).toBeDefined();
          expect(Array.isArray(store.supportedBlockSizes)).toBe(true);
          expect(store.supportedBlockSizes).toContain(b1);
          expect(store.supportedBlockSizes).toContain(b2);

          // Create blocks of both sizes
          const block1 = new RawDataBlock(b1, data1);
          const block2 = new RawDataBlock(b2, data2);

          // Store both blocks — on unfixed code, the second block may be rejected
          // because block2.blockSize !== store.blockSize
          await store.setData(block1);
          await store.setData(block2);

          // Verify both blocks are stored
          expect(await store.has(block1.idChecksum)).toBe(true);
          expect(await store.has(block2.idChecksum)).toBe(true);

          // Retrieve both blocks and verify data integrity
          const retrieved1 = await store.getData(block1.idChecksum);
          const retrieved2 = await store.getData(block2.idChecksum);

          expect(retrieved1.blockSize).toBe(b1);
          expect(retrieved2.blockSize).toBe(b2);
          expect(arraysEqual(retrieved1.data, data1)).toBe(true);
          expect(arraysEqual(retrieved2.data, data2)).toBe(true);
        },
      ),
      { numRuns: 10 },
    );
  });
});
