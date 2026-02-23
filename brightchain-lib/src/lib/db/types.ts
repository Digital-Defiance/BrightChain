/**
 * Common types used throughout the database engine.
 *
 * Platform-agnostic types come from brightchain-lib's own interfaces.
 * Storage/query types come from @digitaldefiance/suite-core-lib.
 *
 * This barrel provides a single import point for all db-related types.
 */

// Platform-agnostic types from brightchain-lib
export type {
  BsonDocument,
  DocumentId,
  FieldSchema,
  ValidationFieldError,
} from '../interfaces/storage/documentTypes';

// Storage/query types from suite-core-lib
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
} from '@digitaldefiance/suite-core-lib';
