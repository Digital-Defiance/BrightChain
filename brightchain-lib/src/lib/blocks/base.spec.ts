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

  public get data(): Buffer {
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
  it('should construct correctly', () => {
    const blockSize = BlockSize.Small;
    const effectiveSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const data = randomBytes(effectiveSize);
    const checksum = StaticHelpersChecksum.calculateChecksum(data);

    const block = new TestBaseBlock(
      BlockType.Random,
      BlockDataType.RawData,
      blockSize,
      data,
      checksum,
    );

    expect(block.blockSize).toBe(blockSize);
    expect(block.blockType).toBe(BlockType.Random);
    expect(block.blockDataType).toBe(BlockDataType.RawData);
    expect(block.data).toEqual(data);
    expect(block.idChecksum).toEqual(checksum);
    expect(block.validated).toBe(true);
    expect(block.canRead).toBe(true);
  });

  it('should handle empty data correctly', () => {
    const block = new TestBaseBlock(
      BlockType.Random,
      BlockDataType.RawData,
      BlockSize.Small,
      Buffer.alloc(0),
    );
    expect(block.data.length).toBe(0);
    expect(block.payload.length).toBe(0);
    expect(block.layerHeaderData.length).toBe(0);
  });

  it('should throw when data length exceeds block size', () => {
    expect(
      () =>
        new TestBaseBlock(
          BlockType.Random,
          BlockDataType.RawData,
          BlockSize.Small,
          randomBytes(BlockSize.Small + 1),
        ),
    ).toThrow('Data length exceeds block capacity');
  });

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
      const effectiveSize =
        (size as number) - StaticHelpersECIES.eciesOverheadLength;
      const data = randomBytes(effectiveSize);
      const block = new TestBaseBlock(
        BlockType.Random,
        BlockDataType.RawData,
        size,
        data,
      );
      expect(block.data.length).toBe(data.length);
    });
  });

  it('should handle data corruption', () => {
    const blockSize = BlockSize.Small;
    const effectiveSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(effectiveSize);
    const checksum = StaticHelpersChecksum.calculateChecksum(originalData);
    const corruptedData = Buffer.from(originalData); // Create a copy to modify
    corruptedData[0]++; // Corrupt the data

    const block = new TestBaseBlock(
      BlockType.Random,
      BlockDataType.RawData,
      blockSize,
      corruptedData,
      checksum,
    );
    expect(block.validated).toBe(false); // Expect validation to fail
  });

  it('should handle various block types', () => {
    (Object.values(BlockType) as BlockType[])
      .filter((type) => typeof type === 'number')
      .forEach((type) => {
        const block = new TestBaseBlock(
          type,
          BlockDataType.RawData,
          BlockSize.Small,
          Buffer.alloc(
            (BlockSize.Small as number) -
              StaticHelpersECIES.eciesOverheadLength,
          ),
        );
        expect(block.blockType).toBe(type);
      });
  });

  it('should handle various data types', () => {
    (Object.values(BlockDataType) as BlockDataType[])
      .filter((type) => typeof type === 'number')
      .forEach((dataType) => {
        const block = new TestBaseBlock(
          BlockType.Random,
          dataType,
          BlockSize.Small,
          Buffer.alloc(
            (BlockSize.Small as number) -
              StaticHelpersECIES.eciesOverheadLength,
          ),
        );
        expect(block.blockDataType).toBe(dataType);
      });
  });

  it('should handle padding correctly', () => {
    const blockSize = BlockSize.Small;
    const data = randomBytes((blockSize as number) - 10); // Leave room for padding
    const block = new TestBaseBlock(
      BlockType.Random,
      BlockDataType.RawData,
      blockSize,
      data,
    );
    expect(block.padding.length).toBe(10);
    expect(block.padding.equals(Buffer.alloc(10))).toBe(true);
  });

  it('should calculate capacity correctly', () => {
    const blockSize = BlockSize.Small;
    const effectiveSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const data = randomBytes(effectiveSize);
    const block = new TestBaseBlock(
      BlockType.Random,
      BlockDataType.RawData,
      blockSize,
      data,
    );
    expect(block.capacity).toBe(blockSize as number);
  });

  it('should handle invalid block sizes', () => {
    expect(
      () =>
        new TestBaseBlock(
          BlockType.Random,
          BlockDataType.RawData,
          0 as BlockSize,
          Buffer.alloc(0),
        ),
    ).toThrow('Invalid block size');
  });

  it('should reject future dates', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    expect(
      () =>
        new TestBaseBlock(
          BlockType.Random,
          BlockDataType.RawData,
          BlockSize.Small,
          Buffer.alloc(
            (BlockSize.Small as number) -
              StaticHelpersECIES.eciesOverheadLength,
          ),
          undefined,
          futureDate,
        ),
    ).toThrow('Date created cannot be in the future');
  });
});
