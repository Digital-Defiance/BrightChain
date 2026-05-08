import type { BrightDateTimestamp } from '../../types/brightDateTimestamp';
import type { IWriteProof } from '../auth/writeProof';
import type { HeadRecord } from './headRegistryDriver';

/**
 * Represents a deferred head update for a block not yet available locally.
 * When the block is fetched, the deferred update can be applied.
 *
 * @see Requirements 2.4
 */
export interface DeferredHeadUpdate {
  /** The database name */
  dbName: string;
  /** The collection name */
  collectionName: string;
  /** The block ID of the announced head */
  blockId: string;
  /** The timestamp of the announced head (for last-writer-wins) */
  timestamp: BrightDateTimestamp;
}

/**
 * Interface for the HeadRegistry, which maps (dbName, collectionName) pairs
 * to the block ID of the latest metadata block for that collection.
 *
 * Implementations may be in-memory (for testing/backward compatibility)
 * or persistent (writing through to disk for durability across restarts).
 *
 * Mutating methods return Promise<void> to support async disk I/O
 * in persistent implementations.
 *
 * Includes cross-node synchronization support via merge and deferred update
 * methods that implement last-writer-wins conflict resolution.
 *
 * @see Requirements 2.2, 2.3, 2.4
 */
export interface IHeadRegistry {
  /**
   * Get the head block ID for a given database and collection.
   * @param dbName - The database name
   * @param collectionName - The collection name
   * @returns The block ID of the latest metadata block, or undefined if not set
   */
  getHead(dbName: string, collectionName: string): string | undefined;

  /**
   * Set the head block ID for a given database and collection.
   * Persistent implementations will write through to disk before returning.
   * Also records the current time as the timestamp for last-writer-wins.
   * @param dbName - The database name
   * @param collectionName - The collection name
   * @param blockId - The block ID of the latest metadata block
   * @param writeProof - Optional write proof for authorization in Restricted/OwnerOnly modes
   */
  setHead(
    dbName: string,
    collectionName: string,
    blockId: string,
    writeProof?: IWriteProof,
  ): Promise<void>;

  /**
   * Remove the head pointer for a given database and collection.
   * Persistent implementations will remove from disk before returning.
   * @param dbName - The database name
   * @param collectionName - The collection name
   * @param writeProof - Optional write proof for authorization in Restricted/OwnerOnly modes
   */
  removeHead(
    dbName: string,
    collectionName: string,
    writeProof?: IWriteProof,
  ): Promise<void>;

  /**
   * Remove all head pointers.
   * Persistent implementations will clear the persisted state before returning.
   */
  clear(): Promise<void>;

  /**
   * Load head pointers from the persistence layer into memory.
   * For in-memory implementations, this is a no-op.
   * For persistent implementations, this reads from disk.
   */
  load(): Promise<void>;

  /**
   * Get all head pointers as a Map.
   * Keys are composite strings in the format "dbName:collectionName".
   * Values are block IDs.
   * @returns A Map of all current head pointers
   */
  getAllHeads(): Map<string, string>;

  /**
   * Get the timestamp associated with a head pointer.
   * Used for last-writer-wins conflict resolution during cross-node sync.
   * @param dbName - The database name
   * @param collectionName - The collection name
   * @returns The timestamp of the head pointer, or undefined if not set
   *
   * @see Requirements 2.2, 2.3
   */
  getHeadTimestamp(dbName: string, collectionName: string): BrightDateTimestamp | undefined;

  /**
   * Merge a remote head update using last-writer-wins conflict resolution.
   * If the announced timestamp is newer than the local timestamp, the head
   * pointer is updated. Otherwise the update is rejected (local wins).
   *
   * @param dbName - The database name
   * @param collectionName - The collection name
   * @param blockId - The announced block ID
   * @param timestamp - The timestamp from the remote node's block metadata
   * @param writeProof - Optional write proof for authorization in Restricted/OwnerOnly modes
   * @returns true if the update was applied, false if rejected (local is newer)
   *
   * @see Requirements 2.2, 2.3
   */
  mergeHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: BrightDateTimestamp,
    writeProof?: IWriteProof,
  ): Promise<boolean>;

  /**
   * Queue a deferred head update for a block not yet available locally.
   * The update will be applied when `applyDeferredUpdates(blockId)` is called
   * after the block has been fetched.
   *
   * @param dbName - The database name
   * @param collectionName - The collection name
   * @param blockId - The block ID that is not yet locally available
   * @param timestamp - The timestamp from the remote node's block metadata
   *
   * @see Requirements 2.4
   */
  deferHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: BrightDateTimestamp,
  ): Promise<void>;

  /**
   * Apply any deferred updates for a block that has just become available locally.
   * Each deferred update is applied via `mergeHeadUpdate` (last-writer-wins).
   *
   * @param blockId - The block ID that is now available locally
   * @returns The number of deferred updates that were applied
   *
   * @see Requirements 2.4
   */
  applyDeferredUpdates(blockId: string): Promise<number>;

  /**
   * Get all currently deferred updates.
   * Useful for diagnostics and testing.
   * @returns Array of deferred head updates
   */
  getDeferredUpdates(): DeferredHeadUpdate[];

  /**
   * Export all current head records (blockId + timestamp) as a snapshot.
   * Suitable for transmission to a remote peer for eventual-consistency sync.
   * The map keys are composite strings in the format "dbName:collectionName".
   */
  exportSnapshot(): ReadonlyMap<string, HeadRecord>;

  /**
   * Merge a snapshot received from a remote peer using last-writer-wins conflict
   * resolution. Each entry is compared by timestamp; if the remote entry is
   * strictly newer than the local entry, the local record is updated.
   *
   * This is the primary entry point for gossip-based eventual-consistency sync:
   * each node periodically calls exportSnapshot() and sends the result to peers,
   * and peers call mergeSnapshot() to converge toward the same state.
   *
   * @param snapshot - Iterable of [compositeKey, HeadRecord] pairs from the remote peer
   * @returns Counts of merged (updated) and skipped (local was newer or equal) entries
   */
  mergeSnapshot(
    snapshot: Iterable<readonly [string, HeadRecord]>,
  ): Promise<{ merged: number; skipped: number }>;

  /**
   * Subscribe to external head changes — i.e. updates applied by
   * mergeHeadUpdate() (inbound gossip).  The callback is NOT fired for local
   * writes (setHead / removeHead) so Collection instances can distinguish
   * their own writes from remote ones without risk of re-entrancy.
   *
   * @param dbName         - Database name to watch
   * @param collectionName - Collection name to watch
   * @param callback       - Invoked with the new blockId whenever a remote
   *                         update is applied for this (db, collection) pair
   * @returns An unsubscribe function — call it to remove the listener
   *
   * @see Requirements 2.2, 7.1
   */
  onHeadChange(
    dbName: string,
    collectionName: string,
    callback: (blockId: string) => void,
  ): () => void;
}
