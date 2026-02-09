/**
 * @fileoverview Gossip Service Interface
 *
 * Defines the interface for gossip-based block announcements across the network.
 * Enables nodes to announce new blocks and removals to peers, supporting
 * efficient block discovery without polling.
 *
 * @see Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 * @see Requirements 1.1, 1.2, 1.3, 1.5, 1.6, 10.1 (Unified Gossip Delivery)
 */

/**
 * Metadata for message delivery via gossip protocol.
 * Attached to 'add' type BlockAnnouncements to indicate the announcement
 * is part of a logical message delivery.
 *
 * @see Requirements 1.2
 */
export interface MessageDeliveryMetadata {
  /** Unique identifier for the message being delivered */
  messageId: string;

  /** IDs of the intended recipients */
  recipientIds: string[];

  /** Delivery priority level affecting fanout and TTL */
  priority: 'normal' | 'high';

  /** Block IDs containing the message content */
  blockIds: string[];

  /** The CBL block ID that serves as the manifest for this delivery */
  cblBlockId: string;

  /** Whether the recipient should send a delivery acknowledgment */
  ackRequired: boolean;
}

/**
 * Metadata for delivery acknowledgment via gossip protocol.
 * Attached to 'ack' type BlockAnnouncements to confirm message receipt.
 *
 * @see Requirements 1.3
 */
export interface DeliveryAckMetadata {
  /** The message ID being acknowledged */
  messageId: string;

  /** The recipient ID sending the acknowledgment */
  recipientId: string;

  /** The delivery status being reported */
  status: 'delivered' | 'read' | 'failed' | 'bounced';

  /** The node ID of the original message sender */
  originalSenderNode: string;
}

/**
 * Block announcement message sent via gossip protocol.
 * Contains information about a block being added, removed, or acknowledged.
 *
 * @see Requirements 6.1, 6.5
 * @see Requirements 1.1, 1.2, 1.3, 1.5, 1.6
 */
export interface BlockAnnouncement {
  /**
   * Type of announcement:
   * - 'add' for new blocks (may include messageDelivery metadata)
   * - 'remove' for deleted blocks
   * - 'ack' for delivery acknowledgments (must include deliveryAck metadata)
   *
   * @see Requirements 1.1
   */
  type: 'add' | 'remove' | 'ack';

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

  /**
   * Optional message delivery metadata. Only allowed on 'add' type announcements.
   *
   * @see Requirements 1.2, 1.5
   */
  messageDelivery?: MessageDeliveryMetadata;

  /**
   * Optional delivery acknowledgment metadata. Only allowed on 'ack' type announcements.
   *
   * @see Requirements 1.3, 1.6
   */
  deliveryAck?: DeliveryAckMetadata;
}

/**
 * Configuration for priority-based gossip propagation.
 * Defines fanout and TTL values for a specific priority level.
 *
 * @see Requirements 10.1
 */
export interface PriorityGossipConfig {
  /** Number of peers to forward announcements to */
  fanout: number;

  /** Time-to-live: number of hops for announcements */
  ttl: number;
}

/**
 * Configuration for the gossip protocol.
 *
 * @see Requirements 6.3, 6.4, 6.6, 10.1
 */
export interface GossipConfig {
  /**
   * Number of peers to forward announcements to (fanout).
   * Higher values increase propagation speed but also network traffic.
   * This is the default fanout for block-level announcements.
   *
   * @see Requirements 6.3
   */
  fanout: number;

  /**
   * Initial TTL for new announcements.
   * Controls how far announcements propagate through the network.
   * This is the default TTL for block-level announcements.
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

  /**
   * Priority-based overrides for message delivery.
   * Defines fanout and TTL values for normal and high priority messages.
   *
   * @see Requirements 10.1
   */
  messagePriority: {
    normal: PriorityGossipConfig;
    high: PriorityGossipConfig;
  };
}

/**
 * Default gossip configuration values.
 *
 * @see Requirements 10.1
 */
