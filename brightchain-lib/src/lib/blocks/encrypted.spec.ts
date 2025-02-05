import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import MemberType from '../enumerations/memberType';
import { EphemeralBlockMetadata } from '../ephemeralBlockMetadata';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { GuidV4 } from '../guid';
import { IEncryptedBlock } from '../interfaces/encryptedBlock';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';

// Test class that properly implements abstract methods
class TestEncryptedBlock extends EncryptedBlock implements IEncryptedBlock {
  public override get encryptedLength(): number {
    if (this.actualDataLength === undefined) {
      throw new BlockValidationError(
        BlockValidationErrorType.ActualDataLengthUnknown,
      );
    }
    return this.data.length;
  }

  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    canPersist = true,
  ): Promise<TestEncryptedBlock> {
    // Validate data length
    if (data.length < StaticHelpersECIES.eciesOverheadLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShort,
      );
    }

    // Total data length must not exceed block size
    if (data.length > (blockSize as number)) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }

    // For encrypted blocks with known actual data length:
    // 1. The actual data length must not exceed available capacity
    // 2. The total encrypted length must not exceed block size
    if (actualDataLength !== undefined) {
      const availableCapacity =
        (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
      if (actualDataLength > availableCapacity) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataLengthExceedsCapacity,
        );
      }
    }

    // Calculate and validate checksum
    const computedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    if (checksum && !computedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, computedChecksum);
    }
    const finalChecksum = checksum ?? computedChecksum;

    const metadata = new EphemeralBlockMetadata(
      blockSize,
      type,
      BlockDataType.EncryptedData,
      actualDataLength ?? data.length - StaticHelpersECIES.eciesOverheadLength,
      true,
      creator,
      dateCreated ?? new Date(),
    );

    return new TestEncryptedBlock(
      type,
      dataType,
      data,
      finalChecksum,
      EncryptedBlockMetadata.fromEphemeralBlockMetadata(metadata),
      canRead,
      canPersist,
    );
  }
}

