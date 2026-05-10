/**
 * CalendarNotificationService
 *
 * Implements iTIP message generation (REQUEST, REPLY, CANCEL, COUNTER,
 * DECLINECOUNTER), RSVP tracking with PARTSTAT updates, attendee summary
 * counts, and SEQUENCE management for organizer modifications.
 *
 * Also implements the IInvitationService interface consumed by InvitationController.
 *
 * Generated iTIP messages are queued in-memory for later delivery (task 17).
 *
 * @see Requirements 4.5, 4.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

import {
  ITipMethod,
  ParticipationStatus,
  type IReminderDTO,
} from '@brightchain/brightcal-lib';
import type { Model } from '@brightchain/db';
import { randomUUID } from 'crypto';
import type {
  IStoredCalendarCollection,
  ITypedCalendarCollection,
} from '../models/calendarCollection.model.js';
import type { IInvitationService } from '../controllers/invitationController.js';
import type {
  IStoredCalendarEvent,
  ITypedCalendarEvent,
} from '../models/calendarEvent.model.js';
import type {
  IStoredCalendarReminder,
  ITypedCalendarReminder,
} from '../models/calendarReminder.model.js';
import { decryptEventBody } from './calendarEventCrypto.js';
import type { IEncryptionService } from './encryptionService.js';

// ─── Interfaces ──────────────────────────────────────────────────────────────

/**
 * An iTIP message data structure ready for delivery.
 */
export interface ITipMessage {
  method: ITipMethod;
  eventUid: string;
  sequence: number;
  icalData: string;
  recipients: string[];
}

/**
 * Summary of attendee RSVP counts for an event.
 */
export interface IAttendeeSummary {
  total: number;
  accepted: number;
  declined: number;
  tentative: number;
  noResponse: number;
}

/**
 * Attendee record stored alongside the event metadata.
 * The CalendarEvent model stores attendeeIds as string[]; this service
 * maintains a parallel in-memory map of attendee details keyed by eventId.
 */
export interface IAttendeeRecord {
  userId: string;
  email: string;
  partstat: ParticipationStatus;
}

/**
 * A real-time notification queued for delivery via WebSocket.
 */
export interface IRealTimeNotification {
  type: string;
  userId: string;
  payload: unknown;
  timestamp: Date;
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * CalendarNotificationService handles iTIP message generation and RSVP tracking.
 *
 * @requirements 4.5, 4.6, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */
export class CalendarNotificationService implements IInvitationService {
  /** In-memory queue of generated iTIP messages awaiting delivery. */
  private readonly messageQueue: ITipMessage[] = [];

  /**
   * In-memory attendee details keyed by eventId.
   * Each entry maps userId → IAttendeeRecord.
   * This supplements the attendeeIds stored in the event model.
   */
  private readonly attendeeMap: Map<string, Map<string, IAttendeeRecord>> =
    new Map();

  /** In-memory queue of real-time notifications awaiting WebSocket delivery. */
  private readonly realTimeQueue: IRealTimeNotification[] = [];

  private readonly calendarEventModel: Model<
    IStoredCalendarEvent,
    ITypedCalendarEvent
  >;
  private readonly calendarReminderModel?: Model<
    IStoredCalendarReminder,
    ITypedCalendarReminder
  >;
  private readonly calendarCollectionModel?: Model<
    IStoredCalendarCollection,
    ITypedCalendarCollection
  >;
  private readonly encryptionService?: IEncryptionService;
  constructor(
    calendarEventModel: Model<IStoredCalendarEvent, ITypedCalendarEvent>,
    calendarReminderModel?: Model<
      IStoredCalendarReminder,
      ITypedCalendarReminder
    >,
    calendarCollectionModel?: Model<
      IStoredCalendarCollection,
      ITypedCalendarCollection
    >,
    encryptionService?: IEncryptionService,
  ) {
    this.calendarEventModel = calendarEventModel;
    this.calendarReminderModel = calendarReminderModel;
    this.calendarCollectionModel = calendarCollectionModel;
    this.encryptionService = encryptionService;
  }

  // ── IInvitationService implementation ───────────────────────────────────

