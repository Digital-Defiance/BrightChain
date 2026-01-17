/**
 * @fileoverview Reconciliation Service Interface
 *
 * Defines the interface for state synchronization after network reconnection.
 * Handles manifest exchange, pending sync queue processing, orphan resolution,
 * and conflict resolution using last-write-wins with vector timestamps.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 10.1, 10.2, 10.3, 10.4, 10.5
 */

/**
 * Sync vector entry for tracking synchronization state with a peer.
 * Used for delta synchronization to request only changes since last sync.
 *
 * @see Requirements 10.1, 10.2, 10.3
 */
export interface SyncVectorEntry {
  /**
   * The peer ID this entry tracks
   */
  peerId: string;

  /**
   * Timestamp of the last successful synchronization with this peer
   */
  lastSyncTimestamp: Date;

  /**
   * Checksum of the last manifest received from this peer
   */
  lastManifestChecksum: string;
}

/**
 * Item in the pending sync queue.
 * Tracks local changes made during partition mode for later synchronization.
 *
 * @see Requirements 8.3, 8.5
 */
export interface PendingSyncItem {
  /**
   * Type of operation:
   * - 'store': A block was stored locally
   * - 'delete': A block was deleted locally
   * - 'replicate': A block needs to be replicated to peers
   */
  type: 'store' | 'delete' | 'replicate';

  /**
   * The block ID affected by this operation
   */
  blockId: string;

  /**
   * Timestamp when the operation occurred
   */
  timestamp: Date;

  /**
   * Optional block data for store operations
   */
  data?: Uint8Array;
}

/**
 * Error that occurred during reconciliation.
 *
 * @see Requirements 9.8
 */
export interface ReconciliationError {
  /**
   * The peer ID where the error occurred (if applicable)
   */
  peerId?: string;

  /**
   * The block ID involved in the error (if applicable)
   */
  blockId?: string;

  /**
   * Description of the error
   */
  error: string;
}

/**
 * Result of a reconciliation operation.
 *
 * @see Requirements 9.7
 */
export interface ReconciliationResult {
  /**
   * Whether reconciliation completed successfully
   */
  success: boolean;

  /**
   * Number of peers that were reconciled with
   */
  peersReconciled: number;

  /**
   * Number of new blocks discovered during reconciliation
   */
  blocksDiscovered: number;

  /**
   * Number of blocks whose location metadata was updated
   */
  blocksUpdated: number;

  /**
   * Number of orphaned blocks that were resolved (found sources)
   */
  orphansResolved: number;

  /**
   * Number of conflicts that were resolved
   */
  conflictsResolved: number;

  /**
   * Errors that occurred during reconciliation
   */
  errors: ReconciliationError[];

  /**
   * Total duration of reconciliation in milliseconds
   */
  duration: number;
}

/**
 * Configuration for the reconciliation service.
 *
 * @see Requirements 9.1, 10.1
 */
export interface ReconciliationConfig {
  /**
   * Timeout for manifest exchange operations in milliseconds
   */
  manifestExchangeTimeoutMs: number;

  /**
   * Maximum number of concurrent peer reconciliations
   */
  maxConcurrentReconciliations: number;

  /**
   * Path for persisting sync vectors
   */
  syncVectorPath: string;

  /**
   * Path for persisting pending sync queue
   */
  pendingSyncQueuePath: string;

  /**
   * Maximum items in pending sync queue before forcing flush
   */
  maxPendingSyncQueueSize: number;
}

/**
 * Default reconciliation configuration values.
 */
export const DEFAULT_RECONCILIATION_CONFIG: ReconciliationConfig = {
  manifestExchangeTimeoutMs: 30000,
  maxConcurrentReconciliations: 5,
  syncVectorPath: 'sync-vectors.json',
  pendingSyncQueuePath: 'pending-sync-queue.json',
  maxPendingSyncQueueSize: 1000,
};

/**
 * Handler function type for reconciliation events.
 */
export type ReconciliationEventHandler = (
  event: ReconciliationEvent,
) => void;

/**
 * Events emitted during reconciliation.
 */
