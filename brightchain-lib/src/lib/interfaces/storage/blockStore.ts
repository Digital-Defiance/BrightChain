import { ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { BaseBlock } from '../../blocks/base';
import { BlockHandle } from '../../blocks/handle';
import { RawDataBlock } from '../../blocks/rawData';
import { BlockSize } from '../../enumerations/blockSize';

/**
 * Base interface for block storage operations
 */
export interface IBlockStore {
  /**
   * The block size for this store
   */
  readonly blockSize: BlockSize;

  /**
   * Check if a block exists
   */
  has(key: ChecksumUint8Array | string): Promise<boolean>;

  /**
   * Get a block's data
   */
  getData(key: ChecksumUint8Array): Promise<RawDataBlock>;

  /**
   * Store a block's data
   */
  setData(block: RawDataBlock): Promise<void>;

  /**
   * Delete a block's data
   */
  deleteData(key: ChecksumUint8Array): Promise<void>;

  /**
   * Get random block checksums from the store
   */
  getRandomBlocks(count: number): Promise<ChecksumUint8Array[]>;

  /**
   * Get a handle to a block (for compatibility with existing code)
   */
  get<T extends BaseBlock>(checksum: ChecksumUint8Array | string): BlockHandle<T>;

  /**
   * Store raw data with a key (convenience method)
   */
  put(key: ChecksumUint8Array | string, data: Uint8Array): Promise<void>;

  /**
   * Delete a block (convenience method, alias for deleteData)
   */
  delete(key: ChecksumUint8Array | string): Promise<void>;
}