  /**
   * RSVP to an event: update the attendee's PARTSTAT and generate an iTIP REPLY.
   *
   * @param userId  The responding attendee's user ID
   * @param eventId The event being responded to
   * @param response The participation status (ACCEPTED, DECLINED, TENTATIVE)
   * @returns The updated event
   * @throws Error('NOT_FOUND') if the event does not exist
   * @throws Error('NOT_ATTENDEE') if the user is not an attendee of the event
   *
   * @requirements 10.2, 10.3
   */
  async rsvp(
    userId: string,
    eventId: string,
    response: ParticipationStatus,
  ): Promise<ITypedCalendarEvent> {
    const event = await this.getDecryptedEvent(eventId);
    if (!event) {
      throw new Error('NOT_FOUND');
    }

    // Verify the user is an attendee
    if (!event.attendeeIds.includes(userId)) {
      throw new Error('NOT_ATTENDEE');
    }

    // Update the in-memory attendee record
    this.ensureAttendeeMap(eventId, event);
    const attendees = this.attendeeMap.get(eventId)!;
    const record = attendees.get(userId);
    if (record) {
      record.partstat = response;
    }

    // Generate iTIP REPLY
    const reply = this.generateReply(event, userId, response);
    this.messageQueue.push(reply);

    return event;
  }

  /**
   * Propose a new time for an event (iTIP COUNTER).
   *
   * @param userId The attendee proposing the new time
   * @param eventId The event to counter
   * @param proposedStart Proposed new start time (ISO 8601)
   * @param proposedEnd Proposed new end time (ISO 8601)
   * @param comment Optional reason for the counter proposal
   * @throws Error('NOT_FOUND') if the event does not exist
   *
   * @requirements 10.4
   */
  async counter(
    userId: string,
    eventId: string,
    proposedStart: string,
    proposedEnd: string,
    comment?: string,
  ): Promise<void> {
    const event = await this.getDecryptedEvent(eventId);
    if (!event) {
      throw new Error('NOT_FOUND');
    }

    const counterMsg: ITipMessage = {
      method: ITipMethod.Counter,
      eventUid: event.uid,
      sequence: event.sequence,
      icalData: this.buildICalData(
        ITipMethod.Counter,
        event,
        proposedStart,
        proposedEnd,
        comment,
      ),
      recipients: [event.organizerId],
    };

    this.messageQueue.push(counterMsg);
  }

  /**
   * Decline a counter proposal (iTIP DECLINECOUNTER).
   *
   * @param userId The organizer declining the counter
   * @param eventId The event the counter was for
   * @param counterProposalId Identifier of the counter proposal being declined
   * @throws Error('NOT_FOUND') if the event does not exist
   * @throws Error('NOT_ORGANIZER') if the user is not the organizer
   *
   * @requirements 10.4
   */
  async declineCounter(
    userId: string,
    eventId: string,
    counterProposalId: string,
  ): Promise<void> {
    const event = await this.getDecryptedEvent(eventId);
    if (!event) {
      throw new Error('NOT_FOUND');
    }

    if (event.organizerId !== userId) {
      throw new Error('NOT_ORGANIZER');
    }

    const declineMsg: ITipMessage = {
      method: ITipMethod.DeclineCounter,
      eventUid: event.uid,
      sequence: event.sequence,
      icalData: this.buildICalData(ITipMethod.DeclineCounter, event),
      recipients: event.attendeeIds.filter((id) => id !== userId),
    };

    this.messageQueue.push(declineMsg);
  }

  // ── iTIP message generators ─────────────────────────────────────────────

  /**
   * Generate an iTIP REQUEST message for event creation or modification.
   * Should be called when an event with attendees is created or modified.
   *
   * @requirements 4.5, 10.1, 10.5
   */
  generateRequest(event: ITypedCalendarEvent): ITipMessage {
    const msg: ITipMessage = {
      method: ITipMethod.Request,
      eventUid: event.uid,
      sequence: event.sequence,
      icalData: this.buildICalData(ITipMethod.Request, event),
      recipients: event.attendeeIds.filter((id) => id !== event.organizerId),
    };

    this.messageQueue.push(msg);
    return msg;
  }

  /**
   * Generate an iTIP CANCEL message for event cancellation.
   * Should be called when an event is cancelled by the organizer.
   *
   * @requirements 4.6
   */
  generateCancel(event: ITypedCalendarEvent): ITipMessage {
    const msg: ITipMessage = {
      method: ITipMethod.Cancel,
      eventUid: event.uid,
      sequence: event.sequence,
      icalData: this.buildICalData(ITipMethod.Cancel, event),
      recipients: event.attendeeIds.filter((id) => id !== event.organizerId),
    };

    this.messageQueue.push(msg);
    return msg;
  }

  // ── Attendee summary ────────────────────────────────────────────────────

