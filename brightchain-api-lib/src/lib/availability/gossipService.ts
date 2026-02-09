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
  DeliveryAckMetadata,
  GossipConfig,
  IGossipService,
  MessageDeliveryMetadata,
  validateGossipConfig,
} from '@brightchain/brightchain-lib';
import { ECIESService } from '@digitaldefiance/node-ecies-lib';

// Note: DEFAULT_GOSSIP_CONFIG should be imported directly from @brightchain/brightchain-lib by consumers

/**
 * Error thrown when gossip configuration is invalid.
 * Non-positive fanout or TTL values will trigger this error at service initialization.
 *
 * @see Requirements 10.3, 10.4
 */
export class InvalidGossipConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidGossipConfigError';
  }
}

/**
 * Default gossip configuration values (local copy for use in this module).
 */
const defaultGossipConfig: GossipConfig = {
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
 * Optional encrypted payload to send instead of plaintext announcements.
 */
export interface EncryptedBatchPayload {
  /** Base64-encoded ECIES ciphertext */
  encryptedPayload: string;
  /** Node ID of the sender that encrypted this payload */
  senderNodeId: string;
}

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
   * @param encrypted - Optional encrypted payload; when present, announcements should be empty
   */
  sendAnnouncementBatch(
    peerId: string,
    announcements: BlockAnnouncement[],
    encrypted?: EncryptedBatchPayload,
  ): Promise<void>;

  /**
   * Get the ECIES public key for a peer node.
   * Returns null if the peer has not registered a public key.
   */
  getPeerPublicKey(peerId: string): Promise<Buffer | null>;
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
   * Registered announcement handlers (for non-message, non-ack announcements).
   */
  private handlers: Set<AnnouncementHandler> = new Set();

  /**
   * Registered message delivery handlers.
   * Called when a BlockAnnouncement with messageDelivery metadata is received
   * and recipientIds match local users.
   *
   * @see Requirements 3.4, 3.5
   */
  private messageDeliveryHandlers: Set<
    (announcement: BlockAnnouncement) => void
  > = new Set();

  /**
   * Registered delivery ack handlers.
   * Called when a BlockAnnouncement of type 'ack' is received.
   *
   * @see Requirements 4.4
   */
  private deliveryAckHandlers: Set<(announcement: BlockAnnouncement) => void> =
    new Set();

  /**
   * Set of local user IDs on this node.
   * Used to determine if a message delivery announcement targets local users.
   *
   * @see Requirements 3.4, 3.6
   */
  private readonly localUserIds: Set<string>;

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
   * @param localUserIds - Set of local user IDs on this node (defaults to empty set)
   * @param eciesService - Optional ECIES service for encrypting sensitive batches
   * @param localPrivateKey - Optional local node private key (Buffer) for identifying the sender
   * @throws {InvalidGossipConfigError} If configuration contains non-positive fanout or TTL values
   * @see Requirements 10.3, 10.4
   */
  constructor(
    private readonly peerProvider: IPeerProvider,
    private readonly config: GossipConfig = defaultGossipConfig,
    localUserIds?: Set<string>,
    private readonly eciesService?: ECIESService,
    private readonly localPrivateKey?: Buffer,
  ) {
    this.localUserIds = localUserIds ?? new Set();
    if (!validateGossipConfig(config)) {
      throw new InvalidGossipConfigError(
        'Invalid gossip configuration: all fanout and TTL values must be positive integers',
      );
    }
  }

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
   *
   * Dispatches announcements based on their type and metadata:
   * - 'ack' type: dispatches to delivery ack handlers only (Req 4.4)
   * - 'add' with messageDelivery and matching local recipients: triggers message delivery
   *   handlers and auto-sends ack if ackRequired (Req 3.4, 3.5)
   * - 'add' with messageDelivery but no matching local recipients: forwards normally (Req 3.6)
   * - Plain 'add'/'remove' without messageDelivery: notifies general handlers and forwards (backward compat)
   *
   * @param announcement - The received announcement
   * @see Requirements 3.4, 3.5, 3.6, 4.4
   */
  async handleAnnouncement(announcement: BlockAnnouncement): Promise<void> {
    // Case 1: Ack announcements — dispatch to delivery ack handlers only
    if (announcement.type === 'ack') {
      for (const handler of this.deliveryAckHandlers) {
        try {
          handler(announcement);
        } catch {
          // Ignore handler errors to prevent one handler from affecting others
        }
      }
      // Forward ack with decremented TTL
      if (announcement.ttl > 0) {
        const forwardedAnnouncement: BlockAnnouncement = {
          ...announcement,
          ttl: announcement.ttl - 1,
        };
        this.queueAnnouncement(forwardedAnnouncement);
      }
      return;
    }

    // Case 2: Message delivery announcements
    if (announcement.messageDelivery) {
      const matchingLocalRecipients =
        announcement.messageDelivery.recipientIds.filter((id) =>
          this.localUserIds.has(id),
        );

      if (matchingLocalRecipients.length > 0) {
        // Req 3.4: recipientIds match local users — trigger message delivery handlers
        for (const handler of this.messageDeliveryHandlers) {
          try {
            handler(announcement);
          } catch {
            // Ignore handler errors to prevent one handler from affecting others
          }
        }

        // Req 3.5: If ackRequired, automatically send delivery ack for each local recipient
        if (announcement.messageDelivery.ackRequired) {
          for (const recipientId of matchingLocalRecipients) {
            await this.sendDeliveryAck({
              messageId: announcement.messageDelivery.messageId,
              recipientId,
              status: 'delivered',
              originalSenderNode: announcement.nodeId,
            });
          }
        }
        // Do NOT forward — this node is a recipient
        return;
      }

      // Req 3.6: recipientIds don't match any local users — forward normally
      if (announcement.ttl > 0) {
        const forwardedAnnouncement: BlockAnnouncement = {
          ...announcement,
          ttl: announcement.ttl - 1,
        };
        this.queueAnnouncement(forwardedAnnouncement);
      }
      return;
    }

    // Case 3: Plain block announcements (no messageDelivery, not ack) — backward compatible
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
   * Groups announcements by their required fanout (based on message priority)
   * and sends each group to the appropriate number of peers.
   *
   * - Announcements with messageDelivery use priority-based fanout (Req 3.1, 3.2)
   * - Announcements without messageDelivery use default fanout (Req 3.3)
   *
   * @see Requirements 3.1, 3.2, 3.3, 6.6
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

    // Group announcements by their required fanout
    const fanoutGroups = new Map<number, BlockAnnouncement[]>();

    for (const announcement of this.pendingAnnouncements) {
      let fanout: number;

      if (announcement.messageDelivery) {
        // Use priority-based fanout for message announcements
        const priorityConfig =
          this.config.messagePriority[announcement.messageDelivery.priority];
        fanout = priorityConfig.fanout;
      } else {
        // Use default fanout for non-message announcements (Req 3.3)
        fanout = this.config.fanout;
      }

      const group = fanoutGroups.get(fanout);
      if (group) {
        group.push(announcement);
      } else {
        fanoutGroups.set(fanout, [announcement]);
      }
    }

    // Clear pending before sending to avoid duplicates on retry
    this.pendingAnnouncements = [];

    // Send each fanout group to the appropriate number of peers
    const sendPromises: Promise<void>[] = [];

    for (const [fanout, announcements] of fanoutGroups) {
      const selectedPeers = this.selectRandomPeers(connectedPeers, fanout);
      const batches = this.splitIntoBatches(
        announcements,
        this.config.maxBatchSize,
      );

      for (const peerId of selectedPeers) {
        for (const batch of batches) {
          sendPromises.push(
            this.sendBatchToPeer(peerId, batch).catch(() => {
              // Ignore send errors - best effort delivery
            }),
          );
        }
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
   * Check if a batch contains sensitive metadata (messageDelivery or deliveryAck).
   *
   * @param announcements - The announcements to check
   * @returns true if any announcement has messageDelivery or deliveryAck
   * @see Requirements 4.1, 4.2
   */
  private batchContainsSensitiveMetadata(
    announcements: BlockAnnouncement[],
  ): boolean {
    return announcements.some(
      (a) => a.messageDelivery !== undefined || a.deliveryAck !== undefined,
    );
  }

  /**
   * Encrypt a batch of announcements for a specific peer using ECIES.
   * Serializes announcements to JSON, encrypts with the peer's public key,
   * and returns a base64-encoded ciphertext string.
   *
   * @param announcements - The announcements to encrypt
   * @param peerPublicKey - The peer's ECIES public key
   * @returns Base64-encoded ECIES ciphertext
   * @see Requirements 4.1, 4.3
   */
  private async encryptBatchForPeer(
    announcements: BlockAnnouncement[],
    peerPublicKey: Buffer,
  ): Promise<string> {
    if (!this.eciesService) {
      throw new Error('ECIESService is required for encryption');
    }
    const json = JSON.stringify(
      announcements.map((a) => ({
        type: a.type,
        blockId: a.blockId,
        nodeId: a.nodeId,
        ttl: a.ttl,
        ...(a.messageDelivery ? { messageDelivery: a.messageDelivery } : {}),
        ...(a.deliveryAck ? { deliveryAck: a.deliveryAck } : {}),
      })),
    );
    const plaintext = Buffer.from(json, 'utf-8');
    const ciphertext = await this.eciesService.encryptWithLength(
      peerPublicKey,
      plaintext,
    );
    return Buffer.from(ciphertext).toString('base64');
  }

  /**
   * Send a batch to a peer, encrypting if the batch is sensitive and the peer has a public key.
   *
   * - Sensitive batch + peer key available → encrypt and send with encryptedPayload
   * - Sensitive batch + no peer key → send plaintext, log warning (Req 6.1, 6.2)
   * - Non-sensitive batch → send plaintext
   *
   * @param peerId - The peer to send to
   * @param batch - The announcements to send
   * @see Requirements 4.1, 4.2, 6.1, 6.2
   */
  private async sendBatchToPeer(
    peerId: string,
    batch: BlockAnnouncement[],
  ): Promise<void> {
    const isSensitive = this.batchContainsSensitiveMetadata(batch);

    if (isSensitive && this.eciesService) {
      const peerKey = await this.peerProvider.getPeerPublicKey(peerId);

      if (peerKey) {
        // Encrypt and send with encrypted payload
        const encryptedPayload = await this.encryptBatchForPeer(batch, peerKey);
        await this.peerProvider.sendAnnouncementBatch(peerId, [], {
          encryptedPayload,
          senderNodeId: this.peerProvider.getLocalNodeId(),
        });
        return;
      }

      // Sensitive but no peer key — fallback to plaintext with warning
      console.warn(
        `[GossipService] Sending sensitive batch in plaintext to peer ${peerId}: no public key registered`,
      );
    }

    // Non-sensitive or fallback: send plaintext
    await this.peerProvider.sendAnnouncementBatch(peerId, batch);
  }

  /**
   * Clear all pending announcements (for testing).
   */
  clearPending(): void {
    this.pendingAnnouncements = [];
  }

  /**
   * Announce message blocks to the network with message delivery metadata.
   * Creates a BlockAnnouncement for each blockId with priority-based TTL
   * from config and queues them for batch sending.
   *
   * @param blockIds - The block IDs containing the message content
   * @param metadata - Message delivery metadata including recipients, priority, and CBL block ID
   * @see Requirements 3.1, 3.2, 3.3
   */
  async announceMessage(
    blockIds: string[],
    metadata: MessageDeliveryMetadata,
  ): Promise<void> {
    // Determine TTL based on priority (Req 3.1: normal → 5, Req 3.2: high → 7)
    const priorityConfig = this.config.messagePriority[metadata.priority];
    const ttl = priorityConfig.ttl;

    // Create a BlockAnnouncement for each blockId
    for (const blockId of blockIds) {
      const announcement: BlockAnnouncement = {
        type: 'add',
        blockId,
        nodeId: this.peerProvider.getLocalNodeId(),
        timestamp: new Date(),
        ttl,
        messageDelivery: metadata,
      };

      this.queueAnnouncement(announcement);
    }
  }

  /**
   * Send a delivery acknowledgment back through the gossip network.
   * Stub implementation — will be fully implemented in task 4.3.
   *
   * @param _ack - Delivery acknowledgment metadata
   * @see Requirements 4.1
   */
  async sendDeliveryAck(ack: DeliveryAckMetadata): Promise<void> {
    const announcement: BlockAnnouncement = {
      type: 'ack',
      blockId: ack.messageId,
      nodeId: this.peerProvider.getLocalNodeId(),
      timestamp: new Date(),
      ttl: this.config.defaultTtl,
      deliveryAck: ack,
    };

    this.queueAnnouncement(announcement);
  }

  /**
   * Register a handler for message delivery events.
   * The handler is called when a BlockAnnouncement with messageDelivery
   * metadata is received and recipientIds match local users.
   *
   * @param handler - Function to call when a message delivery announcement is received
   * @see Requirements 3.4, 3.5
   */
  onMessageDelivery(handler: (announcement: BlockAnnouncement) => void): void {
    this.messageDeliveryHandlers.add(handler);
  }

  /**
   * Remove a message delivery event handler.
   *
   * @param handler - The handler to remove
   */
  offMessageDelivery(handler: (announcement: BlockAnnouncement) => void): void {
    this.messageDeliveryHandlers.delete(handler);
  }

  /**
   * Register a handler for delivery acknowledgment events.
   * The handler is called when a BlockAnnouncement of type 'ack' is received.
   *
   * @param handler - Function to call when a delivery ack announcement is received
   * @see Requirements 4.4
   */
  onDeliveryAck(handler: (announcement: BlockAnnouncement) => void): void {
    this.deliveryAckHandlers.add(handler);
  }

  /**
   * Remove a delivery acknowledgment event handler.
   *
   * @param handler - The handler to remove
   */
  offDeliveryAck(handler: (announcement: BlockAnnouncement) => void): void {
    this.deliveryAckHandlers.delete(handler);
  }
}
