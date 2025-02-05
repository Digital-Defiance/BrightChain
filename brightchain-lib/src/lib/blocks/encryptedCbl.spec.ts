import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { TUPLE_SIZE } from '../constants';
import { EmailString } from '../emailString';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import MemberType from '../enumerations/memberType';
import { BlockValidationError } from '../errors/block';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';
import { EncryptedBlockFactory } from './encryptedBlockFactory';
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
  public static override from(
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
    return EncryptedBlockFactory.createBlock(
      type,
      dataType,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      actualDataLength,
      canRead,
      canPersist,
    ) as Promise<TestEncryptedCblBlock>;
  }
}

describe('EncryptedConstituentBlockListBlock', () => {
  // Set a longer timeout for all tests in this file
  jest.setTimeout(30000);

  // Shared test data
  let creator: GuidV4;
  let encryptor: BrightChainMember;
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
    return StaticHelpersECIES.signMessage(encryptor.privateKey, checksum);
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
        encryptor.publicKey,
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
        encryptor.publicKey,
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
        creator: encryptor,
      });
      expect(memberBlock.creator).toBe(encryptor);
      expect(memberBlock.creatorId).toBe(encryptor.id);
    });

    it('should handle payload correctly', async () => {
      const originalData = cblBlock.data;
      const encryptedData = StaticHelpersECIES.encrypt(
        encryptor.publicKey,
        originalData,
      );
      const encryptedBlock = await createTestBlock(encryptedData, {
        actualDataLength: originalData.length,
      });
      expect(encryptedBlock.payload.length).toBe(originalData.length);
    });
  });

  describe('validation', () => {
    it('should validate checksum', async () => {
      const encryptedData = StaticHelpersECIES.encrypt(
        encryptor.publicKey,
        cblBlock.data,
      );
      const checksum = StaticHelpersChecksum.calculateChecksum(encryptedData);
      const block = await createTestBlock(encryptedData, { checksum });
      expect(block.idChecksum).toEqual(checksum);
    });

    it('should handle invalid inputs', async () => {
      const encryptedData = StaticHelpersECIES.encrypt(
        encryptor.publicKey,
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