export const DEFAULT_GOSSIP_CONFIG: GossipConfig = {
  fanout: 3,
  defaultTtl: 3,
  batchIntervalMs: 1000,
  maxBatchSize: 100,
  messagePriority: {
    normal: { fanout: 5, ttl: 5 },
    high: { fanout: 7, ttl: 7 },
  },
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

  /**
   * Announce message blocks to the network with message delivery metadata.
   * Creates BlockAnnouncements with messageDelivery metadata, applies
   * priority-based fanout/TTL from config, and queues for batch sending.
   *
   * @param blockIds - The block IDs containing the message content
   * @param metadata - Message delivery metadata including recipients, priority, and CBL block ID
   * @returns Promise that resolves when the announcements are queued
   * @see Requirements 3.1 (message-aware gossip delivery)
   */
  announceMessage(
    blockIds: string[],
    metadata: MessageDeliveryMetadata,
  ): Promise<void>;

  /**
   * Send a delivery acknowledgment back through the gossip network.
   * Creates a BlockAnnouncement of type 'ack' with deliveryAck metadata
   * and queues it for propagation.
   *
   * @param ack - Delivery acknowledgment metadata including messageId, recipientId, status, and originalSenderNode
   * @returns Promise that resolves when the ack announcement is queued
   * @see Requirements 4.1 (delivery acknowledgment via gossip)
   */
  sendDeliveryAck(ack: DeliveryAckMetadata): Promise<void>;

  /**
   * Register a handler for message delivery events.
   * The handler is called when a BlockAnnouncement with messageDelivery
   * metadata is received and the recipientIds match local users.
   *
   * @param handler - Function to call when a message delivery announcement is received
   * @see Requirements 3.4, 3.5 (message receipt handling)
   */
  onMessageDelivery(handler: (announcement: BlockAnnouncement) => void): void;

  /**
   * Remove a message delivery event handler.
   *
   * @param handler - The handler to remove
   * @see Requirements 3.4, 3.5 (message receipt handling)
   */
  offMessageDelivery(handler: (announcement: BlockAnnouncement) => void): void;

  /**
   * Register a handler for delivery acknowledgment events.
   * The handler is called when a BlockAnnouncement of type 'ack' with
   * deliveryAck metadata is received at the original sender node.
   *
   * @param handler - Function to call when a delivery ack announcement is received
   * @see Requirements 4.1 (delivery acknowledgment via gossip)
   */
  onDeliveryAck(handler: (announcement: BlockAnnouncement) => void): void;

  /**
   * Remove a delivery acknowledgment event handler.
   *
   * @param handler - The handler to remove
   * @see Requirements 4.1 (delivery acknowledgment via gossip)
   */
  offDeliveryAck(handler: (announcement: BlockAnnouncement) => void): void;
}

/**
 * Valid announcement types.
 */
const VALID_ANNOUNCEMENT_TYPES = ['add', 'remove', 'ack'] as const;

/**
 * Valid delivery ack statuses.
 */
const VALID_ACK_STATUSES = ['delivered', 'read', 'failed', 'bounced'] as const;

/**
 * Valid message delivery priorities.
 */
const VALID_PRIORITIES = ['normal', 'high'] as const;

/**
 * Validates a BlockAnnouncement, enforcing field-type constraints.
 *
 * Validation rules:
 * - messageDelivery is only allowed on 'add' type announcements (Req 1.5)
 * - deliveryAck is only allowed on 'ack' type announcements (Req 1.6)
 * - When messageDelivery is present, all fields must be complete and valid
 * - When deliveryAck is present, all fields must be complete and valid
 *
 * @param announcement - The BlockAnnouncement to validate
 * @returns true if the announcement is valid, false otherwise
 *
 * @see Requirements 1.1, 1.2, 1.3, 1.5, 1.6
 */
