import { randomBytes } from 'crypto';
import { OwnedDataBlock } from '../blocks/ownedData';
import { RandomBlock } from '../blocks/random';
import { WhitenedBlock } from '../blocks/whitened';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import MemberType from '../enumerations/memberType';
import { TupleErrorType } from '../enumerations/tupleErrorType';
import { TupleError } from '../errors/tupleError';
import { ChecksumService } from './checksum.service';
import { ECIESService } from './ecies.service';
import { ServiceProvider } from './service.provider';
import { TupleService } from './tuple.service';

describe('TupleService', () => {
  let creator: BrightChainMember;
  let eciesService: ECIESService;
  let checksumService: ChecksumService;
  let tupleService: TupleService;
  const blockSize = BlockSize.Small;

  beforeEach(() => {
    creator = BrightChainMember.newMember(
      MemberType.User,
      'test',
      new EmailString('test@example.com'),
    ).member;
    eciesService = ServiceProvider.getECIESService();
    checksumService = ServiceProvider.getChecksumService();
    tupleService = new TupleService(checksumService);
  });

  describe('xorSourceToPrimeWhitened', () => {
    it('should XOR source block with whitening and random blocks', async () => {
      // Create test blocks
      const maxDataSize = blockSize - eciesService.eciesOverheadLength;
      // Create source data and pad to full block size
      const sourceData = randomBytes(maxDataSize);
      const paddedData = randomBytes(blockSize);
      sourceData.copy(paddedData);

      const sourceBlock = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        paddedData,
        checksumService.calculateChecksum(paddedData),
        creator,
      );

      const whiteners: WhitenedBlock[] = [];
      const randomBlocks = [
        RandomBlock.new(blockSize),
        RandomBlock.new(blockSize),
      ];

      const result = await tupleService.xorSourceToPrimeWhitened(
        sourceBlock,
        whiteners,
        randomBlocks,
      );

      // Verify result
      expect(result.blockSize).toBe(blockSize);
      // Since we know result.data is a Buffer (WhitenedBlock always returns Buffer), we can safely check length
      expect(Buffer.isBuffer(result.data)).toBe(true);
      expect((result.data as Buffer).length).toBe(blockSize);

      // XOR result back with whiteners and random blocks should give original data
      const xoredBack = Buffer.from(result.data);
      for (const whitener of whiteners) {
        const whitenerData = Buffer.from(whitener.data);
        for (let i = 0; i < xoredBack.length; i++) {
          xoredBack[i] ^= whitenerData[i];
        }
      }
      for (const random of randomBlocks) {
        const randomData = Buffer.from(random.data);
        for (let i = 0; i < xoredBack.length; i++) {
          xoredBack[i] ^= randomData[i];
        }
      }

      // Compare with paddedData since that's what was actually XORed
      expect(xoredBack).toEqual(paddedData);
    });

    it('should throw error if block sizes do not match', async () => {
      const maxDataSize = BlockSize.Small - eciesService.eciesOverheadLength;
      const sourceData = randomBytes(maxDataSize);
      const sourceBlock = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        BlockSize.Small,
        sourceData,
        checksumService.calculateChecksum(sourceData),
        creator,
      );

      const whiteners: WhitenedBlock[] = [];
      const randomBlocks = [
        RandomBlock.new(BlockSize.Medium), // Intentionally different size
        RandomBlock.new(BlockSize.Medium),
      ];

      await expect(
        tupleService.xorSourceToPrimeWhitened(
          sourceBlock,
          whiteners,
          randomBlocks,
        ),
      ).rejects.toThrow(TupleError);
    });

    it('should throw error if block count is invalid', async () => {
      const maxDataSize = blockSize - eciesService.eciesOverheadLength;
      // Create source data and pad to full block size
      const sourceData = randomBytes(maxDataSize);
      const paddedData = randomBytes(blockSize);
      sourceData.copy(paddedData);

      const sourceBlock = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        paddedData,
        checksumService.calculateChecksum(paddedData),
        creator,
      );

      const whiteners: WhitenedBlock[] = [];
      const randomBlocks = [RandomBlock.new(blockSize)]; // Only one random block to trigger error

      await expect(
        tupleService.xorSourceToPrimeWhitened(
          sourceBlock,
          whiteners,
          randomBlocks,
        ),
      ).rejects.toThrow(new TupleError(TupleErrorType.InvalidBlockCount));
    });
  });

  describe('makeTupleFromSourceXor', () => {
    it('should create tuple from source block and whitening/random blocks', async () => {
      const maxDataSize = blockSize - eciesService.eciesOverheadLength;
      const sourceData = randomBytes(maxDataSize);
      const paddedData = randomBytes(blockSize);
      sourceData.copy(paddedData);

      const sourceBlock = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        paddedData,
        checksumService.calculateChecksum(paddedData),
        creator,
        new Date(),
        sourceData.length, // Pass the original data length
      );

      const whiteners: WhitenedBlock[] = [];
      const randomBlocks = [
        RandomBlock.new(blockSize),
        RandomBlock.new(blockSize),
      ];

      const tuple = await tupleService.makeTupleFromSourceXor(
        sourceBlock,
        whiteners,
        randomBlocks,
      );

      expect(tuple.blocks.length).toBe(
        whiteners.length + randomBlocks.length + 1,
      );
      expect(tuple.blocks[0].blockSize).toBe(blockSize);
      // Since we know blocks[0].data is a Buffer (WhitenedBlock always returns Buffer), we can safely check length
      expect(Buffer.isBuffer(tuple.blocks[0].data)).toBe(true);
      expect((tuple.blocks[0].data as Buffer).length).toBe(blockSize);
    });
  });

  describe('xorDestPrimeWhitenedToOwned', () => {
    it('should recover original data from whitened blocks', async () => {
      // Create original data block
      const maxDataSize = blockSize - eciesService.eciesOverheadLength;
      // Create original data
      const originalData = randomBytes(maxDataSize);
      // Create padded data buffer
      const paddedData = Buffer.alloc(blockSize);
      // Copy original data into padded buffer
      originalData.copy(paddedData, 0, 0, originalData.length);
      // Fill remaining space with random data
      const padding = randomBytes(blockSize - originalData.length);
      padding.copy(paddedData, originalData.length);

      // Calculate checksum on the padded data
      const checksum = checksumService.calculateChecksum(paddedData);

      const originalBlock = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        paddedData,
        checksum,
        creator,
        new Date(),
        originalData.length, // Pass the original data length
      );

      // Create whitening blocks
      const whiteners: WhitenedBlock[] = [];
      const randomBlocks = [
        RandomBlock.new(blockSize),
        RandomBlock.new(blockSize),
      ];

      // Create prime whitened block
      const primeWhitened = await tupleService.xorSourceToPrimeWhitened(
        originalBlock,
        whiteners,
        randomBlocks,
      );

      // Recover original data
      const recoveredBlock = await tupleService.xorDestPrimeWhitenedToOwned(
        creator,
        primeWhitened,
        whiteners,
        randomBlocks,
      );

      // Compare only the original data portion since padding will be different
      expect(recoveredBlock.data.subarray(0, originalData.length)).toEqual(
        originalData,
      );
      // Verify the original data length is preserved in metadata
      expect(recoveredBlock.metadata.lengthWithoutPadding).toBe(
        originalData.length,
      );
      expect(recoveredBlock.creator).toBe(creator);
      expect(recoveredBlock.blockSize).toBe(blockSize);
    });
  });

  // Add tests for other methods like:
  // - makeTupleFromDestXor
  // - xorPrimeWhitenedToCbl
  // - xorPrimeWhitenedEncryptedToCbl
  // - dataStreamToPlaintextTuplesAndCBL
  // - dataStreamToEncryptedTuplesAndCBL
});
