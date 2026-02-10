/**
 * @brightchain/db
 *
 * A MongoDB-like document database backed by BrightChain's block store.
 */

// Core types
export type {
  AggregationStage,
  BsonDocument,
  BulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ChangeEvent,
  ChangeEventType,
  ChangeListener,
  ClientSession,
  CollectionOptions,
  CursorSession,
  DeleteResult,
  DocumentId,
  FilterOperator,
  FilterQuery,
  FindOptions,
  IndexOptions,
  IndexSpec,
  InsertManyResult,
  InsertOneResult,
  LogicalOperators,
  ProjectionSpec,
  ReadPreference,
  ReplaceResult,
  SortSpec,
  TextIndexOptions,
  UpdateOperators,
  UpdateOptions,
  UpdateQuery,
  UpdateResult,
  WriteConcern,
  WriteOptions,
} from './lib/types';

// Database & Collection
export { Collection, HeadRegistry } from './lib/collection';
export type { CollectionResolver } from './lib/collection';
export { BrightChainDb } from './lib/database';
export type { BrightChainDbOptions } from './lib/database';

// Cursor
export { Cursor } from './lib/cursor';

// Query engine
export {
  applyProjection,
  compareValues,
  deepEquals,
  getTextSearchFields,
  matchesFilter,
  setTextSearchFields,
  sortDocuments,
  tokenize,
} from './lib/queryEngine';

// Update engine
export { applyUpdate, isOperatorUpdate } from './lib/updateEngine';

// Aggregation
export { runAggregation } from './lib/aggregation';

// Indexing
export {
  CollectionIndex,
  DuplicateKeyError,
  IndexManager,
} from './lib/indexing';

// Transactions
export { DbSession } from './lib/transaction';
export type {
  CommitCallback,
  JournalOp,
  RollbackCallback,
} from './lib/transaction';

// Express middleware
export { createDbRouter } from './lib/expressMiddleware';
export type { DbRouterOptions } from './lib/expressMiddleware';

// Errors
export {
  BrightChainDbError,
  BulkWriteError,
  DocumentNotFoundError,
  IndexError,
  TransactionError,
  ValidationError,
  WriteConcernError,
} from './lib/errors';
export type {
  BulkWriteOperationError,
  ValidationFieldError,
  WriteConcernSpec,
} from './lib/errors';

// Schema validation
export { applyDefaults, validateDocument } from './lib/schemaValidation';
export type {
  CollectionSchema,
  FieldSchema,
  SchemaType,
} from './lib/schemaValidation';
