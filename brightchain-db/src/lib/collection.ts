/**
 * Collection – the main API surface for interacting with a document collection.
 *
 * Provides a MongoDB-compatible interface including:
 *   insertOne, insertMany, findOne, find, updateOne, updateMany,
 *   deleteOne, deleteMany, replaceOne, countDocuments, distinct,
 *   aggregate, createIndex, dropIndex, watch
 */

import { IBlockStore } from '@brightchain/brightchain-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { randomUUID } from 'crypto';
import { runAggregation } from './aggregation';
import { Cursor } from './cursor';
import {
  BulkWriteError,
  BulkWriteOperationError,
  ValidationError,
} from './errors';
import { IndexManager } from './indexing';
import {
  applyProjection,
  matchesFilter,
  setTextSearchFields,
} from './queryEngine';
import {
  applyDefaults,
  CollectionSchema,
  validateDocument,
} from './schemaValidation';
import { DbSession } from './transaction';
import {
  AggregationStage,
  BsonDocument,
  BulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ChangeEvent,
  ChangeListener,
  CollectionOptions,
  DeleteResult,
  DocumentId,
  FilterQuery,
  FindOptions,
  IndexOptions,
  IndexSpec,
  InsertManyResult,
  InsertOneResult,
  ReadPreference,
  ReplaceResult,
  TextIndexOptions,
  UpdateOptions,
  UpdateQuery,
  UpdateResult,
  WriteConcern,
  WriteOptions,
} from './types';
import { applyUpdate, isOperatorUpdate } from './updateEngine';

/**
 * Calculate a content-addressable block ID from data.
 * Uses SHA3-512, the same algorithm as BrightChain's ChecksumService,
 * but without requiring the global service provider to be initialised.
 */
function calculateBlockId(data: Buffer | Uint8Array): string {
  const bytes = data instanceof Buffer ? new Uint8Array(data) : data;
  const hash = sha3_512(bytes);
  return Buffer.from(hash).toString('hex');
}

/**
 * Lookup resolver type – given a collection name, returns a collection instance.
 */
export type CollectionResolver = (name: string) => Collection;

/**
 * A single document collection backed by a BrightChain block store.
 */
export class Collection<T extends BsonDocument = BsonDocument> {
  /** In-memory document index: logical _id → block checksum */
  private readonly docIndex = new Map<DocumentId, string>();
  /** In-memory document cache for fast reads */
  private readonly docCache = new Map<DocumentId, T>();
  /** Index manager */
  private readonly indexManager = new IndexManager();
  /** Change listeners */
  private readonly changeListeners = new Set<ChangeListener<T>>();
  /** Lookup resolver for $lookup in aggregation */
  private collectionResolver?: CollectionResolver;
  /** Whether initial index has been loaded */
  private loaded = false;
  /** Loading promise */
  private loading: Promise<void> | undefined;
  /** Schema validation (if configured) */
  private schema?: CollectionSchema;
  /** Write concern for this collection */
  private writeConcern: WriteConcern = { w: 1 };
  /** Read preference for this collection */
  private readPreference: ReadPreference = 'primary';
  /** TTL index timers */
  private ttlTimers = new Map<string, ReturnType<typeof setInterval>>();
  /** Text index config: field name → weight */
  private textIndexFields: Record<string, number> = {};

  constructor(
    public readonly name: string,
    private readonly store: IBlockStore,
    private readonly dbName: string,
    private readonly headRegistry: HeadRegistry,
    options?: CollectionOptions,
  ) {
    if (options?.writeConcern) this.writeConcern = options.writeConcern;
    if (options?.readPreference) this.readPreference = options.readPreference;
  }

  /** Set the collection resolver for cross-collection operations */
  setCollectionResolver(resolver: CollectionResolver): void {
    this.collectionResolver = resolver;
  }

  // ═══════════════════════════════════════════════════════
  // Index loading / persistence
  // ═══════════════════════════════════════════════════════

  private async ensureLoaded(): Promise<void> {
    if (this.loaded) return;
    if (!this.loading) {
      this.loading = this.loadFromStore().finally(() => {
        this.loading = undefined;
      });
    }
    return this.loading;
  }

