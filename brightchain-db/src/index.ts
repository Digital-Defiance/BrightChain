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
export { Collection, HeadRegistry, calculateBlockId } from './lib/collection';
export type {
  CollectionResolver,
  ICollectionHeadRegistry,
} from './lib/collection';
export { BrightDb } from './lib/database';
export type { BrightDbOptions } from './lib/database';

// Head registries
export {
  InMemoryHeadRegistry,
  PersistentHeadRegistry,
} from './lib/headRegistry';
export type { HeadRegistryOptions } from './lib/headRegistry';

// Authorized head registry (Write ACL enforcement)
export {
  AuthorizedHeadRegistry,
  type ILocalSigner,
} from './lib/authorizedHeadRegistry';

// Write ACL management
export { WriteAclManager } from './lib/writeAclManager';
export type { AclChangeListener, IAclChangeEvent } from './lib/writeAclManager';

// Pooled store adapter
export { PooledStoreAdapter } from './lib/pooledStoreAdapter';

// Re-exports from brightchain-lib for backward compatibility
export {
  InMemoryDatabase,
  createDefaultUuidGenerator,
} from '@brightchain/brightchain-lib';

// CBL Index
export { CBLIndex } from './lib/cblIndex';
export type { CBLIndexOptions } from './lib/cblIndex';

// Model
export { Model, TypedCursor } from './lib/model';
export type { ModelOptions } from './lib/model';

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
  BrightDbError,
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

// BrightHub Social Network Schemas
export * from './lib/schemas';
