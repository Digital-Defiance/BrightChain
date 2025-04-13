import CONSTANTS, { ECIES } from '../constants';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockCapacityErrorType } from '../enumerations/blockCapacityErrorType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { ExtendedCblErrorType } from '../enumerations/extendedCblErrorType';
import { BlockCapacityError } from '../errors/blockCapacityError';
import { ExtendedCblError } from '../errors/extendedCblError';
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
        blockType: BlockType.EncryptedOwnedDataBlock,
        encryptionType: BlockEncryptionType.SingleRecipient,
      });

      expect(result.totalCapacity).toBe(BlockSize.Small);
      expect(result.overhead).toBeGreaterThan(result.details.baseHeader);
      expect(result.availableCapacity).toBeLessThan(BlockSize.Small);
    });

    it('should calculate capacity for CBL block', () => {
      const result = blockCapacityCalculator.calculateCapacity({
        blockSize: BlockSize.Medium,
        blockType: BlockType.ConstituentBlockList,
        encryptionType: BlockEncryptionType.None,
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
      const filename = 'test.txt';
      const mimetype = 'text/plain';

      const result = blockCapacityCalculator.calculateCapacity({
        blockSize: BlockSize.Medium,
        blockType: BlockType.ExtendedConstituentBlockListBlock,
        cbl: {
          fileName: filename,
          mimeType: mimetype,
        },
        encryptionType: BlockEncryptionType.None,
      });

      expect(result.totalCapacity).toBe(BlockSize.Medium);
      expect(result.overhead).toBe(
        result.details.baseHeader +
          result.details.typeSpecificOverhead +
          (result.details.variableOverhead ?? 0),
      );
      // Available capacity should be less than total due to overhead
      expect(result.availableCapacity).toBeLessThan(BlockSize.Medium);
      expect(result.availableCapacity).toBeGreaterThan(0);
    });

    it('should calculate capacity for multi-encrypted block', () => {
      const recipientCount = 3;

      const result = blockCapacityCalculator.calculateCapacity({
        blockSize: BlockSize.Large,
        blockType: BlockType.MultiEncryptedBlock,
        recipientCount,
        encryptionType: BlockEncryptionType.MultiRecipient,
      });

      expect(result.totalCapacity).toBe(BlockSize.Large);
      expect(result.overhead).toBe(
        result.details.baseHeader +
          result.details.typeSpecificOverhead +
          result.details.encryptionOverhead +
          (result.details.variableOverhead ?? 0),
      );
      const expected =
        BlockSize.Large -
        result.details.baseHeader -
        result.details.typeSpecificOverhead -
        result.details.encryptionOverhead -
        (result.details.variableOverhead ?? 0);
      expect(result.availableCapacity).toBe(expected);
    });

    it('should throw error for invalid block size', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: -1 as BlockSize,
          blockType: BlockType.RawData,
          encryptionType: BlockEncryptionType.None,
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
          encryptionType: BlockEncryptionType.None,
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
          cbl: {
            fileName: '',
            mimeType: 'text/plain',
          },
          encryptionType: BlockEncryptionType.None,
        }),
      ).toThrowType(ExtendedCblError, (error: ExtendedCblError) => {
        expect(error.type).toBe(ExtendedCblErrorType.FileNameRequired);
      });
    });

    it('should throw error for extended CBL without mimetype', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: BlockSize.Small,
          blockType: BlockType.ExtendedConstituentBlockListBlock,
          cbl: {
            fileName: 'test.txt',
            mimeType: '',
          },
          encryptionType: BlockEncryptionType.None,
        }),
      ).toThrowType(ExtendedCblError, (error: ExtendedCblError) => {
        expect(error.type).toBe(ExtendedCblErrorType.MimeTypeRequired);
      });
    });

    it('should throw error for multi-encrypted block without recipient count', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: BlockSize.Small,
          blockType: BlockType.MultiEncryptedBlock,
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
          blockType: BlockType.MultiEncryptedBlock,
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
          blockType: BlockType.MultiEncryptedBlock,
          recipientCount: 1000, // Large number of recipients
          encryptionType: BlockEncryptionType.MultiRecipient,
        });
      }).toThrowType(BlockCapacityError, (error: BlockCapacityError) => {
        expect(error.type).toBe(BlockCapacityErrorType.CapacityExceeded);
      });
    });
  });
});
