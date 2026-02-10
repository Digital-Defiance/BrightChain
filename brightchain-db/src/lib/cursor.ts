/**
 * Cursor – lazy, chainable query result that mimics MongoDB's cursor API.
 */

import { applyProjection, sortDocuments } from './queryEngine';
import { BsonDocument, ProjectionSpec, SortSpec } from './types';

export class Cursor<T extends BsonDocument = BsonDocument> {
  private _sort: SortSpec<T> | undefined;
  private _skip: number | undefined;
  private _limit: number | undefined;
  private _projection: ProjectionSpec<T> | undefined;
  private _exhausted = false;

  constructor(private readonly _source: () => Promise<T[]>) {}

  /** Set sort specification (chainable) */
  sort(spec: SortSpec<T>): this {
    this._sort = spec;
    return this;
  }

  /** Set number of documents to skip (chainable) */
  skip(n: number): this {
    this._skip = n;
    return this;
  }

  /** Set maximum number of documents to return (chainable) */
  limit(n: number): this {
    this._limit = n;
    return this;
  }

  /** Set field projection (chainable) */
  project(spec: ProjectionSpec<T>): this {
    this._projection = spec;
    return this;
  }

  /**
   * Execute the query and return all matching documents as an array.
   */
  async toArray(): Promise<T[]> {
    if (this._exhausted) return [];
    this._exhausted = true;

    let docs = await this._source();

    if (this._sort) {
      docs = sortDocuments(docs, this._sort as Record<string, 1 | -1>);
    }
    if (this._skip !== undefined && this._skip > 0) {
      docs = docs.slice(this._skip);
    }
    if (this._limit !== undefined && this._limit >= 0) {
      docs = docs.slice(0, this._limit);
    }
    if (this._projection) {
      docs = docs.map(
        (doc) =>
          applyProjection(doc, this._projection as Record<string, 0 | 1>) as T,
      );
    }

    return docs;
  }

  /**
   * Count matching documents (applies skip/limit if set).
   */
  async count(): Promise<number> {
    const docs = await this.toArray();
    return docs.length;
  }

  /**
   * Get the first matching document.
   */
  async next(): Promise<T | null> {
    const arr = await this.toArray();
    return arr.length > 0 ? arr[0] : null;
  }

  /**
   * Check if there are more results.
   */
  async hasNext(): Promise<boolean> {
    const arr = await this.toArray();
    return arr.length > 0;
  }

  /**
   * Iterate over all results with a callback.
   */
  async forEach(fn: (doc: T) => void | Promise<void>): Promise<void> {
    const docs = await this.toArray();
    for (const doc of docs) {
      await fn(doc);
    }
  }

  /**
   * Map results through a transform function.
   */
  async map<U>(fn: (doc: T) => U): Promise<U[]> {
    const docs = await this.toArray();
    return docs.map(fn);
  }

  /**
   * Make the cursor thenable so it can be awaited directly.
   */
  then<TResult1 = T[], TResult2 = never>(
    onfulfilled?: ((value: T[]) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.toArray().then(onfulfilled, onrejected);
  }
}
