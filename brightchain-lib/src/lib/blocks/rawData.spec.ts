import { arraysEqual } from '@digitaldefiance/ecies-lib';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockAccessError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { Checksum } from '../types/checksum';
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
      data: Uint8Array;
      checksum: Checksum;
      dateCreated: Date;
      blockType: BlockType;
      blockDataType: BlockDataType;
      canRead: boolean;
      canPersist: boolean;
      checksumService: ChecksumService;
    }> = {},
  ): RawDataBlock => {
    const data =
      options.data ||
      (() => {
        const randomData = new Uint8Array(defaultBlockSize);
        crypto.getRandomValues(randomData);
        return randomData;
      })();
    const checksum =
      options.checksum || checksumService.calculateChecksum(data);

    return new RawDataBlock(
      options.blockSize || defaultBlockSize,
      data,
      options.dateCreated,
      checksum,
      options.blockType,
      options.blockDataType,
      options.canRead ?? true,
      options.canPersist ?? true,
      options.checksumService,
    );
  };

  describe('basic functionality', () => {
    it('should construct and validate correctly', () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);
      const block = createTestBlock({ data, checksum });

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.RawData);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(arraysEqual(block.data, data)).toBe(true);
      expect(
        arraysEqual(block.idChecksum.toUint8Array(), checksum.toUint8Array()),
      ).toBe(true);
      expect(block.canRead).toBe(true);
      expect(block.canPersist).toBe(true);
    });

    it('should handle empty data', () => {
      const block = createTestBlock({ data: new Uint8Array(0) });
      expect(block.data.length).toBe(0);
      expect(block.layerPayload.length).toBe(0);
      expect(block.layerHeaderData.length).toBe(0);
    });

    it('should reject oversized data', () => {
      const data = new Uint8Array(defaultBlockSize + 1);
      crypto.getRandomValues(data);
      expect(() => createTestBlock({ data })).toThrow(
        /Error_BlockError_DataLengthExceedsBlockSizeTemplate/,
      );
    });
  });

  describe('data access', () => {
    it('should handle non-readable blocks', () => {
      const block = createTestBlock({ canRead: false });
      expect(() => block.data).toThrow(BlockAccessError);
      expect(() => block.layerPayload).toThrow(BlockAccessError);
    });

    it('should provide correct data access', () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const block = createTestBlock({ data });
      expect(arraysEqual(block.data, data)).toBe(true);
      expect(arraysEqual(block.layerPayload, data)).toBe(true);
      expect(block.lengthBeforeEncryption).toBe(data.length);
    });
  });

  describe('validation', () => {
    it('should detect data corruption', () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);
      const block = createTestBlock({ data, checksum });

      // Corrupt the data after creation
      const corruptedData = new Uint8Array(data);
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
      const expectedHeader = new Uint8Array(block.layerHeaderData.length);
      expectedHeader.set(block.layerHeaderData);
      expect(arraysEqual(block.fullHeaderData, expectedHeader)).toBe(true);
    });
  });

  describe('dependency injection', () => {
    it('should work with injected checksumService', () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const block = createTestBlock({ data, checksumService });

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(() => block.validateSync()).not.toThrow();
    });

    it('should work without injected checksumService (lazy load)', () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const block = createTestBlock({ data, checksumService: undefined });

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(() => block.validateSync()).not.toThrow();
    });
  });
});
