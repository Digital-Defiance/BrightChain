import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import MemberType from '../enumerations/memberType';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';

// Test class that properly implements abstract methods
class TestEncryptedBlock extends EncryptedBlock {
  constructor(
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
  ) {
    super(
      BlockType.EncryptedOwnedDataBlock,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      actualDataLength,
      canRead,
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

  const createTestBlock = (
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

    return new TestEncryptedBlock(
      blockSize,
      data,
      options.checksum,
      options.creator || creator,
      options.dateCreated || testDate,
      options.actualDataLength,
      options.canRead ?? true,
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
    it('should construct and validate correctly', () => {
      const data = createEncryptedData(defaultBlockSize as number);
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const block = createTestBlock({ data, checksum });

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.EncryptedOwnedDataBlock);
      expect(block.blockDataType).toBe(BlockDataType.EncryptedData);
      expect(block.data).toEqual(data);
      expect(block.idChecksum).toEqual(checksum);
      expect(block.validated).toBe(true);
      expect(block.canRead).toBe(true);
      expect(block.encrypted).toBe(true);
    });

    it('should handle encryption metadata correctly', () => {
      const data = createEncryptedData(defaultBlockSize as number);
      const block = createTestBlock({ data });

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

    it('should handle payload correctly', () => {
      const data = createEncryptedData(defaultBlockSize as number);
      const block = createTestBlock({ data });

      // Payload should be everything after the header
      const expectedPayload = data.subarray(
        StaticHelpersECIES.eciesOverheadLength,
      );
      expect(block.payload).toEqual(expectedPayload);
      expect(block.payloadLength).toBe(expectedPayload.length);
    });
  });

  describe('size handling', () => {
    it('should handle various block sizes', () => {
      const sizes = [
        BlockSize.Message,
        BlockSize.Tiny,
        BlockSize.Small,
        BlockSize.Medium,
        BlockSize.Large,
        BlockSize.Huge,
      ];

      sizes.forEach((size) => {
        const data = createEncryptedData(size as number);
        const block = createTestBlock({ blockSize: size, data });
        expect(block.data.length).toBe(size as number);
        expect(block.capacity).toBe(
          (size as number) - StaticHelpersECIES.eciesOverheadLength,
        );
      });
    });

    it('should reject invalid sizes', () => {
      // Test data too short for header
      const tooShortData = randomBytes(
        StaticHelpersECIES.eciesOverheadLength - 1,
      );
      expect(() => createTestBlock({ data: tooShortData })).toThrow(
        'Data too short to contain encryption header',
      );

      // Test oversized data
      const tooLargeData = createEncryptedData(
        (defaultBlockSize as number) + 1,
      );
      expect(() => createTestBlock({ data: tooLargeData })).toThrow(
        'Data length exceeds block capacity',
      );
    });

    it('should validate actual data length', () => {
      const data = createEncryptedData(defaultBlockSize as number);
      const tooLargeActualLength =
        (defaultBlockSize as number) -
        StaticHelpersECIES.eciesOverheadLength +
        1;

      expect(() =>
        createTestBlock({ data, actualDataLength: tooLargeActualLength }),
      ).toThrow('Data length exceeds block capacity');
    });
  });

  describe('encryption handling', () => {
    it('should handle encrypted data correctly', () => {
      const originalData = randomBytes(
        getEffectiveSize(defaultBlockSize) -
          StaticHelpersECIES.eciesOverheadLength,
      );
      const encryptedData = createEncryptedData(defaultBlockSize as number);
      const block = createTestBlock({
        data: encryptedData,
        actualDataLength: originalData.length,
      });

      expect(block.encrypted).toBe(true);
      expect(block.data.length).toBe(defaultBlockSize as number);
      expect(block.payload.length).toBe(
        (defaultBlockSize as number) - StaticHelpersECIES.eciesOverheadLength,
      );
    });

    it('should calculate overhead correctly', () => {
      const block = createTestBlock();
      expect(block.totalOverhead).toBe(StaticHelpersECIES.eciesOverheadLength);
      expect(block.capacity).toBe(
        (defaultBlockSize as number) - StaticHelpersECIES.eciesOverheadLength,
      );
    });
  });

  describe('validation', () => {
    it('should detect data corruption', () => {
      // Create original data and get its checksum
      const data = createEncryptedData(defaultBlockSize as number);
      const checksum = StaticHelpersChecksum.calculateChecksum(data);

      // Create corrupted data by modifying the original
      const corruptedData = Buffer.from(data);
      corruptedData[0]++; // Corrupt the header to ensure validation fails

      // Verify block creation fails with corrupted data
      expect(() => createTestBlock({ data: corruptedData, checksum })).toThrow(
        'Checksum mismatch',
      );

      // Verify the checksum mismatch
      const corruptedChecksum =
        StaticHelpersChecksum.calculateChecksum(corruptedData);
      expect(corruptedChecksum.equals(checksum)).toBe(false);
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(() => createTestBlock({ dateCreated: futureDate })).toThrow(
        'Date created cannot be in the future',
      );
    });
  });
});
