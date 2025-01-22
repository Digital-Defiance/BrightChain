import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import MemberType from '../enumerations/memberType';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { ChecksumBuffer } from '../types';
import { EncryptedBlock } from './encrypted';

// Test class that properly implements abstract methods
class TestEncryptedBlock extends EncryptedBlock {
  private readonly internalData: Buffer;

  constructor(
    type: BlockType,
    blockSize: BlockSize,
    data: Buffer,
    checksum?: ChecksumBuffer,
    creator?: BrightChainMember,
    dateCreated?: Date,
    actualDataLength?: number,
    canRead = true,
  ) {
    super(
      type,
      blockSize,
      data,
      checksum,
      creator,
      dateCreated,
      actualDataLength,
      canRead,
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

describe('EncryptedBlock', () => {
  let creator: BrightChainMember;

  beforeAll(() => {
    creator = BrightChainMember.newMember(
      MemberType.User,
      'Alice',
      new EmailString('alice@example.com'),
    );
  });

  it('should construct correctly with encryption overhead', () => {
    const blockSize = BlockSize.Small;
    // Calculate the maximum data size that can fit in the block after encryption
    // The encrypted data will include ECIES overhead, so we need to account for that
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Encrypt the data
    // Always strip 0x04 prefix since encrypt expects raw key
    const publicKeyForEncryption =
      creator.publicKey[0] === 0x04
        ? creator.publicKey.subarray(1)
        : creator.publicKey;
    const encryptedData = StaticHelpersECIES.encrypt(
      publicKeyForEncryption,
      originalData,
    );

    const block = new TestEncryptedBlock(
      BlockType.Random,
      blockSize,
      encryptedData,
      undefined,
      creator,
      undefined,
      originalData.length,
    );

    expect(block.blockSize).toBe(blockSize);
    expect(block.encrypted).toBe(true);
    expect(block.canRead).toBe(true);
    expect(block.actualDataLength).toBe(originalData.length);
  });

  it('should correctly extract encryption metadata', () => {
    const blockSize = BlockSize.Small;
    // Calculate the maximum data size that can fit in the block after encryption
    // The encrypted data will include ECIES overhead, so we need to account for that
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Always strip 0x04 prefix since encrypt expects raw key
    const publicKeyForEncryption =
      creator.publicKey[0] === 0x04
        ? creator.publicKey.subarray(1)
        : creator.publicKey;
    const encryptedData = StaticHelpersECIES.encrypt(
      publicKeyForEncryption,
      originalData,
    );

    const block = new TestEncryptedBlock(
      BlockType.Random,
      blockSize,
      encryptedData,
      undefined,
      creator,
      undefined,
      originalData.length,
    );

    expect(block.ephemeralPublicKey).toBeDefined();
    expect(block.ephemeralPublicKey.length).toBe(
      StaticHelpersECIES.publicKeyLength,
    );
    expect(block.iv).toBeDefined();
    expect(block.iv.length).toBe(StaticHelpersECIES.ivLength);
    expect(block.authTag).toBeDefined();
    expect(block.authTag.length).toBe(StaticHelpersECIES.authTagLength);
  });

  it('should correctly calculate overhead', () => {
    const blockSize = BlockSize.Small;
    // Calculate the maximum data size that can fit in the block after encryption
    // The encrypted data will include ECIES overhead, so we need to account for that
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Always strip 0x04 prefix since encrypt expects raw key
    const publicKeyForEncryption =
      creator.publicKey[0] === 0x04
        ? creator.publicKey.subarray(1)
        : creator.publicKey;
    const encryptedData = StaticHelpersECIES.encrypt(
      publicKeyForEncryption,
      originalData,
    );

    const block = new TestEncryptedBlock(
      BlockType.Random,
      blockSize,
      encryptedData,
      undefined,
      creator,
      undefined,
      originalData.length,
    );

    expect(block.totalOverhead).toBe(StaticHelpersECIES.eciesOverheadLength);
  });

  it('should correctly extract and decrypt payload', () => {
    const blockSize = BlockSize.Small;
    // Calculate the maximum data size that can fit in the block after encryption
    // The encrypted data will include ECIES overhead, so we need to account for that
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Always strip 0x04 prefix since encrypt expects raw key
    const publicKeyForEncryption =
      creator.publicKey[0] === 0x04
        ? creator.publicKey.subarray(1)
        : creator.publicKey;
    const encryptedData = StaticHelpersECIES.encrypt(
      publicKeyForEncryption,
      originalData,
    );

    const block = new TestEncryptedBlock(
      BlockType.Random,
      blockSize,
      encryptedData,
      undefined,
      creator,
      undefined,
      originalData.length,
    );

    // The payload length should match the original data length
    expect(block.payload.length).toBe(originalData.length);

    // Verify we can decrypt the payload
    const decryptedData = StaticHelpersECIES.decryptWithComponents(
      creator.privateKey,
      block.ephemeralPublicKey,
      block.iv,
      block.authTag,
      block.payload,
    );
    expect(decryptedData).toEqual(originalData);
  });

  it('should handle date validation', () => {
    const blockSize = BlockSize.Small;
    // Calculate the maximum data size that can fit in the block after encryption
    // The encrypted data will include ECIES overhead, so we need to account for that
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Always strip 0x04 prefix since encrypt expects raw key
    const publicKeyForEncryption =
      creator.publicKey[0] === 0x04
        ? creator.publicKey.subarray(1)
        : creator.publicKey;
    const encryptedData = StaticHelpersECIES.encrypt(
      publicKeyForEncryption,
      originalData,
    );
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    expect(
      () =>
        new TestEncryptedBlock(
          BlockType.Random,
          blockSize,
          encryptedData,
          undefined,
          creator,
          futureDate,
          originalData.length,
        ),
    ).toThrow('Date created cannot be in the future');
  });

  it('should handle data size validation', () => {
    const blockSize = BlockSize.Small;
    const tooLargeData = randomBytes((blockSize as number) + 1);

    expect(
      () =>
        new TestEncryptedBlock(
          BlockType.Random,
          blockSize,
          tooLargeData,
          undefined,
          creator,
          undefined,
          tooLargeData.length,
        ),
    ).toThrow('Data length exceeds block capacity');
  });

  it('should handle checksum validation', () => {
    const blockSize = BlockSize.Small;
    // Calculate the maximum data size that can fit in the block after encryption
    // The encrypted data will include ECIES overhead, so we need to account for that
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Always strip 0x04 prefix since encrypt expects raw key
    const publicKeyForEncryption =
      creator.publicKey[0] === 0x04
        ? creator.publicKey.subarray(1)
        : creator.publicKey;
    const encryptedData = StaticHelpersECIES.encrypt(
      publicKeyForEncryption,
      originalData,
    );
    const checksum = StaticHelpersChecksum.calculateChecksum(encryptedData);

    const block = new TestEncryptedBlock(
      BlockType.Random,
      blockSize,
      encryptedData,
      undefined,
      creator,
      undefined,
      originalData.length,
    );

    expect(block.idChecksum).toEqual(checksum);
  });

  it('should validate actual data length', () => {
    const blockSize = BlockSize.Small;
    // Calculate the maximum data size that can fit in the block after encryption
    // The encrypted data will include ECIES overhead, so we need to account for that
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Always strip 0x04 prefix since encrypt expects raw key
    const publicKeyForEncryption =
      creator.publicKey[0] === 0x04
        ? creator.publicKey.subarray(1)
        : creator.publicKey;
    const encryptedData = StaticHelpersECIES.encrypt(
      publicKeyForEncryption,
      originalData,
    );
    // Calculate a length that would exceed the block's capacity
    const tooLargeLength =
      maxDataSize + StaticHelpersECIES.eciesOverheadLength + 1;

    expect(
      () =>
        new TestEncryptedBlock(
          BlockType.Random,
          blockSize,
          encryptedData,
          undefined,
          creator,
          undefined,
          tooLargeLength,
        ),
    ).toThrow('Data length exceeds block capacity');
  });

  it('should handle canRead correctly', () => {
    const blockSize = BlockSize.Small;
    // Calculate the maximum data size that can fit in the block
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    // Create data that's smaller than the max to leave room for encryption overhead
    const originalData = randomBytes(Math.floor(maxDataSize * 0.75));
    const encryptedData = StaticHelpersECIES.encrypt(
      creator.publicKey, // ECDH public key is already in correct format
      originalData,
    );

    const block = new TestEncryptedBlock(
      BlockType.Random,
      blockSize,
      encryptedData,
      undefined,
      creator,
      undefined,
      originalData.length,
      false, // canRead = false
    );

    expect(block.canRead).toBe(false);
    expect(() => block.data).toThrow('Block cannot be read');
    expect(() => block.layerHeaderData).toThrow('Block cannot be read');
    expect(() => block.payload).toThrow('Block cannot be read');
  });
});
