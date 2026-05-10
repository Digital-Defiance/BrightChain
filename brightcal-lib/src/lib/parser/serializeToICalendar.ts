import { EventVisibility } from '../enums';
import {
  IAttendeeDTO,
  ICalendarEventDTO,
  IRecurrenceRule,
  IReminderDTO,
} from '../interfaces';

// ── Constants ────────────────────────────────────────────────────────

const CRLF = '\r\n';
const MAX_LINE_OCTETS = 75;
const PRODID = '-//BrightChain//BrightCal//EN';

// ── Line folding ─────────────────────────────────────────────────────

/**
 * Fold a content line so that no line exceeds 75 octets (bytes).
 * Continuation lines start with a single space per RFC 5545 §3.1.
 */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(line);

  if (bytes.length <= MAX_LINE_OCTETS) {
    return line;
  }

  const parts: string[] = [];
  let offset = 0;

  // First line: up to 75 octets
  let end = findUtf8CutPoint(line, offset, MAX_LINE_OCTETS);
  parts.push(line.substring(offset, end));
  offset = end;

  // Continuation lines: leading space counts as 1 octet, so 74 octets of content
  while (offset < line.length) {
    end = findUtf8CutPoint(line, offset, MAX_LINE_OCTETS - 1);
    parts.push(' ' + line.substring(offset, end));
    offset = end;
  }

  return parts.join(CRLF);
}

/**
 * Find the character index up to which the UTF-8 byte length from `start`
 * does not exceed `maxBytes`. Avoids splitting multi-byte characters.
 */
function findUtf8CutPoint(
  str: string,
  start: number,
  maxBytes: number,
): number {
  const encoder = new TextEncoder();
  let byteCount = 0;
  let i = start;

  while (i < str.length) {
    const charBytes = encoder.encode(str[i]).length;
    if (byteCount + charBytes > maxBytes) break;
    byteCount += charBytes;
    i++;
  }

  return i;
}

// ── Property serialization helpers ───────────────────────────────────

function emitLine(line: string): string {
  return foldLine(line) + CRLF;
}

/**
 * Serialize an RRULE from IRecurrenceRule back to iCalendar RRULE format.
 */
function serializeRRule(rule: IRecurrenceRule): string {
  const parts: string[] = [`FREQ=${rule.freq}`];

  if (rule.until !== undefined) parts.push(`UNTIL=${rule.until}`);
  if (rule.count !== undefined) parts.push(`COUNT=${rule.count}`);
  if (rule.interval !== undefined) parts.push(`INTERVAL=${rule.interval}`);
  if (rule.bySecond?.length) parts.push(`BYSECOND=${rule.bySecond.join(',')}`);
  if (rule.byMinute?.length) parts.push(`BYMINUTE=${rule.byMinute.join(',')}`);
  if (rule.byHour?.length) parts.push(`BYHOUR=${rule.byHour.join(',')}`);
  if (rule.byDay?.length) parts.push(`BYDAY=${rule.byDay.join(',')}`);
  if (rule.byMonthDay?.length)
    parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
  if (rule.byYearDay?.length)
    parts.push(`BYYEARDAY=${rule.byYearDay.join(',')}`);
  if (rule.byWeekNo?.length) parts.push(`BYWEEKNO=${rule.byWeekNo.join(',')}`);
  if (rule.byMonth?.length) parts.push(`BYMONTH=${rule.byMonth.join(',')}`);
  if (rule.bySetPos?.length) parts.push(`BYSETPOS=${rule.bySetPos.join(',')}`);
  if (rule.wkst) parts.push(`WKST=${rule.wkst}`);

  return parts.join(';');
}

/**
 * Convert triggerMinutesBefore to an iCalendar TRIGGER duration string.
 * Positive values → before event (negative duration), negative → after event.
 */
function serializeTrigger(minutesBefore: number): string {
  const negative = minutesBefore >= 0;
  const abs = Math.abs(minutesBefore);

  const days = Math.floor(abs / (24 * 60));
  const hours = Math.floor((abs % (24 * 60)) / 60);
  const mins = abs % 60;

  let dur = negative ? '-P' : 'P';

  if (days > 0) dur += `${days}D`;
  if (hours > 0 || mins > 0) {
    dur += 'T';
    if (hours > 0) dur += `${hours}H`;
    if (mins > 0) dur += `${mins}M`;
  }

  // Handle zero case
  if (dur === '-P' || dur === 'P') {
    dur = '-PT0M';
  }

  return dur;
}

/**
 * Serialize a VALARM component.
 */
function serializeAlarm(reminder: IReminderDTO): string {
  let out = '';
  out += emitLine('BEGIN:VALARM');
  out += emitLine(`ACTION:${reminder.action}`);
  out += emitLine(`TRIGGER:${serializeTrigger(reminder.triggerMinutesBefore)}`);
  if (reminder.duration) {
    out += emitLine(`DURATION:${reminder.duration}`);
  }
  if (reminder.repeat !== undefined) {
    out += emitLine(`REPEAT:${reminder.repeat}`);
  }
  out += emitLine('END:VALARM');
  return out;
}

