import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { TUPLE_SIZE } from '../constants';
import { EmailString } from '../emailString';
import { EncryptedBlockMetadata } from '../encryptedBlockMetadata';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { BlockValidationErrorType } from '../enumerations/blockValidationErrorType';
import MemberType from '../enumerations/memberType';
import { BlockValidationError } from '../errors/block';
import { ChecksumMismatchError } from '../errors/checksumMismatch';
import { GuidV4 } from '../guid';
import { IMemberWithMnemonic } from '../interfaces/memberWithMnemonic';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';
import { EncryptedConstituentBlockListBlock } from './encryptedCbl';

// Test class for CBL that properly implements abstract methods
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
    const metadata = new CblBlockMetadata(
      blockSize,
      BlockType.ConstituentBlockList,
      BlockDataType.EphemeralStructuredData,
      dataAddresses.length * StaticHelpersChecksum.Sha3ChecksumBufferLength,
      fileDataLength,
      dateCreated,
      creator,
    );
    const blockHeader = ConstituentBlockListBlock.makeCblHeader(
      creator,
      dateCreated,
      dataAddresses.length,
      fileDataLength,
      Buffer.concat(dataAddresses),
      blockSize,
      signature,
    );
    const data = Buffer.concat([
      blockHeader.headerData,
      Buffer.concat(dataAddresses),
    ]);
    const checksum = StaticHelpersChecksum.calculateChecksum(data);
    super(creator, metadata, data, checksum, blockHeader.signature);
  }
}

// Test class for encrypted CBL that properly implements abstract methods
class TestEncryptedCblBlock extends EncryptedConstituentBlockListBlock {
  public static override async from(
    type: BlockType,
    dataType: BlockDataType,
    blockSize: BlockSize,
    data: Buffer,
    checksum: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
    canPersist = true,
  ): Promise<TestEncryptedCblBlock> {
    // Validate date first, before any other validation
    const now = new Date();
    const finalDate = dateCreated ?? now;
    if (isNaN(finalDate.getTime())) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidDateCreated,
      );
    }
    if (finalDate > now) {
      throw new BlockValidationError(
        BlockValidationErrorType.FutureCreationDate,
      );
    }

    // Calculate the actual data length and metadata
    const payloadLength =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;

    // Validate data length
    if (data.length < 1) {
      throw new BlockValidationError(
        BlockValidationErrorType.DataLengthTooShort,
      );
    }

    // For already encrypted data (starts with 0x04), validate total size
    if (data[0] === 0x04) {
      if (data.length > (blockSize as number)) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataLengthExceedsCapacity,
        );
      }
    } else {
      // For unencrypted data, validate it will fit after encryption
      if (data.length > payloadLength) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataLengthExceedsCapacity,
        );
      }
    }

    // For encrypted blocks with known actual data length:
    // 1. The actual data length must not exceed available capacity
    // 2. The total encrypted length must not exceed block size
    if (actualDataLength !== undefined) {
      if (actualDataLength > payloadLength) {
        throw new BlockValidationError(
          BlockValidationErrorType.DataLengthExceedsCapacity,
        );
      }
    }

    // Calculate checksum on the original data
    const computedChecksum = StaticHelpersChecksum.calculateChecksum(data);
    if (checksum && !computedChecksum.equals(checksum)) {
      throw new ChecksumMismatchError(checksum, computedChecksum);
    }
    const finalChecksum = checksum ?? computedChecksum;

    // Create metadata with correct length
    const metadata = new EncryptedBlockMetadata(
      blockSize,
      type,
      dataType,
      actualDataLength ?? data.length,
      creator,
      finalDate,
    );

    // Create final data buffer filled with random data
    const finalData = randomBytes(blockSize as number);

    // If data is already encrypted (starts with 0x04), use it directly
    if (data[0] === 0x04) {
      data.copy(finalData);
    } else {
      // Set ECIES header components
      finalData[0] = 0x04; // Set ECIES public key prefix
      // Rest of the public key is already random from randomBytes
      let offset = StaticHelpersECIES.publicKeyLength;
      // IV and authTag are already random from randomBytes
      offset += StaticHelpersECIES.ivLength;
      offset += StaticHelpersECIES.authTagLength;
      // Copy actual data to payload area
      data.copy(finalData, offset);
    }

    // Validate encryption header components
    const ephemeralKey = finalData.subarray(
      0,
      StaticHelpersECIES.publicKeyLength,
    );
    const iv = finalData.subarray(
      StaticHelpersECIES.publicKeyLength,
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
    );
    const authTag = finalData.subarray(
      StaticHelpersECIES.publicKeyLength + StaticHelpersECIES.ivLength,
      StaticHelpersECIES.publicKeyLength +
        StaticHelpersECIES.ivLength +
        StaticHelpersECIES.authTagLength,
    );

    // Verify all components have correct lengths and format
    if (
      ephemeralKey[0] !== 0x04 ||
      ephemeralKey.length !== StaticHelpersECIES.publicKeyLength
    ) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidEphemeralPublicKeyLength,
      );
    }
    if (iv.length !== StaticHelpersECIES.ivLength) {
      throw new BlockValidationError(BlockValidationErrorType.InvalidIVLength);
    }
    if (authTag.length !== StaticHelpersECIES.authTagLength) {
      throw new BlockValidationError(
        BlockValidationErrorType.InvalidAuthTagLength,
      );
    }

    return new TestEncryptedCblBlock(
      type,
      BlockDataType.EncryptedData,
      finalData,
      finalChecksum,
      metadata,
      canRead,
      canPersist,
    );
  }
}

