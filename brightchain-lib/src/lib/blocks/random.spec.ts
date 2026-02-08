import { arraysEqual } from '@digitaldefiance/ecies-lib';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { RandomBlock } from './random';

describe('RandomBlock', () => {
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Small;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('basic functionality', () => {
    it('should create new random block', () => {
      const block = RandomBlock.new(defaultBlockSize);

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.Random);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(block.data.length).toBe(defaultBlockSize);
      expect(block.canRead).toBe(true);
      expect(block.canPersist).toBe(true);
    });

    it('should reconstitute from existing data', () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(new Uint8Array(data));
      const dateCreated = new Date();

      const block = RandomBlock.reconstitute(
        defaultBlockSize,
        Buffer.from(data),
        dateCreated,
        checksum,
      );

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.Random);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(arraysEqual(block.data, data)).toBe(true);
      expect(
        arraysEqual(block.idChecksum.toUint8Array(), checksum.toUint8Array()),
      ).toBe(true);
      expect(block.dateCreated).toEqual(dateCreated);
    });

    it('should reject data with wrong size', () => {
      const wrongSizeData = new Uint8Array(defaultBlockSize + 1);
      crypto.getRandomValues(wrongSizeData);
      expect(() =>
        RandomBlock.reconstitute(defaultBlockSize, Buffer.from(wrongSizeData)),
      ).toThrow(/Data length must match block size/);
    });
  });

  describe('block capabilities', () => {
    it('should have correct encryption capabilities', () => {
      const block = RandomBlock.new(defaultBlockSize);
      expect(block.canEncrypt).toBe(false);
      expect(block.canDecrypt).toBe(false);
    });
  });

  describe('XOR operations', () => {
    it('should XOR blocks correctly', async () => {
      const block1 = RandomBlock.new(defaultBlockSize);
      const block2 = RandomBlock.new(defaultBlockSize);

      const xoredBlock = await block1.xor(block2);

      // Verify XOR result
      const expectedData = new Uint8Array(defaultBlockSize);
      for (let i = 0; i < defaultBlockSize; i++) {
        expectedData[i] = block1.data[i] ^ block2.data[i];
      }

      expect(arraysEqual(xoredBlock.data, expectedData)).toBe(true);
      expect(xoredBlock.blockSize).toBe(defaultBlockSize);
      // Compare checksums as arrays since ChecksumUint8Array is a typed array
      const expectedChecksum = checksumService.calculateChecksum(expectedData);
      expect(
        arraysEqual(
          xoredBlock.idChecksum.toUint8Array(),
          expectedChecksum.toUint8Array(),
        ),
      ).toBe(true);
    });

    it('should reject XOR with different block sizes', async () => {
      const block1 = RandomBlock.new(BlockSize.Small);
      const block2 = RandomBlock.new(BlockSize.Medium);

      await expect(block1.xor(block2)).rejects.toThrow(
        /Block sizes must match/,
      );
    });
  });

  describe('header data', () => {
    it('should have empty layer header data', () => {
      const block = RandomBlock.new(defaultBlockSize);
      expect(block.layerHeaderData.length).toBe(0);
    });

    it('should have correct full header data', () => {
      const block = RandomBlock.new(defaultBlockSize);
      const expectedHeader = new Uint8Array(block.layerHeaderData.length);
      expectedHeader.set(block.layerHeaderData);
      expect(arraysEqual(block.fullHeaderData, expectedHeader)).toBe(true);
    });
  });

  describe('dependency injection', () => {
    it('should work with injected checksumService', () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);
      const block = new RandomBlock(
        defaultBlockSize,
        data,
        new Date(),
        checksum,
        checksumService,
      );

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(() => block.validateSync()).not.toThrow();
    });

    it('should work without injected checksumService (lazy load)', () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);
      const block = new RandomBlock(
        defaultBlockSize,
        data,
        new Date(),
        checksum,
      );

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(() => block.validateSync()).not.toThrow();
    });
  });
});
