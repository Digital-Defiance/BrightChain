/**
 * @fileoverview Adapter that wraps BrightChainDb as an IDocumentStore.
 *
 * BrightChainDb's Collection.find() returns a Cursor synchronously, while
 * IDocumentStore expects find() to return Promise<IDocumentCursor<T>>.
 * This thin adapter bridges the structural mismatch so that
 * EnergyAccountStore (in brightchain-lib) can use BrightChainDb for
 * persistence without depending on brightchain-db directly.
 *
 * @module adapters/brightChainDbDocumentStoreAdapter
 */

import type {
  IDocumentCollection,
  IDocumentCursor,
  IDocumentStore,
} from '@brightchain/brightchain-lib';
import type { BrightChainDb, BsonDocument } from '@brightchain/db';

/**
 * Wraps a BrightChainDb instance to satisfy the IDocumentStore interface.
 */
export class BrightChainDbDocumentStoreAdapter implements IDocumentStore {
  constructor(private readonly db: BrightChainDb) {}

  collection<T>(name: string): IDocumentCollection<T> {
    const coll = this.db.collection<BsonDocument>(name);
    return {
      async find(filter: Partial<T>): Promise<IDocumentCursor<T>> {
        // Collection.find() returns a Cursor synchronously; wrap it
        // as a Promise<IDocumentCursor<T>> by resolving immediately.
        const cursor = coll.find(filter as Partial<BsonDocument>);
        return {
          async toArray(): Promise<T[]> {
            const docs = await cursor.toArray();
            return docs as T[];
          },
        };
      },
      async replaceOne(
        filter: Partial<T>,
        doc: T,
        options?: { upsert?: boolean },
      ): Promise<void> {
        await coll.replaceOne(
          filter as Partial<BsonDocument>,
          doc as BsonDocument,
          options,
        );
      },
      async deleteOne(filter: Partial<T>): Promise<boolean> {
        const result = await coll.deleteOne(filter as Partial<BsonDocument>);
        return result.deletedCount > 0;
      },
    };
  }

  async connect(uri?: string): Promise<void> {
    await this.db.connect(uri);
  }

  isConnected(): boolean {
    return this.db.isConnected();
  }
}
