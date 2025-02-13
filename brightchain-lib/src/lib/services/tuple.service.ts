import { randomBytes } from 'crypto';
import { ReadStream } from 'fs';
import { Readable } from 'stream';
import BlockPaddingTransform from '../blockPaddingTransform';
import { BaseBlock } from '../blocks/base';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { EncryptedOwnedDataBlock } from '../blocks/encryptedOwnedData';
import { BlockHandle } from '../blocks/handle';
import { InMemoryBlockTuple } from '../blocks/memoryTuple';
import { OwnedDataBlock } from '../blocks/ownedData';
import { RandomBlock } from '../blocks/random';
import { WhitenedBlock } from '../blocks/whitened';
import { BlockService } from '../blockService';
import { BrightChainMember } from '../brightChainMember';
import { CblBlockMetadata } from '../cblBlockMetadata';
import { CHECKSUM, TUPLE } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
import { TupleErrorType } from '../enumerations/tupleErrorType';
import { TupleError } from '../errors/tupleError';
import { PrimeTupleGeneratorStream } from '../primeTupleGeneratorStream';
import { ChecksumService } from './checksum.service';

/**
 * TupleService provides utility functions for working with block tuples.
 * In the Owner Free Filesystem (OFF), tuples are used to:
 * 1. Store data blocks with random blocks for privacy
 * 2. Store parity blocks for error correction
 * 3. Store CBL blocks with their metadata
 */
export class TupleService {
  constructor(private readonly checksumService: ChecksumService) {}

