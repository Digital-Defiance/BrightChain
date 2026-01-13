import { Readable } from '../browserStream';
import { TUPLE } from '../constants';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { MemoryTupleErrorType } from '../enumerations/memoryTupleErrorType';
import { MemoryTupleError } from '../errors/memoryTupleError';
import { IBaseBlock } from '../interfaces/blocks/base';
import { type BlockHandle } from './handle';
import { RawDataBlock } from './rawData';

/**
 * InMemoryBlockTuple represents a tuple of blocks that can be XORed together.
 * In the Owner Free Filesystem (OFF), tuples are used for:
 * 1. Data blocks XORed with random blocks for privacy
 * 2. Parity blocks XORed for error correction
 *
 * This class supports both:
 * 1. In-memory blocks (IBaseBlock derivatives) for immediate operations
 * 2. Disk-based blocks (BlockHandle) for persistent storage
 */
export class InMemoryBlockTuple {
  public static readonly TupleSize = TUPLE.SIZE;

  private readonly _blocks: (IBaseBlock | BlockHandle<any>)[];
  private readonly _blockSize: BlockSize;

  constructor(blocks: (IBaseBlock | BlockHandle<any>)[]) {
    if (blocks.length !== TUPLE.SIZE) {
      throw new MemoryTupleError(
        MemoryTupleErrorType.InvalidTupleSize,
        TUPLE.SIZE,
      );
    }

    // Verify all blocks have the same size
    this._blockSize = blocks[0].blockSize;
    if (!blocks.every((b) => b.blockSize === this._blockSize)) {
      throw new MemoryTupleError(MemoryTupleErrorType.BlockSizeMismatch);
    }

    this._blocks = blocks;
  }

  /**
   * Get the block IDs in this tuple
   */
  public get blockIds(): ChecksumUint8Array[] {
    return this._blocks.map((block) => block.idChecksum);
  }

  /**
   * Get the block IDs as a concatenated buffer
   */
  public get blockIdsBuffer(): Uint8Array {
    const totalLength = this.blockIds.reduce((sum, id) => sum + id.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const id of this.blockIds) {
      result.set(id, offset);
      offset += id.length;
    }
    return result;
  }

  /**
   * Get the blocks in this tuple
   */
  public get blocks(): (IBaseBlock | BlockHandle<any>)[] {
    return this._blocks;
  }

  /**
   * Get the block size for this tuple
   */
  public get blockSize(): BlockSize {
    return this._blockSize;
  }

  /**
   * Convert a Readable stream to a Uint8Array
   * @param readable - The readable stream to convert
   * @returns Promise that resolves to a Uint8Array
   */
  private static async streamToUint8Array(readable: Readable): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of readable) {
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
   * Convert data to Uint8Array regardless of whether it's a Readable or Uint8Array
   * @param data - The data to convert
   * @returns Promise that resolves to a Uint8Array
   */
  private static async toUint8Array(data: Readable | Uint8Array): Promise<Uint8Array> {
    if (data instanceof Uint8Array) {
      return data;
    }
    return InMemoryBlockTuple.streamToUint8Array(data);
  }

  /**
   * XOR all blocks together
   * @returns A new RawDataBlock containing the XOR result
   */
  public async xor(): Promise<RawDataBlock> {
    if (!this._blocks.length) {
      throw new MemoryTupleError(MemoryTupleErrorType.NoBlocksToXor);
    }

    try {
      // Load and copy first block's data
      const firstBlockData = await InMemoryBlockTuple.toUint8Array(this._blocks[0].data);
      const result = new Uint8Array(firstBlockData);

      // XOR with remaining blocks
      for (let i = 1; i < this._blocks.length; i++) {
        const currentData = await InMemoryBlockTuple.toUint8Array(
          this._blocks[i].data,
        );

        if (currentData.length !== result.length) {
          throw new MemoryTupleError(MemoryTupleErrorType.BlockSizeMismatch);
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
      if (error instanceof MemoryTupleError) {
        throw error;
      }
      throw new MemoryTupleError(MemoryTupleErrorType.InvalidBlockCount);
    }
  }

  /**
   * Create a tuple from block IDs
   * This creates disk-based blocks using BlockHandle
   */
  public static async fromIds(
    blockIDs: ChecksumUint8Array[],
    blockSize: BlockSize,
    getBlockPath: (id: ChecksumUint8Array) => string,
  ): Promise<InMemoryBlockTuple> {
    if (blockIDs.length !== TUPLE.SIZE) {
      throw new MemoryTupleError(
        MemoryTupleErrorType.ExpectedBlockIds,
        TUPLE.SIZE,
      );
    }

    const handles = await Promise.all(
      blockIDs.map((id: ChecksumUint8Array) => {
        // @ts-expect-error - BlockHandle constructor workaround
        return new (BlockHandle as any)(
          getBlockPath(id),
          blockSize,
          id,
          true, // canRead
          true, // canPersist
        );
      }),
    );

    return new InMemoryBlockTuple(handles);
  }

  /**
   * Create a tuple from blocks
   * This creates in-memory blocks
   */
  public static fromBlocks(
    blocks: (IBaseBlock | BlockHandle<any>)[],
  ): InMemoryBlockTuple {
    if (blocks.length !== TUPLE.SIZE) {
      throw new MemoryTupleError(
        MemoryTupleErrorType.ExpectedBlocks,
        TUPLE.SIZE,
      );
    }

    return new InMemoryBlockTuple(blocks);
  }
}
