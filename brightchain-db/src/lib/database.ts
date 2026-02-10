/**
 * BrightChainDb – the top-level database object.
 *
 * Usage:
 *   const db = new BrightChainDb(blockStore, { name: 'mydb' });
 *   const users = db.collection('users');
 *   await users.insertOne({ name: 'Alice' });
 */

import { IBlockStore } from '@brightchain/brightchain-lib';
import { randomUUID } from 'crypto';
import { Collection, HeadRegistry } from './collection';
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
  /** Custom head registry (for testing isolation) */
  headRegistry?: HeadRegistry;
  /** Cursor session timeout in ms (default: 300000 = 5 minutes) */
  cursorTimeoutMs?: number;
}

/**
 * The main database driver – analogous to MongoDB's `Db` class.
 */
export class BrightChainDb {
  public readonly name: string;
  private readonly store: IBlockStore;
  private readonly collections = new Map<string, Collection>();
  private readonly headRegistry: HeadRegistry;
  /** Server-side cursor sessions for REST pagination */
  private readonly cursorSessions = new Map<string, CursorSession>();
  /** Default timeout for cursor sessions (5 minutes) */
  private readonly cursorTimeoutMs: number;

  constructor(blockStore: IBlockStore, options?: BrightChainDbOptions) {
    this.store = blockStore;
    this.name = options?.name ?? 'brightchain';
    this.headRegistry = options?.headRegistry ?? HeadRegistry.getInstance();
    this.cursorTimeoutMs = options?.cursorTimeoutMs ?? 300_000;
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
