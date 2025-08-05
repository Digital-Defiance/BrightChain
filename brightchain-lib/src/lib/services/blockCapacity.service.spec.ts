import CONSTANTS, { ECIES } from '../constants';
import { BlockCapacityErrorType } from '../enumerations/blockCapacityErrorType';
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
        usesStandardEncryption: false,
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
        usesStandardEncryption: true,
      });

      expect(result.totalCapacity).toBe(BlockSize.Small);
      expect(result.overhead).toBe(
        result.details.baseHeader + ECIES.OVERHEAD_SIZE,
      );
      expect(result.availableCapacity).toBe(
        BlockSize.Small - result.details.baseHeader - ECIES.OVERHEAD_SIZE,
      );
    });

    it('should calculate capacity for CBL block', () => {
      const result = blockCapacityCalculator.calculateCapacity({
        blockSize: BlockSize.Medium,
        blockType: BlockType.ConstituentBlockList,
        usesStandardEncryption: false,
      });

      expect(result.totalCapacity).toBe(BlockSize.Medium);
      expect(result.overhead).toBe(
        result.details.baseHeader + result.details.typeSpecificHeader,
      );
      const expected =
        BlockSize.Medium -
        result.details.baseHeader -
        result.details.typeSpecificHeader;
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
        filename,
        mimetype,
        usesStandardEncryption: false,
      });

      expect(result.totalCapacity).toBe(BlockSize.Medium);
      expect(result.overhead).toBe(
        result.details.baseHeader +
          result.details.typeSpecificHeader +
          (result.details.variableOverhead ?? 0),
      );
      expect(result.availableCapacity).toBe(
        BlockSize.Medium -
          result.details.baseHeader -
          result.details.typeSpecificHeader -
          (result.details.variableOverhead ?? 0),
      );
    });

    it('should calculate capacity for multi-encrypted block', () => {
      const recipientCount = 3;

      const result = blockCapacityCalculator.calculateCapacity({
        blockSize: BlockSize.Large,
        blockType: BlockType.MultiEncryptedBlock,
        recipientCount,
        usesStandardEncryption: false,
      });

      expect(result.totalCapacity).toBe(BlockSize.Large);
      expect(result.overhead).toBe(
        result.details.baseHeader +
          result.details.typeSpecificHeader +
          (result.details.variableOverhead ?? 0),
      );
      const expected =
        BlockSize.Large -
        result.details.baseHeader -
        result.details.typeSpecificHeader -
        (result.details.variableOverhead ?? 0);
      expect(result.availableCapacity).toBe(expected);
    });

    it('should throw error for invalid block size', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: -1 as BlockSize,
          blockType: BlockType.RawData,
          usesStandardEncryption: false,
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
          usesStandardEncryption: false,
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
          mimetype: 'text/plain',
          usesStandardEncryption: false,
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
          filename: 'test.txt',
          usesStandardEncryption: false,
        }),
      ).toThrowType(BlockCapacityError, (error: BlockCapacityError) => {
        expect(error.type).toBe(BlockCapacityErrorType.InvalidMimeType);
      });
    });

    it('should throw error for multi-encrypted block without recipient count', () => {
      expect(() =>
        blockCapacityCalculator.calculateCapacity({
          blockSize: BlockSize.Small,
          blockType: BlockType.MultiEncryptedBlock,
          usesStandardEncryption: false,
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
          usesStandardEncryption: false,
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
          usesStandardEncryption: true,
        });
      }).toThrowType(BlockCapacityError, (error: BlockCapacityError) => {
        expect(error.type).toBe(BlockCapacityErrorType.CapacityExceeded);
      });
    });
  });
});
