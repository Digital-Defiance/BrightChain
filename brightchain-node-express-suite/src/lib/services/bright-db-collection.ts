/**
 * @fileoverview BrightDB collection adapter implementing ICollection.
 * Wraps a @brightchain/db Collection to conform to the shared ICollection
 * interface from @digitaldefiance/suite-core-lib.
 * Parallel to upstream's MongooseCollection.
 *
 * @module services/bright-db-collection
 */

import type { Collection } from '@brightchain/db';
import type {
  AggregationStage,
  BsonDocument,
  BulkWriteOperation,
  BulkWriteOptions,
  BulkWriteResult,
  ChangeListener,
  CollectionSchema,
  DeleteResult,
  DocumentId,
  FilterQuery,
  FindOptions,
  ICollection,
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
  ValidationFieldError,
  WriteConcern,
  WriteOptions,
} from '@digitaldefiance/suite-core-lib';

/**
 * Adapts a @brightchain/db Collection to the ICollection<T> interface.
 * Delegates all operations to the underlying BrightDB collection.
 */
export class BrightDbCollection<T extends BsonDocument = BsonDocument>
  implements ICollection<T>
{
  constructor(private readonly _collection: Collection<T>) {}

  async insertOne(doc: T, options?: WriteOptions): Promise<InsertOneResult> {
    return this._collection.insertOne(doc, options);
  }

  async insertMany(docs: T[], options?: WriteOptions): Promise<InsertManyResult> {
    return this._collection.insertMany(docs, options);
  }

  async findOne(filter?: FilterQuery<T>, options?: FindOptions<T>): Promise<T | null> {
    return this._collection.findOne(filter, options);
  }

  find(filter?: FilterQuery<T>, options?: FindOptions<T>): T[] | PromiseLike<T[]> {
    return this._collection.find(filter, options);
  }

  async findById(id: DocumentId): Promise<T | null> {
    return this._collection.findById(id);
  }

  async updateOne(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult> {
    return this._collection.updateOne(filter, update, options);
  }

  async updateMany(
    filter: FilterQuery<T>,
    update: UpdateQuery<T>,
    options?: UpdateOptions,
  ): Promise<UpdateResult> {
    return this._collection.updateMany(filter, update, options);
  }

  async deleteOne(filter: FilterQuery<T>, options?: WriteOptions): Promise<DeleteResult> {
    return this._collection.deleteOne(filter, options);
  }

  async deleteMany(filter: FilterQuery<T>, options?: WriteOptions): Promise<DeleteResult> {
    return this._collection.deleteMany(filter, options);
  }

  async replaceOne(
    filter: FilterQuery<T>,
    doc: T,
    options?: UpdateOptions,
  ): Promise<ReplaceResult> {
    return this._collection.replaceOne(filter, doc, options);
  }

  async countDocuments(filter?: FilterQuery<T>): Promise<number> {
    return this._collection.countDocuments(filter);
  }

  async estimatedDocumentCount(): Promise<number> {
    return this._collection.estimatedDocumentCount();
  }

  async distinct<K extends keyof T>(
    field: K,
    filter?: FilterQuery<T>,
  ): Promise<Array<T[K]>> {
    return this._collection.distinct(field, filter);
  }

  async aggregate(pipeline: AggregationStage[]): Promise<BsonDocument[]> {
    return this._collection.aggregate(pipeline);
  }

  async createIndex(spec: IndexSpec, options?: IndexOptions): Promise<string> {
    return this._collection.createIndex(spec, options);
  }

  async dropIndex(name: string): Promise<void> {
    return this._collection.dropIndex(name);
  }

  listIndexes(): string[] {
    return this._collection.listIndexes();
  }

  async bulkWrite(
    operations: BulkWriteOperation<T>[],
    options?: BulkWriteOptions,
  ): Promise<BulkWriteResult> {
    return this._collection.bulkWrite(operations, options);
  }

  watch(listener: ChangeListener<T>): () => void {
    return this._collection.watch(listener);
  }

  setSchema(schema: CollectionSchema): void {
    this._collection.setSchema(schema);
  }

  getSchema(): CollectionSchema | undefined {
    return this._collection.getSchema();
  }

  removeSchema(): void {
    this._collection.removeSchema();
  }

  validateDoc(doc: T): ValidationFieldError[] {
    return this._collection.validateDoc(doc);
  }

  getWriteConcern(): WriteConcern {
    return this._collection.getWriteConcern();
  }

  setWriteConcern(wc: WriteConcern): void {
    this._collection.setWriteConcern(wc);
  }

  getReadPreference(): ReadPreference {
    return this._collection.getReadPreference();
  }

  setReadPreference(rp: ReadPreference): void {
    this._collection.setReadPreference(rp);
  }

  createTextIndex(options: TextIndexOptions): string {
    return this._collection.createTextIndex(options);
  }

  dropTextIndex(): void {
    this._collection.dropTextIndex();
  }

  hasTextIndex(): boolean {
    return this._collection.hasTextIndex();
  }

  async drop(): Promise<void> {
    return this._collection.drop();
  }
}
