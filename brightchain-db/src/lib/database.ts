/**
 * BrightDB – the top-level database object.
 *
 * Usage:
 *   const db = new BrightDb(blockStore, { name: 'mydb' });
 *   const users = db.collection('users');
 *   await users.insertOne({ name: 'Alice' });
 */

import {
  IBlockStore,
  isPooledBlockStore,
  type INodeAuthenticator,
  type IWriteAclAuditLogger,
  type IWriteAclService,
} from '@brightchain/brightchain-lib';
import { randomUUID } from 'crypto';
import { AuthorizedHeadRegistry } from './authorizedHeadRegistry';
import {
  Collection,
  HeadRegistry,
  ICollectionHeadRegistry,
} from './collection';
import { PersistentHeadRegistry } from './headRegistry';
import { Model, ModelOptions } from './model';
import { PooledStoreAdapter } from './pooledStoreAdapter';
import { StoreLock } from './storeLock';
import { DbSession, JournalOp } from './transaction';
import {
  BsonDocument,
  ClientSession,
  CollectionOptions,
  CursorSession,
  DocumentId,
} from './types';

/**
 * Options for creating a BrightDb instance.
 */
export interface BrightDbOptions {
  /** Database name (default: 'brightchain') */
  name?: string;
  /** Custom head registry (for testing isolation) */
  headRegistry?: ICollectionHeadRegistry;
  /** Cursor session timeout in ms (default: 300000 = 5 minutes) */
  cursorTimeoutMs?: number;
  /** Pool identifier (accepted for compatibility — informational only) */
  poolId?: string;
  /** Data directory for persistent storage (accepted for compatibility) */
  dataDir?: string;
  /**
   * Write ACL configuration. When provided, the head registry is wrapped
   * with an AuthorizedHeadRegistry that enforces write authorization.
   * When omitted, the database operates in Open_Mode (backward compatible).
   *
   * @see Requirements 1.2, 5.5
   */
  writeAclConfig?: {
    aclService: IWriteAclService;
    authenticator: INodeAuthenticator;
    auditLogger?: IWriteAclAuditLogger;
  };
}

/**
 * The main database driver – analogous to MongoDB's `Db` class.
 */
export class BrightDb {
  public readonly name: string;
  private readonly store: IBlockStore;
  private readonly collections = new Map<string, Collection>();
  private readonly headRegistry: ICollectionHeadRegistry;
  /** Server-side cursor sessions for REST pagination */
  private readonly cursorSessions = new Map<string, CursorSession>();
  /** Default timeout for cursor sessions (5 minutes) */
  private readonly cursorTimeoutMs: number;
  /** Connection state for lifecycle compatibility */
  private _connected = false;
  /** Original pooled store (if poolId was provided) for pool-level operations */
  private readonly pooledStore?: import('@brightchain/brightchain-lib').IPooledBlockStore;
  /** Pool ID (if provided) */
  private readonly poolId?: string;
  /** Registered models: name → Model instance */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private readonly models = new Map<string, Model<any, any>>();
  /** Store-level lock for cross-platform write serialization */
  private readonly storeLock?: StoreLock;

  constructor(blockStore: IBlockStore, options?: BrightDbOptions) {
    // Wrap the store in a PooledStoreAdapter when poolId is provided
    // and the store supports pool operations.
    if (options?.poolId && isPooledBlockStore(blockStore)) {
      this.pooledStore = blockStore;
      this.poolId = options.poolId;
      this.store = new PooledStoreAdapter(blockStore, options.poolId);
    } else {
      this.store = blockStore;
    }
    this.name = options?.name ?? 'brightchain';

    // Resolve the base head registry
    let baseRegistry: ICollectionHeadRegistry;
    if (options?.headRegistry) {
      baseRegistry = options.headRegistry;
    } else if (options?.dataDir) {
      baseRegistry = new PersistentHeadRegistry({
        dataDir: options.dataDir,
      });
    } else {
      baseRegistry = HeadRegistry.createIsolated();
    }

    // Wrap with AuthorizedHeadRegistry when write ACL config is provided.
    // When no config exists, the registry operates in Open_Mode (backward compatible).
    // @see Requirements 1.2, 5.5
    if (options?.writeAclConfig) {
      const { aclService, authenticator, auditLogger } = options.writeAclConfig;
      this.headRegistry = new AuthorizedHeadRegistry(
        baseRegistry as unknown as import('@brightchain/brightchain-lib').IHeadRegistry,
        aclService,
        authenticator,
        auditLogger,
      );
    } else {
      this.headRegistry = baseRegistry;
    }

    this.cursorTimeoutMs = options?.cursorTimeoutMs ?? 300_000;

    // Create store-level lock when a data directory is available
    if (options?.dataDir) {
      this.storeLock = new StoreLock(options.dataDir);
    }
  }

