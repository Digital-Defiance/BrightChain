import { randomBytes } from 'crypto';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { ChecksumBuffer } from '../types';
import { RawDataBlock } from './rawData';

describe('RawDataBlock', () => {
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Small;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  const createTestBlock = (
    options: Partial<{
      blockSize: BlockSize;
      data: Buffer;
      checksum: ChecksumBuffer;
      dateCreated: Date;
      blockType: BlockType;
      blockDataType: BlockDataType;
      canRead: boolean;
      canPersist: boolean;
    }> = {},
  ): RawDataBlock => {
    const data = options.data || randomBytes(defaultBlockSize);
    const checksum =
      options.checksum ||
      (checksumService.calculateChecksum(data) as ChecksumBuffer);

    return new RawDataBlock(
      options.blockSize || defaultBlockSize,
      data,
      options.dateCreated,
      checksum,
      options.blockType,
      options.blockDataType,
      options.canRead ?? true,
      options.canPersist ?? true,
    );
  };

  describe('basic functionality', () => {
    it('should construct and validate correctly', () => {
      const data = randomBytes(defaultBlockSize);
      const checksum = checksumService.calculateChecksum(data);
      const block = createTestBlock({ data, checksum });

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.RawData);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(block.data).toEqual(data);
      expect(block.idChecksum).toEqual(checksum);
      expect(block.canRead).toBe(true);
      expect(block.canPersist).toBe(true);
    });

    it('should handle empty data', () => {
      const block = createTestBlock({ data: Buffer.alloc(0) });
      expect(block.data.length).toBe(0);
      expect(block.payload.length).toBe(0);
      expect(block.layerHeaderData.length).toBe(0);
    });

    it('should reject oversized data', () => {
      const data = randomBytes(defaultBlockSize + 1);
      expect(() => createTestBlock({ data })).toThrow(
        `Data length (${defaultBlockSize + 1}) exceeds block size (${defaultBlockSize})`,
      );
    });
  });

  describe('data access', () => {
    it('should handle non-readable blocks', () => {
      const block = createTestBlock({ canRead: false });
      expect(() => block.data).toThrow('Block cannot be read');
      expect(() => block.payload).toThrow('Block cannot be read');
    });

    it('should provide correct data access', () => {
      const data = randomBytes(defaultBlockSize);
      const block = createTestBlock({ data });
      expect(block.data).toEqual(data);
      expect(block.payload).toEqual(data);
      expect(block.lengthBeforeEncryption).toBe(data.length);
    });
  });

  describe('validation', () => {
    it('should detect data corruption', () => {
      const data = randomBytes(defaultBlockSize);
      const checksum = checksumService.calculateChecksum(data);
      const block = createTestBlock({ data, checksum });

      // Corrupt the data after creation
      const corruptedData = Buffer.from(data);
      corruptedData[0]++; // Modify first byte
      Object.defineProperty(block, '_data', {
        value: corruptedData,
        writable: false,
      });

      expect(() => block.validateSync()).toThrow(ChecksumMismatchError);
    });

    it('should validate correct data', () => {
      const block = createTestBlock();
      expect(() => block.validateSync()).not.toThrow();
      expect(() => block.validate()).not.toThrow();
    });

    it('should validate async correctly', async () => {
      const block = createTestBlock();
      await expect(block.validateAsync()).resolves.not.toThrow();
    });
  });

  describe('block capabilities', () => {
    it('should have correct encryption capabilities', () => {
      const block = createTestBlock();
      expect(block.encrypted).toBe(false);
      expect(block.canEncrypt).toBe(false);
      expect(block.canDecrypt).toBe(false);
    });
  });

  describe('header data', () => {
    it('should have empty layer header data', () => {
      const block = createTestBlock();
      expect(block.layerHeaderData.length).toBe(0);
    });

    it('should have correct full header data', () => {
      const block = createTestBlock();
      expect(block.fullHeaderData).toEqual(
        Buffer.concat([block.layerHeaderData]),
      );
    });
  });
});
