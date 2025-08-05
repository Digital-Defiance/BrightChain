import { BlockSize } from '@BrightChain/brightchain-lib';

export interface IBlockStore {
  getBlockSize(): BlockSize;
  storeBlock(blockId: string, data: Buffer): Promise<void>;
  getBlock(blockId: string): Promise<Buffer>;
}