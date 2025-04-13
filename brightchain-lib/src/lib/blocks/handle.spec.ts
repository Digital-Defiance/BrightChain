import { arraysEqual, ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { BlockHandle, createBlockHandle } from './handle';
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
    checksum: ChecksumUint8Array;
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
        arraysEqual(
          new Uint8Array(handle.idChecksum),
          new Uint8Array(checksum),
        ),
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
        arraysEqual(
          new Uint8Array(calculatedChecksum),
          new Uint8Array(checksum),
        ),
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
          new Uint8Array(rawBlock.idChecksum),
          new Uint8Array(handle.idChecksum),
        ),
      ).toBe(true);
    });
  });
});
