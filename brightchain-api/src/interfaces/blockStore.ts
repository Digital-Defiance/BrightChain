/* eslint-disable @nx/enforce-module-boundaries */
import { BlockSize } from '@brightchain/brightchain-lib';

export interface IBlockStore {
  getBlockSize(): BlockSize;
  storeBlock(data: Buffer): Promise<string>;
  getBlock(blockId: string): Promise<Buffer>;
}