  private async loadFromStore(): Promise<void> {
    const headBlockId = this.headRegistry.getHead(this.dbName, this.name);
    if (headBlockId) {
      try {
        const handle = this.store.get(headBlockId);
        const blockData = handle.fullData;
        const meta = JSON.parse(
          Buffer.from(blockData).toString('utf8'),
        ) as CollectionMeta;

        // Restore document index
        if (meta.mappings) {
          for (const [logicalId, blockId] of Object.entries(meta.mappings)) {
            this.docIndex.set(logicalId, blockId);
          }
        }

        // Restore index metadata
        if (meta.indexes) {
          // Load all docs first for index rebuild
          const docs = await this.loadAllDocs();
          this.indexManager.restoreFromJSON(meta.indexes, docs);
        }
      } catch {
        // Head block not found – start fresh
      }
    }
    this.loaded = true;
  }

  private async loadAllDocs(): Promise<T[]> {
    const docs: T[] = [];
    for (const [logicalId, blockId] of this.docIndex.entries()) {
      const doc = await this.readDocFromStore(blockId);
      if (doc) {
        this.docCache.set(logicalId, doc);
        docs.push(doc);
      }
    }
    return docs;
  }

  private async persistMeta(): Promise<void> {
    const meta: CollectionMeta = {
      mappings: Object.fromEntries(this.docIndex.entries()),
      indexes: this.indexManager.toJSON(),
    };
    const payload = Buffer.from(JSON.stringify(meta), 'utf8');
    const blockId = calculateBlockId(payload);

    const exists = await this.store.has(blockId);
    if (!exists) {
      await this.store.put(blockId, payload);
    }
    this.headRegistry.setHead(this.dbName, this.name, blockId);
  }

  // ═══════════════════════════════════════════════════════
  // Low-level document I/O
  // ═══════════════════════════════════════════════════════

  private async readDocFromStore(blockId: string): Promise<T | null> {
    try {
      const handle = this.store.get(blockId);
      const blockData = handle.fullData;
      return JSON.parse(Buffer.from(blockData).toString('utf8')) as T;
    } catch {
      return null;
    }
  }

  private async readDoc(logicalId: DocumentId): Promise<T | null> {
    // Check cache first
    if (this.docCache.has(logicalId)) {
      return this.docCache.get(logicalId) ?? null;
    }
    const blockId = this.docIndex.get(logicalId);
    if (!blockId) return null;
    const doc = await this.readDocFromStore(blockId);
    if (doc) {
      this.docCache.set(logicalId, doc);
    }
    return doc;
  }

  private async writeDoc(doc: T, logicalId?: DocumentId): Promise<T> {
    const id = logicalId ?? doc._id ?? randomUUID().replace(/-/g, '');
    const docWithId = { ...doc, _id: id } as T;

    const payload = Buffer.from(JSON.stringify(docWithId), 'utf8');
    const blockId = calculateBlockId(payload);

    const exists = await this.store.has(blockId);
    if (!exists) {
      await this.store.put(blockId, payload);
    }

    // Remove old index entries if updating
    const oldDoc = this.docCache.get(id);
    if (oldDoc) {
      this.indexManager.removeDocument(oldDoc);
    }

    this.docIndex.set(id, blockId);
    this.docCache.set(id, docWithId);

    // Add to indexes (may throw DuplicateKeyError)
    try {
      this.indexManager.addDocument(docWithId);
    } catch (err) {
      // Roll back the write
      if (oldDoc) {
        const oldPayload = Buffer.from(JSON.stringify(oldDoc), 'utf8');
        const oldBlockId = calculateBlockId(oldPayload);
        this.docIndex.set(id, oldBlockId);
        this.docCache.set(id, oldDoc);
        this.indexManager.addDocument(oldDoc);
      } else {
        this.docIndex.delete(id);
        this.docCache.delete(id);
      }
      throw err;
    }

    await this.persistMeta();
    return docWithId;
  }

