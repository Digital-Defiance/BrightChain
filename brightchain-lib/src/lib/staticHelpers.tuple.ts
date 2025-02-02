import { ReadStream } from 'fs';
import { Readable } from 'stream';
import BlockPaddingTransform from './blockPaddingTransform';
import { BaseBlock } from './blocks/base';
import { ConstituentBlockListBlock } from './blocks/cbl';
import { EncryptedOwnedDataBlock } from './blocks/encryptedOwnedData';
import { BlockHandle } from './blocks/handle';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { OwnedDataBlock } from './blocks/ownedData';
import { RandomBlock } from './blocks/random';
import { WhitenedBlock } from './blocks/whitened';
import { BlockService } from './blockService';
import { BrightChainMember } from './brightChainMember';
import { CblBlockMetadata } from './cblBlockMetadata';
import { RANDOM_BLOCKS_PER_TUPLE, TUPLE_SIZE } from './constants';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { PrimeTupleGeneratorStream } from './primeTupleGeneratorStream';
import { StaticHelpersChecksum } from './staticHelpers.checksum';

/**
 * StaticHelpersTuple provides utility functions for working with block tuples.
 * In the Owner Free Filesystem (OFF), tuples are used to:
 * 1. Store data blocks with random blocks for privacy
 * 2. Store parity blocks for error correction
 * 3. Store CBL blocks with their metadata
 */
