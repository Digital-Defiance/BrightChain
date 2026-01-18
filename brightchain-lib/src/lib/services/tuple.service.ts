import { Member, PlatformID } from '@digitaldefiance/ecies-lib';
import BlockPaddingTransform from '../blockPaddingTransform';
import { BaseBlock } from '../blocks/base';
import { ConstituentBlockListBlock } from '../blocks/cbl';
import { EncryptedBlock } from '../blocks/encrypted';
import { EphemeralBlock } from '../blocks/ephemeral';
import { BlockHandle } from '../blocks/handle';
import { InMemoryBlockTuple } from '../blocks/memoryTuple';
import { RandomBlock } from '../blocks/random';
import { WhitenedBlock } from '../blocks/whitened';
import { randomBytes } from '../browserCrypto';
import { Readable } from '../browserStream';
import { TUPLE } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { TupleErrorType } from '../enumerations/tupleErrorType';
import { TupleError } from '../errors/tupleError';
import { IBaseBlock } from '../interfaces/blocks/base';
import { IEphemeralBlock } from '../interfaces/blocks/ephemeral';
import { PrimeTupleGeneratorStream } from '../primeTupleGeneratorStream';
import { Validator } from '../utils/validator';
import { CBLService } from './cblService';
import { ChecksumService } from './checksum.service';
import { ServiceLocator } from './serviceLocator';

/**
 * TupleService provides utility functions for working with block tuples.
 * In the Owner Free Filesystem (OFF), tuples are used to:
 * 1. Store data blocks with random blocks for privacy
 * 2. Store parity blocks for error correction
 * 3. Store CBL blocks with their metadata
 *
 * @typeParam TID - The platform ID type, defaults to Uint8Array
 *
 * @see {@link BlockHandle} - Handle type for disk-based blocks
 * @see {@link InMemoryBlockTuple} - Tuple type for in-memory blocks
 * @see Requirements 3.1, 3.2
 */
export class TupleService<TID extends PlatformID = Uint8Array> {
  constructor(
    private readonly checksumService: ChecksumService,
    private readonly cblService: CBLService<TID>,
  ) {}

