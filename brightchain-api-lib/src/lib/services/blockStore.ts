import {
  BlockSize,
  BlockStoreOptions,
  BrightChainStrings,
  BrightenResult,
  Checksum,
  IBlockMetadata,
  IBlockStore,
  lengthToClosestBlockSize,
  RawDataBlock,
  TranslatableBrightChainError,
} from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IBrightChainApplication } from '../interfaces';
import { DefaultBackendIdType } from '../shared-types';
import { BaseService } from './base';

/**
 * Service for block storage operations backed by the application's configured
 * block store (disk, Azure Blob, S3, or memory — determined by
 * BRIGHTCHAIN_BLOCKSTORE_TYPE at startup).
 *
 * The underlying IBlockStore is retrieved from the application's service
 * container, which is populated during database initialization. This ensures
 * the same store instance is used everywhere in the application.
 *
 * Note: This service provides convenience methods for block storage but does not
 * implement the full IBlockStore interface. Use getStore() to access the underlying
 * IBlockStore directly.
 */
export class BlockStoreService<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseService<TID> {
  private readonly store: IBlockStore;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    const registeredStore = this.application.services.get('blockStore') as
      | IBlockStore
      | undefined;
    if (!registeredStore) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.BlockStoreService_NoStoreRegistered,
      );
    }
    this.store = registeredStore;
  }

  /**
   * Get the underlying IBlockStore instance.
   * Useful for advanced operations or testing.
   */
  getStore(): IBlockStore {
    return this.store;
  }

  /**
   * Get the supported block sizes for this service.
   */
  getSupportedBlockSizes(): readonly BlockSize[] {
    return this.store.supportedBlockSizes;
  }

  /**
   * @deprecated Use getSupportedBlockSizes() instead. Returns the first supported block size.
   */
  getBlockSize(): BlockSize {
    return this.store.supportedBlockSizes[0];
  }

  async storeBlock(
    data: Buffer,
    options?: BlockStoreOptions,
    blockSize?: BlockSize,
  ): Promise<string> {
    const resolvedSize = blockSize ?? lengthToClosestBlockSize(data.length);

    if (!this.store.supportedBlockSizes.includes(resolvedSize)) {
      throw new Error(
        `Block size ${resolvedSize} is not supported. Supported sizes: [${this.store.supportedBlockSizes.join(', ')}]`,
      );
    }

    const block = new RawDataBlock(resolvedSize, data);
    const blockId = block.idChecksum.toHex();
    await this.store.setData(block, options);
    return blockId;
  }

  async getBlock(blockId: string): Promise<Buffer> {
    const block = await this.store.getData(Checksum.fromHex(blockId));
    return Buffer.from(block.data);
  }

  async getBlockMetadata(blockId: string): Promise<IBlockMetadata | null> {
    return this.store.getMetadata(blockId);
  }

  async deleteBlock(blockId: string): Promise<void> {
    await this.store.delete(blockId);
  }

  async brightenBlock(
    blockId: string,
    randomBlockCount: number,
  ): Promise<BrightenResult> {
    return this.store.brightenBlock(blockId, randomBlockCount);
  }
}
