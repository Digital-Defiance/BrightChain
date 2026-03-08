/**
 * OutboundQueue — persistent FIFO queue with concurrency control for
 * outbound email delivery.
 *
 * Wraps an `IOutboundQueueStore` for persistence and enforces a configurable
 * concurrency limit on simultaneous deliveries. The processing loop dequeues
 * items and passes them to a handler callback.
 *
 * On `start()`, the queue resumes processing any previously queued messages
 * that have not exceeded the maximum retry duration (Req 9.2).
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 * @module outboundQueue
 */

import { OutboundDeliveryStatus } from '@brightchain/brightchain-lib';

import type { IEmailGatewayConfig } from './emailGatewayConfig';
import type { IOutboundQueue, IOutboundQueueItem } from './emailGatewayService';
import type { IOutboundQueueStore } from './outboundQueueStore';
import { computeNextAttemptAt, shouldRetry } from './retryBackoff';

/**
 * Callback invoked for each dequeued item. The handler is responsible for
 * performing the actual SMTP delivery (or delegating to a worker).
 *
 * @param item - The dequeued outbound queue item
 * @returns Resolves when the handler has finished processing the item
 */
export type OutboundQueueHandler = (item: IOutboundQueueItem) => Promise<void>;

/**
 * Persistent FIFO outbound email queue with concurrency control.
 *
 * Implements `IOutboundQueue` so the `EmailGatewayService` orchestrator
 * can enqueue messages without knowing about concurrency or persistence
 * internals.
 *
 * @see Requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
export class OutboundQueue implements IOutboundQueue {
  /** Whether the processing loop is active. */
  private running = false;

  /** Number of items currently being processed by the handler. */
  private activeCount = 0;

  /** Handle for the polling interval so we can clear it on stop(). */
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /** Polling interval in milliseconds for the processing loop. */
  private readonly pollIntervalMs: number;

  /**
   * @param store   - Persistence backend for queue items
   * @param config  - Gateway configuration (concurrency, retry settings)
   * @param handler - Callback invoked for each dequeued item
   * @param pollIntervalMs - How often to poll the store for ready items (default: 1000ms)
   */
  constructor(
    private readonly store: IOutboundQueueStore,
    private readonly config: IEmailGatewayConfig,
    private handler?: OutboundQueueHandler,
    pollIntervalMs?: number,
  ) {
    this.pollIntervalMs = pollIntervalMs ?? 1000;
  }

  // ─── Public API ─────────────────────────────────────────────────────

  /**
   * Set or replace the delivery handler callback.
   */
  setHandler(handler: OutboundQueueHandler): void {
    this.handler = handler;
  }

  /**
   * Enqueue a message for outbound delivery.
   *
   * Persists the item to the store. Rejects with an error if the store
   * is unavailable (Req 9.5).
   *
   * @param item - The outbound queue item to enqueue
   * @throws Error if the store is unavailable
   *
   * @see Requirement 9.5
   */
  async enqueue(item: IOutboundQueueItem): Promise<void> {
    try {
      await this.store.enqueue(item);
    } catch (err) {
      throw new Error(
        `Outbound queue store unavailable: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /**
   * Start the processing loop.
   *
   * On startup, resumes processing any previously queued messages that
   * have not exceeded the maximum retry duration (Req 9.2). Then begins
   * polling the store for new items.
   *
   * @see Requirements 9.2, 9.4
   */
  async start(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;

    // Resume: process any items already in the store that are still valid.
    await this.resumeExistingItems();

    // Start the polling loop.
    this.pollTimer = setInterval(() => {
      void this.processAvailable();
    }, this.pollIntervalMs);
  }

  /**
   * Stop the processing loop.
   *
   * Clears the polling timer. In-flight handler invocations are allowed
   * to complete but no new items will be dequeued.
   */
  stop(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Whether the queue processing loop is currently running.
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * The number of items currently being processed (in-flight).
   */
  getActiveCount(): number {
    return this.activeCount;
  }

  /**
   * The current queue depth (delegated to the store).
   */
  async getQueueDepth(): Promise<number> {
    return this.store.getQueueDepth();
  }

  // ─── Internal Processing ────────────────────────────────────────────

  /**
   * Resume processing items that were queued before the last shutdown.
   *
   * Walks the store and expires any items that have exceeded the maximum
   * retry duration, then triggers a processing pass for the rest.
   *
   * @see Requirement 9.2
   */
  private async resumeExistingItems(): Promise<void> {
    // We process available items which will naturally skip expired ones
    // via the dequeue + expiry check in processItem.
    await this.processAvailable();
  }

  /**
   * Dequeue and process items up to the concurrency limit.
   *
   * Each dequeued item is handed to the handler callback. The concurrency
   * limit (Req 9.4) is enforced by tracking `activeCount`.
   */
  private async processAvailable(): Promise<void> {
    if (!this.running || !this.handler) {
      return;
    }

    while (this.activeCount < this.config.queueConcurrency && this.running) {
      const item = await this.store.dequeue();
      if (!item) {
        // No more items ready for processing.
        break;
      }

      // Check if the item has exceeded the max retry duration (Req 9.2).
      if (this.isExpired(item)) {
        await this.store.markFailed(
          item.messageId,
          'Maximum retry duration exceeded',
        );
        continue;
      }

      // Process the item with concurrency tracking.
      this.activeCount++;
      void this.processItem(item).finally(() => {
        this.activeCount--;
      });
    }
  }

  /**
   * Process a single dequeued item by invoking the handler.
   *
   * If the handler throws, the item is checked against retry limits.
   * If eligible for retry, it is requeued with an exponential back-off
   * delay. If limits are exceeded, it is marked as permanently failed.
   *
   * @see Requirements 3.1, 3.3, 3.4
   */
  private async processItem(item: IOutboundQueueItem): Promise<void> {
    if (!this.handler) {
      return;
    }

    try {
      await this.handler(item);
    } catch {
      // Handler failed — check if the item is eligible for retry.
      const nextRetryCount = item.retryCount + 1;
      const retryCandidate = { retryCount: nextRetryCount, enqueuedAt: item.enqueuedAt };

      if (shouldRetry(retryCandidate, this.config)) {
        // Eligible for retry — requeue with back-off delay.
        const nextAttemptAt = computeNextAttemptAt(
          this.config.retryBaseIntervalMs,
          item.retryCount,
        );
        const requeued: IOutboundQueueItem = {
          ...item,
          status: OutboundDeliveryStatus.Queued,
          retryCount: nextRetryCount,
          nextAttemptAt,
        };
        await this.store.requeue(requeued);
      } else {
        // Retry limits exceeded — mark permanently failed (Req 3.4).
        await this.store.markFailed(
          item.messageId,
          `Retry limits exceeded (retryCount=${nextRetryCount}, maxCount=${this.config.retryMaxCount}, maxDuration=${this.config.retryMaxDurationMs}ms)`,
        );
      }
    }
  }

  /**
   * Determine whether a queue item has exceeded the maximum retry duration.
   *
   * @param item - The queue item to check
   * @returns `true` if the item's age exceeds `config.retryMaxDurationMs`
   *
   * @see Requirement 9.2
   */
  private isExpired(item: IOutboundQueueItem): boolean {
    const age = Date.now() - item.enqueuedAt.getTime();
    return age > this.config.retryMaxDurationMs;
  }
}
