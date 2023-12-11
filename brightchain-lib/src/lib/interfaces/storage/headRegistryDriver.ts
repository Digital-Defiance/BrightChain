/**
 * IHeadRegistryDriver — pluggable per-key storage backend for head registries.
 *
 * Each (dbName, collectionName) pair maps to exactly one record. All operations
 * are O(1) — there is no global lock and no full-collection rewrite.
 *
 * Implementations:
 *  - InMemoryHeadRegistryDriver (brightchain-lib)  — Map-backed, browser-safe
 *  - FileHeadRegistryDriver (brightchain-db)        — one .json file per key
 *  - AzureBlobHeadRegistryDriver (brightchain-azure-store) — one blob per key
 *  - S3HeadRegistryDriver (brightchain-s3-store)    — one object per key
 */

/** The value stored for a single (dbName, collectionName) head pointer. */
export interface HeadRecord {
  blockId: string;
  /** ISO 8601 timestamp for last-writer-wins merge. */
  timestamp: string;
  /**
   * Block ID of the previous HeadRecord block written to the block store,
   * forming an immutable audit chain. Optional — set by callers that write
   * head record blocks. Enables conflict resolution via common-ancestor walk
   * (analogous to Git refs) and replicates for free with the block store.
   */
  prevHeadBlockId?: string;
}

export interface IHeadRegistryDriver {
  /**
   * Read the head record for the given composite key.
   * Returns null if no record exists.
   */
  readRecord(key: string): Promise<HeadRecord | null>;

  /**
   * Write (create or overwrite) the head record for the given key.
   */
  writeRecord(key: string, record: HeadRecord): Promise<void>;

  /**
   * Delete the head record for the given key.
   * Must not throw if the key does not exist.
   */
  deleteRecord(key: string): Promise<void>;

  /**
   * Return all stored keys.
   * Used by load() to hydrate the in-memory cache on startup.
   */
  listKeys(): Promise<string[]>;
}
