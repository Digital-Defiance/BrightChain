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
import { EphemeralBlock } from './ephemeral';

// Test class that properly implements abstract methods
class TestEphemeralBlock extends EphemeralBlock {
  private readonly internalData: Buffer;

  constructor(
    type: BlockType,
    blockDataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    encrypted = false,
  ) {
    super(
      type,
      blockDataType,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      actualDataLength,
      canRead,
      encrypted,
    );
    this.internalData = data;
  }

  public override get data(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this.internalData;
  }

  // Use base class implementations for layerHeaderData and payload
  public override get layerHeaderData(): Buffer {
    return super.layerHeaderData;
  }

  public override get payload(): Buffer {
    return super.payload;
  }
}

describe('EphemeralBlock', () => {
  let creator: BrightChainMember;

  beforeAll(() => {
    creator = BrightChainMember.newMember(
      MemberType.User,
      'test',
      new EmailString('test@example.com'),
    );
  });

  it('should construct correctly', () => {
    const blockSize = BlockSize.Small;
    const data = randomBytes(blockSize as number);
    const checksum = StaticHelpersChecksum.calculateChecksum(data);

    const block = new TestEphemeralBlock(
      BlockType.Random,
      BlockDataType.RawData,
      blockSize,
      data,
      checksum,
      creator,
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
    const block = new TestEphemeralBlock(
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
        new TestEphemeralBlock(
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
      const data = randomBytes(size as number);
      const block = new TestEphemeralBlock(
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
    const originalData = randomBytes(blockSize as number);
    const checksum = StaticHelpersChecksum.calculateChecksum(originalData);
    const corruptedData = Buffer.from(originalData); // Create a copy to modify
    corruptedData[0]++; // Corrupt the data

    expect(
      () =>
        new TestEphemeralBlock(
          BlockType.Random,
          BlockDataType.RawData,
          blockSize,
          corruptedData,
          checksum,
        ),
    ).toThrow('Checksum mismatch');
  });

  it('should handle various block types', () => {
    (Object.values(BlockType) as BlockType[])
      .filter((type) => typeof type === 'number')
      .forEach((type) => {
        const block = new TestEphemeralBlock(
          type,
          BlockDataType.RawData,
          BlockSize.Small,
          Buffer.alloc(BlockSize.Small as number),
        );
        expect(block.blockType).toBe(type);
      });
  });

  it('should handle various data types', () => {
    (Object.values(BlockDataType) as BlockDataType[])
      .filter((type) => typeof type === 'number')
      .forEach((dataType) => {
        const blockSize = BlockSize.Small;
        // Use a smaller data size that will work for all data types
        const data = Buffer.alloc(Math.floor((blockSize as number) / 2));
        const block = new TestEphemeralBlock(
          BlockType.Random,
          dataType,
          blockSize,
          data,
          undefined, // checksum
          undefined, // creator
          undefined, // dateCreated
          undefined, // actualDataLength
          true, // canRead
          dataType === BlockDataType.EncryptedData, // encrypted
        );
        expect(block.blockDataType).toBe(dataType);
      });
  });

  it('should handle padding correctly', () => {
    const blockSize = BlockSize.Small;
    const data = randomBytes((blockSize as number) - 10); // Leave room for padding
    const block = new TestEphemeralBlock(
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
    const data = randomBytes(blockSize as number);
    const block = new TestEphemeralBlock(
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
        new TestEphemeralBlock(
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
        new TestEphemeralBlock(
          BlockType.Random,
          BlockDataType.RawData,
          BlockSize.Small,
          Buffer.alloc(BlockSize.Small as number),
          undefined,
          undefined,
          futureDate,
        ),
    ).toThrow('Date created cannot be in the future');
  });

  it('should handle creator correctly', () => {
    const blockSize = BlockSize.Small;
    const data = randomBytes(blockSize as number);
    const block = new TestEphemeralBlock(
      BlockType.Random,
      BlockDataType.RawData,
      blockSize,
      data,
      undefined,
      creator,
    );
    expect(block.creator).toBe(creator);
  });

  it('should handle encrypted blocks correctly', () => {
    const blockSize = BlockSize.Small;
    const effectiveSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const data = randomBytes(effectiveSize);
    const block = new TestEphemeralBlock(
      BlockType.Random,
      BlockDataType.EncryptedData,
      blockSize,
      data,
      undefined,
      creator,
      undefined,
      undefined,
      true,
      true, // encrypted = true
    );
    expect(block.encrypted).toBe(true);
    expect(block.data.length).toBe(effectiveSize);
  });
});