  /**
   * Return RSVP summary counts for an event's attendees.
   *
   * @requirements 10.6
   */
  async getAttendeeSummary(eventId: string): Promise<IAttendeeSummary> {
    const event = await this.getDecryptedEvent(eventId);
    if (!event) {
      throw new Error('NOT_FOUND');
    }

    this.ensureAttendeeMap(eventId, event);
    const attendees = this.attendeeMap.get(eventId)!;

    let accepted = 0;
    let declined = 0;
    let tentative = 0;
    let noResponse = 0;

    for (const record of attendees.values()) {
      switch (record.partstat) {
        case ParticipationStatus.Accepted:
          accepted++;
          break;
        case ParticipationStatus.Declined:
          declined++;
          break;
        case ParticipationStatus.Tentative:
          tentative++;
          break;
        case ParticipationStatus.NeedsAction:
        default:
          noResponse++;
          break;
      }
    }

    return {
      total: attendees.size,
      accepted,
      declined,
      tentative,
      noResponse,
    };
  }

  // ── Queue access ────────────────────────────────────────────────────────

  /**
   * Get all queued iTIP messages (for delivery by task 17).
   */
  getMessageQueue(): readonly ITipMessage[] {
    return this.messageQueue;
  }

  /**
   * Clear the message queue after delivery.
   */
  clearMessageQueue(): void {
    this.messageQueue.length = 0;
  }

  // ── Reminder scheduling ─────────────────────────────────────────────────

  /**
   * Schedule reminders for an event at the configured intervals before start.
   * Creates CalendarReminder records in the database.
   *
   * @param eventId The event to schedule reminders for
   * @param eventStart The event start time
   * @param reminders Array of reminder configurations
   * @param userId The user to receive the reminders (defaults to 'system')
   * @throws Error('NO_REMINDER_MODEL') if calendarReminderModel was not provided
   *
   * @requirements 14.1, 14.2, 14.3
   */
  async scheduleReminders(
    eventId: string,
    eventStart: Date,
    reminders: IReminderDTO[],
    userId = 'system',
  ): Promise<void> {
    if (!this.calendarReminderModel) {
      throw new Error('NO_REMINDER_MODEL');
    }

    for (const reminder of reminders) {
      const triggerAt = new Date(
        eventStart.getTime() - reminder.triggerMinutesBefore * 60 * 1000,
      );

      const channels: ('email' | 'push')[] =
        reminder.action === 'EMAIL' ? ['email'] : ['push'];

      const record: ITypedCalendarReminder = {
        id: randomUUID().replace(/-/g, ''),
        eventId,
        userId,
        triggerAt,
        channels,
        delivered: false,
        dateCreated: new Date(),
      };

      await this.calendarReminderModel.insertOne(record);
    }
  }

  /**
   * Cancel all pending (undelivered) reminders for an event.
   *
   * @param eventId The event whose reminders should be cancelled
   * @throws Error('NO_REMINDER_MODEL') if calendarReminderModel was not provided
   *
   * @requirements 14.5
   */
  async cancelReminders(eventId: string): Promise<void> {
    if (!this.calendarReminderModel) {
      throw new Error('NO_REMINDER_MODEL');
    }

    await this.calendarReminderModel.deleteMany({
      eventId,
      delivered: false,
    } as unknown as Partial<IStoredCalendarReminder>);
  }

  /**
   * Find all reminders where triggerAt <= now and delivered === false.
   *
   * @param now The current time to check against
   * @returns Array of due reminders
   * @throws Error('NO_REMINDER_MODEL') if calendarReminderModel was not provided
   *
   * @requirements 14.4
   */
  async getDueReminders(now: Date): Promise<ITypedCalendarReminder[]> {
    if (!this.calendarReminderModel) {
      throw new Error('NO_REMINDER_MODEL');
    }

    return this.calendarReminderModel
      .find({
        triggerAt: { $lte: now.toISOString() },
        delivered: false,
      } as unknown as Partial<IStoredCalendarReminder>)
      .toArray();
  }

  /**
   * Mark a reminder as delivered after successful notification dispatch.
   *
   * @param reminderId The reminder to mark as delivered
   * @throws Error('NO_REMINDER_MODEL') if calendarReminderModel was not provided
   *
   * @requirements 14.4
   */
  async markReminderDelivered(reminderId: string): Promise<void> {
    if (!this.calendarReminderModel) {
      throw new Error('NO_REMINDER_MODEL');
    }

    await this.calendarReminderModel.updateOne(
      { _id: reminderId } as Partial<IStoredCalendarReminder>,
      { $set: { delivered: true } as Partial<IStoredCalendarReminder> },
    );
  }

  // ── Real-time notifications ─────────────────────────────────────────────

