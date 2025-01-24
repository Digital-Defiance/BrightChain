import { BrightChainMember } from '../brightChainMember';
import { TUPLE_SIZE } from '../constants';
import { EmailString } from '../emailString';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import MemberType from '../enumerations/memberType';
import { GuidV4 } from '../guid';
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

// Test class for encrypted CBL that properly implements abstract methods
class TestEncryptedCblBlock extends EncryptedConstituentBlockListBlock {
  private readonly _internalData: Buffer;
  private readonly _internalCreator?: BrightChainMember | GuidV4;
  private readonly _internalActualDataLength?: number;

  constructor(
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember | GuidV4,
    actualDataLength?: number,
    dateCreated?: Date,
  ) {
    super(blockSize, data, checksum, creator, actualDataLength, dateCreated);
    this._internalData = data;
    this._internalCreator = creator;
    this._internalActualDataLength = actualDataLength;
  }

  public override get data(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    return this._internalData;
  }

  public override get creator(): BrightChainMember | undefined {
    return this._internalCreator instanceof BrightChainMember
      ? this._internalCreator
      : undefined;
  }

  public override get actualDataLength(): number {
    return this._internalActualDataLength ?? this._internalData.length;
  }

  public override get payload(): Buffer {
    if (!this.canRead) {
      throw new Error('Block cannot be read');
    }
    const start = StaticHelpersECIES.eciesOverheadLength;
    const end =
      start +
      (this._internalActualDataLength ?? this._internalData.length - start);
    return this._internalData.subarray(start, end);
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
    it('should construct and handle metadata correctly', () => {
      const encryptedBlock = EncryptedConstituentBlockListBlock.fromCbl(
        cblBlock,
        encryptor,
      );

      // Basic properties
      expect(encryptedBlock.blockSize).toBe(blockSize);
      expect(encryptedBlock.blockType).toBe(
        BlockType.EncryptedConstituentBlockListBlock,
      );
      expect(encryptedBlock.encrypted).toBe(true);
      expect(encryptedBlock.canRead).toBe(true);
      // actualDataLength should be the length of the original CBL data before encryption
      expect(encryptedBlock.actualDataLength).toBe(cblBlock.data.length);

      // Encryption metadata
      expect(encryptedBlock.ephemeralPublicKey.length).toBe(
        StaticHelpersECIES.publicKeyLength,
      );
      expect(encryptedBlock.iv.length).toBe(StaticHelpersECIES.ivLength);
      expect(encryptedBlock.authTag.length).toBe(
        StaticHelpersECIES.authTagLength,
      );
      expect(encryptedBlock.totalOverhead).toBe(
        StaticHelpersECIES.eciesOverheadLength,
      );
    });

    it('should handle creators correctly', () => {
      // Test with GuidV4 creator
      const guidBlock = new TestEncryptedCblBlock(
        blockSize,
        StaticHelpersECIES.encrypt(encryptor.publicKey, cblBlock.data),
        undefined,
        creator,
        cblBlock.actualDataLength,
        testDate,
      );
      expect(guidBlock.creator).toBeUndefined();
      expect(guidBlock.creatorId).toBe(creator);

      // Test with BrightChainMember creator
      const memberBlock = EncryptedConstituentBlockListBlock.fromCbl(
        cblBlock,
        encryptor,
      );
      expect(memberBlock.creator).toBe(encryptor);
      expect(memberBlock.creatorId).toBe(encryptor.id);
    });

    it('should handle payload correctly', () => {
      const encryptedBlock = EncryptedConstituentBlockListBlock.fromCbl(
        cblBlock,
        encryptor,
      );
      expect(encryptedBlock.payload.length).toBe(
        encryptedBlock.data.length - StaticHelpersECIES.eciesOverheadLength,
      );
    });
  });

  describe('validation', () => {
    it('should validate checksum', () => {
      const encryptedData = StaticHelpersECIES.encrypt(
        encryptor.publicKey,
        cblBlock.data,
      );
      const checksum = StaticHelpersChecksum.calculateChecksum(encryptedData);
      const block = new TestEncryptedCblBlock(
        blockSize,
        encryptedData,
        checksum,
        creator,
        cblBlock.actualDataLength,
        testDate,
      );
      expect(block.idChecksum).toEqual(checksum);
    });

    it('should handle invalid inputs', () => {
      const encryptedData = StaticHelpersECIES.encrypt(
        encryptor.publicKey,
        cblBlock.data,
      );

      // Test future date
      const futureDate = new Date(Date.now() + 86400000);
      expect(
        () =>
          new TestEncryptedCblBlock(
            blockSize,
            encryptedData,
            undefined,
            creator,
            cblBlock.data.length,
            futureDate,
          ),
      ).toThrow('Date created cannot be in the future');

      // Test oversized data
      const tooLargeData = Buffer.alloc((blockSize as number) + 1);
      expect(
        () =>
          new TestEncryptedCblBlock(
            blockSize,
            tooLargeData,
            undefined,
            creator,
            tooLargeData.length,
            testDate,
          ),
      ).toThrow('Data length exceeds block capacity');

      // Test invalid actual data length
      expect(
        () =>
          new TestEncryptedCblBlock(
            blockSize,
            encryptedData,
            undefined,
            creator,
            (blockSize as number) + 1,
            testDate,
          ),
      ).toThrow('Data length exceeds block capacity');
    });
  });
});
