import { ReadStream } from 'fs';
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
import { RANDOM_BLOCKS_PER_TUPLE, TUPLE_SIZE } from './constants';
import { BlockSize } from './enumerations/blockSizes';
import { PrimeTupleGeneratorStream } from './primeTupleGeneratorStream';
import { EciesEncryptTransform } from './transforms/eciesEncryptTransform';

/**
 * StaticHelpersTuple provides utility functions for working with block tuples.
 * In the Owner Free Filesystem (OFF), tuples are used to:
 * 1. Store data blocks with random blocks for privacy
 * 2. Store parity blocks for error correction
 * 3. Store CBL blocks with their metadata
 */
export abstract class StaticHelpersTuple {
  /**
   * XOR a source block with whitening and random blocks
   */
  public static xorSourceToPrimeWhitened(
    sourceBlock: BaseBlock | BlockHandle,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): WhitenedBlock {
    // Validate parameters
    if (!sourceBlock || !whiteners || !randomBlocks) {
      throw new Error('All parameters are required');
    }

    if (whiteners.length + randomBlocks.length + 1 !== TUPLE_SIZE) {
      throw new Error('Invalid number of blocks for tuple');
    }

    try {
      // XOR with whitening blocks
      const xoredData = Buffer.from(sourceBlock.data);
      for (const whitener of whiteners) {
        if (whitener.blockSize !== sourceBlock.blockSize) {
          throw new Error('Block size mismatch');
        }
        const whitenerData = whitener.data;
        for (let i = 0; i < xoredData.length; i++) {
          xoredData[i] ^= whitenerData[i];
        }
      }

      // XOR with random blocks
      for (const random of randomBlocks) {
        if (random.blockSize !== sourceBlock.blockSize) {
          throw new Error('Block size mismatch');
        }
        const randomData = random.data;
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
  public static makeTupleFromSourceXor(
    sourceBlock: BaseBlock | BlockHandle,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): InMemoryBlockTuple {
    const primeWhitenedBlock = this.xorSourceToPrimeWhitened(
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
  public static xorDestPrimeWhitenedToOwned(
    creator: BrightChainMember,
    primeWhitenedBlock: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): OwnedDataBlock {
    // Validate parameters
    if (!primeWhitenedBlock || !whiteners) {
      throw new Error('All parameters are required');
    }

    try {
      // XOR with whitening blocks
      const xoredData = Buffer.from(primeWhitenedBlock.data);
      for (const whitener of whiteners) {
        if (whitener.blockSize !== primeWhitenedBlock.blockSize) {
          throw new Error('Block size mismatch');
        }
        const whitenerData = whitener.data;
        for (let i = 0; i < xoredData.length; i++) {
          xoredData[i] ^= whitenerData[i];
        }
      }

      // Create owned data block
      return new OwnedDataBlock(
        creator,
        primeWhitenedBlock.blockSize,
        xoredData,
        undefined, // Let constructor calculate checksum
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
  public static makeTupleFromDestXor(
    creator: BrightChainMember,
    primeWhitenedBlock: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): InMemoryBlockTuple {
    const ownedDataBlock = this.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitenedBlock,
      whiteners,
    );

    return new InMemoryBlockTuple([ownedDataBlock, ...whiteners]);
  }

  /**
   * XOR a whitened block with its whitening blocks to recover a CBL
   */
  public static xorPrimeWhitenedToCbl(
    creator: BrightChainMember,
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): ConstituentBlockListBlock {
    const ownedBlock = StaticHelpersTuple.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitened,
      whiteners,
    );

    return new ConstituentBlockListBlock(
      ownedBlock.blockSize,
      creator,
      BigInt(ownedBlock.data.length),
      [], // No addresses yet
      ownedBlock.dateCreated,
    );
  }

  /**
   * XOR an encrypted whitened block with its whitening blocks and decrypt to recover a CBL
   */
  public static xorPrimeWhitenedEncryptedToCbl(
    creator: BrightChainMember,
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): ConstituentBlockListBlock {
    const ownedBlock = StaticHelpersTuple.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitened,
      whiteners,
    );

    const encryptedBlock = BlockService.encrypt(
      creator,
      ownedBlock,
    ) as EncryptedOwnedDataBlock;
    const decryptedBlock = BlockService.decrypt(creator, encryptedBlock);

    return new ConstituentBlockListBlock(
      decryptedBlock.blockSize,
      creator,
      BigInt(decryptedBlock.data.length),
      [], // No addresses yet
      decryptedBlock.dateCreated,
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

      // Create CBL
      const cbl = new ConstituentBlockListBlock(
        blockSize,
        creator,
        sourceLength,
        [], // Addresses will be added from blockIDs
        new Date(),
      );

      // Convert CBL to OwnedDataBlock for tuple creation
      const ownedBlock = new OwnedDataBlock(
        creator,
        blockSize,
        cbl.data,
        undefined, // Let constructor calculate checksum
        new Date(),
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

      const primeBlock = StaticHelpersTuple.xorSourceToPrimeWhitened(
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
      const ecieEncryptTransform = new EciesEncryptTransform(
        blockSize,
        creator.publicKey,
      );
      const tupleGeneratorStream = new PrimeTupleGeneratorStream(
        blockSize,
        whitenedBlockSource,
        randomBlockSource,
      );

      source.pipe(ecieEncryptTransform).pipe(tupleGeneratorStream);

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

      // Create and encrypt CBL
      const cbl = new ConstituentBlockListBlock(
        blockSize,
        creator,
        sourceLength,
        [], // Addresses will be added from blockIDs
        new Date(),
      );

      // Convert CBL to OwnedDataBlock for encryption
      const ownedBlock = new OwnedDataBlock(
        creator,
        blockSize,
        cbl.data,
        undefined, // Let constructor calculate checksum
        new Date(),
        cbl.data.length,
      );

      const encryptedCbl = BlockService.encrypt(creator, ownedBlock);

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

      const primeBlock = StaticHelpersTuple.xorSourceToPrimeWhitened(
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
