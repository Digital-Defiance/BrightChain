import { randomBytes } from 'crypto';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockAccessError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumUint8Array } from '../types';
import { BlockHandle, createBlockHandleFromPath } from './handle';
import { RawDataBlock } from './rawData';

describe('BlockHandle', () => {
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Small;
  const testDir = join(__dirname, 'test-blocks');

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
    rmSync(testDir, { recursive: true, force: true });
  });

  const createTestFile = (
    data?: Buffer,
  ): { path: string; checksum: ChecksumUint8Array } => {
    const blockData = data || randomBytes(defaultBlockSize);
    const checksum = checksumService.calculateChecksum(blockData);
    const path = join(testDir, Buffer.from(checksum).toString('hex'));
    writeFileSync(path, blockData);
    return { path, checksum };
  };

  describe('basic functionality', () => {
    it('should create handle from path', async () => {
      const { path, checksum } = createTestFile();
      const handle: BlockHandle<RawDataBlock> = await createBlockHandleFromPath(
        RawDataBlock,
        path,
        defaultBlockSize,
        checksum,
      );

      expect(handle.blockSize).toBe(defaultBlockSize);
      expect(handle.blockType).toBe(BlockType.Handle);
      expect(handle.blockDataType).toBe(BlockDataType.RawData);
      expect(Buffer.from(handle.idChecksum).equals(Buffer.from(checksum))).toBe(true);
      expect(handle.path).toBe(path);
      expect(handle.canRead).toBe(true);
      expect(handle.canPersist).toBe(true);
    });

    it('should reject non-existent path', async () => {
      await expect(
        createBlockHandleFromPath(RawDataBlock, 'nonexistent', defaultBlockSize),
      ).rejects.toThrow(BlockAccessError);
    });

    it('should calculate checksum if not provided', async () => {
      const { path } = createTestFile();
      const handle: BlockHandle<RawDataBlock> = await createBlockHandleFromPath(
        RawDataBlock,
        path,
        defaultBlockSize,
      );
      expect(handle.idChecksum).toBeDefined();
      await expect(handle.validateAsync()).resolves.not.toThrow();
    });
  });

  describe('data access', () => {
    it('should read data correctly', async () => {
      const testData = randomBytes(defaultBlockSize);
      const { path, checksum } = createTestFile(testData);
      const handle: BlockHandle<RawDataBlock> = await createBlockHandleFromPath(
        RawDataBlock,
        path,
        defaultBlockSize,
        checksum,
      );
      expect(handle.data).toEqual(testData);
    });

    it('should handle non-readable blocks', async () => {
      const { path, checksum } = createTestFile();
      const handle: BlockHandle<RawDataBlock> = await createBlockHandleFromPath(
        RawDataBlock,
        path,
        defaultBlockSize,
        checksum,
        false, // canRead = false
      );

      expect(() => handle.data).toThrow(BlockAccessError);
      expect(() => handle.getReadStream()).toThrow(
        new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable),
      );
    });

    it('should handle non-persistable blocks', async () => {
      const { path, checksum } = createTestFile();
      const handle: BlockHandle<RawDataBlock> = await createBlockHandleFromPath(
        RawDataBlock,
        path,
        defaultBlockSize,
        checksum,
        true, // canRead = true
        false, // canPersist = false
      );

      expect(() => handle.getWriteStream()).toThrow(
        new BlockAccessError(BlockAccessErrorType.BlockIsNotPersistable),
      );
    });
  });

  describe('validation', () => {
    it('should detect data corruption', async () => {
      const testData = randomBytes(defaultBlockSize);
      const { path, checksum } = createTestFile(testData);
      const handle: BlockHandle<RawDataBlock> = await createBlockHandleFromPath(
        RawDataBlock,
        path,
        defaultBlockSize,
        checksum,
      );

      // Corrupt the file
      const corruptedData = Buffer.from(testData);
      corruptedData[0]++; // Modify first byte
      writeFileSync(path, corruptedData);

      await expect(handle.validateAsync()).rejects.toThrow(
        ChecksumMismatchError,
      );
      expect(() => handle.validateSync()).toThrow(ChecksumMismatchError);
    });

    it('should validate correct data', async () => {
      const { path, checksum } = createTestFile();
      const handle: BlockHandle<RawDataBlock> = await createBlockHandleFromPath(
        RawDataBlock,
        path,
        defaultBlockSize,
        checksum,
      );

      await expect(handle.validateAsync()).resolves.not.toThrow();
      expect(() => handle.validateSync()).not.toThrow();
    });
  });

  describe('caching', () => {
    it('should cache data', async () => {
      const { path, checksum } = createTestFile();
      const handle: BlockHandle<RawDataBlock> = await createBlockHandleFromPath(
        RawDataBlock,
        path,
        defaultBlockSize,
        checksum,
      );

      // Access data to cache it
      handle.data;

      // Delete the file to verify we're using cached data
      rmSync(path);

      // Should still be able to access data
      expect(() => handle.data).not.toThrow();

      // Clear cache
      handle.clearCache();

      // Should now throw when trying to access data
      expect(() => handle.data).toThrow(BlockAccessError);
      expect(() => handle.metadata).toThrow(BlockAccessError);
    });
  });

  describe('conversion to RawDataBlock', () => {
    it('should convert to RawDataBlock correctly', async () => {
      const testData = randomBytes(defaultBlockSize);
      const { path, checksum } = createTestFile(testData);
      const handle: BlockHandle<RawDataBlock> = await createBlockHandleFromPath(
        RawDataBlock,
        path,
        defaultBlockSize,
        checksum,
      );
      const rawBlock = handle.block;

      expect(rawBlock.blockSize).toBe(handle.blockSize);
      expect(rawBlock.blockType).toBe(handle.blockType);
      expect(rawBlock.blockDataType).toBe(handle.blockDataType);
      expect(rawBlock.data).toEqual(handle.data);
      expect(Buffer.from(rawBlock.idChecksum).equals(Buffer.from(handle.idChecksum))).toBe(true);
    });
  });
});
