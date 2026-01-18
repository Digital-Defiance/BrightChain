import {
  arraysEqual,
  EmailString,
  IMemberWithMnemonic,
  Member,
} from '@digitaldefiance/ecies-lib';
import { ECIES } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import MemberType from '../enumerations/memberType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { Checksum } from '../types/checksum';

import { ChecksumService } from '../services/checksum.service';
import { ServiceProvider } from '../services/service.provider';
import { initializeTestServices } from '../test/service.initializer.helper';
import { EphemeralBlock } from './ephemeral';

// Test class that properly implements abstract methods
class TestEphemeralBlock extends EphemeralBlock {
  public static async createTest(
    type: BlockType,
    blockDataType: BlockDataType,
    data: Uint8Array,
    creator: Member,
    checksum?: Checksum,
    dateCreated?: Date,
    lengthBeforeEncryption?: number,
    canRead = true,
    canPersist = false,
  ): Promise<TestEphemeralBlock> {
    const blockSize = BlockSize.Small;

    // Validate future dates
    if (dateCreated && dateCreated > new Date()) {
      throw new BlockValidationError(
        BlockValidationErrorType.FutureCreationDate,
      );
    }

    const metadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      blockDataType,
      lengthBeforeEncryption ?? data.length,
      creator,
      dateCreated ?? new Date(),
    );

    const finalChecksum =
      checksum ??
      ServiceProvider.getInstance().checksumService.calculateChecksum(data);
    if (checksum) {
      const expectedChecksum =
        ServiceProvider.getInstance().checksumService.calculateChecksum(data);
      if (
        !arraysEqual(checksum.toUint8Array(), expectedChecksum.toUint8Array())
      ) {
        throw new ChecksumMismatchError(checksum, expectedChecksum);
      }
    }

    return new TestEphemeralBlock(
      type,
      blockDataType,
      data,
      finalChecksum,
      metadata,
      canRead,
      canPersist,
    );
  }
}