  /**
   * Expose the head registry for components that need to read head block IDs
   * (e.g. CBLIndex for FEC parity generation on metadata blocks).
   */
  getHeadRegistry(): ICollectionHeadRegistry {
    return this.headRegistry;
  }

  /**
   * Connect to the database.
   *
   * If the head registry is a PersistentHeadRegistry, this loads persisted
   * head pointers from disk so that collections created after connect() can
   * see data written by previous instances.
   *
   * @param _uri - Optional connection URI (accepted for API compatibility, ignored)
   */
  async connect(_uri?: string): Promise<void> {
    // Load persisted heads from disk when using PersistentHeadRegistry.
    if (this.headRegistry instanceof PersistentHeadRegistry) {
      await this.headRegistry.load();
    }
    this._connected = true;
  }

  /**
   * Disconnect from the database.
   * For the in-memory/block-store backed implementation this is a no-op,
   * but the method exists for API compatibility with consumers that
   * expect a connect/disconnect lifecycle.
   */
  async disconnect(): Promise<void> {
    this._connected = false;
  }

  /**
   * Check whether the database is currently connected.
   * Returns true after connect() and false after disconnect() (or before any call).
   */
  isConnected(): boolean {
    return this._connected;
  }

  /**
   * Get (or create) a collection by name.
   * Collections are created lazily – no explicit create step is needed.
   */
  collection<T extends BsonDocument = BsonDocument>(
    name: string,
    options?: CollectionOptions,
  ): Collection<T> {
    if (!this.collections.has(name)) {
      const collOptions = this.storeLock
        ? { ...options, storeLock: this.storeLock }
        : options;
      const coll = new Collection<T>(
        name,
        this.store,
        this.name,
        this.headRegistry,
        collOptions,
      );
      // Wire up cross-collection resolver for $lookup
      coll.setCollectionResolver((collName: string) =>
        this.collection(collName),
      );
      this.collections.set(name, coll as unknown as Collection);
    }
    return this.collections.get(name) as unknown as Collection<T>;
  }

  // ── Model registry ──────────────────────────────────────────────────────

  /**
   * Register (or retrieve) a typed Model for a collection.
   *
   * On first call for a given name, creates a Model wrapping the underlying
   * Collection with the provided hydration schema and optional validation
   * schema. Subsequent calls return the cached Model instance.
   *
   * Usage:
   *   const roles = db.model<IStoredRole, IRoleBase<TID>>('roles', {
   *     schema: ROLE_SCHEMA,
   *     hydration: roleHydrationSchema,
   *   });
   *   const admin = await roles.findOne({ name: 'Admin' }); // returns IRoleBase<TID>
   */
  model<TStored extends BsonDocument, TTyped>(
    name: string,
    options?: ModelOptions<TStored, TTyped>,
  ): Model<TStored, TTyped> {
    if (!this.models.has(name)) {
      if (!options) {
        throw new Error(
          `Model '${name}' has not been registered. ` +
            `Provide options on first call to db.model().`,
        );
      }
      const coll = this.collection<TStored>(name);
      const model = new Model<TStored, TTyped>(coll, {
        ...options,
        collectionName: options.collectionName ?? name,
      });
      this.models.set(name, model);
    }
    return this.models.get(name) as Model<TStored, TTyped>;
  }

  /**
   * Check whether a model has been registered for the given collection name.
   */
  hasModel(name: string): boolean {
    return this.models.has(name);
  }

  /**
   * List all registered model names.
   */
  listModels(): string[] {
    return Array.from(this.models.keys());
  }

  /**
   * List all known collection names.
   */
  listCollections(): string[] {
    return Array.from(this.collections.keys());
  }

  /**
   * Drop a collection – removes all documents and indexes.
   */
  async dropCollection(name: string): Promise<boolean> {
    const coll = this.collections.get(name);
    if (!coll) return false;
    await coll.drop();
    this.collections.delete(name);
    return true;
  }

  /**
   * Drop the entire database – removes all collections and their documents.
   */
  async dropDatabase(): Promise<void> {
    const names = this.listCollections();
    for (const name of names) {
      await this.dropCollection(name);
    }
    // If this database is backed by a pool, remove the pool from the store
    if (this.pooledStore && this.poolId) {
      await this.pooledStore.forceDeletePool(this.poolId);
    }
  }

