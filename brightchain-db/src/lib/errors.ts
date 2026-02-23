/**
 * Re-export all error classes and types from brightchain-lib.
 *
 * The canonical implementations now live in
 * `@brightchain/brightchain-lib/lib/db/errors`.
 * This file preserves backward-compatible imports for brightchain-db consumers.
 */
export {
  BrightChainDbError,
  BulkWriteError,
  DocumentNotFoundError,
  IndexError,
  TransactionError,
  ValidationError,
  WriteConcernError,
} from '@brightchain/brightchain-lib/lib/db/errors';

export type {
  BulkWriteOperationError,
  ValidationFieldError,
  WriteConcernSpec,
} from '@brightchain/brightchain-lib/lib/db/errors';
