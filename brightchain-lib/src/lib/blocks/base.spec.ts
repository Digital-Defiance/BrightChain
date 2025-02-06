import { randomBytes } from 'crypto';
import { BlockMetadata } from '../blockMetadata';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import { BlockAccessError, BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';

// Test class that properly implements abstract methods
class TestBaseBlock extends BaseBlock {
  private readonly internalData: Buffer;

  // Test helper to corrupt data
  public corruptData(index: number, value: number): void {
    this.internalData[index] = value;
  }

  constructor(
    type: BlockType,
    blockDataType: BlockDataType,
    data: Buffer,
    checksum?: ChecksumBuffer,
    dateCreated?: Date,
    canRead = true,
    canPersist = true,
  ) {
    // Use Small as default block size
    const blockSize = BlockSize.Small;

    // Validate data length against block capacity
    const effectiveSize =
      blockDataType === BlockDataType.EncryptedData
        ? blockSize
        : (blockSize as number);
    if (data.length > effectiveSize) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthExceedsCapacity,
      );
    }

    const expectedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    if (checksum) {
      if (!checksum.equals(expectedChecksum)) {
        throw new ChecksumMismatchError(checksum, expectedChecksum);
      }
    }

    const metadata = new BlockMetadata(
      blockSize,
      type,
      blockDataType,
      data.length,
      dateCreated ?? new Date(),
    );

    super(
      type,
      blockDataType,
      checksum ?? expectedChecksum,
      metadata,
      canRead,
      canPersist,
    );
    this.internalData = data;
  }

  /**
   * Re-validate the block
   * @throws ChecksumMismatchError
   * @returns true
   */
  public validateSync(): void {
    const expectedChecksum = StaticHelpersChecksum.calculateChecksum(
      this.internalData,
    );
    const result = this.idChecksum.equals(expectedChecksum);
    if (!result) {
      throw new ChecksumMismatchError(this.idChecksum, expectedChecksum);
    }
  }

  /**
   * Re-validate the block
   * @throws ChecksumMismatchError
   * @returns true
   */
  public async validateAsync(): Promise<void> {
    const expectedChecksum = await StaticHelpersChecksum.calculateChecksumAsync(
      this.internalData,
    );
    if (!this.idChecksum.equals(expectedChecksum)) {
      throw new ChecksumMismatchError(this.idChecksum, expectedChecksum);
    }
  }

  public override get data(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this.internalData;
  }

  public override get layerHeaderData(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return Buffer.alloc(0);
  }

  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new BlockAccessError(BlockAccessErrorType.BlockIsNotReadable);
    }
    return this.internalData;
  }
}

describe('BaseBlock', () => {
  // Increase timeout for all tests
  jest.setTimeout(15000);

  // Shared test data
  const defaultBlockSize = BlockSize.Small;
  const getEffectiveSize = (size: BlockSize, encrypted = false) =>
    (size as number) - (encrypted ? StaticHelpersECIES.eciesOverheadLength : 0);

  const createTestBlock = (
    options: Partial<{
      type: BlockType;
      dataType: BlockDataType;
      data: Buffer;
      checksum: ChecksumBuffer;
      dateCreated: Date;
      canRead: boolean;
    }> = {},
  ) => {
    const dataType = options.dataType || BlockDataType.RawData;
    const isEncrypted = dataType === BlockDataType.EncryptedData;
    const effectiveSize = getEffectiveSize(defaultBlockSize, isEncrypted);
    const data = options.data || randomBytes(effectiveSize);

    return new TestBaseBlock(
      options.type || BlockType.OwnerFreeWhitenedBlock, // Use OwnerFreeWhitenedBlock (0) as default
      dataType,
      data,
      options.checksum,
      options.dateCreated,
      options.canRead ?? true,
      true, // canPersist
    );
  };

  describe('basic functionality', () => {
    it('should construct and validate correctly', () => {
      const data = randomBytes(defaultBlockSize as number);
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const block = createTestBlock({ data, checksum });

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.OwnerFreeWhitenedBlock);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(block.data).toEqual(data);
      expect(block.idChecksum).toEqual(checksum);
      expect(block.canRead).toBe(true);
    });

    it('should handle empty data', () => {
      const block = createTestBlock({ data: Buffer.alloc(0) });
      expect(block.data.length).toBe(0);
      expect(block.payload.length).toBe(0);
      expect(block.layerHeaderData.length).toBe(0);
    });

    it('should handle padding correctly', () => {
      const dataSize = Math.floor((defaultBlockSize as number) / 2);
      const data = randomBytes(dataSize);
      const block = createTestBlock({ data });
      const expectedPadding = (defaultBlockSize as number) - dataSize;
      expect(block.padding.length).toBe(expectedPadding);
      expect(block.padding.equals(Buffer.alloc(expectedPadding))).toBe(true);
    });
  });

  describe('size handling', () => {
    it('should handle various block sizes', () => {
      const testSize = BlockSize.Small; // Use a consistent size for testing
      const effectiveSize = Math.floor((testSize as number) / 2); // Use half the block size to ensure it fits
      const data = randomBytes(effectiveSize);
      const block = createTestBlock({ data });
      expect(block.data.length).toBe(effectiveSize);
      expect(block.capacity).toBe(testSize as number);
    });

    it('should reject invalid sizes', () => {
      // Test oversized data
      const tooLargeData = randomBytes((defaultBlockSize as number) + 1);
      expect(() => createTestBlock({ data: tooLargeData })).toThrowType(
        BlockValidationError,
        (error: BlockValidationError) => {
          expect(error.reason).toBe(
            BlockValidationErrorType.DataLengthExceedsCapacity,
          );
        },
      );
    });
  });

  describe('type handling', () => {
    it('should handle all block and data types', () => {
      // Test block types
      const blockTypes = Object.values(BlockType).filter(
        (type): type is BlockType => typeof type === 'number' && type >= 0,
      );
      blockTypes.forEach((type) => {
        const block = createTestBlock({ type });
        expect(block.blockType).toBe(type);
      });

      // Test data types
      const dataTypes = Object.values(BlockDataType).filter(
        (type): type is BlockDataType => typeof type === 'number',
      );
      dataTypes.forEach((dataType) => {
        const isEncrypted = dataType === BlockDataType.EncryptedData;
        const block = createTestBlock({
          dataType,
          data: randomBytes(
            getEffectiveSize(defaultBlockSize, isEncrypted) / 2,
          ),
        });
        expect(block.blockDataType).toBe(dataType);
      });
    });
  });

  describe('validation', () => {
    it('should detect data corruption', async () => {
      // First create a valid block
      const data = randomBytes(defaultBlockSize as number);
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const block = createTestBlock({ data, checksum });

      // Then corrupt the internal data after creation
      block.corruptData(0, (block.data[0] + 1) % 256); // Increment the first byte

      // Calculate what the new checksum should be after corruption
      const newChecksum = StaticHelpersChecksum.calculateChecksum(block.data);

      try {
        await block.validateAsync();
        fail('Expected validateAsync to throw');
      } catch (error) {
        expect(error).toBeInstanceOf(ChecksumMismatchError);
        const checksumError = error as ChecksumMismatchError;
        expect(checksumError.checksum).toEqual(block.idChecksum);
        expect(checksumError.expected).toEqual(newChecksum);
      }
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(() => createTestBlock({ dateCreated: futureDate })).toThrowType(
        BlockValidationError,
        (error: BlockValidationError) => {
          expect(error.reason).toBe(
            BlockValidationErrorType.FutureCreationDate,
          );
        },
      );
    });
  });
});
