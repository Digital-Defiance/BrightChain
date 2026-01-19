/* eslint-disable @nx/enforce-module-boundaries */
import {
  BlockStoreOptions,
  BrightenResult,
  IBlockMetadata,
} from '@brightchain/brightchain-lib';
import { Member } from '@digitaldefiance/ecies-lib';

export interface IBlockService {
  storeBlock(
    dataBuffer: Buffer,
    member: Member,
    canRead?: boolean,
    canPersist?: boolean,
    options?: BlockStoreOptions,
  ): Promise<{ blockId: string; metadata?: IBlockMetadata }>;

  getBlock(
    blockId: string,
  ): Promise<{ data: Buffer; metadata?: IBlockMetadata }>;

  getBlockMetadata(blockId: string): Promise<IBlockMetadata | null>;

  deleteBlock(blockId: string): Promise<void>;

  brightenBlock(
    blockId: string,
    randomBlockCount: number,
  ): Promise<BrightenResult>;
}
