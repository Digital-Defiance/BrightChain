import {
  BlockSize,
  validBlockSizes,
  blockSizeLengths,
} from './enumerations/blockSizes';
import { BrightChainMember } from './brightChainMember';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { randomBytes } from 'crypto';
import { InMemoryBlockTuple } from './blocks/memoryTuple'
import { RandomBlock } from './blocks/random';
import { RandomBlocksPerTuple, TupleSize } from './constants';
import { EciesEncryptionTransform } from './transforms/eciesEncryptTransform';
import { PrimeTupleGeneratorStream } from './primeTupleGeneratorStream';
import { ReadStream } from 'fs';
import { WhitenedBlock } from './blocks/whitened';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { EncryptedCblTuple } from './blocks/encryptedCblTuple';
import { EncryptedConstituentBlockListBlock } from './blocks/encryptedCbl';

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
  ): Promise<EncryptedCblTuple> {
    // read the dataStream chunks and encrypt each batch of chunkSize, thus encrypting each block and ending up with blocksize bytes per block
    const ecieEncryptTransform = new EciesEncryptionTransform(blockSize, creator.publicKey);
    const tupleGeneratorStream = new PrimeTupleGeneratorStream(blockSize, whitenedBlockSource, randomBlockSource);
    source.pipe(ecieEncryptTransform).pipe(tupleGeneratorStream);
    let blockIDs: Buffer = Buffer.alloc(0);
    let addressCount = 0;
    tupleGeneratorStream.on('data', async (tuple: InMemoryBlockTuple) => {
      await persistTuple(tuple);
      blockIDs = Buffer.concat([blockIDs, tuple.blockIdsBuffer]);
      addressCount += tuple.blocks.length;
    });
    const blockIdDataLength = blockIDs.length;
    const encryptedCBLDataLength = ConstituentBlockListBlock.CblHeaderSize + blockIdDataLength + StaticHelpersECIES.ecieOverheadLength;
    const cblHeader = ConstituentBlockListBlock.makeCblHeaderAndSign(
      creator,
      new Date(),
      addressCount,
      sourceLength,
      blockIDs
    );
    const neededPadding = blockSize - encryptedCBLDataLength;
    if (neededPadding < 0) {
      throw new Error('CBL block too small to fit block ids');
    }
    const cblPadding = randomBytes(neededPadding);
    const cblData = Buffer.concat([
      cblHeader,
      blockIDs,
      cblPadding,
    ]);
    const encryptedCblData = await creator.encryptData(cblData);
    const sourceCblBlock = new EncryptedConstituentBlockListBlock(
      blockSize,
      encryptedCblData,
      encryptedCBLDataLength,
      new Date()
    );
    const randomBlocks: RandomBlock[] = [];
    for (let i = 0; i < RandomBlocksPerTuple; i++) {
      const b = randomBlockSource();
      randomBlocks.push(b);
    }
    const whiteners: WhitenedBlock[] = [];
    for (let i = RandomBlocksPerTuple; i < TupleSize - 1; i++) {
      const b = whitenedBlockSource() ?? randomBlockSource();
      whiteners.push(b);
    }
    const primeBlock = InMemoryBlockTuple.xorSourceToPrimeWhitened(sourceCblBlock, whiteners, randomBlocks);
    return new EncryptedCblTuple([primeBlock, ...whiteners, ...randomBlocks]);
  }
}
