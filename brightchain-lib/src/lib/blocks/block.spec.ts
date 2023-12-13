import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { ChecksumString, ShortHexGuid } from '../types';
import { EmailString } from '../emailString';
import { MemberType } from '../enumerations/memberType';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { Block } from './block';
import { BlockSize, blockSizeToLength, validBlockSizes } from '../enumerations/blockSizes';

function randomBlockSize(): BlockSize {
  // TODO: determine deadlock/speed issues?
  const randomIndex = Math.floor(Math.random() * validBlockSizes.length);
  return validBlockSizes[randomIndex];
}

const alice = BrightChainMember.newMember(
  MemberType.User,
  'alice',
  new EmailString('alice@example.com')
);
const bob = BrightChainMember.newMember(
  MemberType.User,
  'bob',
  new EmailString('bob@example.com')
);

describe('block', () => {
  it('should create a block', () => {
    const blockSize = randomBlockSize();
    const data = randomBytes(blockSizeToLength(blockSize));
    const checksum = StaticHelpersChecksum.calculateChecksum(
      Buffer.from(data)
    );
    const dateCreated = new Date();
    const block = new Block(alice, data, dateCreated);
    expect(block).toBeTruthy();
    expect(block.blockSize).toBe(blockSize);
    expect(block.data).toEqual(data);
    expect(block.id).toEqual(checksum.toString('hex'));
    expect(block.checksumString).toEqual(checksum.toString('hex'));
    expect(block.createdBy).toEqual(alice.id);
    expect(block.dateCreated).toEqual(dateCreated);
  });
  it('should convert a block to json and back', () => {
    const blockSize = randomBlockSize();
    const data = randomBytes(blockSizeToLength(blockSize));
    const checksum = StaticHelpersChecksum.calculateChecksum(
      Buffer.from(data)
    );
    const dateCreated = new Date();
    const block = new Block(
      alice,
      data,
      dateCreated,
      checksum.toString('hex') as ChecksumString
    );
    const json = block.toJSON();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const rebuiltBlock = Block.fromJSON(
      json,
      (memberId: ShortHexGuid) => alice
    );
    expect(rebuiltBlock).toBeTruthy();
    expect(rebuiltBlock.blockSize).toBe(block.blockSize);
    expect(rebuiltBlock.data).toEqual(block.data);
    expect(rebuiltBlock.id).toEqual(block.id);
    expect(rebuiltBlock.createdBy).toEqual(block.createdBy);
    expect(rebuiltBlock.dateCreated).toEqual(block.dateCreated);
  });
  it('should convert a block to json and fail to convert back with a bad member source', () => {
    const blockSize = randomBlockSize();
    const data = randomBytes(blockSizeToLength(blockSize));
    const checksum = StaticHelpersChecksum.calculateChecksum(
      Buffer.from(data)
    );
    const dateCreated = new Date();
    const block = new Block(
      alice,
      data,
      dateCreated,
      checksum.toString('hex') as ChecksumString
    );
    const json = block.toJSON();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    expect(() =>
      Block.fromJSON(json, (memberId: ShortHexGuid) => bob)
    ).toThrow('Member mismatch');
  });
  it('should throw when given a bad checksum', () => {
    const blockSize = randomBlockSize();
    const data = randomBytes(blockSizeToLength(blockSize));
    const dateCreated = new Date();
    const badData = randomBytes(blockSizeToLength(blockSize));
    const badChecksum = StaticHelpersChecksum.calculateChecksum(
      Buffer.from(badData)
    );
    expect(
      () =>
        new Block(alice, data, dateCreated, badChecksum.toString('hex') as ChecksumString)
    ).toThrow('Checksum mismatch');
  });
  it('should throw when making an empty block', () => {
    const data = Buffer.from(new Uint8Array());
    const dateCreated = new Date();
    expect(() => new Block(alice, data, dateCreated)).toThrow(
      `Data length ${data.length} is not a valid block size`
    );
  });
  it('should throw when making a block of a bad size', () => {
    const blockSize = randomBlockSize();
    const data = randomBytes(blockSizeToLength(blockSize) + 1);
    const dateCreated = new Date();
    expect(() => new Block(alice, data, dateCreated)).toThrow(
      `Data length ${data.length} is not a valid block size`
    );
  });
  it('should make dateCreated valus when not provided', () => {
    const blockSize = randomBlockSize();
    const data = randomBytes(blockSizeToLength(blockSize));
    const checksum = StaticHelpersChecksum.calculateChecksum(
      Buffer.from(data)
    );
    const dateCreated = new Date();
    const block = new Block(
      alice,
      data,
      undefined,
      checksum.toString('hex') as ChecksumString
    );
    expect(block.dateCreated).toBeTruthy();
    expect(block.dateCreated).toBeInstanceOf(Date);
    // the difference between the dateCreated call and the block dateCreated should be far less than 1 second
    const delta = Math.abs(
      block.dateCreated.getTime() - dateCreated.getTime()
    );
    expect(delta).toBeLessThan(1000);
    expect(delta).toBeGreaterThanOrEqual(0);
  });
  it('should not xor with different block sizes', () => {
    const blockA = new Block(
      alice,
      randomBytes(BlockSize.Tiny),
      new Date()
    );
    const blockB = new Block(
      alice,
      randomBytes(BlockSize.Nano),
      new Date()
    );
    expect(() => blockA.xor(blockB, alice)).toThrow(
      'Block sizes do not match'
    );
  });
  it('should xor with same block sizes', () => {
    const blockLength: number = BlockSize.Nano;
    const blockA = new Block(
      alice,
      randomBytes(blockLength),
      new Date()
    );
    const blockB = new Block(
      alice,
      randomBytes(blockLength),
      new Date()
    );
    const blockC = blockA.xor(blockB, alice);
    const expectedData = Buffer.alloc(blockLength);
    for (let i = 0; i < blockLength; i++) {
      expectedData[i] = blockA.data[i] ^ blockB.data[i];
    }
    expect(blockC.data).toEqual(expectedData);
    expect(blockC.createdBy).toEqual(alice.id);
    expect(blockC.id).toEqual(
      Buffer.from(
        StaticHelpersChecksum.calculateChecksum(expectedData)
      ).toString('hex')
    );
  });
});
