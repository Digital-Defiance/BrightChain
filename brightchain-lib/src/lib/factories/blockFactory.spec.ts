import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { BlockFactory } from './blockFactory';

describe('BlockFactory', () => {
  let factory: BlockFactory;
  let checksumService: ChecksumService;

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
    factory = new BlockFactory(checksumService);
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('createRawDataBlock', () => {
    it('should create a raw data block with injected checksum service', () => {
      const data = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(data);

      const block = factory.createRawDataBlock(BlockSize.Small, data);

      expect(block.blockSize).toBe(BlockSize.Small);
      expect(block.blockType).toBe(BlockType.RawData);
      expect(block.data).toEqual(data);
      expect(block.canRead).toBe(true);
      expect(block.canPersist).toBe(true);
    });

    it('should calculate checksum if not provided', () => {
      const data = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(data);

      const block = factory.createRawDataBlock(BlockSize.Small, data);
      const expectedChecksum = checksumService.calculateChecksum(data);

      expect(block.idChecksum.equals(expectedChecksum)).toBe(true);
    });

    it('should use provided checksum', () => {
      const data = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);

      const block = factory.createRawDataBlock(
        BlockSize.Small,
        data,
        undefined,
        checksum,
      );

      expect(block.idChecksum.equals(checksum)).toBe(true);
    });
  });

  describe('createRandomBlock', () => {
    it('should create a random block with random data', () => {
      const block = factory.createRandomBlock(BlockSize.Small);

      expect(block.blockSize).toBe(BlockSize.Small);
      expect(block.blockType).toBe(BlockType.Random);
      expect(block.data.length).toBe(BlockSize.Small);
    });

    it('should create blocks with different random data', () => {
      const block1 = factory.createRandomBlock(BlockSize.Small);
      const block2 = factory.createRandomBlock(BlockSize.Small);

      expect(block1.data).not.toEqual(block2.data);
    });
  });

  describe('createWhitenedBlock', () => {
    it('should create a whitened block by XORing data', () => {
      const data = new Uint8Array(BlockSize.Small);
      const randomData = new Uint8Array(BlockSize.Small);
      crypto.getRandomValues(data);
      crypto.getRandomValues(randomData);

      const block = factory.createWhitenedBlock(
        BlockSize.Small,
        data,
        randomData,
      );

      expect(block.blockSize).toBe(BlockSize.Small);
      expect(block.blockType).toBe(BlockType.OwnerFreeWhitenedBlock);

      // Verify XOR operation
      const expectedData = new Uint8Array(data.length);
      for (let i = 0; i < data.length; i++) {
        expectedData[i] = data[i] ^ randomData[i];
      }
      expect(block.data).toEqual(expectedData);
    });
  });
});
