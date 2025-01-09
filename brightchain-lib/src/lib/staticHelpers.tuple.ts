import { ReadStream } from 'fs';
import { BaseBlock } from './blocks/base';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { EncryptedOwnedDataBlock } from './blocks/encryptedOwnedData';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { OwnedDataBlock } from './blocks/ownedData';
import { RandomBlock } from './blocks/random';
import { WhitenedBlock } from './blocks/whitened';
import { BrightChainMember } from './brightChainMember';
import { BlockSize } from './enumerations/blockSizes';
import BlockPaddingTransform from './blockPaddingTransform';
import { PrimeTupleGeneratorStream } from './primeTupleGeneratorStream';
import { StaticHelpersECIES } from './staticHelpers.ECIES';
import { SignatureBuffer } from './types';
import { RandomBlocksPerTuple, TupleSize } from './constants';
import { EciesEncryptionTransform } from './transforms/eciesEncryptTransform';
import { randomBytes } from 'crypto';
import { EncryptedConstituentBlockListBlock } from './blocks/encryptedCbl';

export abstract class StaticHelpersTuple {
  public static xorSourceToPrimeWhitened(
    sourceBlock: BaseBlock | EncryptedOwnedDataBlock,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[]
  ): WhitenedBlock {
    let block: BaseBlock = sourceBlock;
    for (let i = 0; i < whiteners.length; i++) {
      block = block.xor<WhitenedBlock>(whiteners[i]);
    }
    for (let i = 0; i < randomBlocks.length; i++) {
      block = block.xor<WhitenedBlock>(randomBlocks[i]);
    }
    return new WhitenedBlock(
      block.blockSize,
      block.data,
      block.dateCreated,
      block.id
    );
  }
  public static makeTupleFromSourceXor(
    sourceBlock: BaseBlock | EncryptedOwnedDataBlock,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[]
  ): InMemoryBlockTuple {
    const primeWhitenedBlock = this.xorSourceToPrimeWhitened(
      sourceBlock,
      whiteners,
      randomBlocks
    );
    return new InMemoryBlockTuple([
      primeWhitenedBlock,
      ...whiteners,
      ...randomBlocks,
    ]);
  }
  public static xorDestPrimeWhitenedToOwned(
    primeWhitenedBlock: WhitenedBlock,
    whiteners: WhitenedBlock[]
  ): OwnedDataBlock {
    let block: BaseBlock = primeWhitenedBlock;
    for (let i = 0; i < whiteners.length; i++) {
      block = block.xor<BaseBlock>(whiteners[i]);
    }
    return new OwnedDataBlock(
      block.blockSize,
      block.data,
      block.lengthBeforeEncryption,
      block.dateCreated,
      block.id
    );
  }
  public static makeTupleFromDestXor(
    primeWhitenedBlock: WhitenedBlock,
    whiteners: WhitenedBlock[]
  ): InMemoryBlockTuple {
    const ownedDataBlock = this.xorDestPrimeWhitenedToOwned(
      primeWhitenedBlock,
      whiteners
    );
    return new InMemoryBlockTuple([ownedDataBlock, ...whiteners]);
  }
  public static xorPrimeWhitenedToCbl(
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[]
  ): ConstituentBlockListBlock {
    const resultBlock = StaticHelpersTuple.xorDestPrimeWhitenedToOwned(
      primeWhitened,
      whiteners
    );
    return ConstituentBlockListBlock.newFromPlaintextBuffer(
      resultBlock.data,
      resultBlock.blockSize
    );
  }
  public static xorPrimeWhitenedEncryptedToCbl(
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
    creator: BrightChainMember
  ): ConstituentBlockListBlock {
    let resultBlock = StaticHelpersTuple.xorDestPrimeWhitenedToOwned(
      primeWhitened,
      whiteners
    );
    resultBlock = resultBlock.decrypt(creator);
    return ConstituentBlockListBlock.newFromPlaintextBuffer(
      resultBlock.data,
      resultBlock.blockSize
    );
  }
  /**
   * Given a file that is very large, encrypt it via stream and break it into blocks and produce a stream of input blocks
   */
  public static async dataStreamToPlaintextTuplesAndCBL(
    creator: BrightChainMember,
    blockSize: BlockSize,
    source: ReadStream,
    sourceLength: bigint,
    whitenedBlockSource: () => WhitenedBlock | undefined,
    randomBlockSource: () => RandomBlock,
    persistTuple: (tuple: InMemoryBlockTuple) => Promise<void>
  ): Promise<InMemoryBlockTuple> {
    // read the dataStream chunks and encrypt each batch of chunkSize, thus encrypting each block and ending up with blocksize bytes per block
    const blockPaddingTransform = new BlockPaddingTransform(blockSize);
    const tupleGeneratorStream = new PrimeTupleGeneratorStream(
      blockSize,
      whitenedBlockSource,
      randomBlockSource
    );
    source.pipe(blockPaddingTransform).pipe(tupleGeneratorStream);
    let blockIDs: Buffer = Buffer.alloc(0);
    let addressCount = 0;
    tupleGeneratorStream.on('data', async (tuple: InMemoryBlockTuple) => {
      await persistTuple(tuple);
      blockIDs = Buffer.concat([blockIDs, tuple.blockIdsBuffer]);
      addressCount += tuple.blocks.length;
    });
    const cblHeader = ConstituentBlockListBlock.makeCblHeaderAndSign(
      creator,
      new Date(),
      addressCount,
      sourceLength,
      blockIDs
    );
    const signature = cblHeader.subarray(
      ConstituentBlockListBlock.CblHeaderSizeWithoutSignature
    ) as SignatureBuffer;
    if (signature.length !== StaticHelpersECIES.signatureLength) {
      throw new Error('CBL signature length is incorrect');
    }
    const cblData = Buffer.concat([cblHeader, blockIDs]);
    const sourceCblBlock = new ConstituentBlockListBlock(
      blockSize,
      creator.id.asRawGuidBuffer,
      signature,
      sourceLength,
      addressCount,
      cblData,
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
    const primeBlock = StaticHelpersTuple.xorSourceToPrimeWhitened(
      sourceCblBlock,
      whiteners,
      randomBlocks
    );
    const newTuple = new InMemoryBlockTuple([
      primeBlock,
      ...whiteners,
      ...randomBlocks,
    ]);
    await persistTuple(newTuple);
    return newTuple;
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
    persistTuple: (tuple: InMemoryBlockTuple) => Promise<void>
  ): Promise<InMemoryBlockTuple> {
    // read the dataStream chunks and encrypt each batch of chunkSize, thus encrypting each block and ending up with blocksize bytes per block
    const ecieEncryptTransform = new EciesEncryptionTransform(
      blockSize,
      creator.publicKey
    );
    const tupleGeneratorStream = new PrimeTupleGeneratorStream(
      blockSize,
      whitenedBlockSource,
      randomBlockSource
    );
    source.pipe(ecieEncryptTransform).pipe(tupleGeneratorStream);
    let blockIDs: Buffer = Buffer.alloc(0);
    let addressCount = 0;
    tupleGeneratorStream.on('data', async (tuple: InMemoryBlockTuple) => {
      await persistTuple(tuple);
      blockIDs = Buffer.concat([blockIDs, tuple.blockIdsBuffer]);
      addressCount += tuple.blocks.length;
    });
    const blockIdDataLength = blockIDs.length;
    const encryptedCBLDataLength =
      ConstituentBlockListBlock.CblHeaderSize +
      blockIdDataLength +
      StaticHelpersECIES.ecieOverheadLength;
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
    const cblData = Buffer.concat([cblHeader, blockIDs, cblPadding]);
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
    const primeBlock = StaticHelpersTuple.xorSourceToPrimeWhitened(
      sourceCblBlock,
      whiteners,
      randomBlocks
    );
    const newTuple = new InMemoryBlockTuple([
      primeBlock,
      ...whiteners,
      ...randomBlocks,
    ]);
    await persistTuple(newTuple);
    return newTuple;
  }
}
