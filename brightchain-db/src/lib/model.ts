/**
 * @fileoverview Model — a typed wrapper around Collection that automatically
 * serializes on writes and rehydrates on reads.
 *
 * Analogous to Mongoose's Model, but with explicit type boundaries:
 *  - TStored: the shape of documents in the database (all strings, extends BsonDocument)
 *  - TTyped: the shape your application code works with (typed IDs, Date objects, etc.)
 *
 * Conversion between the two is handled by an IHydrationSchema from brightchain-lib.
 * Schema validation is applied automatically before every write.
 *
 * Usage:
 *   const roleModel = new Model(db.collection<IStoredRole>('roles'), {
 *     schema: ROLE_SCHEMA,
 *     hydration: { hydrate: rehydrateRole, dehydrate: serializeRole },
 *   });
 *
 *   // Reads return TTyped
 *   const role = await roleModel.findOne({ name: 'Admin' });
 *
 *   // Writes accept TTyped, serialize automatically
 *   await roleModel.insertOne(typedRoleObject);
 */

import type { IHydrationSchema } from '@brightchain/brightchain-lib';
import type { Collection } from './collection';
import { Cursor } from './cursor';
import type { ValidationFieldError } from './errors';
import { ValidationError } from './errors';
import type { CollectionSchema } from './schemaValidation';
import { validateDocument } from './schemaValidation';
import type {
  AggregationStage,
  BsonDocument,
  DeleteResult,
  DocumentId,
  FilterQuery,
  FindOptions,
  InsertManyResult,
  InsertOneResult,
  ReplaceResult,
  SortSpec,
  UpdateOptions,
  UpdateQuery,
  UpdateResult,
  WriteOptions,
} from './types';

// ─── TypedCursor ─────────────────────────────────────────────────────────────

/**
 * A cursor that wraps a raw Cursor<TStored> and maps results through
 * a hydration function, yielding TTyped documents.
 *
 * Preserves the chainable sort/skip/limit/project API of the underlying cursor.
 */
export class TypedCursor<TStored extends BsonDocument, TTyped> {
  constructor(
    private readonly _inner: Cursor<TStored>,
    private readonly _hydrate: (stored: TStored) => TTyped,
  ) {}

  sort(spec: SortSpec<TStored>): this {
    this._inner.sort(spec);
    return this;
  }

  skip(n: number): this {
    this._inner.skip(n);
    return this;
  }

  limit(n: number): this {
    this._inner.limit(n);
    return this;
  }

  async toArray(): Promise<TTyped[]> {
    const docs = await this._inner.toArray();
    return docs.map(this._hydrate);
  }

  async count(): Promise<number> {
    return this._inner.count();
  }

  async next(): Promise<TTyped | null> {
    const doc = await this._inner.next();
    return doc ? this._hydrate(doc) : null;
  }

  async hasNext(): Promise<boolean> {
    return this._inner.hasNext();
  }

  async forEach(fn: (doc: TTyped) => void | Promise<void>): Promise<void> {
    const docs = await this.toArray();
    for (const doc of docs) {
      await fn(doc);
    }
  }

  async map<U>(fn: (doc: TTyped) => U): Promise<U[]> {
    const docs = await this.toArray();
    return docs.map(fn);
  }

  /** Make the cursor thenable so it can be awaited directly. */
  then<TResult1 = TTyped[], TResult2 = never>(
    onfulfilled?:
      | ((value: TTyped[]) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.toArray().then(onfulfilled, onrejected);
  }
}

// ─── Model options ───────────────────────────────────────────────────────────

export interface ModelOptions<TStored extends BsonDocument, TTyped> {
  /** Collection schema for validation before writes. */
  schema?: CollectionSchema;
  /** Hydration schema for storage ↔ typed conversion. */
  hydration: IHydrationSchema<TStored, TTyped>;
  /**
   * Collection name — used for validation error messages.
   * Defaults to the schema name if a schema is provided.
   */
  collectionName?: string;
}

// ─── Model ───────────────────────────────────────────────────────────────────

/**
 * A typed model wrapping a raw Collection<TStored>.
 *
 * - Reads (find, findOne, findById) return TTyped after hydration.
 * - Writes (insertOne, insertMany, updateOne, etc.) accept TTyped,
 *   dehydrate to TStored, validate against the schema, then delegate
 *   to the underlying collection.
 * - The raw collection is accessible via `.collection` for escape-hatch
 *   scenarios (bulk ops, aggregation, raw queries).
 */
export class Model<TStored extends BsonDocument, TTyped> {
  /** The underlying raw collection. */
  public readonly collection: Collection<TStored>;

  private readonly _hydrate: (stored: TStored) => TTyped;
  private readonly _dehydrate: (typed: TTyped) => TStored;
  private readonly _schema?: CollectionSchema;
  private readonly _collectionName: string;

  constructor(
    collection: Collection<TStored>,
    options: ModelOptions<TStored, TTyped>,
  ) {
    this.collection = collection;
    this._hydrate = options.hydration.hydrate;
    this._dehydrate = options.hydration.dehydrate;
    this._schema = options.schema;
    this._collectionName =
      options.collectionName ?? options.schema?.name ?? 'unknown';

    // Wire the schema into the collection for its own validation
    if (this._schema) {
      collection.setSchema(this._schema);
    }
  }

  // ── Validation ──────────────────────────────────────────────────────────