describe('EncryptedConstituentBlockListBlock', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  let creator: GuidV4;
  let encryptor: IMemberWithMnemonic;
  let blockSize: BlockSize;
  let cblBlock: ConstituentBlockListBlock;
  let testDate: Date;

  // Helper functions
  const createTestAddresses = (
    count: number = TUPLE_SIZE,
  ): ChecksumBuffer[] => {
    return Array.from({ length: count }, (_, i) => {
      const testData = Buffer.alloc(32, i + 1);
      return StaticHelpersChecksum.calculateChecksum(
        testData,
      ) as ChecksumBuffer;
    });
  };

  const createSignature = (
    addresses: ChecksumBuffer[],
    dataLength: bigint,
  ): SignatureBuffer => {
    const dateBuffer = Buffer.alloc(8);
    const dateMs = testDate.getTime();
    dateBuffer.writeUInt32BE(Math.floor(dateMs / 0x100000000), 0);
    dateBuffer.writeUInt32BE(dateMs % 0x100000000, 4);

    const addressCountBuffer = Buffer.alloc(4);
    addressCountBuffer.writeUInt32BE(addresses.length);

    const dataLengthBuffer = Buffer.alloc(8);
    dataLengthBuffer.writeBigInt64BE(dataLength);

    const tupleSizeBuffer = Buffer.alloc(1);
    tupleSizeBuffer.writeUInt8(TUPLE_SIZE);

    const headerWithoutSignature = Buffer.concat([
      creator.asRawGuidBuffer,
      dateBuffer,
      addressCountBuffer,
      dataLengthBuffer,
      tupleSizeBuffer,
    ]);

    const toSign = Buffer.concat([
      headerWithoutSignature,
      Buffer.concat(addresses),
    ]);
    const checksum = StaticHelpersChecksum.calculateChecksum(toSign);
    return StaticHelpersECIES.signMessage(
      encryptor.member.privateKey,
      checksum,
    );
  };

  const createTestBlock = async (
    data: Buffer,
    options: Partial<{
      type: BlockType;
      blockSize: BlockSize;
      checksum: ChecksumBuffer;
      creator: BrightChainMember | GuidV4;
      actualDataLength: number;
      dateCreated: Date;
      canRead: boolean;
      canPersist: boolean;
    }> = {},
  ) => {
    return TestEncryptedCblBlock.from(
      options.type ?? BlockType.EncryptedConstituentBlockListBlock,
      BlockDataType.EncryptedData,
      options.blockSize ?? blockSize,
      data,
      options.checksum ?? StaticHelpersChecksum.calculateChecksum(data),
      options.creator ?? creator,
      options.dateCreated ?? testDate,
      options.actualDataLength,
      options.canRead ?? true,
      options.canPersist ?? true,
    );
  };

  beforeAll(() => {
    encryptor = BrightChainMember.newMember(
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    );
  });

  beforeEach(() => {
    testDate = new Date(Date.now() - 1000);
    creator = GuidV4.new();
    blockSize = BlockSize.Small;

    const addresses = createTestAddresses();
    const dataLength = BigInt(
      addresses.length * StaticHelpersChecksum.Sha3ChecksumBufferLength,
    );
    const signature = createSignature(addresses, dataLength);

    cblBlock = new TestCblBlock(
      blockSize,
      creator,
      dataLength,
      addresses,
      testDate,
      signature,
    );
  });

  describe('basic functionality', () => {
    it('should construct and handle metadata correctly', async () => {
      const originalData = cblBlock.data;
      const encryptedData = StaticHelpersECIES.encrypt(
        encryptor.member.publicKey,
        originalData,
      );
      const encryptedBlock = await createTestBlock(encryptedData, {
        actualDataLength: originalData.length,
      });

      // Basic properties
      expect(encryptedBlock.blockSize).toBe(blockSize);
      expect(encryptedBlock.blockType).toBe(
        BlockType.EncryptedConstituentBlockListBlock,
      );
      expect(encryptedBlock.encrypted).toBe(true);
      expect(encryptedBlock.canRead).toBe(true);
      // actualDataLength should be the length of the original CBL data before encryption
      expect(encryptedBlock.actualDataLength).toBe(originalData.length);

      // Encryption metadata
      expect(encryptedBlock.ephemeralPublicKey.length).toBe(
        StaticHelpersECIES.publicKeyLength,
      );
      expect(encryptedBlock.iv.length).toBe(StaticHelpersECIES.ivLength);
      expect(encryptedBlock.authTag.length).toBe(
        StaticHelpersECIES.authTagLength,
      );
      // Total overhead should include both encryption overhead and CBL header
      expect(encryptedBlock.totalOverhead).toBe(
        StaticHelpersECIES.eciesOverheadLength +
          ConstituentBlockListBlock.CblHeaderSize,
      );
    });

    it('should handle creators correctly', async () => {
      const encryptedData = StaticHelpersECIES.encrypt(
        encryptor.member.publicKey,
        cblBlock.data,
      );

      // Test with GuidV4 creator
      const guidBlock = await createTestBlock(encryptedData, {
        creator,
      });
      expect(guidBlock.creator).toBeUndefined();
      expect(guidBlock.creatorId).toBe(creator);

      // Test with BrightChainMember creator
      const memberBlock = await createTestBlock(encryptedData, {
        creator: encryptor.member,
      });
      expect(memberBlock.creator).toBe(encryptor.member);
      expect(memberBlock.creatorId).toBe(encryptor.member.id);
    });

    it('should handle payload correctly', async () => {
      const originalData = cblBlock.data;
      const encryptedData = StaticHelpersECIES.encrypt(
        encryptor.member.publicKey,
        originalData,
      );
      const encryptedBlock = await createTestBlock(encryptedData, {
        actualDataLength: originalData.length,
      });
      // Payload should be everything after the header up to block size
      expect(encryptedBlock.payload.length).toBe(
        (blockSize as number) - StaticHelpersECIES.eciesOverheadLength,
      );
      expect(encryptedBlock.payloadLength).toBe(
        originalData.length + StaticHelpersECIES.eciesOverheadLength,
      );
      expect(encryptedBlock.metadata.lengthWithoutPadding).toBe(
        originalData.length,
      );
    });
  });

  describe('validation', () => {
    it('should validate checksum', async () => {
      const encryptedData = StaticHelpersECIES.encrypt(
        encryptor.member.publicKey,
        cblBlock.data,
      );
      const checksum = StaticHelpersChecksum.calculateChecksum(encryptedData);
      const block = await createTestBlock(encryptedData, { checksum });
      expect(block.idChecksum).toEqual(checksum);
    });

    it('should handle invalid inputs', async () => {
      const encryptedData = StaticHelpersECIES.encrypt(
        encryptor.member.publicKey,
        cblBlock.data,
      );

      // Test future date
      const futureDate = new Date(Date.now() + 86400000);
      await expect(
        createTestBlock(encryptedData, { dateCreated: futureDate }),
      ).rejects.toThrow(BlockValidationError);

      // Test oversized data
      const tooLargeData = Buffer.alloc((blockSize as number) + 1);
      await expect(createTestBlock(tooLargeData)).rejects.toThrow(
        BlockValidationError,
      );

      // Test invalid actual data length
      await expect(
        createTestBlock(encryptedData, {
          actualDataLength: (blockSize as number) + 1,
        }),
      ).rejects.toThrow(BlockValidationError);
    });
  });
});