export type ReconciliationEvent =
  | { type: 'reconciliation_started'; timestamp: Date; peerIds: string[] }
  | { type: 'peer_reconciliation_started'; timestamp: Date; peerId: string }
  | { type: 'peer_reconciliation_completed'; timestamp: Date; peerId: string; blocksDiscovered: number }
  | { type: 'peer_reconciliation_failed'; timestamp: Date; peerId: string; error: string }
  | { type: 'orphan_resolved'; timestamp: Date; blockId: string; sourceNodeId: string }
  | { type: 'conflict_resolved'; timestamp: Date; blockId: string; winningNodeId: string }
  | { type: 'reconciliation_completed'; timestamp: Date; result: ReconciliationResult };

/**
 * Reconciliation Service Interface
 *
 * Handles state synchronization after network reconnection.
 * Implements manifest exchange, pending sync queue processing,
 * orphan resolution, and conflict resolution.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8, 10.1, 10.2, 10.3, 10.4, 10.5
 */
export interface IReconciliationService {
  /**
   * Start reconciliation with reconnected peers.
   * Exchanges manifests, updates location metadata, processes pending sync queue,
   * and resolves orphaned blocks.
   *
   * @param peerIds - Array of peer IDs to reconcile with
   * @returns Promise resolving to reconciliation result
   * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
   */
  reconcile(peerIds: string[]): Promise<ReconciliationResult>;

  /**
   * Get the sync vector entry for a specific peer.
   *
   * @param peerId - The peer ID to get sync vector for
   * @returns The sync vector entry or null if not found
   * @see Requirements 10.1
   */
  getSyncVector(peerId: string): SyncVectorEntry | null;

  /**
   * Get all sync vector entries.
   *
   * @returns Map of peer IDs to sync vector entries
   * @see Requirements 10.1
   */
  getAllSyncVectors(): Map<string, SyncVectorEntry>;

  /**
   * Update the sync vector for a peer after successful synchronization.
   *
   * @param peerId - The peer ID to update
   * @param timestamp - The timestamp of the sync
   * @param manifestChecksum - The checksum of the peer's manifest
   * @see Requirements 10.3
   */
  updateSyncVector(
    peerId: string,
    timestamp: Date,
    manifestChecksum: string,
  ): void;

  /**
   * Initialize sync vector for a new peer.
   *
   * @param peerId - The peer ID to initialize
   * @see Requirements 10.4
   */
  initializeSyncVector(peerId: string): void;

  /**
   * Get the pending sync queue.
   *
   * @returns Array of pending sync items
   * @see Requirements 8.5
   */
  getPendingSyncQueue(): PendingSyncItem[];

  /**
   * Add an item to the pending sync queue.
   * Called when local changes are made during partition mode.
   *
   * @param item - The item to add to the queue
   * @see Requirements 8.3, 8.5
   */
  addToPendingSyncQueue(item: PendingSyncItem): void;

  /**
   * Process the pending sync queue.
   * Sends queued operations to connected peers.
   *
   * @returns Promise that resolves when queue is processed
   * @see Requirements 9.4
   */
  processPendingSyncQueue(): Promise<void>;

  /**
   * Clear the pending sync queue.
   * Called after successful processing.
   */
  clearPendingSyncQueue(): void;

  /**
   * Persist sync vectors to disk.
   *
   * @returns Promise that resolves when persistence is complete
   * @see Requirements 10.5
   */
  persistSyncVectors(): Promise<void>;

  /**
   * Load sync vectors from disk.
   *
   * @returns Promise that resolves when loading is complete
   * @see Requirements 10.5
   */
  loadSyncVectors(): Promise<void>;

  /**
   * Persist pending sync queue to disk.
   *
   * @returns Promise that resolves when persistence is complete
   */
  persistPendingSyncQueue(): Promise<void>;

  /**
   * Load pending sync queue from disk.
   *
   * @returns Promise that resolves when loading is complete
   */
  loadPendingSyncQueue(): Promise<void>;

  /**
   * Subscribe to reconciliation events.
   *
   * @param handler - Function to call when events occur
   */
  onEvent(handler: ReconciliationEventHandler): void;

  /**
   * Remove a reconciliation event handler.
   *
   * @param handler - The handler to remove
   */
  offEvent(handler: ReconciliationEventHandler): void;

  /**
   * Get the current configuration.
   *
   * @returns The reconciliation configuration
   */
  getConfig(): ReconciliationConfig;
}
