import {
  type BlockId,
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
  ): Promise<{ blockId: BlockId; metadata?: IBlockMetadata }>;

  getBlock(
    blockId: BlockId,
  ): Promise<{ data: Buffer; metadata?: IBlockMetadata }>;

  getBlockMetadata(blockId: BlockId): Promise<IBlockMetadata | null>;

  deleteBlock(blockId: BlockId): Promise<void>;

  brightenBlock(
    blockId: BlockId,
    randomBlockCount: number,
  ): Promise<BrightenResult>;
}
