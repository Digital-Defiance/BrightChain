/**
 * Adapter that wraps a BrightDb DocumentCollection / BlockCollection to match
 * the Collection<T> interface expected by BrightHub services.
 *
 * The underlying collection may be either:
 *   1. BlockCollection (from block-document-store.ts) — has create(), findOne().exec(),
 *      updateOne(filter, rawFields) returning Promise directly
 *   2. BrightDb Collection (from brightchain-db) — has insertOne(), findOne() returning
 *      Promise directly, updateOne(filter, {$set}) returning Promise directly
 *   3. BrightDb Model — wraps a BrightDb Collection with hydration/dehydration
 *
 * BrightHub services expect:
 *   - create(record) → Promise<T>
 *   - findOne(filter).exec() → Promise<T|null>
 *   - find(filter).sort().skip().limit().exec() → Promise<T[]>
 *   - updateOne(filter, rawFields).exec() → Promise<{modifiedCount}>
 *   - deleteOne(filter).exec() → Promise<{deletedCount}>
 *
 * This adapter bridges the gap for all underlying collection types.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

interface FindQuery<T> {
  sort?(field: Record<string, 1 | -1>): FindQuery<T>;
  skip?(count: number): FindQuery<T>;
  limit?(count: number): FindQuery<T>;
  exec(): Promise<T[]>;
}

/**
 * The Collection<T> interface that BrightHub services expect.
 */
export interface BrightHubCollection<T> {
  create(record: T): Promise<T>;
  findOne(filter: Partial<T>): { exec(): Promise<T | null> };
  find(filter: Partial<T>): FindQuery<T>;
  updateOne(
    filter: Partial<T>,
    update: Partial<T>,
  ): { exec(): Promise<{ modifiedCount: number }> };
  deleteOne(filter: Partial<T>): { exec(): Promise<{ deletedCount: number }> };
  countDocuments?(filter: Partial<T>): { exec(): Promise<number> };
}

/**
 * Wraps any underlying collection type to provide the BrightHubCollection<T>
 * interface that BrightHub services expect.
 */
export class CollectionAdapter<T> implements BrightHubCollection<T> {
  constructor(private readonly raw: any) {}

  async create(record: T): Promise<T> {
    // BlockCollection has create(), BrightDb Collection has insertOne()
    if (typeof this.raw.create === 'function') {
      return this.raw.create(record);
    }
    await this.raw.insertOne(record);
    return record;
  }

  findOne(filter: Partial<T>): { exec(): Promise<T | null> } {
    const result = this.raw.findOne(filter);
    // BlockCollection.findOne returns QueryBuilder with .exec()
    if (result && typeof result.exec === 'function') {
      return result;
    }
    // BrightDb Collection.findOne returns Promise<T|null> directly
    return { exec: () => result };
  }

  find(filter: Partial<T>): FindQuery<T> {
    const cursor = this.raw.find(filter);
    // BlockCollection.find returns QueryBuilder with .exec()
    if (cursor && typeof cursor.exec === 'function') {
      return cursor;
    }
    // BrightDb Collection.find returns Cursor with .toArray()
    return new CursorAdapter<T>(cursor);
  }

  updateOne(
    filter: Partial<T>,
    update: Partial<T>,
  ): { exec(): Promise<{ modifiedCount: number }> } {
    return {
      exec: async () => {
        // BlockCollection.updateOne takes raw fields directly
        // BrightDb Collection.updateOne takes {$set: fields}
        // Both return Promise<{modifiedCount, ...}>
        const result = await this.raw.updateOne(filter, update);
        return { modifiedCount: result.modifiedCount };
      },
    };
  }

  deleteOne(filter: Partial<T>): { exec(): Promise<{ deletedCount: number }> } {
    return {
      exec: async () => {
        const result = await this.raw.deleteOne(filter);
        return { deletedCount: result.deletedCount };
      },
    };
  }

  countDocuments(filter: Partial<T>): { exec(): Promise<number> } {
    return {
      exec: () => this.raw.countDocuments(filter),
    };
  }
}

/**
 * Wraps a BrightDb Cursor (which has .toArray() and .sort/.skip/.limit)
 * to provide the FindQuery<T> interface with .exec().
 */
class CursorAdapter<T> implements FindQuery<T> {
  constructor(private cursor: any) {}

  sort(field: Record<string, 1 | -1>): FindQuery<T> {
    if (this.cursor.sort) {
      this.cursor = this.cursor.sort(field);
    }
    return this;
  }

  skip(count: number): FindQuery<T> {
    if (this.cursor.skip) {
      this.cursor = this.cursor.skip(count);
    }
    return this;
  }

  limit(count: number): FindQuery<T> {
    if (this.cursor.limit) {
      this.cursor = this.cursor.limit(count);
    }
    return this;
  }

  async exec(): Promise<T[]> {
    if (typeof this.cursor.toArray === 'function') {
      return this.cursor.toArray();
    }
    // Cursor is thenable — awaiting returns the array
    return this.cursor;
  }
}

/**
 * Wrap any underlying collection for use by BrightHub services.
 */
export function wrapCollection<T>(raw: any): BrightHubCollection<T> {
  return new CollectionAdapter<T>(raw);
}
