/* eslint-disable @nx/enforce-module-boundaries, @typescript-eslint/no-unused-vars */
import { BlockSize } from '@brightchain/brightchain-lib';
import { IApplication } from '../interfaces/application';
import { IBlockStore } from '../interfaces/blockStore';
import { BaseService } from './base';

/**
 * Service for block storage operations
 */
export class BlockStoreService extends BaseService implements IBlockStore {
  constructor(application: IApplication) {
    super(application);
  }

  getBlockSize(): BlockSize {
    return BlockSize.Medium;
  }

  async storeBlock(blockId: string, data: Buffer): Promise<void> {
    // Temporary implementation
  }

  async getBlock(blockId: string): Promise<Buffer> {
    // Temporary implementation
    return Buffer.from('placeholder');
  }
}
