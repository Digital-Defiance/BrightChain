import { ChecksumUint8Array } from '@digitaldefiance/ecies-lib';
import { RawDataBlock } from '../../blocks/rawData';

/**
 * Universal block store interface that works in both browser and Node.js
 */
export interface IUniversalBlockStore {
  /**
   * Store a block
   */
  setData(block: RawDataBlock): Promise<void>;

  /**
   * Retrieve a block by checksum
   */
  getData(checksum: ChecksumUint8Array): Promise<RawDataBlock>;

  /**
   * Check if a block exists
   */
  has(checksum: ChecksumUint8Array): Promise<boolean>;

  /**
   * Delete a block
   */
  deleteData(checksum: ChecksumUint8Array): Promise<void>;

  /**
   * Get random blocks for whitening (optional, for OFFS)
   */
  getRandomBlocks?(count: number): Promise<ChecksumUint8Array[]>;
}
