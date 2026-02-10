/**
 * ExplodingMessageService — self-destructing message logic for BrightChain.
 *
 * Provides time-based and read-count-based message expiration with
 * secure deletion. Messages can be configured to auto-destruct after
 * a specified time or after being read a certain number of times.
 *
 * All methods are stateless and operate on message objects directly.
 * Persistence and scheduling are handled by the caller.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.7
 */

import { CommunicationEventType } from '../../enumerations/communication';
import { ICommunicationMessage } from '../../interfaces/communication';

// ─── Error classes ──────────────────────────────────────────────────────────

export class ExplodingMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExplodingMessageError';
  }
}

export class MessageAlreadyExplodedError extends ExplodingMessageError {
  constructor(messageId: string) {
    super(`Message ${messageId} has already been exploded`);
    this.name = 'MessageAlreadyExplodedError';
  }
}

export class InvalidExpirationError extends ExplodingMessageError {
  constructor(reason: string) {
    super(`Invalid expiration configuration: ${reason}`);
    this.name = 'InvalidExpirationError';
  }
}

// ─── Event types ────────────────────────────────────────────────────────────

/**
 * Event emitted when a message explodes (is permanently deleted).
 */
export interface IExplodingMessageEvent {
  type: CommunicationEventType;
  messageId: string;
  contextId: string;
  contextType: 'conversation' | 'group' | 'channel';
  reason: 'time_expired' | 'read_count_exceeded';
  explodedAt: Date;
}

// ─── Result types ───────────────────────────────────────────────────────────

/**
 * Result of checking expired messages.
 */
export interface IExpiredMessagesResult {
  /** Messages that have expired and should be deleted */
  expired: ICommunicationMessage[];
  /** Events to emit for each expired message */
  events: IExplodingMessageEvent[];
}

// ─── Service ────────────────────────────────────────────────────────────────

/**
 * Service for managing self-destructing (exploding) messages.
 *
 * Supports two expiration modes:
 * - Time-based: message expires after a specified duration
 * - Read-count: message expires after being read N times
 *
 * Both modes can be combined on a single message.
 *
 * @example
 * ```typescript
 * // Set a 5-minute expiration
 * ExplodingMessageService.setExpiration(message, {
 *   expiresInMs: 5 * 60 * 1000,
 * });
 *
 * // Set a read-count limit
 * ExplodingMessageService.setExpiration(message, {
 *   maxReads: 3,
 * });
 *
 * // Mark as read by a member
 * ExplodingMessageService.markRead(message, 'member-123');
 *
 * // Check if expired
 * const shouldExplode = ExplodingMessageService.checkExpiration(message);
 * ```
 */
export class ExplodingMessageService {
  /**
   * Configure expiration settings on a message.
   *
   * @param message     - The message to configure
   * @param options     - Expiration options
   * @param options.expiresAt   - Absolute expiration time
   * @param options.expiresInMs - Relative expiration (milliseconds from now)
   * @param options.maxReads    - Maximum read count before expiration
   * @throws {MessageAlreadyExplodedError} If the message has already exploded
   * @throws {InvalidExpirationError} If no expiration option is provided
   *
   * Requirements: 8.1, 8.2
   */
  static setExpiration(
    message: ICommunicationMessage,
    options: {
      expiresAt?: Date;
      expiresInMs?: number;
      maxReads?: number;
    },
  ): void {
    if (message.exploded) {
      throw new MessageAlreadyExplodedError(String(message.id));
    }

    const hasTimeExpiration =
      options.expiresAt !== undefined || options.expiresInMs !== undefined;
    const hasReadExpiration = options.maxReads !== undefined;

    if (!hasTimeExpiration && !hasReadExpiration) {
      throw new InvalidExpirationError(
        'At least one of expiresAt, expiresInMs, or maxReads must be provided',
      );
    }

    if (options.expiresAt !== undefined) {
      if (options.expiresAt <= new Date()) {
        throw new InvalidExpirationError('expiresAt must be in the future');
      }
      message.expiresAt = options.expiresAt;
    }

    if (options.expiresInMs !== undefined) {
      if (options.expiresInMs <= 0) {
        throw new InvalidExpirationError(
          'expiresInMs must be a positive number',
        );
      }
      message.expiresAt = new Date(Date.now() + options.expiresInMs);
    }

    if (options.maxReads !== undefined) {
      if (options.maxReads < 1 || !Number.isInteger(options.maxReads)) {
        throw new InvalidExpirationError('maxReads must be a positive integer');
      }
      message.maxReads = options.maxReads;
      if (message.readCount === undefined) {
        message.readCount = 0;
      }
      if (message.readBy === undefined) {
        message.readBy = new Map();
      }
    }
  }