  /**
   * Remove a document from the collection index.
   *
   * Copy-on-write: blocks in the store are never deleted. This method only
   * removes the logical mapping so the document is no longer reachable.
   * The underlying block remains in the store as an orphan and could be
   * reclaimed by a separate garbage-collection process if desired.
   */
  private async removeDoc(logicalId: DocumentId): Promise<boolean> {
    const doc = this.docCache.get(logicalId);
    if (doc) {
      this.indexManager.removeDocument(doc);
    }
    const blockId = this.docIndex.get(logicalId);
    if (!blockId) return false;

    // Copy-on-write: do NOT call this.store.delete(blockId).
    // Blocks are immutable; we only remove the mapping.

    this.docIndex.delete(logicalId);
    this.docCache.delete(logicalId);
    await this.persistMeta();
    return true;
  }

  // ═══════════════════════════════════════════════════════
  // CRUD operations
  // ═══════════════════════════════════════════════════════

  /**
   * Insert a single document.
   */
  async insertOne(doc: T, options?: WriteOptions): Promise<InsertOneResult> {
    await this.ensureLoaded();

    if (options?.session && (options.session as DbSession).inTransaction) {
      const session = options.session as DbSession;
      const id = doc._id ?? randomUUID().replace(/-/g, '');
      const docWithId = { ...doc, _id: id } as T;
      const validated = this.validateBeforeWrite(docWithId);
      session.addOp({ type: 'insert', collection: this.name, doc: validated });
      return { acknowledged: true, insertedId: id };
    }

    const validated = this.validateBeforeWrite(doc);
    const written = await this.writeDoc(validated);
    this.emitChange('insert', written);
    return { acknowledged: true, insertedId: written._id! };
  }

  /**
   * Insert multiple documents.
   */
  async insertMany(
    docs: T[],
    options?: WriteOptions,
  ): Promise<InsertManyResult> {
    await this.ensureLoaded();
    const insertedIds: Record<number, DocumentId> = {};

    for (let i = 0; i < docs.length; i++) {
      const result = await this.insertOne(docs[i], options);
      insertedIds[i] = result.insertedId;
    }

    return {
      acknowledged: true,
      insertedCount: docs.length,
      insertedIds,
    };
  }

  /**
   * Find a single document matching the filter.
   */
  async findOne(
    filter: FilterQuery<T> = {} as FilterQuery<T>,
    options?: FindOptions<T>,
  ): Promise<T | null> {
    await this.ensureLoaded();
    this.configureTextSearch();

    // Try index lookup
    const candidates = this.indexManager.findCandidates(
      filter as Record<string, unknown>,
    );

    if (candidates) {
      for (const id of candidates) {
        const doc = await this.readDoc(id);
        if (doc && matchesFilter(doc, filter)) {
          return options?.projection
            ? (applyProjection(
                doc,
                options.projection as Record<string, 0 | 1>,
              ) as T)
            : doc;
        }
      }
      return null;
    }

    // Full scan
    for (const id of this.docIndex.keys()) {
      const doc = await this.readDoc(id);
      if (doc && matchesFilter(doc, filter)) {
        return options?.projection
          ? (applyProjection(
              doc,
              options.projection as Record<string, 0 | 1>,
            ) as T)
          : doc;
      }
    }
    return null;
  }

  /**
   * Find documents matching the filter. Returns a cursor for chaining.
   */
  find(
    filter: FilterQuery<T> = {} as FilterQuery<T>,
    options?: FindOptions<T>,
  ): Cursor<T> {
    const cursor = new Cursor<T>(async () => {
      await this.ensureLoaded();
      this.configureTextSearch();

      // Try index lookup
      const candidates = this.indexManager.findCandidates(
        filter as Record<string, unknown>,
      );
      const idsToScan = candidates ?? new Set(this.docIndex.keys());

      const results: T[] = [];
      for (const id of idsToScan) {
        const doc = await this.readDoc(id);
        if (doc && matchesFilter(doc, filter)) {
          results.push(
            options?.projection
              ? (applyProjection(
                  doc,
                  options.projection as Record<string, 0 | 1>,
                ) as T)
              : doc,
          );
        }
      }
      return results;
    });

    if (options?.sort) cursor.sort(options.sort);
    if (options?.skip) cursor.skip(options.skip);
    if (options?.limit) cursor.limit(options.limit);
    return cursor;
  }

