import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { TUPLE_SIZE } from '../constants';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import MemberType from '../enumerations/memberType';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';
import { BlockHandle } from './handle';

// Test class that properly implements abstract methods
class TestCblBlock extends ConstituentBlockListBlock {
  constructor(
    blockSize: BlockSize,
    creator: BrightChainMember | GuidV4,
    fileDataLength: bigint,
    dataAddresses: Array<ChecksumBuffer>,
    dateCreated?: Date,
    signature?: SignatureBuffer,
  ) {
    super(
      blockSize,
      creator,
      fileDataLength,
      dataAddresses,
      dateCreated,
      signature,
    );
  }
}

describe('ConstituentBlockListBlock', () => {
  // Increase timeout for all tests
  jest.setTimeout(15000);

  // Shared test data
  let creator: BrightChainMember;
  let dataAddresses: Array<ChecksumBuffer>;
  const defaultBlockSize = BlockSize.Small;
  const defaultDataLength = BigInt(1024);
  const testDate = new Date(Date.now() - 1000); // 1 second ago

  // Helper functions
  const createTestAddresses = (count = TUPLE_SIZE): Array<ChecksumBuffer> =>
    Array(count)
      .fill(null)
      .map(() =>
        StaticHelpersChecksum.calculateChecksum(randomBytes(32)),
      ) as Array<ChecksumBuffer>;

  const createTestBlock = (
    options: Partial<{
      blockSize: BlockSize;
      creator: BrightChainMember | GuidV4;
      fileDataLength: bigint;
      addresses: Array<ChecksumBuffer>;
      dateCreated: Date;
      signature: SignatureBuffer;
    }> = {},
  ) => {
    return new TestCblBlock(
      options.blockSize || defaultBlockSize,
      options.creator || creator,
      options.fileDataLength || defaultDataLength,
      options.addresses || dataAddresses,
      options.dateCreated || testDate,
      options.signature,
    );
  };

  beforeAll(() => {
    creator = BrightChainMember.newMember(
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    );
  });

  beforeEach(() => {
    // Create addresses as multiple of TUPLE_SIZE
    dataAddresses = createTestAddresses(TUPLE_SIZE * 2);
  });

  describe('basic functionality', () => {
    it('should construct and validate correctly', async () => {
      const block = createTestBlock();

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.ConstituentBlockList);
      expect(block.creator).toBe(creator);
      expect(block.addresses).toEqual(dataAddresses);
      expect(block.canRead).toBe(true);

      // Validate should complete without throwing
      await expect(block.validateAsync()).resolves.not.toThrow();
    });

    it('should handle creators correctly', () => {
      // Test with BrightChainMember creator
      const memberBlock = createTestBlock();
      expect(memberBlock.creator).toBe(creator);
      expect(memberBlock.creatorId.equals(creator.id)).toBe(true);

      // Test with GuidV4 creator
      const guidCreator = GuidV4.new();
      const guidBlock = createTestBlock({ creator: guidCreator });
      expect(guidBlock.creator).toBeUndefined();
      expect(guidBlock.creatorId.equals(guidCreator)).toBe(true);
    });

    it('should handle signature validation', () => {
      const block = createTestBlock();
      expect(block.validateSignature()).toBe(true);

      // Create another block with different data
      const differentBlock = createTestBlock({
        addresses: createTestAddresses(TUPLE_SIZE * 2),
      });

      // Verify signatures are different but valid
      expect(block.creatorSignature).not.toEqual(
        differentBlock.creatorSignature,
      );
      expect(block.validateSignature()).toBe(true);
      expect(differentBlock.validateSignature()).toBe(true);
    });
  });

  describe('validation', () => {
    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(() => createTestBlock({ dateCreated: futureDate })).toThrow(
        'Date created cannot be in the future',
      );
    });

    it('should validate tuple size', () => {
      // Test invalid tuple count (not multiple of TUPLE_SIZE)
      const invalidAddresses = createTestAddresses(TUPLE_SIZE + 1);
      expect(() => createTestBlock({ addresses: invalidAddresses })).toThrow(
        'CBL address count must be a multiple of TupleSize',
      );
    });

    it('should validate address capacity', () => {
      // Calculate max addresses that can fit
      const maxAddresses =
        ConstituentBlockListBlock.CalculateCBLAddressCapacity(defaultBlockSize);
      // Create addresses array just over the limit
      const tooManyAddresses = createTestAddresses(
        (maxAddresses + TUPLE_SIZE) * TUPLE_SIZE,
      );

      expect(() => createTestBlock({ addresses: tooManyAddresses })).toThrow(
        'Data length exceeds block capacity',
      );
    });
  });

  describe('data access', () => {
    it('should provide correct block IDs', () => {
      const block = createTestBlock();
      const blockIds = block.getCblBlockIds();
      expect(blockIds).toEqual(dataAddresses);
      expect(blockIds.length).toBe(dataAddresses.length);
    });

    it('should handle tuple access', async () => {
      // Mock BlockHandle.createFromPath
      const originalCreateFromPath = BlockHandle.createFromPath;
      BlockHandle.createFromPath = jest
        .fn()
        .mockImplementation((blockSize, path, id) =>
          Promise.resolve(
            new BlockHandle(
              BlockType.Handle,
              BlockDataType.RawData,
              blockSize,
              id,
              undefined, // dateCreated
              undefined, // metadata
              true, // canRead
              true, // canPersist
            ),
          ),
        );

      try {
        const block = createTestBlock();
        const tuples = await block.getHandleTuples((id) => id.toString('hex'));

        expect(tuples.length).toBe(dataAddresses.length / TUPLE_SIZE);
        tuples.forEach((tuple) => {
          expect(tuple.handles.length).toBe(TUPLE_SIZE);
          tuple.handles.forEach((handle) => {
            expect(handle.blockSize).toBe(defaultBlockSize);
          });
        });
      } finally {
        // Restore original function
        BlockHandle.createFromPath = originalCreateFromPath;
      }
    });
  });
});
