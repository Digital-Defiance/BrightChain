import { BlockStoreFactory as BaseBlockStoreFactory, IBlockStore, BlockSize } from '@brightchain/brightchain-lib';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';

/**
 * Extended factory for creating block store implementations with Node.js disk support
 */
export class BlockStoreFactory extends BaseBlockStoreFactory {
  /**
   * Create a disk-based block store (Node.js implementation)
   */
  public static override createDiskStore(config: { storePath: string; blockSize: BlockSize }): IBlockStore {
    return new DiskBlockAsyncStore(config);
  }
}