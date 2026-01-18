import {
  arraysEqual,
} from '@digitaldefiance/ecies-lib';
import { Checksum } from '../types/checksum';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { EnhancedValidationError } from '../errors/enhancedValidationError';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import {
  BLOCK_HANDLE_SYMBOL,
  BlockHandle,
  createBlockHandle,
  isBlockHandle,
} from './handle';
import { RawDataBlock } from './rawData';

describe('BlockHandle', () => {
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Small;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  const createTestData = (): {
    data: Uint8Array;
    checksum: Checksum;
  } => {
    const data = new Uint8Array(defaultBlockSize);
    crypto.getRandomValues(data);
    const checksum = checksumService.calculateChecksum(data);
    return { data, checksum };
  };

  describe('basic functionality', () => {
    it('should create handle from data', () => {
      const { data, checksum } = createTestData();
      const handle: BlockHandle<RawDataBlock> = createBlockHandle(
        RawDataBlock,
        defaultBlockSize,
        data,
        checksum,
      );

      expect(handle.blockSize).toBe(defaultBlockSize);
      expect(handle.blockType).toBe(BlockType.Handle);
      expect(handle.blockDataType).toBe(BlockDataType.RawData);
      expect(
        arraysEqual(handle.idChecksum.toUint8Array(), checksum.toUint8Array()),
      ).toBe(true);
      expect(handle.canRead).toBe(true);
      expect(handle.canPersist).toBe(true);
    });

    it('should handle read/persist permissions', () => {
      const { data, checksum } = createTestData();
      const handle: BlockHandle<RawDataBlock> = createBlockHandle(
        RawDataBlock,
        defaultBlockSize,
        data,
        checksum,
        false, // canRead
        false, // canPersist
      );

      expect(handle.canRead).toBe(false);
      expect(handle.canPersist).toBe(false);
    });

    it('should have BLOCK_HANDLE_SYMBOL property', () => {
      const { data, checksum } = createTestData();
      const handle: BlockHandle<RawDataBlock> = createBlockHandle(
        RawDataBlock,
        defaultBlockSize,
        data,
        checksum,
      );

      expect(
        (handle as unknown as Record<symbol, unknown>)[BLOCK_HANDLE_SYMBOL],
      ).toBe(true);
    });
  });

  describe('runtime validation', () => {
    it('should throw EnhancedValidationError for invalid blockConstructor', () => {
      const { data, checksum } = createTestData();

      expect(() => {
        createBlockHandle(
          'not a constructor' as unknown as new (
            ...args: unknown[]
          ) => RawDataBlock,
          defaultBlockSize,
          data,
          checksum,
        );
      }).toThrow(EnhancedValidationError);
    });

    it('should throw EnhancedValidationError for invalid data type', () => {
      const { checksum } = createTestData();

      expect(() => {
        createBlockHandle(
          RawDataBlock,
          defaultBlockSize,
          'not a Uint8Array' as unknown as Uint8Array,
          checksum,
        );
      }).toThrow(EnhancedValidationError);
    });

    it('should throw EnhancedValidationError for invalid checksum type', () => {
      const { data } = createTestData();

      expect(() => {
        createBlockHandle(
          RawDataBlock,
          defaultBlockSize,
          data,
          'not a Checksum' as unknown as Checksum,
        );
      }).toThrow(EnhancedValidationError);
    });

    it('should throw EnhancedValidationError for missing blockSize', () => {
      const { data, checksum } = createTestData();

      expect(() => {
        createBlockHandle(
          RawDataBlock,
          undefined as unknown as BlockSize,
          data,
          checksum,
        );
      }).toThrow(EnhancedValidationError);
    });
  });

  describe('isBlockHandle type guard', () => {
    it('should return true for valid BlockHandle', () => {
      const { data, checksum } = createTestData();
      const handle = createBlockHandle(
        RawDataBlock,
        defaultBlockSize,
        data,
        checksum,
      );

      expect(isBlockHandle(handle)).toBe(true);
    });

    it('should return false for null', () => {
      expect(isBlockHandle(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isBlockHandle(undefined)).toBe(false);
    });

    it('should return false for plain objects', () => {
      expect(isBlockHandle({})).toBe(false);
      expect(isBlockHandle({ fullData: new Uint8Array(10) })).toBe(false);
    });

    it('should return false for RawDataBlock (not a handle)', () => {
      const { data, checksum } = createTestData();
      const block = new RawDataBlock(
        defaultBlockSize,
        data,
        new Date(),
        checksum,
        BlockType.RawData,
        BlockDataType.RawData,
        true,
        true,
      );

      expect(isBlockHandle(block)).toBe(false);
    });

    it('should enable TypeScript type narrowing', () => {
      const { data, checksum } = createTestData();
      const handle = createBlockHandle(
        RawDataBlock,
        defaultBlockSize,
        data,
        checksum,
      );

      // This tests that TypeScript correctly narrows the type
      const maybeHandle: unknown = handle;
      if (isBlockHandle<RawDataBlock>(maybeHandle)) {
        // TypeScript should know this is BlockHandle<RawDataBlock>
        expect(maybeHandle.fullData).toBeDefined();
        expect(typeof maybeHandle.calculateChecksum).toBe('function');
        expect(typeof maybeHandle.clearCache).toBe('function');
      } else {
        fail('isBlockHandle should return true for valid handle');
      }
    });
  });

  describe('data access', () => {
    it('should access data correctly', () => {
      const { data, checksum } = createTestData();
      const handle: BlockHandle<RawDataBlock> = createBlockHandle(
        RawDataBlock,
        defaultBlockSize,
        data,
        checksum,
      );

      expect(arraysEqual(handle.fullData, data)).toBe(true);
      expect(arraysEqual(handle.layerData, data)).toBe(true);
      expect(handle.layerPayloadSize).toBe(data.length);
    });
  });

  describe('checksum calculation', () => {
    it('should calculate checksum correctly', () => {
      const { data, checksum } = createTestData();
      const handle: BlockHandle<RawDataBlock> = createBlockHandle(
        RawDataBlock,
        defaultBlockSize,
        data,
        checksum,
      );

      const calculatedChecksum = handle.calculateChecksum();
      expect(
        arraysEqual(calculatedChecksum.toUint8Array(), checksum.toUint8Array()),
      ).toBe(true);
    });
  });

  describe('caching', () => {
    it('should handle cache operations', () => {
      const { data, checksum } = createTestData();
      const handle: BlockHandle<RawDataBlock> = createBlockHandle(
        RawDataBlock,
        defaultBlockSize,
        data,
        checksum,
      );

      // Access data to ensure cache is populated
      expect(arraysEqual(handle.fullData, data)).toBe(true);

      // Clear cache
      handle.clearCache();

      // Should still work (falls back to original data)
      expect(arraysEqual(handle.fullData, data)).toBe(true);
    });
  });

  describe('conversion to RawDataBlock', () => {
    it('should convert to RawDataBlock correctly', () => {
      const { data, checksum } = createTestData();
      const handle: BlockHandle<RawDataBlock> = createBlockHandle(
        RawDataBlock,
        defaultBlockSize,
        data,
        checksum,
      );
      const rawBlock = handle.block;

      expect(rawBlock.blockSize).toBe(handle.blockSize);
      expect(arraysEqual(rawBlock.data, handle.fullData)).toBe(true);
      expect(
        arraysEqual(
          rawBlock.idChecksum.toUint8Array(),
          handle.idChecksum.toUint8Array(),
        ),
      ).toBe(true);
    });
  });
});
