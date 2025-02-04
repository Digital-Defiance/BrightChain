import { createECDH } from 'crypto';
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

describe('ConstituentBlockListBlock', () => {
  // Mock console.error before all tests
  const originalConsoleError = console.error;
  let mockConsoleError: jest.SpyInstance;

  beforeAll(() => {
    mockConsoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    mockConsoleError.mockClear();
  });

  // Shared test data
  let creator: BrightChainMember;
  let dataAddresses: Array<ChecksumBuffer>;
  const defaultBlockSize = BlockSize.Large;
  const defaultDataLength = BigInt(1024);

  // Helper functions
  const createTestAddresses = (
    count = TUPLE_SIZE,
    startIndex = 0,
  ): Array<ChecksumBuffer> => {
    const addresses = Array(count)
      .fill(null)
      .map((_, index) => {
        const data = Buffer.alloc(32);
        data.writeUInt32BE(startIndex + index, 0);
        // Add some random data to ensure uniqueness
        data.writeUInt32BE(Math.floor(Math.random() * 0xffffffff), 4);
        return StaticHelpersChecksum.calculateChecksum(data) as ChecksumBuffer;
      });

    // Verify all addresses are unique
    const hexStrings = addresses.map((addr) => addr.toString('hex'));
    const uniqueHexStrings = new Set(hexStrings);
    if (uniqueHexStrings.size !== addresses.length) {
      throw new Error('Generated addresses are not unique');
    }

    return addresses;
  };

  const createTestBlock = (
    options: Partial<{
      blockSize: BlockSize;
      creator: BrightChainMember | GuidV4;
      fileDataLength: bigint;
      addresses: Array<ChecksumBuffer>;
      dateCreated: Date;
      signature: SignatureBuffer;
    }> = {},
  ) =>
    new TestCblBlock(
      options.blockSize || defaultBlockSize,
      options.creator || creator,
      options.fileDataLength || defaultDataLength,
      options.addresses || dataAddresses,
      options.dateCreated || new Date(), // Use a new date for each block
      options.signature,
    );

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
    dataAddresses = createTestAddresses(TUPLE_SIZE);
  });

  describe('basic functionality', () => {
    it('should construct and validate correctly', async () => {
      const block = createTestBlock();

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.ConstituentBlockList);
      expect(block.creator).toBe(creator);
      expect(block.addresses).toEqual(dataAddresses);
      expect(block.canRead).toBe(true);

      await expect(block.validateAsync()).resolves.not.toThrow();
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should handle creators correctly', () => {
      const memberBlock = createTestBlock();
      expect(memberBlock.creator).toBe(creator);
      expect(memberBlock.creatorId.equals(creator.id)).toBe(true);

      const guidCreator = GuidV4.new();
      const guidBlock = createTestBlock({ creator: guidCreator });
      expect(guidBlock.creator).toBeUndefined();
      expect(guidBlock.creatorId.equals(guidCreator)).toBe(true);
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should handle signature validation', () => {
      const block = createTestBlock();
      const isValid = block.validateSignature(creator);
      expect(isValid).toBe(true);

      // Create a block with different addresses to verify unique signatures
      const differentAddresses = createTestAddresses(TUPLE_SIZE, 1000); // Start at a different index
      const differentBlock = createTestBlock({
        addresses: differentAddresses,
      });

      // The signatures should be different since the address data is different
      expect(block.creatorSignature).not.toEqual(
        differentBlock.creatorSignature,
      );

      // Both signatures should still be valid
      expect(block.validateSignature(creator)).toBe(true);
      expect(differentBlock.validateSignature(creator)).toBe(true);

      // Verify the blocks have different addresses
      expect(block.addresses).not.toEqual(differentBlock.addresses);
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should require creator for signature validation', () => {
      const block = createTestBlock();
      // @ts-expect-error Testing that validateSignature requires a creator parameter
      expect(() => block.validateSignature()).toThrow(
        'Creator must be provided for signature validation',
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(() => createTestBlock({ dateCreated: futureDate })).toThrow(
        'Date created cannot be in the future',
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should validate tuple size', () => {
      const invalidAddresses = createTestAddresses(TUPLE_SIZE + 1);
      expect(() => createTestBlock({ addresses: invalidAddresses })).toThrow(
        'CBL address count must be a multiple of TupleSize',
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should validate address capacity', () => {
      const maxAddresses =
        ConstituentBlockListBlock.CalculateCBLAddressCapacity(defaultBlockSize);
      const tooManyAddresses = createTestAddresses(
        (maxAddresses + TUPLE_SIZE) * TUPLE_SIZE,
      );

      expect(() => createTestBlock({ addresses: tooManyAddresses })).toThrow(
        'Address count exceeds block capacity',
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('data access', () => {
    it('should provide correct block IDs', () => {
      const block = createTestBlock();
      const blockIds = block.getCblBlockIds();
      expect(blockIds.length).toBe(dataAddresses.length);
      blockIds.forEach((id, i) => {
        expect(id.equals(dataAddresses[i])).toBe(true);
      });
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should handle tuple access', async () => {
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
              true,
              true,
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
        expect(mockConsoleError).not.toHaveBeenCalled();
      } finally {
        BlockHandle.createFromPath = originalCreateFromPath;
      }
    });
  });
});

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
    const addressCopies = dataAddresses.map((addr) => {
      if (addr.length !== StaticHelpersChecksum.Sha3ChecksumBufferLength) {
        throw new Error(
          `Invalid address length: ${addr.length}, expected: ${StaticHelpersChecksum.Sha3ChecksumBufferLength}`,
        );
      }
      return Buffer.from(addr);
    });
    const addressBuffer = Buffer.concat(addressCopies);

    // Validate against block capacity before creating metadata
    const addressCount = dataAddresses.length;
    const maxAddresses = ConstituentBlockListBlock.CalculateCBLAddressCapacity(
      blockSize,
      false, // Don't account for encryption overhead since this is raw data
    );

    if (addressCount > maxAddresses) {
      throw new Error('Address count exceeds block capacity');
    }

    // Calculate total data length and padding
    const totalDataLength =
      ConstituentBlockListBlock.CblHeaderSize + // Complete header with signature
      addressBuffer.length; // Address data
    const paddingLength = (blockSize as number) - totalDataLength;
    if (paddingLength < 0) {
      throw new Error('Data exceeds block size');
    }

    const metadata = new CblBlockMetadata(
      blockSize,
      BlockType.ConstituentBlockList,
      BlockDataType.EphemeralStructuredData,
      totalDataLength, // Length without padding
      fileDataLength,
      dateCreated,
      creator,
    );

    // Create header components
    const dateCreatedBuffer = Buffer.alloc(8);
    dateCreatedBuffer.writeUInt32BE(
      Math.floor(dateCreated.getTime() / 0x100000000),
      0,
    ); // High 32 bits
    dateCreatedBuffer.writeUInt32BE(dateCreated.getTime() % 0x100000000, 4); // Low 32 bits

    const cblAddressCountBuffer = Buffer.alloc(4);
    cblAddressCountBuffer.writeUInt32BE(dataAddresses.length);

    const originalDataLengthBuffer = Buffer.alloc(8);
    originalDataLengthBuffer.writeBigInt64BE(fileDataLength);

    const tupleSizeBuffer = Buffer.alloc(1);
    tupleSizeBuffer.writeUInt8(TUPLE_SIZE);

    // Create header without signature
    const creatorId =
      creator instanceof BrightChainMember
        ? creator.id.asRawGuidBuffer
        : creator.asRawGuidBuffer;

    const headerWithoutSignature = Buffer.concat([
      creatorId,
      dateCreatedBuffer,
      cblAddressCountBuffer,
      originalDataLengthBuffer,
      tupleSizeBuffer,
    ]);

    let finalSignature: SignatureBuffer;
    if (creator instanceof BrightChainMember) {
      if (signature) {
        finalSignature = Buffer.from(signature) as SignatureBuffer;
      } else {
        // Get the data to sign (header without signature + address data + block size)
        const blockSizeBuffer = Buffer.alloc(4);
        blockSizeBuffer.writeUInt32BE(blockSize);
        const toSign = Buffer.concat([
          headerWithoutSignature,
          addressBuffer,
          blockSizeBuffer,
        ]);
        const signatureChecksum =
          StaticHelpersChecksum.calculateChecksum(toSign);
        const privateKeyBuffer = Buffer.from(creator.privateKey);
        finalSignature = StaticHelpersECIES.signMessage(
          privateKeyBuffer,
          signatureChecksum,
        );
      }

      // Verify the signature matches what validateSignature() expects
      const blockSizeBuffer = Buffer.alloc(4);
      blockSizeBuffer.writeUInt32BE(blockSize);
      const toVerify = Buffer.concat([
        headerWithoutSignature,
        addressBuffer,
        blockSizeBuffer,
      ]);
      const verifyChecksum = StaticHelpersChecksum.calculateChecksum(toVerify);
      if (
        !StaticHelpersECIES.verifyMessage(
          creator.publicKey,
          verifyChecksum,
          finalSignature,
        )
      ) {
        throw new Error('Invalid signature');
      }
    } else {
      finalSignature = signature
        ? (Buffer.from(signature) as SignatureBuffer)
        : (Buffer.alloc(StaticHelpersECIES.signatureLength) as SignatureBuffer);
    }

    // Create final data buffer with padding
    const padding = Buffer.alloc(paddingLength, 0);
    const data = Buffer.concat([
      headerWithoutSignature,
      finalSignature,
      addressBuffer,
      padding,
    ]);

    // Calculate checksum on the complete data including padding
    const blockChecksum = StaticHelpersChecksum.calculateChecksum(data);

    // Call parent constructor with complete data
    super(creator, metadata, data, blockChecksum, finalSignature);

    // Verify the block was constructed correctly
    if (creator instanceof BrightChainMember) {
      if (!this.validateSignature(creator)) {
        throw new Error('Block signature validation failed after construction');
      }
    }
  }
}