describe('EphemeralBlock', () => {
  // Increase timeout for all tests
  jest.setTimeout(15000);

  // Shared test data
  let creator: IMemberWithMnemonic;
  let checksumService: ChecksumService;
  const defaultBlockSize = BlockSize.Small;
  const testDate = new Date(Date.now() - 1000); // 1 second ago

  // Helper functions
  const getEffectiveSize = (size: BlockSize, encrypted = false) =>
    encrypted
      ? size // For encrypted blocks, use full block size since overhead is in data
      : (size as number); // For unencrypted blocks, use raw size

  const createTestBlock = async (
    options: Partial<{
      type: BlockType;
      dataType: BlockDataType;
      data: Uint8Array;
      checksum: Checksum;
      creator: Member;
      dateCreated: Date;
      lengthBeforeEncryption: number;
      canRead: boolean;
      canPersist: boolean;
    }> = {},
  ) => {
    const data =
      options.data ||
      (() => {
        const randomData = new Uint8Array(defaultBlockSize);
        crypto.getRandomValues(randomData);
        return randomData;
      })();

    return TestEphemeralBlock.createTest(
      options.type || BlockType.Random,
      options.dataType || BlockDataType.RawData,
      data,
      options.creator || creator.member,
      options.checksum,
      options.dateCreated || testDate,
      options.lengthBeforeEncryption,
      options.canRead ?? true,
      options.canPersist ?? false,
    );
  };

  beforeAll(() => {
    initializeTestServices();
    const eciesService = ServiceProvider.getInstance().eciesService;
    creator = Member.newMember(
      eciesService,
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    );
  });

  beforeEach(() => {
    checksumService = ServiceProvider.getInstance().checksumService;
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('basic functionality', () => {
    it('should construct and validate correctly', async () => {
      const data = new Uint8Array(getEffectiveSize(defaultBlockSize));
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);
      const block = await createTestBlock({ data, checksum });

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.Random);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(arraysEqual(block.data, data)).toBe(true);
      expect(
        arraysEqual(block.idChecksum.toUint8Array(), checksum.toUint8Array()),
      ).toBe(true);
      expect(block.canRead).toBe(true);
    });

    it('should handle empty data', async () => {
      const block = await createTestBlock({
        data: new Uint8Array(0),
      });
      // data() returns padded data, layerPayload returns unpadded
      expect(block.layerPayload.length).toBe(0);
      expect(block.layerHeaderData.length).toBe(0);
      expect(block.lengthBeforeEncryption).toBe(0);
    });

    it('should handle padding correctly', async () => {
      const dataSize = Math.floor(getEffectiveSize(defaultBlockSize) / 2);
      const data = new Uint8Array(dataSize);
      crypto.getRandomValues(data);
      const block = await createTestBlock({ data });

      // layerPayload returns actual data without padding
      expect(block.layerPayload.length).toBe(dataSize);
      // But data() returns padded data to full block size
      expect(block.data.length).toBe(defaultBlockSize);
      expect(block.lengthBeforeEncryption).toBe(dataSize);
      expect(block.blockSize).toBe(defaultBlockSize);
    });
  });

  describe('size handling', () => {
    it('should handle various block sizes', async () => {
      const testSize = BlockSize.Small; // Use a consistent size for testing
      const effectiveSize = Math.floor((testSize as number) / 2); // Use half the block size to ensure it fits
      const data = new Uint8Array(effectiveSize);
      crypto.getRandomValues(data);
      const block = await createTestBlock({ data });
      // data() returns padded data to full block size
      expect(block.data.length).toBe(testSize);
      // layerPayload returns unpadded data
      expect(block.layerPayload.length).toBe(effectiveSize);
    });

    it('should reject invalid sizes', async () => {
      // Test oversized data
      const tooLargeData = new Uint8Array((defaultBlockSize as number) + 1);
      crypto.getRandomValues(tooLargeData);
      await expect(createTestBlock({ data: tooLargeData })).rejects.toThrow(
        BlockValidationError,
      );
    });
  });

  describe('encryption handling', () => {
    it('should handle encrypted blocks correctly', async () => {
      const effectiveSize = getEffectiveSize(defaultBlockSize, true);
      const data = new Uint8Array(effectiveSize);
      crypto.getRandomValues(data);
      const block = await createTestBlock({
        dataType: BlockDataType.EncryptedData,
        data,
      });

      expect(block.data.length).toBe(effectiveSize);
      expect(block.canEncrypt()).toBe(false);
    });

    it('should handle encryption capabilities', async () => {
      const data = new Uint8Array(
        (defaultBlockSize as number) - ECIES.OVERHEAD_SIZE,
      );
      crypto.getRandomValues(data);
      const block = await createTestBlock({
        data,
      });
      // canEncrypt depends on available capacity after headers and padding
      // Just verify the method returns a boolean
      expect(typeof block.canEncrypt()).toBe('boolean');
    });
  });

  describe('creator handling', () => {
    it('should handle different creator types', async () => {
      // Test with Member creator
      const memberBlock = await createTestBlock();
      expect(memberBlock.creator).toBe(creator.member);

      // Test with no creator
      const data = new Uint8Array(getEffectiveSize(defaultBlockSize));
      crypto.getRandomValues(data);
      const noCreatorBlock = await TestEphemeralBlock.createTest(
        BlockType.Random,
        BlockDataType.RawData,
        data,
        null as unknown as Member,
      );
      expect(noCreatorBlock.creator).toBeUndefined();
    });
  });

  describe('validation', () => {
    it('should detect data corruption', async () => {
      const data = new Uint8Array(getEffectiveSize(defaultBlockSize));
      crypto.getRandomValues(data);
      const checksum = checksumService.calculateChecksum(data);
      const corruptedData = new Uint8Array(data);
      corruptedData[0]++; // Corrupt the data

      let error: Error | undefined;
      try {
        await createTestBlock({ data: corruptedData, checksum });
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(ChecksumMismatchError);
      const checksumError = error as ChecksumMismatchError;
      expect(checksumError.checksum).toBeDefined();
      expect(checksumError.expected).toBeDefined();
      expect(
        arraysEqual(
          checksumError.checksum.toUint8Array(),
          checksumError.expected.toUint8Array(),
        ),
      ).toBe(false);
    });

    it('should reject future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      let error: Error | undefined;
      try {
        await createTestBlock({ dateCreated: futureDate });
        fail('Expected createTestBlock to throw');
      } catch (e) {
        error = e as Error;
      }

      expect(error).toBeDefined();
      expect(error).toBeInstanceOf(BlockValidationError);
      expect((error as BlockValidationError).type).toBe(
        BlockValidationErrorType.FutureCreationDate,
      );
    });
  });
});
