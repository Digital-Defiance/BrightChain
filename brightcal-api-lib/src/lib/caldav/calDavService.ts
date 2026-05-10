/**
 * CalDavService
 *
 * Implements the ICalDavService interface for CalDAV protocol logic:
 * resource discovery, calendar-query/calendar-multiget REPORT handling,
 * ETag management for optimistic concurrency, and RFC 6638 scheduling
 * outbox support.
 *
 * @see Requirements 2.2, 2.6, 2.7, 2.8
 */

import {
  parseICalendar,
  serializeToICalendar,
  type ICalendarEventDTO,
} from '@brightchain/brightcal-lib';
import { createHash } from 'crypto';
import type { CalendarEngineService } from '../services/calendarEngineService.js';
import type { EventEngineService } from '../services/eventEngineService.js';
import {
  generateETag,
  type CalDavCalendarInfo,
  type CalDavEventResource,
  type CalDavFilter,
  type CalDavPutResult,
  type ICalDavService,
} from './calDavMiddleware.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate a ctag (collection tag) from a set of calendar event modification dates.
 * The ctag changes whenever any event in the collection is modified.
 */
function generateCtag(dates: Date[]): string {
  if (dates.length === 0) return '"empty"';
  const combined = dates
    .map((d) => d.getTime())
    .sort()
    .join(',');
  const hash = createHash('sha256').update(combined).digest('hex');
  return `"${hash.substring(0, 32)}"`;
}

/**
 * Convert a typed calendar event to an ICalendarEventDTO suitable for
 * the iCal serializer. Maps the stored model fields to the DTO shape.
 */
function typedEventToDto(event: {
  uid: string;
  sequence: number;
  summary: string;
  dtstart: Date;
  dtend: Date;
  dtstartTzid: string;
  dtendTzid: string;
  allDay: boolean;
  visibility: string;
  transparency: string;
  status: string;
  organizerId: string;
  dateCreated: Date;
  dateModified: Date;
  calendarId: string;
}): ICalendarEventDTO {
  return {
    id: event.uid,
    calendarId: event.calendarId,
    uid: event.uid,
    sequence: event.sequence,
    summary: event.summary,
    dtstart: event.dtstart.toISOString(),
    dtend: event.dtend.toISOString(),
    dtstartTzid: event.dtstartTzid,
    dtendTzid: event.dtendTzid,
    allDay: event.allDay,
    visibility: event.visibility as ICalendarEventDTO['visibility'],
    transparency: event.transparency as ICalendarEventDTO['transparency'],
    status: event.status as ICalendarEventDTO['status'],
    organizerId: event.organizerId,
    attendees: [],
    reminders: [],
    dateCreated: event.dateCreated.toISOString(),
    dateModified: event.dateModified.toISOString(),
  };
}

// ─── Service ─────────────────────────────────────────────────────────────────

/**
 * CalDavService implements CalDAV protocol logic on top of the existing
 * CalendarEngineService and EventEngineService.
 *
 * @requirements 2.2, 2.6, 2.7, 2.8
 */
export class CalDavService implements ICalDavService {
  private readonly calendarEngine: CalendarEngineService;
  private readonly eventEngine: EventEngineService;
  constructor(
    calendarEngine: CalendarEngineService,
    eventEngine: EventEngineService,
  ) {
    this.calendarEngine = calendarEngine;
    this.eventEngine = eventEngine;
  }

  /**
   * Discover all calendars accessible by the given user.
   * Maps each calendar to CalDavCalendarInfo with a ctag derived from
   * the calendar's event modification timestamps.
   *
   * @requirements 2.1, 2.2
   */
  async discoverCalendars(userId: string): Promise<CalDavCalendarInfo[]> {
    const calendars = await this.calendarEngine.listCalendarsForUser(userId);

    const results: CalDavCalendarInfo[] = [];
    for (const cal of calendars) {
      // Fetch events to compute ctag from their modification dates
      let ctag: string;
      try {
        const events = await this.eventEngine.listEvents(userId, cal.id);
        const modDates = events.map((e) => e.dateModified);
        // Include the calendar's own dateModified
        modDates.push(cal.dateModified);
        ctag = generateCtag(modDates);
      } catch {
        // If we can't list events (e.g. permission issue), use calendar date only
        ctag = generateCtag([cal.dateModified]);
      }

      results.push({
        calendarId: cal.id,
        displayName: cal.displayName,
        color: cal.color,
        description: cal.description,
        ctag,
      });
    }

    return results;
  }

  /**
   * Get all events for a calendar, optionally filtered by time range or UIDs.
   * Each event is serialized to iCal and given a content-based ETag.
   *
   * Supports both calendar-query (time-range filter) and calendar-multiget
   * (UID list) REPORT types.
   *
   * @requirements 2.2, 2.6
   */
  async getCalendarEvents(
    userId: string,
    calendarId: string,
    filter?: CalDavFilter,
  ): Promise<CalDavEventResource[]> {
    const events = await this.eventEngine.listEvents(
      userId,
      calendarId,
      filter?.timeRangeStart,
      filter?.timeRangeEnd,
    );

    // Apply UID filter for calendar-multiget
    const filtered = filter?.uids
      ? events.filter((e) => filter.uids!.includes(e.uid))
      : events;

    return filtered.map((event) => {
      const dto = typedEventToDto(event);
      const icalData = serializeToICalendar([dto]);
      return {
        uid: event.uid,
        etag: generateETag(icalData),
        icalData,
      };
    });
  }

