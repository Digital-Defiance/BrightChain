import { Readable } from 'stream';
import { TUPLE } from '../constants';
import BlockDataType from '../enumerations/blockDataType';
import BlockType from '../enumerations/blockType';
import { HandleTupleErrorType } from '../enumerations/handleTupleErrorType';
import { HandleTupleError } from '../errors/handleTupleError';
import { IBaseBlockMetadata } from '../interfaces/blocks/metadata/blockMetadata';
import { ChecksumService } from '../services/checksum.service';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
import { ChecksumBuffer } from '../types';
import { BaseBlock } from './base';
import { BlockHandleType } from './handle';
import { RawDataBlock } from './rawData';

/**
 * A tuple of block handles that can be XORed together.
 * Used for whitening and reconstruction operations.
 */
export class BlockHandleTuple {
  private readonly _handles: BlockHandleType<BaseBlock>[];

  constructor(handles: BlockHandleType<BaseBlock>[]) {
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
  public get handles(): BlockHandleType<BaseBlock>[] {
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
   * @param checksumService - The checksum service to use
   * @param diskBlockStore - The store to write the result to
   * @param destBlockMetadata - Metadata for the resulting block
   * @returns A RawDataBlock containing the XOR result
   */
  public async xor(
    checksumService: ChecksumService,
    diskBlockStore: DiskBlockAsyncStore,
    destBlockMetadata: IBaseBlockMetadata,
  ): Promise<RawDataBlock> {
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
    // For Node.js streams
    async function streamToBuffer(readable: Readable): Promise<Buffer> {
      return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        readable.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        readable.on('end', () => resolve(Buffer.concat(chunks)));
        readable.on('error', reject);
      });
    }
    let result =
      blockData[0] instanceof Readable
        ? await streamToBuffer(blockData[0])
        : blockData[0];
    for (let i = 1; i < blockData.length; i++) {
      const bd = blockData[i];
      const current = bd instanceof Readable ? await streamToBuffer(bd) : bd;
      if (current.length !== result.length) {
        throw new HandleTupleError(HandleTupleErrorType.BlockSizesMustMatch);
      }

      const xored = Buffer.alloc(result.length);
      for (let j = 0; j < result.length; j++) {
        xored[j] = result[j] ^ current[j];
      }
      result = xored;
    }

    // Calculate checksum for the result using injected service
    const checksum = checksumService.calculateChecksum(result);

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
      await diskBlockStore.setData(block);
      return block;
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
      await Promise.all(this.handles.map((handle) => handle.validateAsync()));
      return true;
    } catch {
      return false;
    }
  }
}
