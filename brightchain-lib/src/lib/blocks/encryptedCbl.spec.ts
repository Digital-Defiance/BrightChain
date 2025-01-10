import { BrightChainMember } from '../brightChainMember';
import { TUPLE_SIZE } from '../constants';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
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
    // Validate date before any other validation
    const now = new Date();
    dateCreated = dateCreated ?? now;
    if (dateCreated > now) {
      throw new Error('Date created cannot be in the future');
    }

    // Store internal state before validation
    const internalData = data;
    const internalCreator = creator;
    const internalActualDataLength = actualDataLength;

    // Calculate checksum from the data
    const calculatedChecksum =
      StaticHelpersChecksum.calculateChecksum(internalData);

    // Use provided checksum or calculated one
    const finalChecksum = checksum ?? calculatedChecksum;

    // Initialize base class
    super(
      blockSize,
      internalData,
      finalChecksum,
      internalCreator,
      internalActualDataLength,
      dateCreated,
    );

    // Store internal state after initialization
    this._internalData = internalData;
    this._internalCreator = internalCreator;
    this._internalActualDataLength = internalActualDataLength;
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
    // Skip the encryption header and return the actual data
    const start = StaticHelpersECIES.eciesOverheadLength;
    const end =
      start +
      (this._internalActualDataLength ?? this._internalData.length - start);
    return this._internalData.subarray(start, end);
  }
}

