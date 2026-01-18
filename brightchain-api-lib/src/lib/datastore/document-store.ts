import { DefaultBackendIdType } from '../shared-types';

export type DocumentId = DefaultBackendIdType;

export type DocumentRecord = Record<string, unknown> & { _id?: DocumentId };

// Allow QueryBuilder to work with both single documents and arrays
export type QueryResultType = DocumentRecord | DocumentRecord[] | unknown[];

export interface QueryResult<T extends QueryResultType> {
  exec(): Promise<T | null>;
  then<TResult1 = T | null, TResult2 = never>(
    onfulfilled?:
      | ((value: T | null) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ): Promise<TResult1 | TResult2>;
}

export interface QueryBuilder<
  T extends QueryResultType,
> extends QueryResult<T> {
  select(_: unknown): QueryBuilder<T>;
  populate(_: unknown): QueryBuilder<T>;
  sort(_: unknown): QueryBuilder<T>;
  limit(_: number): QueryBuilder<T>;
  skip(_: number): QueryBuilder<T>;
  lean(): QueryBuilder<T>;
  collation(_: unknown): QueryBuilder<T>;
  session(_: unknown): QueryBuilder<T>;
  where(_: unknown): QueryBuilder<T>;
  distinct(_: unknown): QueryBuilder<T>;
}

export interface DocumentCollection<T extends DocumentRecord> {
  find(filter?: Partial<T>): QueryBuilder<T[]>;
  findOne(filter?: Partial<T>): QueryBuilder<T>;
  findById(id: DocumentId): QueryBuilder<T>;
  findOneAndUpdate(filter: Partial<T>, update: Partial<T>): QueryBuilder<T>;
  findOneAndDelete(filter: Partial<T>): QueryBuilder<T>;
  findByIdAndUpdate(id: DocumentId, update: Partial<T>): QueryBuilder<T>;
  findByIdAndDelete(id: DocumentId): QueryBuilder<T>;
  create(doc: T): Promise<T>;
  insertMany(docs: T[]): Promise<T[]>;
  updateOne(
    filter: Partial<T>,
    update: Partial<T>,
  ): Promise<{ modifiedCount: number; matchedCount: number }>;
  updateMany(
    filter: Partial<T>,
    update: Partial<T>,
  ): Promise<{ modifiedCount: number; matchedCount: number }>;
  replaceOne(
    filter: Partial<T>,
    doc: T,
  ): Promise<{ modifiedCount: number; matchedCount: number }>;
  deleteOne(filter: Partial<T>): Promise<{ deletedCount: number }>;
  deleteMany(filter: Partial<T>): Promise<{ deletedCount: number }>;
  countDocuments(filter?: Partial<T>): Promise<number>;
  estimatedDocumentCount(): Promise<number>;
  aggregate<U = unknown>(pipeline: unknown[]): QueryBuilder<U[]>;
  distinct(field: keyof T): QueryBuilder<T[keyof T][]>;
  exists(filter: Partial<T>): Promise<{ _id: DocumentId } | null>;
  watch?(): void;
  startSession?(): unknown;
}

export interface DocumentStore {
  collection<T extends DocumentRecord>(name: string): DocumentCollection<T>;
}
