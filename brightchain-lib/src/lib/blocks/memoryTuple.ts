import { Readable } from 'stream';
import { BlockMetadata } from '../blockMetadata';
import { TUPLE_SIZE } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSizes';
import { BlockType } from '../enumerations/blockType';
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
   * Convert a Readable stream to a Buffer
   * @param readable - The readable stream to convert
   * @returns Promise that resolves to a Buffer
   */
  private static async streamToBuffer(readable: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of readable) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  /**
   * Convert data to Buffer regardless of whether it's a Readable or Buffer
   * @param data - The data to convert
   * @returns Promise that resolves to a Buffer
   */
  private static async toBuffer(data: Readable | Buffer): Promise<Buffer> {
    if (Buffer.isBuffer(data)) {
      return data;
    }
    return InMemoryBlockTuple.streamToBuffer(data);
  }

  /**
   * XOR all blocks together
   * @returns A new RawDataBlock containing the XOR result
   */
  public async xor(): Promise<RawDataBlock> {
    if (!this._blocks.length) {
      throw new Error('No blocks to XOR');
    }

    try {
      // Load and copy first block's data
      const result = Buffer.alloc(
        (await InMemoryBlockTuple.toBuffer(this._blocks[0].data)).length,
      );
      (await InMemoryBlockTuple.toBuffer(this._blocks[0].data)).copy(result);

      // XOR with remaining blocks
      for (let i = 1; i < this._blocks.length; i++) {
        const currentData = await InMemoryBlockTuple.toBuffer(
          this._blocks[i].data,
        );

        if (currentData.length !== result.length) {
          throw new Error('Block sizes must match');
        }

        // XOR in place
        for (let j = 0; j < result.length; j++) {
          result[j] ^= currentData[j];
        }
      }

      // Create new block with XOR result
      return new RawDataBlock(
        this._blockSize,
        result,
        new Date(),
        undefined, // Let constructor calculate checksum
        BlockType.RawData,
        BlockDataType.RawData,
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
  public static async fromIds(
    blockIDs: ChecksumBuffer[],
    blockSize: BlockSize,
    getBlockPath: (id: ChecksumBuffer) => string,
  ): Promise<InMemoryBlockTuple> {
    if (blockIDs.length !== TUPLE_SIZE) {
      throw new Error(`Expected ${TUPLE_SIZE} block IDs`);
    }

    const handles = await Promise.all(
      blockIDs.map(
        (id: ChecksumBuffer) =>
          new BlockHandle(
            BlockType.Handle,
            BlockDataType.RawData,
            id,
            new BlockMetadata(
              blockSize,
              BlockType.Handle,
              BlockDataType.RawData,
              blockSize as number,
            ),
            true,
            true,
          ),
      ),
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
