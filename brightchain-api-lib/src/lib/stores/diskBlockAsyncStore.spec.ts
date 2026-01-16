import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  RawDataBlock,
  BlockDataType,
  BlockSize,
  BlockType,
  StoreErrorType,
  StoreError,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { DiskBlockAsyncStore } from './diskBlockAsyncStore';

describe('DiskBlockAsyncStore', () => {
  let store: DiskBlockAsyncStore;
  const testDir = join('/tmp', 'brightchain-test-' + Date.now());
  const blockSize = BlockSize.Message;

  beforeEach(() => {
    // Create test directory with proper structure
    mkdirSync(testDir, { recursive: true });
    store = new DiskBlockAsyncStore({ storePath: testDir, blockSize });
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('Basic Operations', () => {
    it('should throw when getting non-existent block handle', () => {
      const checksumService = ServiceProvider.getInstance().checksumService;
      const data = new Uint8Array(blockSize);
      data.fill(120); // 'x' character code
      const dataBuffer = Buffer.from(data);
      const checksum = checksumService.calculateChecksum(dataBuffer);

      expect(() => store.get(checksum)).toThrow(StoreError);
    });

    it('should store and retrieve block data', async () => {
      const checksumService = ServiceProvider.getInstance().checksumService;
      const data = new Uint8Array(blockSize);
      data.fill(120); // 'x' character code
      const dataBuffer = Buffer.from(data);
      const checksum = checksumService.calculateChecksum(dataBuffer);
      const block = new RawDataBlock(
        blockSize,
        dataBuffer,
        new Date(),
        checksum,
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      await store.setData(block);

      // Check if block exists
      const exists = await store.has(checksum);
      expect(exists).toBe(true);

      // Retrieve block
      const retrieved = await store.getData(checksum);
      expect(retrieved.data).toEqual(dataBuffer);
      expect(retrieved.blockSize).toBe(blockSize);
      expect(retrieved.blockType).toBe(BlockType.RawData);
      expect(retrieved.dateCreated).toBeInstanceOf(Date);
    });

    it('should get block handle', async () => {
      const checksumService = ServiceProvider.getInstance().checksumService;
      const data = new Uint8Array(blockSize);
      data.fill(120); // 'x' character code
      const dataBuffer = Buffer.from(data);
      const checksum = checksumService.calculateChecksum(dataBuffer);
      const block = new RawDataBlock(
        blockSize,
        dataBuffer,
        new Date(),
        checksum,
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      await store.setData(block);

      const handle = store.get(checksum);
      expect(handle.blockType).toBe(BlockType.Handle);
      expect(handle.blockSize).toBe(blockSize);
      expect(handle.canRead).toBe(true);
      expect(handle.canPersist).toBe(true);
    });
  });

  describe('Error Cases', () => {
    it('should throw error when getting non-existent block', async () => {
      const checksumService = ServiceProvider.getInstance().checksumService;
      const testData = new Uint8Array(32);
      testData.fill(110); // 'n' character code
      const nonExistentChecksum = checksumService.calculateChecksum(
        Buffer.from(testData),
      );

      await expect(store.getData(nonExistentChecksum)).rejects.toThrow(StoreError);
    });

    it('should throw error when storing block with wrong size', async () => {
      const checksumService = ServiceProvider.getInstance().checksumService;
      const wrongSizeData = new Uint8Array(blockSize);
      wrongSizeData.fill(120); // 'x' character code
      const wrongSizeBuffer = Buffer.from(wrongSizeData);
      const checksum = checksumService.calculateChecksum(wrongSizeBuffer);
      const block = new RawDataBlock(
        BlockSize.Tiny, // Different size than store's blockSize
        wrongSizeBuffer,
        new Date(),
        checksum,
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      await expect(store.setData(block)).rejects.toThrow(StoreError);
    });

    it('should throw error when storing block that already exists', async () => {
      const checksumService = ServiceProvider.getInstance().checksumService;
      const data = new Uint8Array(blockSize);
      data.fill(120); // 'x' character code
      const dataBuffer = Buffer.from(data);
      const checksum = checksumService.calculateChecksum(dataBuffer);
      const block = new RawDataBlock(
        blockSize,
        dataBuffer,
        new Date(),
        checksum,
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      await store.setData(block);
      await expect(store.setData(block)).rejects.toThrow(StoreError);
    });
  });

  describe('XOR Operations', () => {
    it('should XOR multiple blocks', async () => {
      const checksumService = ServiceProvider.getInstance().checksumService;
      // Create test blocks
      const data1 = new Uint8Array(blockSize);
      data1.fill(0x01);
      const buffer1 = Buffer.from(data1);
      const block1 = new RawDataBlock(
        blockSize,
        buffer1,
        new Date(),
        checksumService.calculateChecksum(buffer1),
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      const data2 = new Uint8Array(blockSize);
      data2.fill(0x02);
      const buffer2 = Buffer.from(data2);
      const block2 = new RawDataBlock(
        blockSize,
        buffer2,
        new Date(),
        checksumService.calculateChecksum(buffer2),
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      await store.setData(block1);
      await store.setData(block2);

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
        lengthWithoutPadding: blockSize,
      });

      // Expected result: 0x01 XOR 0x02 = 0x03
      const expectedData = new Uint8Array(blockSize);
      expectedData.fill(0x03);
      const expectedBuffer = Buffer.from(expectedData);
      expect(result.data).toEqual(expectedBuffer);
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
      ).rejects.toThrow(StoreError);
    });
  });
});
