import { randomBytes } from 'crypto';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { RandomBlock } from './random';

describe('RandomBlock', () => {
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Small;

  beforeEach(() => {
    checksumService = ServiceProvider.getChecksumService();
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
      const data = randomBytes(defaultBlockSize);
      const checksum = checksumService.calculateChecksum(data);
      const dateCreated = new Date();

      const block = RandomBlock.reconstitute(
        defaultBlockSize,
        data,
        dateCreated,
        checksum,
      );

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.Random);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(block.data).toEqual(data);
      expect(block.idChecksum).toEqual(checksum);
      expect(block.dateCreated).toEqual(dateCreated);
    });

    it('should reject data with wrong size', () => {
      const wrongSizeData = randomBytes(defaultBlockSize + 1);
      expect(() =>
        RandomBlock.reconstitute(defaultBlockSize, wrongSizeData),
      ).toThrow('Data length must match block size');
    });
  });

  describe('block capabilities', () => {
    it('should have correct encryption capabilities', () => {
      const block = RandomBlock.new(defaultBlockSize);
      expect(block.canEncrypt).toBe(false);
      expect(block.canDecrypt).toBe(false);
    });

    it('should have correct signing capabilities', () => {
      const block = RandomBlock.new(defaultBlockSize);
      expect(block.canSign).toBe(false);
    });
  });

  describe('XOR operations', () => {
    it('should XOR blocks correctly', async () => {
      const block1 = RandomBlock.new(defaultBlockSize);
      const block2 = RandomBlock.new(defaultBlockSize);

      const xoredBlock = await block1.xor(block2);

      // Verify XOR result
      const expectedData = Buffer.alloc(defaultBlockSize);
      for (let i = 0; i < defaultBlockSize; i++) {
        expectedData[i] = block1.data[i] ^ block2.data[i];
      }

      expect(xoredBlock.data).toEqual(expectedData);
      expect(xoredBlock.blockSize).toBe(defaultBlockSize);
      expect(xoredBlock.idChecksum).toEqual(
        checksumService.calculateChecksum(expectedData),
      );
    });

    it('should reject XOR with different block sizes', async () => {
      const block1 = RandomBlock.new(BlockSize.Small);
      const block2 = RandomBlock.new(BlockSize.Medium);

      await expect(block1.xor(block2)).rejects.toThrow(
        'Block sizes must match',
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
      expect(block.fullHeaderData).toEqual(
        Buffer.concat([block.layerHeaderData]),
      );
    });
  });

  describe('capacity', () => {
    it('should return correct capacity', () => {
      const block = RandomBlock.new(defaultBlockSize);
      expect(block.capacity).toBe(defaultBlockSize - block.totalOverhead);
    });
  });
});