  /**
   * Record that a member has read a message.
   *
   * Increments the read count and records the member's read timestamp.
   * If the member has already read the message, this is a no-op for
   * the read count but updates the timestamp.
   *
   * @param message  - The message to mark as read
   * @param memberId - The ID of the member who read the message
   * @returns `true` if the message should now be exploded (read count exceeded)
   * @throws {MessageAlreadyExplodedError} If the message has already exploded
   *
   * Requirements: 8.2, 8.3
   */
  static markRead(message: ICommunicationMessage, memberId: string): boolean {
    if (message.exploded) {
      throw new MessageAlreadyExplodedError(String(message.id));
    }

    if (!message.readBy) {
      message.readBy = new Map();
    }

    const isFirstRead = !message.readBy.has(memberId);

    message.readBy.set(memberId, new Date());

    if (isFirstRead && message.readCount !== undefined) {
      message.readCount++;
    }

    // Check if read count exceeded
    if (
      message.maxReads !== undefined &&
      message.readCount !== undefined &&
      message.readCount >= message.maxReads
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check whether a message has expired based on its expiration settings.
   *
   * Checks both time-based and read-count-based expiration.
   *
   * @param message - The message to check
   * @param now     - Optional current time (defaults to Date.now())
   * @returns The reason for expiration, or `null` if not expired
   *
   * Requirements: 8.1, 8.2, 8.4
   */
  static checkExpiration(
    message: ICommunicationMessage,
    now?: Date,
  ): 'time_expired' | 'read_count_exceeded' | null {
    if (message.exploded) {
      return null; // Already handled
    }

    const currentTime = now ?? new Date();

    // Check time-based expiration
    if (message.expiresAt && currentTime >= message.expiresAt) {
      return 'time_expired';
    }

    // Check read-count expiration
    if (
      message.maxReads !== undefined &&
      message.readCount !== undefined &&
      message.readCount >= message.maxReads
    ) {
      return 'read_count_exceeded';
    }

    return null;
  }

  /**
   * Explode (permanently delete) a message.
   *
   * Clears the encrypted content and marks the message as exploded.
   * The message metadata is preserved for audit purposes.
   *
   * @param message - The message to explode
   * @returns The explosion event
   * @throws {MessageAlreadyExplodedError} If the message has already exploded
   *
   * Requirements: 8.4, 8.7
   */
  static explode(message: ICommunicationMessage): IExplodingMessageEvent {
    if (message.exploded) {
      throw new MessageAlreadyExplodedError(String(message.id));
    }

    const reason = ExplodingMessageService.checkExpiration(message);

    // Clear sensitive content
    message.encryptedContent = '';
    message.editHistory = [];
    message.exploded = true;
    message.explodedAt = new Date();

    return {
      type: CommunicationEventType.MESSAGE_EXPLODED,
      messageId: String(message.id),
      contextId: String(message.contextId),
      contextType: message.contextType,
      reason: reason ?? 'time_expired',
      explodedAt: message.explodedAt,
    };
  }

  /**
   * Scan a collection of messages and find all that have expired.
   *
   * Returns the expired messages and the events to emit for each.
   * Does NOT modify the messages — call {@link explode} on each
   * returned message to actually delete them.
   *
   * @param messages - The messages to scan
   * @param now      - Optional current time (defaults to Date.now())
   * @returns The expired messages and their events
   *
   * Requirements: 8.4
   */
  static deleteExpired(
    messages: ReadonlyArray<ICommunicationMessage>,
    now?: Date,
  ): IExpiredMessagesResult {
    const expired: ICommunicationMessage[] = [];
    const events: IExplodingMessageEvent[] = [];
    const currentTime = now ?? new Date();

    for (const message of messages) {
      if (message.exploded) continue;

      const reason = ExplodingMessageService.checkExpiration(
        message,
        currentTime,
      );
      if (reason) {
        expired.push(message);
        events.push({
          type:
            reason === 'time_expired'
              ? CommunicationEventType.MESSAGE_EXPIRED
              : CommunicationEventType.MESSAGE_READ_COUNT_EXCEEDED,
          messageId: String(message.id),
          contextId: String(message.contextId),
          contextType: message.contextType,
          reason,
          explodedAt: currentTime,
        });
      }
    }

    return { expired, events };
  }

  /**
   * Check if a message is an exploding message (has any expiration configured).
   *
   * @param message - The message to check
   * @returns `true` if the message has expiration settings
   */
  static isExplodingMessage(message: ICommunicationMessage): boolean {
    return message.expiresAt !== undefined || message.maxReads !== undefined;
  }

  /**
   * Get the remaining time until a message expires (in milliseconds).
   *
   * @param message - The message to check
   * @param now     - Optional current time
   * @returns Remaining time in ms, or `null` if no time-based expiration
   */
  static getRemainingTime(
    message: ICommunicationMessage,
    now?: Date,
  ): number | null {
    if (!message.expiresAt) return null;
    if (message.exploded) return 0;

    const currentTime = now ?? new Date();
    const remaining = message.expiresAt.getTime() - currentTime.getTime();
    return Math.max(0, remaining);
  }

  /**
   * Get the remaining reads before a message expires.
   *
   * @param message - The message to check
   * @returns Remaining reads, or `null` if no read-count expiration
   */
  static getRemainingReads(message: ICommunicationMessage): number | null {
    if (message.maxReads === undefined) return null;
    if (message.exploded) return 0;

    const readCount = message.readCount ?? 0;
    return Math.max(0, message.maxReads - readCount);
  }
}
