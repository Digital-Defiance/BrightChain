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
import { EncryptedOwnedDataBlock } from './encryptedOwnedData';

describe('EncryptedOwnedDataBlock', () => {
  let member: BrightChainMember;

  beforeAll(() => {
    member = BrightChainMember.newMember(
      MemberType.User,
      'test',
      new EmailString('test@example.com'),
    );
  });

  it('should construct correctly with default block type', () => {
    const blockSize = BlockSize.Small;
    // Calculate the maximum data size that can fit in the block after encryption
    // The encrypted data will include ECIES overhead, so we need to account for that
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Encrypt the data and log details
    // Use public key directly - StaticHelpersECIES will handle the prefix
    const encryptedData = StaticHelpersECIES.encrypt(
      member.publicKey,
      originalData,
    );

    const block = new EncryptedOwnedDataBlock(
      blockSize,
      encryptedData,
      undefined,
      member,
      originalData.length,
    );

    expect(block.blockSize).toBe(blockSize);
    expect(block.blockType).toBe(BlockType.EncryptedOwnedDataBlock);
    expect(block.blockDataType).toBe(BlockDataType.EncryptedData);
    expect(block.encrypted).toBe(true);
    expect(block.canDecrypt).toBe(true);
    expect(block.canEncrypt).toBe(false);
  });

  it('should construct correctly with custom block type', () => {
    const blockSize = BlockSize.Small;
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Use public key directly - StaticHelpersECIES will handle the prefix
    const encryptedData = StaticHelpersECIES.encrypt(
      member.publicKey,
      originalData,
    );

    const customBlockType = BlockType.EncryptedConstituentBlockListBlock;
    const block = new EncryptedOwnedDataBlock(
      blockSize,
      encryptedData,
      undefined,
      member,
      originalData.length,
      undefined,
      true, // canRead
      true, // canPersist
      customBlockType, // blockType
    );

    expect(block.blockType).toBe(customBlockType);
  });

  it('should handle creator as GuidV4', () => {
    const blockSize = BlockSize.Small;
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Use public key directly - StaticHelpersECIES will handle the prefix
    const encryptedData = StaticHelpersECIES.encrypt(
      member.publicKey,
      originalData,
    );

    const creatorId = GuidV4.new();
    const block = new EncryptedOwnedDataBlock(
      blockSize,
      encryptedData,
      undefined,
      creatorId,
      originalData.length,
    );

    expect(block.creatorId).toEqual(creatorId);
    expect(block.creator).toBeUndefined();
  });

  it('should handle creator as BrightChainMember', () => {
    const blockSize = BlockSize.Small;
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Use public key directly - StaticHelpersECIES will handle the prefix
    const encryptedData = StaticHelpersECIES.encrypt(
      member.publicKey,
      originalData,
    );

    const block = new EncryptedOwnedDataBlock(
      blockSize,
      encryptedData,
      undefined,
      member,
      originalData.length,
    );

    expect(block.creatorId).toEqual(member.id);
    expect(block.creator).toBe(member);
  });

  it('should validate checksum when provided', () => {
    const blockSize = BlockSize.Small;
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Use public key directly - StaticHelpersECIES will handle the prefix
    const encryptedData = StaticHelpersECIES.encrypt(
      member.publicKey,
      originalData,
    );

    const checksum = StaticHelpersChecksum.calculateChecksum(encryptedData);
    const block = new EncryptedOwnedDataBlock(
      blockSize,
      encryptedData,
      checksum,
      member,
      originalData.length,
    );

    expect(block.validated).toBe(true);
    expect(block.idChecksum).toEqual(checksum);
  });

  it('should handle read permissions correctly', () => {
    const blockSize = BlockSize.Small;
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Use public key directly - StaticHelpersECIES will handle the prefix
    const encryptedData = StaticHelpersECIES.encrypt(
      member.publicKey,
      originalData,
    );

    const block = new EncryptedOwnedDataBlock(
      blockSize,
      encryptedData,
      undefined,
      member,
      originalData.length,
      undefined,
      false, // canRead = false
    );

    expect(block.canRead).toBe(false);
    expect(() => block.data).toThrow('Block cannot be read');
  });

  it('should handle date validation', () => {
    const blockSize = BlockSize.Small;
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Use public key directly - StaticHelpersECIES will handle the prefix
    const encryptedData = StaticHelpersECIES.encrypt(
      member.publicKey,
      originalData,
    );

    const futureDate = new Date(Date.now() + 100000);
    expect(
      () =>
        new EncryptedOwnedDataBlock(
          blockSize,
          encryptedData,
          undefined,
          member,
          originalData.length,
          futureDate,
        ),
    ).toThrow('Date created cannot be in the future');
  });

  it('should handle encryption metadata correctly', () => {
    const blockSize = BlockSize.Small;
    const maxDataSize =
      (blockSize as number) - StaticHelpersECIES.eciesOverheadLength;
    const originalData = randomBytes(maxDataSize);
    // Use public key directly - StaticHelpersECIES will handle the prefix
    const encryptedData = StaticHelpersECIES.encrypt(
      member.publicKey,
      originalData,
    );

    const block = new EncryptedOwnedDataBlock(
      blockSize,
      encryptedData,
      undefined,
      member,
      originalData.length,
    );

    // Get encryption components from block
    const ephemeralPublicKey = block.ephemeralPublicKey;
    const iv = block.iv;
    const authTag = block.authTag;

    // Verify components have correct lengths
    expect(ephemeralPublicKey.length).toBe(StaticHelpersECIES.publicKeyLength);
    expect(iv.length).toBe(StaticHelpersECIES.ivLength);
    expect(authTag.length).toBe(StaticHelpersECIES.authTagLength);

    // Verify we can decrypt the payload
    const decryptedData = StaticHelpersECIES.decryptWithComponents(
      member.privateKey,
      ephemeralPublicKey,
      iv,
      authTag,
      block.payload,
    );
    expect(decryptedData).toEqual(originalData);
  });
});
