/**
 * Common types used throughout brightchain-db.
 *
 * Platform-agnostic types come from @brightchain/brightchain-lib.
 * Node.js-specific storage types come from @digitaldefiance/node-express-suite.
 * ClientSession is a type alias for IClientSession.
 */

// Platform-agnostic types from brightchain-lib
export type {
  BsonDocument,
  DocumentId,
  FieldSchema,
  ValidationFieldError,
} from '@brightchain/brightchain-lib';

// Node.js-specific storage types from node-express-suite (imported directly
// to avoid a circular dependency: brightchain-api-lib ↔ brightchain-db)
export type {
  AggregationStage,
  BulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ChangeEvent,
  ChangeEventType,
  ChangeListener,
  ClientSession,
  CollectionOptions,
  CollectionSchema,
  CollectionSchemaFieldType,
  CursorSession,
  DeleteResult,
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
} from '@digitaldefiance/node-express-suite';