  /**
   * Find a document by its _id.
   */
  async findById(id: DocumentId): Promise<T | null> {
    await this.ensureLoaded();
    return this.readDoc(id);
  }

  /**
   * Update a single document matching the filter.
   */
  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult> {
    await this.ensureLoaded();

    const doc = await this.findOne(filter);

    if (!doc && options?.upsert) {
      const baseDoc = {} as T;
      // Apply filter as initial fields (for exact matches)
      for (const [key, value] of Object.entries(filter)) {
        if (!key.startsWith('$') && typeof value !== 'object') {
          (baseDoc as Record<string, unknown>)[key] = value;
        }
      }
      const updated = applyUpdate(baseDoc, update);
      const result = await this.insertOne(updated, options);
      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 1,
        upsertedId: result.insertedId,
      };
    }

    if (!doc) {
      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 0,
      };
    }

    if (options?.session && (options.session as DbSession).inTransaction) {
      const session = options.session as DbSession;
      const updated = applyUpdate(doc, update);
      const validated = this.validateBeforeWrite(updated as T, true);
      session.addOp({
        type: 'update',
        collection: this.name,
        docId: doc._id!,
        before: doc,
        after: validated,
      });
      return {
        acknowledged: true,
        matchedCount: 1,
        modifiedCount: 1,
        upsertedCount: 0,
      };
    }

    const updated = applyUpdate(doc, update);
    const validated = this.validateBeforeWrite(updated as T, true);
    await this.writeDoc(validated, doc._id);
    this.emitChange('update', updated as T, {
      updatedFields: isOperatorUpdate(update)
        ? ((update as Record<string, unknown>)['$set'] as Partial<T>)
        : undefined,
    });
    return {
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
    };
  }

  /**
   * Update all documents matching the filter.
   */
  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: WriteOptions,
  ): Promise<UpdateResult> {
    await this.ensureLoaded();
    const docs = await this.find(filter).toArray();
    let modified = 0;

    for (const doc of docs) {
      const updated = applyUpdate(doc, update);
      if (options?.session && (options.session as DbSession).inTransaction) {
        (options.session as DbSession).addOp({
          type: 'update',
          collection: this.name,
          docId: doc._id!,
          before: doc,
          after: updated,
        });
      } else {
        await this.writeDoc(updated as T, doc._id);
        this.emitChange('update', updated as T);
      }
      modified++;
    }

    return {
      acknowledged: true,
      matchedCount: docs.length,
      modifiedCount: modified,
      upsertedCount: 0,
    };
  }

  /**
   * Delete a single document matching the filter.
   */
  async deleteOne(
    filter: FilterQuery<T>,
    options?: WriteOptions,
  ): Promise<DeleteResult> {
    await this.ensureLoaded();
    const doc = await this.findOne(filter);
    if (!doc) return { acknowledged: true, deletedCount: 0 };

    if (options?.session && (options.session as DbSession).inTransaction) {
      (options.session as DbSession).addOp({
        type: 'delete',
        collection: this.name,
        docId: doc._id!,
        doc,
      });
      return { acknowledged: true, deletedCount: 1 };
    }

    const removed = await this.removeDoc(doc._id!);
    if (removed) this.emitChange('delete', doc);
    return { acknowledged: true, deletedCount: removed ? 1 : 0 };
  }

  /**
   * Delete all documents matching the filter.
   */
  async deleteMany(
    filter: FilterQuery<T>,
    options?: WriteOptions,
  ): Promise<DeleteResult> {
    await this.ensureLoaded();
    const docs = await this.find(filter).toArray();
    let deleted = 0;

    for (const doc of docs) {
      if (options?.session && (options.session as DbSession).inTransaction) {
        (options.session as DbSession).addOp({
          type: 'delete',
          collection: this.name,
          docId: doc._id!,
          doc,
        });
        deleted++;
      } else {
        const removed = await this.removeDoc(doc._id!);
        if (removed) {
          this.emitChange('delete', doc);
          deleted++;
        }
      }
    }

    return { acknowledged: true, deletedCount: deleted };
  }

  /**
   * Replace a single document matching the filter.
   */
  async replaceOne(
    filter: FilterQuery<T>,
    replacement: T,
    options?: UpdateOptions,
  ): Promise<ReplaceResult> {
    await this.ensureLoaded();
    const doc = await this.findOne(filter);

    if (!doc && options?.upsert) {
      const result = await this.insertOne(replacement, options);
      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 1,
        upsertedId: result.insertedId,
      };
    }

    if (!doc) {
      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 0,
      };
    }

    const replacementWithId = { ...replacement, _id: doc._id } as T;
    await this.writeDoc(replacementWithId, doc._id);
    this.emitChange('replace', replacementWithId);
    return {
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: 1,
      upsertedCount: 0,
    };
  }

  /**
   * Count documents matching the filter.
   */
  async countDocuments(
    filter: FilterQuery<T> = {} as FilterQuery<T>,
  ): Promise<number> {
    const docs = await this.find(filter).toArray();
    return docs.length;
  }

  /**
   * Estimated document count (fast, from index size).
   */
  async estimatedDocumentCount(): Promise<number> {
    await this.ensureLoaded();
    return this.docIndex.size;
  }

  /**
   * Get distinct values for a field.
   */
  async distinct<K extends keyof T>(
    field: K,
    filter: FilterQuery<T> = {} as FilterQuery<T>,
  ): Promise<Array<T[K]>> {
    const docs = await this.find(filter).toArray();
    const values = new Set<string>();
    const result: Array<T[K]> = [];
    for (const doc of docs) {
      const val = doc[field];
      const key = JSON.stringify(val);
      if (!values.has(key)) {
        values.add(key);
        result.push(val);
      }
    }
    return result;
  }

  /**
   * Run an aggregation pipeline.
   */
  async aggregate(pipeline: AggregationStage[]): Promise<BsonDocument[]> {
    await this.ensureLoaded();
    const allDocs = await this.find().toArray();

    const lookupResolver = this.collectionResolver
      ? async (collName: string) => {
          const coll = this.collectionResolver!(collName);
          return coll.find().toArray();
        }
      : undefined;

    return runAggregation(allDocs as BsonDocument[], pipeline, lookupResolver);
  }

  // ═══════════════════════════════════════════════════════
  // Schema validation
  // ═══════════════════════════════════════════════════════

  /**
   * Set a schema for this collection. Documents will be validated on
   * insert and (if level is 'strict') on update.
   */
  setSchema(schema: CollectionSchema): void {
    this.schema = schema;
  }

  /**
   * Get the current schema (if any).
   */
  getSchema(): CollectionSchema | undefined {
    return this.schema;
  }

  /**
   * Remove validation schema.
   */
  removeSchema(): void {
    this.schema = undefined;
  }

  /**
   * Validate a document without inserting it.
   * @returns array of validation errors (empty if valid)
   */
  validateDoc(doc: T): import('./errors').ValidationFieldError[] {
    if (!this.schema) return [];
    try {
      validateDocument(doc, this.schema, this.name);
      return [];
    } catch (err) {
      if (err instanceof ValidationError) return err.validationErrors;
      throw err;
    }
  }

  /**
   * Internal: validate and apply defaults before write.
   */
  private validateBeforeWrite(doc: T, isUpdate = false): T {
    if (!this.schema) return doc;
    if (isUpdate && this.schema.validationLevel === 'moderate') return doc;
    const withDefaults = applyDefaults(doc, this.schema) as T;
    validateDocument(withDefaults, this.schema, this.name);
    return withDefaults;
  }

  // ═══════════════════════════════════════════════════════
  // Text search index
  // ═══════════════════════════════════════════════════════

  /**
   * Create a text index for full-text search.
   *
   * @param options - The fields to index and their weights
   * @returns The index name
   *
   * @example
   * ```typescript
   * await coll.createTextIndex({ fields: { title: 10, body: 1 } });
   * const results = await coll.find({ $text: { $search: 'hello world' } }).toArray();
   * ```
   */
  createTextIndex(options: TextIndexOptions): string {
    this.textIndexFields = { ...options.fields };
    return options.name ?? 'text_index';
  }

  /**
   * Drop the text index.
   */
  dropTextIndex(): void {
    this.textIndexFields = {};
  }

  /**
   * Check if a text index exists.
   */
  hasTextIndex(): boolean {
    return Object.keys(this.textIndexFields).length > 0;
  }

  // ═══════════════════════════════════════════════════════
  // TTL index
  // ═══════════════════════════════════════════════════════

  /**
   * Create a TTL index that automatically removes documents whose
   * date field is older than `expireAfterSeconds`.
   *
   * TTL expiry is checked periodically (every 60 seconds by default).
   */
  async createTTLIndex(
    field: string,
    expireAfterSeconds: number,
    intervalMs = 60_000,
  ): Promise<string> {
    const name = await this.createIndex(
      { [field]: 1 },
      { expireAfterSeconds, name: `ttl_${field}` },
    );

    // Set up periodic sweep
    const timer = setInterval(async () => {
      await this.sweepTTL(field, expireAfterSeconds);
    }, intervalMs);

    // Allow timer to not prevent process exit
    if (timer.unref) timer.unref();
    this.ttlTimers.set(name, timer);

    return name;
  }

  /**
   * Stop a TTL index timer (does not drop the index itself).
   */
  stopTTL(indexName: string): void {
    const timer = this.ttlTimers.get(indexName);
    if (timer) {
      clearInterval(timer);
      this.ttlTimers.delete(indexName);
    }
  }

  /**
   * Run a single TTL sweep: delete documents where `field` is older
   * than `expireAfterSeconds` from now.
   */
  async sweepTTL(field: string, expireAfterSeconds: number): Promise<number> {
    await this.ensureLoaded();
    const cutoff = new Date(Date.now() - expireAfterSeconds * 1000);
    const expired: DocumentId[] = [];

    for (const id of this.docIndex.keys()) {
      const doc = await this.readDoc(id);
      if (!doc) continue;
      const value = doc[field];
      let dateValue: Date | null = null;
      if (value instanceof Date) {
        dateValue = value;
      } else if (typeof value === 'string' || typeof value === 'number') {
        const parsed = new Date(value as string | number);
        if (!isNaN(parsed.getTime())) dateValue = parsed;
      }
      if (dateValue && dateValue <= cutoff) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      const doc = await this.readDoc(id);
      if (doc) {
        await this.removeDoc(id);
        this.emitChange('delete', doc);
      }
    }

    return expired.length;
  }

  // ═══════════════════════════════════════════════════════
  // Bulk write
  // ═══════════════════════════════════════════════════════

  /**
   * Execute multiple write operations in a single call.
   *
   * @param operations - Array of write operations
   * @param options - Bulk write options (ordered = stop on first error)
   * @returns Aggregated result of all operations
   * @throws BulkWriteError if any operations fail and ordered is true
   *
   * @example
   * ```typescript
   * await coll.bulkWrite([
   *   { insertOne: { document: { name: 'Alice' } } },
   *   { updateOne: { filter: { name: 'Bob' }, update: { $set: { age: 30 } } } },
   *   { deleteOne: { filter: { name: 'Charlie' } } },
   * ]);
   * ```
   */
  async bulkWrite(
    operations: BulkWriteOperation<T>[],
    options?: BulkWriteOptions,
  ): Promise<BulkWriteResult> {
    await this.ensureLoaded();
    const ordered = options?.ordered ?? true;

    const result: BulkWriteResult = {
      acknowledged: true,
      insertedCount: 0,
      matchedCount: 0,
      modifiedCount: 0,
      deletedCount: 0,
      upsertedCount: 0,
      insertedIds: {},
      upsertedIds: {},
    };

    const errors: BulkWriteOperationError[] = [];

    for (let i = 0; i < operations.length; i++) {
      try {
        const op = operations[i];
        if ('insertOne' in op) {
          const r = await this.insertOne(op.insertOne.document, options);
          result.insertedCount++;
          result.insertedIds[i] = r.insertedId;
        } else if ('updateOne' in op) {
          const r = await this.updateOne(
            op.updateOne.filter,
            op.updateOne.update,
            { ...options, upsert: op.updateOne.upsert },
          );
          result.matchedCount += r.matchedCount;
          result.modifiedCount += r.modifiedCount;
          result.upsertedCount += r.upsertedCount;
          if (r.upsertedId) result.upsertedIds[i] = r.upsertedId;
        } else if ('updateMany' in op) {
          const r = await this.updateMany(
            op.updateMany.filter,
            op.updateMany.update,
            options,
          );
          result.matchedCount += r.matchedCount;
          result.modifiedCount += r.modifiedCount;
        } else if ('deleteOne' in op) {
          const r = await this.deleteOne(op.deleteOne.filter, options);
          result.deletedCount += r.deletedCount;
        } else if ('deleteMany' in op) {
          const r = await this.deleteMany(op.deleteMany.filter, options);
          result.deletedCount += r.deletedCount;
        } else if ('replaceOne' in op) {
          const r = await this.replaceOne(
            op.replaceOne.filter,
            op.replaceOne.replacement,
            { ...options, upsert: op.replaceOne.upsert },
          );
          result.matchedCount += r.matchedCount;
          result.modifiedCount += r.modifiedCount;
          result.upsertedCount += r.upsertedCount;
          if (r.upsertedId) result.upsertedIds[i] = r.upsertedId;
        }
      } catch (err) {
        const error: BulkWriteOperationError = {
          index: i,
          code:
            err instanceof Error && 'code' in err
              ? (err as { code: number }).code
              : 500,
          message: String(err),
        };
        errors.push(error);
        if (ordered) {
          throw new BulkWriteError(errors, i);
        }
      }
    }

    if (errors.length > 0) {
      throw new BulkWriteError(errors, operations.length - errors.length);
    }

    return result;
  }

  // ═══════════════════════════════════════════════════════
  // Write concern / Read preference
  // ═══════════════════════════════════════════════════════

  /**
   * Get the current write concern for this collection.
   */
  getWriteConcern(): WriteConcern {
    return { ...this.writeConcern };
  }

  /**
   * Set the write concern for this collection.
   */
  setWriteConcern(wc: WriteConcern): void {
    this.writeConcern = { ...wc };
  }

  /**
   * Get the current read preference for this collection.
   */
  getReadPreference(): ReadPreference {
    return this.readPreference;
  }

  /**
   * Set the read preference for this collection.
   */
  setReadPreference(rp: ReadPreference): void {
    this.readPreference = rp;
  }

  // ═══════════════════════════════════════════════════════
  // Index operations
  // ═══════════════════════════════════════════════════════

  /**
   * Create an index on this collection.
   */
  async createIndex(spec: IndexSpec, options?: IndexOptions): Promise<string> {
    await this.ensureLoaded();
    const name = this.indexManager.createIndex(spec, options);

    // Build index from existing docs
    for (const id of this.docIndex.keys()) {
      const doc = await this.readDoc(id);
      if (doc) {
        this.indexManager.getIndex(name)?.addDocument(doc);
      }
    }

    await this.persistMeta();
    return name;
  }

  /**
   * Drop an index by name.
   */
  async dropIndex(name: string): Promise<void> {
    await this.ensureLoaded();
    this.indexManager.dropIndex(name);
    await this.persistMeta();
  }

  /**
   * List all indexes on this collection.
   */
  listIndexes(): string[] {
    return this.indexManager.listIndexes();
  }

  // ═══════════════════════════════════════════════════════
  // Change stream
  // ═══════════════════════════════════════════════════════

  /**
   * Watch for changes on this collection.
   */
  watch(listener: ChangeListener<T>): () => void {
    this.changeListeners.add(listener);
    return () => {
      this.changeListeners.delete(listener);
    };
  }

  private emitChange(
    operationType: 'insert' | 'update' | 'replace' | 'delete',
    doc: T,
    updateDescription?: {
      updatedFields?: Partial<T>;
      removedFields?: string[];
    },
  ): void {
    if (this.changeListeners.size === 0) return;
    const event: ChangeEvent<T> = {
      operationType,
      documentKey: { _id: doc._id! },
      fullDocument: operationType !== 'delete' ? doc : undefined,
      updateDescription:
        operationType === 'update' ? updateDescription : undefined,
      ns: { db: this.dbName, coll: this.name },
      timestamp: new Date(),
    };
    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch {
        // Don't let listener errors break the operation
      }
    }
  }

  // ═══════════════════════════════════════════════════════
  // Transaction helpers (called by the session on commit)
  // ═══════════════════════════════════════════════════════

  /** Apply a transaction insert */
  async _txInsert(doc: T): Promise<void> {
    await this.writeDoc(doc, doc._id);
    this.emitChange('insert', doc);
  }

  /** Apply a transaction update – writes a new block (copy-on-write). */
  async _txUpdate(docId: DocumentId, after: T): Promise<void> {
    await this.writeDoc(after, docId);
    this.emitChange('update', after);
  }

  /** Apply a transaction delete – removes mapping only (copy-on-write). */
  async _txDelete(docId: DocumentId, doc: T): Promise<void> {
    await this.removeDoc(docId);
    this.emitChange('delete', doc);
  }

  /**
   * Rollback a transaction insert.
   * Copy-on-write: just remove the mapping; the block remains in the store.
   */
  async _txRollbackInsert(docId: DocumentId): Promise<void> {
    await this.removeDoc(docId);
  }

  /**
   * Rollback a transaction update.
   * Copy-on-write: restore the old mapping. The old block still exists in
   * the store (blocks are never deleted), so writeDoc will detect it via
   * store.has() and simply re-point the index.
   */
  async _txRollbackUpdate(docId: DocumentId, before: T): Promise<void> {
    await this.writeDoc(before, docId);
  }

  /**
   * Rollback a transaction delete.
   * Copy-on-write: re-insert the mapping. The block still exists in the
   * store since blocks are never deleted.
   */
  async _txRollbackDelete(doc: T): Promise<void> {
    await this.writeDoc(doc, doc._id);
  }

  /**
   * Drop the entire collection – remove all document mappings and indexes.
   *
   * Copy-on-write: blocks in the store are never deleted. Only the
   * collection's internal index and cache are cleared.
   */
  async drop(): Promise<void> {
    await this.ensureLoaded();
    // Stop all TTL timers
    for (const timer of this.ttlTimers.values()) {
      clearInterval(timer);
    }
    this.ttlTimers.clear();
    // Remove all index entries
    for (const id of this.docIndex.keys()) {
      const doc = this.docCache.get(id);
      if (doc) this.indexManager.removeDocument(doc);
    }
    this.docIndex.clear();
    this.docCache.clear();
    this.headRegistry.removeHead(this.dbName, this.name);
  }

  /** Configure the query engine's text search fields from our text index */
  private configureTextSearch(): void {
    const fields = Object.keys(this.textIndexFields);
    setTextSearchFields(fields);
  }
}

