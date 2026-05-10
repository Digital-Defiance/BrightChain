/**
 * WebSocket Notification Bridge
 *
 * Bridges the CalendarNotificationService's real-time notification queue
 * to connected WebSocket clients. Polls the in-memory queue and dispatches
 * notifications to the appropriate user sessions.
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

import type {
  CalendarNotificationService,
  IRealTimeNotification,
} from '../services/calendarNotificationService.js';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Supported calendar notification event types for WebSocket delivery. */
export type CalendarNotificationType =
  | 'invitation'
  | 'rsvp'
  | 'update'
  | 'cancel'
  | 'reminder';

/** Callback invoked for each notification dispatched. */
export type NotificationDispatcher = (
  userId: string,
  type: string,
  payload: unknown,
) => void;

// ─── Bridge ──────────────────────────────────────────────────────────────────

/**
 * WebSocketNotificationBridge connects the CalendarNotificationService's
 * in-memory real-time queue to a WebSocket dispatch mechanism.
 *
 * Usage:
 * ```typescript
 * const bridge = new WebSocketNotificationBridge(notificationService);
 *
 * // Set a dispatcher that sends to your WebSocket server
 * bridge.setDispatcher((userId, type, payload) => {
 *   wsServer.sendToUser(userId, { type, payload });
 * });
 *
 * // Call periodically or after operations
 * bridge.dispatchPending();
 * ```
 *
 * @requirements 14.6, 14.7
 */
export class WebSocketNotificationBridge {
  private dispatcher: NotificationDispatcher | null = null;

  private readonly notificationService: CalendarNotificationService;
  constructor(notificationService: CalendarNotificationService) {
    this.notificationService = notificationService;
  }

  /**
   * Set the dispatcher callback that delivers notifications to WebSocket clients.
   * In production, this would be wired to ClientWebSocketServer.sendToUser().
   *
   * @param dispatcher - Callback receiving (userId, type, payload)
   */
  setDispatcher(dispatcher: NotificationDispatcher): void {
    this.dispatcher = dispatcher;
  }

  /**
   * Poll the notification service's real-time queue and dispatch all
   * pending notifications to connected WebSocket clients.
   *
   * After dispatching, the queue is cleared. Should be called on a timer
   * or after operations that generate notifications.
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
      if (this.isCalendarNotificationType(notification.type)) {
        this.dispatch(notification);
        dispatched++;
      }
    }

    // Clear the queue after processing
    this.notificationService.clearRealTimeQueue();

    return dispatched;
  }

  /**
   * Dispatch a single notification to the configured dispatcher.
   */
  private dispatch(notification: IRealTimeNotification): void {
    if (!this.dispatcher) {
      return;
    }

    this.dispatcher(
      notification.userId,
      notification.type,
      notification.payload,
    );
  }

  /**
   * Check if a notification type is a supported calendar notification type.
   */
  private isCalendarNotificationType(type: string): boolean {
    const validTypes: CalendarNotificationType[] = [
      'invitation',
      'rsvp',
      'update',
      'cancel',
      'reminder',
    ];
    return validTypes.includes(type as CalendarNotificationType);
  }
}
