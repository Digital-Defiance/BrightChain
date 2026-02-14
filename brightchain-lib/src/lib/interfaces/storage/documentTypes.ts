/**
 * Shared document store types for MongoDB-compatible query/update/result contracts.
 *
 * These types are now defined in @digitaldefiance/node-express-suite and
 * re-exported here for backward compatibility.
 */
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
  CollectionSchema,
  CollectionSchemaFieldType,
  CursorSession,
  DeleteResult,
  DocumentId,
  FieldSchema,
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
  ValidationFieldError,
  WriteConcern,
  WriteOptions,
} from '@digitaldefiance/node-express-suite';