export function validateBlockAnnouncement(
  announcement: BlockAnnouncement,
): boolean {
  // Validate type field
  if (
    !VALID_ANNOUNCEMENT_TYPES.includes(
      announcement.type as (typeof VALID_ANNOUNCEMENT_TYPES)[number],
    )
  ) {
    return false;
  }

  // Req 1.5: messageDelivery only allowed on 'add' type
  if (announcement.messageDelivery && announcement.type !== 'add') {
    return false;
  }

  // Req 1.6: deliveryAck only allowed on 'ack' type
  if (announcement.deliveryAck && announcement.type !== 'ack') {
    return false;
  }

  // Validate messageDelivery fields when present (Req 1.2)
  if (announcement.messageDelivery) {
    const md = announcement.messageDelivery;

    if (!md.messageId || typeof md.messageId !== 'string') {
      return false;
    }

    if (
      !Array.isArray(md.recipientIds) ||
      md.recipientIds.length === 0 ||
      md.recipientIds.some((id) => !id || typeof id !== 'string')
    ) {
      return false;
    }

    if (
      !VALID_PRIORITIES.includes(
        md.priority as (typeof VALID_PRIORITIES)[number],
      )
    ) {
      return false;
    }

    if (
      !Array.isArray(md.blockIds) ||
      md.blockIds.length === 0 ||
      md.blockIds.some((id) => !id || typeof id !== 'string')
    ) {
      return false;
    }

    if (!md.cblBlockId || typeof md.cblBlockId !== 'string') {
      return false;
    }

    if (typeof md.ackRequired !== 'boolean') {
      return false;
    }
  }

  // Validate deliveryAck fields when present (Req 1.3)
  if (announcement.deliveryAck) {
    const ack = announcement.deliveryAck;

    if (!ack.messageId || typeof ack.messageId !== 'string') {
      return false;
    }

    if (!ack.recipientId || typeof ack.recipientId !== 'string') {
      return false;
    }

    if (
      !VALID_ACK_STATUSES.includes(
        ack.status as (typeof VALID_ACK_STATUSES)[number],
      )
    ) {
      return false;
    }

    if (!ack.originalSenderNode || typeof ack.originalSenderNode !== 'string') {
      return false;
    }
  }

  return true;
}

/**
 * Validates a GossipConfig, ensuring all fanout and TTL values are positive integers.
 *
 * Validation rules:
 * - config.fanout must be a positive integer (Req 10.3)
 * - config.defaultTtl must be a positive integer (Req 10.4)
 * - config.messagePriority.normal.fanout must be a positive integer (Req 10.3)
 * - config.messagePriority.normal.ttl must be a positive integer (Req 10.4)
 * - config.messagePriority.high.fanout must be a positive integer (Req 10.3)
 * - config.messagePriority.high.ttl must be a positive integer (Req 10.4)
 *
 * @param config - The GossipConfig to validate
 * @returns true if all values are valid, false otherwise
 *
 * @see Requirements 10.3, 10.4
 */
export function validateGossipConfig(config: GossipConfig): boolean {
  // Validate base fanout is a positive integer
  if (!Number.isInteger(config.fanout) || config.fanout < 1) {
    return false;
  }

  // Validate base defaultTtl is a positive integer
  if (!Number.isInteger(config.defaultTtl) || config.defaultTtl < 1) {
    return false;
  }

  // Validate messagePriority.normal.fanout is a positive integer
  if (
    !Number.isInteger(config.messagePriority.normal.fanout) ||
    config.messagePriority.normal.fanout < 1
  ) {
    return false;
  }

  // Validate messagePriority.normal.ttl is a positive integer
  if (
    !Number.isInteger(config.messagePriority.normal.ttl) ||
    config.messagePriority.normal.ttl < 1
  ) {
    return false;
  }

  // Validate messagePriority.high.fanout is a positive integer
  if (
    !Number.isInteger(config.messagePriority.high.fanout) ||
    config.messagePriority.high.fanout < 1
  ) {
    return false;
  }

  // Validate messagePriority.high.ttl is a positive integer
  if (
    !Number.isInteger(config.messagePriority.high.ttl) ||
    config.messagePriority.high.ttl < 1
  ) {
    return false;
  }

  return true;
}
