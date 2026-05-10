/**
 * ItipMailDeliveryService
 *
 * Bridges the calendar layer's in-memory iTIP message queue (produced by
 * CalendarNotificationService) to the BrightMail sending pipeline.
 *
 * Responsibilities
 * ────────────────
 * 1. Drain iTIP messages from CalendarNotificationService.messageQueue.
 * 2. Compose a well-formed MIME email for each message:
 *    - `Content-Type: text/calendar; charset=utf-8; method=<METHOD>`
 *    - An optional `text/plain` summary for non-calendar clients.
 * 3. Delegate actual SMTP/API dispatch to the injected `IMailSender`.
 * 4. Handle EMAIL-action reminders (IReminderDTO.action === 'EMAIL') by
 *    generating a plain reminder email and sending it via `IMailSender`.
 *
 * The `IMailSender` interface is deliberately thin so the API layer can inject
 * either a real SMTP transport (brightchain-api) or a stub in tests.
 *
 * @see RFC 5546 §3 – iTIP message transport
 * @see Requirements 10.1, 10.2, 10.6, 17.1
 */

import type { IReminderDTO } from '@brightchain/brightcal-lib';
import type { CalendarNotificationService, ITipMessage } from './calendarNotificationService.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * Minimal outbound email descriptor.  The mail transport layer constructs the
 * final RFC 5322 message from this.
 */
export interface IOutboundEmail {
  /** Sender address (e.g. "noreply@brightchain.example"). */
  from: string;
  /** List of recipient addresses. */
  to: string[];
  /** RFC 5322 Subject line. */
  subject: string;
  /**
   * Optional plain-text fallback body for non-calendar-aware clients.
   * When absent the transport should use a generic "You have received a
   * calendar invite" message.
   */
  textBody?: string;
  /**
   * iCalendar data for the `text/calendar` MIME part.
   * Must include the correct `METHOD:` property matching `calendarMethod`.
   */
  icsBody: string;
  /** The iTIP method carried in the `text/calendar` MIME part. */
  calendarMethod: string;
}

/**
 * Thin interface for dispatching outbound emails.
 * Implemented by the BrightMail API layer; injected here to avoid a direct
 * dependency on the mail package.
 */
export interface IMailSender {
  sendEmail(email: IOutboundEmail): Promise<void>;
}

// ─── Service ─────────────────────────────────────────────────────────────────

export class ItipMailDeliveryService {
  constructor(
    private readonly notificationService: CalendarNotificationService,
    private readonly mailSender: IMailSender,
    /** Sender address used in the From header. */
    private readonly fromAddress: string,
  ) {}

  /**
   * Drain all queued iTIP messages and send them as calendar emails.
   *
   * Call this on a periodic schedule (e.g. every 30 s) or immediately after
   * CalendarNotificationService generates a new message.
   *
   * @returns Number of messages successfully dispatched.
   */
  async flushQueue(): Promise<number> {
    const messages = [...this.notificationService.getMessageQueue()];
    this.notificationService.clearMessageQueue();
    let sent = 0;

    for (const msg of messages) {
      try {
        await this.sendItipMessage(msg);
        sent++;
      } catch {
        // Individual send failures are swallowed so one bad address does not
        // block delivery to remaining recipients.  The caller can compare the
        // return value against messages.length to detect partial failures.
      }
    }

    return sent;
  }

  /**
   * Send an email reminder for an upcoming event.
   *
   * Called by the scheduler when a VEVENT VALARM with ACTION:EMAIL fires.
   *
   * @param reminder  The IReminderDTO that triggered the alarm.
   * @param eventSummary  Human-readable event title.
   * @param eventStart    ISO 8601 start time string.
   * @param recipientEmail  Address to notify.
   */
  async sendEmailReminder(
    reminder: IReminderDTO,
    eventSummary: string,
    eventStart: string,
    recipientEmail: string,
  ): Promise<void> {
    if (reminder.action !== 'EMAIL') {
      return;
    }

    const minutesBefore = reminder.triggerMinutesBefore;
    const hoursLabel =
      minutesBefore >= 60
        ? `${Math.round(minutesBefore / 60)} hour(s)`
        : `${minutesBefore} minute(s)`;

    await this.mailSender.sendEmail({
      from: this.fromAddress,
      to: [recipientEmail],
      subject: `Reminder: ${eventSummary}`,
      textBody:
        `This is a reminder that "${eventSummary}" starts in ${hoursLabel}` +
        ` (${eventStart}).`,
      // No ics body for plain reminders — they are not iTIP messages.
      icsBody: '',
      calendarMethod: '',
    });
  }

  // ─── Private helpers ───────────────────────────────────────────────────────

  private async sendItipMessage(msg: ITipMessage): Promise<void> {
    const subject = this.subjectForMethod(msg.method, msg.eventUid);

    const email: IOutboundEmail = {
      from: this.fromAddress,
      to: msg.recipients,
      subject,
      icsBody: msg.icalData,
      calendarMethod: msg.method,
      textBody: this.plainTextForMethod(msg.method, msg.eventUid),
    };

    await this.mailSender.sendEmail(email);
  }

  private subjectForMethod(method: string, uid: string): string {
    switch (method.toUpperCase()) {
      case 'REQUEST':
        return 'Calendar Invite';
      case 'REPLY':
        return 'Response to Calendar Invite';
      case 'CANCEL':
        return 'Cancelled: Calendar Event';
      case 'COUNTER':
        return 'Counter-Proposal: Calendar Event';
      case 'DECLINECOUNTER':
        return 'Counter Declined: Calendar Event';
      default:
        return `Calendar Notification (${uid})`;
    }
  }

  private plainTextForMethod(method: string, uid: string): string {
    switch (method.toUpperCase()) {
      case 'REQUEST':
        return (
          'You have received a calendar invitation.  ' +
          'Please open this email in a calendar-aware client to respond.'
        );
      case 'REPLY':
        return 'An attendee has responded to your calendar invitation.';
      case 'CANCEL':
        return 'A calendar event you were invited to has been cancelled.';
      case 'COUNTER':
        return 'An attendee has proposed a different time for your calendar event.';
      case 'DECLINECOUNTER':
        return 'Your counter-proposal for a calendar event has been declined.';
      default:
        return `Calendar notification for event ${uid}.`;
    }
  }
}
