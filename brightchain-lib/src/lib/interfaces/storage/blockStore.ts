import { ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { BaseBlock } from '../../blocks/base';
import { BlockHandle } from '../../blocks/handle';
import { RawDataBlock } from '../../blocks/rawData';

/**
 * Base interface for block storage operations
 */
export interface IBlockStore {
  /**
   * Check if a block exists
   */
  has(key: ChecksumUint8Array): Promise<boolean>;

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
  get<T extends BaseBlock>(checksum: ChecksumUint8Array): BlockHandle<T>;
}
