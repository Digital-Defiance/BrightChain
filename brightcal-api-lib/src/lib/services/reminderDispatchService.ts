/**
 * ReminderDispatchService
 *
 * Periodically polls the `calendar_reminders` collection for due reminders
 * (triggerAt ≤ now, delivered = false) and dispatches them via the
 * appropriate channel:
 *
 *  - `email`  → `ItipMailDeliveryService.sendEmailReminder()`
 *  - `push`   → (placeholder) real-time push via `NotificationDispatcher`
 *
 * Usage
 * ─────
 * Create one instance per process and call `start(intervalMs)`.
 * Call `stop()` on process shutdown to clear the interval.
 *
 *   const dispatcher = new ReminderDispatchService(
 *     reminderModel, eventModel, itipDelivery, notificationDispatcher
 *   );
 *   dispatcher.start(60_000); // poll every minute
 *
 * @see Requirements 14.1, 14.2, 14.3
 */

import type { Model } from '@brightchain/db';
import type {
  IStoredCalendarEvent,
  ITypedCalendarEvent,
} from '../models/calendarEvent.model.js';
import type {
  IStoredCalendarReminder,
  ITypedCalendarReminder,
} from '../models/calendarReminder.model.js';
import type { ItipMailDeliveryService } from './itipMailDeliveryService.js';
import type { IWebSocketDispatcher } from './notificationDispatcher.js';

// ─── Service ──────────────────────────────────────────────────────────────────

export class ReminderDispatchService {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(
    private readonly reminderModel: Model<
      IStoredCalendarReminder,
      ITypedCalendarReminder
    >,
    private readonly eventModel: Model<
      IStoredCalendarEvent,
      ITypedCalendarEvent
    >,
    private readonly mailDelivery: ItipMailDeliveryService,
    /** Optional push dispatcher; email-only setups may omit this. */
    private readonly pushDispatcher?: IWebSocketDispatcher,
  ) {}

  /**
   * Start polling for due reminders.
   *
   * @param intervalMs Polling interval in milliseconds (default 60 s).
   */
  start(intervalMs = 60_000): void {
    if (this.intervalHandle !== null) return; // already running
    this.intervalHandle = setInterval(() => {
      void this.processDueReminders();
    }, intervalMs);
  }

  /** Stop the polling interval. */
  stop(): void {
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  /**
   * Process all reminders whose triggerAt is in the past and have not yet
   * been delivered. Called automatically by the polling interval but can
   * also be called manually in tests.
   *
   * @returns The number of reminders that were processed.
   */
  async processDueReminders(): Promise<number> {
    const now = new Date();

    const due = await this.reminderModel.find({
      triggerAt: { $lte: now.toISOString() },
      delivered: false,
    }).toArray();

    let processed = 0;

    for (const reminder of due) {
      try {
        await this.dispatchReminder(reminder);
        await this.reminderModel.updateOne(
          { _id: reminder.id },
          { delivered: true },
        );
        processed++;
      } catch {
        // Log and continue — we'll retry on the next poll cycle.
        // A production implementation would add a back-off / max-retries field.
      }
    }

    return processed;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async dispatchReminder(
    reminder: ITypedCalendarReminder,
  ): Promise<void> {
    const event = await this.eventModel.findById(reminder.eventId);

    for (const channel of reminder.channels) {
      if (channel === 'email') {
        await this.dispatchEmailReminder(reminder, event ?? null);
      } else if (channel === 'push') {
        this.dispatchPushReminder(reminder, event ?? null);
      }
    }
  }

  private async dispatchEmailReminder(
    reminder: ITypedCalendarReminder,
    event: ITypedCalendarEvent | null,
  ): Promise<void> {
    if (!event) return;

    // The email reminder is sent to the calendar owner (userId on the reminder).
    // We use a placeholder "email = userId" convention; the real lookup (user
    // profile → email address) belongs in the application layer above this
    // service and can be injected via a resolver function in a future iteration.
    const recipientEmail = reminder.userId;

    await this.mailDelivery.sendEmailReminder(
      {
        action: 'EMAIL',
        triggerMinutesBefore: Math.round(
          (event.dtstart.getTime() - reminder.triggerAt.getTime()) / 60_000,
        ),
      },
      event.summary,
      event.dtstart.toISOString(),
      recipientEmail,
    );
  }

  private dispatchPushReminder(
    reminder: ITypedCalendarReminder,
    event: ITypedCalendarEvent | null,
  ): void {
    if (!this.pushDispatcher || !event) return;

    this.pushDispatcher.sendToUser(reminder.userId, 'REMINDER', {
      eventId: event.id,
      summary: event.summary,
      dtstart: event.dtstart.toISOString(),
    });
  }
}
