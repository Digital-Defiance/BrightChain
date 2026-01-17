/**
 * @fileoverview Gossip Service Implementation
 *
 * Implements gossip-based block announcements across the network.
 * Supports announcement batching, TTL decrement on forwarding,
 * and fanout to random peers.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import {
  AnnouncementHandler,
  BlockAnnouncement,
  GossipConfig,
  IGossipService,
} from '@brightchain/brightchain-lib';

// Re-export DEFAULT_GOSSIP_CONFIG from brightchain-lib for convenience
export { DEFAULT_GOSSIP_CONFIG } from '@brightchain/brightchain-lib';

/**
 * Default gossip configuration values (local copy for use in this module).
 */
const defaultGossipConfig: GossipConfig = {
  fanout: 3,
  defaultTtl: 3,
  batchIntervalMs: 1000,
  maxBatchSize: 100,
};

/**
 * Interface for peer management operations.
 * Abstracts peer selection for gossip forwarding.
 */
export interface IPeerProvider {
  /**
   * Get the local node ID.
   */
  getLocalNodeId(): string;

  /**
   * Get all connected peer IDs.
   */
  getConnectedPeerIds(): string[];

  /**
   * Send an announcement batch to a specific peer.
   *
   * @param peerId - The peer to send to
   * @param announcements - The announcements to send
   */
  sendAnnouncementBatch(
    peerId: string,
    announcements: BlockAnnouncement[],
  ): Promise<void>;
}

