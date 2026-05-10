import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ConflictSeverity, EventTransparency } from '../enums';
import { ICalendarEventDTO } from '../interfaces/calendarEventDto';
import { IConflictResult } from '../interfaces/conflictResult';

/**
 * Parse a datetime string (ISO or compact iCal) into a Date.
 */
function parseDate(iso: string): Date {
  const cleaned = iso.replace(/Z$/, '');
  if (/^\d{8}T\d{6}$/.test(cleaned)) {
    return new Date(
      parseInt(cleaned.slice(0, 4), 10),
      parseInt(cleaned.slice(4, 6), 10) - 1,
      parseInt(cleaned.slice(6, 8), 10),
      parseInt(cleaned.slice(9, 11), 10),
      parseInt(cleaned.slice(11, 13), 10),
      parseInt(cleaned.slice(13, 15), 10),
    );
  }
  if (/^\d{8}$/.test(cleaned)) {
    return new Date(
      parseInt(cleaned.slice(0, 4), 10),
      parseInt(cleaned.slice(4, 6), 10) - 1,
      parseInt(cleaned.slice(6, 8), 10),
    );
  }
  const parts = cleaned.split('T');
  const dp = parts[0].split('-').map(Number);
  if (parts.length === 1) return new Date(dp[0], dp[1] - 1, dp[2]);
  const tp = parts[1].split(':').map((p) => parseInt(p, 10));
  return new Date(dp[0], dp[1] - 1, dp[2], tp[0] || 0, tp[1] || 0, tp[2] || 0);
}

/**
 * Format a Date as ISO 8601 local datetime string.
 */
function formatDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/**
 * Determine the effective end time for an event.
 * If dtend is not set, uses dtstart (zero-duration event).
 * For all-day events without dtend, assumes end of day.
 */
function getEffectiveEnd<TID extends PlatformID = string>(
  event: ICalendarEventDTO<TID>,
): Date {
  if (event.dtend) {
    return parseDate(event.dtend);
  }
  const start = parseDate(event.dtstart);
  if (event.allDay) {
    // All-day events without dtend span the entire day
    return new Date(
      start.getFullYear(),
      start.getMonth(),
      start.getDate(),
      23,
      59,
      59,
    );
  }
  return start;
}

/**
 * Classify the severity of a conflict between two events.
 *
 * - Hard: both events are CONFIRMED and OPAQUE (require attendance)
 * - Soft: one event is TENTATIVE or TRANSPARENT
 * - Informational: one is all-day and the other is timed
 */
function classifySeverity<TID extends PlatformID = string>(
  a: ICalendarEventDTO<TID>,
  b: ICalendarEventDTO<TID>,
): ConflictSeverity {
  // Informational: all-day vs timed
  if (a.allDay !== b.allDay) {
    return ConflictSeverity.Informational;
  }

  // Soft: one is tentative or transparent
  if (
    a.status === 'TENTATIVE' ||
    b.status === 'TENTATIVE' ||
    a.transparency === EventTransparency.Transparent ||
    b.transparency === EventTransparency.Transparent
  ) {
    return ConflictSeverity.Soft;
  }

  // Hard: both confirmed and opaque
  return ConflictSeverity.Hard;
}

/**
 * Detect scheduling conflicts between a candidate event and existing events.
 *
 * Events with TRANSP=TRANSPARENT are excluded from conflict detection entirely.
 * The candidate event itself is also excluded if transparent.
 *
 * @param candidate - The event to check for conflicts
 * @param existingEvents - The set of existing events to check against
 * @returns Array of conflict results, empty if no conflicts
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.5
 */
export function detectConflicts<TID extends PlatformID = string>(
  candidate: ICalendarEventDTO<TID>,
  existingEvents: ICalendarEventDTO<TID>[],
): IConflictResult<TID>[] {
  // Transparent candidate never conflicts
  if (candidate.transparency === EventTransparency.Transparent) {
    return [];
  }

  const candidateStart = parseDate(candidate.dtstart);
  const candidateEnd = getEffectiveEnd(candidate);
  const results: IConflictResult<TID>[] = [];

  for (const existing of existingEvents) {
    // Skip transparent events
    if (existing.transparency === EventTransparency.Transparent) {
      continue;
    }

    // Skip self-comparison
    if (existing.uid === candidate.uid) {
      continue;
    }

    const existingStart = parseDate(existing.dtstart);
    const existingEnd = getEffectiveEnd(existing);

    // Check for time overlap: A starts before B ends AND B starts before A ends
    if (candidateStart < existingEnd && existingStart < candidateEnd) {
      const overlapStart =
        candidateStart > existingStart ? candidateStart : existingStart;
      const overlapEnd =
        candidateEnd < existingEnd ? candidateEnd : existingEnd;

      const severity = classifySeverity(candidate, existing);

      results.push({
        eventA: {
          id: candidate.id as TID,
          summary: candidate.summary,
          start: candidate.dtstart,
          end: candidate.dtend ?? candidate.dtstart,
          calendarId: candidate.calendarId,
        },
        eventB: {
          id: existing.id as TID,
          summary: existing.summary,
          start: existing.dtstart,
          end: existing.dtend ?? existing.dtstart,
          calendarId: existing.calendarId,
        },
        severity,
        overlapStart: formatDate(overlapStart),
        overlapEnd: formatDate(overlapEnd),
      });
    }
  }

  return results;
}
