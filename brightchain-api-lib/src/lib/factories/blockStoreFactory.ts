import { BlockStoreFactory as BaseBlockStoreFactory } from '@brightchain/brightchain-lib/lib/factories/blockStoreFactory';
import { IBlockStore } from '@brightchain/brightchain-lib/lib/interfaces/storage/blockStore';
import { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';

/**
 * Extended factory for creating block store implementations with Node.js disk support
 */
export class BlockStoreFactory extends BaseBlockStoreFactory {
  /**
   * Create a disk-based block store (Node.js implementation)
   */
  public static createDiskStore(config: { storePath: string; blockSize: BlockSize }): IBlockStore {
    return new DiskBlockAsyncStore(config);
  }
}