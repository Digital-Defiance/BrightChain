import { TUPLE_SIZE } from '../constants';
import { BlockSize } from '../enumerations/blockSizes';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';
import { BlockHandle } from './handle';
import { RawDataBlock } from './rawData';

/**
 * InMemoryBlockTuple represents a tuple of blocks that can be XORed together.
 * In the Owner Free Filesystem (OFF), tuples are used for:
 * 1. Data blocks XORed with random blocks for privacy
 * 2. Parity blocks XORed for error correction
 *
 * This class supports both:
 * 1. In-memory blocks (BaseBlock derivatives) for immediate operations
 * 2. Disk-based blocks (BlockHandle) for persistent storage
 */
export class InMemoryBlockTuple {
  public static readonly TupleSize = TUPLE_SIZE;

  private readonly _blocks: (BaseBlock | BlockHandle)[];
  private readonly _blockSize: BlockSize;

  constructor(blocks: (BaseBlock | BlockHandle)[]) {
    if (blocks.length !== TUPLE_SIZE) {
      throw new Error(`Tuple must have ${TUPLE_SIZE} blocks`);
    }

    // Verify all blocks have the same size
    this._blockSize = blocks[0].blockSize;
    if (!blocks.every((b) => b.blockSize === this._blockSize)) {
      throw new Error('All blocks in tuple must have the same size');
    }

    this._blocks = blocks;
  }

  /**
   * Get the block IDs in this tuple
   */
  public get blockIds(): ChecksumBuffer[] {
    return this._blocks.map((block) => block.idChecksum);
  }

  /**
   * Get the block IDs as a concatenated buffer
   */
  public get blockIdsBuffer(): Buffer {
    return Buffer.concat(this.blockIds);
  }

  /**
   * Get the blocks in this tuple
   */
  public get blocks(): (BaseBlock | BlockHandle)[] {
    return this._blocks;
  }

  /**
   * Get the block size for this tuple
   */
  public get blockSize(): BlockSize {
    return this._blockSize;
  }

  /**
   * XOR all blocks together
   * @returns A new RawDataBlock containing the XOR result
   */
  public xor(): RawDataBlock {
    if (!this._blocks.length) {
      throw new Error('No blocks to XOR');
    }

    try {
      // Load and copy first block's data
      const result = Buffer.from(this._blocks[0].data);

      // XOR with remaining blocks
      for (let i = 1; i < this._blocks.length; i++) {
        const current = this._blocks[i].data;

        if (current.length !== result.length) {
          throw new Error('Block sizes must match');
        }

        // XOR in place
        for (let j = 0; j < result.length; j++) {
          result[j] ^= current[j];
        }
      }

      // Create new block with XOR result
      return new RawDataBlock(
        this._blockSize,
        result,
        new Date(),
        undefined, // Let constructor calculate checksum
        true, // canRead
        true, // canPersist
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
   * Create a tuple from block IDs
   * This creates disk-based blocks using BlockHandle
   */
  public static fromIds(
    blockIDs: ChecksumBuffer[],
    blockSize: BlockSize,
    getBlockPath: (id: ChecksumBuffer) => string,
  ): InMemoryBlockTuple {
    if (blockIDs.length !== TUPLE_SIZE) {
      throw new Error(`Expected ${TUPLE_SIZE} block IDs`);
    }

    const handles = blockIDs.map(
      (id) => new BlockHandle(id, blockSize, getBlockPath(id)),
    );

    return new InMemoryBlockTuple(handles);
  }

  /**
   * Create a tuple from blocks
   * This creates in-memory blocks
   */
  public static fromBlocks(
    blocks: (BaseBlock | BlockHandle)[],
  ): InMemoryBlockTuple {
    if (blocks.length !== TUPLE_SIZE) {
      throw new Error(`Expected ${TUPLE_SIZE} blocks`);
    }

    return new InMemoryBlockTuple(blocks);
  }
}
