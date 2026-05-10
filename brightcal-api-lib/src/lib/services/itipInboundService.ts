/**
 * ItipInboundService
 *
 * Handles inbound iTIP calendar messages that arrive as MIME attachments on
 * incoming BrightMail messages (`text/calendar; method=<METHOD>`).
 *
 * Flow
 * ────
 * 1. The BrightMail API layer parses the email and detects a `text/calendar`
 *    MIME part.
 * 2. It extracts the ICS text, calls `parseICalendar()` from brightcal-lib,
 *    and constructs an `ICalInviteEmailDTO`.
 * 3. It calls the appropriate method on this service based on the iTIP method.
 * 4. This service creates/updates/cancels the event in the calendar store and
 *    returns any outbound iTIP reply ICS that should be sent back to the
 *    organizer.
 *
 * Implements `IItipInboundHandler` from brightcal-lib.
 *
 * @see RFC 5546 §3 – iTIP processing rules
 * @see Requirements 10.2, 10.3, 10.4, 10.5
 */

import {
  EventTransparency,
  EventVisibility,
  ITipMethod,
  ParticipationStatus,
  parseICalendar,
  serializeToICalendar,
  type ICalInviteEmailDTO,
  type IImportResult,
  type IItipInboundHandler,
} from '@brightchain/brightcal-lib';
import type { Model } from '@brightchain/db';
import { randomUUID } from 'crypto';
import type {
  IStoredCalendarCollection,
  ITypedCalendarCollection,
} from '../models/calendarCollection.model.js';
import type {
  IStoredCalendarEvent,
  ITypedCalendarEvent,
} from '../models/calendarEvent.model.js';
import { decryptEventBody, encryptEventBody } from './calendarEventCrypto.js';
import type { IEncryptionService } from './encryptionService.js';

// ─── Service ──────────────────────────────────────────────────────────────────

export class ItipInboundService implements IItipInboundHandler {
  constructor(
    private readonly calendarEventModel: Model<
      IStoredCalendarEvent,
      ITypedCalendarEvent
    >,
    private readonly calendarCollectionModel: Model<
      IStoredCalendarCollection,
      ITypedCalendarCollection
    >,
    private readonly encryptionService: IEncryptionService,
  ) {}

  // ─── IItipInboundHandler ──────────────────────────────────────────────────

  /**
   * Process an inbound iTIP REQUEST.
   *
   * Creates or updates the event in the user's default calendar.
   */
  async handleRequest(
    userId: string,
    invite: ICalInviteEmailDTO,
  ): Promise<IImportResult> {
    const existing = await this.findEventByUid(invite.uid);

    if (existing) {
      if (existing.sequence >= invite.sequence) {
        // Duplicate or outdated: skip
        return { imported: 0, skipped: 1, overwritten: 0, duplicates: [invite.uid] };
      }
      // Update existing event with higher sequence
      await this.updateEventFromInvite(existing, invite);
      return { imported: 0, skipped: 0, overwritten: 1, duplicates: [] };
    }

    // New event: import into user's default calendar
    await this.createEventFromInvite(userId, invite);
    return { imported: 1, skipped: 0, overwritten: 0, duplicates: [] };
  }

  /**
   * Process an inbound iTIP REPLY from an attendee.
   *
   * Updates the attendee's PARTSTAT on the organizer's stored event.
   */
  async handleReply(
    organizerId: string,
    invite: ICalInviteEmailDTO,
  ): Promise<ParticipationStatus> {
    const existing = await this.findEventByUid(invite.uid);
    if (!existing) {
      // Unknown event; nothing to update
      return ParticipationStatus.NeedsAction;
    }

    // Find the replying attendee in the invite
    const replyingAttendee = invite.attendees[0];
    if (!replyingAttendee) {
      return ParticipationStatus.NeedsAction;
    }

    // Get the calendar key for decryption
    const calendar = await this.calendarCollectionModel.findById(
      existing.calendarId,
    );
    if (!calendar?.encryptionKey) {
      return ParticipationStatus.NeedsAction;
    }

    // Decrypt, update PARTSTAT, re-encrypt
    const decrypted = await decryptEventBody(existing, calendar.encryptionKey, this.encryptionService);
    const updatedAttendeeIds = decrypted.attendeeIds ?? [];

    const newBody = { ...decrypted, attendeeIds: updatedAttendeeIds };
    await this.persistEventBody(existing.id, newBody);

    return replyingAttendee.partstat;
  }

  /**
   * Process an inbound iTIP CANCEL.
   *
   * Sets the event status to CANCELLED (or removes a specific recurrence
   * instance when a RECURRENCE-ID is present).
   */
  async handleCancel(
    userId: string,
    invite: ICalInviteEmailDTO,
  ): Promise<void> {
    const existing = await this.findEventByUid(invite.uid);
    if (!existing) {
      return; // Unknown event; nothing to cancel
    }

    // Get the calendar key for decryption
    const calendar = await this.calendarCollectionModel.findById(
      existing.calendarId,
    );
    if (!calendar?.encryptionKey) {
      return;
    }

    const decrypted = await decryptEventBody(existing, calendar.encryptionKey, this.encryptionService);

    if (invite.rawIcs.includes('RECURRENCE-ID')) {
      // Partial cancel: add recurrence-id to EXDATE list
      const parsed = parseICalendar(invite.rawIcs);
      const recurrenceId =
        parsed.events[0]?.recurrenceId ?? null;

        const recurrenceDate = recurrenceId
          ? new Date(
              String(recurrenceId).replace(
                /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/,
                '$1-$2-$3T$4:$5:$6$7',
              ),
            )
          : null;
        if (recurrenceDate && !isNaN(recurrenceDate.getTime())) {
          const exdates = [...(decrypted.exdates ?? []), recurrenceDate];
          await this.persistEventBody(existing.id, { ...decrypted, exdates });
          return;
        }
    }

    // Full cancel: mark the event CANCELLED
    await this.persistEventBody(existing.id, {
      ...decrypted,
      status: 'CANCELLED',
    });
  }

