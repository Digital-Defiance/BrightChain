/**
 * Common types used throughout brightchain-db
 */

/** A document ID – opaque string */
export type DocumentId = string;

/** The shape of a stored document – any record with an optional _id */
export type BsonDocument = Record<string, unknown> & { _id?: DocumentId };

/**
 * MongoDB-style filter with query operators.
 *
 * Supports:
 *   - Exact match: `{ field: value }`
 *   - Comparison: `{ field: { $eq, $ne, $gt, $gte, $lt, $lte } }`
 *   - Set: `{ field: { $in: [...], $nin: [...] } }`
 *   - Pattern: `{ field: { $regex: /.../ } }`
 *   - Existence: `{ field: { $exists: true } }`
 *   - Logical: `{ $and: [...], $or: [...], $not: {...}, $nor: [...] }`
 *   - Array: `{ field: { $elemMatch: {...} } }`
 */
export type FilterQuery<T> = {
  [P in keyof T]?: T[P] | FilterOperator<T[P]>;
} & LogicalOperators<T>;

export interface FilterOperator<V> {
  $eq?: V;
  $ne?: V;
  $gt?: V;
  $gte?: V;
  $lt?: V;
  $lte?: V;
  $in?: V[];
  $nin?: V[];
  $regex?: RegExp | string;
  $exists?: boolean;
  $not?: FilterOperator<V>;
  $elemMatch?: Record<string, unknown>;
  $size?: number;
  $type?: string;
  $all?: V[];
}

export interface LogicalOperators<T> {
  $and?: FilterQuery<T>[];
  $or?: FilterQuery<T>[];
  $nor?: FilterQuery<T>[];
  $not?: FilterQuery<T>;
}

/**
 * MongoDB-style update operators
 */
export interface UpdateOperators<T> {
  $set?: Partial<T>;
  $unset?: { [P in keyof T]?: 1 | '' | true };
  $inc?: { [P in keyof T]?: number };
  $push?: { [P in keyof T]?: unknown };
  $pull?: { [P in keyof T]?: unknown };
  $addToSet?: { [P in keyof T]?: unknown };
  $min?: Partial<T>;
  $max?: Partial<T>;
  $rename?: { [key: string]: string };
  $currentDate?: { [P in keyof T]?: true | { $type: 'date' | 'timestamp' } };
  $mul?: { [P in keyof T]?: number };
  $pop?: { [P in keyof T]?: 1 | -1 };
}

/** The update document can be either operators or a full replacement */
export type UpdateQuery<T> = UpdateOperators<T> | Partial<T>;

/**
 * Sort specification: 1 = ascending, -1 = descending
 */
export type SortSpec<T = BsonDocument> = {
  [P in keyof T]?: 1 | -1;
} & Record<string, 1 | -1>;

/**
 * Projection specification: 1 = include, 0 = exclude
 */
export type ProjectionSpec<T = BsonDocument> = {
  [P in keyof T]?: 1 | 0;
} & Record<string, 1 | 0>;

/**
 * Index specification: 1 = ascending, -1 = descending
 */
export type IndexSpec = Record<string, 1 | -1>;

/**
 * Options for index creation
 */
export interface IndexOptions {
  unique?: boolean;
  name?: string;
  sparse?: boolean;
  background?: boolean;
  /** TTL: automatically expire documents after this many seconds */
  expireAfterSeconds?: number;
}

/**
 * Options for find operations
 */
export interface FindOptions<T = BsonDocument> {
  projection?: ProjectionSpec<T>;
  sort?: SortSpec<T>;
  limit?: number;
  skip?: number;
  session?: ClientSession;
}

/**
 * Options for write operations
 */
export interface WriteOptions {
  session?: ClientSession;
  /** Write concern for this operation */
  writeConcern?: WriteConcern;
}

/**
 * Options for update operations
 */
export interface UpdateOptions extends WriteOptions {
  upsert?: boolean;
}

/**
 * Result of an insert operation
 */
export interface InsertOneResult {
  acknowledged: boolean;
  insertedId: DocumentId;
}

export interface InsertManyResult {
  acknowledged: boolean;
  insertedCount: number;
  insertedIds: Record<number, DocumentId>;
}

/**
 * Result of an update operation
 */
export interface UpdateResult {
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  upsertedId?: DocumentId;
}

/**
 * Result of a delete operation
 */
export interface DeleteResult {
  acknowledged: boolean;
  deletedCount: number;
}

/**
 * Result of a replace operation
 */
export interface ReplaceResult {
  acknowledged: boolean;
  matchedCount: number;
  modifiedCount: number;
  upsertedCount: number;
  upsertedId?: DocumentId;
}

/** Change stream event types */
export type ChangeEventType = 'insert' | 'update' | 'replace' | 'delete';

