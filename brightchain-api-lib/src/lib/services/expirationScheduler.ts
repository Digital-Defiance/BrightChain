/**
 * ExpirationScheduler — Background job for cleaning up expired messages.
 *
 * Periodically scans messages for time-based and read-count-based
 * expiration, explodes expired messages, and emits events for
 * downstream consumers (e.g., WebSocket notifications).
 *
 * This is a Node.js-specific service that lives in brightchain-api-lib.
 *
 * Requirements: 8.4, 8.6, 8.9
 */

import { ICommunicationMessage } from '@brightchain/brightchain-lib/lib/interfaces/communication';
import {
  ExplodingMessageService,
  IExplodingMessageEvent,
} from '@brightchain/brightchain-lib/lib/services/communication/explodingMessageService';
import { EventEmitter } from 'events';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Function that returns all messages that may have expiration settings.
 * The scheduler calls this on each tick to get the current message set.
 */
export type MessageProvider = () =>
  | ICommunicationMessage[]
  | Promise<ICommunicationMessage[]>;

/**
 * Configuration for the expiration scheduler.
 */
export interface IExpirationSchedulerConfig {
  /** Interval between cleanup runs in milliseconds (default: 10_000) */
  intervalMs?: number;

  /** Whether to auto-explode messages or just emit events (default: true) */
  autoExplode?: boolean;
}

// ─── Events ─────────────────────────────────────────────────────────────────

export enum ExpirationSchedulerEvent {
  /** Emitted when a message is exploded by the scheduler */
  MESSAGE_EXPLODED = 'scheduler:message_exploded',

  /** Emitted when a batch of expired messages is found */
  BATCH_EXPIRED = 'scheduler:batch_expired',

  /** Emitted when the scheduler encounters an error */
  ERROR = 'scheduler:error',

  /** Emitted when the scheduler starts */
  STARTED = 'scheduler:started',

  /** Emitted when the scheduler stops */
  STOPPED = 'scheduler:stopped',
}

// ─── Scheduler ──────────────────────────────────────────────────────────────

/**
 * Background scheduler that periodically checks for and cleans up
 * expired exploding messages.
 *
 * @example
 * ```typescript
 * const scheduler = new ExpirationScheduler(
 *   () => messageStore.getAllExplodingMessages(),
 *   { intervalMs: 5000 },
 * );
 *
 * scheduler.on(ExpirationSchedulerEvent.MESSAGE_EXPLODED, (event) => {
 *   console.log(`Message ${event.messageId} exploded`);
 * });
 *
 * scheduler.start();
 * // ... later
 * scheduler.stop();
 * ```
 */
export class ExpirationScheduler extends EventEmitter {
  private readonly messageProvider: MessageProvider;
  private readonly intervalMs: number;
  private readonly autoExplode: boolean;
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  constructor(
    messageProvider: MessageProvider,
    config: IExpirationSchedulerConfig = {},
  ) {
    super();
    this.messageProvider = messageProvider;
    this.intervalMs = config.intervalMs ?? 10_000;
    this.autoExplode = config.autoExplode ?? true;
  }

  /**
   * Start the scheduler. Begins periodic cleanup runs.
   *
   * @throws {Error} If the scheduler is already running
   */
  start(): void {
    if (this.running) {
      throw new Error('ExpirationScheduler is already running');
    }

    this.running = true;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);

    this.emit(ExpirationSchedulerEvent.STARTED);
  }

  /**
   * Stop the scheduler. Cancels the periodic cleanup timer.
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.running = false;
    this.emit(ExpirationSchedulerEvent.STOPPED);
  }

  /**
   * Whether the scheduler is currently running.
   */
  get isRunning(): boolean {
    return this.running;
  }

  /**
   * Run a single cleanup tick manually.
   * Useful for testing or on-demand cleanup.
   *
   * @returns The events generated during this tick
   */
  async tick(): Promise<IExplodingMessageEvent[]> {
    try {
      const messages = await this.messageProvider();
      const { expired, events } =
        ExplodingMessageService.deleteExpired(messages);

      if (expired.length === 0) {
        return [];
      }

      // Explode each expired message
      const explodedEvents: IExplodingMessageEvent[] = [];
      if (this.autoExplode) {
        for (const message of expired) {
          if (!message.exploded) {
            const event = ExplodingMessageService.explode(message);
            explodedEvents.push(event);
            this.emit(ExpirationSchedulerEvent.MESSAGE_EXPLODED, event);
          }
        }
      }

      // Emit batch event
      this.emit(ExpirationSchedulerEvent.BATCH_EXPIRED, {
        count: expired.length,
        events: explodedEvents.length > 0 ? explodedEvents : events,
      });

      return explodedEvents.length > 0 ? explodedEvents : events;
    } catch (error) {
      this.emit(ExpirationSchedulerEvent.ERROR, error);
      return [];
    }
  }
}
