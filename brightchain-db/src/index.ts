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
  IClientSession,
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
export { Collection } from './lib/collection';
export type { CollectionResolver } from './lib/collection';
export { BrightChainDb } from './lib/database';

// CBL Index
export { CBLIndex, type CBLIndexOptions } from './lib/cblIndex';

// HeadRegistry implementations
export type { BrightChainDbOptions } from './lib/database';
export {
  InMemoryHeadRegistry,
  PersistentHeadRegistry,
} from './lib/headRegistry';
export type { HeadRegistryOptions } from './lib/headRegistry';

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
export type { BulkWriteOperationError, WriteConcernSpec } from './lib/errors';

// Re-export promoted schema types from types.ts (sourced from brightchain-lib)
export type {
  CollectionSchema,
  FieldSchema,
  ValidationFieldError,
} from './lib/types';

// Schema validation functions and local SchemaType alias
export { applyDefaults, validateDocument } from './lib/schemaValidation';
export type { SchemaType } from './lib/schemaValidation';