/**
 * Gossip Service Implementation
 *
 * Handles gossip-based block announcements across the network.
 * Implements batching, TTL management, and random peer selection.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export class GossipService implements IGossipService {
  /**
   * Pending announcements waiting to be batched and sent.
   */
  private pendingAnnouncements: BlockAnnouncement[] = [];

  /**
   * Registered announcement handlers.
   */
  private handlers: Set<AnnouncementHandler> = new Set();

  /**
   * Batch timer handle.
   */
  private batchTimer: ReturnType<typeof setInterval> | null = null;

  /**
   * Whether the service is running.
   */
  private running = false;

  /**
   * Create a new GossipService.
   *
   * @param peerProvider - Provider for peer management operations
   * @param config - Gossip configuration (uses defaults if not provided)
   */
  constructor(
    private readonly peerProvider: IPeerProvider,
    private readonly config: GossipConfig = defaultGossipConfig,
  ) {}

  /**
   * Announce a new block to the network.
   *
   * @param blockId - The block ID to announce
   * @see Requirements 6.1
   */
  async announceBlock(blockId: string): Promise<void> {
    const announcement: BlockAnnouncement = {
      type: 'add',
      blockId,
      nodeId: this.peerProvider.getLocalNodeId(),
      timestamp: new Date(),
      ttl: this.config.defaultTtl,
    };

    this.queueAnnouncement(announcement);
  }

  /**
   * Announce block removal to the network.
   *
   * @param blockId - The block ID being removed
   * @see Requirements 6.5
   */
  async announceRemoval(blockId: string): Promise<void> {
    const announcement: BlockAnnouncement = {
      type: 'remove',
      blockId,
      nodeId: this.peerProvider.getLocalNodeId(),
      timestamp: new Date(),
      ttl: this.config.defaultTtl,
    };

    this.queueAnnouncement(announcement);
  }

  /**
   * Handle an incoming block announcement from a peer.
   * Notifies handlers and optionally forwards with decremented TTL.
   *
   * @param announcement - The received announcement
   * @see Requirements 6.2, 6.4
   */
  async handleAnnouncement(announcement: BlockAnnouncement): Promise<void> {
    // Notify all registered handlers
    for (const handler of this.handlers) {
      try {
        handler(announcement);
      } catch {
        // Ignore handler errors to prevent one handler from affecting others
      }
    }

    // Forward with decremented TTL if TTL > 0
    if (announcement.ttl > 0) {
      const forwardedAnnouncement: BlockAnnouncement = {
        ...announcement,
        ttl: announcement.ttl - 1,
      };

      this.queueAnnouncement(forwardedAnnouncement);
    }
  }

  /**
   * Subscribe to announcement events.
   *
   * @param handler - Function to call when an announcement is received
   * @see Requirements 6.2
   */
  onAnnouncement(handler: AnnouncementHandler): void {
    this.handlers.add(handler);
  }

  /**
   * Remove an announcement handler.
   *
   * @param handler - The handler to remove
   */
  offAnnouncement(handler: AnnouncementHandler): void {
    this.handlers.delete(handler);
  }

  /**
   * Get pending announcements that have not yet been sent.
   *
   * @returns Array of pending announcements
   * @see Requirements 6.6
   */
  getPendingAnnouncements(): BlockAnnouncement[] {
    return [...this.pendingAnnouncements];
  }

  /**
   * Immediately flush all pending announcements.
   *
   * @see Requirements 6.6
   */
  async flushAnnouncements(): Promise<void> {
    if (this.pendingAnnouncements.length === 0) {
      return;
    }

    // Get connected peers
    const connectedPeers = this.peerProvider.getConnectedPeerIds();
    if (connectedPeers.length === 0) {
      // No peers to send to, clear pending
      this.pendingAnnouncements = [];
      return;
    }

    // Select random peers for fanout
    const selectedPeers = this.selectRandomPeers(
      connectedPeers,
      this.config.fanout,
    );

    // Split announcements into batches
    const batches = this.splitIntoBatches(
      this.pendingAnnouncements,
      this.config.maxBatchSize,
    );

    // Clear pending before sending to avoid duplicates on retry
    this.pendingAnnouncements = [];

    // Send batches to selected peers
    const sendPromises: Promise<void>[] = [];
    for (const peerId of selectedPeers) {
      for (const batch of batches) {
        sendPromises.push(
          this.peerProvider.sendAnnouncementBatch(peerId, batch).catch(() => {
            // Ignore send errors - best effort delivery
          }),
        );
      }
    }

    await Promise.all(sendPromises);
  }

  /**
   * Start the gossip service.
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.batchTimer = setInterval(() => {
      this.flushAnnouncements().catch(() => {
        // Ignore flush errors
      });
    }, this.config.batchIntervalMs);
  }

  /**
   * Stop the gossip service.
   */
  async stop(): Promise<void> {
    if (!this.running) {
      return;
    }

    this.running = false;

    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    // Flush any remaining announcements
    await this.flushAnnouncements();
  }

  /**
   * Get the current configuration.
   *
   * @returns The gossip configuration
   */
  getConfig(): GossipConfig {
    return { ...this.config };
  }

  /**
   * Queue an announcement for batching.
   *
   * @param announcement - The announcement to queue
   */
  private queueAnnouncement(announcement: BlockAnnouncement): void {
    this.pendingAnnouncements.push(announcement);

    // If we've reached max batch size, flush immediately
    if (this.pendingAnnouncements.length >= this.config.maxBatchSize) {
      this.flushAnnouncements().catch(() => {
        // Ignore flush errors
      });
    }
  }

  /**
   * Select random peers from the available peers.
   *
   * @param peers - Available peer IDs
   * @param count - Number of peers to select
   * @returns Selected peer IDs
   * @see Requirements 6.3
   */
  private selectRandomPeers(peers: string[], count: number): string[] {
    if (peers.length <= count) {
      return [...peers];
    }

    // Fisher-Yates shuffle and take first `count` elements
    const shuffled = [...peers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.slice(0, count);
  }

  /**
   * Split announcements into batches of maximum size.
   *
   * @param announcements - Announcements to split
   * @param maxSize - Maximum batch size
   * @returns Array of batches
   * @see Requirements 6.6
   */
  private splitIntoBatches(
    announcements: BlockAnnouncement[],
    maxSize: number,
  ): BlockAnnouncement[][] {
    const batches: BlockAnnouncement[][] = [];

    for (let i = 0; i < announcements.length; i += maxSize) {
      batches.push(announcements.slice(i, i + maxSize));
    }

    return batches;
  }

  /**
   * Clear all pending announcements (for testing).
   */
  clearPending(): void {
    this.pendingAnnouncements = [];
  }
}
