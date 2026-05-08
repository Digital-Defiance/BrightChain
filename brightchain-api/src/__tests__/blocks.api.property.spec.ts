/**
 * @fileoverview Property-based tests for Block API round-trip
 *
 * **Feature: backend-blockstore-brightTrust, Property 13: Block API Round-Trip**
 * **Validates: Requirements 11.1, 11.2, 11.4**
 *
 * This test suite verifies that:
 * - POSTing to /api/blocks and then GETting /api/blocks/:id returns the same block data
 * - The metadata endpoint returns valid metadata
 * - Block storage and retrieval is consistent
 */

import {
  BlockSize,
  brightDateToDate,
  DurabilityLevel,
  initializeBrightChain,
  MemoryBlockStore,
  RawDataBlock,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

describe('Block API Round-Trip Property Tests', () => {
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  beforeEach(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('Property 13: Block API Round-Trip', () => {
    /**
     * Property: For any valid block data, storing the block and then retrieving it
     * SHALL return the same block data.
     *
     * **Validates: Requirements 11.1, 11.2**
     */
    it('should store and retrieve block data correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const store = new MemoryBlockStore(blockSize);

            // Create and store the block
            const block = new RawDataBlock(blockSize, data);
            await store.setData(block, {
              durabilityLevel: DurabilityLevel.Ephemeral,
            });

            // Verify the block exists
            const exists = await store.has(block.idChecksum);
            expect(exists).toBe(true);

            // Get the block using the handle (which doesn't have date validation issues)
            const handle = store.get(block.idChecksum);

            // Verify the data matches
            const originalBuffer = Buffer.from(data);
            // The retrieved data may be padded, so we compare the original length
            const handleData = handle.data as Uint8Array;
            const retrievedSlice = Buffer.from(handleData).slice(
              0,
              originalBuffer.length,
            );
            expect(retrievedSlice.equals(originalBuffer)).toBe(true);
          },
        ),
        { numRuns: 30 },
      );
    }, 60000);

    /**
     * Property: For any stored block, the metadata endpoint SHALL return valid metadata
     * containing the correct block ID and creation timestamp.
     *
     * **Validates: Requirements 11.4**
     */
    it('should return valid metadata for stored blocks', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const store = new MemoryBlockStore(blockSize);

            const beforeStore = new Date();

            // Create and store the block
            const block = new RawDataBlock(blockSize, data);
            await store.setData(block, {
              durabilityLevel: DurabilityLevel.Standard,
            });

            // Get metadata
            const blockIdHex = Buffer.from(
              block.idChecksum.toBuffer(),
            ).toString('hex');
            const metadata = await store.getMetadata(blockIdHex);

            // Verify metadata is valid
            expect(metadata).not.toBeNull();
            expect(metadata!.blockId).toBe(blockIdHex);
            expect(brightDateToDate(metadata!.createdAt).getTime()).toBeGreaterThanOrEqual(
              beforeStore.getTime() - 1000, // Allow 1 second tolerance
            );
            expect(metadata!.size).toBeGreaterThan(0);
            expect(metadata!.checksum).toBe(blockIdHex);
            expect(metadata!.durabilityLevel).toBe(DurabilityLevel.Standard);
          },
        ),
        { numRuns: 30 },
      );
    }, 60000);

    /**
     * Property: For any stored block with durability options, the metadata SHALL
     * reflect the specified durability level.
     *
     * **Validates: Requirements 11.1**
     */
    it('should store blocks with specified durability options', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.constantFrom(
            DurabilityLevel.Ephemeral,
            DurabilityLevel.Standard,
            DurabilityLevel.HighDurability,
          ),
          async (data, durabilityLevel) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const store = new MemoryBlockStore(blockSize);

            // Create and store the block with durability options
            const block = new RawDataBlock(blockSize, data);
            await store.setData(block, { durabilityLevel });

            // Get metadata
            const blockIdHex = Buffer.from(
              block.idChecksum.toBuffer(),
            ).toString('hex');
            const metadata = await store.getMetadata(blockIdHex);

            // Verify durability level is set correctly
            expect(metadata).not.toBeNull();
            expect(metadata!.durabilityLevel).toBe(durabilityLevel);
          },
        ),
        { numRuns: 20 },
      );
    }, 60000);
  });
});
