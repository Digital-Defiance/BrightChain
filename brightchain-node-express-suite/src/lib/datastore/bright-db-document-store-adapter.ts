/**
 * @fileoverview Adapter that wraps a BrightDb instance to conform to the
 * Mongoose-style DocumentStore / DocumentCollection interfaces.
 *
 * BrightDb.Collection has a direct async API (async findOne → Promise,
 * insertOne, Cursor-based find). DocumentCollection uses QueryBuilder
 * (with .exec(), .select(), .lean(), etc.) and .create(). This adapter
 * bridges the gap so `application.db` returns a proper DocumentStore.
 *
 * @module datastore/bright-db-document-store-adapter
 */

import type { BrightDb } from '@brightchain/db';
import type {
  DocumentCollection,
  DocumentId,
  DocumentRecord,
  DocumentStore,
  QueryBuilder,
  QueryResultType,
} from './document-store';

/**
 * Wrap an async function in a QueryBuilder-compatible object that supports
 * .exec(), .select(), .limit(), .sort(), .skip(), .lean(), .populate(),
 * and thenable (.then()).
 */
function toQueryBuilder<T extends QueryResultType>(
  fn: () => Promise<T | null>,
): QueryBuilder<T> {
  const qb: QueryBuilder<T> = {
    exec: () => fn(),
    select: () => qb,
    limit: () => qb,
    sort: () => qb,
    skip: () => qb,
    lean: () => qb,
    populate: () => qb,
    collation: () => qb,
    session: () => qb,
    where: () => qb,
    distinct: () => qb,
    then: <R1 = T | null, R2 = never>(
      onfulfilled?: ((v: T | null) => R1 | PromiseLike<R1>) | null,
      onrejected?: ((r: unknown) => R2 | PromiseLike<R2>) | null,
    ): Promise<R1 | R2> => fn().then(onfulfilled, onrejected),
  };
  return qb;
}

/**
 * Adapts a single BrightDb Collection to the Mongoose-style
 * DocumentCollection interface.
 */
class BrightDbCollectionAdapter<T extends DocumentRecord>
  implements DocumentCollection<T>
{
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(private readonly _col: any) {}

  find(filter?: Partial<T>): QueryBuilder<T[]> {
    return toQueryBuilder<T[]>(async () => {
      return (await this._col.find(filter ?? {}).toArray()) as T[];
    });
  }

  findOne(filter?: Partial<T>): QueryBuilder<T> {
    return toQueryBuilder<T>(async () => {
      return (await this._col.findOne(filter ?? {})) as T | null;
    });
  }

  findById(id: DocumentId): QueryBuilder<T> {
    return toQueryBuilder<T>(async () => {
      return (await this._col.findById(id)) as T | null;
    });
  }

  findOneAndUpdate(filter: Partial<T>, update: Partial<T>): QueryBuilder<T> {
    return toQueryBuilder<T>(async () => {
      const doc = await this._col.findOne(filter);
      if (!doc) return null;
      await this._col.updateOne(filter, { $set: update });
      return (await this._col.findOne({ _id: doc._id })) as T | null;
    });
  }

  findOneAndDelete(filter: Partial<T>): QueryBuilder<T> {
    return toQueryBuilder<T>(async () => {
      const doc = await this._col.findOne(filter);
      if (!doc) return null;
      await this._col.deleteOne({ _id: doc._id });
      return doc as T;
    });
  }

  findByIdAndUpdate(id: DocumentId, update: Partial<T>): QueryBuilder<T> {
    return this.findOneAndUpdate({ _id: id } as Partial<T>, update);
  }

  findByIdAndDelete(id: DocumentId): QueryBuilder<T> {
    return this.findOneAndDelete({ _id: id } as Partial<T>);
  }

  async create(doc: T): Promise<T> {
    const result = await this._col.insertOne(doc);
    return { ...doc, _id: result.insertedId } as T;
  }

  async insertMany(docs: T[]): Promise<T[]> {
    const result = await this._col.insertMany(docs);
    return docs.map((d, i) => ({
      ...d,
      _id: result.insertedIds[i] ?? d._id,
    })) as T[];
  }

  async updateOne(
    filter: Partial<T>,
    update: Partial<T>,
  ): Promise<{ modifiedCount: number; matchedCount: number }> {
    const r = await this._col.updateOne(filter, { $set: update });
    return { modifiedCount: r.modifiedCount, matchedCount: r.matchedCount };
  }

  async updateMany(
    filter: Partial<T>,
    update: Partial<T>,
  ): Promise<{ modifiedCount: number; matchedCount: number }> {
    const r = await this._col.updateMany(filter, { $set: update });
    return { modifiedCount: r.modifiedCount, matchedCount: r.matchedCount };
  }

  async replaceOne(
    filter: Partial<T>,
    doc: T,
  ): Promise<{ modifiedCount: number; matchedCount: number }> {
    const r = await this._col.replaceOne(filter, doc);
    return { modifiedCount: r.modifiedCount, matchedCount: r.matchedCount };
  }

  async deleteOne(filter: Partial<T>): Promise<{ deletedCount: number }> {
    const r = await this._col.deleteOne(filter);
    return { deletedCount: r.deletedCount };
  }

  async deleteMany(filter: Partial<T>): Promise<{ deletedCount: number }> {
    const r = await this._col.deleteMany(filter);
    return { deletedCount: r.deletedCount };
  }

  async countDocuments(filter?: Partial<T>): Promise<number> {
    return this._col.countDocuments(filter ?? {});
  }

  async estimatedDocumentCount(): Promise<number> {
    return this._col.estimatedDocumentCount();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aggregate<U = unknown>(pipeline: unknown[]): QueryBuilder<U[]> {
    return toQueryBuilder<U[]>(async () => {
      return (await this._col.aggregate(pipeline)) as U[];
    });
  }

  distinct(field: keyof T): QueryBuilder<T[keyof T][]> {
    return toQueryBuilder<T[keyof T][]>(async () => {
      return (await this._col.distinct(field, {})) as T[keyof T][];
    });
  }

  async exists(filter: Partial<T>): Promise<{ _id: DocumentId } | null> {
    const doc = await this._col.findOne(filter);
    return doc ? { _id: (doc as DocumentRecord)._id as DocumentId } : null;
  }
}

/**
 * Wraps a BrightDb instance to implement the Mongoose-style DocumentStore
 * interface. Each collection() call returns a BrightDbCollectionAdapter
 * that bridges BrightDb's Collection API to DocumentCollection.
 */
export class BrightDbDocumentStoreAdapter implements DocumentStore {
  private readonly _adapters = new Map<
    string,
    BrightDbCollectionAdapter<DocumentRecord>
  >();

  constructor(public readonly brightDb: BrightDb) {}

  collection<T extends DocumentRecord>(name: string): DocumentCollection<T> {
    if (!this._adapters.has(name)) {
      const rawCol = this.brightDb.collection(name);
      this._adapters.set(
        name,
        new BrightDbCollectionAdapter<DocumentRecord>(rawCol),
      );
    }
    return this._adapters.get(name) as unknown as DocumentCollection<T>;
  }
}