  /**
   * Convert data to Uint8Array regardless of whether it's a Readable or Uint8Array
   */
  private async toUint8Array(data: Uint8Array | Readable): Promise<Uint8Array> {
    if (data instanceof Uint8Array) {
      return data;
    }
    const chunks: Uint8Array[] = [];
    for await (const chunk of data) {
      chunks.push(new Uint8Array(chunk));
    }
    const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }
    return result;
  }

  /**
   * XOR a source block with whitening and random blocks
   *
   * @param sourceBlock The source block to XOR (any block type or block handle)
   * @param whiteners The whitening blocks to XOR with
   * @param randomBlocks The random blocks to XOR with
   * @returns A whitened block containing the XOR result
   * @throws {TupleError} If validation fails or XOR operation fails
   */
  public async xorSourceToPrimeWhitened(
    sourceBlock: IBaseBlock | BlockHandle<BaseBlock>,
    whiteners: (WhitenedBlock | RandomBlock)[],
    randomBlocks: RandomBlock[],
  ): Promise<WhitenedBlock> {
    // Validate required parameters
    Validator.validateRequired(
      sourceBlock,
      'sourceBlock',
      'xorSourceToPrimeWhitened',
    );
    Validator.validateRequired(
      whiteners,
      'whiteners',
      'xorSourceToPrimeWhitened',
    );
    Validator.validateRequired(
      randomBlocks,
      'randomBlocks',
      'xorSourceToPrimeWhitened',
    );

    if (whiteners.length + randomBlocks.length + 1 !== TUPLE.SIZE) {
      throw new TupleError(TupleErrorType.InvalidBlockCount);
    }

    try {
      // Convert source data to Uint8Array
      const sourceData = await this.toUint8Array(sourceBlock.data);

      // Create a padded buffer initialized to zeros
      const paddedData = new Uint8Array(sourceBlock.blockSize);
      paddedData.set(sourceData);

      // XOR operations will be performed on the padded data
      const xoredData = new Uint8Array(paddedData);

      // XOR with whitening blocks
      for (const whitener of whiteners) {
        if (whitener.blockSize !== sourceBlock.blockSize) {
          throw new TupleError(TupleErrorType.BlockSizeMismatch);
        }
        const whitenerData = await this.toUint8Array(whitener.data);
        for (let i = 0; i < sourceBlock.blockSize; i++) {
          xoredData[i] ^= whitenerData[i];
        }
      }

      // XOR with random blocks
      for (const random of randomBlocks) {
        if (random.blockSize !== sourceBlock.blockSize) {
          throw new TupleError(TupleErrorType.BlockSizeMismatch);
        }
        const randomData = await this.toUint8Array(random.data);
        for (let i = 0; i < sourceBlock.blockSize; i++) {
          xoredData[i] ^= randomData[i];
        }
      }

      // Create whitened block with preserved length metadata
      const now = new Date();
      // Access metadata safely - it may not exist on all block types
      const lengthWithoutPadding =
        'metadata' in sourceBlock
          ? (sourceBlock as { metadata?: { lengthWithoutPadding?: number } })
              .metadata?.lengthWithoutPadding
          : undefined;
      return await WhitenedBlock.from(
        sourceBlock.blockSize,
        xoredData,
        undefined, // Let constructor calculate checksum
        now,
        lengthWithoutPadding, // Pass through original length if available
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
    sourceBlock: IBaseBlock | BlockHandle<BaseBlock>,
    whiteners: (WhitenedBlock | RandomBlock)[],
    randomBlocks: RandomBlock[],
  ): Promise<InMemoryBlockTuple<BaseBlock>> {
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
   * @param creator The member who created the block
   * @param primeWhitenedBlock The whitened block to recover
   * @param whiteners The whitening blocks used in the original XOR
   * @param randomBlocks Optional random blocks used in the original XOR
   * @returns An ephemeral block containing the recovered data
   * @throws {TupleError} If validation fails or XOR operation fails
   */
  public async xorDestPrimeWhitenedToOwned(
    creator: Member<TID>,
    primeWhitenedBlock: WhitenedBlock,
    whiteners: WhitenedBlock[],
    randomBlocks: RandomBlock[] = [],
  ): Promise<IEphemeralBlock<TID>> {
    // Validate required parameters
    Validator.validateRequired(
      creator,
      'creator',
      'xorDestPrimeWhitenedToOwned',
    );
    Validator.validateRequired(
      primeWhitenedBlock,
      'primeWhitenedBlock',
      'xorDestPrimeWhitenedToOwned',
    );
    Validator.validateRequired(
      whiteners,
      'whiteners',
      'xorDestPrimeWhitenedToOwned',
    );

    try {
      // Start with a padded buffer filled with cryptographically secure random data
      const result = randomBytes(primeWhitenedBlock.blockSize);

      // Get all block data upfront and ensure they're padded
      const primeData = await this.toUint8Array(primeWhitenedBlock.data);
      const whitenerData = await Promise.all(
        whiteners.map(async (w) => {
          const data = await this.toUint8Array(w.data);
          const padded = randomBytes(primeWhitenedBlock.blockSize);
          padded.set(
            data.subarray(
              0,
              Math.min(data.length, primeWhitenedBlock.blockSize),
            ),
          );
          return padded;
        }),
      );
      const randomData = await Promise.all(
        randomBlocks.map(async (r) => {
          const data = await this.toUint8Array(r.data);
          const padded = randomBytes(primeWhitenedBlock.blockSize);
          padded.set(
            data.subarray(
              0,
              Math.min(data.length, primeWhitenedBlock.blockSize),
            ),
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
      result.set(
        primeData.subarray(
          0,
          Math.min(primeData.length, primeWhitenedBlock.blockSize),
        ),
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
      return await EphemeralBlock.from<TID>(
        BlockType.EphemeralOwnedDataBlock,
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
    creator: Member<TID>,
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
    creator: Member<TID>,
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): Promise<ConstituentBlockListBlock> {
    const ownedBlock = await this.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitened,
      whiteners,
    );

    return new ConstituentBlockListBlock<TID>(
      ownedBlock.data,
      creator,
    ) as ConstituentBlockListBlock<Uint8Array>;
  }

  /**
   * XOR an encrypted whitened block with its whitening blocks and decrypt to recover a CBL
   */
  public async xorPrimeWhitenedEncryptedToCbl(
    creator: Member<TID>,
    primeWhitened: WhitenedBlock,
    whiteners: WhitenedBlock[],
  ): Promise<ConstituentBlockListBlock<TID>> {
    const ownedBlock = await this.xorDestPrimeWhitenedToOwned(
      creator,
      primeWhitened,
      whiteners,
    );

    const encryptedBlock =
      await ServiceLocator.getServiceProvider<TID>().blockService.encrypt(
        BlockType.EncryptedOwnedDataBlock,
        ownedBlock,
        creator,
      );
    if (!(encryptedBlock instanceof EncryptedBlock)) {
      throw new TupleError(TupleErrorType.InvalidBlockType);
    }

    const decryptedBlock =
      await ServiceLocator.getServiceProvider<TID>().blockService.decrypt(
        creator,
        encryptedBlock,
        BlockType.EphemeralOwnedDataBlock,
      );
    return new ConstituentBlockListBlock(decryptedBlock.data, creator);
  }

  /**
   * Process a data stream into tuples and create a CBL
   * @param creator The member creating the CBL
   * @param blockSize The block size to use
   * @param source The source data stream
   * @param sourceLength The length of the source data
   * @param whitenedBlockSource Function to get whitened blocks
   * @param randomBlockSource Function to get random blocks
   * @param persistTuple Function to persist each tuple
   * @returns A tuple containing the CBL
   * @throws {TupleError} If validation fails or processing fails
   */
  public async dataStreamToPlaintextTuplesAndCBL(
    creator: Member<TID>,
    blockSize: BlockSize,
    source: Readable,
    sourceLength: number,
    whitenedBlockSource: () => WhitenedBlock | undefined,
    randomBlockSource: () => RandomBlock,
    persistTuple: (tuple: InMemoryBlockTuple) => Promise<void>,
  ): Promise<InMemoryBlockTuple> {
    const now = new Date();
    // Validate required parameters
    Validator.validateRequired(
      creator,
      'creator',
      'dataStreamToPlaintextTuplesAndCBL',
    );
    Validator.validateRequired(
      source,
      'source',
      'dataStreamToPlaintextTuplesAndCBL',
    );
    Validator.validateRequired(
      whitenedBlockSource,
      'whitenedBlockSource',
      'dataStreamToPlaintextTuplesAndCBL',
    );
    Validator.validateRequired(
      randomBlockSource,
      'randomBlockSource',
      'dataStreamToPlaintextTuplesAndCBL',
    );
    Validator.validateRequired(
      persistTuple,
      'persistTuple',
      'dataStreamToPlaintextTuplesAndCBL',
    );
    Validator.validateBlockSize(blockSize, 'dataStreamToPlaintextTuplesAndCBL');

    if (sourceLength <= 0) {
      throw new TupleError(TupleErrorType.InvalidSourceLength);
    }

    try {
      // Set up processing pipeline
      const blockPaddingTransform = new BlockPaddingTransform(blockSize);
      const tupleGeneratorStream = new PrimeTupleGeneratorStream(
        blockSize,
        creator,
        whitenedBlockSource,
        randomBlockSource,
      );

      source.pipe(blockPaddingTransform).pipe(tupleGeneratorStream);

      // Process tuples
      let blockIDs: Uint8Array = new Uint8Array(0);
      let blockIDCount = 0;

      await new Promise<void>((resolve, reject) => {
        tupleGeneratorStream.on('data', async (tuple: InMemoryBlockTuple) => {
          try {
            await persistTuple(tuple);
            const newBlockIDs = new Uint8Array(
              blockIDs.length + tuple.blockIdsBuffer.length,
            );
            newBlockIDs.set(blockIDs);
            newBlockIDs.set(tuple.blockIdsBuffer, blockIDs.length);
            blockIDs = newBlockIDs;
            blockIDCount += tuple.blocks.length;
          } catch (error) {
            reject(error);
          }
        });

        tupleGeneratorStream.on('end', resolve);
        tupleGeneratorStream.on('error', reject);
      });

      const headerData = this.cblService.makeCblHeader(
        creator,
        now,
        blockIDCount,
        sourceLength,
        blockIDs,
        blockSize,
        BlockEncryptionType.None,
      ).headerData;

      const data = new Uint8Array(headerData.length + blockIDs.length);
      data.set(headerData);
      data.set(blockIDs, headerData.length);
      const checksum = this.checksumService.calculateChecksum(data);
      // Create CBL
      const cbl = new ConstituentBlockListBlock(data, creator);

      // Convert CBL to OwnedDataBlock for tuple creation
      const ownedBlock = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
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

      const whiteners: (WhitenedBlock | RandomBlock)[] = [];
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
   * @param creator The member creating the CBL
   * @param blockSize The block size to use
   * @param source The source data stream
   * @param sourceLength The length of the source data
   * @param whitenedBlockSource Function to get whitened blocks
   * @param randomBlockSource Function to get random blocks
   * @param persistTuple Function to persist each tuple
   * @returns A tuple containing the encrypted CBL
   * @throws {TupleError} If validation fails or processing fails
   */
  public async dataStreamToEncryptedTuplesAndCBL(
    creator: Member<TID>,
    blockSize: BlockSize,
    source: Readable,
    sourceLength: number,
    whitenedBlockSource: () => WhitenedBlock | undefined,
    randomBlockSource: () => RandomBlock,
    persistTuple: (tuple: InMemoryBlockTuple) => Promise<void>,
  ): Promise<InMemoryBlockTuple> {
    const dateCreated = new Date();
    // Validate required parameters
    Validator.validateRequired(
      creator,
      'creator',
      'dataStreamToEncryptedTuplesAndCBL',
    );
    Validator.validateRequired(
      source,
      'source',
      'dataStreamToEncryptedTuplesAndCBL',
    );
    Validator.validateRequired(
      whitenedBlockSource,
      'whitenedBlockSource',
      'dataStreamToEncryptedTuplesAndCBL',
    );
    Validator.validateRequired(
      randomBlockSource,
      'randomBlockSource',
      'dataStreamToEncryptedTuplesAndCBL',
    );
    Validator.validateRequired(
      persistTuple,
      'persistTuple',
      'dataStreamToEncryptedTuplesAndCBL',
    );
    Validator.validateBlockSize(blockSize, 'dataStreamToEncryptedTuplesAndCBL');

    if (sourceLength <= 0) {
      throw new TupleError(TupleErrorType.InvalidSourceLength);
    }

    try {
      // Set up encryption pipeline
      const tupleGeneratorStream = new PrimeTupleGeneratorStream(
        blockSize,
        creator,
        whitenedBlockSource,
        randomBlockSource,
      );

      source.pipe(tupleGeneratorStream);

      // Process tuples
      let blockIDs: Uint8Array = new Uint8Array(0);

      await new Promise<void>((resolve, reject) => {
        tupleGeneratorStream.on('data', async (tuple: InMemoryBlockTuple) => {
          try {
            await persistTuple(tuple);
            const newBlockIDs = new Uint8Array(
              blockIDs.length + tuple.blockIdsBuffer.length,
            );
            newBlockIDs.set(blockIDs);
            newBlockIDs.set(tuple.blockIdsBuffer, blockIDs.length);
            blockIDs = newBlockIDs;
          } catch (error) {
            reject(error);
          }
        });

        tupleGeneratorStream.on('end', resolve);
        tupleGeneratorStream.on('error', reject);
      });
      const cblHeader = this.cblService.makeCblHeader(
        creator,
        dateCreated,
        blockIDs.length,
        sourceLength,
        blockIDs,
        blockSize,
        BlockEncryptionType.None,
      );
      const data = new Uint8Array(
        cblHeader.headerData.length + blockIDs.length,
      );
      data.set(cblHeader.headerData);
      data.set(blockIDs, cblHeader.headerData.length);
      const checksum = this.checksumService.calculateChecksum(data);

      // Create and encrypt CBL
      const cbl = new ConstituentBlockListBlock(data, creator);

      const ownedBlock = await EphemeralBlock.from<TID>(
        BlockType.EphemeralOwnedDataBlock,
        BlockDataType.RawData,
        blockSize,
        cbl.data,
        checksum,
        creator,
        new Date(),
        cbl.data.length,
      );

      const encryptedCbl =
        await ServiceLocator.getServiceProvider<TID>().blockService.encrypt(
          BlockType.EncryptedConstituentBlockListBlock,
          ownedBlock,
          creator,
        );

      // Create tuple for encrypted CBL
      const randomBlocks: RandomBlock[] = [];
      for (let i = 0; i < TUPLE.RANDOM_BLOCKS_PER_TUPLE; i++) {
        const block = randomBlockSource();
        if (!block) {
          throw new TupleError(TupleErrorType.RandomBlockGenerationFailed);
        }
        randomBlocks.push(block);
      }

      const whiteners: (WhitenedBlock | RandomBlock)[] = [];
      for (let i = TUPLE.RANDOM_BLOCKS_PER_TUPLE; i < TUPLE.SIZE - 1; i++) {
        const block = whitenedBlockSource() ?? randomBlockSource();
        if (!block) {
          throw new TupleError(TupleErrorType.WhiteningBlockGenerationFailed);
        }
        whiteners.push(block);
      }

      const primeBlock = await this.xorSourceToPrimeWhitened(
        encryptedCbl as unknown as EncryptedBlock,
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
