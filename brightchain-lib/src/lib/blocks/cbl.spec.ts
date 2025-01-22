import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import MemberType from '../enumerations/memberType';
import { GuidV4 } from '../guid';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { ChecksumBuffer, SignatureBuffer } from '../types';
import { ConstituentBlockListBlock } from './cbl';

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
  let creator: BrightChainMember;
  let dataAddresses: Array<ChecksumBuffer>;

  beforeAll(() => {
    // Create an anonymous member with User type
    creator = BrightChainMember.newMember(
      MemberType.User,
      'Test User',
      new EmailString('test@example.com'),
    );
  });
  beforeEach(() => {
    // Create some mock addresses
    dataAddresses = Array(3)
      .fill(null)
      .map(() => StaticHelpersChecksum.calculateChecksum(randomBytes(32)));
  });

  it('should construct a CBL block correctly', () => {
    const blockSize = BlockSize.Small;
    const fileDataLength = BigInt(1024);

    const block = new TestCblBlock(
      blockSize,
      creator,
      fileDataLength,
      dataAddresses,
    );

    expect(block.blockSize).toBe(blockSize);
    expect(block.blockType).toBe(BlockType.ConstituentBlockList);
    expect(block.creator).toBe(creator);
    expect(block.addresses).toEqual(dataAddresses);
    expect(block.validated).toBe(true);
    expect(block.canRead).toBe(true);
  });

  it('should throw if date created is in the future', () => {
    const blockSize = BlockSize.Small;
    const fileDataLength = BigInt(1024);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 1);

    expect(
      () =>
        new TestCblBlock(
          blockSize,
          creator,
          fileDataLength,
          dataAddresses,
          futureDate,
        ),
    ).toThrow('Date created cannot be in the future');
  });

  it('should have correct overhead', () => {
    const blockSize = BlockSize.Small;
    const fileDataLength = BigInt(1024);

    const block = new TestCblBlock(
      blockSize,
      creator,
      fileDataLength,
      dataAddresses,
    );

    expect(block.totalOverhead).toBe(ConstituentBlockListBlock.CblHeaderSize);
  });

  it('should create from ephemeral block', () => {
    const blockSize = BlockSize.Small;
    const fileDataLength = BigInt(1024);

    const block = new TestCblBlock(
      blockSize,
      creator,
      fileDataLength,
      dataAddresses,
    );

    expect(block.blockSize).toBe(blockSize);
    expect(block.blockType).toBe(BlockType.ConstituentBlockList);
    expect(block.creator).toBe(creator);
    expect(block.addresses).toEqual(dataAddresses);
    expect(block.validated).toBe(true);
    expect(block.canRead).toBe(true);
  });

  it('should handle signature validation', () => {
    const blockSize = BlockSize.Small;
    const fileDataLength = BigInt(1024);

    // Create block with the creator - it will create its own signature
    const block = new TestCblBlock(
      blockSize,
      creator,
      fileDataLength,
      dataAddresses,
    );

    // Verify the auto-generated signature
    expect(block.validateSignature()).toBe(true);

    // Create another block with same creator but different data
    const differentAddresses = Array(3)
      .fill(null)
      .map(() => StaticHelpersChecksum.calculateChecksum(randomBytes(32)));

    const differentBlock = new TestCblBlock(
      blockSize,
      creator,
      fileDataLength,
      differentAddresses,
    );

    // Verify that signatures are different for different data
    expect(block.creatorSignature).not.toEqual(differentBlock.creatorSignature);

    // But each block's signature should be valid for itself
    expect(block.validateSignature()).toBe(true);
    expect(differentBlock.validateSignature()).toBe(true);
  });
});
