import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { RawDataBlock } from '../blocks/rawData';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { DiskBlockAsyncStore } from './diskBlockAsyncStore';

describe('DiskBlockAsyncStore', () => {
  let store: DiskBlockAsyncStore;
  const testDir = join(__dirname, 'test-store');
  const blockSize = BlockSize.Message;

  beforeEach(() => {
    // Create test directory
    mkdirSync(testDir, { recursive: true });
    store = new DiskBlockAsyncStore(testDir, blockSize);
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('Basic Operations', () => {
    it('should store and retrieve block data', async () => {
      const data = Buffer.alloc(blockSize, 'x');
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const block = new RawDataBlock(
        blockSize,
        data,
        new Date(),
        checksum,
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      // Store block
      store.setData(block);

      // Check if block exists
      const exists = await store.has(checksum);
      expect(exists).toBe(true);

      // Retrieve block
      const retrieved = store.getData(checksum);
      expect(retrieved.data).toEqual(data);
      expect(retrieved.blockSize).toBe(blockSize);
      expect(retrieved.blockType).toBe(BlockType.RawData);
      expect(retrieved.dateCreated).toBeInstanceOf(Date);
    });

    it('should get block handle', () => {
      const data = Buffer.alloc(blockSize, 'x');
      const checksum = StaticHelpersChecksum.calculateChecksum(data);

      const handle = store.get(checksum);
      expect(handle.blockType).toBe(BlockType.Handle);
      expect(handle.blockSize).toBe(blockSize);
      expect(handle.canRead).toBe(true);
      expect(handle.canPersist).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should throw error when getting non-existent block', () => {
      const nonExistentChecksum = StaticHelpersChecksum.calculateChecksum(
        Buffer.from('nonexistent'),
      );

      expect(() => store.getData(nonExistentChecksum)).toThrowError(
        new StoreError(StoreErrorType.KeyNotFound),
      );
    });

    it('should throw error when storing block with wrong size', () => {
      const wrongSizeData = Buffer.alloc(blockSize, 'x');
      const checksum = StaticHelpersChecksum.calculateChecksum(wrongSizeData);
      const block = new RawDataBlock(
        BlockSize.Tiny, // Different size than store's blockSize
        wrongSizeData,
        new Date(),
        checksum,
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      expect(() => store.setData(block)).toThrowError(
        new StoreError(StoreErrorType.BlockSizeMismatch),
      );
    });

    it('should throw error when storing block that already exists', () => {
      const data = Buffer.alloc(blockSize, 'x');
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const block = new RawDataBlock(
        blockSize,
        data,
        new Date(),
        checksum,
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      store.setData(block);
      expect(() => store.setData(block)).toThrowError(
        new StoreError(StoreErrorType.BlockPathAlreadyExists),
      );
    });
  });

  describe('XOR Operations', () => {
    it('should XOR multiple blocks', async () => {
      // Create test blocks
      const block1 = new RawDataBlock(
        blockSize,
        Buffer.alloc(blockSize, 0x01),
        new Date(),
        StaticHelpersChecksum.calculateChecksum(Buffer.alloc(blockSize, 0x01)),
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      const block2 = new RawDataBlock(
        blockSize,
        Buffer.alloc(blockSize, 0x02),
        new Date(),
        StaticHelpersChecksum.calculateChecksum(Buffer.alloc(blockSize, 0x02)),
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      // Store blocks
      store.setData(block1);
      store.setData(block2);

      // Get handles
      const handle1 = store.get(block1.idChecksum);
      const handle2 = store.get(block2.idChecksum);

      // Create metadata for result
      const destDate = new Date();
      const result = await store.xor([handle1, handle2], {
        dateCreated: destDate,
        size: blockSize,
        type: BlockType.RawData,
        dataType: BlockDataType.RawData,
        lengthWithoutPadding: blockSize, // No padding in test data
      });

      // Expected result: 0x01 XOR 0x02 = 0x03
      const expectedData = Buffer.alloc(blockSize, 0x03);
      expect(result.data).toEqual(expectedData);
      expect(result.dateCreated).toEqual(destDate);
    });

    it('should throw error when XORing empty block list', async () => {
      const destDate = new Date();
      await expect(
        store.xor([], {
          dateCreated: destDate,
          size: blockSize,
          type: BlockType.RawData,
          dataType: BlockDataType.RawData,
          lengthWithoutPadding: blockSize,
        }),
      ).rejects.toThrowError(new StoreError(StoreErrorType.NoBlocksProvided));
    });
  });
});
