/**
 * Transaction engine – re-exports from @brightchain/brightchain-lib.
 *
 * The platform-agnostic transaction engine now lives in brightchain-lib.
 * This file re-exports everything for backward compatibility.
 */
export {
  DbSession,
  type CommitCallback,
  type JournalOp,
  type RollbackCallback,
} from '@brightchain/brightchain-lib/lib/db/transaction';
