/**
 * InMemoryDatabase – a platform-agnostic IDatabase implementation.
 *
 * Uses MemoryBlockStore and InMemoryHeadRegistry for storage, requiring
 * no Node.js APIs. This is the base class that BrightChainDb in
 * brightchain-db extends to add disk persistence.
 *
 * Usage:
 *   const db = new InMemoryDatabase(blockStore, { name: 'mydb' });
 *   await db.connect();
 *   const users = db.collection('users');
 *   await users.insertOne({ name: 'Alice' });
 */

import type {
  CollectionOptions,
  CursorSession,
  IClientSession,
  ICollection,
  IDatabase,
} from '@digitaldefiance/suite-core-lib';
import type { IBlockStore } from '../interfaces/storage/blockStore';
import type {
  BsonDocument,
  DocumentId,
} from '../interfaces/storage/documentTypes';
import type { IHeadRegistry } from '../interfaces/storage/headRegistry';
import { Collection } from './collection';
import { InMemoryHeadRegistry } from './inMemoryHeadRegistry';
import { DbSession, JournalOp } from './transaction';
import type { UuidGenerator } from './uuidGenerator';
import { createDefaultUuidGenerator } from './uuidGenerator';

/**
 * Options for creating an InMemoryDatabase instance.
 */
export interface InMemoryDatabaseOptions {
  /** Database name (default: 'brightchain') */
  name?: string;
  /** Custom head registry (default: new InMemoryHeadRegistry()) */
  headRegistry?: IHeadRegistry;
  /** Custom UUID generator (default: createDefaultUuidGenerator()) */
  uuidGenerator?: UuidGenerator;
  /** Cursor session timeout in ms (default: 300000 = 5 minutes) */
  cursorTimeoutMs?: number;
}

/**
 * The main in-memory database driver – analogous to MongoDB's `Db` class.
 *
 * Designed to be extended by `BrightChainDb` in brightchain-db which adds
 * persistence-specific options (dataDir, poolId, PersistentHeadRegistry).
 */
export class InMemoryDatabase implements IDatabase {
  public readonly name: string;
  protected readonly store: IBlockStore;
  protected readonly collections = new Map<string, Collection>();
  protected readonly headRegistry: IHeadRegistry;
  protected readonly uuidGenerator: UuidGenerator;
  /** Server-side cursor sessions for REST pagination */
  protected readonly cursorSessions = new Map<string, CursorSession>();
  /** Default timeout for cursor sessions (5 minutes) */
  protected readonly cursorTimeoutMs: number;
  /** Connection state for IDatabase conformance */
  protected _connected = false;

  constructor(blockStore: IBlockStore, options?: InMemoryDatabaseOptions) {
    this.store = blockStore;
    this.name = options?.name ?? 'brightchain';
    this.headRegistry = options?.headRegistry ?? new InMemoryHeadRegistry();
    this.uuidGenerator = options?.uuidGenerator ?? createDefaultUuidGenerator();
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
  ): ICollection<T> {
    if (!this.collections.has(name)) {
      const coll = new Collection<T>(
        name,
        this.store,
        this.name,
        this.headRegistry,
        options,
        this.uuidGenerator,
      );
      // Wire up cross-collection resolver for $lookup
      coll.setCollectionResolver(
        (collName: string) => this.collection(collName) as Collection,
      );
      this.collections.set(name, coll as unknown as Collection);
    }
    return this.collections.get(name) as unknown as ICollection<T>;
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
   * Clears all collections. Subclasses may add pool management.
   */
  async dropDatabase(): Promise<void> {
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
  startSession(): IClientSession {
    const commitCallback = async (journal: JournalOp[]) => {
      for (const op of journal) {
        const coll = this.collection(op.collection) as Collection;
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
        const coll = this.collection(op.collection) as Collection;
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

    return new DbSession(commitCallback, rollbackCallback, this.uuidGenerator);
  }

  /**
   * Convenience: run a callback within a transaction.
   * Automatically commits on success, aborts on error.
   */
  async withTransaction<R>(
    fn: (session: IClientSession) => Promise<R>,
  ): Promise<R> {
    const session = this.startSession();
    session.startTransaction();
    try {
      const result = await fn(session);
      await session.commitTransaction();
      return result;
    } catch (err) {
      // Only abort if the transaction is still active.
      // commitTransaction() clears inTransaction in its finally block, so if
      // the error came from commitTransaction itself the abort is already done.
      if (session.inTransaction) {
        await session.abortTransaction();
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
    const id = this.uuidGenerator();
    const cursor: CursorSession = {
      ...params,
      id,
      lastAccessed: Date.now(),
    };
    this.cursorSessions.set(id, cursor);
    return cursor;
  }

  /**
   * Get a cursor session by ID and refresh its last-accessed timestamp.
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
  protected cleanExpiredCursors(): void {
    const now = Date.now();
    for (const [id, cursor] of this.cursorSessions.entries()) {
      if (now - cursor.lastAccessed > this.cursorTimeoutMs) {
        this.cursorSessions.delete(id);
      }
    }
  }
}
