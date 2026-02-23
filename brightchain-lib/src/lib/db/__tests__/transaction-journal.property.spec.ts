/**
 * @fileoverview Property-based test for DbSession journal semantics.
 *
 * **Feature: db-core-to-lib, Property 3: DbSession commit/abort journal semantics**
 *
 * For any sequence of JournalOp entries added to a DbSession, committing the
 * transaction should invoke the commit callback with all journal entries in
 * order, and aborting should invoke the rollback callback and leave the journal
 * empty. After either operation, inTransaction should be false.
 *
 * **Validates: Requirements 5.3**
 */

import fc from 'fast-check';
import type {
  BsonDocument,
  DocumentId,
} from '../../interfaces/storage/documentTypes';
import type {
  CommitCallback,
  JournalOp,
  RollbackCallback,
} from '../transaction';
import { DbSession } from '../transaction';

/**
 * Arbitrary for a simple BsonDocument value.
 */
const arbBsonDocument: fc.Arbitrary<BsonDocument> = fc.record({
  _id: fc.string({ minLength: 1, maxLength: 20 }),
  field: fc.string({ minLength: 0, maxLength: 50 }),
});

/**
 * Arbitrary for a DocumentId.
 */
const arbDocumentId: fc.Arbitrary<DocumentId> = fc.string({
  minLength: 1,
  maxLength: 20,
});

/**
 * Arbitrary for a collection name.
 */
const arbCollectionName: fc.Arbitrary<string> = fc.string({
  minLength: 1,
  maxLength: 20,
});

/**
 * Arbitrary for a single JournalOp (insert, update, or delete).
 */
const arbJournalOp: fc.Arbitrary<JournalOp> = fc.oneof(
  fc.record({
    type: fc.constant('insert' as const),
    collection: arbCollectionName,
    doc: arbBsonDocument,
  }),
  fc.record({
    type: fc.constant('update' as const),
    collection: arbCollectionName,
    docId: arbDocumentId,
    before: arbBsonDocument,
    after: arbBsonDocument,
  }),
  fc.record({
    type: fc.constant('delete' as const),
    collection: arbCollectionName,
    docId: arbDocumentId,
    doc: arbBsonDocument,
  }),
);

/**
 * Arbitrary for a non-empty array of JournalOp entries.
 */
const arbJournalOps: fc.Arbitrary<JournalOp[]> = fc.array(arbJournalOp, {
  minLength: 1,
  maxLength: 20,
});

describe('Feature: db-core-to-lib, Property 3: DbSession commit/abort journal semantics', () => {
  /**
   * **Validates: Requirements 5.3**
   *
   * After startTransaction + adding N ops + commitTransaction:
   * the commit callback receives all N ops in insertion order,
   * and inTransaction is false afterwards.
   */
  it('commit delivers all ops in order and sets inTransaction to false', async () => {
    await fc.assert(
      fc.asyncProperty(arbJournalOps, async (ops) => {
        let committedJournal: JournalOp[] = [];
        const onCommit: CommitCallback = async (journal) => {
          committedJournal = [...journal];
        };
        const onRollback: RollbackCallback = async () => {
          /* no-op for commit path */
        };

        const session = new DbSession(onCommit, onRollback);

        session.startTransaction();
        expect(session.inTransaction).toBe(true);

        for (const op of ops) {
          session.addOp(op);
        }

        await session.commitTransaction();

        // Commit callback received all ops in order
        expect(committedJournal).toHaveLength(ops.length);
        for (let i = 0; i < ops.length; i++) {
          expect(committedJournal[i]).toEqual(ops[i]);
        }

        // inTransaction is false after commit
        expect(session.inTransaction).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.3**
   *
   * After startTransaction + adding N ops + abortTransaction:
   * the rollback callback receives the ops, the journal is cleared,
   * and inTransaction is false afterwards.
   */
  it('abort invokes rollback callback and clears journal', async () => {
    await fc.assert(
      fc.asyncProperty(arbJournalOps, async (ops) => {
        let rolledBackJournal: JournalOp[] = [];
        const onCommit: CommitCallback = async () => {
          /* no-op for abort path */
        };
        const onRollback: RollbackCallback = async (journal) => {
          rolledBackJournal = [...journal];
        };

        const session = new DbSession(onCommit, onRollback);

        session.startTransaction();
        expect(session.inTransaction).toBe(true);

        for (const op of ops) {
          session.addOp(op);
        }

        await session.abortTransaction();

        // Rollback callback received the ops
        expect(rolledBackJournal).toHaveLength(ops.length);
        for (let i = 0; i < ops.length; i++) {
          expect(rolledBackJournal[i]).toEqual(ops[i]);
        }

        // Journal is cleared after abort
        expect(session.getJournal()).toHaveLength(0);

        // inTransaction is false after abort
        expect(session.inTransaction).toBe(false);
      }),
      { numRuns: 100 },
    );
  });
});