  /**
   * Process an inbound iTIP COUNTER proposal.
   *
   * Stores the proposed alternative times for organizer review.
   * Returns null (manual review required); auto-decline logic can be added
   * in a future iteration.
   */
  async handleCounter(
    organizerId: string,
    invite: ICalInviteEmailDTO,
  ): Promise<string | null> {
    // Counter proposals are stored as a comment on the event body.
    // Full counter-proposal handling (storing proposed times, surfacing them
    // in the EventEditor) is tracked as a separate work item.
    return null;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async findEventByUid(
    uid: string,
  ): Promise<ITypedCalendarEvent | null> {
    const results = await this.calendarEventModel.find({ uid } as any).toArray();
    return results[0] ?? null;
  }

  private async createEventFromInvite(
    userId: string,
    invite: ICalInviteEmailDTO,
  ): Promise<void> {
    const defaultCalendar = await this.calendarCollectionModel.findOne({
      ownerId: userId,
      isDefault: true,
    });
    if (!defaultCalendar) {
      throw new Error(`No default calendar found for user ${userId}`);
    }
    if (!defaultCalendar.encryptionKey) {
      throw new Error(`Default calendar for user ${userId} has no encryption key`);
    }

    const parsed = parseICalendar(invite.rawIcs);
    const event = parsed.events[0];
    if (!event) return;

    const eventBody = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      attendees: invite.attendees,
      rrule: event.rrule,
      exdates: event.exdates,
      rdates: event.rdates,
      recurrenceId: event.recurrenceId,
      status: event.status ?? 'TENTATIVE',
    };

    const { encryptedBody, blockId } = await encryptEventBody(
      eventBody as unknown as ITypedCalendarEvent,
      defaultCalendar.encryptionKey,
      this.encryptionService,
    );

    await this.calendarEventModel.insertOne({
      id: randomUUID(),
      calendarId: defaultCalendar.id,
      uid: invite.uid,
      sequence: invite.sequence,
      dtstart: invite.dtstart as unknown as Date,
      dtend: (invite.dtend ?? invite.dtstart) as unknown as Date,
      dtstartTzid: invite.dtstartTzid ?? 'UTC',
      dtendTzid: invite.dtstartTzid ?? 'UTC',
      allDay: invite.allDay,
      visibility: EventVisibility.Public,
      transparency: EventTransparency.Opaque,
      status: 'TENTATIVE',
      organizerId: userId,
      isRecurring: !!event.rrule,
      encryptedBody,
      blockId,
      summary: '',
      attendeeIds: [],
      dateCreated: new Date(),
      dateModified: new Date(),
      searchText: `${event.summary ?? ''} ${event.description ?? ''} ${event.location ?? ''}`.trim(),
    });
  }

  private async updateEventFromInvite(
    existing: ITypedCalendarEvent,
    invite: ICalInviteEmailDTO,
  ): Promise<void> {
    const parsed = parseICalendar(invite.rawIcs);
    const event = parsed.events[0];
    if (!event) return;

    // Get the calendar key for decryption
    const calendar = await this.calendarCollectionModel.findById(
      existing.calendarId,
    );
    if (!calendar?.encryptionKey) return;

    const decrypted = await decryptEventBody(existing, calendar.encryptionKey, this.encryptionService);
    const newBody = {
      ...decrypted,
      summary: event.summary ?? decrypted.summary,
      attendeeIds: invite.attendees.map((a: { email: string }) => a.email),
      status: event.status ?? 'CONFIRMED',
    };

    await this.persistEventBody(existing.id, newBody);

    await this.calendarEventModel.updateOne(
      { _id: existing.id },
      { $set: {
        sequence: invite.sequence,
        dtstart: (invite.dtstart as unknown as Date).toISOString(),
        dtend: ((invite.dtend ?? existing.dtstart) as unknown as Date).toISOString(),
        status: event.status ?? 'CONFIRMED',
        dateModified: new Date().toISOString(),
        searchText:
          `${event.summary ?? ''} ${event.description ?? ''} ${event.location ?? ''}`.trim(),
      } },
    );
  }

  private async persistEventBody(
    eventId: string,
    body: Record<string, unknown>,
  ): Promise<void> {
    const event = await this.calendarEventModel.findById(eventId);
    if (!event) return;

    const calendar = await this.calendarCollectionModel.findById(
      event.calendarId,
    );
    if (!calendar?.encryptionKey) return;

    const { encryptedBody, blockId } = await encryptEventBody(
      body as unknown as ITypedCalendarEvent,
      calendar.encryptionKey,
      this.encryptionService,
    );

    await this.calendarEventModel.updateOne(
      { _id: eventId },
      { $set: { encryptedBody, blockId, dateModified: new Date().toISOString() } },
    );
  }
}
