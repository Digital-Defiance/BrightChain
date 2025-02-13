import {
  BlockSize,
  ChecksumBuffer,
  DiskBlockAsyncStore,
  RawDataBlock,
} from '@BrightChain/brightchain-lib';
import { IApplication } from '../interfaces/application';
import { IBlockStore } from '../interfaces/blockStore';
import { BaseService } from './base';

export class BlockStoreService extends BaseService implements IBlockStore {
  private store: DiskBlockAsyncStore;

  constructor(application: IApplication) {
    super(application);
    this.store = new DiskBlockAsyncStore({
      storePath: process.env.BLOCK_STORE_PATH || './blocks',
      blockSize: BlockSize.Medium,
    });
  }

  /**
   * Store a block
   * @implements {IBlockStore.storeBlock}
   */
  public async storeBlock(block: RawDataBlock): Promise<string> {
    this.store.setData(block);
    return block.idChecksum.toString('hex');
  }

  /**
   * Get a block by its ID
   * @implements {IBlockStore.getBlock}
   */
  public async getBlock(blockId: string): Promise<RawDataBlock> {
    const checksumBuffer = Buffer.from(blockId, 'hex') as ChecksumBuffer;
    return this.store.getData(checksumBuffer);
  }

  /**
   * Get the block size
   * @implements {IBlockStore.getBlockSize}
   */
  public getBlockSize(): BlockSize {
    return this.store.blockSize;
  }
}
