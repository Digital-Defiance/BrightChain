import { createECDH, randomBytes } from 'crypto';
import { Readable } from 'stream';
import { BrightChainMember } from '../brightChainMember';
import { CHECKSUM, ECIES, TUPLE } from '../constants';
import { EmailString } from '../emailString';
import { BlockAccessErrorType } from '../enumerations/blockAccessErrorType';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import MemberType from '../enumerations/memberType';
import { BlockAccessError, BlockValidationError } from '../errors/block';
import { GuidV4 } from '../guid';
import { ChecksumService } from '../services/checksum.service';
import { ECIESService } from '../services/ecies.service';
import { ServiceProvider } from '../services/service.provider';
import { VotingService } from '../services/voting.service';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';
import { BlockHandle } from './handle';

// Helper to ensure tuple size is valid
const ensureTupleSize = (count: number): number => {
  if (count < TUPLE.MIN_SIZE || count > TUPLE.MAX_SIZE) {
    throw new BlockValidationError(BlockValidationErrorType.InvalidTupleSize);
  }
  return count;
};

const cblService = ServiceProvider.getCBLService();

// Test class that properly implements abstract methods
class TestCblBlock extends ConstituentBlockListBlock {
  constructor(
    blockSize: BlockSize,
    creator: BrightChainMember | GuidV4,
    fileDataLength: number,
    dataAddresses: Array<ChecksumBuffer>,
    dateCreated?: Date,
    signature?: SignatureBuffer,
  ) {
    dateCreated = dateCreated ?? new Date();

    // Validate tuple size before creating block
    if (dataAddresses.length % TUPLE.SIZE !== 0) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidCBLAddressCount,
      );
    }

    // Create copies of the address buffers to prevent sharing references
    const addressCopies = dataAddresses.map((addr, index) => {
      if (
        addr.length !==
        ServiceProvider.getChecksumService().checksumBufferLength
      ) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidAddressLength,
          undefined,
          {
            index,
            length: addr.length,
            expectedLength:
              ServiceProvider.getChecksumService().checksumBufferLength,
          },
        );
      }
      return addr;
    });
    const addressBuffer = Buffer.concat(addressCopies);

    // Validate against block capacity before creating metadata
    const addressCount = dataAddresses.length;
    const maxAddresses = cblService.calculateCBLAddressCapacity(
      blockSize,
      false, // Don't account for encryption overhead since this is raw data
    );

    if (addressCount > maxAddresses) {
      throw new BlockValidationError(
        BlockValidationErrorType.AddressCountExceedsCapacity,
      );
    }

    // Create header components
    const dateCreatedBuffer = Buffer.alloc(8);
    dateCreatedBuffer.writeUInt32BE(
      Math.floor(dateCreated.getTime() / 0x100000000),
      0,
    ); // High 32 bits
    dateCreatedBuffer.writeUInt32BE(dateCreated.getTime() % 0x100000000, 4); // Low 32 bits

    const cblAddressCountBuffer = Buffer.alloc(4);
    cblAddressCountBuffer.writeUInt32BE(dataAddresses.length, 0);

    const originalDataLengthBuffer = Buffer.alloc(4);
    originalDataLengthBuffer.writeUint32BE(fileDataLength, 0);

    const tupleSizeBuffer = Buffer.alloc(1);
    tupleSizeBuffer.writeUInt8(TUPLE.SIZE, 0);

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
    if (
      creator instanceof BrightChainMember &&
      creator.privateKey !== undefined
    ) {
      if (signature) {
        finalSignature = Buffer.from(signature) as SignatureBuffer;
      } else {
        // Get the data to sign (header without signature + address data + block size)
        const blockSizeBuffer = Buffer.alloc(4);
        blockSizeBuffer.writeUInt32BE(blockSize, 0);
        const toSign = Buffer.concat([
          headerWithoutSignature,
          addressBuffer,
          blockSizeBuffer,
        ]);
        const signatureChecksum =
          ServiceProvider.getChecksumService().calculateChecksum(toSign);
        finalSignature = TestCblBlock.eciesService.signMessage(
          creator.privateKey,
          signatureChecksum,
        );
      }

      // Verify the signature matches what validateSignature() expects
      const blockSizeBuffer = Buffer.alloc(4);
      blockSizeBuffer.writeUInt32BE(blockSize, 0);
      const toVerify = Buffer.concat([
        headerWithoutSignature,
        addressBuffer,
        blockSizeBuffer,
      ]);
      const verifyChecksum =
        ServiceProvider.getChecksumService().calculateChecksum(toVerify);
      if (
        !TestCblBlock.eciesService.verifyMessage(
          creator.publicKey,
          verifyChecksum,
          finalSignature,
        )
      ) {
        throw new BlockValidationError(
          BlockValidationErrorType.InvalidSignature,
        );
      }
    } else {
      finalSignature = signature
        ? (Buffer.from(signature) as SignatureBuffer)
        : (Buffer.alloc(ECIES.SIGNATURE_LENGTH) as SignatureBuffer);
    }

    // Create final data buffer with padding
    const blockSizeNumber = blockSize as number;
    const data = Buffer.alloc(blockSizeNumber, 0); // Create buffer of exact block size, initialized with zeros
    let offset = 0;

    // Copy header without signature
    headerWithoutSignature.copy(data, offset);
    offset += headerWithoutSignature.length;

    // Copy signature
    finalSignature.copy(data, offset);
    offset += finalSignature.length;

    // Copy address data
    addressBuffer.copy(data, offset);
    offset += addressBuffer.length;

    // Fill remaining space with random padding
    const paddingLength = blockSizeNumber - offset;
    if (paddingLength > 0) {
      const padding = randomBytes(paddingLength);
      padding.copy(data, offset);
    }

    // Call parent constructor with complete data
    super(data, creator);

    // Verify the block was constructed correctly
    if (!this.validateSignature()) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidSignature);
    }
  }
}

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
  const defaultBlockSize = BlockSize.Small; // 4KB block size
  const defaultDataLength = 1024;
  const eciesService = new ECIESService();
  let checksumService: ChecksumService;

  // Helper functions
  const createTestAddresses = (
    count: number = ensureTupleSize(TUPLE.SIZE),
    startIndex = 0,
  ): Array<ChecksumBuffer> => {
    const addresses = Array(count)
      .fill(null)
      .map((_, index) => {
        const data = Buffer.alloc(CHECKSUM.SHA3_BUFFER_LENGTH);
        data.writeUInt32BE(startIndex + index, 0);
        // Add some random data to ensure uniqueness
        data.writeUInt32BE(Math.floor(Math.random() * 0xffffffff), 4);
        return checksumService.calculateChecksum(data) as ChecksumBuffer;
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
      fileDataLength: number;
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

  // Helper to create invalid test data
  const createInvalidTestData = (
    block: TestCblBlock,
    modifyFn: (data: Buffer) => void,
  ): Buffer => {
    // Create a new buffer of the exact block size
    const blockSizeNumber = block.blockSize as number;
    const invalidData = Buffer.alloc(blockSizeNumber);
    // Copy the original data
    block.data.copy(invalidData);
    // Apply modifications
    modifyFn(invalidData);
    return invalidData;
  };

  beforeAll(() => {
    const mnemonic = eciesService.generateNewMnemonic();
    const { wallet } = eciesService.walletAndSeedFromMnemonic(mnemonic);
    const privateKey = new SerializableBuffer(wallet.getPrivateKey());
    const publicKey = SerializableBuffer.concat([
      Buffer.from([ECIES.PUBLIC_KEY_MAGIC]),
      wallet.getPublicKey(),
    ]);

    // Create ECDH instance for key derivation
    const ecdh = createECDH(ECIES.CURVE_NAME);
    ecdh.setPrivateKey(privateKey.underlying);

    // Derive voting keys
    const votingKeypair = VotingService.generateVotingKeyPair();

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
    checksumService = ServiceProvider.getChecksumService();
    dataAddresses = createTestAddresses(ensureTupleSize(TUPLE.SIZE));
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('basic functionality', () => {
    it('should construct and validate correctly', async () => {
      const block = createTestBlock();

      expect(block.blockSize).toBe(defaultBlockSize);
      expect(block.blockType).toBe(BlockType.ConstituentBlockList);
      expect(block.creator).toBe(creator);
      expect(block.addresses).toEqual(dataAddresses);
      expect(block.canRead).toBe(true);
      expect(block.data.length).toBe(defaultBlockSize);

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
      const differentAddresses = createTestAddresses(
        ensureTupleSize(TUPLE.SIZE),
        1000,
      ); // Start at a different index
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
      expect(() => block.validateSignature()).toThrowType(
        BlockAccessError,
        (error: BlockAccessError) => {
          expect(error.type).toBe(BlockAccessErrorType.CreatorMustBeProvided);
        },
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      expect(() => createTestBlock({ dateCreated: futureDate })).toThrowType(
        BlockValidationError,
        (error: BlockValidationError) => {
          expect(error.type).toBe(BlockValidationErrorType.FutureCreationDate);
        },
      );
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should validate tuple size', () => {
      const invalidAddresses = createTestAddresses(
        ensureTupleSize(TUPLE.SIZE + 1),
      );
      expect(() =>
        createTestBlock({ addresses: invalidAddresses }),
      ).toThrowType(BlockValidationError, (error: BlockValidationError) => {
        expect(error.type).toBe(
          BlockValidationErrorType.InvalidCBLAddressCount,
        );
      });
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should validate address capacity', () => {
      // Calculate a number of addresses that exceeds capacity but stays within tuple size limits
      const maxAddresses =
        ConstituentBlockListBlock.CalculateCBLAddressCapacity(defaultBlockSize);
      const tupleSize = TUPLE.SIZE;
      // Create just enough addresses to exceed capacity while being a multiple of tupleSize
      const addressCount =
        Math.ceil((maxAddresses + 1) / tupleSize) * tupleSize;
      const tooManyAddresses = createTestAddresses(addressCount);

      expect(() =>
        createTestBlock({ addresses: tooManyAddresses }),
      ).toThrowType(BlockValidationError, (error: BlockValidationError) => {
        expect(error.type).toBe(
          BlockValidationErrorType.AddressCountExceedsCapacity,
        );
      });
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
        .mockImplementation(async (path, blockSize, id) => {
          // Create a mock handle that doesn't rely on file system
          const mockHandle = {
            path,
            blockSize,
            id,
            canRead: true,
            canPersist: true,
            data: Buffer.alloc(blockSize),
            metadata: {
              blockSize,
              blockType: BlockType.Handle,
              blockDataType: BlockDataType.RawData,
              lengthWithoutPadding: blockSize,
              dateCreated: new Date(),
            },
            equals: (other: { id: ChecksumBuffer }) => id.equals(other.id),
            toString: () => path,
          };

          // Cast to BlockHandle since we've implemented all required properties
          const handle = mockHandle as unknown as BlockHandle;
          return handle;
        });

      try {
        const block = createTestBlock();
        const tuples = await block.getHandleTuples((id) => id.toString('hex'));

        expect(tuples.length).toBe(dataAddresses.length / TUPLE.SIZE);
        tuples.forEach((tuple) => {
          expect(tuple.handles.length).toBe(TUPLE.SIZE);
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

  describe('parseHeader', () => {
    it('should parse valid header data', () => {
      const block = createTestBlock();
      const header = ConstituentBlockListBlock.parseHeader(block.data, creator);

      expect(header.creatorId.equals(creator.id)).toBe(true);
      expect(header.cblAddressCount).toBe(dataAddresses.length);
      expect(header.originalDataLength).toBe(defaultDataLength);
      expect(header.tupleSize).toBe(TUPLE.SIZE);
      expect(header.creatorSignature).toEqual(block.creatorSignature);
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should validate creator ID match', () => {
      const block = createTestBlock();
      const differentCreator = BrightChainMember.newMember(
        MemberType.User,
        'Different User',
        new EmailString('different@example.com'),
      );

      try {
        ConstituentBlockListBlock.parseHeader(
          block.data,
          differentCreator.member,
        ),
          fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(BlockValidationError);
        expect((error as BlockValidationError).type).toBe(
          BlockValidationErrorType.CreatorIDMismatch,
        );
      }
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should validate date fields', () => {
      const block = createTestBlock();
      const invalidData = createInvalidTestData(block, (data) => {
        // Corrupt the date bytes
        data.writeUInt32BE(
          0xffffffff,
          ConstituentBlockListBlock.HeaderOffsets.DateCreated,
        );
        data.writeUInt32BE(
          0xffffffff,
          ConstituentBlockListBlock.HeaderOffsets.DateCreated + 4,
        );
      });

      expect(() =>
        ConstituentBlockListBlock.parseHeader(invalidData, creator),
      ).toThrowType(BlockValidationError, (error: BlockValidationError) => {
        expect(error.type).toBe(BlockValidationErrorType.InvalidDateCreated);
      });
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should validate address count', () => {
      const block = createTestBlock();
      const invalidData = createInvalidTestData(block, (data) => {
        // Set an impossibly large address count
        data.writeUInt32BE(
          0xffffffff,
          ConstituentBlockListBlock.HeaderOffsets.CblAddressCount,
        );
      });

      expect(() =>
        ConstituentBlockListBlock.parseHeader(invalidData, creator),
      ).toThrowType(BlockValidationError, (error: BlockValidationError) => {
        expect(error.type).toBe(
          BlockValidationErrorType.InvalidCBLAddressCount,
        );
      });
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should validate original data length', () => {
      const block = createTestBlock();
      const invalidData = createInvalidTestData(block, (data) => {
        // Set a negative data length
        data.writeBigInt64BE(
          BigInt(-1),
          ConstituentBlockListBlock.HeaderOffsets.OriginalDataLength,
        );
      });

      expect(() =>
        ConstituentBlockListBlock.parseHeader(invalidData, creator),
      ).toThrowType(BlockValidationError, (error: BlockValidationError) => {
        expect(error.type).toBe(
          BlockValidationErrorType.OriginalDataLengthNegative,
        );
      });
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should validate tuple size', () => {
      const block = createTestBlock();
      const invalidData = createInvalidTestData(block, (data) => {
        // Set an invalid tuple size
        data.writeUInt8(
          0xff,
          ConstituentBlockListBlock.HeaderOffsets.TupleSize,
        );
      });

      expect(() =>
        ConstituentBlockListBlock.parseHeader(invalidData, creator),
      ).toThrowType(BlockValidationError, (error: BlockValidationError) => {
        expect(error.type).toBe(BlockValidationErrorType.InvalidTupleSize);
      });
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });

  describe('fromBaseBlockBuffer', () => {
    it('should convert BaseBlock to CBL block', () => {
      const originalBlock = createTestBlock();
      const cblBlock = ConstituentBlockListBlock.fromBaseBlockBuffer(
        originalBlock,
        creator,
      );

      expect(cblBlock.blockSize).toBe(originalBlock.blockSize);
      expect(cblBlock.blockType).toBe(originalBlock.blockType);
      expect(cblBlock.creator).toBe(creator);
      expect(cblBlock.addresses).toEqual(originalBlock.addresses);
      expect(cblBlock.creatorSignature).toEqual(originalBlock.creatorSignature);
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should validate data is Buffer', () => {
      const invalidBlock = createTestBlock();
      Object.defineProperty(invalidBlock, 'data', {
        get: () => new Readable(),
      });

      expect(() =>
        ConstituentBlockListBlock.fromBaseBlockBuffer(invalidBlock, creator),
      ).toThrowType(BlockValidationError, (error: BlockValidationError) => {
        expect(error.type).toBe(BlockValidationErrorType.BlockDataNotBuffer);
      });
      expect(mockConsoleError).not.toHaveBeenCalled();
    });

    it('should preserve metadata and addresses', () => {
      const originalBlock = createTestBlock();
      const cblBlock = ConstituentBlockListBlock.fromBaseBlockBuffer(
        originalBlock,
        creator,
      );

      expect(cblBlock.blockSize).toBe(originalBlock.blockSize);
      expect(cblBlock.blockType).toBe(originalBlock.blockType);
      expect(cblBlock.blockDataType).toBe(originalBlock.blockDataType);
      expect(cblBlock.metadata.lengthWithoutPadding).toBe(
        originalBlock.metadata.lengthWithoutPadding,
      );
      expect(cblBlock.addresses).toEqual(originalBlock.addresses);
      expect(mockConsoleError).not.toHaveBeenCalled();
    });
  });
});
