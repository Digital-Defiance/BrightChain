/**
 * Outbound Queue Store — persistence interface and in-memory implementation
 * for the outbound email delivery queue.
 *
 * The `IOutboundQueueStore` interface defines the contract for queue persistence,
 * allowing different backends (in-memory for testing, database/filesystem for
 * production) to be swapped without changing the queue logic.
 *
 * The `InMemoryOutboundQueueStore` provides a FIFO-ordered, Map-backed
 * implementation suitable for unit/integration testing.
 *
 * @see Requirements 9.1, 9.3, 9.4
 * @module outboundQueueStore
 */

import { OutboundDeliveryStatus } from '@brightchain/brightchain-lib';

import type { IOutboundQueueItem } from './emailGatewayService';

/**
 * Persistence interface for the outbound email delivery queue.
 *
 * Implementations must maintain FIFO ordering (Req 9.3) and support
 * concurrent access patterns (Req 9.4). The store is responsible only
 * for persistence — concurrency limiting and processing loops are
 * handled by the `OutboundQueue` class (task 4.2).
 *
 * @see Requirements 9.1, 9.3, 9.4
 */
export interface IOutboundQueueStore {
  /**
   * Add a message to the end of the queue.
   *
   * @param item - The outbound queue item to enqueue
   * @throws If the store is unavailable (Req 9.5)
   */
  enqueue(item: IOutboundQueueItem): Promise<void>;

  /**
   * Remove and return the next item from the front of the queue
   * that is in `Queued` status and ready for delivery.
   *
   * @returns The next queue item, or `undefined` if the queue is empty
   *          or no items are ready
   */
  dequeue(): Promise<IOutboundQueueItem | undefined>;

  /**
   * Return the next item from the front of the queue without removing it.
   *
   * @returns The next queue item, or `undefined` if the queue is empty
   */
  peek(): Promise<IOutboundQueueItem | undefined>;

  /**
   * Mark a message as successfully delivered and remove it from the queue.
   *
   * @param messageId - The RFC 5322 Message-ID of the completed message
   */
  markCompleted(messageId: string): Promise<void>;

  /**
   * Mark a message as permanently failed and remove it from the active queue.
   *
   * @param messageId - The RFC 5322 Message-ID of the failed message
   * @param reason - Human-readable failure reason
   */
  markFailed(messageId: string, reason: string): Promise<void>;

  /**
   * Re-enqueue a message for retry with updated retry count and status.
   *
   * The item is placed at the end of the queue to maintain FIFO fairness
   * among messages at the same priority level (Req 9.3).
   *
   * @param item - The updated queue item with incremented retryCount
   */
  requeue(item: IOutboundQueueItem): Promise<void>;

  /**
   * Return the current number of items in the queue.
   *
   * @returns The queue depth (number of pending items)
   */
  getQueueDepth(): Promise<number>;

  /**
   * Retrieve a queue item by its Message-ID.
   *
   * @param messageId - The RFC 5322 Message-ID to look up
   * @returns The queue item, or `undefined` if not found
   */
  getByMessageId(messageId: string): Promise<IOutboundQueueItem | undefined>;
}

/**
 * In-memory implementation of `IOutboundQueueStore` for testing.
 *
 * Uses a `Map` keyed by messageId for O(1) lookups and an insertion-ordered
 * array (`queue`) to maintain strict FIFO ordering (Req 9.3).
 *
 * This implementation is NOT suitable for production — it does not survive
 * process restarts (Req 9.1 requires durable storage). Use a database-backed
 * or filesystem-backed implementation for production deployments.
 *
 * @see Requirements 9.1, 9.3, 9.4
 */
export class InMemoryOutboundQueueStore implements IOutboundQueueStore {
  /** Ordered list of message IDs representing FIFO queue order. */
  private readonly queue: string[] = [];

  /** Map from messageId → queue item for O(1) lookups. */
  private readonly items: Map<string, IOutboundQueueItem> = new Map();

  async enqueue(item: IOutboundQueueItem): Promise<void> {
    // If an item with the same messageId already exists, replace it
    // (this can happen on requeue after status update).
    if (!this.items.has(item.messageId)) {
      this.queue.push(item.messageId);
    }
    this.items.set(item.messageId, { ...item });
  }

  async dequeue(): Promise<IOutboundQueueItem | undefined> {
    // Walk the queue front-to-back to find the first item in Queued status
    // that is ready for processing (nextAttemptAt <= now or not set).
    const now = Date.now();
    for (let i = 0; i < this.queue.length; i++) {
      const messageId = this.queue[i];
      const item = this.items.get(messageId);

      if (!item) {
        // Stale entry — item was removed (markCompleted/markFailed).
        this.queue.splice(i, 1);
        i--;
        continue;
      }

      if (item.status !== OutboundDeliveryStatus.Queued) {
        // Item exists but is not in Queued status — remove stale entry.
        this.queue.splice(i, 1);
        i--;
        continue;
      }

      // Respect nextAttemptAt: skip items that are not yet ready.
      if (item.nextAttemptAt && item.nextAttemptAt.getTime() > now) {
        continue;
      }

      // Item is ready — remove from queue and return.
      this.queue.splice(i, 1);
      this.items.delete(messageId);
      return { ...item };
    }

    return undefined;
  }

  async peek(): Promise<IOutboundQueueItem | undefined> {
    // Walk the queue front-to-back to find the first item in Queued status.
    for (const messageId of this.queue) {
      const item = this.items.get(messageId);
      if (item && item.status === OutboundDeliveryStatus.Queued) {
        return { ...item };
      }
    }
    return undefined;
  }

  async markCompleted(messageId: string): Promise<void> {
    const item = this.items.get(messageId);
    if (item) {
      item.status = OutboundDeliveryStatus.Delivered;
      this.items.delete(messageId);
      const idx = this.queue.indexOf(messageId);
      if (idx !== -1) {
        this.queue.splice(idx, 1);
      }
    }
  }

  async markFailed(messageId: string, _reason: string): Promise<void> {
    const item = this.items.get(messageId);
    if (item) {
      item.status = OutboundDeliveryStatus.PermanentFailure;
      this.items.delete(messageId);
      const idx = this.queue.indexOf(messageId);
      if (idx !== -1) {
        this.queue.splice(idx, 1);
      }
    }
  }

  async requeue(item: IOutboundQueueItem): Promise<void> {
    // Remove old position if present, then append to end for FIFO fairness.
    const existingIdx = this.queue.indexOf(item.messageId);
    if (existingIdx !== -1) {
      this.queue.splice(existingIdx, 1);
    }
    this.queue.push(item.messageId);
    this.items.set(item.messageId, { ...item });
  }

  async getQueueDepth(): Promise<number> {
    // Count only items that are still in the items map (not stale references).
    let count = 0;
    for (const messageId of this.queue) {
      if (this.items.has(messageId)) {
        count++;
      }
    }
    return count;
  }

  async getByMessageId(
    messageId: string,
  ): Promise<IOutboundQueueItem | undefined> {
    const item = this.items.get(messageId);
    return item ? { ...item } : undefined;
  }
}
