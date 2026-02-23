/**
 * BrightChainDb – the top-level database object for Node.js persistence.
 *
 * Extends InMemoryDatabase from brightchain-lib, adding:
 *   • PersistentHeadRegistry (disk-backed head tracking via dataDir)
 *   • PooledStoreAdapter (pool-scoped block store via poolId)
 *   • Pool-aware dropDatabase()
 *
 * Usage:
 *   const db = new BrightChainDb(blockStore, { name: 'mydb' });
 *   const users = db.collection('users');
 *   await users.insertOne({ name: 'Alice' });
 */

import type { IBlockStore, PoolId } from '@brightchain/brightchain-lib';
import {
  InMemoryDatabase,
  type InMemoryDatabaseOptions,
  isPooledBlockStore,
} from '@brightchain/brightchain-lib';
import type {
  BsonDocument,
  CollectionOptions,
} from '@digitaldefiance/suite-core-lib';
import { Collection } from './collection';
import { PersistentHeadRegistry } from './headRegistry';
import { PooledStoreAdapter } from './pooledStoreAdapter';

/**
 * Options for creating a BrightChainDb instance.
 * Extends InMemoryDatabaseOptions with persistence-specific fields.
 */
export interface BrightChainDbOptions extends InMemoryDatabaseOptions {
  /**
   * Data directory for persistent head registry.
   * When provided (and no explicit headRegistry), a PersistentHeadRegistry
   * is auto-created pointing at this directory.
   */
  dataDir?: string;
  /** Optional pool ID for storage isolation */
  poolId?: PoolId;
}

/**
 * The main database driver – analogous to MongoDB's `Db` class.
 *
 * Adds Node.js persistence features on top of InMemoryDatabase:
 *   - PersistentHeadRegistry when `dataDir` is provided
 *   - PooledStoreAdapter when `poolId` is provided and store supports pools
 *   - Pool-aware dropDatabase() that deletes the pool before clearing collections
 */
export class BrightChainDb extends InMemoryDatabase {
  /** Original (unwrapped) block store, kept for pool management (e.g. dropDatabase) */
  private readonly originalStore: IBlockStore;
  /** Pool ID this database is scoped to, if any */
  private readonly poolId?: PoolId;

  constructor(blockStore: IBlockStore, options?: BrightChainDbOptions) {
    // Resolve the block store: wrap with PooledStoreAdapter if poolId provided
    const resolvedStore =
      options?.poolId && isPooledBlockStore(blockStore)
        ? new PooledStoreAdapter(blockStore, options.poolId)
        : blockStore;

    // Resolve head registry: create PersistentHeadRegistry if dataDir provided
    // and no explicit headRegistry was given
    const resolvedOptions: InMemoryDatabaseOptions = {
      ...options,
    };
    if (!options?.headRegistry && options?.dataDir) {
      resolvedOptions.headRegistry = new PersistentHeadRegistry({
        dataDir: options.dataDir,
      });
    }

    super(resolvedStore, resolvedOptions);

    this.originalStore = blockStore;
    this.poolId = options?.poolId;
  }

  /**
   * Get (or create) a collection by name.
   *
   * Overrides InMemoryDatabase to return the concrete Collection type,
   * preserving backward compatibility for consumers that depend on
   * Collection-specific methods (e.g. Cursor-based find, _tx* helpers).
   */
  override collection<T extends BsonDocument = BsonDocument>(
    name: string,
    options?: CollectionOptions,
  ): Collection<T> {
    return super.collection<T>(name, options) as unknown as Collection<T>;
  }

  /**
   * Drop the entire database.
   * If a poolId was configured and the underlying store supports pools,
   * deletes the corresponding pool and all its blocks before clearing collections.
   */
  override async dropDatabase(): Promise<void> {
    if (this.poolId && isPooledBlockStore(this.originalStore)) {
      await this.originalStore.deletePool(this.poolId);
    }
    await super.dropDatabase();
  }
}
