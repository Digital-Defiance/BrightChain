/**
 * Transaction engine – provides multi-document ACID-like transactions
 * using a copy-on-write journal.
 *
 * BrightChain blocks are immutable: we never modify or delete existing blocks.
 * Writes always create new blocks. The journal tracks which *new* blocks were
 * added (and which old mappings they replaced) so that:
 *
 *   • commit  – applies the buffered mapping changes to the collections
 *   • abort   – discards the journal; no blocks need to be removed because
 *               orphaned blocks are harmless in a content-addressable store
 *
 * Rollback after a partial commit simply restores the old doc-index mappings.
 * The "orphan" blocks written during the failed commit stay in the store –
 * they can be reclaimed by a separate GC sweep if needed.
 */

import { randomUUID } from 'crypto';
import { BsonDocument, ClientSession, DocumentId } from './types';

/**
 * A single operation in the transaction journal.
 *
 * - **insert** – a new document to be added.  Rollback removes the mapping.
 * - **update** – `before` is kept so rollback can restore the old mapping
 *   (the old block still exists in the store thanks to copy-on-write).
 * - **delete** – `doc` is the document that was mapped.  Rollback restores it.
 */
export type JournalOp =
  | { type: 'insert'; collection: string; doc: BsonDocument }
  | {
      type: 'update';
      collection: string;
      docId: DocumentId;
      before: BsonDocument;
      after: BsonDocument;
    }
  | {
      type: 'delete';
      collection: string;
      docId: DocumentId;
      doc: BsonDocument;
    };

/** Callback to apply a journal to the actual store */
export type CommitCallback = (journal: JournalOp[]) => Promise<void>;

/** Callback to roll back a committed journal */
export type RollbackCallback = (journal: JournalOp[]) => Promise<void>;

/**
 * A client session that supports transactions.
 */
export class DbSession implements ClientSession {
  public readonly id: string;
  private _inTransaction = false;
  private _journal: JournalOp[] = [];
  private _ended = false;

  constructor(
    private readonly onCommit: CommitCallback,
    private readonly onRollback: RollbackCallback,
  ) {
    this.id = randomUUID();
  }

  get inTransaction(): boolean {
    return this._inTransaction;
  }

  /**
   * Start a new transaction.
   * @throws Error if a transaction is already in progress or session is ended.
   */
  startTransaction(): void {
    if (this._ended) throw new Error('Session has ended');
    if (this._inTransaction) throw new Error('Transaction already in progress');
    this._inTransaction = true;
    this._journal = [];
  }

  /**
   * Add an operation to the transaction journal.
   * @throws Error if no transaction is in progress.
   */
  addOp(op: JournalOp): void {
    if (!this._inTransaction) {
      throw new Error('No transaction in progress');
    }
    this._journal.push(op);
  }

  /**
   * Read the current journal (for testing/inspection).
   */
  getJournal(): ReadonlyArray<JournalOp> {
    return this._journal;
  }

  /**
   * Commit the current transaction – applies all journal ops atomically.
   * @throws Error if no transaction is in progress.
   */
  async commitTransaction(): Promise<void> {
    if (!this._inTransaction) {
      throw new Error('No transaction in progress');
    }
    try {
      await this.onCommit(this._journal);
    } catch (err) {
      // If commit fails, roll back anything that was partially applied
      await this.onRollback(this._journal);
      throw err;
    } finally {
      this._inTransaction = false;
      this._journal = [];
    }
  }

  /**
   * Abort the current transaction – discards all journal ops.
   */
  async abortTransaction(): Promise<void> {
    if (!this._inTransaction) {
      throw new Error('No transaction in progress');
    }
    // If any ops were partially applied (shouldn't happen in normal flow), roll back
    if (this._journal.length > 0) {
      await this.onRollback(this._journal);
    }
    this._inTransaction = false;
    this._journal = [];
  }

  /**
   * End the session. Aborts any in-progress transaction.
   */
  endSession(): void {
    if (this._inTransaction) {
      this._inTransaction = false;
      this._journal = [];
    }
    this._ended = true;
  }
}
