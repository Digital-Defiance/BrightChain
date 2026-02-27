import {
  type BlockId,
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
  ): Promise<{ blockId: BlockId; metadata?: IBlockMetadata }> {
    const blockIdStr = await this.blockStore.storeBlock(dataBuffer, options);
    const blockId = blockIdStr as unknown as BlockId;
    const metadata = await this.blockStore.getBlockMetadata(blockIdStr);
    return { blockId, metadata: metadata ?? undefined };
  }

  async getBlock(
    blockId: BlockId,
  ): Promise<{ data: Buffer; metadata?: IBlockMetadata }> {
    const data = await this.blockStore.getBlock(blockId);
    const metadata = await this.blockStore.getBlockMetadata(blockId);
    return { data, metadata: metadata ?? undefined };
  }

  async getBlockMetadata(blockId: BlockId): Promise<IBlockMetadata | null> {
    return this.blockStore.getBlockMetadata(blockId);
  }

  async deleteBlock(blockId: BlockId): Promise<void> {
    return this.blockStore.deleteBlock(blockId);
  }

  async brightenBlock(
    blockId: BlockId,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    return this.blockStore.brightenBlock(blockId, randomBlockCount);
  }
}
