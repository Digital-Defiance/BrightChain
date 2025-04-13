import { arraysEqual } from '@digitaldefiance/ecies-lib';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { WhitenedError } from '../errors/whitenedError';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { WhitenedBlock } from './whitened';

describe('WhitenedBlock', () => {
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Small;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('basic functionality', () => {
    it('should construct and validate correctly', () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);
      const block = new WhitenedBlock(defaultBlockSize, Buffer.from(data), checksum);

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.OwnerFreeWhitenedBlock);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(arraysEqual(block.data, data)).toBe(true);
      expect(
        arraysEqual(new Uint8Array(block.idChecksum), new Uint8Array(checksum)),
      ).toBe(true);
      expect(block.canRead).toBe(true);
      expect(block.canPersist).toBe(true);
    });

    it('should handle empty data', () => {
      const data = new Uint8Array(0);
      const block = new WhitenedBlock(defaultBlockSize, Buffer.from(data));
      expect(block.data.length).toBe(0);
      expect(block.layerPayload.length).toBe(0);
      expect(block.layerHeaderData.length).toBe(0);
    });

    it('should handle padding correctly', () => {
      const dataSize = Math.floor(defaultBlockSize / 2);
      const data = new Uint8Array(dataSize);
      crypto.getRandomValues(data);
      const block = new WhitenedBlock(defaultBlockSize, Buffer.from(data));

      expect(block.data.length).toBe(dataSize);
      expect(block.blockSize).toBe(defaultBlockSize);
    });
  });

  describe('XOR operations', () => {
    it('should XOR two blocks correctly', async () => {
      const data1 = new Uint8Array(defaultBlockSize);
      const data2 = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data1);
      crypto.getRandomValues(data2);
      const block1 = new WhitenedBlock(defaultBlockSize, Buffer.from(data1));
      const block2 = new WhitenedBlock(defaultBlockSize, Buffer.from(data2));

      const xoredBlock = await block1.xor(block2);

      // Verify XOR result
      const expectedData = new Uint8Array(defaultBlockSize);
      for (let i = 0; i < defaultBlockSize; i++) {
        expectedData[i] = data1[i] ^ data2[i];
      }
      expect(arraysEqual(xoredBlock.data, expectedData)).toBe(true);
    });

    it('should reject XOR with different block sizes', async () => {
      // Use BlockSize.Message and BlockSize.Tiny to test different sizes within test environment limits
      // These are 512 bytes and 1KB respectively - well within the 64KB test limit
      const smallData = new Uint8Array(BlockSize.Message); // 512 bytes
      const mediumData = new Uint8Array(BlockSize.Tiny);   // 1KB
      
      crypto.getRandomValues(smallData);
      crypto.getRandomValues(mediumData);
      
      const block1 = new WhitenedBlock(BlockSize.Message, Buffer.from(smallData));
      const block2 = new WhitenedBlock(BlockSize.Tiny, Buffer.from(mediumData));

      await expect(block1.xor(block2)).rejects.toThrow(WhitenedError);
    });
  });

  describe('fromData factory method', () => {
    it('should create whitened block from data and random data', () => {
      const data = new Uint8Array(defaultBlockSize);
      const randomData = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      crypto.getRandomValues(randomData);
      const block = WhitenedBlock.fromData(defaultBlockSize, Buffer.from(data), Buffer.from(randomData));

      // Verify XOR result
      const expectedData = new Uint8Array(defaultBlockSize);
      for (let i = 0; i < defaultBlockSize; i++) {
        expectedData[i] = data[i] ^ randomData[i];
      }
      expect(arraysEqual(block.data, expectedData)).toBe(true);
    });

    it('should reject mismatched data lengths', () => {
      const data = new Uint8Array(defaultBlockSize);
      const randomData = new Uint8Array(defaultBlockSize + 1);
      crypto.getRandomValues(data);
      crypto.getRandomValues(randomData);

      expect(() =>
        WhitenedBlock.fromData(defaultBlockSize, Buffer.from(data), Buffer.from(randomData)),
      ).toThrow(WhitenedError);
    });

    it('should reject oversized data', () => {
      const data = new Uint8Array(defaultBlockSize + 1);
      const randomData = new Uint8Array(defaultBlockSize + 1);
      crypto.getRandomValues(data);
      crypto.getRandomValues(randomData);

      expect(() =>
        WhitenedBlock.fromData(defaultBlockSize, Buffer.from(data), Buffer.from(randomData)),
      ).toThrow(WhitenedError);
    });
  });

  describe('from factory method', () => {
    it('should create whitened block with metadata', async () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);
      const dateCreated = new Date();
      const block = await WhitenedBlock.from(
        defaultBlockSize,
        Buffer.from(data),
        checksum,
        dateCreated,
      );

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.OwnerFreeWhitenedBlock);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(arraysEqual(block.data, data)).toBe(true);
      expect(
        arraysEqual(new Uint8Array(block.idChecksum), new Uint8Array(checksum)),
      ).toBe(true);
      expect(block.dateCreated).toEqual(dateCreated);
    });

    it('should handle custom length metadata', async () => {
      const dataSize = Math.floor(defaultBlockSize / 2);
      const data = new Uint8Array(dataSize);
      crypto.getRandomValues(data);
      const block = await WhitenedBlock.from(
        defaultBlockSize,
        Buffer.from(data),
        undefined,
        undefined,
        dataSize,
      );

      expect(block.metadata.lengthWithoutPadding).toBe(dataSize);
    });
  });

  describe('block capabilities', () => {
    it('should have correct encryption capabilities', () => {
      const data = new Uint8Array(defaultBlockSize);
      crypto.getRandomValues(data);
      const block = new WhitenedBlock(defaultBlockSize, Buffer.from(data));
      expect(block.canEncrypt).toBe(false);
      expect(block.canDecrypt).toBe(false);
    });
  });
});
