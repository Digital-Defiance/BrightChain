import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import MemberType from '../enumerations/memberType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { EphemeralBlock } from './ephemeral';

// Test class that properly implements abstract methods
class TestEphemeralBlock extends EphemeralBlock {
  public static async createTest(
    type: BlockType,
    blockDataType: BlockDataType,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    encrypted = false,
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
      actualDataLength ?? data.length,
      encrypted,
      creator,
      dateCreated ?? new Date(),
    );

    const finalChecksum =
      checksum ?? StaticHelpersChecksum.calculateChecksum(data);
    if (checksum) {
      const expectedChecksum = StaticHelpersChecksum.calculateChecksum(data);
      if (!checksum.equals(expectedChecksum)) {
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
      !encrypted, // canPersist defaults to !encrypted
    );
  }
}

describe('EphemeralBlock', () => {
  // Increase timeout for all tests
  jest.setTimeout(15000);

  // Shared test data
  let creator: BrightChainMember;
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
      data: Buffer;
      checksum: ChecksumBuffer;
      creator: BrightChainMember | GuidV4;
      dateCreated: Date;
      actualDataLength: number;
      canRead: boolean;
      encrypted: boolean;
    }> = {},
  ) => {
    const isEncrypted = options.encrypted ?? false;
    const effectiveSize = getEffectiveSize(defaultBlockSize, isEncrypted);
    const data = options.data || randomBytes(effectiveSize);

    return TestEphemeralBlock.createTest(
      options.type || BlockType.Random,
      options.dataType || BlockDataType.RawData,
      data,
      options.checksum,
      options.creator || creator,
      options.dateCreated || testDate,
      options.actualDataLength,
      options.canRead ?? true,
      isEncrypted,
    );
  };

  beforeAll(() => {
    creator = BrightChainMember.newMember(
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    );
  });

  describe('basic functionality', () => {
    it('should construct and validate correctly', async () => {
      const data = randomBytes(getEffectiveSize(defaultBlockSize));
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const block = await createTestBlock({ data, checksum });

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.Random);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(block.data).toEqual(data);
      expect(block.idChecksum).toEqual(checksum);
      expect(block.canRead).toBe(true);
      expect(block.encrypted).toBe(false);
    });

    it('should handle empty data', async () => {
      const block = await createTestBlock({ data: Buffer.alloc(0) });
      expect(block.data.length).toBe(0);
      expect(block.payload.length).toBe(0);
      expect(block.layerHeaderData.length).toBe(0);
    });

    it('should handle padding correctly', async () => {
      const dataSize = Math.floor(getEffectiveSize(defaultBlockSize) / 2);
      const data = randomBytes(dataSize);
      const block = await createTestBlock({ data });

      // For unencrypted blocks, data() returns actual data without padding
      expect(block.data.length).toBe(dataSize);
      // But internal buffer is padded to full size
      expect(block.actualDataLength).toBe(dataSize);
      expect(block.blockSize).toBe(defaultBlockSize);
    });
  });

  describe('size handling', () => {
    it('should handle various block sizes', async () => {
      const testSize = BlockSize.Small; // Use a consistent size for testing
      const effectiveSize = Math.floor((testSize as number) / 2); // Use half the block size to ensure it fits
      const data = randomBytes(effectiveSize);
      const block = await createTestBlock({ data });
      expect(block.data.length).toBe(effectiveSize);
      expect(block.capacity).toBe(testSize as number);
    });

    it('should reject invalid sizes', async () => {
      // Test oversized data
      const tooLargeData = randomBytes((defaultBlockSize as number) + 1);
      await expect(createTestBlock({ data: tooLargeData })).rejects.toThrow(
        BlockValidationError,
      );
    });
  });

  describe('encryption handling', () => {
    it('should handle encrypted blocks correctly', async () => {
      const effectiveSize = getEffectiveSize(defaultBlockSize, true);
      const data = randomBytes(effectiveSize);
      const block = await createTestBlock({
        dataType: BlockDataType.EncryptedData,
        data,
        encrypted: true,
      });

      expect(block.encrypted).toBe(true);
      expect(block.data.length).toBe(effectiveSize);
      expect(block.canEncrypt).toBe(false);
      expect(block.canDecrypt).toBe(true);
    });

    it('should handle encryption capabilities', async () => {
      const block = await createTestBlock({
        data: randomBytes(
          (defaultBlockSize as number) - StaticHelpersECIES.eciesOverheadLength,
        ),
      });
      expect(block.encrypted).toBe(false);
      expect(block.canEncrypt).toBe(true);
      expect(block.canDecrypt).toBe(false);
    });
  });

  describe('creator handling', () => {
    it('should handle different creator types', async () => {
      // Test with BrightChainMember creator
      const memberBlock = await createTestBlock();
      expect(memberBlock.creator).toBe(creator);
      expect(memberBlock.creatorId).toBe(creator.id);
      expect(memberBlock.canSign).toBe(true);

      // Test with GuidV4 creator
      const guidCreator = GuidV4.new();
      const guidBlock = await createTestBlock({ creator: guidCreator });
      expect(guidBlock.creator).toBeUndefined();
      expect(guidBlock.creatorId).toBe(guidCreator);
      expect(guidBlock.canSign).toBe(true);

      // Test with no creator
      const data = randomBytes(getEffectiveSize(defaultBlockSize));
      const noCreatorBlock = await TestEphemeralBlock.createTest(
        BlockType.Random,
        BlockDataType.RawData,
        data,
      );
      expect(noCreatorBlock.creator).toBeUndefined();
      expect(noCreatorBlock.creatorId).toBeUndefined();
      expect(noCreatorBlock.canSign).toBe(false);
    });
  });

  describe('validation', () => {
    it('should detect data corruption', async () => {
      const data = randomBytes(getEffectiveSize(defaultBlockSize));
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const corruptedData = Buffer.from(data);
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
      expect(checksumError.checksum.equals(checksumError.expected)).toBe(false);
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
      expect((error as BlockValidationError).reason).toBe(
        BlockValidationErrorType.FutureCreationDate,
      );
    });
  });
});
