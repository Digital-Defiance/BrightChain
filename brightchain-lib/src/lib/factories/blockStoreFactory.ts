import { BlockSize } from '../enumerations/blockSize';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { MemoryBlockStore } from '../stores/memoryBlockStore';

/**
 * Factory for creating block store implementations
 */
export class BlockStoreFactory {
  /**
   * Create a memory-based block store (browser-compatible)
   */
  public static createMemoryStore(config: {
    blockSize: BlockSize;
  }): IBlockStore {
    return new MemoryBlockStore(config.blockSize);
  }

  /**
   * Create a disk-based block store (Node.js only)
   * This method should be overridden in brightchain-api-lib
   */
  public static createDiskStore(config: {
    storePath: string;
    blockSize: BlockSize;
  }): IBlockStore {
    // Fallback to memory store if disk store is not available
    return new MemoryBlockStore(config.blockSize);
  }
}
