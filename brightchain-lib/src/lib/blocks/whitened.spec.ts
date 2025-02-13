import { randomBytes } from 'crypto';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { WhitenedError } from '../errors/whitenedError';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { WhitenedBlock } from './whitened';

describe('WhitenedBlock', () => {
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Small;

  beforeEach(() => {
    checksumService = ServiceProvider.getChecksumService();
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('basic functionality', () => {
    it('should construct and validate correctly', () => {
      const data = randomBytes(defaultBlockSize);
      const checksum = checksumService.calculateChecksum(data);
      const block = new WhitenedBlock(defaultBlockSize, data, checksum);

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.OwnerFreeWhitenedBlock);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(block.data).toEqual(data);
      expect(block.idChecksum).toEqual(checksum);
      expect(block.canRead).toBe(true);
      expect(block.canPersist).toBe(true);
    });

    it('should handle empty data', () => {
      const data = Buffer.alloc(0);
      const block = new WhitenedBlock(defaultBlockSize, data);
      expect(block.data.length).toBe(0);
      expect(block.payload.length).toBe(0);
      expect(block.layerHeaderData.length).toBe(0);
    });

    it('should handle padding correctly', () => {
      const dataSize = Math.floor(defaultBlockSize / 2);
      const data = randomBytes(dataSize);
      const block = new WhitenedBlock(defaultBlockSize, data);

      expect(block.data.length).toBe(dataSize);
      expect(block.blockSize).toBe(defaultBlockSize);
    });
  });

  describe('XOR operations', () => {
    it('should XOR two blocks correctly', async () => {
      const data1 = randomBytes(defaultBlockSize);
      const data2 = randomBytes(defaultBlockSize);
      const block1 = new WhitenedBlock(defaultBlockSize, data1);
      const block2 = new WhitenedBlock(defaultBlockSize, data2);

      const xoredBlock = await block1.xor(block2);

      // Verify XOR result
      const expectedData = Buffer.alloc(defaultBlockSize);
      for (let i = 0; i < defaultBlockSize; i++) {
        expectedData[i] = data1[i] ^ data2[i];
      }
      expect(xoredBlock.data).toEqual(expectedData);
    });

    it('should reject XOR with different block sizes', async () => {
      const block1 = new WhitenedBlock(
        BlockSize.Small,
        randomBytes(BlockSize.Small),
      );
      const block2 = new WhitenedBlock(
        BlockSize.Medium,
        randomBytes(BlockSize.Medium),
      );

      await expect(block1.xor(block2)).rejects.toThrow(WhitenedError);
    });
  });

  describe('fromData factory method', () => {
    it('should create whitened block from data and random data', () => {
      const data = randomBytes(defaultBlockSize);
      const randomData = randomBytes(defaultBlockSize);
      const block = WhitenedBlock.fromData(defaultBlockSize, data, randomData);

      // Verify XOR result
      const expectedData = Buffer.alloc(defaultBlockSize);
      for (let i = 0; i < defaultBlockSize; i++) {
        expectedData[i] = data[i] ^ randomData[i];
      }
      expect(block.data).toEqual(expectedData);
    });

    it('should reject mismatched data lengths', () => {
      const data = randomBytes(defaultBlockSize);
      const randomData = randomBytes(defaultBlockSize + 1);

      expect(() =>
        WhitenedBlock.fromData(defaultBlockSize, data, randomData),
      ).toThrow(WhitenedError);
    });

    it('should reject oversized data', () => {
      const data = randomBytes(defaultBlockSize + 1);
      const randomData = randomBytes(defaultBlockSize + 1);

      expect(() =>
        WhitenedBlock.fromData(defaultBlockSize, data, randomData),
      ).toThrow(WhitenedError);
    });
  });

  describe('from factory method', () => {
    it('should create whitened block with metadata', async () => {
      const data = randomBytes(defaultBlockSize);
      const checksum = checksumService.calculateChecksum(data);
      const dateCreated = new Date();
      const block = await WhitenedBlock.from(
        defaultBlockSize,
        data,
        checksum,
        dateCreated,
      );

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.OwnerFreeWhitenedBlock);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(block.data).toEqual(data);
      expect(block.idChecksum).toEqual(checksum);
      expect(block.dateCreated).toEqual(dateCreated);
    });

    it('should handle custom length metadata', async () => {
      const dataSize = Math.floor(defaultBlockSize / 2);
      const data = randomBytes(dataSize);
      const block = await WhitenedBlock.from(
        defaultBlockSize,
        data,
        undefined,
        undefined,
        dataSize,
      );

      expect(block.metadata.lengthWithoutPadding).toBe(dataSize);
    });
  });

  describe('block capabilities', () => {
    it('should have correct encryption capabilities', () => {
      const block = new WhitenedBlock(
        defaultBlockSize,
        randomBytes(defaultBlockSize),
      );
      expect(block.canEncrypt).toBe(false);
      expect(block.canDecrypt).toBe(false);
    });

    it('should have correct signing capabilities', () => {
      const block = new WhitenedBlock(
        defaultBlockSize,
        randomBytes(defaultBlockSize),
      );
      expect(block.canSign).toBe(false);
    });
  });
});
