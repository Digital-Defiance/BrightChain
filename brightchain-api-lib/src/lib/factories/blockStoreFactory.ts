import { BlockSize, BlockStoreFactory } from '@brightchain/brightchain-lib';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';

/**
 * Register the Node.js-specific DiskBlockAsyncStore as the disk store factory.
 * This runs at import time so that any code calling
 * `BlockStoreFactory.createDiskStore(...)` gets a real disk-backed store.
 */
BlockStoreFactory.registerDiskStoreFactory(
  (config: { storePath: string; blockSize: BlockSize }) =>
    new DiskBlockAsyncStore(config),
);

// Re-export so existing consumers that import from this module still work.
export { BlockStoreFactory };
