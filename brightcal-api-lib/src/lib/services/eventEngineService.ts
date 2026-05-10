/**
 * EventEngineService
 *
 * Core service for calendar event CRUD operations with permission checks,
 * UUID assignment, SEQUENCE management, and recurrence exception handling.
 *
 * Implements the IEventEngineService interface consumed by EventController.
 *
 * @see Requirements 4.8, 4.9, 5.5, 5.6, 5.7
 */

import { CalendarPermissionLevel } from '@brightchain/brightcal-lib';
import type { Model } from '@brightchain/db';
import { randomUUID } from 'crypto';
import type {
  ICreateEventBody,
  IEventEngineService,
  IUpdateEventBody,
  RecurrenceModificationMode,
} from '../controllers/eventController.js';
import type {
  IStoredCalendarCollection,
  ITypedCalendarCollection,
} from '../models/calendarCollection.model.js';
import type {
  IStoredCalendarEvent,
  ITypedCalendarEvent,
} from '../models/calendarEvent.model.js';
import { decryptEventBody, encryptEventBody } from './calendarEventCrypto.js';
import type { CalendarPermissionService } from './calendarPermissionService.js';
import type { IEncryptionService } from './encryptionService.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Build searchable text from event fields for full-text search indexing.
 */
function buildSearchText(
  summary: string,
  description?: string,
  location?: string,
): string {
  return [summary, description, location].filter(Boolean).join(' ');
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * EventEngineService handles calendar event persistence, permission-aware
 * access, recurrence exception handling, and SEQUENCE management.
 *
 * @requirements 4.8, 4.9, 5.5, 5.6, 5.7
 */
export class EventEngineService implements IEventEngineService {
  private readonly calendarEventModel: Model<
    IStoredCalendarEvent,
    ITypedCalendarEvent
  >;
  private readonly calendarCollectionModel: Model<
    IStoredCalendarCollection,
    ITypedCalendarCollection
  >;
  private readonly calendarPermissionService: CalendarPermissionService;
  private readonly encryptionService: IEncryptionService;

  constructor(
    calendarEventModel: Model<IStoredCalendarEvent, ITypedCalendarEvent>,
    calendarCollectionModel: Model<
      IStoredCalendarCollection,
      ITypedCalendarCollection
    >,
    calendarPermissionService: CalendarPermissionService,
    encryptionService: IEncryptionService,
  ) {
    this.calendarEventModel = calendarEventModel;
    this.calendarCollectionModel = calendarCollectionModel;
    this.calendarPermissionService = calendarPermissionService;
    this.encryptionService = encryptionService;
  }

  /**
   * Look up the AES-256-GCM key for a calendar.
   *
   * @throws Error('ENCRYPTION_KEY_MISSING') if the calendar has no encryption key.
   */
  private async getCalendarKey(calendarId: string): Promise<string> {
    const calendar = await this.calendarCollectionModel.findById(calendarId);
    if (!calendar?.encryptionKey) {
      throw new Error('ENCRYPTION_KEY_MISSING');
    }
    return calendar.encryptionKey;
  }

  // ── Interface methods ───────────────────────────────────────────────────

  /**
   * Create a new calendar event.
   *
   * - Checks user has at least Editor permission on the target calendar
   * - Assigns a UUID as the event UID (RFC 4122)
   * - Sets sequence=0, status='CONFIRMED'
   * - Generates searchText from summary + description + location
   *
   * @throws Error('FORBIDDEN') if user lacks Editor permission
   * @requirements 4.8
   */
  async createEvent(
    userId: string,
    eventData: ICreateEventBody,
  ): Promise<ITypedCalendarEvent> {
    await this.assertPermission(
      eventData.calendarId,
      userId,
      CalendarPermissionLevel.Editor,
    );

    const calendarKey = await this.getCalendarKey(eventData.calendarId);
    const now = new Date();
    const rawEvent: ITypedCalendarEvent = {
      id: randomUUID().replace(/-/g, ''),
      calendarId: eventData.calendarId,
      uid: randomUUID(),
      sequence: 0,
      summary: eventData.summary,
      dtstart: new Date(eventData.dtstart),
      dtend: new Date(eventData.dtend),
      dtstartTzid: eventData.dtstartTzid,
      dtendTzid: eventData.dtendTzid,
      allDay: eventData.allDay,
      visibility: eventData.visibility,
      transparency: eventData.transparency,
      status: 'CONFIRMED',
      organizerId: userId,
      attendeeIds: eventData.attendees?.map((a) => a.userId ?? a.email) ?? [],
      isRecurring: !!eventData.rrule,
      rrule: eventData.rrule,
      blockId: '',
      encryptedBody: '',
      dateCreated: now,
      dateModified: now,
      searchText: buildSearchText(
        eventData.summary,
        eventData.description,
        eventData.location,
      ),
    };

    const event = await encryptEventBody(
      rawEvent,
      calendarKey,
      this.encryptionService,
    );
    await this.calendarEventModel.insertOne(event);
    return event;
  }

  /**
   * List events for a calendar, optionally filtered by date range.
   *
   * - Checks user has at least FreeBusyOnly permission on the calendar
   *
   * @throws Error('FORBIDDEN') if user lacks FreeBusyOnly permission
   * @requirements 4.1
   */
  async listEvents(
    userId: string,
    calendarId: string,
    start?: string,
    end?: string,
  ): Promise<ITypedCalendarEvent[]> {
    await this.assertPermission(
      calendarId,
      userId,
      CalendarPermissionLevel.FreeBusyOnly,
    );

    const calendarKey = await this.getCalendarKey(calendarId);
    const allEvents = await this.calendarEventModel
      .find({ calendarId } as Partial<IStoredCalendarEvent>)
      .toArray();

    const decrypted = await Promise.all(
      allEvents.map((e) =>
        decryptEventBody(e, calendarKey, this.encryptionService),
      ),
    );

    // Apply optional date range filter
    if (!start && !end) {
      return decrypted;
    }

    const startDate = start ? new Date(start) : undefined;
    const endDate = end ? new Date(end) : undefined;

    return decrypted.filter((event) => {
      if (startDate && event.dtend < startDate) return false;
      if (endDate && event.dtstart > endDate) return false;
      return true;
    });
  }

  /**
   * Get a single event by ID, checking the user has permission on its calendar.
   *
   * @throws Error('FORBIDDEN') if user lacks FreeBusyOnly permission
   * @requirements 4.1
   */
  async getEventById(
    eventId: string,
    userId: string,
  ): Promise<ITypedCalendarEvent | null> {
    const event = await this.calendarEventModel.findById(eventId);
    if (!event) return null;

    await this.assertPermission(
      event.calendarId,
      userId,
      CalendarPermissionLevel.FreeBusyOnly,
    );

    const calendarKey = await this.getCalendarKey(event.calendarId);
    return decryptEventBody(event, calendarKey, this.encryptionService);
  }

  /**
   * Update an event with recurrence modification mode support.
   *
   * - Checks user has Editor permission
   * - Increments SEQUENCE by 1
   * - Handles recurrence modes:
   *   - 'all': Update the event directly
   *   - 'single': Create a RECURRENCE-ID exception
   *   - 'thisAndFuture': Split the series
   *
   * @throws Error('FORBIDDEN') if user lacks Editor permission
   * @requirements 4.9, 5.5, 5.6
   */
  async updateEvent(
    eventId: string,
    userId: string,
    updates: IUpdateEventBody,
    mode: RecurrenceModificationMode,
  ): Promise<ITypedCalendarEvent | null> {
    const rawEvent = await this.calendarEventModel.findById(eventId);
    if (!rawEvent) return null;

    await this.assertPermission(
      rawEvent.calendarId,
      userId,
      CalendarPermissionLevel.Editor,
    );

    if (rawEvent.isRecurring && mode !== 'all') {
      // Decrypt to access rrule, attendeeIds, exdates etc.
      const calendarKey = await this.getCalendarKey(rawEvent.calendarId);
      const event = await decryptEventBody(rawEvent, calendarKey, this.encryptionService);
      if (mode === 'single') {
        return this.createSingleException(event, updates);
      }
      if (mode === 'thisAndFuture') {
        return this.splitSeriesThisAndFuture(event, updates);
      }
    }

    // Mode 'all' or non-recurring: update the event directly
    // Decrypt for applyDirectUpdate which may need summary/attendeeIds
    const calendarKey = await this.getCalendarKey(rawEvent.calendarId);
    const event = await decryptEventBody(rawEvent, calendarKey, this.encryptionService);
    return this.applyDirectUpdate(event, updates);
  }

  /**
   * Delete an event with recurrence modification mode support.
   *
   * - Checks user has Editor permission
   * - Handles recurrence modes:
   *   - 'all': Delete the event
   *   - 'single': Add EXDATE for the occurrence
   *   - 'thisAndFuture': Set UNTIL on the rrule
   *
   * @throws Error('FORBIDDEN') if user lacks Editor permission
   * @requirements 5.7
   */
  async deleteEvent(
    eventId: string,
    userId: string,
    mode: RecurrenceModificationMode,
  ): Promise<boolean> {
    const rawEvent = await this.calendarEventModel.findById(eventId);
    if (!rawEvent) return false;

    await this.assertPermission(
      rawEvent.calendarId,
      userId,
      CalendarPermissionLevel.Editor,
    );

    if (rawEvent.isRecurring && mode !== 'all') {
      // Decrypt to access rrule, exdates etc.
      const calendarKey = await this.getCalendarKey(rawEvent.calendarId);
      const event = await decryptEventBody(rawEvent, calendarKey, this.encryptionService);
      if (mode === 'single') {
        return this.deleteSingleOccurrence(event);
      }
      if (mode === 'thisAndFuture') {
        return this.deleteThisAndFuture(event);
      }
    }

    // Mode 'all' or non-recurring: delete the event
    await this.calendarEventModel.deleteOne({
      _id: eventId,
    } as Partial<IStoredCalendarEvent>);
    return true;
  }

  // ── Recurrence helpers ──────────────────────────────────────────────────

  /**
   * Create a RECURRENCE-ID exception for a single occurrence modification.
   * The new event carries the recurrenceId and parentEventId pointing to the original.
   *
   * @requirements 5.5
   */
  private async createSingleException(
    parentEvent: ITypedCalendarEvent,
    updates: IUpdateEventBody,
  ): Promise<ITypedCalendarEvent> {
    const now = new Date();
    const occurrenceDate = updates.dtstart
      ? new Date(updates.dtstart)
      : parentEvent.dtstart;
    const calendarKey = await this.getCalendarKey(parentEvent.calendarId);

    // Add EXDATE to parent for the overridden occurrence
    const parentExdates = parentEvent.exdates
      ? [...parentEvent.exdates, occurrenceDate]
      : [occurrenceDate];

    const updatedParent = await encryptEventBody(
      { ...parentEvent, exdates: parentExdates, dateModified: now },
      calendarKey,
      this.encryptionService,
    );
    await this.calendarEventModel.updateOne(
      { _id: parentEvent.id } as Partial<IStoredCalendarEvent>,
      {
        $set: {
          encryptedBody: updatedParent.encryptedBody,
          blockId: updatedParent.blockId,
          dateModified: now.toISOString(),
        } as Partial<IStoredCalendarEvent>,
      },
    );

    // Create the exception event.
    const rawException: ITypedCalendarEvent = {
      id: randomUUID().replace(/-/g, ''),
      calendarId: parentEvent.calendarId,
      uid: randomUUID(),
      sequence: parentEvent.sequence + 1,
      summary: updates.summary ?? parentEvent.summary,
      dtstart: updates.dtstart
        ? new Date(updates.dtstart)
        : parentEvent.dtstart,
      dtend: updates.dtend ? new Date(updates.dtend) : parentEvent.dtend,
      dtstartTzid: updates.dtstartTzid ?? parentEvent.dtstartTzid,
      dtendTzid: updates.dtendTzid ?? parentEvent.dtendTzid,
      allDay:
        updates.allDay !== undefined ? updates.allDay : parentEvent.allDay,
      visibility: updates.visibility ?? parentEvent.visibility,
      transparency: updates.transparency ?? parentEvent.transparency,
      status: parentEvent.status,
      organizerId: parentEvent.organizerId,
      attendeeIds: parentEvent.attendeeIds,
      isRecurring: false,
      recurrenceId: occurrenceDate,
      parentEventId: parentEvent.id,
      blockId: '',
      encryptedBody: '',
      dateCreated: now,
      dateModified: now,
      searchText: buildSearchText(
        updates.summary ?? parentEvent.summary,
        updates.description,
        updates.location,
      ),
    };

    const exception = await encryptEventBody(
      rawException,
      calendarKey,
      this.encryptionService,
    );
    await this.calendarEventModel.insertOne(exception);
    return exception;
  }

  /**
   * Split a recurring series at a given point ("this and future").
   * - Original series gets UNTIL set to before the modification date
   * - New series starts from the modification date with its own RRULE
   *
   * @requirements 5.6
   */
  private async splitSeriesThisAndFuture(
    originalEvent: ITypedCalendarEvent,
    updates: IUpdateEventBody,
  ): Promise<ITypedCalendarEvent> {
    const now = new Date();
    const splitDate = updates.dtstart
      ? new Date(updates.dtstart)
      : originalEvent.dtstart;
    const calendarKey = await this.getCalendarKey(originalEvent.calendarId);

    // Set UNTIL on the original event's rrule to just before the split date
    if (originalEvent.rrule) {
      const updatedRrule = {
        ...originalEvent.rrule,
        until: new Date(splitDate.getTime() - 1).toISOString(),
        count: undefined, // Remove COUNT when setting UNTIL
      };

      const updatedOriginal = await encryptEventBody(
        {
          ...originalEvent,
          rrule: updatedRrule,
          sequence: originalEvent.sequence + 1,
          dateModified: now,
        },
        calendarKey,
        this.encryptionService,
      );
      await this.calendarEventModel.updateOne(
        { _id: originalEvent.id } as Partial<IStoredCalendarEvent>,
        {
          $set: {
            encryptedBody: updatedOriginal.encryptedBody,
            blockId: updatedOriginal.blockId,
            sequence: originalEvent.sequence + 1,
            dateModified: now.toISOString(),
          } as Partial<IStoredCalendarEvent>,
        },
      );
    }

    // Create the new series starting from the split date
    const newRrule = updates.rrule ?? originalEvent.rrule;
    const rawNewEvent: ITypedCalendarEvent = {
      id: randomUUID().replace(/-/g, ''),
      calendarId: originalEvent.calendarId,
      uid: randomUUID(), // New UID for the new series
      sequence: 0,
      summary: updates.summary ?? originalEvent.summary,
      dtstart: splitDate,
      dtend: updates.dtend ? new Date(updates.dtend) : originalEvent.dtend,
      dtstartTzid: updates.dtstartTzid ?? originalEvent.dtstartTzid,
      dtendTzid: updates.dtendTzid ?? originalEvent.dtendTzid,
      allDay:
        updates.allDay !== undefined ? updates.allDay : originalEvent.allDay,
      visibility: updates.visibility ?? originalEvent.visibility,
      transparency: updates.transparency ?? originalEvent.transparency,
      status: originalEvent.status,
      organizerId: originalEvent.organizerId,
      attendeeIds: originalEvent.attendeeIds,
      isRecurring: !!newRrule,
      rrule: newRrule,
      parentEventId: originalEvent.id,
      blockId: '',
      encryptedBody: '',
      dateCreated: now,
      dateModified: now,
      searchText: buildSearchText(
        updates.summary ?? originalEvent.summary,
        updates.description,
        updates.location,
      ),
    };

    const newEvent = await encryptEventBody(
      rawNewEvent,
      calendarKey,
      this.encryptionService,
    );
    await this.calendarEventModel.insertOne(newEvent);
    return newEvent;
  }

  /**
   * Apply a direct update to an event (mode 'all' or non-recurring).
   * Increments SEQUENCE by 1 and updates dateModified.
   *
   * @requirements 4.9
   */
  private async applyDirectUpdate(
    event: ITypedCalendarEvent,
    updates: IUpdateEventBody,
  ): Promise<ITypedCalendarEvent> {
    const now = new Date();
    const calendarKey = await this.getCalendarKey(event.calendarId);

    // Apply updates to the in-memory typed event
    const updatedEvent: ITypedCalendarEvent = {
      ...event,
      sequence: event.sequence + 1,
      dateModified: now,
      summary: updates.summary ?? event.summary,
      attendeeIds: event.attendeeIds,
      rrule: updates.rrule !== undefined ? updates.rrule : event.rrule,
      isRecurring:
        updates.rrule !== undefined ? !!updates.rrule : event.isRecurring,
    };

    if (updates.dtstart !== undefined) {
      updatedEvent.dtstart = new Date(updates.dtstart);
    }
    if (updates.dtend !== undefined) {
      updatedEvent.dtend = new Date(updates.dtend);
    }
    if (updates.dtstartTzid !== undefined) {
      updatedEvent.dtstartTzid = updates.dtstartTzid;
    }
    if (updates.dtendTzid !== undefined) {
      updatedEvent.dtendTzid = updates.dtendTzid;
    }
    if (updates.allDay !== undefined) {
      updatedEvent.allDay = updates.allDay;
    }
    if (updates.visibility !== undefined) {
      updatedEvent.visibility = updates.visibility;
    }
    if (updates.transparency !== undefined) {
      updatedEvent.transparency = updates.transparency;
    }
    if (
      updates.summary !== undefined ||
      updates.description !== undefined ||
      updates.location !== undefined
    ) {
      updatedEvent.searchText = buildSearchText(
        updates.summary ?? event.summary,
        updates.description,
        updates.location,
      );
    }

    const encrypted = await encryptEventBody(
      updatedEvent,
      calendarKey,
      this.encryptionService,
    );

    const setFields: Partial<IStoredCalendarEvent> = {
      encryptedBody: encrypted.encryptedBody,
      blockId: encrypted.blockId,
      sequence: encrypted.sequence,
      isRecurring: encrypted.isRecurring,
      dtstart: encrypted.dtstart.toISOString(),
      dtend: encrypted.dtend.toISOString(),
      dtstartTzid: encrypted.dtstartTzid,
      dtendTzid: encrypted.dtendTzid,
      allDay: encrypted.allDay,
      visibility: encrypted.visibility,
      transparency: encrypted.transparency,
      searchText: encrypted.searchText,
      dateModified: now.toISOString(),
    };

    await this.calendarEventModel.updateOne(
      { _id: event.id } as Partial<IStoredCalendarEvent>,
      { $set: setFields },
    );

    return encrypted;
  }

  /**
   * Delete a single occurrence by adding its date to the EXDATE list.
   *
   * @requirements 5.7
   */
  private async deleteSingleOccurrence(
    event: ITypedCalendarEvent,
  ): Promise<boolean> {
    const now = new Date();
    const calendarKey = await this.getCalendarKey(event.calendarId);
    const exdates = event.exdates
      ? [...event.exdates, event.dtstart]
      : [event.dtstart];

    const updatedEvent = await encryptEventBody(
      { ...event, exdates, sequence: event.sequence + 1, dateModified: now },
      calendarKey,
      this.encryptionService,
    );

    await this.calendarEventModel.updateOne(
      { _id: event.id } as Partial<IStoredCalendarEvent>,
      {
        $set: {
          encryptedBody: updatedEvent.encryptedBody,
          blockId: updatedEvent.blockId,
          sequence: updatedEvent.sequence,
          dateModified: now.toISOString(),
        } as Partial<IStoredCalendarEvent>,
      },
    );

    return true;
  }

  /**
   * Delete "this and future" by setting UNTIL on the rrule to before the
   * event's dtstart (the occurrence being deleted).
   *
   * @requirements 5.7
   */
  private async deleteThisAndFuture(
    event: ITypedCalendarEvent,
  ): Promise<boolean> {
    if (!event.rrule) {
      // Non-recurring: just delete
      await this.calendarEventModel.deleteOne({
        _id: event.id,
      } as Partial<IStoredCalendarEvent>);
      return true;
    }

    const now = new Date();
    const calendarKey = await this.getCalendarKey(event.calendarId);
    const updatedRrule = {
      ...event.rrule,
      until: new Date(event.dtstart.getTime() - 1).toISOString(),
      count: undefined,
    };

    const updatedEvent = await encryptEventBody(
      {
        ...event,
        rrule: updatedRrule,
        sequence: event.sequence + 1,
        dateModified: now,
      },
      calendarKey,
      this.encryptionService,
    );

    await this.calendarEventModel.updateOne(
      { _id: event.id } as Partial<IStoredCalendarEvent>,
      {
        $set: {
          encryptedBody: updatedEvent.encryptedBody,
          blockId: updatedEvent.blockId,
          sequence: updatedEvent.sequence,
          dateModified: now.toISOString(),
        } as Partial<IStoredCalendarEvent>,
      },
    );

    return true;
  }

  // ── Permission helpers ──────────────────────────────────────────────────

  /**
   * Assert that the user has at least the required permission level on a calendar.
   *
   * Permission hierarchy: Owner > Editor > Viewer > FreeBusyOnly
   *
   * @throws Error('FORBIDDEN') if the user lacks the required permission
   */
  private async assertPermission(
    calendarId: string,
    userId: string,
    requiredLevel: CalendarPermissionLevel,
  ): Promise<void> {
    const permission =
      await this.calendarPermissionService.getPermissionForUser(
        calendarId,
        userId,
      );

    if (!permission) {
      throw new Error('FORBIDDEN');
    }

    if (!this.hasAtLeastPermission(permission, requiredLevel)) {
      throw new Error('FORBIDDEN');
    }
  }

  /**
   * Check if the actual permission level meets or exceeds the required level.
   */
  private hasAtLeastPermission(
    actual: CalendarPermissionLevel,
    required: CalendarPermissionLevel,
  ): boolean {
    const hierarchy: CalendarPermissionLevel[] = [
      CalendarPermissionLevel.FreeBusyOnly,
      CalendarPermissionLevel.Viewer,
      CalendarPermissionLevel.Editor,
      CalendarPermissionLevel.Owner,
    ];

    const actualIndex = hierarchy.indexOf(actual);
    const requiredIndex = hierarchy.indexOf(required);
    return actualIndex >= requiredIndex;
  }
}