export abstract class StaticHelpersTuple {
  /**
   * Convert data to Buffer regardless of whether it's a Readable or Buffer
   */
  private static async toBuffer(data: Buffer | Readable): Promise<Buffer> {
    if (Buffer.isBuffer(data)) {
      return data;
    }
    const chunks: Buffer[] = [];
    for await (const chunk of data) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * XOR a source block with whitening and random blocks
   */
  public static async xorSourceToPrimeWhitened(
    sourceBlock: BaseBlock | BlockHandle,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): Promise<WhitenedBlock> {
    // Validate parameters
    if (!sourceBlock || !whiteners || !randomBlocks) {
      throw new Error('All parameters are required');
    }

    if (whiteners.length + randomBlocks.length + 1 !== TUPLE_SIZE) {
      throw new Error('Invalid number of blocks for tuple');
    }

    try {
      // Convert source data to Buffer
      const sourceData = await StaticHelpersTuple.toBuffer(sourceBlock.data);

      // XOR with whitening blocks
      const xoredData = Buffer.from(sourceData);
      for (const whitener of whiteners) {
        if (whitener.blockSize !== sourceBlock.blockSize) {
          throw new Error('Block size mismatch');
        }
        const whitenerData = await StaticHelpersTuple.toBuffer(whitener.data);
        for (let i = 0; i < xoredData.length; i++) {
          xoredData[i] ^= whitenerData[i];
        }
      }

      // XOR with random blocks
      for (const random of randomBlocks) {
        if (random.blockSize !== sourceBlock.blockSize) {
          throw new Error('Block size mismatch');
        }
        const randomData = await StaticHelpersTuple.toBuffer(random.data);
        for (let i = 0; i < xoredData.length; i++) {
          xoredData[i] ^= randomData[i];
        }
      }

      // Create whitened block
      return new WhitenedBlock(
        sourceBlock.blockSize,
        xoredData,
        undefined, // Let constructor calculate checksum
        new Date(),
      );
    } catch (error) {
      throw new Error(
        `Failed to XOR blocks: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Create a tuple from a source block and its whitening/random blocks
   */
  public static async makeTupleFromSourceXor(
    sourceBlock: BaseBlock | BlockHandle,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): Promise<InMemoryBlockTuple> {
    const primeWhitenedBlock = await this.xorSourceToPrimeWhitened(
      sourceBlock,
      whiteners,
      randomBlocks,
    );

    return new InMemoryBlockTuple([
      primeWhitenedBlock,
      ...whiteners,
      ...randomBlocks,
    ]);
  }

  /**
   * XOR a whitened block with its whitening blocks to recover the original data
   */
  public static async xorDestPrimeWhitenedToOwned(
    creator: BrightChainMember,
    primeWhitenedBlock: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): Promise<OwnedDataBlock> {
    // Validate parameters
    if (!primeWhitenedBlock || !whiteners) {
      throw new Error('All parameters are required');
    }

    try {
      // Convert prime whitened data to Buffer
      const primeData = await StaticHelpersTuple.toBuffer(
        primeWhitenedBlock.data,
      );

      // XOR with whitening blocks
      const xoredData = Buffer.from(primeData);
      for (const whitener of whiteners) {
        if (whitener.blockSize !== primeWhitenedBlock.blockSize) {
          throw new Error('Block size mismatch');
        }
        const whitenerData = await StaticHelpersTuple.toBuffer(whitener.data);
        for (let i = 0; i < xoredData.length; i++) {
          xoredData[i] ^= whitenerData[i];
        }
      }

      // Create owned data block
      const checksum =
        await StaticHelpersChecksum.calculateChecksumAsync(xoredData);
      return await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        primeWhitenedBlock.blockSize,
        xoredData,
        checksum,
        creator,
        new Date(),
        xoredData.length,
      );
    } catch (error) {
      throw new Error(
        `Failed to XOR blocks: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Create a tuple from a whitened block and its whitening blocks
   */
  public static async makeTupleFromDestXor(
    creator: BrightChainMember,
    primeWhitenedBlock: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): Promise<InMemoryBlockTuple> {
    const ownedDataBlock = await this.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitenedBlock,
      whiteners,
    );

    return new InMemoryBlockTuple([ownedDataBlock, ...whiteners]);
  }

  /**
   * XOR a whitened block with its whitening blocks to recover a CBL
   */
  public static async xorPrimeWhitenedToCbl(
    creator: BrightChainMember,
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): Promise<ConstituentBlockListBlock> {
    const ownedBlock = await StaticHelpersTuple.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitened,
      whiteners,
    );
    const header = ConstituentBlockListBlock.parseHeader(
      ownedBlock.data,
      creator,
    );

    return new ConstituentBlockListBlock(
      creator,
      new CblBlockMetadata(
        ownedBlock.blockSize,
        BlockType.ConstituentBlockList,
        BlockDataType.EphemeralStructuredData,
        header.cblAddressCount * StaticHelpersChecksum.Sha3ChecksumBufferLength,
        header.originalDataLength,
        header.dateCreated,
        creator,
      ),
      ownedBlock.data,
      ownedBlock.idChecksum,
    );
  }

  /**
   * XOR an encrypted whitened block with its whitening blocks and decrypt to recover a CBL
   */
  public static async xorPrimeWhitenedEncryptedToCbl(
    creator: BrightChainMember,
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): Promise<ConstituentBlockListBlock> {
    const ownedBlock = await StaticHelpersTuple.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitened,
      whiteners,
    );

    const encryptedBlock = await BlockService.encrypt(creator, ownedBlock);
    if (!(encryptedBlock instanceof EncryptedOwnedDataBlock)) {
      throw new Error('Expected encrypted owned data block');
    }

    const decryptedBlock = await BlockService.decrypt(creator, encryptedBlock);
    return ConstituentBlockListBlock.fromBaseBlockBuffer(
      decryptedBlock,
      creator,
    );
  }

  /**
   * Process a data stream into tuples and create a CBL
   */
  public static async dataStreamToPlaintextTuplesAndCBL(
    creator: BrightChainMember,
    blockSize: BlockSize,
    source: ReadStream,
    sourceLength: bigint,
    whitenedBlockSource: () => WhitenedBlock | undefined,
    randomBlockSource: () => RandomBlock,
    persistTuple: (tuple: InMemoryBlockTuple) => Promise<void>,
  ): Promise<InMemoryBlockTuple> {
    const now = new Date();
    // Validate parameters
    if (
      !creator ||
      !source ||
      !whitenedBlockSource ||
      !randomBlockSource ||
      !persistTuple
    ) {
      throw new Error('All parameters are required');
    }

    if (sourceLength <= 0n) {
      throw new Error('Source length must be positive');
    }

    try {
      // Set up processing pipeline
      const blockPaddingTransform = new BlockPaddingTransform(blockSize);
      const tupleGeneratorStream = new PrimeTupleGeneratorStream(
        blockSize,
        whitenedBlockSource,
        randomBlockSource,
      );

      source.pipe(blockPaddingTransform).pipe(tupleGeneratorStream);

      // Process tuples
      let blockIDs: Buffer = Buffer.alloc(0);
      let blockIDCount = 0;

      await new Promise<void>((resolve, reject) => {
        tupleGeneratorStream.on('data', async (tuple: InMemoryBlockTuple) => {
          try {
            await persistTuple(tuple);
            blockIDs = Buffer.concat([blockIDs, tuple.blockIdsBuffer]);
            blockIDCount += tuple.blocks.length;
          } catch (error) {
            reject(error);
          }
        });

        tupleGeneratorStream.on('end', resolve);
        tupleGeneratorStream.on('error', reject);
      });

      const data = Buffer.concat([
        ConstituentBlockListBlock.makeCblHeader(
          creator,
          now,
          blockIDCount,
          sourceLength,
          blockIDs,
        ).headerData,
        blockIDs,
      ]);
      const checksum = StaticHelpersChecksum.calculateChecksum(data);
      // Create CBL
      const cbl = new ConstituentBlockListBlock(
        creator,
        new CblBlockMetadata(
          blockSize,
          BlockType.ConstituentBlockList,
          BlockDataType.EphemeralStructuredData,
          blockIDs.length,
          sourceLength,
          now,
          creator,
        ),
        data,
        checksum,
      );

      // Convert CBL to OwnedDataBlock for tuple creation
      const ownedBlock = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        cbl.data,
        checksum,
        creator,
        now,
        cbl.data.length,
      );

      // Create tuple for CBL
      const randomBlocks: RandomBlock[] = [];
      for (let i = 0; i < RANDOM_BLOCKS_PER_TUPLE; i++) {
        const block = randomBlockSource();
        if (!block) {
          throw new Error('Failed to get random block');
        }
        randomBlocks.push(block);
      }

      const whiteners: WhitenedBlock[] = [];
      for (let i = RANDOM_BLOCKS_PER_TUPLE; i < TUPLE_SIZE - 1; i++) {
        const block = whitenedBlockSource() ?? randomBlockSource();
        if (!block) {
          throw new Error('Failed to get whitening/random block');
        }
        whiteners.push(block);
      }

      const primeBlock = await StaticHelpersTuple.xorSourceToPrimeWhitened(
        ownedBlock,
        whiteners,
        randomBlocks,
      );

      const tuple = new InMemoryBlockTuple([
        primeBlock,
        ...whiteners,
        ...randomBlocks,
      ]);

      await persistTuple(tuple);
      return tuple;
    } catch (error) {
      throw new Error(
        `Failed to process data stream: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Process a data stream into encrypted tuples and create an encrypted CBL
   */
  public static async dataStreamToEncryptedTuplesAndCBL(
    creator: BrightChainMember,
    blockSize: BlockSize,
    source: ReadStream,
    sourceLength: bigint,
    whitenedBlockSource: () => WhitenedBlock | undefined,
    randomBlockSource: () => RandomBlock,
    persistTuple: (tuple: InMemoryBlockTuple) => Promise<void>,
  ): Promise<InMemoryBlockTuple> {
    const dateCreated = new Date();
    // Validate parameters
    if (
      !creator ||
      !source ||
      !whitenedBlockSource ||
      !randomBlockSource ||
      !persistTuple
    ) {
      throw new Error('All parameters are required');
    }

    if (sourceLength <= 0n) {
      throw new Error('Source length must be positive');
    }

    try {
      // Set up encryption pipeline
      const tupleGeneratorStream = new PrimeTupleGeneratorStream(
        blockSize,
        whitenedBlockSource,
        randomBlockSource,
      );

      source.pipe(tupleGeneratorStream);

      // Process tuples
      let blockIDs: Buffer = Buffer.alloc(0);

      await new Promise<void>((resolve, reject) => {
        tupleGeneratorStream.on('data', async (tuple: InMemoryBlockTuple) => {
          try {
            await persistTuple(tuple);
            blockIDs = Buffer.concat([blockIDs, tuple.blockIdsBuffer]);
          } catch (error) {
            reject(error);
          }
        });

        tupleGeneratorStream.on('end', resolve);
        tupleGeneratorStream.on('error', reject);
      });
      const cblHeader = ConstituentBlockListBlock.makeCblHeader(
        creator,
        dateCreated,
        blockIDs.length,
        sourceLength,
        Buffer.concat([blockIDs]),
      );
      const data = Buffer.concat([
        cblHeader.headerData,
        Buffer.concat([blockIDs]),
      ]);
      const checksum = StaticHelpersChecksum.calculateChecksum(data);

      // Create and encrypt CBL
      const cbl = new ConstituentBlockListBlock(
        creator,
        new CblBlockMetadata(
          blockSize,
          BlockType.ConstituentBlockList,
          BlockDataType.EphemeralStructuredData,
          blockIDs.length * StaticHelpersChecksum.Sha3ChecksumBufferLength,
          sourceLength,
          dateCreated,
          creator,
        ),
        data,
        checksum,
      );

      const ownedBlock = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        cbl.data,
        checksum,
        creator,
        new Date(),
        cbl.data.length,
      );

      const encryptedCbl = await BlockService.encrypt(creator, ownedBlock);

      // Create tuple for encrypted CBL
      const randomBlocks: RandomBlock[] = [];
      for (let i = 0; i < RANDOM_BLOCKS_PER_TUPLE; i++) {
        const block = randomBlockSource();
        if (!block) {
          throw new Error('Failed to get random block');
        }
        randomBlocks.push(block);
      }

      const whiteners: WhitenedBlock[] = [];
      for (let i = RANDOM_BLOCKS_PER_TUPLE; i < TUPLE_SIZE - 1; i++) {
        const block = whitenedBlockSource() ?? randomBlockSource();
        if (!block) {
          throw new Error('Failed to get whitening/random block');
        }
        whiteners.push(block);
      }

      const primeBlock = await StaticHelpersTuple.xorSourceToPrimeWhitened(
        encryptedCbl,
        whiteners,
        randomBlocks,
      );

      const tuple = new InMemoryBlockTuple([
        primeBlock,
        ...whiteners,
        ...randomBlocks,
      ]);

      await persistTuple(tuple);
      return tuple;
    } catch (error) {
      throw new Error(
        `Failed to process encrypted data stream: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }
}
