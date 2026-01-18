import {
  BlockSize,
  IBlockStore,
  IQuorumService,
  MemoryBlockStore,
} from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
import { BlockDocumentStore } from './block-document-store';
import { DocumentStore } from './document-store';

export type BlockDocumentStoreOptions = {
  blockStore?: IBlockStore;
  storePath?: string;
  blockSize?: BlockSize;
  useMemory?: boolean;
  /**
   * Optional QuorumService for encryption support
   */
  quorumService?: IQuorumService<PlatformID>;
};

/**
 * Create a BlockDocumentStore backed by either a provided BlockStore, a disk store, or an in-memory store.
 * Optionally supports encryption via QuorumService.
 */
export function createBlockDocumentStore(
  options: BlockDocumentStoreOptions,
): DocumentStore {
  const blockSize = options.blockSize ?? BlockSize.Small;

  if (options.blockStore) {
    return new BlockDocumentStore(options.blockStore, options.quorumService);
  }

  if (options.useMemory) {
    const memoryStore = new MemoryBlockStore(blockSize);
    return new BlockDocumentStore(memoryStore, options.quorumService);
  }

  if (options.storePath) {
    const diskStore = new DiskBlockAsyncStore({
      storePath: options.storePath,
      blockSize,
    });
    return new BlockDocumentStore(diskStore, options.quorumService);
  }

  throw new Error(
    'createBlockDocumentStore requires a blockStore, storePath, or useMemory=true',
  );
}
