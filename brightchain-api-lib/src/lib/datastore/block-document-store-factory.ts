import { BlockSize, IBlockStore, MemoryBlockStore } from '@brightchain/brightchain-lib';
import { BlockDocumentStore } from './block-document-store';
import { DocumentStore } from './document-store';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';

export type BlockDocumentStoreOptions = {
  blockStore?: IBlockStore;
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
    const diskStore = new DiskBlockAsyncStore({ storePath: options.storePath, blockSize });
    return new BlockDocumentStore(diskStore);
  }

  throw new Error('createBlockDocumentStore requires a blockStore, storePath, or useMemory=true');
}