// ═══════════════════════════════════════════════════════
// Head registry – tracks latest metadata block per collection
// ═══════════════════════════════════════════════════════

export class HeadRegistry {
  private static instance: HeadRegistry;
  private readonly heads = new Map<string, string>();

  private constructor() {}

  static getInstance(): HeadRegistry {
    if (!HeadRegistry.instance) {
      HeadRegistry.instance = new HeadRegistry();
    }
    return HeadRegistry.instance;
  }

  /** Create a new independent registry (for testing) */
  static createIsolated(): HeadRegistry {
    return new HeadRegistry();
  }

  private makeKey(dbName: string, collectionName: string): string {
    return `${dbName}:${collectionName}`;
  }

  getHead(dbName: string, collectionName: string): string | undefined {
    return this.heads.get(this.makeKey(dbName, collectionName));
  }

  setHead(dbName: string, collectionName: string, blockId: string): void {
    this.heads.set(this.makeKey(dbName, collectionName), blockId);
  }

  removeHead(dbName: string, collectionName: string): void {
    this.heads.delete(this.makeKey(dbName, collectionName));
  }

  clear(): void {
    this.heads.clear();
  }
}

// ═══════════════════════════════════════════════════════
// Collection metadata persisted as a block
// ═══════════════════════════════════════════════════════

interface CollectionMeta {
  mappings: Record<string, string>;
  indexes: Array<{
    name: string;
    spec: IndexSpec;
    unique: boolean;
    sparse: boolean;
  }>;
}
