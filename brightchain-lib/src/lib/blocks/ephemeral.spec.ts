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

  const createTestBlock = (
    options: Partial<{
      type: BlockType;
      dataType: BlockDataType;
      blockSize: BlockSize;
      data: Buffer;
      checksum: ChecksumBuffer;
      creator: BrightChainMember | GuidV4;
      dateCreated: Date;
      actualDataLength: number;
      canRead: boolean;
      encrypted: boolean;
    }> = {},
  ) => {
    const blockSize = options.blockSize || defaultBlockSize;
    const isEncrypted = options.encrypted ?? false;
    const effectiveSize = getEffectiveSize(blockSize, isEncrypted);
    const data = options.data || randomBytes(effectiveSize);

    return new TestEphemeralBlock(
      options.type || BlockType.Random,
      options.dataType || BlockDataType.RawData,
      blockSize,
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
    it('should construct and validate correctly', () => {
      const data = randomBytes(getEffectiveSize(defaultBlockSize));
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const block = createTestBlock({ data, checksum });

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.Random);
      expect(block.blockDataType).toBe(BlockDataType.RawData);
      expect(block.data).toEqual(data);
      expect(block.idChecksum).toEqual(checksum);
      expect(block.validated).toBe(true);
      expect(block.canRead).toBe(true);
      expect(block.encrypted).toBe(false);
    });

    it('should handle empty data', () => {
      const block = createTestBlock({ data: Buffer.alloc(0) });
      expect(block.data.length).toBe(0);
      expect(block.payload.length).toBe(0);
      expect(block.layerHeaderData.length).toBe(0);
    });

    it('should handle padding correctly', () => {
      const dataSize = Math.floor(getEffectiveSize(defaultBlockSize) / 2);
      const data = randomBytes(dataSize);
      const block = createTestBlock({ data });

      // For unencrypted blocks, data() returns actual data without padding
      expect(block.data.length).toBe(dataSize);
      // But internal buffer is padded to full size
      expect(block.actualDataLength).toBe(dataSize);
      expect(block.blockSize).toBe(defaultBlockSize);
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
          new TestEphemeralBlock(
            BlockType.Random,
            BlockDataType.RawData,
            0 as BlockSize,
            Buffer.alloc(0),
          ),
      ).toThrow('Invalid block size');
    });

    it('should validate actual data length', () => {
      const data = randomBytes(10);
      // Test actual length > data length
      expect(() =>
        createTestBlock({ data, actualDataLength: data.length + 1 }),
      ).toThrow('Actual data length exceeds data length');
    });
  });

  describe('encryption handling', () => {
    it('should handle encrypted blocks correctly', () => {
      const effectiveSize = getEffectiveSize(defaultBlockSize, true);
      const data = randomBytes(effectiveSize);
      const block = createTestBlock({
        dataType: BlockDataType.EncryptedData,
        data,
        encrypted: true,
      });

      expect(block.encrypted).toBe(true);
      expect(block.data.length).toBe(effectiveSize);
      expect(block.canEncrypt).toBe(false);
      expect(block.canDecrypt).toBe(true);
    });

    it('should handle encryption capabilities', () => {
      const block = createTestBlock({
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
    it('should handle different creator types', () => {
      // Test with BrightChainMember creator
      const memberBlock = createTestBlock();
      expect(memberBlock.creator).toBe(creator);
      expect(memberBlock.creatorId).toBe(creator.id);
      expect(memberBlock.canSign).toBe(true);

      // Test with GuidV4 creator
      const guidCreator = GuidV4.new();
      const guidBlock = createTestBlock({ creator: guidCreator });
      expect(guidBlock.creator).toBeUndefined();
      expect(guidBlock.creatorId).toBe(guidCreator);
      expect(guidBlock.canSign).toBe(true);

      // Test with no creator
      const noCreatorBlock = new TestEphemeralBlock(
        BlockType.Random,
        BlockDataType.RawData,
        defaultBlockSize,
        randomBytes(getEffectiveSize(defaultBlockSize)),
      );
      expect(noCreatorBlock.creator).toBeUndefined();
      expect(noCreatorBlock.creatorId).toBeUndefined();
      expect(noCreatorBlock.canSign).toBe(false);
    });
  });

  describe('validation', () => {
    it('should detect data corruption', () => {
      const data = randomBytes(getEffectiveSize(defaultBlockSize));
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      const corruptedData = Buffer.from(data);
      corruptedData[0]++; // Corrupt the data

      expect(() => createTestBlock({ data: corruptedData, checksum })).toThrow(
        'Checksum mismatch',
      );
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
