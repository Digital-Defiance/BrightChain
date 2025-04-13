/* eslint-disable @nx/enforce-module-boundaries */
import { Member } from '@brightchain/brightchain-lib';

export interface IBlockService {
  storeBlock(
    dataBuffer: Buffer,
    member: Member,
    canRead?: boolean,
    canPersist?: boolean,
  ): Promise<string>;

  getBlock(blockId: string): Promise<{ data: Buffer }>;
}
