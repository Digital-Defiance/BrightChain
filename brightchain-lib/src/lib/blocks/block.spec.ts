import { randomBytes } from 'crypto';
import { BrightChainMember } from '../brightChainMember';
import { EmailString } from '../emailString';
import { MemberType } from '../enumerations/memberType';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { Block } from './block';
import { BlockSize, blockSizeToLength, validBlockSizes } from '../enumerations/blockSizes';
import exp = require('constants');

function randomBlockSize(not?: BlockSize): BlockSize {
  // TODO: determine deadlock/speed issues?
  while (true) {
    const randomIndex = Math.floor(Math.random() * validBlockSizes.length);
    const newBlockSize = validBlockSizes[randomIndex];
    if (newBlockSize !== not) {
      return newBlockSize;
    }
  }
}

describe('block', () => {
  const testBlockSizes: BlockSize[] = [
    BlockSize.Tiny,
    BlockSize.Small,
    BlockSize.Medium,
  ];
  testBlockSizes.forEach(blockSize => {
    const blockLength: number = blockSizeToLength(blockSize);
    const data = randomBytes(blockLength);
    const checksum = StaticHelpersChecksum.calculateChecksum(data);
    const dateCreated = new Date();
    const block = new Block(data, dateCreated, checksum);
    describe(`with block size ${blockSize}`, () => {
      it('should create a block', () => {
        expect(block).toBeTruthy();
        expect(block.blockSize).toBe(blockSize);
        expect(block.data).toEqual(data);
        expect(block.id).toEqual(checksum);
        expect(block.checksumString).toEqual(checksum.toString('hex'));
        expect(block.dateCreated).toEqual(dateCreated);
        expect(block.validated).toBeFalsy();
        expect(block.validate()).toBeTruthy();
        expect(block.validated).toBeTruthy();
      });
      it('should serialize a block to JSON', () => {
        const json = block.toJson();
        expect(json).toBeDefined();
        expect(typeof json).toBe('string');

        const parsedJson = JSON.parse(json);
        expect(parsedJson.id).toEqual(block.id.toString('hex'));
        expect(parsedJson.dateCreated).toEqual(block.dateCreated.toISOString());
        expect(parsedJson.data.length).toEqual(block.data.length * 2);
      });
      it('should deserialize a block from JSON ', () => {
        const json = block.toJson();

        const rebuiltBlock = Block.fromJson(json);

        expect(rebuiltBlock).toBeDefined();
        expect(rebuiltBlock.id).toEqual(block.id);
        expect(rebuiltBlock.dateCreated).toEqual(block.dateCreated);
        expect(rebuiltBlock.data).toEqual(block.data);
        expect(rebuiltBlock.validated).toBeTruthy();
      });
      it('should not validate when given a bad checksum', () => {
        const badData = Buffer.alloc(blockLength);
        badData.fill(0);
        const badChecksum = StaticHelpersChecksum.calculateChecksum(
          Buffer.from(badData)
        );
        const badBlock = new Block(data, dateCreated, badChecksum);
        expect(badBlock.validate()).toBeFalsy();
        expect(badBlock.validated).toBeFalsy();
      });

      it('should throw when making a block of a bad size', () => {
        const longData = Buffer.alloc(blockSizeToLength(blockSize) + 1);
        longData.fill(0);
        expect(() => new Block(longData, dateCreated)).toThrow(
          `Data length ${longData.length} is not a valid block size`
        );
      });
      it('should make dateCreated value when not provided', () => {
        const newBlock = new Block(
          data,
          undefined,
          checksum
        );
        expect(newBlock.dateCreated).toBeTruthy();
        expect(newBlock.dateCreated).toBeInstanceOf(Date);
      });
      it('should xor with same block sizes', async () => {
        const blockA = new Block(
          data,
          new Date()
        );
        const blockB = new Block(
          randomBytes(blockLength),
          new Date()
        );
        const blockC = await blockA.xor(blockB);
        const expectedData = Buffer.alloc(blockLength);
        for (let i = 0; i < blockLength; i++) {
          expectedData[i] = blockA.data[i] ^ blockB.data[i];
        }
        expect(blockC.data).toEqual(expectedData);
        expect(blockC.id).toEqual(
          StaticHelpersChecksum.calculateChecksum(expectedData)
        );
      });
      it('should maintain data integrity after XOR operation', async () => {
        const originalDataB = randomBytes(blockLength);
        const blockB = new Block(originalDataB, new Date());
        const blockC = await block.xor(blockB);
        // block C xor with block A should equal block B
        const blockD = await blockC.xor(block);
        // block C xor with block B should equal block A
        const blockE = await blockC.xor(blockB);
        expect(block.data).toEqual(data);
        expect(block.validated).toBeTruthy();
        expect(blockB.data).toEqual(originalDataB);
        expect(blockB.validated).toBeTruthy();
        expect(blockC.validated).toBeTruthy();
        expect(blockD.data).toEqual(originalDataB);
        expect(blockD.validated).toBeTruthy();
        expect(blockE.data).toEqual(data);
        expect(blockE.validated).toBeTruthy();
      });
    });
  });
  it('should throw when making an empty block', () => {
    const data = Buffer.alloc(0);
    const dateCreated = new Date();
    expect(() => new Block(data, dateCreated)).toThrow(
      `Data length ${data.length} is not a valid block size`
    );
  });
  it('should not xor with different block sizes', async () => {
    const blockSizeA = randomBlockSize();
    const blockSizeB = randomBlockSize(blockSizeA);
    const blockBytesA = Buffer.alloc(blockSizeToLength(blockSizeA));
    blockBytesA.fill(0);
    const blockBytesB = Buffer.alloc(blockSizeToLength(blockSizeB));
    blockBytesB.fill(0);
    const blockA = new Block(
      blockBytesA,
      new Date()
    );
    const blockB = new Block(
      blockBytesB,
      new Date()
    );
    expect(blockA.xor(blockB)).rejects.toThrow(
      'Block sizes do not match'
    );
  });
  it('should be validated when created with newBlock and no checksum', () => {
    const blockSize = randomBlockSize();
    const blockLength = blockSizeToLength(blockSize);
    const blockData = randomBytes(blockLength);
    const block = Block.newBlock(blockData);
    expect(block.validated).toBeTruthy();
  });
  it('should be validated when created with newBlock and a checksum', () => {
    const blockSize = randomBlockSize();
    const blockLength = blockSizeToLength(blockSize);
    const blockData = randomBytes(blockLength);
    const blockChecksum = StaticHelpersChecksum.calculateChecksum(blockData);
    const block = Block.newBlock(blockData, new Date(), blockChecksum);
    expect(block.validated).toBeTruthy();
  });
  it('should throw when created with newBlock and a bad checksum', () => {
    const blockSize = randomBlockSize();
    const blockLength = blockSizeToLength(blockSize);
    const blockData = randomBytes(blockLength);
    const badChecksumData = Buffer.alloc(blockSize);
    badChecksumData.fill(0);
    const badChecksum = StaticHelpersChecksum.calculateChecksum(badChecksumData);
    badChecksum[0] = 0;
    expect(() => Block.newBlock(blockData, new Date(), badChecksum)).toThrow(
      'Checksum mismatch'
    );
  });
});