/**
 * Serialize an attendee to an ATTENDEE property line.
 */
function serializeAttendee(attendee: IAttendeeDTO): string {
  const params: string[] = [];

  if (attendee.displayName) {
    params.push(`CN=${attendee.displayName}`);
  }
  params.push(`PARTSTAT=${attendee.partstat}`);
  params.push(`ROLE=${attendee.role}`);
  params.push(`RSVP=${attendee.rsvp ? 'TRUE' : 'FALSE'}`);

  return `ATTENDEE;${params.join(';')}:mailto:${attendee.email}`;
}

/**
 * Map EventVisibility enum to iCalendar CLASS property value.
 */
function visibilityToClass(vis: EventVisibility): string {
  switch (vis) {
    case EventVisibility.Private:
      return 'PRIVATE';
    case EventVisibility.Confidential:
      return 'CONFIDENTIAL';
    case EventVisibility.Public:
    default:
      return 'PUBLIC';
  }
}

/**
 * Serialize a single VEVENT component.
 */
function serializeEvent(event: ICalendarEventDTO): string {
  let out = '';
  out += emitLine('BEGIN:VEVENT');

  // Required properties
  out += emitLine(`UID:${event.uid}`);

  // DTSTART with TZID or VALUE=DATE for all-day
  if (event.allDay) {
    out += emitLine(`DTSTART;VALUE=DATE:${event.dtstart}`);
  } else if (event.dtstartTzid && event.dtstartTzid !== 'UTC') {
    out += emitLine(`DTSTART;TZID=${event.dtstartTzid}:${event.dtstart}`);
  } else {
    out += emitLine(`DTSTART:${event.dtstart}`);
  }

  // DTEND
  if (event.dtend) {
    if (event.allDay) {
      out += emitLine(`DTEND;VALUE=DATE:${event.dtend}`);
    } else if (event.dtendTzid && event.dtendTzid !== 'UTC') {
      out += emitLine(`DTEND;TZID=${event.dtendTzid}:${event.dtend}`);
    } else {
      out += emitLine(`DTEND:${event.dtend}`);
    }
  }

  out += emitLine(`SUMMARY:${event.summary}`);

  if (event.description) {
    out += emitLine(`DESCRIPTION:${event.description}`);
  }

  if (event.location) {
    out += emitLine(`LOCATION:${event.location}`);
  }

  out += emitLine(`SEQUENCE:${event.sequence}`);
  out += emitLine(`STATUS:${event.status}`);
  out += emitLine(`TRANSP:${event.transparency}`);
  out += emitLine(`CLASS:${visibilityToClass(event.visibility)}`);

  // Organizer
  if (event.organizerId) {
    out += emitLine(`ORGANIZER:mailto:${event.organizerId}`);
  }

  // Attendees
  for (const attendee of event.attendees) {
    out += emitLine(serializeAttendee(attendee));
  }

  // RRULE
  if (event.rrule) {
    out += emitLine(`RRULE:${serializeRRule(event.rrule)}`);
  }

  // EXDATE
  if (event.exdates && event.exdates.length > 0) {
    out += emitLine(`EXDATE:${event.exdates.join(',')}`);
  }

  // RDATE
  if (event.rdates && event.rdates.length > 0) {
    out += emitLine(`RDATE:${event.rdates.join(',')}`);
  }

  // RECURRENCE-ID
  if (event.recurrenceId) {
    out += emitLine(`RECURRENCE-ID:${event.recurrenceId}`);
  }

  // CATEGORIES
  if (event.categories && event.categories.length > 0) {
    out += emitLine(`CATEGORIES:${event.categories.join(',')}`);
  }

  // Timestamps
  if (event.dateCreated) {
    out += emitLine(`CREATED:${event.dateCreated}`);
  }
  if (event.dateModified) {
    out += emitLine(`LAST-MODIFIED:${event.dateModified}`);
  }

  // VALARM reminders
  for (const reminder of event.reminders) {
    out += serializeAlarm(reminder);
  }

  out += emitLine('END:VEVENT');
  return out;
}

// ── Main serializer ──────────────────────────────────────────────────

/**
 * Serialize internal event representations to valid RFC 5545 iCalendar format.
 *
 * Produces output wrapped in BEGIN:VCALENDAR / END:VCALENDAR with VERSION:2.0
 * and PRODID. Each event is serialized as a VEVENT component with proper
 * line folding (75 octet limit), CRLF line endings, and all standard properties.
 *
 * @param events - Array of calendar event DTOs to serialize
 * @returns Valid iCalendar string
 * @see Requirements 1.6, 1.7
 */
export function serializeToICalendar(events: ICalendarEventDTO[]): string {
  let out = '';
  out += emitLine('BEGIN:VCALENDAR');
  out += emitLine('VERSION:2.0');
  out += emitLine(`PRODID:${PRODID}`);

  for (const event of events) {
    out += serializeEvent(event);
  }

  out += emitLine('END:VCALENDAR');
  return out;
}