  /**
   * Queue a real-time notification for delivery via WebSocket.
   * Stored in-memory for now; WebSocket integration in task 28.2.
   *
   * @param type Notification type (e.g., 'invitation', 'rsvp', 'update', 'cancel')
   * @param userId Target user ID
   * @param payload Notification payload data
   *
   * @requirements 14.6, 14.7
   */
  emitRealTimeNotification(
    type: string,
    userId: string,
    payload: unknown,
  ): void {
    this.realTimeQueue.push({
      type,
      userId,
      payload,
      timestamp: new Date(),
    });
  }

  /**
   * Get all queued real-time notifications.
   */
  getRealTimeQueue(): readonly IRealTimeNotification[] {
    return this.realTimeQueue;
  }

  /**
   * Clear the real-time notification queue after delivery.
   */
  clearRealTimeQueue(): void {
    this.realTimeQueue.length = 0;
  }

  // ── Private helpers ─────────────────────────────────────────────────────

  /**
   * Retrieve and decrypt an event by ID.
   * If encryption dependencies are available, decrypts the event body to
   * populate attendeeIds and other sensitive fields.
   */
  private async getDecryptedEvent(
    eventId: string,
  ): Promise<ITypedCalendarEvent | null> {
    const event = await this.calendarEventModel.findById(eventId);
    if (!event) return null;

    if (this.calendarCollectionModel && this.encryptionService) {
      const calendar = await this.calendarCollectionModel.findById(
        event.calendarId,
      );
      if (calendar?.encryptionKey) {
        return decryptEventBody(event, calendar.encryptionKey, this.encryptionService);
      }
    }

    return event;
  }

  /**
   * Generate an iTIP REPLY message for an RSVP response.
   */
  private generateReply(
    event: ITypedCalendarEvent,
    attendeeId: string,
    partstat: ParticipationStatus,
  ): ITipMessage {
    return {
      method: ITipMethod.Reply,
      eventUid: event.uid,
      sequence: event.sequence,
      icalData: this.buildICalData(
        ITipMethod.Reply,
        event,
        undefined,
        undefined,
        undefined,
        attendeeId,
        partstat,
      ),
      recipients: [event.organizerId],
    };
  }

  /**
   * Ensure the in-memory attendee map is populated for an event.
   * Initializes all attendees with NEEDS-ACTION if not already tracked.
   */
  private ensureAttendeeMap(eventId: string, event: ITypedCalendarEvent): void {
    if (!this.attendeeMap.has(eventId)) {
      const map = new Map<string, IAttendeeRecord>();
      for (const attendeeId of event.attendeeIds) {
        // Skip the organizer — they don't RSVP to their own event
        if (attendeeId === event.organizerId) continue;
        map.set(attendeeId, {
          userId: attendeeId,
          email: attendeeId, // In a full system, resolve to email
          partstat: ParticipationStatus.NeedsAction,
        });
      }
      this.attendeeMap.set(eventId, map);
    }
  }

  /**
   * Build a minimal iCalendar data string for an iTIP message.
   * This produces a valid VCALENDAR with METHOD and a single VEVENT.
   */
  private buildICalData(
    method: ITipMethod,
    event: ITypedCalendarEvent,
    proposedStart?: string,
    proposedEnd?: string,
    comment?: string,
    attendeeId?: string,
    partstat?: ParticipationStatus,
  ): string {
    const lines: string[] = [];
    lines.push('BEGIN:VCALENDAR');
    lines.push('VERSION:2.0');
    lines.push('PRODID:-//BrightChain//BrightCal//EN');
    lines.push(`METHOD:${method}`);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.uid}`);
    lines.push(`SEQUENCE:${event.sequence}`);
    lines.push(`SUMMARY:${event.summary}`);
    lines.push(`ORGANIZER:${event.organizerId}`);

    const dtstart =
      proposedStart ?? event.dtstart.toISOString().replace(/[-:]/g, '');
    const dtend = proposedEnd ?? event.dtend.toISOString().replace(/[-:]/g, '');
    lines.push(`DTSTART:${dtstart}`);
    lines.push(`DTEND:${dtend}`);
    lines.push(`STATUS:${event.status}`);

    if (comment) {
      lines.push(`COMMENT:${comment}`);
    }

    // For REPLY, include only the responding attendee
    if (method === ITipMethod.Reply && attendeeId && partstat) {
      lines.push(`ATTENDEE;PARTSTAT=${partstat}:${attendeeId}`);
    } else {
      // For REQUEST/CANCEL, include all attendees
      for (const id of event.attendeeIds) {
        if (id !== event.organizerId) {
          lines.push(`ATTENDEE:${id}`);
        }
      }
    }

    lines.push('END:VEVENT');
    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }
}
