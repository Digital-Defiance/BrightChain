/**
 * Shared document store types for MongoDB-compatible query/update/result contracts.
 *
 * Platform-agnostic types (BsonDocument, DocumentId, FieldSchema, ValidationFieldError)
 * are defined in @brightchain/brightchain-lib — import them directly from there.
 * This file only re-exports Node.js-specific types from node-express-suite.
 */

// Node.js/Express-specific types from node-express-suite
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
