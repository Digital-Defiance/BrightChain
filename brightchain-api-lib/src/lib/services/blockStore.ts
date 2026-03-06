import {
  BlockSize,
  BlockStoreOptions,
  BrightenResult,
  Checksum,
  IBlockMetadata,
  IFecService,
  lengthToClosestBlockSize,
  RawDataBlock,
} from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { IBrightChainApplication } from '../interfaces';
import { DefaultBackendIdType } from '../shared-types';
import { DiskBlockAsyncStore } from '../stores';
import { BaseService } from './base';
import { FecServiceFactory } from './fecServiceFactory';

/**
 * Service for block storage operations backed by the BrightChain disk blockstore.
 *
 * This service initializes the DiskBlockAsyncStore with:
 * - DiskBlockMetadataStore for tracking block lifecycle and access patterns
 * - FEC service (via FecServiceFactory) for parity generation and recovery
 *
 * The FEC service is initialized asynchronously on first use to avoid blocking
 * the constructor. Use ensureInitialized() to ensure the FEC service is ready.
 *
 * Note: This service provides convenience methods for block storage but does not
 * implement the full IBlockStore interface. Use getStore() to access the underlying
 * DiskBlockAsyncStore which implements IBlockStore.
 */
export class BlockStoreService<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseService<TID> {
  private readonly store: DiskBlockAsyncStore;
  private fecServiceInitialized = false;
  private fecServicePromise: Promise<void> | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    const storePath =
      this.application.environment.blockStorePath ?? 'tmp/blockstore';
    const envSizes = this.application.environment.blockStoreBlockSizes;
    const supportedBlockSizes: readonly BlockSize[] =
      envSizes && envSizes.length > 0 ? envSizes : [BlockSize.Medium];
    this.store = new DiskBlockAsyncStore({ storePath, supportedBlockSizes });

    // Start FEC service initialization in the background
    this.initializeFecService();
  }

  /**
   * Initialize the FEC service asynchronously.
   * This is called automatically in the constructor but can be awaited
   * to ensure the FEC service is ready before use.
   */
  private async initializeFecService(): Promise<void> {
    if (this.fecServiceInitialized) {
      return;
    }

    if (this.fecServicePromise) {
      return this.fecServicePromise;
    }

    this.fecServicePromise = (async () => {
      try {
        const fecService = await FecServiceFactory.getBestAvailable();
        this.store.setFecService(fecService);
        this.fecServiceInitialized = true;
        console.log('[BlockStoreService] FEC service initialized successfully');
      } catch (error) {
        // FEC service is optional - log warning but don't fail
        console.warn(
          '[BlockStoreService] FEC service not available:',
          error instanceof Error ? error.message : String(error),
        );
        console.warn(
          '[BlockStoreService] Block storage will work without FEC parity protection',
        );
      }
    })();

    return this.fecServicePromise;
  }

  /**
   * Ensure the FEC service is initialized before performing operations
   * that require it. This is optional - operations will work without FEC
   * but won't have parity protection.
   */
  async ensureInitialized(): Promise<void> {
    await this.initializeFecService();
  }

  /**
   * Get the underlying DiskBlockAsyncStore instance.
   * Useful for advanced operations or testing.
   */
  getStore(): DiskBlockAsyncStore {
    return this.store;
  }

  /**
   * Get the FEC service if available.
   */
  getFecService(): IFecService | null {
    return this.store.getFecService();
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
