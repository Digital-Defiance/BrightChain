import { ConvertibleDocument } from '@brightchain/brightchain-lib';
import {
  DocumentCollection,
  DocumentId,
  DocumentRecord,
  QueryBuilder,
  QueryResultType,
} from './document-store';

export type HydratedDocument<T> = T & {
  toObject(): T;
  toJSON(): T;
};

function wrapDocument<T extends DocumentRecord>(doc: T | null): HydratedDocument<T> | null {
  if (!doc) return null;
  const base = { ...doc } as T;
  return Object.assign(base, {
    toObject: () => ({ ...base }),
    toJSON: () => ({ ...base }),
  });
}

class QueryWrapper<TIn extends QueryResultType, TOut extends QueryResultType> implements QueryBuilder<TOut> {
  constructor(
    private readonly inner: QueryBuilder<TIn>,
    private readonly mapper: (value: TIn | null) => TOut | null,
  ) {}

  select(arg: unknown): this {
    this.inner.select(arg);
    return this;
  }
  populate(arg: unknown): this {
    this.inner.populate(arg);
    return this;
  }
  sort(arg: unknown): this {
    this.inner.sort(arg);
    return this;
  }
  limit(arg: number): this {
    this.inner.limit(arg);
    return this;
  }
  skip(arg: number): this {
    this.inner.skip(arg);
    return this;
  }
  lean(): this {
    this.inner.lean();
    return this;
  }
  collation(arg: unknown): this {
    this.inner.collation(arg);
    return this;
  }
  session(arg: unknown): this {
    this.inner.session(arg);
    return this;
  }
  where(arg: unknown): this {
    this.inner.where(arg);
    return this;
  }
  distinct(arg: unknown): this {
    this.inner.distinct(arg);
    return this;
  }

  async exec(): Promise<TOut | null> {
    const res = await this.inner.exec();
    return this.mapper(res as TIn | null);
  }

