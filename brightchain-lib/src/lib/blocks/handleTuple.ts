import { TUPLE_SIZE } from '../constants';
import { IBlockMetadata } from '../interfaces/blockMetadata';
import { StaticHelpersChecksum } from '../staticHelpers.checksum';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
import { ChecksumBuffer } from '../types';
import { BlockHandle } from './handle';
import { RawDataBlock } from './rawData';

/**
 * A tuple of block handles that can be XORed together.
 * Used for whitening and reconstruction operations.
 */
export class BlockHandleTuple {
  private readonly _handles: BlockHandle[];

  constructor(handles: BlockHandle[]) {
    if (handles.length !== TUPLE_SIZE) {
      throw new Error(`Tuple size must be ${TUPLE_SIZE}`);
    }

    // Verify all blocks have the same size
    const blockSize = handles[0].blockSize;
    if (!handles.every((h) => h.blockSize === blockSize)) {
      throw new Error('All blocks in tuple must have the same size');
    }

    this._handles = handles;
  }

  /**
   * The handles in this tuple
   */
  public get handles(): BlockHandle[] {
    return this._handles;
  }

  /**
   * The block IDs as a concatenated buffer
   */
  public get blockIdsBuffer(): Buffer {
    return Buffer.concat(this.blockIds);
  }

  /**
   * The block IDs in this tuple
   */
  public get blockIds(): ChecksumBuffer[] {
    return this.handles.map((handle) => handle.idChecksum);
  }

  /**
   * XOR all blocks in the tuple and store the result
   * @param diskBlockStore - The store to write the result to
   * @param destBlockMetadata - Metadata for the resulting block
   * @returns A handle to the resulting block
   */
  public async xor(
    diskBlockStore: DiskBlockAsyncStore,
    destBlockMetadata: IBlockMetadata,
  ): Promise<BlockHandle> {
    if (!this.handles.length) {
      throw new Error('No blocks to XOR');
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
    let result = blockData[0];
    for (let i = 1; i < blockData.length; i++) {
      const current = blockData[i];
      if (current.length !== result.length) {
        throw new Error('Block sizes must match');
      }

      const xored = Buffer.alloc(result.length);
      for (let j = 0; j < result.length; j++) {
        xored[j] = result[j] ^ current[j];
      }
      result = xored;
    }

    // Calculate checksum for the result
    const checksum = StaticHelpersChecksum.calculateChecksum(result);

    // Create a RawDataBlock for the result with the provided metadata
    const block = new RawDataBlock(
      this.handles[0].blockSize,
      result,
      destBlockMetadata.dateCreated
        ? new Date(destBlockMetadata.dateCreated)
        : new Date(),
      checksum,
      (destBlockMetadata['canRead'] as boolean | undefined) ?? true,
      (destBlockMetadata['canPersist'] as boolean | undefined) ?? true,
    );

    // Store the result
    try {
      diskBlockStore.setData(block);
      return diskBlockStore.get(checksum);
    } catch (error) {
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
      const results = await Promise.all(
        this.handles.map((handle) => handle.verifyChecksum()),
      );
      return results.every((result) => result);
    } catch {
      return false;
    }
  }
}