describe('EncryptedConstituentBlockListBlock', () => {
  let creator: GuidV4;
  let encryptor: BrightChainMember;
  let blockSize: BlockSize;
  let cblBlock: ConstituentBlockListBlock;
  let testDate: Date;

  beforeEach(() => {
    // Create a fixed date for consistent testing
    testDate = new Date(Date.now() - 1000); // 1 second ago, using timestamp to avoid any timezone issues

    // Create a GuidV4 creator since it doesn't require signature validation
    creator = GuidV4.new();

    // Create an anonymous member for encryption
    encryptor = BrightChainMember.anonymous();

    blockSize = BlockSize.Small;

    // Create test addresses - just one tuple to keep data size small
    const addresses: ChecksumBuffer[] = [];
    for (let i = 0; i < TUPLE_SIZE; i++) {
      // Use fixed test data for consistent signatures
      const testData = Buffer.alloc(32, i + 1);
      addresses.push(
        StaticHelpersChecksum.calculateChecksum(testData) as ChecksumBuffer,
      );
    }

    // Calculate capacity to ensure we don't exceed it
    const capacity = ConstituentBlockListBlock.CalculateCBLAddressCapacity(
      blockSize,
      true, // allow encryption
    );

    if (addresses.length > capacity) {
      throw new Error('Test data exceeds block capacity');
    }

    // Create a CBL block with valid data length
    const dataLength =
      addresses.length * StaticHelpersChecksum.Sha3ChecksumBufferLength;

    // Generate signature for GuidV4 creator using encryptor's private key
    const dateBuffer = Buffer.alloc(8);
    const dateMs = testDate.getTime();
    dateBuffer.writeUInt32BE(Math.floor(dateMs / 0x100000000), 0); // High 32 bits
    dateBuffer.writeUInt32BE(dateMs % 0x100000000, 4); // Low 32 bits

    const addressCountBuffer = Buffer.alloc(4);
    addressCountBuffer.writeUInt32BE(addresses.length);

    const dataLengthBuffer = Buffer.alloc(8);
    dataLengthBuffer.writeBigInt64BE(BigInt(dataLength));

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
    const signature = StaticHelpersECIES.signMessage(
      encryptor.privateKey,
      checksum,
    );

    // Create CBL block with GuidV4 creator and signature
    cblBlock = new TestCblBlock(
      blockSize,
      creator,
      BigInt(dataLength),
      addresses,
      testDate, // Use fixed date
      signature, // Pass generated signature
    );
  });

  it('should construct correctly', () => {
    const encryptedBlock = EncryptedConstituentBlockListBlock.fromCbl(
      cblBlock,
      encryptor,
    );

    expect(encryptedBlock.blockSize).toBe(blockSize);
    expect(encryptedBlock.blockType).toBe(
      BlockType.EncryptedConstituentBlockListBlock,
    );
    expect(encryptedBlock.encrypted).toBe(true);
    expect(encryptedBlock.canRead).toBe(true);
    expect(encryptedBlock.actualDataLength).toBe(cblBlock.data.length);
  });

  it('should handle encryption metadata correctly', () => {
    const encryptedBlock = EncryptedConstituentBlockListBlock.fromCbl(
      cblBlock,
      encryptor,
    );

    expect(encryptedBlock.ephemeralPublicKey).toBeDefined();
    expect(encryptedBlock.ephemeralPublicKey.length).toBe(
      StaticHelpersECIES.publicKeyLength,
    );
    expect(encryptedBlock.iv).toBeDefined();
    expect(encryptedBlock.iv.length).toBe(StaticHelpersECIES.ivLength);
    expect(encryptedBlock.authTag).toBeDefined();
    expect(encryptedBlock.authTag.length).toBe(
      StaticHelpersECIES.authTagLength,
    );
  });

  it('should calculate overhead correctly', () => {
    const encryptedBlock = EncryptedConstituentBlockListBlock.fromCbl(
      cblBlock,
      encryptor,
    );

    expect(encryptedBlock.totalOverhead).toBe(
      StaticHelpersECIES.eciesOverheadLength,
    );
  });

  it('should handle creator as GuidV4', () => {
    const guidCreator = GuidV4.new();
    const encryptedData = StaticHelpersECIES.encrypt(
      encryptor.publicKey,
      cblBlock.data,
    );

    const encryptedBlock = new TestEncryptedCblBlock(
      blockSize,
      encryptedData,
      undefined,
      guidCreator,
      cblBlock.data.length,
      testDate, // Use fixed date
    );

    expect(encryptedBlock.creator).toBeUndefined();
    expect(encryptedBlock.creatorId).toBe(guidCreator);
  });

  it('should handle creator as BrightChainMember', () => {
    const encryptedBlock = EncryptedConstituentBlockListBlock.fromCbl(
      cblBlock,
      encryptor,
    );

    expect(encryptedBlock.creator).toBe(encryptor);
    expect(encryptedBlock.creatorId).toBe(encryptor.id);
  });

  it('should validate checksum when provided', () => {
    const encryptedData = StaticHelpersECIES.encrypt(
      encryptor.publicKey,
      cblBlock.data,
    );
    const checksum = StaticHelpersChecksum.calculateChecksum(encryptedData);

    const encryptedBlock = new TestEncryptedCblBlock(
      blockSize,
      encryptedData,
      checksum,
      creator,
      cblBlock.data.length,
      testDate, // Use fixed date
    );

    expect(encryptedBlock.idChecksum).toEqual(checksum);
  });

  it('should handle read permissions correctly', () => {
    const encryptedBlock = EncryptedConstituentBlockListBlock.fromCbl(
      cblBlock,
      encryptor,
    );

    expect(encryptedBlock.canRead).toBe(true);
    expect(encryptedBlock.canPersist).toBe(true);
  });

  it('should handle date validation', () => {
    // Create a date that's definitely in the future
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);

    const encryptedData = StaticHelpersECIES.encrypt(
      encryptor.publicKey,
      cblBlock.data,
    );

    // Calculate checksum for the encrypted data
    const checksum = StaticHelpersChecksum.calculateChecksum(encryptedData);

    // Test with future date - should throw before checksum validation
    expect(
      () =>
        new TestEncryptedCblBlock(
          blockSize,
          encryptedData,
          checksum, // Provide valid checksum
          creator,
          cblBlock.data.length,
          futureDate,
        ),
    ).toThrow('Date created cannot be in the future');
  });

  it('should handle data size validation', () => {
    const tooLargeData = Buffer.alloc((blockSize as number) + 1);

    expect(
      () =>
        new TestEncryptedCblBlock(
          blockSize,
          tooLargeData,
          undefined,
          creator,
          tooLargeData.length,
          testDate, // Use fixed date
        ),
    ).toThrow('Data length exceeds block capacity');
  });

  it('should validate actual data length', () => {
    const encryptedData = StaticHelpersECIES.encrypt(
      encryptor.publicKey,
      cblBlock.data,
    );
    const tooLargeLength = (blockSize as number) + 1;

    expect(
      () =>
        new TestEncryptedCblBlock(
          blockSize,
          encryptedData,
          undefined,
          creator,
          tooLargeLength,
          testDate, // Use fixed date
        ),
    ).toThrow('Data length exceeds block capacity');
  });

  it('should extract payload correctly', () => {
    const encryptedBlock = EncryptedConstituentBlockListBlock.fromCbl(
      cblBlock,
      encryptor,
    );

    // The payload length should match the encrypted data length minus overhead
    expect(encryptedBlock.payload.length).toBe(
      encryptedBlock.data.length - StaticHelpersECIES.eciesOverheadLength,
    );
  });
});
