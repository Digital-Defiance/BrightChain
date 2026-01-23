import {
  arraysEqual,
  ECIES,
  EmailString,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { EphemeralBlock } from '../blocks/ephemeral';
import { RandomBlock } from '../blocks/random';
import { WhitenedBlock } from '../blocks/whitened';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { TupleErrorType } from '../enumerations/tupleErrorType';
import { TupleError } from '../errors/tupleError';
import { ChecksumService } from './checksum.service';
import { ServiceProvider } from './service.provider';
import { TupleService } from './tuple.service';

describe('TupleService', () => {
  let creator: Member;
  let checksumService: ChecksumService;
  let tupleService: TupleService;
  const blockSize = BlockSize.Small;

  beforeEach(() => {
    const eciesService = ServiceProvider.getInstance().eciesService;
    creator = Member.newMember(
      eciesService,
      MemberType.User,
      'test',
      new EmailString('test@example.com'),
    ).member;
    checksumService = ServiceProvider.getInstance().checksumService;
    tupleService = ServiceProvider.getInstance().tupleService;
  });

  describe('xorSourceToPrimeWhitened', () => {
    it('should XOR source block with whitening and random blocks', async () => {
      // Create test blocks
      const maxDataSize = blockSize - ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      // Create source data and pad to full block size
      const sourceData = new Uint8Array(maxDataSize);
      crypto.getRandomValues(sourceData);
      const paddedData = new Uint8Array(blockSize);
      crypto.getRandomValues(paddedData);
      paddedData.set(sourceData);

      const sourceBlock = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
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
      // Since we know result.data is a Uint8Array, we can safely check length
      expect(result.data instanceof Uint8Array).toBe(true);
      expect(result.data.length).toBe(blockSize);

      // XOR result back with whiteners and random blocks should give original data
      const xoredBack = new Uint8Array(result.data);
      for (const whitener of whiteners) {
        const whitenerData = new Uint8Array(whitener.data);
        for (let i = 0; i < xoredBack.length; i++) {
          xoredBack[i] ^= whitenerData[i];
        }
      }
      for (const random of randomBlocks) {
        const randomData = new Uint8Array(random.data);
        for (let i = 0; i < xoredBack.length; i++) {
          xoredBack[i] ^= randomData[i];
        }
      }

      // Compare with paddedData since that's what was actually XORed
      expect(arraysEqual(xoredBack, paddedData)).toBe(true);
    });

    it('should throw error if block sizes do not match', async () => {
      const maxDataSize =
        BlockSize.Small - ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const sourceData = new Uint8Array(maxDataSize);
      crypto.getRandomValues(sourceData);
      const sourceBlock = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
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
      const maxDataSize = blockSize - ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      // Create source data and pad to full block size
      const sourceData = new Uint8Array(maxDataSize);
      crypto.getRandomValues(sourceData);
      const paddedData = new Uint8Array(blockSize);
      crypto.getRandomValues(paddedData);
      paddedData.set(sourceData);

      const sourceBlock = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
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
      const maxDataSize = blockSize - ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      const sourceData = new Uint8Array(maxDataSize);
      crypto.getRandomValues(sourceData);
      const paddedData = new Uint8Array(blockSize);
      crypto.getRandomValues(paddedData);
      paddedData.set(sourceData);

      const sourceBlock = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
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
      // Since we know blocks[0].data is a Uint8Array, we can safely check length
      expect(tuple.blocks[0].data instanceof Uint8Array).toBe(true);
      expect(
        tuple.blocks[0].data instanceof Uint8Array &&
          tuple.blocks[0].data.length,
      ).toBe(blockSize);
    });
  });

  describe('xorDestPrimeWhitenedToOwned', () => {
    it('should recover original data from whitened blocks', async () => {
      // Create original data block
      const maxDataSize = blockSize - ECIES.WITH_LENGTH.FIXED_OVERHEAD_SIZE;
      // Create original data
      const originalData = new Uint8Array(maxDataSize);
      crypto.getRandomValues(originalData);
      // Create padded data buffer
      const paddedData = new Uint8Array(blockSize);
      // Copy original data into padded buffer
      paddedData.set(originalData, 0);
      // Fill remaining space with random data
      const padding = new Uint8Array(blockSize - originalData.length);
      crypto.getRandomValues(padding);
      paddedData.set(padding, originalData.length);

      // Calculate checksum on the padded data
      const checksum = checksumService.calculateChecksum(paddedData);

      const originalBlock = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
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
      expect(
        arraysEqual(
          recoveredBlock.data.subarray(0, originalData.length),
          originalData,
        ),
      ).toBe(true);
      // Verify the original data length is preserved
      expect(recoveredBlock.lengthBeforeEncryption).toBe(originalData.length);
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
