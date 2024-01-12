import { randomBytes } from 'crypto';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { BaseBlock } from './base';
import {
  BlockSize,
  validBlockSizes,
} from '../enumerations/blockSizes';
import { BrightChainMember } from '../brightChainMember';
import MemberType from '../enumerations/memberType';
import { EmailString } from '../emailString';
import { StaticHelpersECIES } from '../staticHelpers.ECIES';
import { BlockDataType } from '../enumerations/blockDataType';

function randomBlockSize(not?: BlockSize): BlockSize {
  // TODO: determine deadlock/speed issues?
  let count = 0;
  while (count++ < 1000) {
    const randomIndex = Math.floor(Math.random() * validBlockSizes.length);
    const newBlockSize = validBlockSizes[randomIndex];
    if (newBlockSize !== not) {
      return newBlockSize;
    }
  }
  throw new Error('Could not find a random block size');
}

describe('block', () => {
  const testBlockSizes: BlockSize[] = [
    BlockSize.Message,
    BlockSize.Tiny,
    BlockSize.Small,
    BlockSize.Medium,
  ];
  testBlockSizes.forEach((blockSize: BlockSize) => {
    const blockLength: number = blockSize as number;
    const data = randomBytes(blockLength);
    const checksum = StaticHelpersChecksum.calculateChecksum(data);
    const dateCreated = new Date();
    const block = new BaseBlock(blockSize, data, BlockDataType.RawData, data.length, dateCreated, checksum);
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

        const rebuiltBlock = BaseBlock.fromJson(json);

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
        const badBlock = new BaseBlock(blockSize, data, BlockDataType.RawData, blockLength, dateCreated, badChecksum);
        expect(badBlock.validate()).toBeFalsy();
        expect(badBlock.validated).toBeFalsy();
      });

      it('should throw when making a block of a bad size', () => {
        const longData = Buffer.alloc((blockSize as number) + 1);
        longData.fill(0);
        expect(() => new BaseBlock(blockSize, longData, BlockDataType.RawData, longData.length, dateCreated)).toThrow(
          `Raw data length ${longData.length} is not valid for block size ${blockSize}`
        );
      });
      it('should make dateCreated value when not provided', () => {
        const newBlock = new BaseBlock(blockSize, data, BlockDataType.RawData, blockLength, undefined, checksum);
        expect(newBlock.dateCreated).toBeTruthy();
        expect(newBlock.dateCreated).toBeInstanceOf(Date);
      });
      it('should xor with same block sizes', () => {
        const blockA = new BaseBlock(blockSize, data, BlockDataType.RawData, blockLength, new Date());
        const blockB = new BaseBlock(blockSize, randomBytes(blockLength), BlockDataType.RawData, blockLength, new Date());
        const blockC = blockA.xor(blockB);
        const expectedData = Buffer.alloc(blockLength);
        for (let i = 0; i < blockLength; i++) {
          expectedData[i] = blockA.data[i] ^ blockB.data[i];
        }
        expect(blockC.data).toEqual(expectedData);
        expect(blockC.id).toEqual(
          StaticHelpersChecksum.calculateChecksum(expectedData)
        );
      });
      it('should maintain data integrity after XOR operation', () => {
        const originalDataB = randomBytes(blockLength);
        const blockB = new BaseBlock(blockSize, originalDataB, BlockDataType.RawData, blockLength, new Date());
        const blockC = block.xor(blockB);
        // block C xor with block A should equal block B
        const blockD = blockC.xor(block);
        // block C xor with block B should equal block A
        const blockE = blockC.xor(blockB);
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
      it('should encrypt and decrypt a block', () => {
        const brightChainMember = BrightChainMember.newMember(MemberType.System, 'test', new EmailString('test@example.com'));
        const dataLength = blockLength - StaticHelpersECIES.ecieOverheadLength;
        const encryptableBlock = new BaseBlock(blockSize, data.subarray(0, dataLength), BlockDataType.EphemeralStructuredData, dataLength);
        const encryptedBlock = encryptableBlock.encrypt(brightChainMember);
        expect(encryptedBlock.encrypted).toBeTruthy();
        expect(encryptedBlock.validated).toBeTruthy();
        const decryptedBlock = encryptedBlock.decrypt(brightChainMember);
        expect(decryptedBlock.encrypted).toBeFalsy();
        expect(decryptedBlock.validated).toBeTruthy();
        expect(decryptedBlock.data).toStrictEqual(encryptableBlock.data);
      });
    });
  });
  it('should throw when making an empty block', () => {
    const data = Buffer.alloc(0);
    const dateCreated = new Date();
    expect(() => new BaseBlock(BlockSize.Tiny, data, BlockDataType.RawData, 0, dateCreated)).toThrow(
      `Raw data length ${data.length} is not valid for block size ${BlockSize.Tiny as number}`
    );
  });
  it('should not xor with different block sizes', async () => {
    const blockSizeA = randomBlockSize();
    const blockSizeB = randomBlockSize(blockSizeA);
    const blockBytesA = Buffer.alloc(blockSizeA as number);
    blockBytesA.fill(0);
    const blockBytesB = Buffer.alloc(blockSizeB as number);
    blockBytesB.fill(0);
    const blockA = new BaseBlock(blockSizeA, blockBytesA, BlockDataType.RawData, blockSizeA as number, new Date());
    const blockB = new BaseBlock(blockSizeB, blockBytesB, BlockDataType.RawData, blockSizeB as number, new Date());
    expect(() => blockA.xor(blockB)).toThrow('Block sizes do not match');
  });
  it('should be validated when created with newBlock and no checksum', () => {
    const blockSize = randomBlockSize();
    const blockLength = blockSize as number;
    const blockData = randomBytes(blockLength);
    const block = BaseBlock.newBlock(blockSize, blockData, BlockDataType.RawData, blockLength);
    expect(block.validated).toBeTruthy();
  });
  it('should be validated when created with newBlock and a checksum', () => {
    const blockSize = randomBlockSize();
    const blockLength = blockSize as number;
    const blockData = randomBytes(blockLength);
    const blockChecksum = StaticHelpersChecksum.calculateChecksum(blockData);
    const block = BaseBlock.newBlock(blockSize, blockData, BlockDataType.RawData, blockLength, new Date(), blockChecksum);
    expect(block.validated).toBeTruthy();
  });
  it('should throw when created with newBlock and a bad checksum', () => {
    const blockSize = randomBlockSize();
    const blockLength = blockSize as number;
    const blockData = randomBytes(blockLength);
    const badChecksumData = Buffer.alloc(blockSize);
    badChecksumData.fill(0);
    const badChecksum =
      StaticHelpersChecksum.calculateChecksum(badChecksumData);
    badChecksum[0] = 0;
    expect(() => BaseBlock.newBlock(blockSize, blockData, BlockDataType.RawData, blockLength, new Date(), badChecksum)).toThrow(
      'Checksum mismatch'
    );
  });
});
