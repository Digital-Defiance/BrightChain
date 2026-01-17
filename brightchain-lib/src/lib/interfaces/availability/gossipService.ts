/**
 * @fileoverview Gossip Service Interface
 *
 * Defines the interface for gossip-based block announcements across the network.
 * Enables nodes to announce new blocks and removals to peers, supporting
 * efficient block discovery without polling.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

/**
 * Block announcement message sent via gossip protocol.
 * Contains information about a block being added or removed from a node.
 *
 * @see Requirements 6.1, 6.5
 */
export interface BlockAnnouncement {
  /**
   * Type of announcement: 'add' for new blocks, 'remove' for deleted blocks
   */
  type: 'add' | 'remove';

  /**
   * The block ID being announced (hex string)
   */
  blockId: string;

  /**
   * The node ID that originated this announcement
   */
  nodeId: string;

  /**
   * Timestamp when the announcement was created
   */
  timestamp: Date;

  /**
   * Time-to-live: number of hops remaining before the announcement expires.
   * Decremented on each forward. Announcements with TTL=0 are not forwarded.
   *
   * @see Requirements 6.4
   */
  ttl: number;
}

/**
 * Configuration for the gossip protocol.
 *
 * @see Requirements 6.3, 6.4, 6.6
 */
export interface GossipConfig {
  /**
   * Number of peers to forward announcements to (fanout).
   * Higher values increase propagation speed but also network traffic.
   *
   * @see Requirements 6.3
   */
  fanout: number;

  /**
   * Initial TTL for new announcements.
   * Controls how far announcements propagate through the network.
   *
   * @see Requirements 6.4
   */
  defaultTtl: number;

  /**
   * Interval in milliseconds between batch flushes.
   * Announcements are batched within this interval to reduce network overhead.
   *
   * @see Requirements 6.6
   */
  batchIntervalMs: number;

  /**
   * Maximum number of announcements per batch.
   * Prevents batches from growing too large.
   *
   * @see Requirements 6.6
   */
  maxBatchSize: number;
}

/**
 * Default gossip configuration values.
 */
export const DEFAULT_GOSSIP_CONFIG: GossipConfig = {
  fanout: 3,
  defaultTtl: 3,
  batchIntervalMs: 1000,
  maxBatchSize: 100,
};

/**
 * Handler function type for announcement events.
 */
export type AnnouncementHandler = (announcement: BlockAnnouncement) => void;

/**
 * Gossip Service Interface
 *
 * Handles gossip-based block announcements across the network.
 * Supports announcing new blocks and removals, handling incoming announcements,
 * and batching announcements for efficient network usage.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
export interface IGossipService {
  /**
   * Announce a new block to the network.
   * The announcement will be batched and sent to a random subset of peers.
   *
   * @param blockId - The block ID to announce
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 6.1
   */
  announceBlock(blockId: string): Promise<void>;

  /**
   * Announce block removal to the network.
   * The announcement will be batched and sent to a random subset of peers.
   *
   * @param blockId - The block ID being removed
   * @returns Promise that resolves when the announcement is queued
   * @see Requirements 6.5
   */
  announceRemoval(blockId: string): Promise<void>;

  /**
   * Handle an incoming block announcement from a peer.
   * Updates local location metadata and optionally forwards the announcement.
   *
   * @param announcement - The received announcement
   * @returns Promise that resolves when the announcement is processed
   * @see Requirements 6.2, 6.4
   */
  handleAnnouncement(announcement: BlockAnnouncement): Promise<void>;

  /**
   * Subscribe to announcement events.
   * The handler will be called for each announcement received from peers.
   *
   * @param handler - Function to call when an announcement is received
   * @see Requirements 6.2
   */
  onAnnouncement(handler: AnnouncementHandler): void;

  /**
   * Remove an announcement handler.
   *
   * @param handler - The handler to remove
   */
  offAnnouncement(handler: AnnouncementHandler): void;

  /**
   * Get pending announcements that have not yet been sent.
   * Useful for inspection and testing.
   *
   * @returns Array of pending announcements
   * @see Requirements 6.6
   */
  getPendingAnnouncements(): BlockAnnouncement[];

  /**
   * Immediately flush all pending announcements.
   * Sends batched announcements to peers without waiting for the batch interval.
   *
   * @returns Promise that resolves when all announcements are sent
   * @see Requirements 6.6
   */
  flushAnnouncements(): Promise<void>;

  /**
   * Start the gossip service (begins batch timer).
   */
  start(): void;

  /**
   * Stop the gossip service (stops batch timer and flushes pending).
   */
  stop(): Promise<void>;

  /**
   * Get the current configuration.
   *
   * @returns The gossip configuration
   */
  getConfig(): GossipConfig;
}
