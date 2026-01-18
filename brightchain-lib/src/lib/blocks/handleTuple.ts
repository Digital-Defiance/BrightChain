import { TUPLE } from '../constants';
import BlockDataType from '../enumerations/blockDataType';
import BlockType from '../enumerations/blockType';
import { HandleTupleErrorType } from '../enumerations/handleTupleErrorType';
import { HandleTupleError } from '../errors/handleTupleError';
import { IBaseBlockMetadata } from '../interfaces/blocks/metadata/blockMetadata';
import { ServiceProvider } from '../services/service.provider';
import { Checksum } from '../types/checksum';
import { BaseBlock } from './base';
import { BlockHandle } from './handle';
import { RawDataBlock } from './rawData';

/**
 * Interface for stores that can store blocks
 */
interface IBlockStore {
  setData(block: RawDataBlock): Promise<void>;
  get<T extends BaseBlock>(checksum: Checksum): BlockHandle<T>;
}

/**
 * A tuple of block handles that can be XORed together.
 * Used for whitening and reconstruction operations.
 *
 * @typeParam T - The block type for handles in this tuple. Defaults to BaseBlock.
 *
 * @remarks
 * - All handles in a tuple must have the same block size
 * - The tuple size is fixed at TUPLE.SIZE (typically 3)
 * - XOR operations produce a new RawDataBlock
 *
 * @example
 * ```typescript
 * // Create a tuple of RawDataBlock handles
 * const tuple = new BlockHandleTuple<RawDataBlock>(handles);
 *
 * // XOR all blocks and store the result
 * const result = await tuple.xor(blockStore, metadata);
 *
 * // Verify all blocks in the tuple
 * const isValid = await tuple.verify();
 * ```
 *
 * @see {@link BlockHandle} - The handle type used in tuples
 * @see Requirements 3.1, 3.2
 */
export class BlockHandleTuple<T extends BaseBlock = BaseBlock> {
  private readonly _handles: BlockHandle<T>[];

  /**
   * Create a new BlockHandleTuple.
   *
   * @param handles - Array of block handles. Must have exactly TUPLE.SIZE elements.
   * @throws {HandleTupleError} If the number of handles is not TUPLE.SIZE
   * @throws {HandleTupleError} If handles have different block sizes
   */
  constructor(handles: BlockHandle<T>[]) {
    if (handles.length !== TUPLE.SIZE) {
      throw new HandleTupleError(HandleTupleErrorType.InvalidTupleSize);
    }

    // Verify all blocks have the same size
    const blockSize = handles[0].blockSize;
    if (!handles.every((h) => h.blockSize === blockSize)) {
      throw new HandleTupleError(HandleTupleErrorType.BlockSizeMismatch);
    }

    this._handles = handles;
  }

  /**
   * The handles in this tuple
   */
  public get handles(): BlockHandle<T>[] {
    return this._handles;
  }

  /**
   * The block IDs as a concatenated buffer
   */
  public get blockIdsBuffer(): Uint8Array {
    const blockIdArrays = this.blockIds.map((checksum) =>
      checksum.toUint8Array(),
    );
    const totalLength = blockIdArrays.reduce((sum, id) => sum + id.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;
    for (const id of blockIdArrays) {
      result.set(id, offset);
      offset += id.length;
    }
    return result;
  }

  /**
   * The block IDs in this tuple
   */
  public get blockIds(): Checksum[] {
    return this.handles.map((handle) => handle.idChecksum);
  }

  /**
   * XOR all blocks in the tuple and store the result
   * @param blockStore - The store to write the result to
   * @param destBlockMetadata - Metadata for the resulting block
   * @returns A handle to the resulting block
   */
  public async xor(
    blockStore: IBlockStore,
    destBlockMetadata: IBaseBlockMetadata,
  ): Promise<BlockHandle<RawDataBlock>> {
    if (!this.handles.length) {
      throw new HandleTupleError(HandleTupleErrorType.NoBlocksToXor);
    }

    // Load all block data
    const blockData = await Promise.all(
      this.handles.map(async (handle) => {
        try {
          return handle.data;
        } catch (error) {
          throw new Error(
            `Failed to load block ${handle.idChecksum}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
      }),
    );

    // XOR all blocks together
    let result = new Uint8Array(blockData[0] as Uint8Array);
    for (let i = 1; i < blockData.length; i++) {
      const current = blockData[i] as Uint8Array;
      if (current.length !== result.length) {
        throw new HandleTupleError(HandleTupleErrorType.BlockSizesMustMatch);
      }

      const xored = new Uint8Array(result.length);
      for (let j = 0; j < result.length; j++) {
        xored[j] = result[j] ^ current[j];
      }
      result = xored;
    }

    // Calculate checksum for the result
    const checksum =
      ServiceProvider.getInstance().checksumService.calculateChecksum(result);

    // Create a RawDataBlock for the result with the provided metadata
    const block = new RawDataBlock(
      this.handles[0].blockSize,
      result,
      destBlockMetadata.dateCreated
        ? new Date(destBlockMetadata.dateCreated)
        : new Date(),
      checksum,
      BlockType.RawData,
      BlockDataType.RawData,
      true,
      true,
    );

    // Store the result
    try {
      await blockStore.setData(block);
      return blockStore.get<RawDataBlock>(checksum);
    } catch (error) {
      // If block already exists, that's okay - just return a handle to it
      if (
        error instanceof Error &&
        (error.message.includes('already exists') ||
          error.message.includes('Error_StoreErrorBlockAlreadyExists'))
      ) {
        return blockStore.get<RawDataBlock>(checksum);
      }
      throw new Error(
        `Failed to store XOR result: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
      );
    }
  }

  /**
   * Verify all blocks in the tuple
   */
  public async verify(): Promise<boolean> {
    try {
      await Promise.all(this.handles.map((handle) => handle.validateAsync()));
      return true;
    } catch {
      return false;
    }
  }
}