  /**
   * Start a client session for transaction support.
   *
   * Usage:
   *   const session = db.startSession();
   *   session.startTransaction();
   *   try {
   *     await coll.insertOne(doc, { session });
   *     await session.commitTransaction();
   *   } catch {
   *     await session.abortTransaction();
   *   } finally {
   *     session.endSession();
   *   }
   */
  startSession(): ClientSession {
    const commitCallback = async (journal: JournalOp[]) => {
      for (const op of journal) {
        const coll = this.collection(op.collection);
        switch (op.type) {
          case 'insert':
            await coll._txInsert(op.doc as BsonDocument);
            break;
          case 'update':
            await coll._txUpdate(op.docId, op.after as BsonDocument);
            break;
          case 'delete':
            await coll._txDelete(op.docId, op.doc as BsonDocument);
            break;
        }
      }
    };

    const rollbackCallback = async (journal: JournalOp[]) => {
      // Roll back in reverse order.
      // Copy-on-write: rollback only restores doc-index mappings.
      // Blocks written during the failed commit are left as orphans in
      // the store — they are immutable and harmless.
      for (let i = journal.length - 1; i >= 0; i--) {
        const op = journal[i];
        const coll = this.collection(op.collection);
        try {
          switch (op.type) {
            case 'insert':
              // Remove the new mapping (block stays in store)
              await coll._txRollbackInsert(op.doc._id!);
              break;
            case 'update':
              // Restore old mapping (old block still in store — CoW)
              await coll._txRollbackUpdate(op.docId, op.before as BsonDocument);
              break;
            case 'delete':
              // Restore old mapping (old block still in store — CoW)
              await coll._txRollbackDelete(op.doc as BsonDocument);
              break;
          }
        } catch {
          // Best-effort rollback
        }
      }
    };

    return new DbSession(commitCallback, rollbackCallback);
  }

  /**
   * Alias for {@link startSession} — provided for MongoDB driver compatibility.
   */
  session(): ClientSession {
    return this.startSession();
  }

  /**
   * Convenience: run a callback within a transaction.
   * Automatically commits on success, aborts on error.
   */
  async withTransaction<R>(
    fn: (session: ClientSession) => Promise<R>,
  ): Promise<R> {
    const session = this.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      try {
        await session.abortTransaction();
      } catch {
        // Abort may fail if the transaction was already ended (e.g. commitTransaction
        // already ran its finally block). Swallow so the original error surfaces.
      }
      throw err;
    } finally {
      session.endSession();
    }
  }

  // ═══════════════════════════════════════════════════════
  // Server-side cursor sessions (for REST pagination)
  // ═══════════════════════════════════════════════════════

  /**
   * Create a server-side cursor session for paginated access.
   */
  createCursorSession(
    params: Omit<CursorSession, 'id' | 'lastAccessed'>,
  ): CursorSession {
    this.cleanExpiredCursors();
    const id = randomUUID();
    const cursor: CursorSession = {
      ...params,
      id,
      lastAccessed: Date.now(),
    };
    this.cursorSessions.set(id, cursor);
    return cursor;
  }

  /**
   * Get a cursor session by ID and advance its position.
   * Returns null if the cursor has expired or doesn't exist.
   */
  getCursorSession(cursorId: string): CursorSession | null {
    const cursor = this.cursorSessions.get(cursorId);
    if (!cursor) return null;
    if (Date.now() - cursor.lastAccessed > this.cursorTimeoutMs) {
      this.cursorSessions.delete(cursorId);
      return null;
    }
    cursor.lastAccessed = Date.now();
    return cursor;
  }

  /**
   * Advance cursor position and return next batch of document IDs.
   */
  getNextBatch(cursorId: string): DocumentId[] | null {
    const cursor = this.getCursorSession(cursorId);
    if (!cursor) return null;
    const start = cursor.position;
    const end = Math.min(start + cursor.batchSize, cursor.documentIds.length);
    cursor.position = end;
    return cursor.documentIds.slice(start, end);
  }

  /**
   * Close and remove a cursor session.
   */
  closeCursorSession(cursorId: string): boolean {
    return this.cursorSessions.delete(cursorId);
  }

  /**
   * Clean up expired cursor sessions.
   */
  private cleanExpiredCursors(): void {
    const now = Date.now();
    for (const [id, cursor] of this.cursorSessions.entries()) {
      if (now - cursor.lastAccessed > this.cursorTimeoutMs) {
        this.cursorSessions.delete(id);
      }
    }
  }
}
