import { BrightChainMember } from '@brightchain/brightchain-lib';

export interface IBlockService {
  storeBlock(
    dataBuffer: Buffer,
    member: BrightChainMember,
    canRead?: boolean,
    canPersist?: boolean,
  ): Promise<string>;

  getBlock(blockId: string): Promise<{ data: Buffer }>;
}
