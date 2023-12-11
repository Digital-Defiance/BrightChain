/**
 * Minimal typed-collection abstraction that the Model system in
 * brightchain-db naturally satisfies.
 *
 * This keeps the dependency direction clean:
 *   brightchain-db depends on brightchain-lib (not the reverse).
 *
 * EnergyAccountStore (in brightchain-lib) depends only on this interface,
 * so it can work with any backend that provides typed find/replaceOne/deleteOne
 * with automatic hydration/dehydration.
 */

/**
 * A cursor-like result from a find operation that yields typed documents.
 */
export interface ITypedCursor<TTyped> {
  toArray(): Promise<TTyped[]>;
}

/**
 * A typed collection that automatically hydrates reads and dehydrates writes.
 *
 * This is the interface that Model<TStored, TTyped> in brightchain-db
 * satisfies. EnergyAccountStore depends on this rather than on the
 * concrete Model class, keeping brightchain-lib free of brightchain-db imports.
 *
 * TStored is the shape of documents in the database (flat DTO).
 * TTyped is the shape your application code works with (rich objects).
 */
export interface ITypedCollection<TStored, TTyped> {
  /**
   * Find documents matching a filter on stored field names/values.
   * Returns a cursor that yields hydrated (TTyped) documents.
   */
  find(filter?: Partial<TStored>): ITypedCursor<TTyped>;

  /**
   * Find a single document matching a filter.
   * Returns the hydrated document or null.
   */
  findOne(filter?: Partial<TStored>): Promise<TTyped | null>;

  /**
   * Replace a single document matching the filter with a typed replacement.
   * The implementation dehydrates the replacement before writing.
   */
  replaceOne(
    filter: Partial<TStored>,
    replacement: TTyped,
    options?: { upsert?: boolean },
  ): Promise<unknown>;

  /**
   * Delete a single document matching the filter.
   */
  deleteOne(filter: Partial<TStored>): Promise<unknown>;

  /**
   * Convert a typed document to its stored form (for manual operations).
   */
  dehydrate(typed: TTyped): TStored;

  /**
   * Convert a stored document to its typed form (for manual operations).
   */
  hydrate(stored: TStored): TTyped;
}
