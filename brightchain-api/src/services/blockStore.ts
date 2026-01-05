/* eslint-disable @nx/enforce-module-boundaries */
import { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { RawDataBlock } from '@brightchain/brightchain-lib/lib/blocks/rawData';
import { DiskBlockStoreAdapter } from '@brightchain/brightchain-lib/lib/stores/blockStoreAdapter';
import { IApplication } from '../interfaces/application';
import { IBlockStore } from '../interfaces/blockStore';
import { BaseService } from './base';

/**
 * Service for block storage operations backed by the BrightChain disk blockstore.
 */
export class BlockStoreService extends BaseService implements IBlockStore {
  private readonly store: DiskBlockStoreAdapter;

  constructor(application: IApplication) {
    super(application);
    const storePath = process.env.BRIGHTCHAIN_BLOCKSTORE_PATH ?? 'tmp/blockstore';
    const blockSize = (process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES
      ? Number.parseInt(process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES, 10)
      : BlockSize.Medium) as BlockSize;
    this.store = new DiskBlockStoreAdapter({ storePath, blockSize });
  }

  getBlockSize(): BlockSize {
    return this.store.blockSize;
  }

  async storeBlock(data: Buffer): Promise<string> {
    const block = new RawDataBlock(this.store.blockSize, data);
    const blockId = Buffer.from(block.idChecksum).toString('hex');
    await this.store.put(blockId, block.data);
    return blockId;
  }

  async getBlock(blockId: string): Promise<Buffer> {
    const block = await this.store.get(blockId);
    return Buffer.from(block.data);
  }
}