export interface ChangeEvent<T = BsonDocument> {
  operationType: ChangeEventType;
  documentKey: { _id: DocumentId };
  fullDocument?: T;
  updateDescription?: {
    updatedFields?: Partial<T>;
    removedFields?: string[];
  };
  ns: { db: string; coll: string };
  timestamp: Date;
}

/** Listener for change events */
export type ChangeListener<T = BsonDocument> = (event: ChangeEvent<T>) => void;

/**
 * Aggregation pipeline stage types
 */
export type AggregationStage =
  | { $match: Record<string, unknown> }
  | { $group: Record<string, unknown> }
  | { $sort: Record<string, 1 | -1> }
  | { $limit: number }
  | { $skip: number }
  | { $project: Record<string, unknown> }
  | { $unwind: string | { path: string; preserveNullAndEmptyArrays?: boolean } }
  | { $count: string }
  | { $addFields: Record<string, unknown> }
  | {
      $lookup: {
        from: string;
        localField: string;
        foreignField: string;
        as: string;
      };
    }
  | { $replaceRoot: { newRoot: string | Record<string, unknown> } }
  | { $out: string }
  | { $sample: { size: number } }
  | { $facet: Record<string, AggregationStage[]> };

/**
 * Client session interface for transaction support
 */
export interface ClientSession {
  /** Unique session ID */
  readonly id: string;
  /** Whether a transaction is currently active */
  readonly inTransaction: boolean;
  /** Start a new transaction */
  startTransaction(): void;
  /** Commit the current transaction */
  commitTransaction(): Promise<void>;
  /** Abort the current transaction */
  abortTransaction(): Promise<void>;
  /** End the session */
  endSession(): void;
}

// ═══════════════════════════════════════════════════════
// Write concern / Read preference
// ═══════════════════════════════════════════════════════

/**
 * Write concern – controls acknowledgment of write operations.
 */
export interface WriteConcern {
  /** Number of acknowledgments: 0 = fire-and-forget, 1 = primary (default), 'majority' */
  w?: number | 'majority';
  /** Timeout in ms for write concern acknowledgment */
  wtimeoutMS?: number;
  /** Whether to wait for journal commit before acknowledging */
  journal?: boolean;
}

/**
 * Read preference – controls which store replicas are read from.
 */
export type ReadPreference =
  | 'primary' // always read from the primary store
  | 'secondary' // prefer reading from a replica
  | 'nearest'; // read from the lowest-latency store

/**
 * Options for creating a collection with validation and other settings.
 */
export interface CollectionOptions {
  /** Write concern for all operations on this collection */
  writeConcern?: WriteConcern;
  /** Read preference for all read operations on this collection */
  readPreference?: ReadPreference;
}

// ═══════════════════════════════════════════════════════
// Bulk write
// ═══════════════════════════════════════════════════════

export type BulkWriteOperation<T extends BsonDocument = BsonDocument> =
  | { insertOne: { document: T } }
  | {
      updateOne: {
        filter: FilterQuery<T>;
        update: UpdateQuery<T>;
        upsert?: boolean;
      };
    }
  | { updateMany: { filter: FilterQuery<T>; update: UpdateQuery<T> } }
  | { deleteOne: { filter: FilterQuery<T> } }
  | { deleteMany: { filter: FilterQuery<T> } }
  | {
      replaceOne: { filter: FilterQuery<T>; replacement: T; upsert?: boolean };
    };

export interface BulkWriteOptions extends WriteOptions {
  /** If true, stop on the first error. If false, continue and report all errors. (default: true) */
  ordered?: boolean;
}

export interface BulkWriteResult {
  acknowledged: boolean;
  insertedCount: number;
  matchedCount: number;
  modifiedCount: number;
  deletedCount: number;
  upsertedCount: number;
  insertedIds: Record<number, DocumentId>;
  upsertedIds: Record<number, DocumentId>;
}

// ═══════════════════════════════════════════════════════
// Text search
// ═══════════════════════════════════════════════════════

/**
 * Text index options
 */
export interface TextIndexOptions {
  /** Fields to index for text search, with optional weights */
  fields: Record<string, number>;
  /** Default language for stemming (currently unused – basic tokenisation only) */
  defaultLanguage?: string;
  /** Name of the text index */
  name?: string;
}

// ═══════════════════════════════════════════════════════
// Cursor pagination (REST)
// ═══════════════════════════════════════════════════════

/**
 * A server-side cursor session for paginated REST access.
 */
export interface CursorSession {
  /** Unique cursor ID */
  id: string;
  /** Collection name */
  collection: string;
  /** Pre-fetched document IDs (for position tracking) */
  documentIds: DocumentId[];
  /** Current offset position */
  position: number;
  /** Batch size */
  batchSize: number;
  /** Timestamp of last access */
  lastAccessed: number;
  /** Filter used to create this cursor */
  filter: Record<string, unknown>;
  /** Sort used */
  sort?: Record<string, 1 | -1>;
  /** Projection used */
  projection?: Record<string, 0 | 1>;
}
