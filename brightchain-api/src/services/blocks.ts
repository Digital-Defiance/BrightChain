/* eslint-disable @nx/enforce-module-boundaries */
import { Member } from '@brightchain/brightchain-lib';
import { IApplication } from '../interfaces/application';
import { IBlockService } from '../interfaces/blockService';
import { BlockStoreService } from './blockStore';
import { BaseService } from './base';

/**
 * Service for handling block operations backed by the BlockStoreService.
 */
export class BlocksService extends BaseService implements IBlockService {
  private readonly blockStore: BlockStoreService;

  constructor(application: IApplication) {
    super(application);
    this.blockStore = new BlockStoreService(application);
  }

  async storeBlock(
    dataBuffer: Buffer,
    _member: Member,
    _canRead: boolean = true,
    _canPersist: boolean = true,
  ): Promise<string> {
    return this.blockStore.storeBlock(dataBuffer);
  }

  async getBlock(blockId: string): Promise<{ data: Buffer }> {
    const data = await this.blockStore.getBlock(blockId);
    return { data };
  }
}
