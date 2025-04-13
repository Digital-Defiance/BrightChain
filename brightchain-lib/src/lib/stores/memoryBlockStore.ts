import {
  ChecksumUint8Array,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { BaseBlock } from '../blocks/base';
import { RawDataBlock } from '../blocks/rawData';
import { createBlockHandle, BlockHandle } from '../blocks/handle';
import { BlockSize } from '../enumerations/blockSize';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { IBlockStore } from '../interfaces/storage/blockStore';

/**
 * Browser-compatible in-memory block store using Uint8Array
 */
export class MemoryBlockStore implements IBlockStore {
  private readonly blocks = new Map<string, RawDataBlock>();
  private readonly _blockSize: BlockSize;

  constructor(blockSize: BlockSize) {
    this._blockSize = blockSize;
  }

  public get blockSize(): BlockSize {
    return this._blockSize;
  }

  /**
   * Check if a block exists
   */
  public async has(key: ChecksumUint8Array): Promise<boolean> {
    const keyHex = uint8ArrayToHex(key);
    return this.blocks.has(keyHex);
  }

  /**
   * Get a block's data
   */
  public async getData(key: ChecksumUint8Array): Promise<RawDataBlock> {
    const keyHex = uint8ArrayToHex(key);
    const block = this.blocks.get(keyHex);
    if (!block) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }
    return block;
  }

  /**
   * Store a block's data
   */
  public async setData(block: RawDataBlock): Promise<void> {
    if (block.blockSize !== this._blockSize) {
      throw new StoreError(StoreErrorType.BlockSizeMismatch);
    }

    const keyHex = uint8ArrayToHex(block.idChecksum);
    if (this.blocks.has(keyHex)) {
      throw new StoreError(StoreErrorType.BlockAlreadyExists);
    }

    try {
      block.validate();
    } catch {
      throw new StoreError(StoreErrorType.BlockValidationFailed);
    }

    this.blocks.set(keyHex, block);
  }

  /**
   * Delete a block's data
   */
  public async deleteData(key: ChecksumUint8Array): Promise<void> {
    const keyHex = uint8ArrayToHex(key);
    if (!this.blocks.has(keyHex)) {
      throw new StoreError(StoreErrorType.KeyNotFound);
    }
    this.blocks.delete(keyHex);
  }

  /**
   * Get random block checksums from the store
   */
  public async getRandomBlocks(count: number): Promise<ChecksumUint8Array[]> {
    const allKeys = Array.from(this.blocks.keys());
    const result: ChecksumUint8Array[] = [];

    const actualCount = Math.min(count, allKeys.length);
    const shuffled = [...allKeys].sort(() => Math.random() - 0.5);

    for (let i = 0; i < actualCount; i++) {
      const keyHex = shuffled[i];
      const keyBytes = new Uint8Array(keyHex.length / 2);
      for (let j = 0; j < keyBytes.length; j++) {
        keyBytes[j] = parseInt(keyHex.substr(j * 2, 2), 16);
      }
      result.push(keyBytes as ChecksumUint8Array);
    }

    return result;
  }

  /**
   * Store a block's data (alias for setData)
   */
  public async put(key: ChecksumUint8Array, data: Uint8Array): Promise<void> {
    const block = new RawDataBlock(this._blockSize, data);
    await this.setData(block);
  }

  /**
   * Delete a block (alias for deleteData)
   */
  public async delete(key: ChecksumUint8Array): Promise<void> {
    await this.deleteData(key);
  }

  /**
   * Generate a random ID
   */
  public static randomId(): string {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Clear all blocks
   */
  public clear(): void {
    this.blocks.clear();
  }

  /**
   * Get total number of blocks
   */
  public size(): number {
    return this.blocks.size;
  }

  /**
   * Get a handle to a block
   */
  public get<T extends BaseBlock>(key: ChecksumUint8Array): BlockHandle<T> {
    const keyHex = uint8ArrayToHex(key);
    const block = this.blocks.get(keyHex);
    if (!block) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: keyHex,
      });
    }
    return createBlockHandle(
      RawDataBlock as any,
      block.blockSize,
      block.data,
      key,
      block.canRead,
      block.canPersist,
    ) as BlockHandle<T>;
  }


}
