import { BlockStore, DiskBlockStoreAdapter, MemoryBlockStore, BlockSize } from '@brightchain/brightchain-lib';
import { BlockDocumentStore } from './block-document-store';
import { DocumentStore } from './document-store';

export type BlockDocumentStoreOptions = {
  blockStore?: BlockStore;
  storePath?: string;
  blockSize?: BlockSize;
  useMemory?: boolean;
};

/**
 * Create a BlockDocumentStore backed by either a provided BlockStore, a disk store, or an in-memory store.
 */
export function createBlockDocumentStore(options: BlockDocumentStoreOptions): DocumentStore {
  const blockSize = options.blockSize ?? BlockSize.Small;

  if (options.blockStore) {
    return new BlockDocumentStore(options.blockStore);
  }

  if (options.useMemory) {
    const memoryStore = new MemoryBlockStore(blockSize);
    return new BlockDocumentStore(memoryStore);
  }

  if (options.storePath) {
    const diskStore = new DiskBlockStoreAdapter({ storePath: options.storePath, blockSize });
    return new BlockDocumentStore(diskStore);
  }

  throw new Error('createBlockDocumentStore requires a blockStore, storePath, or useMemory=true');
}
