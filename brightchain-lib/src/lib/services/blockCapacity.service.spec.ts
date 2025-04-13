import CONSTANTS, { ECIES, ENCRYPTION } from '../constants'; // Added ENCRYPTION
import { BlockCapacityErrorType } from '../enumerations/blockCapacityErrorType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { BlockCapacityError } from '../errors/blockCapacityError';
import { ServiceProvider } from './service.provider';

describe('BlockCapacityCalculator', () => {
  const blockCapacityCalculator =
    ServiceProvider.getInstance().blockCapacityCalculator;
  describe('calculateCapacity', () => {
    it('should calculate capacity for raw data block', () => {
      const result = blockCapacityCalculator.calculateCapacity({
        blockSize: BlockSize.Small,
        blockType: BlockType.RawData,
        encryptionType: BlockEncryptionType.None,
      });

      expect(result.totalCapacity).toBe(BlockSize.Small);
      expect(result.overhead).toBe(result.details.baseHeader);
      expect(result.availableCapacity).toBe(
        BlockSize.Small - result.details.baseHeader,
      );
    });

    it('should calculate capacity for encrypted raw data block', () => {
      const result = blockCapacityCalculator.calculateCapacity({
        blockSize: BlockSize.Small,
        blockType: BlockType.RawData,
        encryptionType: BlockEncryptionType.SingleRecipient,
      });

      // Corrected expectations for encrypted raw data
      const expectedOverhead =
        ENCRYPTION.ENCRYPTION_TYPE_SIZE + // 1 byte for type
        ECIES.OVERHEAD_SIZE + // 98 bytes for single recipient base
        ENCRYPTION.RECIPIENT_ID_SIZE; // 16 bytes for recipient ID
      expect(result.totalCapacity).toBe(BlockSize.Small);
      // Base header is 0 for RawData
      expect(result.overhead).toBe(expectedOverhead);
      expect(result.availableCapacity).toBe(BlockSize.Small - expectedOverhead);
    });

    it('should calculate capacity for CBL block', () => {
      const result = blockCapacityCalculator.calculateCapacity({
        blockSize: BlockSize.Medium,
        blockType: BlockType.ConstituentBlockList,
        encryptionType: BlockEncryptionType.None, // Changed from MultiRecipient
      });

      expect(result.totalCapacity).toBe(BlockSize.Medium);
      expect(result.overhead).toBe(
        result.details.baseHeader + result.details.typeSpecificOverhead,
      );
      const expected =
        BlockSize.Medium -
        result.details.baseHeader -
        result.details.typeSpecificOverhead;
      const expectedTupleAligned =
        Math.floor(expected / CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH) *
        CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH;
      expect(result.availableCapacity).toBe(expectedTupleAligned);
    });

    it('should calculate capacity for extended CBL block', () => {
      const fileName = 'test.txt';
      const mimeType = 'text/plain';

      const result = blockCapacityCalculator.calculateCapacity({
        blockSize: BlockSize.Medium,
        blockType: BlockType.ExtendedConstituentBlockListBlock,
        cbl: { fileName, mimeType },
        encryptionType: BlockEncryptionType.None, // Changed from MultiRecipient
      });

      expect(result.totalCapacity).toBe(BlockSize.Medium);
      expect(result.overhead).toBe(
        result.details.baseHeader +
          result.details.typeSpecificOverhead +
          (result.details.variableOverhead ?? 0),
      );
      // Corrected expectation for available capacity with tuple alignment
      const expectedCapacityBeforeAlignment =
        BlockSize.Medium -
        result.details.baseHeader -
        result.details.typeSpecificOverhead -
        (result.details.variableOverhead ?? 0);
      const expectedTupleAlignedCapacity =
        Math.floor(
          expectedCapacityBeforeAlignment /
            CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH,
        ) * CONSTANTS.CHECKSUM.SHA3_BUFFER_LENGTH;
      expect(result.availableCapacity).toBe(expectedTupleAlignedCapacity);
    });

    it('should calculate capacity for multi-encrypted block', () => {
      const recipientCount = 3;

      const result = blockCapacityCalculator.calculateCapacity({
        blockSize: BlockSize.Large,
        blockType: BlockType.EncryptedOwnedDataBlock,
        recipientCount,
        encryptionType: BlockEncryptionType.MultiRecipient,
      });

      expect(result.totalCapacity).toBe(BlockSize.Large);
      // Corrected expected overhead calculation
      const expectedMultiOverhead =
        ServiceProvider.getInstance().eciesService.calculateECIESMultipleRecipientOverhead(
          recipientCount,
          true, // include message overhead
        );
      const expectedTotalOverhead =
        result.details.baseHeader + // Should be 0 for EncryptedOwnedDataBlock
        result.details.typeSpecificOverhead + // Should be 1 for ENCRYPTION_TYPE_SIZE
        expectedMultiOverhead +
        (result.details.variableOverhead ?? 0); // Should be 0
      expect(result.overhead).toBe(expectedTotalOverhead);
      expect(result.availableCapacity).toBe(
        BlockSize.Large - expectedTotalOverhead,
      );
    });

    it('should throw error for invalid block size', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: -1 as BlockSize,
          blockType: BlockType.RawData,
          encryptionType: BlockEncryptionType.MultiRecipient,
        }),
      ).toThrowType(BlockCapacityError, (error: BlockCapacityError) => {
        expect(error.type).toBe(BlockCapacityErrorType.InvalidBlockSize);
      });
    });

    it('should throw error for invalid block type', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: BlockSize.Small,
          blockType: 999 as BlockType,
          encryptionType: BlockEncryptionType.MultiRecipient,
        }),
      ).toThrowType(BlockCapacityError, (error: BlockCapacityError) => {
        expect(error.type).toBe(BlockCapacityErrorType.InvalidBlockType);
      });
    });

    it('should throw error for extended CBL without filename', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: BlockSize.Small,
          blockType: BlockType.ExtendedConstituentBlockListBlock,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cbl: { fileName: undefined as any, mimeType: 'text/plain' },
          encryptionType: BlockEncryptionType.SingleRecipient,
        }),
      ).toThrowType(BlockCapacityError, (error: BlockCapacityError) => {
        expect(error.type).toBe(BlockCapacityErrorType.InvalidFileName);
      });
    });

    it('should throw error for extended CBL without mimetype', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: BlockSize.Small,
          blockType: BlockType.ExtendedConstituentBlockListBlock,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          cbl: { fileName: 'test.txt', mimeType: undefined as any },
          encryptionType: BlockEncryptionType.SingleRecipient,
        }),
      ).toThrowType(BlockCapacityError, (error: BlockCapacityError) => {
        expect(error.type).toBe(BlockCapacityErrorType.InvalidMimeType);
      });
    });

    it('should throw error for multi-encrypted block without recipient count', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: BlockSize.Small,
          blockType: BlockType.EncryptedOwnedDataBlock,
          encryptionType: BlockEncryptionType.MultiRecipient,
        }),
      ).toThrowType(BlockCapacityError, (error: BlockCapacityError) => {
        expect(error.type).toBe(BlockCapacityErrorType.InvalidRecipientCount);
      });
    });

    it('should throw error for multi-encrypted block with too many recipients', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: BlockSize.Small,
          blockType: BlockType.EncryptedOwnedDataBlock,
          recipientCount: ECIES.MULTIPLE.MAX_RECIPIENTS + 1,
          encryptionType: BlockEncryptionType.MultiRecipient,
        }),
      ).toThrowType(BlockCapacityError, (error: BlockCapacityError) => {
        expect(error.type).toBe(BlockCapacityErrorType.InvalidRecipientCount);
      });
    });

    it('should throw error when overhead exceeds block size', () => {
      // Try to create a multi-encrypted block with so many recipients
      // that the overhead exceeds even the largest block size
      expect(() => {
        return blockCapacityCalculator.calculateCapacity({
          blockSize: BlockSize.Small,
          blockType: BlockType.EncryptedOwnedDataBlock,
          recipientCount: 1000, // Large number of recipients
          encryptionType: BlockEncryptionType.MultiRecipient,
        });
      }).toThrowType(BlockCapacityError, (error: BlockCapacityError) => {
        expect(error.type).toBe(BlockCapacityErrorType.CapacityExceeded);
      });
    });
  });
});
