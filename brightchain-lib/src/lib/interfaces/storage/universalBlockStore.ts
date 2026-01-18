import { RawDataBlock } from '../../blocks/rawData';
import { Checksum } from '../../types/checksum';

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
  getData(checksum: Checksum): Promise<RawDataBlock>;

  /**
   * Check if a block exists
   */
  has(checksum: Checksum): Promise<boolean>;

  /**
   * Delete a block
   */
  deleteData(checksum: Checksum): Promise<void>;

  /**
   * Get random blocks for whitening (optional, for OFFS)
   */
  getRandomBlocks?(count: number): Promise<Checksum[]>;
}