  /**
   * Validate a typed document against the schema.
   * Returns an empty array if valid, or field errors if not.
   */
  validate(typed: TTyped): ValidationFieldError[] {
    if (!this._schema) return [];
    const stored = this._dehydrate(typed);
    try {
      validateDocument(stored, this._schema, this._collectionName);
      return [];
    } catch (err) {
      if (err instanceof ValidationError) {
        return err.validationErrors;
      }
      throw err;
    }
  }

  /**
   * Validate and throw if invalid.
   */
  private _validateOrThrow(stored: TStored): void {
    if (!this._schema) return;
    validateDocument(stored, this._schema, this._collectionName);
  }

  // ── Reads (return TTyped) ───────────────────────────────────────────────

  /**
   * Find a single document matching the filter.
   * The filter operates on stored field names/values.
   */
  async findOne(
    filter?: FilterQuery<TStored>,
    options?: FindOptions<TStored>,
  ): Promise<TTyped | null> {
    const stored = await this.collection.findOne(filter, options);
    return stored ? this._hydrate(stored) : null;
  }

  /**
   * Find all documents matching the filter.
   * Returns a TypedCursor that hydrates results lazily.
   */
  find(
    filter?: FilterQuery<TStored>,
    options?: FindOptions<TStored>,
  ): TypedCursor<TStored, TTyped> {
    const cursor = this.collection.find(filter, options);
    return new TypedCursor(cursor, this._hydrate);
  }

  /**
   * Find a document by its _id.
   */
  async findById(id: DocumentId): Promise<TTyped | null> {
    const stored = await this.collection.findById(id);
    return stored ? this._hydrate(stored) : null;
  }

  // ── Writes (accept TTyped, serialize + validate automatically) ──────────

  /**
   * Insert a single typed document.
   * Dehydrates to stored form, validates, then inserts.
   */
  async insertOne(
    typed: TTyped,
    options?: WriteOptions,
  ): Promise<InsertOneResult> {
    const stored = this._dehydrate(typed);
    this._validateOrThrow(stored);
    return this.collection.insertOne(stored, options);
  }

  /**
   * Insert multiple typed documents.
   * Dehydrates and validates each before inserting.
   */
  async insertMany(
    docs: TTyped[],
    options?: WriteOptions,
  ): Promise<InsertManyResult> {
    const storedDocs = docs.map((d) => {
      const stored = this._dehydrate(d);
      this._validateOrThrow(stored);
      return stored;
    });
    return this.collection.insertMany(storedDocs, options);
  }

  /**
   * Update the first document matching the filter.
   * The filter and update operate on stored field names/values.
   */
  async updateOne(
    filter: FilterQuery<TStored>,
    update: UpdateQuery<TStored>,
    options?: UpdateOptions,
  ): Promise<UpdateResult> {
    return this.collection.updateOne(filter, update, options);
  }

  /**
   * Update all documents matching the filter.
   */
  async updateMany(
    filter: FilterQuery<TStored>,
    update: UpdateQuery<TStored>,
    options?: UpdateOptions,
  ): Promise<UpdateResult> {
    return this.collection.updateMany(filter, update, options);
  }

  /**
   * Delete the first document matching the filter.
   */
  async deleteOne(
    filter: FilterQuery<TStored>,
    options?: WriteOptions,
  ): Promise<DeleteResult> {
    return this.collection.deleteOne(filter, options);
  }

  /**
   * Delete all documents matching the filter.
   */
  async deleteMany(
    filter: FilterQuery<TStored>,
    options?: WriteOptions,
  ): Promise<DeleteResult> {
    return this.collection.deleteMany(filter, options);
  }

  // ── Convenience ─────────────────────────────────────────────────────────

  /**
   * Replace a single document matching the filter with a typed replacement.
   * Dehydrates the replacement to stored form, validates, then delegates.
   */
  async replaceOne(
    filter: FilterQuery<TStored>,
    replacement: TTyped,
    options?: UpdateOptions,
  ): Promise<ReplaceResult> {
    const stored = this._dehydrate(replacement);
    this._validateOrThrow(stored);
    return this.collection.replaceOne(filter, stored, options);
  }

  /**
   * Run an aggregation pipeline on the underlying collection.
   * Returns raw BsonDocument results (aggregation output shapes are
   * typically different from the collection's document type).
   */
  async aggregate(pipeline: AggregationStage[]): Promise<BsonDocument[]> {
    return this.collection.aggregate(pipeline);
  }

  /**
   * Return distinct values for a stored field.
   */
  async distinct<K extends keyof TStored>(
    field: K,
    filter?: FilterQuery<TStored>,
  ): Promise<Array<TStored[K]>> {
    return this.collection.distinct(field, filter);
  }

  /**
   * Count documents matching the filter.
   */
  async countDocuments(filter?: FilterQuery<TStored>): Promise<number> {
    return this.collection.countDocuments(filter);
  }

  /**
   * Estimated total document count.
   */
  async estimatedDocumentCount(): Promise<number> {
    return this.collection.estimatedDocumentCount();
  }

  /**
   * Check if a document matching the filter exists.
   */
  async exists(filter: FilterQuery<TStored>): Promise<boolean> {
    const doc = await this.collection.findOne(filter);
    return doc !== null;
  }

  // ── Conversion helpers (public for escape-hatch scenarios) ──────────────

  /** Convert a stored document to its typed form. */
  hydrate(stored: TStored): TTyped {
    return this._hydrate(stored);
  }

  /** Convert a typed document to its stored form. */
  dehydrate(typed: TTyped): TStored {
    return this._dehydrate(typed);
  }
}
