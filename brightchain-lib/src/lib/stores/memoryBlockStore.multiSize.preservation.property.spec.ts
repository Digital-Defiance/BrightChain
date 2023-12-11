/**
 * Property 2: Preservation — Single-Size Store/Retrieve and getRandomBlocks Behavior Unchanged
 *
 * These tests capture the EXISTING single-size behavior of MemoryBlockStore
 * on UNFIXED code. They must PASS both before and after the multi-size fix,
 * confirming no regressions in single-size operations.
 *
 * Preservation scope:
 * - Single-size store/retrieve with checksum integrity
 * - getRandomBlocks scoping to stored blocks
 * - Metadata operations (has, deleteData, size)
 *
 * **Validates: Requirements 3.1, 3.2, 3.6**
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
 * Arbitrary: random data of exactly the given block size length.
 */
function arbDataForSize(blockSize: BlockSize): fc.Arbitrary<Uint8Array> {
  return fc.uint8Array({
    minLength: blockSize as number,
    maxLength: blockSize as number,
  });
}

describe('Property 2: Preservation — Single-Size Store/Retrieve and getRandomBlocks Behavior Unchanged', () => {
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
   * Property: Checksum integrity preservation
   *
   * For all valid BlockSize values and random Uint8Array data of appropriate
   * length, storing a RawDataBlock and retrieving by checksum returns identical data.
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  it('should preserve checksum integrity: store then retrieve returns identical data for any single block size', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .constantFrom(...testableBlockSizes)
          .chain((blockSize) =>
            arbDataForSize(blockSize).map((data) => ({ blockSize, data })),
          ),
        async ({ blockSize, data }) => {
          const store = new MemoryBlockStore(blockSize);
          const block = new RawDataBlock(blockSize, data);

          await store.setData(block);

          // Retrieve by checksum
          const retrieved = await store.getData(block.idChecksum);

          // Data must be identical
          expect(arraysEqual(retrieved.data, data)).toBe(true);
          // Block size must match
          expect(retrieved.blockSize).toBe(blockSize);
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Size-scoped random block selection preservation
   *
   * For all valid BlockSize values, getRandomBlocks(n) returns at most n
   * checksums, all of which exist in the store.
   *
   * **Validates: Requirements 3.2, 3.6**
   */
  it('should preserve getRandomBlocks: returns at most n checksums, all existing in the store', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testableBlockSizes),
        // Number of blocks to store (1-5)
        fc.integer({ min: 1, max: 5 }),
        // Number of random blocks to request (1-8, may exceed stored count)
        fc.integer({ min: 1, max: 8 }),
        async (blockSize, blockCount, requestCount) => {
          const store = new MemoryBlockStore(blockSize);
          const storedChecksums = new Set<string>();

          // Store N distinct blocks with unique random data
          for (let i = 0; i < blockCount; i++) {
            const data = new Uint8Array(blockSize as number);
            crypto.getRandomValues(data);
            const block = new RawDataBlock(blockSize, data);
            await store.setData(block);
            storedChecksums.add(block.idChecksum.toHex());
          }

          // Request random blocks
          const randomChecksums = await store.getRandomBlocks(
            requestCount,
            blockSize,
          );

          // Should return at most requestCount checksums
          expect(randomChecksums.length).toBeLessThanOrEqual(requestCount);
          // Should return at most the number of stored blocks
          expect(randomChecksums.length).toBeLessThanOrEqual(
            storedChecksums.size,
          );

          // Every returned checksum must exist in the store
          for (const checksum of randomChecksums) {
            expect(await store.has(checksum)).toBe(true);
            expect(storedChecksums.has(checksum.toHex())).toBe(true);
          }
        },
      ),
      { numRuns: 20 },
    );
  });

  /**
   * Property: Metadata consistency preservation
   *
   * For all valid BlockSize values, store N blocks then verify size() equals N
   * and has() returns true for each stored checksum. Also verify deleteData()
   * removes blocks and has() returns false afterward.
   *
   * **Validates: Requirements 3.1, 3.6**
   */
  it('should preserve metadata consistency: size() reflects stored count, has() and deleteData() work correctly', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...testableBlockSizes),
        // Number of blocks to store (1-5)
        fc.integer({ min: 1, max: 5 }),
        async (blockSize, blockCount) => {
          const store = new MemoryBlockStore(blockSize);
          const blocks: RawDataBlock[] = [];

          // Store N distinct blocks
          for (let i = 0; i < blockCount; i++) {
            const data = new Uint8Array(blockSize as number);
            crypto.getRandomValues(data);
            const block = new RawDataBlock(blockSize, data);
            await store.setData(block);
            blocks.push(block);
          }

          // size() should equal the number of stored blocks
          expect(store.size()).toBe(blocks.length);

          // has() should return true for every stored block
          for (const block of blocks) {
            expect(await store.has(block.idChecksum)).toBe(true);
          }

          // Delete the first block
          const deletedBlock = blocks[0];
          await store.deleteData(deletedBlock.idChecksum);

          // has() should return false for the deleted block
          expect(await store.has(deletedBlock.idChecksum)).toBe(false);

          // size() should decrease by 1
          expect(store.size()).toBe(blocks.length - 1);

          // Remaining blocks should still be accessible
          for (let i = 1; i < blocks.length; i++) {
            expect(await store.has(blocks[i].idChecksum)).toBe(true);
          }
        },
      ),
      { numRuns: 20 },
    );
  });
});
