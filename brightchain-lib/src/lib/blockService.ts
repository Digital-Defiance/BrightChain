import {
  BlockSize,
  validBlockSizes,
  blockSizeLengths,
} from './enumerations/blockSizes';
import { StaticHelpersChecksum } from './staticHelpers.checksum';
import { BrightChainMember } from './brightChainMember';
import { ConstituentBlockListBlock } from './blocks/constituentBlockList';
import { randomBytes } from 'crypto';
import { InMemoryBlockTuple } from './blocks/memoryTuple'
import { RandomBlock } from './blocks/random';
import { RandomBlocksPerTuple, TupleSize } from './constants';
import { EcieEncryptionTransform } from './ecieEncryptTransform';
import { TupleGeneratorStream } from './tupleGeneratorStream';
import { ReadStream } from 'fs';
import { WhitenedBlock } from './blocks/whitened';

export abstract class BlockService {
  public static readonly TupleSize = TupleSize;
  public static readonly RandomBlocksPerTuple = RandomBlocksPerTuple;
  public static getBlockSizeForData(dataLength: number): BlockSize {
    if (dataLength < BigInt(0)) {
      return BlockSize.Unknown;
    }
    for (let i = 0; i < blockSizeLengths.length; i++) {
      if (dataLength <= blockSizeLengths[i]) {
        return validBlockSizes[i];
      }
    }
    return BlockSize.Unknown;
  }
  /**
   * Given a file that is very large, encrypt it via stream and break it into blocks and produce a stream of input blocks
   */
  public static async dataStreamToEncryptedTuplesAndCBL(
    creator: BrightChainMember,
    blockSize: BlockSize,
    source: ReadStream,
    sourceLength: bigint,
    whitenedBlockSource: () => WhitenedBlock | undefined,
    randomBlockSource: () => RandomBlock,
    persistTuple: (tuple: InMemoryBlockTuple) => Promise<void>,
  ): Promise<ConstituentBlockListBlock> {
    // read the dataStream chunks and encrypt each batch of chunkSize, thus encrypting each block and ending up with blocksize bytes per block
    const ecieEncryptTransform = new EcieEncryptionTransform(blockSize, creator.publicKey);
    const tupleGeneratorStream = new TupleGeneratorStream(blockSize, whitenedBlockSource, randomBlockSource);
    source.pipe(ecieEncryptTransform).pipe(tupleGeneratorStream);
    let blockIDs: Buffer = Buffer.alloc(0);
    let addressCount = 0;
    tupleGeneratorStream.on('data', async (tuple: InMemoryBlockTuple) => {
      await persistTuple(tuple);
      blockIDs = Buffer.concat([blockIDs, tuple.blockIdsBuffer]);
      addressCount += tuple.blocks.length;
    });
    const blockIdDataLength = blockIDs.length;
    const cblBlockSize = BlockService.getBlockSizeForData(blockIdDataLength);
    if (cblBlockSize === BlockSize.Unknown) {
      throw new Error('Unable to fit CBL block ids into largest block');
    }
    const cblSignature = creator.sign(StaticHelpersChecksum.calculateChecksum(blockIDs));
    const cblHeader = ConstituentBlockListBlock.makeCblHeader(
      creator.id.asRawGuidBuffer,
      cblSignature,
      new Date(),
      addressCount,
      sourceLength
    );
    const neededPadding = cblBlockSize - cblHeader.length - blockIdDataLength;
    const cblPadding = randomBytes(neededPadding);
    const cblData = Buffer.concat([
      cblHeader,
      blockIDs,
      cblPadding,
    ]);
    const cblBlock = new ConstituentBlockListBlock(
      creator.id.asRawGuidBuffer,
      cblSignature,
      sourceLength,
      addressCount,
      cblData,
      new Date()
    );
    return cblBlock;
  }
}
