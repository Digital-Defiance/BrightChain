/**
 * GossipRetryService - Manages retry logic for unacknowledged message deliveries.
 *
 * Tracks pending deliveries, handles acknowledgments, and retries unacknowledged
 * messages with exponential backoff. When max retries are exhausted, marks
 * unacknowledged recipients as Failed and emits MESSAGE_FAILED events.
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */

import {
  DeliveryStatus,
  validateTransition,
} from '../../enumerations/messaging/deliveryStatus';
import {
  DeliveryAckMetadata,
  IGossipService,
  MessageDeliveryMetadata,
} from '../../interfaces/availability/gossipService';
import { IMessageMetadata } from '../../interfaces/messaging/messageMetadata';

/**
 * Minimal event emitter interface for message events.
 *
 * This decouples the retry service from the WebSocket-dependent
 * EventNotificationSystem in brightchain-api-lib.
 */
export interface IMessageEventEmitter {
  emit(
    type:
      | 'message:stored'
      | 'message:received'
      | 'message:delivered'
      | 'message:failed',
    metadata: IMessageMetadata,
  ): void;
}

/**
 * Minimal interface for updating delivery status in the metadata store.
 *
 * This decouples the retry service from the full IMessageMetadataStore
 * which uses the DeliveryStatus enum.
 */
export interface IDeliveryStatusStore {
  updateDeliveryStatus(
    messageId: string,
    recipientId: string,
    status: DeliveryStatus,
  ): Promise<void>;
}

/**
 * Configuration for retry behavior.
 *
 * @see Requirements 5.1, 5.2, 5.3
 */
export interface RetryConfig {
  /** Initial timeout before first retry in milliseconds (default: 30000) */
  initialTimeoutMs: number;
  /** Multiplier for exponential backoff (default: 2) */
  backoffMultiplier: number;
  /** Maximum number of retries before marking as failed (default: 5) */
  maxRetries: number;
  /** Maximum backoff delay in milliseconds (default: 240000) */
  maxBackoffMs: number;
}

/**
 * Tracks the state of a pending message delivery including per-recipient status.
 */
export interface PendingDelivery {
  /** The message ID being tracked */
  messageId: string;
  /** Block IDs containing the message content */
  blockIds: string[];
  /** The original delivery metadata for re-announcement */
  metadata: MessageDeliveryMetadata;
  /** Per-recipient delivery status */
  recipientStatuses: Map<string, DeliveryStatus>;
  /** Number of retry attempts made */
  retryCount: number;
  /** When the next retry should occur */
  nextRetryAt: Date;
  /** When this delivery was first tracked */
  createdAt: Date;
}

/** Default retry configuration */
const DEFAULT_RETRY_CONFIG: RetryConfig = {
  initialTimeoutMs: 30000,
  backoffMultiplier: 2,
  maxRetries: 5,
  maxBackoffMs: 240000,
};

/** Interval for checking pending retries (1 second) */
const RETRY_CHECK_INTERVAL_MS = 1000;

/**
 * Service that manages retry logic for gossip-based message delivery.
 *
 * Tracks pending deliveries, processes acknowledgments, and automatically
 * retries unacknowledged messages with exponential backoff.
 *
 * @example
 * ```typescript
 * const retryService = new GossipRetryService(gossipService, metadataStore, eventSystem);
 * retryService.start();
 *
 * // Track a new delivery
 * retryService.trackDelivery(messageId, blockIds, metadata);
 *
 * // Handle incoming acks
 * retryService.handleAck(ackMetadata);
 *
 * // Stop when done
 * retryService.stop();
 * ```
 *
 * @see Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 */
