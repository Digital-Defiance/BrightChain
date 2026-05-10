/**
 * Notification Dispatcher
 *
 * Connects CalendarNotificationService to a WebSocket dispatch interface
 * for real-time push notifications. Polls the in-memory real-time queue
 * and dispatches notifications to connected user sessions.
 *
 * Supported event types:
 * - invitation: New event invitation received
 * - rsvp: Attendee RSVP response
 * - update: Event modified by organizer
 * - cancel: Event cancelled
 * - reminder: Upcoming event reminder
 *
 * @see Requirements 14.6, 14.7
 */

import type { CalendarNotificationService } from './calendarNotificationService.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Supported calendar notification event types for WebSocket delivery. */
export type CalendarNotificationType =
  | 'invitation'
  | 'rsvp'
  | 'update'
  | 'cancel'
  | 'reminder';

/** Valid notification types as a readonly array for runtime checks. */
const VALID_NOTIFICATION_TYPES: readonly CalendarNotificationType[] = [
  'invitation',
  'rsvp',
  'update',
  'cancel',
  'reminder',
] as const;

/**
 * Interface for dispatching messages to connected WebSocket clients.
 * In production, this wraps ClientWebSocketServer.
 *
 * @requirements 14.6, 14.7
 */
export interface IWebSocketDispatcher {
  sendToUser(userId: string, type: string, payload: unknown): void;
}

// ─── Dispatcher ──────────────────────────────────────────────────────────────

/**
 * NotificationDispatcher bridges the CalendarNotificationService's
 * real-time notification queue to connected WebSocket clients.
 *
 * Usage:
 * ```typescript
 * const dispatcher = new NotificationDispatcher(
 *   notificationService,
 *   { sendToUser: (userId, type, payload) => wsServer.sendToUser(userId, { type, payload }) },
 * );
 *
 * // Call periodically or after operations that generate notifications
 * const count = dispatcher.dispatchPending();
 * ```
 *
 * @requirements 14.6, 14.7
 */
export class NotificationDispatcher {
  private readonly notificationService: CalendarNotificationService;
  private readonly wsDispatcher: IWebSocketDispatcher;
  constructor(
    notificationService: CalendarNotificationService,
    wsDispatcher: IWebSocketDispatcher,
  ) {
    this.notificationService = notificationService;
    this.wsDispatcher = wsDispatcher;
  }

  /**
   * Poll the notification service's real-time queue and dispatch all
   * pending notifications to connected WebSocket clients.
   *
   * Only dispatches notifications with recognized calendar event types.
   * After dispatching, the queue is cleared.
   *
   * @returns The number of notifications dispatched
   *
   * @requirements 14.6, 14.7
   */
  dispatchPending(): number {
    const pending = this.notificationService.getRealTimeQueue();

    if (pending.length === 0) {
      return 0;
    }

    let dispatched = 0;

    for (const notification of pending) {
      if (this.isValidType(notification.type)) {
        this.wsDispatcher.sendToUser(
          notification.userId,
          notification.type,
          notification.payload,
        );
        dispatched++;
      }
    }

    // Clear the queue after processing
    this.notificationService.clearRealTimeQueue();

    return dispatched;
  }

  /**
   * Check if a notification type is a supported calendar notification type.
   */
  private isValidType(type: string): type is CalendarNotificationType {
    return VALID_NOTIFICATION_TYPES.includes(type as CalendarNotificationType);
  }
}
