import { BrightChainMember } from '@BrightChain/brightchain-lib';

export interface IBlockService {
  /**
   * Store a block with the given data and permissions
   */
  storeBlock(
    data: Buffer,
    member: BrightChainMember,
    canRead?: boolean,
    canPersist?: boolean,
  ): Promise<string>;

  /**
   * Get a block by its ID
   */
  getBlock(blockId: string): Promise<{
    data: Buffer;
    canRead: boolean;
    creatorId: string;
  }>;
}
