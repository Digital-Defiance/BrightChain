import {
  BlockSize,
  validBlockSizes,
  maxFileSizesWithCBL,
  nextLargestBlockSize,
  blockSizeLengths,
} from './enumerations/blockSizes';
import { StaticHelpersChecksum } from './staticHelpers.checksum';
import { BrightChainMember } from './brightChainMember';
import { GuidV4 } from './guid';
import { EthereumECIES } from './ethereumECIES';
import { EphemeralBlock } from './blocks/ephemeral';
import { WhitenedBlock } from './blocks/whitened';
import { ChecksumBuffer } from './types';
import { ConstituentBlockListBlock } from './blocks/constituentBlockList';
import { randomBytes } from 'crypto';
import { BaseBlock } from './blocks/base';
import { InMemoryBlockTuple } from './blocks/memoryTuple'
import { RandomBlock } from './blocks/random';
import { RandomBlocksPerTuple, TupleSize } from './constants';
import { ReadStream } from 'fs';
import { BlockHandle } from './blocks/handle';
import { EcieEncryptionTransform } from './ecieEncryptTransform';
import { TupleGeneratorStream } from './tupleGeneratorStream';

export abstract class BlockService {
  public static readonly TupleSize = TupleSize;
  public static readonly RandomBlocksPerTuple = RandomBlocksPerTuple;
  public static getCBLBlockSize(dataLength: bigint): BlockSize {
    if (dataLength < BigInt(0)) {
      return BlockSize.Unknown;
    }
    for (let i = 0; i < maxFileSizesWithCBL.length; i++) {
      if (dataLength <= maxFileSizesWithCBL[i]) {
        return validBlockSizes[i];
      }
    }
    return BlockSize.Unknown;
  }
  /**
   * Given a file that is very large, encrypt it via stream and break it into blocks and produce a stream of input blocks
   */
  public static async dataStreamToEphemeralBlocks(
    creator: BrightChainMember,
    handle: BlockHandle,
  ) {
    // read the dataStream chunks and encrypt each batch of chunkSize, thus encrypting each block and ending up with blocksize bytes per block
    const source = handle.getReadStream();
    const ecieEncryptTransform = new EcieEncryptionTransform(handle.blockSize, creator.publicKey);
    const tupleGeneratorStream = new TupleGeneratorStream(handle.blockSize, () => undefined, () => RandomBlock.new(handle.blockSize));
    source.pipe(ecieEncryptTransform).pipe(tupleGeneratorStream);
    tupleGeneratorStream.on('data', (tuple: InMemoryBlockTuple) => {
      console.log(tuple);
      // persist the tuples to disk
    });
  }
  /**
   * Given a file that can fit in memory, encrypt it and break it into blocks
   * @param creator 
   * @param data 
   * @param getWhiteningBlock 
   */
  public static async dataToCBL(
    creator: BrightChainMember,
    data: Buffer,
    getWhiteningBlock: () => WhitenedBlock,
  ): Promise<ConstituentBlockListBlock> {
    const dateCreated = new Date();
    const creatorId = new GuidV4(creator.id).asRawGuidBuffer;
    const encryptedDataLength = data.length + EthereumECIES.ecieOverheadLength;
    let blockSize = nextLargestBlockSize(
      encryptedDataLength
    );
    if (blockSize === BlockSize.Unknown) {
      // if the data is larger than the biggest block by less than the biggest block size,
      // consider breaking it into more, smaller blocks
      const largestBlockLength = blockSizeLengths[blockSizeLengths.length - 1];
      const overage = encryptedDataLength - largestBlockLength;
      if (overage < largestBlockLength) {
        blockSize = validBlockSizes[validBlockSizes.length - 2];
      } else {
        blockSize = validBlockSizes[validBlockSizes.length - 1];
      }
    }
    const neededBlocks = Math.ceil(encryptedDataLength / blockSize);
    const neededWhitenedBlocks = neededBlocks * 2;
    const neededCBLAddressLength = neededWhitenedBlocks * StaticHelpersChecksum.Sha3ChecksumBufferLength;
    const cblBlockSize = nextLargestBlockSize(neededCBLAddressLength);
    if (cblBlockSize === BlockSize.Unknown) {
      throw new Error('Unable to fit CBL block ids into largest block');
    }
    const encryptedData = creator.encryptData(data);
    const checksum = StaticHelpersChecksum.calculateChecksum(encryptedData);
    const signature = creator.sign(checksum);
    // now produce as many blocks as needed to contain the data
    const blockIds: ChecksumBuffer[] = [];
    let offset = 0;
    while (offset < encryptedData.length) {
      const blockData = encryptedData.subarray(
        offset,
        offset + blockSize
      );
      const block = new EphemeralBlock(
        blockData,
        dateCreated
      );
      blockIds.push(block.id);
      offset += blockData.length;
    }
    const cblBlockIds: ChecksumBuffer[] = [];
    const whiteningBlocks: WhitenedBlock[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const whiteningBlock = getWhiteningBlock();
      const whitenedBlock = block.xor(whiteningBlock);
      whiteningBlocks.push(whitenedBlock);
      cblBlockIds.push(whitenedBlock.id);
      cblBlockIds.push(whiteningBlock.id);
    }
    const cblHeader = ConstituentBlockListBlock.makeCblHeader(
      creatorId,
      signature,
      dateCreated,
      neededWhitenedBlocks,
      BigInt(encryptedDataLength)
    );
    const neededPadding = cblBlockSize - cblHeader.length - neededCBLAddressLength;
    const cblPadding = randomBytes(neededPadding);
    const cblData = Buffer.concat([
      cblHeader,
      ...cblBlockIds,
      cblPadding,
    ]);
    const cblBlock = new ConstituentBlockListBlock(
      creatorId,
      signature,
      BigInt(encryptedDataLength),
      neededWhitenedBlocks,
      cblData,
      dateCreated
    );
    blocks.unshift(cblBlock);
    return blocks;
  }
}
