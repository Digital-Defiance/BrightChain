import { BlockSize, RawDataBlock } from '@BrightChain/brightchain-lib';

export interface IBlockStore {
  /**
   * Store a block
   */
  storeBlock(block: RawDataBlock): Promise<string>;

  /**
   * Get a block by its ID
   */
  getBlock(blockId: string): Promise<RawDataBlock>;

  /**
   * Get the block size
   */
  getBlockSize(): BlockSize;
}
