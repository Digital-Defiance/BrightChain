import {
  BrightChainMember,
  ConstituentBlockListBlock,
  RawDataBlock,
} from '@BrightChain/brightchain-lib';
import { IApplication } from '../interfaces/application';
import { IBlockService } from '../interfaces/blocks';
import { BaseService } from './base';
import { BlockStoreService } from './blockStore';

export class BlocksService extends BaseService implements IBlockService {
  private blockStoreService: BlockStoreService;

  constructor(application: IApplication) {
    super(application);
    this.blockStoreService = new BlockStoreService(application);
  }

  /**
   * Store a block with the given data and permissions
   * @implements {IBlocks.storeBlock}
   */
  public async storeBlock(
    data: Buffer,
    member: BrightChainMember,
    canRead = true,
    canPersist = true,
  ): Promise<string> {
    // Create CBL block
    const dataBuffer = Buffer.from(data);
    const cblBlock = new ConstituentBlockListBlock(
      this.blockStoreService.getBlockSize(),
      member.id,
      BigInt(dataBuffer.length),
      [],
      new Date(),
    );

    // Store as raw block
    const rawBlock = new RawDataBlock(
      this.blockStoreService.getBlockSize(),
      cblBlock.data,
      new Date(),
      cblBlock.idChecksum,
      canRead,
      canPersist,
    );

    // Store block
    return this.blockStoreService.storeBlock(rawBlock);
  }

  /**
   * Get a block by its ID
   * @implements {IBlocks.getBlock}
   */
  public async getBlock(blockId: string): Promise<{
    data: Buffer;
    canRead: boolean;
    creatorId: string;
  }> {
    const block = await this.blockStoreService.getBlock(blockId);

    // Parse CBL data
    const cblData = block.data.toString();
    const cblJson = JSON.parse(cblData);

    return {
      data: block.data,
      canRead: block.canRead,
      creatorId: cblJson.creatorId,
    };
  }
}