describe('EncryptedBlock', () => {
  // Increase timeout for all tests
  jest.setTimeout(15000);

  // Shared test data
  let creator: BrightChainMember;
  const defaultBlockSize = BlockSize.Small;
  const testDate = new Date(Date.now() - 1000); // 1 second ago

  // Helper functions
  const getEffectiveSize = (size: BlockSize) => size as number; // For encrypted blocks, use full block size since overhead is in data

  const createEncryptedData = (size: number): Buffer => {
    // Create data that looks like ECIES encrypted data:
    // [ephemeral public key (65)][IV (16)][auth tag (16)][encrypted data]
    const ephemeralKey = Buffer.alloc(StaticHelpersECIES.publicKeyLength, 0x04);
    const iv = randomBytes(StaticHelpersECIES.ivLength);
    const authTag = randomBytes(StaticHelpersECIES.authTagLength);
    const encryptedData = randomBytes(
      size - StaticHelpersECIES.eciesOverheadLength,
    );
    return Buffer.concat([ephemeralKey, iv, authTag, encryptedData]);
  };

  const createTestBlock = async (
    options: Partial<{
      blockSize: BlockSize;
      data: Buffer;
      checksum: ChecksumBuffer;
      creator: BrightChainMember | GuidV4;
      dateCreated: Date;
      actualDataLength: number;
      canRead: boolean;
    }> = {},
  ) => {
    const blockSize = options.blockSize || defaultBlockSize;
    const data = options.data || createEncryptedData(blockSize as number);
    const checksum =
      options.checksum ?? StaticHelpersChecksum.calculateChecksum(data);

    return TestEncryptedBlock.from(
      BlockType.EncryptedOwnedDataBlock,
      BlockDataType.EncryptedData,
      blockSize,
      data,
      checksum,
      options.creator || creator,
      options.dateCreated || testDate,
      options.actualDataLength,
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
      const data = createEncryptedData(defaultBlockSize as number);
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const block = await createTestBlock({ data, checksum });

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.EncryptedOwnedDataBlock);
      expect(block.blockDataType).toBe(BlockDataType.EncryptedData);
      expect(block.data).toEqual(data);
      expect(block.idChecksum).toEqual(checksum);
      expect(block.canRead).toBe(true);
      expect(block.encrypted).toBe(true);
    });

    it('should handle encryption metadata correctly', async () => {
      const data = createEncryptedData(defaultBlockSize as number);
      const block = await createTestBlock({ data });

      // Check header components
      expect(block.ephemeralPublicKey.length).toBe(
        StaticHelpersECIES.publicKeyLength,
      );
      expect(block.iv.length).toBe(StaticHelpersECIES.ivLength);
      expect(block.authTag.length).toBe(StaticHelpersECIES.authTagLength);

      // Check header layout
      expect(block.layerHeaderData.length).toBe(
        StaticHelpersECIES.eciesOverheadLength,
      );
      expect(block.layerHeaderData).toEqual(
        data.subarray(0, StaticHelpersECIES.eciesOverheadLength),
      );
    });

    it('should handle payload correctly', async () => {
      const data = createEncryptedData(defaultBlockSize as number);
      const block = await createTestBlock({ data });

      // Payload should be everything after the header
      const expectedPayload = data.subarray(
        StaticHelpersECIES.eciesOverheadLength,
      );
      expect(block.payload).toEqual(expectedPayload);
      expect(block.payloadLength).toBe(expectedPayload.length);
    });
  });

  describe('size handling', () => {
    it('should handle various block sizes', async () => {
      const sizes = [
        BlockSize.Message,
        BlockSize.Tiny,
        BlockSize.Small,
        BlockSize.Medium,
        BlockSize.Large,
        BlockSize.Huge,
      ];

      for (const size of sizes) {
        const data = createEncryptedData(size as number);
        const block = await createTestBlock({ blockSize: size, data });
        expect(block.data.length).toBe(size as number);
        expect(block.capacity).toBe(
          (size as number) - StaticHelpersECIES.eciesOverheadLength,
        );
      }
    });

    it('should reject invalid sizes', async () => {
      // Test data too short for header
      const tooShortData = randomBytes(
        StaticHelpersECIES.eciesOverheadLength - 1,
      );
      await expect(createTestBlock({ data: tooShortData })).rejects.toThrow(
        BlockValidationError,
      );

      // Test oversized data
      const tooLargeData = createEncryptedData(
        (defaultBlockSize as number) + 1,
      );
      await expect(createTestBlock({ data: tooLargeData })).rejects.toThrow(
        BlockValidationError,
      );
    });

    it('should validate actual data length', async () => {
      const data = createEncryptedData(defaultBlockSize as number);
      const tooLargeActualLength =
        (defaultBlockSize as number) -
        StaticHelpersECIES.eciesOverheadLength +
        1;

      await expect(
        createTestBlock({ data, actualDataLength: tooLargeActualLength }),
      ).rejects.toThrow(BlockValidationError);
    });
  });

  describe('encryption handling', () => {
    it('should handle encrypted data correctly', async () => {
      const originalData = randomBytes(
        getEffectiveSize(defaultBlockSize) -
          StaticHelpersECIES.eciesOverheadLength,
      );
      const encryptedData = createEncryptedData(defaultBlockSize as number);
      const block = await createTestBlock({
        data: encryptedData,
        actualDataLength: originalData.length,
      });

      expect(block.encrypted).toBe(true);
      expect(block.data.length).toBe(defaultBlockSize as number);
      expect(block.payload.length).toBe(
        (defaultBlockSize as number) - StaticHelpersECIES.eciesOverheadLength,
      );
    });

    it('should calculate overhead correctly', async () => {
      const block = await createTestBlock();
      expect(block.totalOverhead).toBe(StaticHelpersECIES.eciesOverheadLength);
      expect(block.capacity).toBe(
        (defaultBlockSize as number) - StaticHelpersECIES.eciesOverheadLength,
      );
    });
  });

  describe('validation', () => {
    it('should detect data corruption', async () => {
      // Create original data and get its checksum
      const data = createEncryptedData(defaultBlockSize as number);
      const checksum = StaticHelpersChecksum.calculateChecksum(data);

      // Create corrupted data by modifying the original
      const corruptedData = Buffer.from(data);
      corruptedData[0]++; // Corrupt the header to ensure validation fails

      // Verify block creation fails with corrupted data
      await expect(
        createTestBlock({ data: corruptedData, checksum }),
      ).rejects.toThrow(ChecksumMismatchError);

      // Verify the checksum mismatch
      const corruptedChecksum =
        StaticHelpersChecksum.calculateChecksum(corruptedData);
      expect(corruptedChecksum.equals(checksum)).toBe(false);
    });

    it('should reject future dates', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      await expect(
        createTestBlock({ dateCreated: futureDate }),
      ).rejects.toThrow(BlockValidationError);
    });
  });
});
