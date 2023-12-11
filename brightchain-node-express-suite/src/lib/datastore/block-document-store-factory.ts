import {
  BlockSize,
  IBlockStore,
  IBrightTrustService,
  MemoryBlockStore,
} from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { BlockDocumentStore } from './block-document-store';
import { DocumentStore } from './document-store';

export type BlockDocumentStoreOptions = {
  blockStore?: IBlockStore;
  storePath?: string;
  blockSize?: BlockSize;
  useMemory?: boolean;
  /**
   * Optional BrightTrustService for encryption support
   */
  brightTrustService?: IBrightTrustService<PlatformID>;
  /**
   * Optional factory function to create a disk-backed block store.
   * This replaces the direct DiskBlockAsyncStore import, allowing
   * consumers (e.g., api-lib) to inject their own disk store implementation.
   */
  diskBlockStoreFactory?: (options: {
    storePath: string;
    blockSize: BlockSize;
  }) => IBlockStore;
};

/**
 * Create a BlockDocumentStore backed by either a provided BlockStore, a disk store, or an in-memory store.
 * Optionally supports encryption via BrightTrustService.
 *
 * For disk-backed stores, provide a `diskBlockStoreFactory` callback that creates the appropriate
 * IBlockStore implementation (e.g., DiskBlockAsyncStore from api-lib).
 */
export function createBlockDocumentStore(
  options: BlockDocumentStoreOptions,
): DocumentStore {
  const blockSize = options.blockSize ?? BlockSize.Small;

  if (options.blockStore) {
    return new BlockDocumentStore(
      options.blockStore,
      options.brightTrustService,
    );
  }

  if (options.useMemory) {
    const memoryStore = new MemoryBlockStore(blockSize);
    return new BlockDocumentStore(memoryStore, options.brightTrustService);
  }

  if (options.storePath) {
    if (!options.diskBlockStoreFactory) {
      throw new Error(
        'createBlockDocumentStore requires a diskBlockStoreFactory when using storePath. ' +
          'Provide a factory function that creates an IBlockStore for disk-backed storage.',
      );
    }
    const diskStore = options.diskBlockStoreFactory({
      storePath: options.storePath,
      blockSize,
    });
    return new BlockDocumentStore(diskStore, options.brightTrustService);
  }

  throw new Error(
    'createBlockDocumentStore requires a blockStore, storePath (with diskBlockStoreFactory), or useMemory=true',
  );
}
