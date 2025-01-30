import { Transform, TransformCallback, TransformOptions } from 'stream';
import { InMemoryBlockTuple } from './blocks/memoryTuple';
import { OwnedDataBlock } from './blocks/ownedData';
import { RandomBlock } from './blocks/random';
import { WhitenedBlock } from './blocks/whitened';
import { RANDOM_BLOCKS_PER_TUPLE, TUPLE_SIZE } from './constants';
import { BlockDataType } from './enumerations/blockDataType';
import { BlockSize } from './enumerations/blockSizes';
import { BlockType } from './enumerations/blockType';
import { InvalidTupleCountError } from './errors/invalidTupleCount';
import { GuidV4 } from './guid';
import { StaticHelpersChecksum } from './staticHelpers.checksum';

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
  private buffer: Buffer;
  private readonly randomBlockSource: () => RandomBlock;
  private readonly whitenedBlockSource: () => WhitenedBlock | undefined;

  constructor(
    blockSize: BlockSize,
    whitenedBlockSource: () => WhitenedBlock | undefined,
    randomBlockSource: () => RandomBlock,
    options?: TransformOptions,
  ) {
    super({ ...options, objectMode: true }); // Ensure objectMode is true

    // Validate parameters
    if (!blockSize) {
      throw new Error('Block size is required');
    }

    if (!whitenedBlockSource) {
      throw new Error('Whitened block source is required');
    }

    if (!randomBlockSource) {
      throw new Error('Random block source is required');
    }

    this.blockSize = blockSize;
    this.buffer = Buffer.alloc(0);
    this.randomBlockSource = randomBlockSource;
    this.whitenedBlockSource = whitenedBlockSource;
  }

  public override _transform(
    chunk: Buffer,
    encoding: BufferEncoding,
    callback: TransformCallback,
  ): void {
    try {
      // Validate chunk
      if (!Buffer.isBuffer(chunk)) {
        throw new Error('Input must be a buffer');
      }

      // Add chunk to buffer
      this.buffer = Buffer.concat([this.buffer, chunk]);

      // Process complete blocks
      while (this.buffer.length >= this.blockSize) {
        this.makeTuple();
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

      const sourceBlock = await OwnedDataBlock.from(
        BlockType.OwnedDataBlock,
        BlockDataType.RawData,
        this.blockSize,
        blockData,
        StaticHelpersChecksum.calculateChecksum(blockData),
        GuidV4.new(), // Anonymous creator
        new Date(),
        blockData.length,
      );

      // Get random blocks
      const randomBlocks: RandomBlock[] = [];
      for (let i = 0; i < RANDOM_BLOCKS_PER_TUPLE; i++) {
        const block = this.randomBlockSource();
        if (!block) {
          throw new Error('Failed to get random block');
        }
        randomBlocks.push(block);
      }

      // Get whitening blocks (or random blocks if whitening not available)
      const whiteners: WhitenedBlock[] = [];
      for (let i = RANDOM_BLOCKS_PER_TUPLE; i < TUPLE_SIZE - 1; i++) {
        const block = this.whitenedBlockSource() ?? this.randomBlockSource();
        if (!block) {
          throw new Error('Failed to get whitening/random block');
        }
        whiteners.push(block);
      }

      // Create and validate tuple
      const blockCount = randomBlocks.length + whiteners.length + 1;
      if (blockCount !== TUPLE_SIZE) {
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

  public override _flush(callback: TransformCallback): void {
    try {
      // Process any remaining complete blocks
      while (this.buffer.length >= this.blockSize) {
        this.makeTuple();
      }

      // Handle any remaining data
      if (this.buffer.length > 0) {
        // Pad the last block with zeros
        const paddedData = Buffer.alloc(this.blockSize);
        this.buffer.copy(paddedData);
        this.buffer = paddedData;
        this.makeTuple();
      }

      callback();
    } catch (error) {
      callback(
        error instanceof Error ? error : new Error('Unknown error in flush'),
      );
    }
  }
}