export class GossipRetryService {
  private readonly config: RetryConfig;
  private readonly pendingDeliveries: Map<string, PendingDelivery> = new Map();
  private retryTimer: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly gossipService: IGossipService,
    private readonly metadataStore: IDeliveryStatusStore,
    private readonly eventSystem: IMessageEventEmitter,
    config?: Partial<RetryConfig>,
  ) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  /**
   * Register a new pending delivery for tracking.
   *
   * Sets all recipients to Announced status and calculates the first retry time
   * based on the configured initial timeout.
   *
   * @param messageId - The message ID to track
   * @param blockIds - Block IDs containing the message content
   * @param metadata - The delivery metadata for re-announcement
   *
   * @see Requirement 5.1
   */
  trackDelivery(
    messageId: string,
    blockIds: string[],
    metadata: MessageDeliveryMetadata,
  ): void {
    const recipientStatuses = new Map<string, DeliveryStatus>();
    for (const recipientId of metadata.recipientIds) {
      recipientStatuses.set(recipientId, DeliveryStatus.Announced);
    }

    const now = new Date();
    const pending: PendingDelivery = {
      messageId,
      blockIds,
      metadata,
      recipientStatuses,
      retryCount: 0,
      nextRetryAt: new Date(now.getTime() + this.config.initialTimeoutMs),
      createdAt: now,
    };

    this.pendingDeliveries.set(messageId, pending);
  }

  /**
   * Handle a delivery acknowledgment from a recipient.
   *
   * Updates the recipient's delivery status. If all recipients have been
   * delivered (or read), emits MESSAGE_DELIVERED and removes from tracking.
   *
   * @param ack - The delivery acknowledgment metadata
   *
   * @see Requirements 4.4, 4.5
   */
  handleAck(ack: DeliveryAckMetadata): void {
    const pending = this.pendingDeliveries.get(ack.messageId);
    if (!pending) {
      return;
    }

    const currentStatus = pending.recipientStatuses.get(ack.recipientId);
    if (currentStatus === undefined) {
      return;
    }

    // Map ack status to DeliveryStatus
    const newStatus = this.mapAckStatusToDeliveryStatus(ack.status);

    // Validate the state transition
    if (!validateTransition(currentStatus, newStatus)) {
      return;
    }

    // Update the recipient status
    pending.recipientStatuses.set(ack.recipientId, newStatus);

    // Update the metadata store
    this.metadataStore
      .updateDeliveryStatus(ack.messageId, ack.recipientId, newStatus)
      .catch(() => {
        // Log error but don't throw - the in-memory state is already updated
      });

    // Check if all recipients are in a terminal delivered/read state
    if (this.isFullyDelivered(pending)) {
      this.emitMessageDelivered(pending);
      this.pendingDeliveries.delete(ack.messageId);
    }
  }

  /**
   * Start the periodic retry timer.
   *
   * The timer checks for pending deliveries that need retry at regular intervals.
   *
   * @see Requirement 5.1
   */
  start(): void {
    if (this.retryTimer !== null) {
      return;
    }
    this.retryTimer = setInterval(() => {
      this.checkRetries();
    }, RETRY_CHECK_INTERVAL_MS);
  }

  /**
   * Stop the periodic retry timer.
   */
  stop(): void {
    if (this.retryTimer !== null) {
      clearInterval(this.retryTimer);
      this.retryTimer = null;
    }
  }

  /**
   * Check all pending deliveries and retry or fail as needed.
   *
   * This method is public to allow direct invocation in tests without
   * relying on real timers.
   *
   * @see Requirements 5.1, 5.2, 5.4, 5.5
   */
  checkRetries(): void {
    const now = new Date();

    for (const [messageId, pending] of this.pendingDeliveries.entries()) {
      // Skip if not yet time to retry
      if (now < pending.nextRetryAt) {
        continue;
      }

      // Check if max retries exhausted
      if (pending.retryCount >= this.config.maxRetries) {
        this.handleMaxRetriesExhausted(messageId, pending);
        continue;
      }

      // Re-announce the message
      this.gossipService
        .announceMessage(pending.blockIds, pending.metadata)
        .catch(() => {
          // Log error but continue - will retry on next check
        });

      // Increment retry count and calculate next backoff
      pending.retryCount++;
      const backoffMs = this.calculateBackoff(pending.retryCount);
      pending.nextRetryAt = new Date(now.getTime() + backoffMs);
    }
  }

  /**
   * Get a pending delivery by message ID (for testing/inspection).
   */
  getPendingDelivery(messageId: string): PendingDelivery | undefined {
    return this.pendingDeliveries.get(messageId);
  }

  /**
   * Get the count of pending deliveries (for testing/inspection).
   */
  getPendingCount(): number {
    return this.pendingDeliveries.size;
  }

  /**
   * Get the current retry configuration.
   */
  getConfig(): RetryConfig {
    return { ...this.config };
  }

  /**
   * Calculate the backoff delay for a given retry attempt.
   *
   * Uses exponential backoff: initialTimeout * backoffMultiplier^(retryCount-1),
   * capped at maxBackoffMs.
   *
   * Retry schedule with defaults:
   * - Retry 1: 30s
   * - Retry 2: 60s
   * - Retry 3: 120s
   * - Retry 4: 240s
   * - Retry 5: 240s (capped)
   *
   * @param retryCount - The 1-indexed retry attempt number
   * @returns The backoff delay in milliseconds
   *
   * @see Requirement 5.2
   */
  private calculateBackoff(retryCount: number): number {
    const delay =
      this.config.initialTimeoutMs *
      Math.pow(this.config.backoffMultiplier, retryCount - 1);
    return Math.min(delay, this.config.maxBackoffMs);
  }

  /**
   * Handle the case when max retries are exhausted for a delivery.
   *
   * Marks all unacknowledged recipients as Failed and emits MESSAGE_FAILED.
   *
   * @see Requirements 5.4, 5.5
   */
  private handleMaxRetriesExhausted(
    messageId: string,
    pending: PendingDelivery,
  ): void {
    // Mark all unacked recipients as Failed
    for (const [recipientId, status] of pending.recipientStatuses.entries()) {
      if (
        status === DeliveryStatus.Announced ||
        status === DeliveryStatus.Pending
      ) {
        pending.recipientStatuses.set(recipientId, DeliveryStatus.Failed);

        this.metadataStore
          .updateDeliveryStatus(messageId, recipientId, DeliveryStatus.Failed)
          .catch(() => {
            // Log error but continue
          });
      }
    }

    // Emit MESSAGE_FAILED event
    this.emitMessageFailed(pending);

    // Remove from tracking
    this.pendingDeliveries.delete(messageId);
  }

  /**
   * Check if all recipients have been delivered or read.
   */
  private isFullyDelivered(pending: PendingDelivery): boolean {
    for (const status of pending.recipientStatuses.values()) {
      if (
        status !== DeliveryStatus.Delivered &&
        status !== DeliveryStatus.Read
      ) {
        return false;
      }
    }
    return true;
  }

  /**
   * Map an ack status string to a DeliveryStatus enum value.
   */
  private mapAckStatusToDeliveryStatus(
    ackStatus: 'delivered' | 'read' | 'failed' | 'bounced',
  ): DeliveryStatus {
    switch (ackStatus) {
      case 'delivered':
        return DeliveryStatus.Delivered;
      case 'read':
        return DeliveryStatus.Read;
      case 'failed':
        return DeliveryStatus.Failed;
      case 'bounced':
        return DeliveryStatus.Bounced;
    }
  }

  /**
   * Emit a MESSAGE_DELIVERED event for a fully delivered message.
   */
  private emitMessageDelivered(pending: PendingDelivery): void {
    const metadata = this.createMessageMetadataForEvent(pending);
    this.eventSystem.emit('message:delivered', metadata);
  }

  /**
   * Emit a MESSAGE_FAILED event for a message that exhausted retries.
   */
  private emitMessageFailed(pending: PendingDelivery): void {
    const metadata = this.createMessageMetadataForEvent(pending);
    this.eventSystem.emit('message:failed', metadata);
  }

  /**
   * Create a minimal IMessageMetadata object for event emission.
   *
   * Since the retry service doesn't have full message metadata,
   * we construct a minimal version with the information we have.
   */
  private createMessageMetadataForEvent(
    pending: PendingDelivery,
  ): IMessageMetadata {
    return {
      blockId: pending.metadata.cblBlockId,
      createdAt: pending.createdAt,
      expiresAt: null,
      durabilityLevel: 0 as never,
      parityBlockIds: [],
      accessCount: 0,
      lastAccessedAt: pending.createdAt,
      replicationStatus: 0 as never,
      targetReplicationFactor: 0,
      replicaNodeIds: [],
      size: 0,
      checksum: '',
      messageType: 'gossip-delivery',
      senderId: pending.metadata.cblBlockId,
      recipients: pending.metadata.recipientIds,
      priority: pending.metadata.priority === 'high' ? 1 : 0,
      deliveryStatus: pending.recipientStatuses as never,
      acknowledgments: new Map(),
      encryptionScheme: 0 as never,
      isCBL: true,
      cblBlockIds: pending.blockIds,
    } as IMessageMetadata;
  }
}
