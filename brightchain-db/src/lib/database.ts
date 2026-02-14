/**
 * BrightChainDb – the top-level database object.
 *
 * Usage:
 *   const db = new BrightChainDb(blockStore, { name: 'mydb' });
 *   const users = db.collection('users');
 *   await users.insertOne({ name: 'Alice' });
 */

import type { IHeadRegistry, PoolId } from '@brightchain/brightchain-lib';
import {
  IBlockStore,
  IDatabase,
  isPooledBlockStore,
} from '@brightchain/brightchain-lib';
import { randomUUID } from 'crypto';
import { Collection } from './collection';
import { InMemoryHeadRegistry, PersistentHeadRegistry } from './headRegistry';
import { PooledStoreAdapter } from './pooledStoreAdapter';
import { DbSession, JournalOp } from './transaction';
import {
  BsonDocument,
  ClientSession,
  CollectionOptions,
  CursorSession,
  DocumentId,
} from './types';

/**
 * Options for creating a BrightChainDb instance.
 */
export interface BrightChainDbOptions {
  /** Database name (default: 'brightchain') */
  name?: string;
  /** Custom head registry for dependency injection (takes precedence over dataDir) */
  headRegistry?: IHeadRegistry;
  /**
   * Data directory for persistent head registry.
   * When provided (and no explicit headRegistry), a PersistentHeadRegistry
   * is auto-created pointing at this directory.
   */
  dataDir?: string;
  /** Cursor session timeout in ms (default: 300000 = 5 minutes) */
  cursorTimeoutMs?: number;
  /** Optional pool ID for storage isolation */
  poolId?: PoolId;
}

/**
 * The main database driver – analogous to MongoDB's `Db` class.
 */
export class BrightChainDb implements IDatabase {
  public readonly name: string;
  private readonly store: IBlockStore;
  /** Original (unwrapped) block store, kept for pool management (e.g. dropDatabase) */
  private readonly originalStore: IBlockStore;
  /** Pool ID this database is scoped to, if any */
  private readonly poolId?: PoolId;
  private readonly collections = new Map<string, Collection>();
  private readonly headRegistry: IHeadRegistry;
  /** Server-side cursor sessions for REST pagination */
  private readonly cursorSessions = new Map<string, CursorSession>();
  /** Default timeout for cursor sessions (5 minutes) */
  private readonly cursorTimeoutMs: number;
  /** Connection state for IDatabase conformance */
  private _connected = false;

  constructor(blockStore: IBlockStore, options?: BrightChainDbOptions) {
    this.originalStore = blockStore;
    this.poolId = options?.poolId;

    if (options?.poolId && isPooledBlockStore(blockStore)) {
      this.store = new PooledStoreAdapter(blockStore, options.poolId);
    } else {
      this.store = blockStore;
    }

    this.name = options?.name ?? 'brightchain';

    // Head registry resolution order:
    // 1. Explicit headRegistry option (takes precedence)
    // 2. dataDir option → auto-create PersistentHeadRegistry
    // 3. Default → InMemoryHeadRegistry
    if (options?.headRegistry) {
      this.headRegistry = options.headRegistry;
    } else if (options?.dataDir) {
      this.headRegistry = new PersistentHeadRegistry({
        dataDir: options.dataDir,
      });
    } else {
      this.headRegistry = new InMemoryHeadRegistry();
    }

    this.cursorTimeoutMs = options?.cursorTimeoutMs ?? 300_000;
  }

  /**
   * Connect to the backing store.
   * Block storage does not require a network connection, so the URI is
   * accepted but ignored. Calling connect on an already-connected instance
   * completes without error (idempotent).
   */
  async connect(_uri?: string): Promise<void> {
    this._connected = true;
  }

  /**
   * Disconnect from the backing store.
   * Calling disconnect on an already-disconnected instance completes
   * without error (idempotent).
   */
  async disconnect(): Promise<void> {
    this._connected = false;
  }

  /**
   * Whether the store is currently connected.
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
      const coll = new Collection<T>(
        name,
        this.store,
        this.name,
        this.headRegistry,
        options,
      );
      // Wire up cross-collection resolver for $lookup
      coll.setCollectionResolver((collName: string) =>
        this.collection(collName),
      );
      this.collections.set(name, coll as unknown as Collection);
    }
    return this.collections.get(name) as unknown as Collection<T>;
  }

  /**
   * Expose the head registry for components that need to read head block IDs
   * (e.g. CBLIndex for FEC parity generation on metadata blocks).
   */
  getHeadRegistry(): IHeadRegistry {
    return this.headRegistry;
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
   * Drop the entire database.
   * If a poolId was configured and the underlying store supports pools,
   * deletes the corresponding pool and all its blocks.
   */
  async dropDatabase(): Promise<void> {
    if (this.poolId && isPooledBlockStore(this.originalStore)) {
      await this.originalStore.deletePool(this.poolId);
    }
    this.collections.clear();
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
      await session.abortTransaction();
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
