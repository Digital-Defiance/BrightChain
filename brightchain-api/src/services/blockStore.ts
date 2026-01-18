/* eslint-disable @nx/enforce-module-boundaries */
import { BlockSize } from '@brightchain/brightchain-lib/lib/enumerations/blockSize';
import { RawDataBlock } from '@brightchain/brightchain-lib/lib/blocks/rawData';
import { Checksum } from '@brightchain/brightchain-lib/lib/types/checksum';
import { DiskBlockAsyncStore } from '@brightchain/brightchain-api-lib/lib/stores/diskBlockAsyncStore';
import { FecServiceFactory } from '@brightchain/brightchain-api-lib/lib/services/fecServiceFactory';
import { IBlockMetadata, BlockStoreOptions, BrightenResult, IFecService } from '@brightchain/brightchain-lib';
import { IApplication } from '../interfaces/application';
import { IBlockStore } from '../interfaces/blockStore';
import { BaseService } from './base';

/**
 * Service for block storage operations backed by the BrightChain disk blockstore.
 * 
 * This service initializes the DiskBlockAsyncStore with:
 * - DiskBlockMetadataStore for tracking block lifecycle and access patterns
 * - FEC service (via FecServiceFactory) for parity generation and recovery
 * 
 * The FEC service is initialized asynchronously on first use to avoid blocking
 * the constructor. Use ensureInitialized() to ensure the FEC service is ready.
 */
export class BlockStoreService extends BaseService implements IBlockStore {
  private readonly store: DiskBlockAsyncStore;
  private fecServiceInitialized = false;
  private fecServicePromise: Promise<void> | null = null;

  constructor(application: IApplication) {
    super(application);
    const storePath = process.env.BRIGHTCHAIN_BLOCKSTORE_PATH ?? 'tmp/blockstore';
    const blockSize = (process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES
      ? Number.parseInt(process.env.BRIGHTCHAIN_BLOCKSIZE_BYTES, 10)
      : BlockSize.Medium) as BlockSize;
    this.store = new DiskBlockAsyncStore({ storePath, blockSize });
    
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
        console.warn('[BlockStoreService] FEC service not available:', error instanceof Error ? error.message : String(error));
        console.warn('[BlockStoreService] Block storage will work without FEC parity protection');
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

  getBlockSize(): BlockSize {
    return this.store.blockSize;
  }

  async storeBlock(data: Buffer, options?: BlockStoreOptions): Promise<string> {
    const block = new RawDataBlock(this.store.blockSize, data);
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

  async brightenBlock(blockId: string, randomBlockCount: number): Promise<BrightenResult> {
    return this.store.brightenBlock(blockId, randomBlockCount);
  }
}
