// Re-export the generic factory and options type from @brightchain/node-express-suite
// with backward-compatible DiskBlockAsyncStore integration
import {
  BlockDocumentStoreOptions as SuiteBlockDocumentStoreOptions,
  createBlockDocumentStore as suiteCreateBlockDocumentStore,
} from '@brightchain/node-express-suite';
import {
  BlockSize,
  IBlockStore,
  IQuorumService,
} from '@brightchain/brightchain-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
import { DiskBlockAsyncStore } from '../stores/diskBlockAsyncStore';
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
 *
 * This api-lib version automatically injects DiskBlockAsyncStore for disk-backed stores,
 * maintaining backward compatibility with existing consumers.
 */
export function createBlockDocumentStore(
  options: BlockDocumentStoreOptions,
): DocumentStore {
  // Convert to suite options, injecting DiskBlockAsyncStore as the disk factory
  const suiteOptions: SuiteBlockDocumentStoreOptions = {
    ...options,
    diskBlockStoreFactory: (opts) =>
      new DiskBlockAsyncStore({
        storePath: opts.storePath,
        blockSize: opts.blockSize,
      }),
  };
  return suiteCreateBlockDocumentStore(suiteOptions);
}
