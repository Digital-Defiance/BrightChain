import { BlockSize } from '../enumerations/blockSize';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { MemoryBlockStore } from '../stores/memoryBlockStore';

/**
 * Type for a pluggable disk store factory function.
 * Accepts a config with storePath and blockSize, returns an IBlockStore.
 */
export type DiskStoreFactoryFn = (config: {
  storePath: string;
  blockSize: BlockSize;
}) => IBlockStore;

/**
 * Factory for creating block store implementations.
 *
 * Supports a pluggable disk store factory so that Node.js-specific
 * implementations (e.g. DiskBlockStore in brightchain-api-lib) can be
 * registered without brightchain-lib depending on Node.js APIs.
 */
export class BlockStoreFactory {
  private static diskStoreFactory: DiskStoreFactoryFn | null = null;

  /**
   * Register a factory function for creating disk-based block stores.
   * Call this at import time from brightchain-api-lib to wire in the
   * Node.js-specific DiskBlockStore implementation.
   */
  public static registerDiskStoreFactory(factory: DiskStoreFactoryFn): void {
    BlockStoreFactory.diskStoreFactory = factory;
  }

  /**
   * Clear the registered disk store factory.
   * Primarily useful for testing.
   */
  public static clearDiskStoreFactory(): void {
    BlockStoreFactory.diskStoreFactory = null;
  }

  /**
   * Create a memory-based block store (browser-compatible)
   */
  public static createMemoryStore(config: {
    blockSize: BlockSize;
  }): IBlockStore {
    return new MemoryBlockStore(config.blockSize);
  }

  /**
   * Create a disk-based block store (Node.js only).
   *
   * If a disk store factory has been registered via `registerDiskStoreFactory`,
   * it will be used. Otherwise falls back to MemoryBlockStore.
   */
  public static createDiskStore(config: {
    storePath: string;
    blockSize: BlockSize;
  }): IBlockStore {
    if (BlockStoreFactory.diskStoreFactory) {
      return BlockStoreFactory.diskStoreFactory(config);
    }
    // Fallback to memory store if no disk store factory is registered
    return new MemoryBlockStore(config.blockSize);
  }
}
