/**
 * @fileoverview Reconciliation Service Implementation
 *
 * Implements state synchronization after network reconnection.
 * Handles manifest exchange, pending sync queue processing,
 * orphan resolution, and conflict resolution using last-write-wins.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */

import {
  BlockManifest,
  DEFAULT_RECONCILIATION_CONFIG,
  IReconciliationService,
  PendingSyncItem,
  ReconciliationConfig,
  ReconciliationError,
  ReconciliationEvent,
  ReconciliationEventHandler,
  ReconciliationResult,
  SyncVectorEntry,
} from '@brightchain/brightchain-lib';
import { existsSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';

/**
 * Interface for peer manifest operations.
 * Abstracts network communication for reconciliation.
 */
export interface IManifestProvider {
  /**
   * Get the local node ID.
   */
  getLocalNodeId(): string;

  /**
   * Get the local manifest.
   */
  getLocalManifest(): BlockManifest;

  /**
   * Get manifest from a peer.
   *
   * @param peerId - The peer to get manifest from
   * @param sinceTimestamp - Optional timestamp to get changes since
   * @param timeoutMs - Timeout in milliseconds
   */
  getPeerManifest(
    peerId: string,
    sinceTimestamp?: Date,
    timeoutMs?: number,
  ): Promise<BlockManifest>;

  /**
   * Update location metadata for a block.
   *
   * @param blockId - The block ID to update
   * @param nodeId - The node ID that has the block
   * @param timestamp - When the block was seen
   */
  updateBlockLocation(
    blockId: string,
    nodeId: string,
    timestamp: Date,
  ): Promise<void>;

  /**
   * Get the current availability state of a block.
   *
   * @param blockId - The block ID to check
   * @returns 'local' | 'remote' | 'cached' | 'orphaned' | 'unknown'
   */
  getBlockAvailabilityState(
    blockId: string,
  ): Promise<'local' | 'remote' | 'cached' | 'orphaned' | 'unknown'>;

  /**
   * Update block availability state.
   *
   * @param blockId - The block ID to update
   * @param state - The new state
   */
  updateBlockAvailabilityState(
    blockId: string,
    state: 'local' | 'remote' | 'cached' | 'orphaned' | 'unknown',
  ): Promise<void>;

  /**
   * Get all orphaned block IDs.
   */
  getOrphanedBlockIds(): Promise<string[]>;

  /**
   * Send a pending sync item to a peer.
   *
   * @param peerId - The peer to send to
   * @param item - The sync item to send
   */
  sendSyncItem(peerId: string, item: PendingSyncItem): Promise<void>;

  /**
   * Get connected peer IDs.
   */
  getConnectedPeerIds(): string[];

  /**
   * Get the timestamp of a block's last modification.
   *
   * @param blockId - The block ID to check
   * @param nodeId - The node to check
   */
  getBlockTimestamp(blockId: string, nodeId: string): Promise<Date | null>;
}

/**
 * Stored format for sync vectors (JSON serialization).
 */
interface SyncVectorFile {
  version: 1;
  localNodeId: string;
  vectors: Record<
    string,
    {
      lastSyncTimestamp: string;
      lastManifestChecksum: string;
    }
  >;
  updatedAt: string;
}

/**
 * Stored format for pending sync queue (JSON serialization).
 */
interface PendingSyncQueueFile {
  version: 1;
  items: Array<{
    type: 'store' | 'delete' | 'replicate';
    blockId: string;
    timestamp: string;
    dataPath?: string;
  }>;
  updatedAt: string;
}

/**
 * Reconciliation Service Implementation
 *
 * Handles state synchronization after network reconnection.
 * Implements manifest exchange, pending sync queue processing,
 * orphan resolution, and conflict resolution.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7, 9.8
 */
export class ReconciliationService implements IReconciliationService {
  /**
   * Sync vectors for each peer.
   */
  private readonly syncVectors: Map<string, SyncVectorEntry> = new Map();

  /**
   * Pending sync queue.
   */
  private pendingSyncQueue: PendingSyncItem[] = [];

  /**
   * Event handlers.
   */
  private readonly eventHandlers: Set<ReconciliationEventHandler> = new Set();

  /**
   * Base path for persistence.
   */
  private readonly basePath: string;

  /**
   * Create a new ReconciliationService.
   *
   * @param manifestProvider - Provider for manifest operations
   * @param basePath - Base path for persistence files
   * @param config - Reconciliation configuration
   */
  constructor(
    private readonly manifestProvider: IManifestProvider,
    basePath: string,
    private readonly config: ReconciliationConfig = DEFAULT_RECONCILIATION_CONFIG,
  ) {
    this.basePath = basePath;
  }

  /**
   * Start reconciliation with reconnected peers.
   *
   * @param peerIds - Array of peer IDs to reconcile with
   * @returns Promise resolving to reconciliation result
   * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
   */
  async reconcile(peerIds: string[]): Promise<ReconciliationResult> {
    const startTime = Date.now();
    const errors: ReconciliationError[] = [];
    let blocksDiscovered = 0;
    let blocksUpdated = 0;
    let orphansResolved = 0;
    let conflictsResolved = 0;
    let peersReconciled = 0;

    // Emit start event
    this.emitEvent({
      type: 'reconciliation_started',
      timestamp: new Date(),
      peerIds,
    });

    // Process peers with concurrency limiting
    const chunks = this.chunkArray(
      peerIds,
      this.config.maxConcurrentReconciliations,
    );

    for (const chunk of chunks) {
      const results = await Promise.all(
        chunk.map((peerId) => this.reconcileWithPeer(peerId)),
      );

      for (const result of results) {
        if (result.success) {
          peersReconciled++;
          blocksDiscovered += result.blocksDiscovered;
          blocksUpdated += result.blocksUpdated;
          conflictsResolved += result.conflictsResolved;
        } else if (result.error) {
          errors.push(result.error);
        }
      }
    }

    // Resolve orphaned blocks
    const orphanResult = await this.resolveOrphanedBlocks();
    orphansResolved = orphanResult.resolved;
    errors.push(...orphanResult.errors);

    // Process pending sync queue
    try {
      await this.processPendingSyncQueue();
    } catch (error) {
      errors.push({
        error: `Failed to process pending sync queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    const result: ReconciliationResult = {
      success: errors.length === 0,
      peersReconciled,
      blocksDiscovered,
      blocksUpdated,
      orphansResolved,
      conflictsResolved,
      errors,
      duration: Date.now() - startTime,
    };

    // Emit completion event
    this.emitEvent({
      type: 'reconciliation_completed',
      timestamp: new Date(),
      result,
    });

    return result;
  }

  /**
   * Reconcile with a single peer.
   */
  private async reconcileWithPeer(peerId: string): Promise<{
    success: boolean;
    blocksDiscovered: number;
    blocksUpdated: number;
    conflictsResolved: number;
    error?: ReconciliationError;
  }> {
    this.emitEvent({
      type: 'peer_reconciliation_started',
      timestamp: new Date(),
      peerId,
    });

    try {
      // Get sync vector for delta sync
      const syncVector = this.getSyncVector(peerId);
      const sinceTimestamp = syncVector?.lastSyncTimestamp;

      // Exchange manifests
      const peerManifest = await this.manifestProvider.getPeerManifest(
        peerId,
        sinceTimestamp,
        this.config.manifestExchangeTimeoutMs,
      );

      const localManifest = this.manifestProvider.getLocalManifest();

      // Find new blocks on peer
      const localBlockSet = new Set(localManifest.blockIds);
      const newBlocks = peerManifest.blockIds.filter(
        (id) => !localBlockSet.has(id),
      );

      let blocksDiscovered = 0;
      let blocksUpdated = 0;
      let conflictsResolved = 0;

      // Update location metadata for discovered blocks
      for (const blockId of newBlocks) {
        await this.manifestProvider.updateBlockLocation(
          blockId,
          peerId,
          peerManifest.generatedAt,
        );
        blocksDiscovered++;
      }

      // Update location metadata for blocks we both have
      const sharedBlocks = peerManifest.blockIds.filter((id) =>
        localBlockSet.has(id),
      );
      for (const blockId of sharedBlocks) {
        // Check for conflicts using last-write-wins
        const localTimestamp = await this.manifestProvider.getBlockTimestamp(
          blockId,
          this.manifestProvider.getLocalNodeId(),
        );
        const peerTimestamp = await this.manifestProvider.getBlockTimestamp(
          blockId,
          peerId,
        );

        if (localTimestamp && peerTimestamp) {
          if (peerTimestamp > localTimestamp) {
            // Peer has newer version - this is a conflict resolved by last-write-wins
            this.emitEvent({
              type: 'conflict_resolved',
              timestamp: new Date(),
              blockId,
              winningNodeId: peerId,
            });
            conflictsResolved++;
          }
        }

        await this.manifestProvider.updateBlockLocation(
          blockId,
          peerId,
          peerManifest.generatedAt,
        );
        blocksUpdated++;
      }

      // Update sync vector
      this.updateSyncVector(peerId, new Date(), peerManifest.checksum);

      this.emitEvent({
        type: 'peer_reconciliation_completed',
        timestamp: new Date(),
        peerId,
        blocksDiscovered,
      });

      return {
        success: true,
        blocksDiscovered,
        blocksUpdated,
        conflictsResolved,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      this.emitEvent({
        type: 'peer_reconciliation_failed',
        timestamp: new Date(),
        peerId,
        error: errorMessage,
      });

      return {
        success: false,
        blocksDiscovered: 0,
        blocksUpdated: 0,
        conflictsResolved: 0,
        error: {
          peerId,
          error: errorMessage,
        },
      };
    }
  }

  /**
   * Resolve orphaned blocks by checking if any reconnected peers have them.
   */
  private async resolveOrphanedBlocks(): Promise<{
    resolved: number;
    errors: ReconciliationError[];
  }> {
    const errors: ReconciliationError[] = [];
    let resolved = 0;

    try {
      const orphanedBlockIds =
        await this.manifestProvider.getOrphanedBlockIds();
      const connectedPeers = this.manifestProvider.getConnectedPeerIds();

      for (const blockId of orphanedBlockIds) {
        // Check if any connected peer has this block
        for (const peerId of connectedPeers) {
          try {
            const peerManifest = await this.manifestProvider.getPeerManifest(
              peerId,
              undefined,
              this.config.manifestExchangeTimeoutMs,
            );

            if (peerManifest.blockIds.includes(blockId)) {
              // Found the block on a peer - resolve orphan
              await this.manifestProvider.updateBlockAvailabilityState(
                blockId,
                'remote',
              );
              await this.manifestProvider.updateBlockLocation(
                blockId,
                peerId,
                peerManifest.generatedAt,
              );

              this.emitEvent({
                type: 'orphan_resolved',
                timestamp: new Date(),
                blockId,
                sourceNodeId: peerId,
              });

              resolved++;
              break; // Found source, move to next orphan
            }
          } catch {
            // Continue checking other peers
          }
        }
      }
    } catch (error) {
      errors.push({
        error: `Failed to resolve orphaned blocks: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }

    return { resolved, errors };
  }

  /**
   * Get the sync vector entry for a specific peer.
   *
   * @param peerId - The peer ID to get sync vector for
   * @returns The sync vector entry or null if not found
   */
  getSyncVector(peerId: string): SyncVectorEntry | null {
    return this.syncVectors.get(peerId) ?? null;
  }

  /**
   * Get all sync vector entries.
   *
   * @returns Map of peer IDs to sync vector entries
   */
  getAllSyncVectors(): Map<string, SyncVectorEntry> {
    return new Map(this.syncVectors);
  }

  /**
   * Update the sync vector for a peer after successful synchronization.
   *
   * @param peerId - The peer ID to update
   * @param timestamp - The timestamp of the sync
   * @param manifestChecksum - The checksum of the peer's manifest
   */
  updateSyncVector(
    peerId: string,
    timestamp: Date,
    manifestChecksum: string,
  ): void {
    this.syncVectors.set(peerId, {
      peerId,
      lastSyncTimestamp: timestamp,
      lastManifestChecksum: manifestChecksum,
    });
  }

  /**
   * Initialize sync vector for a new peer.
   *
   * @param peerId - The peer ID to initialize
   */
  initializeSyncVector(peerId: string): void {
    if (!this.syncVectors.has(peerId)) {
      this.syncVectors.set(peerId, {
        peerId,
        lastSyncTimestamp: new Date(0), // Epoch - will sync everything
        lastManifestChecksum: '',
      });
    }
  }

  /**
   * Get the pending sync queue.
   *
   * @returns Array of pending sync items
   */
  getPendingSyncQueue(): PendingSyncItem[] {
    return [...this.pendingSyncQueue];
  }

  /**
   * Add an item to the pending sync queue.
   *
   * @param item - The item to add to the queue
   */
  addToPendingSyncQueue(item: PendingSyncItem): void {
    this.pendingSyncQueue.push(item);

    // Auto-persist if queue is getting large
    if (this.pendingSyncQueue.length >= this.config.maxPendingSyncQueueSize) {
      this.persistPendingSyncQueue().catch(() => {
        // Ignore persistence errors during auto-save
      });
    }
  }

  /**
   * Process the pending sync queue.
   *
   * @returns Promise that resolves when queue is processed
   */
  async processPendingSyncQueue(): Promise<void> {
    if (this.pendingSyncQueue.length === 0) {
      return;
    }

    const connectedPeers = this.manifestProvider.getConnectedPeerIds();
    if (connectedPeers.length === 0) {
      return; // No peers to sync with
    }

    const itemsToProcess = [...this.pendingSyncQueue];
    const processedItems: PendingSyncItem[] = [];

    for (const item of itemsToProcess) {
      let success = false;

      // Try to send to at least one peer
      for (const peerId of connectedPeers) {
        try {
          await this.manifestProvider.sendSyncItem(peerId, item);
          success = true;
          break;
        } catch {
          // Try next peer
        }
      }

      if (success) {
        processedItems.push(item);
      }
    }

    // Remove processed items from queue
    this.pendingSyncQueue = this.pendingSyncQueue.filter(
      (item) => !processedItems.includes(item),
    );
  }

  /**
   * Clear the pending sync queue.
   */
  clearPendingSyncQueue(): void {
    this.pendingSyncQueue = [];
  }

  /**
   * Persist sync vectors to disk.
   *
   * @returns Promise that resolves when persistence is complete
   */
  async persistSyncVectors(): Promise<void> {
    const filePath = join(this.basePath, this.config.syncVectorPath);

    const data: SyncVectorFile = {
      version: 1,
      localNodeId: this.manifestProvider.getLocalNodeId(),
      vectors: {},
      updatedAt: new Date().toISOString(),
    };

    for (const [peerId, entry] of this.syncVectors) {
      data.vectors[peerId] = {
        lastSyncTimestamp: entry.lastSyncTimestamp.toISOString(),
        lastManifestChecksum: entry.lastManifestChecksum,
      };
    }

    await this.ensureDirectoryExists(filePath);
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Load sync vectors from disk.
   *
   * @returns Promise that resolves when loading is complete
   */
  async loadSyncVectors(): Promise<void> {
    const filePath = join(this.basePath, this.config.syncVectorPath);

    if (!existsSync(filePath)) {
      return;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const data: SyncVectorFile = JSON.parse(content);

      if (data.version !== 1) {
        throw new Error(
          `Unsupported sync vector file version: ${data.version}`,
        );
      }

      this.syncVectors.clear();
      for (const [peerId, entry] of Object.entries(data.vectors)) {
        this.syncVectors.set(peerId, {
          peerId,
          lastSyncTimestamp: new Date(entry.lastSyncTimestamp),
          lastManifestChecksum: entry.lastManifestChecksum,
        });
      }
    } catch (error) {
      throw new Error(
        `Failed to load sync vectors: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Persist pending sync queue to disk.
   *
   * @returns Promise that resolves when persistence is complete
   */
  async persistPendingSyncQueue(): Promise<void> {
    const filePath = join(this.basePath, this.config.pendingSyncQueuePath);

    const data: PendingSyncQueueFile = {
      version: 1,
      items: this.pendingSyncQueue.map((item) => ({
        type: item.type,
        blockId: item.blockId,
        timestamp: item.timestamp.toISOString(),
        // Note: data is not persisted to file, only dataPath would be
      })),
      updatedAt: new Date().toISOString(),
    };

    await this.ensureDirectoryExists(filePath);
    await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
  }

  /**
   * Load pending sync queue from disk.
   *
   * @returns Promise that resolves when loading is complete
   */
  async loadPendingSyncQueue(): Promise<void> {
    const filePath = join(this.basePath, this.config.pendingSyncQueuePath);

    if (!existsSync(filePath)) {
      return;
    }

    try {
      const content = await readFile(filePath, 'utf-8');
      const data: PendingSyncQueueFile = JSON.parse(content);

      if (data.version !== 1) {
        throw new Error(
          `Unsupported pending sync queue file version: ${data.version}`,
        );
      }

      this.pendingSyncQueue = data.items.map((item) => ({
        type: item.type,
        blockId: item.blockId,
        timestamp: new Date(item.timestamp),
      }));
    } catch (error) {
      throw new Error(
        `Failed to load pending sync queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Subscribe to reconciliation events.
   *
   * @param handler - Function to call when events occur
   */
  onEvent(handler: ReconciliationEventHandler): void {
    this.eventHandlers.add(handler);
  }

  /**
   * Remove a reconciliation event handler.
   *
   * @param handler - The handler to remove
   */
  offEvent(handler: ReconciliationEventHandler): void {
    this.eventHandlers.delete(handler);
  }

  /**
   * Get the current configuration.
   *
   * @returns The reconciliation configuration
   */
  getConfig(): ReconciliationConfig {
    return { ...this.config };
  }

  /**
   * Emit an event to all handlers.
   */
  private emitEvent(event: ReconciliationEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch {
        // Ignore handler errors
      }
    }
  }

  /**
   * Ensure the directory for a file path exists.
   */
  private async ensureDirectoryExists(filePath: string): Promise<void> {
    const dir = dirname(filePath);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  /**
   * Split an array into chunks.
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Clear all state (for testing).
   */
  clear(): void {
    this.syncVectors.clear();
    this.pendingSyncQueue = [];
  }
}