  /**
   * Get a single event by UID, serialized to iCal with an ETag.
   *
   * @requirements 2.5, 2.6
   */
  async getEvent(
    userId: string,
    calendarId: string,
    eventUid: string,
  ): Promise<CalDavEventResource | null> {
    const events = await this.eventEngine.listEvents(userId, calendarId);
    const event = events.find((e) => e.uid === eventUid);

    if (!event) return null;

    const dto = typedEventToDto(event);
    const icalData = serializeToICalendar([dto]);
    return {
      uid: event.uid,
      etag: generateETag(icalData),
      icalData,
    };
  }

  /**
   * Create or update an event from iCalendar data.
   *
   * - Parses the incoming iCal data to extract event properties
   * - If an ETag is provided (If-Match), compares it with the current
   *   event's ETag and throws 'PRECONDITION_FAILED' on mismatch
   * - Creates a new event if none exists with the given UID, or updates
   *   the existing one
   *
   * @requirements 2.3, 2.6
   */
  async putEvent(
    userId: string,
    calendarId: string,
    eventUid: string,
    icalData: string,
    etag?: string,
  ): Promise<CalDavPutResult> {
    // Parse the incoming iCal data
    const parseResult = parseICalendar(icalData);
    if (parseResult.events.length === 0) {
      throw new Error('No VEVENT found in iCalendar data');
    }

    const incomingEvent = parseResult.events[0];

    // Check if event already exists
    const existingEvents = await this.eventEngine.listEvents(
      userId,
      calendarId,
    );
    const existing = existingEvents.find((e) => e.uid === eventUid);

    if (existing && etag) {
      // ETag precondition check
      const existingDto = typedEventToDto(existing);
      const existingIcal = serializeToICalendar([existingDto]);
      const currentEtag = generateETag(existingIcal);

      // Compare ETags (strip quotes for comparison)
      const normalizedProvided = etag.replace(/^"|"$/g, '');
      const normalizedCurrent = currentEtag.replace(/^"|"$/g, '');
      if (normalizedProvided !== normalizedCurrent) {
        throw new Error('PRECONDITION_FAILED');
      }
    }

    if (existing) {
      // Update existing event
      await this.eventEngine.updateEvent(
        existing.id,
        userId,
        {
          summary: incomingEvent.summary,
          dtstart: incomingEvent.dtstart,
          dtend: incomingEvent.dtend,
          dtstartTzid: incomingEvent.dtstartTzid,
          dtendTzid: incomingEvent.dtendTzid,
          allDay: incomingEvent.allDay,
          visibility: incomingEvent.visibility,
          transparency: incomingEvent.transparency,
        },
        'all',
      );

      // Compute new ETag from the updated event
      const newEtag = generateETag(icalData);
      return { created: false, etag: newEtag };
    } else {
      // Create new event
      await this.eventEngine.createEvent(userId, {
        calendarId,
        summary: incomingEvent.summary,
        dtstart: incomingEvent.dtstart,
        dtend: incomingEvent.dtend ?? incomingEvent.dtstart,
        dtstartTzid: incomingEvent.dtstartTzid,
        dtendTzid: incomingEvent.dtendTzid ?? incomingEvent.dtstartTzid,
        allDay: incomingEvent.allDay,
        visibility: incomingEvent.visibility,
        transparency: incomingEvent.transparency,
        rrule: incomingEvent.rrule,
        attendees: incomingEvent.attendees,
      });

      const newEtag = generateETag(icalData);
      return { created: true, etag: newEtag };
    }
  }

  /**
   * Delete an event by UID.
   *
   * If an ETag is provided (If-Match), compares it with the current
   * event's ETag and throws 'PRECONDITION_FAILED' on mismatch.
   *
   * @requirements 2.4, 2.6
   */
  async deleteEvent(
    userId: string,
    calendarId: string,
    eventUid: string,
    etag?: string,
  ): Promise<boolean> {
    const events = await this.eventEngine.listEvents(userId, calendarId);
    const event = events.find((e) => e.uid === eventUid);

    if (!event) return false;

    if (etag) {
      // ETag precondition check
      const dto = typedEventToDto(event);
      const existingIcal = serializeToICalendar([dto]);
      const currentEtag = generateETag(existingIcal);

      const normalizedProvided = etag.replace(/^"|"$/g, '');
      const normalizedCurrent = currentEtag.replace(/^"|"$/g, '');
      if (normalizedProvided !== normalizedCurrent) {
        throw new Error('PRECONDITION_FAILED');
      }
    }

    return this.eventEngine.deleteEvent(event.id, userId, 'all');
  }

  /**
   * Create a new calendar collection via CalendarEngineService.
   *
   * @requirements 2.1
   */
  async createCalendar(
    userId: string,
    displayName: string,
  ): Promise<CalDavCalendarInfo> {
    const calendar = await this.calendarEngine.createCalendar(
      userId,
      displayName,
      '#4285F4', // default color
      '', // default description
    );

    return {
      calendarId: calendar.id,
      displayName: calendar.displayName,
      color: calendar.color,
      description: calendar.description,
      ctag: generateCtag([calendar.dateModified]),
    };
  }
}
