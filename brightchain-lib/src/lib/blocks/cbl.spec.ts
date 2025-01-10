import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
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

  beforeEach(() => {
    // Create an anonymous member with User type
    const anonymous = BrightChainMember.anonymous();
    creator = new BrightChainMember(
      MemberType.User,
      'Anonymous',
      anonymous.contactEmail,
      anonymous.votingPublicKey,
      anonymous.encryptedVotingPrivateKey,
      anonymous.publicKey,
      anonymous.privateKey,
      anonymous.wallet,
    );

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

    // Create block without providing signature - it will create its own
    const block = new TestCblBlock(
      blockSize,
      creator,
      fileDataLength,
      dataAddresses,
    );

    // Verify the auto-generated signature
    expect(block.validateSignature(creator)).toBe(true);

    // Create another block with the same data but different creator
    const otherCreator = BrightChainMember.anonymous();
    const otherBlock = new TestCblBlock(
      blockSize,
      otherCreator,
      fileDataLength,
      dataAddresses,
    );

    // Verify that signatures are different
    expect(block.creatorSignature).not.toEqual(otherBlock.creatorSignature);
    expect(block.validateSignature(otherCreator)).toBe(false);
  });
});
