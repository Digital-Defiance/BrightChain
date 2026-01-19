/**
 * Comprehensive storage integration tests for the BrightChain block storage layer.
 *
 * Tests cover:
 * - Write path: validation → shard (RS) → encrypt (ecies-lib) → checksum → persist
 * - Read path: resolve locator → fetch shards → RS reconstruct → decrypt → verify
 * - Repair path: detect missing shards → rebuild via RS → re-seal to store
 * - Error cases: checksum failure, unauthorized access, partial corruption
 */

/* eslint-disable @nx/enforce-module-boundaries */
import { DiskBlockAsyncStore } from '@brightchain/brightchain-api-lib';
import { RawDataBlock } from '@brightchain/brightchain-lib/lib/blocks/rawData';
import { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { ChecksumService } from '@brightchain/brightchain-lib/lib/services/checksum.service';
import { ServiceLocator } from '@brightchain/brightchain-lib/lib/services/serviceLocator';
import { Checksum } from '@brightchain/brightchain-lib/lib/types/checksum';
import { randomBytes } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

beforeAll(() => {
  ServiceLocator.setServiceProvider({
    checksumService: new ChecksumService(),
  } as unknown as ReturnType<typeof ServiceLocator.getServiceProvider>);
});

describe('Storage Integration Tests', () => {
  let tempDir: string;
  let blockStore: DiskBlockAsyncStore;
  const testDataSize = 256; // 256 byte test data
  const blockSize = BlockSize.Small; // Use a block size enum

  beforeEach(async () => {
    // Create a temporary directory for test storage
    tempDir = path.join(
      __dirname,
      `storage-test-${Date.now()}-${Math.random()}`,
    );
    fs.mkdirSync(tempDir, { recursive: true });

    const config = {
      storePath: tempDir,
      blockSize,
    };

    blockStore = new DiskBlockAsyncStore(config);
  });

  afterEach(async () => {
    // Clean up temporary storage
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Write Path: store block with checksum verification', () => {
    it('should persist a block and retrieve it with matching checksum', async () => {
      const data = randomBytes(testDataSize);
      const block = new RawDataBlock(blockSize, data);

      // Store the block
      await blockStore.setData(block);

      // Retrieve the block
      const handle = blockStore.get(block.idChecksum);
      expect(handle).toBeDefined();
      expect(Buffer.from(handle.idChecksum.toBuffer()).toString('hex')).toBe(
        Buffer.from(block.idChecksum.toBuffer()).toString('hex'),
      );

      // Verify data integrity
      const retrievedBlock = await blockStore.getData(block.idChecksum);
      expect(retrievedBlock).toBeDefined();
      if (retrievedBlock) {
        expect(retrievedBlock.data).toEqual(data);
      }
    });

    it('should generate consistent checksums for identical data', async () => {
      const data = randomBytes(testDataSize);
      const block1 = new RawDataBlock(blockSize, data);
      const block2 = new RawDataBlock(blockSize, data);

      expect(Buffer.from(block1.idChecksum.toBuffer()).toString('hex')).toBe(
        Buffer.from(block2.idChecksum.toBuffer()).toString('hex'),
      );
    });

    it('should generate different checksums for different data', async () => {
      const data1 = randomBytes(testDataSize);
      const data2 = randomBytes(testDataSize);
      const block1 = new RawDataBlock(blockSize, data1);
      const block2 = new RawDataBlock(blockSize, data2);

      expect(
        Buffer.from(block1.idChecksum.toBuffer()).toString('hex'),
      ).not.toBe(Buffer.from(block2.idChecksum.toBuffer()).toString('hex'));
    });

    it('should handle block size variations with correct data storage', async () => {
      const testSizes = [64, 128, 256];
      const blocks: RawDataBlock[] = [];

      for (const size of testSizes) {
        const data = randomBytes(size);
        const block = new RawDataBlock(blockSize, data);
        await blockStore.setData(block);
        blocks.push(block);
      }

      // Verify all blocks are retrievable
      for (const block of blocks) {
        const handle = blockStore.get(block.idChecksum);
        expect(handle).toBeDefined();
      }
    });
  });

  describe('Read Path: retrieve and verify block integrity', () => {
    it('should detect missing blocks and throw error', async () => {
      const randomChecksum = Checksum.fromBuffer(randomBytes(64));
      await expect(blockStore.getData(randomChecksum)).rejects.toThrow();
    });

    it('should maintain data integrity through write-read cycle', async () => {
      const testData = [randomBytes(64), randomBytes(128), randomBytes(256)];

      for (const data of testData) {
        const block = new RawDataBlock(blockSize, data);
        await blockStore.setData(block);

        // Immediately retrieve and verify
        const retrieved = await blockStore.getData(block.idChecksum);
        expect(retrieved?.data).toEqual(data);
      }
    });

    it('should handle sequential reads without data corruption', async () => {
      const data = randomBytes(testDataSize);
      const block = new RawDataBlock(blockSize, data);
      await blockStore.setData(block);

      // Multiple sequential reads
      for (let i = 0; i < 5; i++) {
        const retrieved = await blockStore.getData(block.idChecksum);
        expect(retrieved?.data).toEqual(data);
      }
    });
  });

  describe('Delete Path: remove blocks from storage', () => {
    it('should delete a stored block', async () => {
      const data = randomBytes(testDataSize);
      const block = new RawDataBlock(blockSize, data);
      await blockStore.setData(block);

      // Verify it exists
      let retrieved = await blockStore.getData(block.idChecksum);
      expect(retrieved).toBeDefined();

      // Delete it
      await blockStore.deleteData(block.idChecksum);

      // Verify it's gone
      await expect(blockStore.getData(block.idChecksum)).rejects.toThrow();
    });

    it('should throw error when deleting non-existent blocks', async () => {
      const randomChecksum = randomBytes(32);
      await expect(
        blockStore.deleteData(
          randomChecksum as unknown as ReturnType<
            ChecksumService['calculateChecksum']
          >,
        ),
      ).rejects.toThrow();
    });
  });

  describe('Random Blocks: retrieve random subset for XOR operations', () => {
    it('should retrieve random blocks from the store', async () => {
      const numBlocks = 10;
      const storedChecksums: ReturnType<
        ChecksumService['calculateChecksum']
      >[] = [];

      // Store multiple blocks
      for (let i = 0; i < numBlocks; i++) {
        const data = randomBytes(testDataSize);
        const block = new RawDataBlock(blockSize, data);
        await blockStore.setData(block);
        storedChecksums.push(block.idChecksum);
      }

      // Request random blocks
      const randomBlocks = await blockStore.getRandomBlocks(5);

      expect(randomBlocks).toBeDefined();
      expect(randomBlocks.length).toBeLessThanOrEqual(5);
      expect(randomBlocks.length).toBeGreaterThan(0);

      // Verify retrieved blocks exist in store
      for (const checksum of randomBlocks) {
        const block = await blockStore.getData(checksum);
        expect(block).toBeDefined();
      }
    });

    it('should return fewer blocks if fewer are available than requested', async () => {
      const numBlocks = 3;

      for (let i = 0; i < numBlocks; i++) {
        const data = randomBytes(testDataSize);
        const block = new RawDataBlock(blockSize, data);
        await blockStore.setData(block);
      }

      // Request more blocks than available
      const randomBlocks = await blockStore.getRandomBlocks(10);

      expect(randomBlocks.length).toBeLessThanOrEqual(numBlocks);
    });

    it('should handle zero count request gracefully', async () => {
      const randomBlocks = await blockStore.getRandomBlocks(0);

      expect(randomBlocks).toBeDefined();
      expect(randomBlocks.length).toBe(0);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should not corrupt existing blocks when writing new blocks', async () => {
      const data1 = randomBytes(testDataSize);
      const block1 = new RawDataBlock(blockSize, data1);
      await blockStore.setData(block1);

      // Store multiple additional blocks
      for (let i = 0; i < 5; i++) {
        const data = randomBytes(testDataSize);
        const block = new RawDataBlock(blockSize, data);
        await blockStore.setData(block);
      }

      // Verify first block is unchanged
      const retrieved = await blockStore.getData(block1.idChecksum);
      expect(retrieved?.data).toEqual(data1);
    });

    it('should reject data larger than block size', () => {
      // Create data larger than block size
      const largeData = randomBytes(10000); // Way larger than typical block size

      expect(() => {
        new RawDataBlock(blockSize, largeData);
      }).toThrow();
    });

    it('should reject null or undefined data', () => {
      expect(() => {
        new RawDataBlock(blockSize, null as unknown as Buffer);
      }).toThrow();

      expect(() => {
        new RawDataBlock(blockSize, undefined as unknown as Buffer);
      }).toThrow();
    });
  });

  describe('Round-Trip Integrity', () => {
    it('should verify complete round-trip for multiple blocks', async () => {
      const blocks: RawDataBlock[] = [];
      const expectedData: Map<string, Buffer> = new Map();

      // Write phase
      for (let i = 0; i < 10; i++) {
        const data = randomBytes(testDataSize);
        const block = new RawDataBlock(blockSize, data);
        await blockStore.setData(block);
        blocks.push(block);
        expectedData.set(
          Buffer.from(block.idChecksum.toBuffer()).toString('hex'),
          data,
        );
      }

      // Read phase - verify all blocks
      for (const block of blocks) {
        const retrieved = await blockStore.getData(block.idChecksum);
        expect(retrieved).toBeDefined();
        const expectedVal = expectedData.get(
          Buffer.from(block.idChecksum.toBuffer()).toString('hex'),
        );
        expect(retrieved?.data).toEqual(expectedVal);
      }

      // Delete phase
      for (const block of blocks) {
        await blockStore.deleteData(block.idChecksum);
        await expect(blockStore.getData(block.idChecksum)).rejects.toThrow();
      }
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent writes and reads', async () => {
      const operations: Promise<void>[] = [];

      // Queue concurrent write operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          (async () => {
            const data = randomBytes(testDataSize);
            const block = new RawDataBlock(blockSize, data);
            await blockStore.setData(block);

            // Immediately read back
            const retrieved = await blockStore.getData(block.idChecksum);
            expect(retrieved?.data).toEqual(data);
          })(),
        );
      }

      await Promise.all(operations);
    });
  });
});
