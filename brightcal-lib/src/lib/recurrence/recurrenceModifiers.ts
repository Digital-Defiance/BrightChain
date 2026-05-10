import { ICalendarEventDTO } from '../interfaces/calendarEventDto';
import { IRecurrenceRule } from '../interfaces/recurrenceRule';

/**
 * Modify a single occurrence of a recurring event.
 * Creates a RECURRENCE-ID exception for that occurrence while preserving
 * the parent event's RRULE unchanged.
 *
 * @param parentEvent - The recurring parent event
 * @param occurrenceDate - ISO 8601 datetime of the occurrence to modify
 * @param modifications - Partial event fields to override on the exception
 * @returns A tuple of [updatedParent, exceptionEvent]
 *
 * @see Requirements 5.5, Property 6
 */
export function modifySingleOccurrence(
  parentEvent: ICalendarEventDTO,
  occurrenceDate: string,
  modifications: Partial<
    Pick<
      ICalendarEventDTO,
      'summary' | 'description' | 'location' | 'dtstart' | 'dtend'
    >
  >,
): [ICalendarEventDTO, ICalendarEventDTO] {
  // Parent remains unchanged (RRULE intact, no EXDATE added for modifications)
  const updatedParent: ICalendarEventDTO = { ...parentEvent };

  // Create exception instance with RECURRENCE-ID
  const exception: ICalendarEventDTO = {
    ...parentEvent,
    ...modifications,
    recurrenceId: occurrenceDate,
    // Exception instances do not carry the parent's RRULE
    rrule: undefined,
    exdates: undefined,
    rdates: undefined,
  };

  return [updatedParent, exception];
}

/**
 * Split a recurring event at a given occurrence ("this and future" modification).
 * The original series gets an UNTIL date before the split point, and a new series
 * starts at the split point with its own RRULE.
 *
 * @param parentEvent - The recurring parent event
 * @param splitDate - ISO 8601 datetime of the occurrence at which to split
 * @param modifications - Optional modifications to apply to the new series
 * @returns A tuple of [originalSeriesWithUntil, newSeries]
 *
 * @see Requirements 5.6, Property 7
 */
export function splitRecurrence(
  parentEvent: ICalendarEventDTO,
  splitDate: string,
  modifications?: Partial<
    Pick<
      ICalendarEventDTO,
      'summary' | 'description' | 'location' | 'dtstart' | 'dtend'
    >
  >,
): [ICalendarEventDTO, ICalendarEventDTO] {
  if (!parentEvent.rrule) {
    throw new Error('Cannot split a non-recurring event');
  }

  // Compute the UNTIL date: one second before the split point
  // This ensures the original series ends just before the split occurrence
  const splitMs = parseSplitDate(splitDate);
  const untilDate = new Date(splitMs - 1000);
  const untilStr = formatCompactDate(untilDate);

  // Original series: set UNTIL to just before split point
  // Remove any existing COUNT since we're using UNTIL now
  const originalRrule: IRecurrenceRule = {
    ...parentEvent.rrule,
    until: untilStr,
    count: undefined,
  };

  const originalSeries: ICalendarEventDTO = {
    ...parentEvent,
    rrule: originalRrule,
  };

  // New series: starts at split point with same RRULE (minus UNTIL/COUNT from original)
  const newRrule: IRecurrenceRule = {
    ...parentEvent.rrule,
  };
  // If the original had UNTIL, keep it for the new series
  // If the original had COUNT, we can't easily compute remaining count,
  // so we keep the original RRULE as-is (the new series inherits the rule)

  const newSeries: ICalendarEventDTO = {
    ...parentEvent,
    ...(modifications || {}),
    dtstart: splitDate,
    rrule: newRrule,
    // New UID should be assigned by the caller; we keep the same for now
    // to allow the caller to assign a new one
    recurrenceId: undefined,
    exdates: undefined,
    rdates: undefined,
  };

  // Compute dtend for new series if original had duration
  if (parentEvent.dtend) {
    const origStart = parseSplitDate(parentEvent.dtstart);
    const origEnd = parseSplitDate(parentEvent.dtend);
    const duration = origEnd - origStart;
    const newEnd = new Date(splitMs + duration);
    newSeries.dtend = formatIsoDate(newEnd);
  }

  return [originalSeries, newSeries];
}

/**
 * Delete a single occurrence of a recurring event by adding an EXDATE.
 * The series continues to produce all other occurrences.
 *
 * @param parentEvent - The recurring parent event
 * @param occurrenceDate - ISO 8601 datetime of the occurrence to delete
 * @returns The updated parent event with the EXDATE added
 *
 * @see Requirements 5.7, Property 8
 */
export function deleteSingleOccurrence(
  parentEvent: ICalendarEventDTO,
  occurrenceDate: string,
): ICalendarEventDTO {
  const existingExdates = parentEvent.exdates ? [...parentEvent.exdates] : [];
  existingExdates.push(occurrenceDate);

  return {
    ...parentEvent,
    exdates: existingExdates,
  };
}

// ── Internal helpers ─────────────────────────────────────────────────

function parseSplitDate(iso: string): number {
  const cleaned = iso.replace(/Z$/, '');

  // Compact iCal format: 20240315T090000
  if (/^\d{8}T\d{6}$/.test(cleaned)) {
    const y = parseInt(cleaned.slice(0, 4), 10);
    const m = parseInt(cleaned.slice(4, 6), 10) - 1;
    const d = parseInt(cleaned.slice(6, 8), 10);
    const h = parseInt(cleaned.slice(9, 11), 10);
    const min = parseInt(cleaned.slice(11, 13), 10);
    const s = parseInt(cleaned.slice(13, 15), 10);
    return new Date(y, m, d, h, min, s).getTime();
  }

  // Standard ISO format
  const parts = cleaned.split('T');
  const dateParts = parts[0].split('-').map(Number);
  if (parts.length === 1) {
    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2]).getTime();
  }
  const timeParts = parts[1].split(':').map((p) => parseInt(p, 10));
  return new Date(
    dateParts[0],
    dateParts[1] - 1,
    dateParts[2],
    timeParts[0] || 0,
    timeParts[1] || 0,
    timeParts[2] || 0,
  ).getTime();
}

function formatCompactDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}` +
    `T${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  );
}

function formatIsoDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
