import { Transform, TransformCallback, TransformOptions } from 'stream';
import { EphemeralBlock } from './blocks/ephemeral';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { RandomBlock } from './blocks/random';
import { WhitenedBlock } from './blocks/whitened';
import { BrightChainMember } from './brightChainMember';
import { TUPLE } from './constants';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { StreamErrorType } from './enumerations/streamErrorType';
import { InvalidTupleCountError } from './errors/invalidTupleCount';
import { StreamError } from './errors/streamError';
import { ServiceProvider } from './services/service.provider';

/**
 * PrimeTupleGeneratorStream transforms input data into tuples of blocks.
 * In the Owner Free Filesystem (OFF), data privacy is achieved by:
 * 1. Breaking input data into fixed-size blocks
 * 2. XORing each block with random blocks and whitening blocks
 * 3. Creating tuples that contain:
 *    - The XORed data block
 *    - Random blocks for privacy
 *    - Whitening blocks for data recovery
 *
 * This stream:
 * 1. Buffers input data until a full block can be created
 * 2. Creates a data block from the buffered data
 * 3. Combines it with random and whitening blocks
 * 4. Outputs the resulting tuple
 */
export class PrimeTupleGeneratorStream extends Transform {
  private readonly blockSize: BlockSize;
  private readonly creator: BrightChainMember;
  private buffer: Buffer;
  private readonly randomBlockSource: () => RandomBlock;
  private readonly whitenedBlockSource: () => WhitenedBlock | undefined;

  constructor(
    blockSize: BlockSize,
    creator: BrightChainMember,
    whitenedBlockSource: () => WhitenedBlock | undefined,
    randomBlockSource: () => RandomBlock,
    options?: TransformOptions,
  ) {
    super({ ...options, objectMode: true }); // Ensure objectMode is true

    // Validate parameters
    if (!blockSize) {
      throw new StreamError(StreamErrorType.BlockSizeRequired);
    }

    if (!whitenedBlockSource) {
      throw new StreamError(StreamErrorType.WhitenedBlockSourceRequired);
    }

    if (!randomBlockSource) {
      throw new StreamError(StreamErrorType.RandomBlockSourceRequired);
    }

    this.blockSize = blockSize;
    this.creator = creator;
    this.buffer = Buffer.alloc(0);
    this.randomBlockSource = randomBlockSource;
    this.whitenedBlockSource = whitenedBlockSource;
  }

  public override async _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): Promise<void> {
    try {
      // Validate chunk
      if (!Buffer.isBuffer(chunk)) {
        throw new StreamError(StreamErrorType.InputMustBeBuffer);
      }

      // Add chunk to buffer
      this.buffer = Buffer.concat([this.buffer, chunk]);

      // Process complete blocks
      while (this.buffer.length >= this.blockSize) {
        await this.makeTuple();
      }

      callback();
    } catch (error) {
      callback(
        error instanceof Error
          ? error
          : new Error('Unknown error in transform'),
      );
    }
  }

  private async makeTuple(): Promise<void> {
    if (this.buffer.length < this.blockSize) {
      return;
    }

    try {
      // Create data block
      const blockData = this.buffer.subarray(0, this.blockSize);
      this.buffer = this.buffer.subarray(this.blockSize);

      const sourceBlock = await EphemeralBlock.from(
        BlockType.EphemeralOwnedDataBlock,
        BlockDataType.RawData,
        this.blockSize,
        blockData,
        ServiceProvider.getInstance().checksumService.calculateChecksum(
          blockData,
        ),
        this.creator,
        new Date(),
        blockData.length,
      );

      // Get random blocks
      const randomBlocks: RandomBlock[] = [];
      for (let i = 0; i < TUPLE.RANDOM_BLOCKS_PER_TUPLE; i++) {
        const block = this.randomBlockSource();
        if (!block) {
          throw new StreamError(StreamErrorType.FailedToGetRandomBlock);
        }
        randomBlocks.push(block);
      }

      // Get whitening blocks (or random blocks if whitening not available)
      const whiteners: WhitenedBlock[] = [];
      for (let i = TUPLE.RANDOM_BLOCKS_PER_TUPLE; i < TUPLE.SIZE - 1; i++) {
        const block = this.whitenedBlockSource() ?? this.randomBlockSource();
        if (!block) {
          throw new StreamError(StreamErrorType.FailedToGetWhiteningBlock);
        }
        whiteners.push(block);
      }

      // Create and validate tuple
      const blockCount = randomBlocks.length + whiteners.length + 1;
      if (blockCount !== TUPLE.SIZE) {
        throw new InvalidTupleCountError(blockCount);
      }

      // XOR blocks together
      const xoredData = Buffer.from(sourceBlock.data);
      for (const block of [...randomBlocks, ...whiteners]) {
        const blockData = block.data;
        for (let i = 0; i < xoredData.length; i++) {
          xoredData[i] ^= blockData[i];
        }
      }

      // Create tuple
      const tuple = new InMemoryBlockTuple([
        sourceBlock,
        ...randomBlocks,
        ...whiteners,
      ]);

      this.push(tuple);
    } catch (error) {
      this.destroy(
        error instanceof Error
          ? error
          : new Error('Unknown error in makeTuple'),
      );
    }
  }

  public override async _flush(callback: TransformCallback): Promise<void> {
    try {
      // Process any remaining complete blocks
      while (this.buffer.length >= this.blockSize) {
        await this.makeTuple();
      }

      // Handle any remaining data
      if (this.buffer.length > 0) {
        // Pad the last block with zeros
        const paddedData = Buffer.alloc(this.blockSize);
        this.buffer.copy(paddedData);
        this.buffer = paddedData;
        await this.makeTuple();
      }

      callback();
    } catch (error) {
      callback(
        error instanceof Error ? error : new Error('Unknown error in flush'),
      );
    }
  }
}
