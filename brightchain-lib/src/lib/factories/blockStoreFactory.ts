import { BlockSize } from '../enumerations/blockSize';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { IBlockStore } from '../interfaces/storage/blockStore';
import { ICloudBlockStoreConfig } from '../interfaces/storage/cloudBlockStoreConfig';
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
 * Type for a pluggable Azure Blob Storage store factory function.
 */
export type AzureStoreFactoryFn = (config: ICloudBlockStoreConfig) => IBlockStore;

/**
 * Type for a pluggable Amazon S3 store factory function.
 */
export type S3StoreFactoryFn = (config: ICloudBlockStoreConfig) => IBlockStore;

/**
 * Factory for creating block store implementations.
 *
 * Supports a pluggable disk store factory so that Node.js-specific
 * implementations (e.g. DiskBlockStore in brightchain-api-lib) can be
 * registered without brightchain-lib depending on Node.js APIs.
 */
export class BlockStoreFactory {
  private static diskStoreFactory: DiskStoreFactoryFn | null = null;
  private static azureStoreFactory: AzureStoreFactoryFn | null = null;
  private static s3StoreFactory: S3StoreFactoryFn | null = null;

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

  /**
   * Register a factory function for creating Azure Blob Storage block stores.
   * Call this at import time from brightchain-api-lib to wire in the
   * AzureBlobBlockStore implementation.
   */
  public static registerAzureStoreFactory(factory: AzureStoreFactoryFn): void {
    BlockStoreFactory.azureStoreFactory = factory;
  }

  /**
   * Clear the registered Azure store factory.
   * Primarily useful for testing.
   */
  public static clearAzureStoreFactory(): void {
    BlockStoreFactory.azureStoreFactory = null;
  }

  /**
   * Create an Azure Blob Storage block store.
   *
   * Requires a factory to be registered via `registerAzureStoreFactory`.
   * Throws StoreError(FactoryNotRegistered) if no factory is registered.
   */
  public static createAzureStore(config: ICloudBlockStoreConfig): IBlockStore {
    if (!BlockStoreFactory.azureStoreFactory) {
      throw new StoreError(StoreErrorType.FactoryNotRegistered, undefined, {
        storeType: 'AzureBlob',
        hint: "Import '@brightchain/azure-store' in your application entry point to register the Azure factory.",
      });
    }
    return BlockStoreFactory.azureStoreFactory(config);
  }

  /**
   * Register a factory function for creating Amazon S3 block stores.
   * Call this at import time from brightchain-api-lib to wire in the
   * S3BlockStore implementation.
   */
  public static registerS3StoreFactory(factory: S3StoreFactoryFn): void {
    BlockStoreFactory.s3StoreFactory = factory;
  }

  /**
   * Clear the registered S3 store factory.
   * Primarily useful for testing.
   */
  public static clearS3StoreFactory(): void {
    BlockStoreFactory.s3StoreFactory = null;
  }

  /**
   * Create an Amazon S3 block store.
   *
   * Requires a factory to be registered via `registerS3StoreFactory`.
   * Throws StoreError(FactoryNotRegistered) if no factory is registered.
   */
  public static createS3Store(config: ICloudBlockStoreConfig): IBlockStore {
    if (!BlockStoreFactory.s3StoreFactory) {
      throw new StoreError(StoreErrorType.FactoryNotRegistered, undefined, {
        storeType: 'S3',
        hint: "Import '@brightchain/s3-store' in your application entry point to register the S3 factory.",
      });
    }
    return BlockStoreFactory.s3StoreFactory(config);
  }
}
