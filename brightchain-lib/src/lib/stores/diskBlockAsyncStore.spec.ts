import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { RawDataBlock } from '../blocks/rawData';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { BlockAccessError } from '../errors/block';
import { StoreError } from '../errors/storeError';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { DiskBlockAsyncStore } from './diskBlockAsyncStore';

describe('DiskBlockAsyncStore', () => {
  let store: DiskBlockAsyncStore;
  let checksumService: ChecksumService;
  const testDir = join('/tmp', 'brightchain');
  const blockSize = BlockSize.Message;

  beforeEach(() => {
    // Create test directory with proper structure
    mkdirSync(testDir, { recursive: true });
    // Create block size subdirectory using hex representation
    const blockSizeDir = join(testDir, blockSize.toString(16).padStart(8, '0'));
    mkdirSync(blockSizeDir, { recursive: true });
    // Create first and second level directories for test blocks
    const firstLevelDir = join(blockSizeDir, '00');
    const secondLevelDir = join(firstLevelDir, '00');
    mkdirSync(secondLevelDir, { recursive: true });
    store = new DiskBlockAsyncStore({ storePath: testDir, blockSize });
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  afterEach(() => {
    // Clean up test directory
    rmSync(testDir, { recursive: true, force: true });
  });

  describe('Basic Operations', () => {
    it('should throw when getting non-existent block handle', () => {
      const data = Buffer.alloc(blockSize, 'x');
      const checksum = checksumService.calculateChecksum(data);

      expect(() => store.get(checksum)).toThrowType(
        BlockAccessError,
        (error: BlockAccessError) => {
          expect(error.type).toBe(BlockAccessErrorType.BlockFileNotFound);
        },
      );
    });

    it('should store and retrieve block data', async () => {
      const data = Buffer.alloc(blockSize, 'x');
      const checksum = checksumService.calculateChecksum(data);
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

      // Ensure directory exists and store block
      const checksumHex = Buffer.from(checksum).toString('hex');
      const blockDir = join(
        testDir,
        blockSize.toString(16).padStart(8, '0'),
        checksumHex.substring(0, 2),
        checksumHex.substring(2, 4),
      );
      mkdirSync(blockDir, { recursive: true });
      await store.setData(block);

      // Check if block exists
      const exists = await store.has(checksum);
      expect(exists).toBe(true);

      // Retrieve block
      const retrieved = await store.getData(checksum);
      expect(retrieved.data).toEqual(data);
      expect(retrieved.blockSize).toBe(blockSize);
      expect(retrieved.blockType).toBe(BlockType.RawData);
      expect(retrieved.dateCreated).toBeInstanceOf(Date);
    });

    it('should get block handle', async () => {
      const data = Buffer.alloc(blockSize, 'x');
      const checksum = checksumService.calculateChecksum(data);
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

      // Ensure directory exists and store block
      const checksumHex = Buffer.from(checksum).toString('hex');
      const blockDir = join(
        testDir,
        blockSize.toString(16).padStart(8, '0'),
        checksumHex.substring(0, 2),
        checksumHex.substring(2, 4),
      );
      mkdirSync(blockDir, { recursive: true });
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
      const nonExistentChecksum = checksumService.calculateChecksum(
        Buffer.from('nonexistent'),
      );

      try {
        await store.getData(nonExistentChecksum);
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StoreError);
        if (error instanceof StoreError) {
          expect(error.type).toBe(StoreErrorType.KeyNotFound);
          expect(error.params?.['KEY']).toBe(
            Buffer.from(nonExistentChecksum).toString('hex'),
          );
        }
      }
    });

    it('should throw error when storing block with wrong size', async () => {
      const wrongSizeData = Buffer.alloc(blockSize, 'x');
      const checksum = checksumService.calculateChecksum(wrongSizeData);
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

      await expect(store.setData(block)).rejects.toThrow(
        new StoreError(StoreErrorType.BlockSizeMismatch),
      );
    });

    it('should throw error when storing block that already exists', async () => {
      const data = Buffer.alloc(blockSize, 'x');
      const checksum = checksumService.calculateChecksum(data);
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

      // Ensure directory exists and store block
      const checksumHex = Buffer.from(checksum).toString('hex');
      const blockDir = join(
        testDir,
        blockSize.toString(16).padStart(8, '0'),
        checksumHex.substring(0, 2),
        checksumHex.substring(2, 4),
      );
      mkdirSync(blockDir, { recursive: true });
      await store.setData(block);
      await expect(store.setData(block)).rejects.toThrow(
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
        checksumService.calculateChecksum(Buffer.alloc(blockSize, 0x01)),
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      const block2 = new RawDataBlock(
        blockSize,
        Buffer.alloc(blockSize, 0x02),
        new Date(),
        checksumService.calculateChecksum(Buffer.alloc(blockSize, 0x02)),
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      // Ensure directory exists and store blocks
      const block1ChecksumHex = Buffer.from(block1.idChecksum).toString('hex');
      const block2ChecksumHex = Buffer.from(block2.idChecksum).toString('hex');
      const blockDir1 = join(
        testDir,
        blockSize.toString(16).padStart(8, '0'),
        block1ChecksumHex.substring(0, 2),
        block1ChecksumHex.substring(2, 4),
      );
      const blockDir2 = join(
        testDir,
        blockSize.toString(16).padStart(8, '0'),
        block2ChecksumHex.substring(0, 2),
        block2ChecksumHex.substring(2, 4),
      );
      mkdirSync(blockDir1, { recursive: true });
      mkdirSync(blockDir2, { recursive: true });
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
      ).rejects.toThrow(new StoreError(StoreErrorType.NoBlocksProvided));
    });
  });
});
