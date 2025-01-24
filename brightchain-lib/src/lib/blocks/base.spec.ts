import { randomBytes } from 'crypto';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { IBlockMetadata } from '../interfaces/blockMetadata';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';

// Test class that properly implements abstract methods
class TestBaseBlock extends BaseBlock {
  private readonly internalData: Buffer;

  constructor(
    type: BlockType,
    blockDataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    dateCreated?: Date,
    metadata?: IBlockMetadata,
    canRead = true,
    canPersist = true,
  ) {
    super(
      type,
      blockDataType,
      blockSize,
      data,
      checksum,
      dateCreated,
      metadata,
      canRead,
      canPersist,
    );
    this.internalData = data;
  }

  public override get data(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this.internalData;
  }

  public override get layerHeaderData(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return Buffer.alloc(0);
  }

  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
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
      blockSize: BlockSize;
      data: Buffer;
      checksum: ChecksumBuffer;
      dateCreated: Date;
      canRead: boolean;
    }> = {},
  ) => {
    const blockSize = options.blockSize || defaultBlockSize;
    const dataType = options.dataType || BlockDataType.RawData;
    const isEncrypted = dataType === BlockDataType.EncryptedData;
    const effectiveSize = getEffectiveSize(blockSize, isEncrypted);
    const data = options.data || randomBytes(effectiveSize);

    return new TestBaseBlock(
      options.type || BlockType.OwnerFreeWhitenedBlock, // Use OwnerFreeWhitenedBlock (0) as default
      dataType,
      blockSize,
      data,
      options.checksum,
      options.dateCreated,
      undefined,
      options.canRead ?? true,
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
      expect(block.validated).toBe(true);
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
      const sizes = [
        BlockSize.Message,
        BlockSize.Tiny,
        BlockSize.Small,
        BlockSize.Medium,
        BlockSize.Large,
        BlockSize.Huge,
      ];

      sizes.forEach((size) => {
        const effectiveSize = getEffectiveSize(size);
        const data = randomBytes(effectiveSize);
        const block = createTestBlock({ blockSize: size, data });
        expect(block.data.length).toBe(effectiveSize);
        expect(block.capacity).toBe(size as number);
      });
    });

    it('should reject invalid sizes', () => {
      // Test oversized data
      const tooLargeData = randomBytes((defaultBlockSize as number) + 1);
      expect(() => createTestBlock({ data: tooLargeData })).toThrow(
        'Data length exceeds block capacity',
      );

      // Test invalid block size
      expect(
        () =>
          new TestBaseBlock(
            BlockType.OwnerFreeWhitenedBlock,
            BlockDataType.RawData,
            0 as BlockSize,
            Buffer.alloc(0),
          ),
      ).toThrow('Invalid block size');
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
    it('should detect data corruption', () => {
      const data = randomBytes(defaultBlockSize as number);
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const corruptedData = Buffer.from(data);
      corruptedData[0]++; // Corrupt the data

      const block = createTestBlock({ data: corruptedData, checksum });
      expect(block.validated).toBe(false); // Should be false since data doesn't match checksum
      expect(block.validate()).toBe(false); // Should return false on validation
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
