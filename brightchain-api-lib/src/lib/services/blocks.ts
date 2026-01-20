import {
  BlockStoreOptions,
  BrightenResult,
  IBlockMetadata,
} from '@brightchain/brightchain-lib';
import { Member } from '@digitaldefiance/ecies-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IBrightChainApplication } from '../interfaces';
import { IBlockService } from '../interfaces/blockService';
import { DefaultBackendIdType } from '../shared-types';
import { BaseService } from './base';
import { BlockStoreService } from './blockStore';

/**
 * Service for handling block operations backed by the BlockStoreService.
 */
export class BlocksService<TID extends PlatformID = DefaultBackendIdType>
  extends BaseService<TID>
  implements IBlockService
{
  private readonly blockStore: BlockStoreService<TID>;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    this.blockStore = new BlockStoreService<TID>(application);
  }

  async storeBlock(
    dataBuffer: Buffer,
    _member: Member,
    _canRead: boolean = true,
    _canPersist: boolean = true,
    options?: BlockStoreOptions,
  ): Promise<{ blockId: string; metadata?: IBlockMetadata }> {
    const blockId = await this.blockStore.storeBlock(dataBuffer, options);
    const metadata = await this.blockStore.getBlockMetadata(blockId);
    return { blockId, metadata: metadata ?? undefined };
  }

  async getBlock(
    blockId: string,
  ): Promise<{ data: Buffer; metadata?: IBlockMetadata }> {
    const data = await this.blockStore.getBlock(blockId);
    const metadata = await this.blockStore.getBlockMetadata(blockId);
    return { data, metadata: metadata ?? undefined };
  }

  async getBlockMetadata(blockId: string): Promise<IBlockMetadata | null> {
    return this.blockStore.getBlockMetadata(blockId);
  }

  async deleteBlock(blockId: string): Promise<void> {
    return this.blockStore.deleteBlock(blockId);
  }

  async brightenBlock(
    blockId: string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    return this.blockStore.brightenBlock(blockId, randomBlockCount);
  }
}
