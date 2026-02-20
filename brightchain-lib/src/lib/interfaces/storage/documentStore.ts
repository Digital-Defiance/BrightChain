/**
 * Minimal document store abstraction that BrightChainDb can satisfy
 * without brightchain-lib depending on brightchain-db.
 *
 * This keeps the dependency direction clean:
 *   brightchain-db depends on brightchain-lib (not the reverse).
 */

/**
 * A cursor-like result from a find operation.
 */
export interface IDocumentCursor<T> {
  toArray(): Promise<T[]>;
}

/**
 * Minimal collection interface for document CRUD operations.
 * Intentionally simpler than the full ICollection from node-express-suite
 * to avoid coupling EnergyAccountStore to MongoDB-specific contracts.
 */
export interface IDocumentCollection<T> {
  find(filter: Partial<T>): Promise<IDocumentCursor<T>>;
  replaceOne(
    filter: Partial<T>,
    doc: T,
    options?: { upsert?: boolean },
  ): Promise<void>;
  deleteOne(filter: Partial<T>): Promise<boolean>;
}

/**
 * Minimal document store interface for connection lifecycle and
 * collection access. BrightChainDb implements this so that
 * EnergyAccountStore (in brightchain-lib) can persist without
 * importing brightchain-db directly.
 */
export interface IDocumentStore {
  collection<T>(name: string): IDocumentCollection<T>;
  connect(uri?: string): Promise<void>;
  isConnected(): boolean;
}