  then<TResult1 = TOut | null, TResult2 = never>(
    onfulfilled?: ((value: TOut | null) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

class QueryArrayWrapper<TIn extends DocumentRecord, TOut extends DocumentRecord> implements QueryBuilder<TOut[]> {
  constructor(
    private readonly inner: QueryBuilder<TIn[]>,
    private readonly mapper: (value: TIn) => TOut,
  ) {}

  select(arg: unknown): this {
    this.inner.select(arg);
    return this;
  }
  populate(arg: unknown): this {
    this.inner.populate(arg);
    return this;
  }
  sort(arg: unknown): this {
    this.inner.sort(arg);
    return this;
  }
  limit(arg: number): this {
    this.inner.limit(arg);
    return this;
  }
  skip(arg: number): this {
    this.inner.skip(arg);
    return this;
  }
  lean(): this {
    this.inner.lean();
    return this;
  }
  collation(arg: unknown): this {
    this.inner.collation(arg);
    return this;
  }
  session(arg: unknown): this {
    this.inner.session(arg);
    return this;
  }
  where(arg: unknown): this {
    this.inner.where(arg);
    return this;
  }
  distinct(arg: unknown): this {
    this.inner.distinct(arg);
    return this;
  }

  async exec(): Promise<TOut[] | null> {
    const res = await this.inner.exec();
    if (!res) return null;
    return (res as TIn[]).map((item) => this.mapper(item));
  }

  then<TResult1 = TOut[] | null, TResult2 = never>(
    onfulfilled?: ((value: TOut[] | null) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

export interface ModelLike<TStorage extends DocumentRecord, THydrated extends DocumentRecord, TOperational> {
  create(doc: Partial<TStorage>): Promise<HydratedDocument<THydrated>>;
  insertMany(docs: Partial<TStorage>[]): Promise<HydratedDocument<THydrated>[]>;
  find(filter?: Partial<TStorage>): QueryBuilder<HydratedDocument<THydrated>[]>;
  findOne(filter?: Partial<TStorage>): QueryBuilder<HydratedDocument<THydrated>>;
  findById(id: DocumentId): QueryBuilder<HydratedDocument<THydrated>>;
  findOneAndUpdate(filter: Partial<TStorage>, update: Partial<TStorage>): QueryBuilder<HydratedDocument<THydrated>>;
  findOneAndDelete(filter: Partial<TStorage>): QueryBuilder<HydratedDocument<THydrated>>;
  findByIdAndUpdate(id: DocumentId, update: Partial<TStorage>): QueryBuilder<HydratedDocument<THydrated>>;
  findByIdAndDelete(id: DocumentId): QueryBuilder<HydratedDocument<THydrated>>;
  updateOne(filter: Partial<TStorage>, update: Partial<TStorage>): Promise<{ modifiedCount: number; matchedCount: number }>;
  updateMany(filter: Partial<TStorage>, update: Partial<TStorage>): Promise<{ modifiedCount: number; matchedCount: number }>;
  replaceOne(filter: Partial<TStorage>, doc: Partial<TStorage>): Promise<{ modifiedCount: number; matchedCount: number }>;
  deleteOne(filter: Partial<TStorage>): Promise<{ deletedCount: number }>;
  deleteMany(filter: Partial<TStorage>): Promise<{ deletedCount: number }>;
  countDocuments(filter?: Partial<TStorage>): Promise<number>;
  estimatedDocumentCount(): Promise<number>;
  aggregate<U = unknown>(pipeline: unknown[]): QueryBuilder<U[]>;
  distinct(field: keyof THydrated): QueryBuilder<unknown[]>;
  exists(filter: Partial<TStorage>): Promise<{ _id: DocumentId } | null>;
  watch?(): void;
  startSession?(): unknown;
  // Convenience to convert operational objects back to storage
  toStorage(operational: TOperational): TStorage;
  fromStorage(storage: TStorage): TOperational;
}

export function createModelAdapter<TStorage extends DocumentRecord, THydrated extends DocumentRecord, TOperational>(
  collection: DocumentCollection<TStorage>,
  converter: ConvertibleDocument<TStorage, THydrated, TOperational>,
): ModelLike<TStorage, THydrated, TOperational> {
  const wrapHydrated = (storage: TStorage | null) => {
    if (!storage) return null;
    // Use operational object as hydrated representation for compatibility
    const operational = converter.fromStorage(storage) as unknown as THydrated;
    return wrapDocument(operational) as HydratedDocument<THydrated>;
  };

  const wrapHydratedMany = (storages: TStorage[] | null) =>
    storages ? (storages.map((s) => wrapHydrated(s) as HydratedDocument<THydrated>)) : null;

  return {
    async create(doc: Partial<TStorage>) {
      const created = await collection.create(doc as TStorage);
      return wrapHydrated(created) as HydratedDocument<THydrated>;
    },
    async insertMany(docs: Partial<TStorage>[]) {
      const created = await collection.insertMany(docs as TStorage[]);
      return wrapHydratedMany(created) ?? [];
    },
    find(filter?: Partial<TStorage>) {
      return new QueryArrayWrapper(collection.find(filter), (s: TStorage) => wrapHydrated(s) as HydratedDocument<THydrated>);
    },
    findOne(filter?: Partial<TStorage>) {
      return new QueryWrapper(collection.findOne(filter), (s) => wrapHydrated(s as TStorage));
    },
    findById(id: DocumentId) {
      return new QueryWrapper(collection.findById(id), (s) => wrapHydrated(s as TStorage));
    },
    findOneAndUpdate(filter: Partial<TStorage>, update: Partial<TStorage>) {
      return new QueryWrapper(collection.findOneAndUpdate(filter, update), (s) => wrapHydrated(s as TStorage));
    },
    findOneAndDelete(filter: Partial<TStorage>) {
      return new QueryWrapper(collection.findOneAndDelete(filter), (s) => wrapHydrated(s as TStorage));
    },
    findByIdAndUpdate(id: DocumentId, update: Partial<TStorage>) {
      return new QueryWrapper(collection.findByIdAndUpdate(id, update), (s) => wrapHydrated(s as TStorage));
    },
    findByIdAndDelete(id: DocumentId) {
      return new QueryWrapper(collection.findByIdAndDelete(id), (s) => wrapHydrated(s as TStorage));
    },
    updateOne: (filter, update) => collection.updateOne(filter, update),
    updateMany: (filter, update) => collection.updateMany(filter, update),
    replaceOne: (filter, doc) => collection.replaceOne(filter, doc as TStorage),
    deleteOne: (filter) => collection.deleteOne(filter),
    deleteMany: (filter) => collection.deleteMany(filter),
    countDocuments: (filter) => collection.countDocuments(filter),
    estimatedDocumentCount: () => collection.estimatedDocumentCount(),
    aggregate: (pipeline) => collection.aggregate(pipeline),
    distinct: (field: keyof THydrated) => collection.distinct(field as unknown as keyof TStorage) as QueryBuilder<unknown[]>,
    exists: (filter) => collection.exists(filter),
    watch: () => collection.watch && collection.watch(),
    startSession: () => (collection.startSession ? collection.startSession() : undefined),
    toStorage: (operational: TOperational) => converter.toStorage(operational),
    fromStorage: (storage: TStorage) => converter.fromStorage(storage),
  };
}