  /**
   * Convert data to Buffer regardless of whether it's a Readable or Buffer
   */
  private async toBuffer(data: Buffer | Readable): Promise<Buffer> {
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
  public async xorSourceToPrimeWhitened(
    sourceBlock: BaseBlock | BlockHandle,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[],
  ): Promise<WhitenedBlock> {
    // Validate parameters
    if (!sourceBlock || !whiteners || !randomBlocks) {
      throw new TupleError(TupleErrorType.MissingParameters);
    }

    if (whiteners.length + randomBlocks.length + 1 !== TUPLE.SIZE) {
      throw new TupleError(TupleErrorType.InvalidBlockCount);
    }

    try {
      // Convert source data to Buffer
      const sourceData = await this.toBuffer(sourceBlock.data);

      // Create a padded buffer initialized to zeros
      const paddedData = Buffer.alloc(sourceBlock.blockSize);
      sourceData.copy(paddedData);

      // XOR operations will be performed on the padded data
      const xoredData = Buffer.from(paddedData);

      // XOR with whitening blocks
      for (const whitener of whiteners) {
        if (whitener.blockSize !== sourceBlock.blockSize) {
          throw new TupleError(TupleErrorType.BlockSizeMismatch);
        }
        const whitenerData = await this.toBuffer(whitener.data);
        for (let i = 0; i < sourceBlock.blockSize; i++) {
          xoredData[i] ^= whitenerData[i];
        }
      }

      // XOR with random blocks
      for (const random of randomBlocks) {
        if (random.blockSize !== sourceBlock.blockSize) {
          throw new TupleError(TupleErrorType.BlockSizeMismatch);
        }
        const randomData = await this.toBuffer(random.data);
        for (let i = 0; i < sourceBlock.blockSize; i++) {
          xoredData[i] ^= randomData[i];
        }
      }

      // Create whitened block with preserved length metadata
      const now = new Date();
      return await WhitenedBlock.from(
        sourceBlock.blockSize,
        xoredData,
        undefined, // Let constructor calculate checksum
        now,
        sourceBlock.metadata?.lengthWithoutPadding, // Pass through original length if available
        true, // canRead
        true, // canPersist
      );
    } catch (error) {
      if (error instanceof TupleError) {
        throw error;
      }
      throw new TupleError(TupleErrorType.XorOperationFailed, undefined, {
        ERROR: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create a tuple from a source block and its whitening/random blocks
   */
  public async makeTupleFromSourceXor(
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
  public async xorDestPrimeWhitenedToOwned(
    creator: BrightChainMember,
    primeWhitenedBlock: WhitenedBlock,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[] = [],
  ): Promise<OwnedDataBlock> {
    // Validate parameters
    if (!primeWhitenedBlock || !whiteners) {
      throw new TupleError(TupleErrorType.MissingParameters);
    }

    try {
      // Start with a padded buffer filled with cryptographically secure random data
      const result = randomBytes(primeWhitenedBlock.blockSize);

      // Get all block data upfront and ensure they're padded
      const primeData = await this.toBuffer(primeWhitenedBlock.data);
      const whitenerData = await Promise.all(
        whiteners.map(async (w) => {
          const data = await this.toBuffer(w.data);
          const padded = randomBytes(primeWhitenedBlock.blockSize);
          data.copy(
            padded,
            0,
            0,
            Math.min(data.length, primeWhitenedBlock.blockSize),
          );
          return padded;
        }),
      );
      const randomData = await Promise.all(
        randomBlocks.map(async (r) => {
          const data = await this.toBuffer(r.data);
          const padded = randomBytes(primeWhitenedBlock.blockSize);
          data.copy(
            padded,
            0,
            0,
            Math.min(data.length, primeWhitenedBlock.blockSize),
          );
          return padded;
        }),
      );

      // Verify block sizes
      [...whiteners, ...randomBlocks].forEach((block) => {
        if (block.blockSize !== primeWhitenedBlock.blockSize) {
          throw new TupleError(TupleErrorType.BlockSizeMismatch);
        }
      });

      // Copy prime data to result buffer, preserving random padding
      primeData.copy(
        result,
        0,
        0,
        Math.min(primeData.length, primeWhitenedBlock.blockSize),
      );

      // XOR with whitening blocks
      for (const data of whitenerData) {
        for (let i = 0; i < primeWhitenedBlock.blockSize; i++) {
          result[i] ^= data[i];
        }
      }

      // XOR with random blocks
      for (const data of randomData) {
        for (let i = 0; i < primeWhitenedBlock.blockSize; i++) {
          result[i] ^= data[i];
        }
      }

      // Create owned data block with preserved length metadata
      const checksum = this.checksumService.calculateChecksum(result);
      const now = new Date();
      const lengthWithoutPadding =
        primeWhitenedBlock.metadata?.lengthWithoutPadding;
      if (!lengthWithoutPadding) {
        throw new TupleError(TupleErrorType.MissingParameters);
      }
      return await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        primeWhitenedBlock.blockSize,
        result,
        checksum,
        creator,
        now,
        lengthWithoutPadding,
      );
    } catch (error) {
      if (error instanceof TupleError) {
        throw error;
      }
      throw new TupleError(TupleErrorType.XorOperationFailed, undefined, {
        ERROR: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Create a tuple from a whitened block and its whitening blocks
   */
  public async makeTupleFromDestXor(
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
  public async xorPrimeWhitenedToCbl(
    creator: BrightChainMember,
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): Promise<ConstituentBlockListBlock> {
    const ownedBlock = await this.xorDestPrimeWhitenedToOwned(
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
        header.cblAddressCount * CHECKSUM.SHA3_BUFFER_LENGTH,
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
  public async xorPrimeWhitenedEncryptedToCbl(
    creator: BrightChainMember,
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): Promise<ConstituentBlockListBlock> {
    const ownedBlock = await this.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitened,
      whiteners,
    );

    const encryptedBlock = await BlockService.encrypt(creator, ownedBlock);
    if (!(encryptedBlock instanceof EncryptedOwnedDataBlock)) {
      throw new TupleError(TupleErrorType.InvalidBlockType);
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
  public async dataStreamToPlaintextTuplesAndCBL(
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
      throw new TupleError(TupleErrorType.MissingParameters);
    }

    if (sourceLength <= 0n) {
      throw new TupleError(TupleErrorType.InvalidSourceLength);
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
          blockSize,
        ).headerData,
        blockIDs,
      ]);
      const checksum = this.checksumService.calculateChecksum(data);
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
      for (let i = 0; i < TUPLE.RANDOM_BLOCKS_PER_TUPLE; i++) {
        const block = randomBlockSource();
        if (!block) {
          throw new TupleError(TupleErrorType.RandomBlockGenerationFailed);
        }
        randomBlocks.push(block);
      }

      const whiteners: WhitenedBlock[] = [];
      for (let i = TUPLE.RANDOM_BLOCKS_PER_TUPLE; i < TUPLE.SIZE - 1; i++) {
        const block = whitenedBlockSource() ?? randomBlockSource();
        if (!block) {
          throw new TupleError(TupleErrorType.WhiteningBlockGenerationFailed);
        }
        whiteners.push(block);
      }

      const primeBlock = await this.xorSourceToPrimeWhitened(
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
      if (error instanceof TupleError) {
        throw error;
      }
      throw new TupleError(
        TupleErrorType.DataStreamProcessingFailed,
        undefined,
        {
          ERROR: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Process a data stream into encrypted tuples and create an encrypted CBL
   */
  public async dataStreamToEncryptedTuplesAndCBL(
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
      throw new TupleError(TupleErrorType.MissingParameters);
    }

    if (sourceLength <= 0n) {
      throw new TupleError(TupleErrorType.InvalidSourceLength);
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
        blockSize,
      );
      const data = Buffer.concat([
        cblHeader.headerData,
        Buffer.concat([blockIDs]),
      ]);
      const checksum = this.checksumService.calculateChecksum(data);

      // Create and encrypt CBL
      const cbl = new ConstituentBlockListBlock(
        creator,
        new CblBlockMetadata(
          blockSize,
          BlockType.ConstituentBlockList,
          BlockDataType.EphemeralStructuredData,
          blockIDs.length * CHECKSUM.SHA3_BUFFER_LENGTH,
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
      for (let i = 0; i < TUPLE.RANDOM_BLOCKS_PER_TUPLE; i++) {
        const block = randomBlockSource();
        if (!block) {
          throw new TupleError(TupleErrorType.RandomBlockGenerationFailed);
        }
        randomBlocks.push(block);
      }

      const whiteners: WhitenedBlock[] = [];
      for (let i = TUPLE.RANDOM_BLOCKS_PER_TUPLE; i < TUPLE.SIZE - 1; i++) {
        const block = whitenedBlockSource() ?? randomBlockSource();
        if (!block) {
          throw new TupleError(TupleErrorType.WhiteningBlockGenerationFailed);
        }
        whiteners.push(block);
      }

      const primeBlock = await this.xorSourceToPrimeWhitened(
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
      if (error instanceof TupleError) {
        throw error;
      }
      throw new TupleError(
        TupleErrorType.EncryptedDataStreamProcessingFailed,
        undefined,
        {
          ERROR: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  /**
   * Get the number of random blocks needed for a tuple
   * @param dataLength - The length of the data
   * @returns The number of random blocks needed
   * Process a data stream into encrypted tuples and create an encrypted CBL
   */
  public getRandomBlockCount(dataLength: number): number {
    // Scale number of random blocks based on data size
    const baseCount = Math.ceil(dataLength / 1024); // 1 block per KB
    return Math.min(
      Math.max(baseCount, TUPLE.MIN_RANDOM_BLOCKS),
      TUPLE.MAX_RANDOM_BLOCKS,
    );
  }
}
