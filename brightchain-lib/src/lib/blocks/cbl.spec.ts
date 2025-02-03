import { createECDH, randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { TUPLE_SIZE } from '../constants';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import MemberType from '../enumerations/memberType';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { StaticHelpersVotingDerivation } from '../staticHelpers.voting.derivation';
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
    dateCreated = dateCreated ?? new Date();

    // Validate tuple size before creating block
    if (dataAddresses.length % TUPLE_SIZE !== 0) {
      throw new Error('CBL address count must be a multiple of TupleSize');
    }

    // Create copies of the address buffers to prevent sharing references
    const addressCopies = dataAddresses.map((addr) => Buffer.from(addr));
    const addressBuffer = Buffer.concat(addressCopies);

    const metadata = new CblBlockMetadata(
      blockSize,
      BlockType.ConstituentBlockList,
      BlockDataType.EphemeralStructuredData,
      addressBuffer.length,
      fileDataLength,
      dateCreated,
      creator,
    );

    // Create header using makeCblHeader
    const { headerData, signature: finalSignature } =
      ConstituentBlockListBlock.makeCblHeader(
        creator,
        dateCreated,
        dataAddresses.length,
        fileDataLength,
        addressBuffer,
        signature,
        TUPLE_SIZE,
      );

    // Create final data buffer with padding
    const data = Buffer.concat([headerData, addressBuffer]);
    const maxDataSize = blockSize as number;
    const paddingLength = maxDataSize - data.length;
    const paddedData =
      paddingLength > 0
        ? Buffer.concat([data, randomBytes(paddingLength)])
        : data;

    // Calculate checksum on padded data
    const checksum = StaticHelpersChecksum.calculateChecksum(paddedData);

    super(creator, metadata, paddedData, checksum, finalSignature);
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
    const mnemonic = StaticHelpersECIES.generateNewMnemonic();
    const { wallet } = StaticHelpersECIES.walletAndSeedFromMnemonic(mnemonic);
    const privateKey = wallet.getPrivateKey();
    const publicKey = Buffer.concat([
      Buffer.from([0x04]),
      wallet.getPublicKey(),
    ]);

    // Create ECDH instance for key derivation
    const ecdh = createECDH(StaticHelpersECIES.curveName);
    ecdh.setPrivateKey(privateKey);

    // Derive voting keys
    const votingKeypair =
      StaticHelpersVotingDerivation.deriveVotingKeysFromECDH(
        privateKey,
        publicKey,
      );

    creator = new BrightChainMember(
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
      publicKey,
      votingKeypair.publicKey,
      privateKey,
      wallet,
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
        .mockImplementation(async (path, metadata, id) =>
          Promise.resolve(
            new BlockHandle(
              BlockType.Handle,
              BlockDataType.RawData,
              id,
              metadata,
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
