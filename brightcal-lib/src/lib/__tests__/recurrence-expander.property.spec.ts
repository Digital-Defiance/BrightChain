/**
 * Property-Based Tests for Recurrence Expansion
 *
 * Feature: brightcal-shared-calendar
 * Properties 3-9: Recurrence expansion correctness
 *
 * Tests cover:
 * - Property 3: Recurrence Expansion Respects Limits (UNTIL/COUNT)
 * - Property 4: EXDATE Exclusions Remove Occurrences
 * - Property 5: RDATE Additions Include Occurrences
 * - Property 6: Single Occurrence Modification Preserves Parent Rule
 * - Property 7: This-and-Future Split Produces Two Valid Series
 * - Property 8: Single Occurrence Deletion Adds EXDATE
 * - Property 9: DST-Correct Recurrence Expansion
 */
import * as fc from 'fast-check';
import {
  EventTransparency,
  EventVisibility,
  RecurrenceFrequency,
} from '../enums';
import type { ICalendarEventDTO, IRecurrenceRule } from '../interfaces';
import { expandRecurrence } from '../recurrence/expandRecurrence';
import {
  deleteSingleOccurrence,
  modifySingleOccurrence,
  splitRecurrence,
} from '../recurrence/recurrenceModifiers';

// ── Test Helpers ─────────────────────────────────────────────────────

/** Pad number to 2 digits */
const pad2 = (n: number) => n.toString().padStart(2, '0');

/** Format a Date as ISO 8601 local datetime */
function formatLocal(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

/** Format a Date as compact iCal datetime (for UNTIL values) */
function formatCompact(d: Date): string {
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  );
}

/** Parse an ISO or compact datetime string to Date */
function parseDate(s: string): Date {
  const cleaned = s.replace(/Z$/, '');
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
  const parts = cleaned.split('T');
  const dp = parts[0].split('-').map(Number);
  if (parts.length === 1) return new Date(dp[0], dp[1] - 1, dp[2]);
  const tp = parts[1].split(':').map((p) => parseInt(p, 10));
  return new Date(dp[0], dp[1] - 1, dp[2], tp[0] || 0, tp[1] || 0, tp[2] || 0);
}

/** Create a minimal recurring event for testing */
function makeRecurringEvent(
  overrides: Partial<ICalendarEventDTO> & {
    dtstart: string;
    rrule: IRecurrenceRule;
  },
): ICalendarEventDTO {
  const { dtstart, dtend, dtstartTzid, ...rest } = overrides;
  return {
    id: 'test-event-1',
    calendarId: 'cal-1',
    uid: 'uid-test-1',
    sequence: 0,
    summary: 'Test Event',
    dtstart,
    dtend,
    dtstartTzid: dtstartTzid ?? 'America/New_York',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    status: 'CONFIRMED' as const,
    organizerId: 'org-1',
    attendees: [],
    reminders: [],
    dateCreated: '2024-01-01T00:00:00',
    dateModified: '2024-01-01T00:00:00',
    ...rest,
  };
}

// ── Arbitraries ──────────────────────────────────────────────────────

/** Generate a date in 2025 for testing */
const arbStartDate = fc
  .record({
    month: fc.integer({ min: 1, max: 10 }), // leave room for expansion
    day: fc.integer({ min: 1, max: 28 }),
    hour: fc.integer({ min: 8, max: 18 }),
    minute: fc.constantFrom(0, 15, 30, 45),
  })
  .map(({ month, day, hour, minute }) => {
    const d = new Date(2025, month - 1, day, hour, minute, 0);
    return formatLocal(d);
  });

/** Generate a COUNT value */
const arbCount = fc.integer({ min: 1, max: 20 });

/** Generate a simple recurrence frequency (DAILY, WEEKLY, MONTHLY) */
const arbSimpleFreq = fc.constantFrom(
  RecurrenceFrequency.Daily,
  RecurrenceFrequency.Weekly,
  RecurrenceFrequency.Monthly,
);

/** Generate interval */
const arbInterval = fc.integer({ min: 1, max: 4 });

// ── Property 3: Recurrence Expansion Respects Limits ─────────────────

describe('Feature: brightcal-shared-calendar, Property 3: Recurrence Expansion Respects Limits', () => {
  it('should never produce occurrences exceeding COUNT', () => {
    fc.assert(
      fc.property(
        arbStartDate,
        arbCount,
        arbSimpleFreq,
        arbInterval,
        (dtstart, count, freq, interval) => {
          const rrule: IRecurrenceRule = { freq, count, interval };
          const event = makeRecurringEvent({ dtstart, rrule });

          // Use a very wide window to not limit by window
          const windowStart = '2024-01-01T00:00:00';
          const windowEnd = '2030-12-31T23:59:59';

          const occurrences = expandRecurrence(
            event,
            windowStart,
            windowEnd,
            'UTC',
          );
          expect(occurrences.length).toBeLessThanOrEqual(count);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });

  it('should never produce occurrences beyond UNTIL date', () => {
    fc.assert(
      fc.property(
        arbStartDate,
        arbSimpleFreq,
        arbInterval,
        fc.integer({ min: 5, max: 60 }), // days until UNTIL
        (dtstart, freq, interval, daysUntil) => {
          const startDate = parseDate(dtstart);
          const untilDate = new Date(
            startDate.getTime() + daysUntil * 86400000,
          );
          const untilStr = formatCompact(untilDate);

          const rrule: IRecurrenceRule = { freq, interval, until: untilStr };
          const event = makeRecurringEvent({ dtstart, rrule });

          const windowStart = '2024-01-01T00:00:00';
          const windowEnd = '2030-12-31T23:59:59';

          const occurrences = expandRecurrence(
            event,
            windowStart,
            windowEnd,
            'UTC',
          );

          for (const occ of occurrences) {
            const occDate = parseDate(occ.dtstart);
            expect(occDate.getTime()).toBeLessThanOrEqual(untilDate.getTime());
          }
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });
});

// ── Property 4: EXDATE Exclusions Remove Occurrences ─────────────────

describe('Feature: brightcal-shared-calendar, Property 4: EXDATE Exclusions Remove Occurrences', () => {
  it('should not contain any excluded dates in the expanded set', () => {
    fc.assert(
      fc.property(
        arbStartDate,
        fc.integer({ min: 3, max: 10 }), // count
        arbInterval,
        (dtstart, count, interval) => {
          // Create a DAILY recurring event
          const rrule: IRecurrenceRule = {
            freq: RecurrenceFrequency.Daily,
            count,
            interval,
          };
          const eventNoExdates = makeRecurringEvent({ dtstart, rrule });

          const windowStart = '2024-01-01T00:00:00';
          const windowEnd = '2030-12-31T23:59:59';

          // First expand without exdates to get all occurrences
          const allOccurrences = expandRecurrence(
            eventNoExdates,
            windowStart,
            windowEnd,
            'UTC',
          );

          if (allOccurrences.length < 2) return; // Need at least 2 to exclude one

          // Pick a random occurrence to exclude (not the first one for simplicity)
          const exdateIdx = Math.min(1, allOccurrences.length - 1);
          const exdateValue = allOccurrences[exdateIdx].dtstart;

          // Now create event with that EXDATE
          const eventWithExdate = makeRecurringEvent({
            dtstart,
            rrule,
            exdates: [exdateValue],
          });

          const filtered = expandRecurrence(
            eventWithExdate,
            windowStart,
            windowEnd,
            'UTC',
          );

          // The excluded date should not appear
          const filteredStarts = filtered.map((o) => o.dtstart);
          expect(filteredStarts).not.toContain(exdateValue);

          // And we should have one fewer occurrence
          expect(filtered.length).toBe(allOccurrences.length - 1);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });
});

// ── Property 5: RDATE Additions Include Occurrences ──────────────────

describe('Feature: brightcal-shared-calendar, Property 5: RDATE Additions Include Occurrences', () => {
  it('should include all RDATE dates in the expanded set within the window', () => {
    fc.assert(
      fc.property(
        arbStartDate,
        fc.integer({ min: 2, max: 5 }), // count
        (dtstart, count) => {
          const rrule: IRecurrenceRule = {
            freq: RecurrenceFrequency.Daily,
            count,
            interval: 1,
          };

          // Create an RDATE that is NOT a regular occurrence
          // Add 100 days (well beyond the COUNT limit for daily)
          const startDate = parseDate(dtstart);
          const rdateDate = new Date(startDate.getTime() + 100 * 86400000);
          const rdateStr = formatLocal(rdateDate);

          const event = makeRecurringEvent({
            dtstart,
            rrule,
            rdates: [rdateStr],
          });

          const windowStart = '2024-01-01T00:00:00';
          const windowEnd = '2030-12-31T23:59:59';

          const occurrences = expandRecurrence(
            event,
            windowStart,
            windowEnd,
            'UTC',
          );
          const starts = occurrences.map((o) => o.dtstart);

          // The RDATE should be present
          expect(starts).toContain(rdateStr);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });
});

// ── Property 6: Single Occurrence Modification Preserves Parent Rule ─

describe('Feature: brightcal-shared-calendar, Property 6: Single Occurrence Modification Preserves Parent Rule', () => {
  it('should create RECURRENCE-ID exception while parent RRULE remains unchanged', () => {
    fc.assert(
      fc.property(
        arbStartDate,
        fc.integer({ min: 3, max: 10 }),
        arbInterval,
        fc.constantFrom('Modified Meeting', 'Updated Event', 'Changed Title'),
        (dtstart, count, interval, newSummary) => {
          const rrule: IRecurrenceRule = {
            freq: RecurrenceFrequency.Daily,
            count,
            interval,
          };
          const event = makeRecurringEvent({ dtstart, rrule });

          // Get occurrences to pick one to modify
          const windowStart = '2024-01-01T00:00:00';
          const windowEnd = '2030-12-31T23:59:59';
          const occurrences = expandRecurrence(
            event,
            windowStart,
            windowEnd,
            'UTC',
          );

          if (occurrences.length < 2) return;

          // Modify the second occurrence
          const occDate = occurrences[1].dtstart;
          const [updatedParent, exception] = modifySingleOccurrence(
            event,
            occDate,
            { summary: newSummary },
          );

          // Parent RRULE must be unchanged
          expect(updatedParent.rrule).toEqual(event.rrule);
          expect(updatedParent.dtstart).toBe(event.dtstart);
          expect(updatedParent.summary).toBe(event.summary);

          // Exception must have RECURRENCE-ID set
          expect(exception.recurrenceId).toBe(occDate);
          expect(exception.summary).toBe(newSummary);

          // Exception must NOT carry the parent's RRULE
          expect(exception.rrule).toBeUndefined();

          // Other occurrences from parent should be unaffected
          const parentOccurrences = expandRecurrence(
            updatedParent,
            windowStart,
            windowEnd,
            'UTC',
          );
          expect(parentOccurrences.length).toBe(occurrences.length);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });
});

// ── Property 7: This-and-Future Split Produces Two Valid Series ──────

describe('Feature: brightcal-shared-calendar, Property 7: This-and-Future Split Produces Two Valid Series', () => {
  it('should split into two series where original has UNTIL before split and new starts at split', () => {
    fc.assert(
      fc.property(
        arbStartDate,
        fc.integer({ min: 5, max: 15 }), // count - need enough to split
        (dtstart, count) => {
          const rrule: IRecurrenceRule = {
            freq: RecurrenceFrequency.Daily,
            count,
            interval: 1,
          };
          const event = makeRecurringEvent({
            dtstart,
            rrule,
            dtend: formatLocal(
              new Date(parseDate(dtstart).getTime() + 3600000),
            ), // 1 hour duration
          });

          // Get all occurrences
          const windowStart = '2024-01-01T00:00:00';
          const windowEnd = '2030-12-31T23:59:59';
          const allOccurrences = expandRecurrence(
            event,
            windowStart,
            windowEnd,
            'UTC',
          );

          if (allOccurrences.length < 3) return;

          // Split at the middle occurrence
          const splitIdx = Math.floor(allOccurrences.length / 2);
          const splitDate = allOccurrences[splitIdx].dtstart;

          const [originalSeries, newSeries] = splitRecurrence(event, splitDate);

          // Original series should have UNTIL set
          expect(originalSeries.rrule).toBeDefined();
          expect(originalSeries.rrule!.until).toBeDefined();
          expect(originalSeries.rrule!.count).toBeUndefined();

          // Original series UNTIL should be before the split point
          const untilDate = parseDate(originalSeries.rrule!.until!);
          const splitDateParsed = parseDate(splitDate);
          expect(untilDate.getTime()).toBeLessThan(splitDateParsed.getTime());

          // New series should start at the split point
          expect(newSeries.dtstart).toBe(splitDate);

          // New series should have an RRULE
          expect(newSeries.rrule).toBeDefined();
          expect(newSeries.rrule!.freq).toBe(rrule.freq);

          // Expand both series
          const origOccurrences = expandRecurrence(
            originalSeries,
            windowStart,
            windowEnd,
            'UTC',
          );
          const newOccurrences = expandRecurrence(
            newSeries,
            windowStart,
            windowEnd,
            'UTC',
          );

          // All original series occurrences should be before split
          for (const occ of origOccurrences) {
            expect(parseDate(occ.dtstart).getTime()).toBeLessThan(
              splitDateParsed.getTime(),
            );
          }

          // All new series occurrences should be at or after split
          for (const occ of newOccurrences) {
            expect(parseDate(occ.dtstart).getTime()).toBeGreaterThanOrEqual(
              splitDateParsed.getTime(),
            );
          }
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });
});

// ── Property 8: Single Occurrence Deletion Adds EXDATE ───────────────

describe('Feature: brightcal-shared-calendar, Property 8: Single Occurrence Deletion Adds EXDATE', () => {
  it('should add EXDATE and series continues producing all other occurrences', () => {
    fc.assert(
      fc.property(
        arbStartDate,
        fc.integer({ min: 3, max: 10 }),
        arbInterval,
        (dtstart, count, interval) => {
          const rrule: IRecurrenceRule = {
            freq: RecurrenceFrequency.Daily,
            count,
            interval,
          };
          const event = makeRecurringEvent({ dtstart, rrule });

          const windowStart = '2024-01-01T00:00:00';
          const windowEnd = '2030-12-31T23:59:59';

          const allOccurrences = expandRecurrence(
            event,
            windowStart,
            windowEnd,
            'UTC',
          );

          if (allOccurrences.length < 2) return;

          // Delete the second occurrence
          const deleteDate = allOccurrences[1].dtstart;
          const updatedEvent = deleteSingleOccurrence(event, deleteDate);

          // EXDATE should be added
          expect(updatedEvent.exdates).toBeDefined();
          expect(updatedEvent.exdates).toContain(deleteDate);

          // RRULE should be unchanged
          expect(updatedEvent.rrule).toEqual(event.rrule);

          // Expand updated event
          const remainingOccurrences = expandRecurrence(
            updatedEvent,
            windowStart,
            windowEnd,
            'UTC',
          );

          // Should have one fewer occurrence
          expect(remainingOccurrences.length).toBe(allOccurrences.length - 1);

          // The deleted date should not appear
          const remainingStarts = remainingOccurrences.map((o) => o.dtstart);
          expect(remainingStarts).not.toContain(deleteDate);

          // All other occurrences should still be present
          for (const occ of allOccurrences) {
            if (occ.dtstart !== deleteDate) {
              expect(remainingStarts).toContain(occ.dtstart);
            }
          }
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });
});

// ── Property 9: DST-Correct Recurrence Expansion ─────────────────────

describe('Feature: brightcal-shared-calendar, Property 9: DST-Correct Recurrence Expansion', () => {
  it('should maintain wall-clock time across DST transitions for daily events', () => {
    // Test with a daily event that spans a DST transition
    // US DST 2025: Spring forward March 9, Fall back November 2
    // We create a daily event starting March 7 with 5 occurrences
    // The wall-clock time should remain the same (e.g., 9:00 AM)

    const dtstart = '2025-03-07T09:00:00';
    const rrule: IRecurrenceRule = {
      freq: RecurrenceFrequency.Daily,
      count: 5,
      interval: 1,
    };
    const event = makeRecurringEvent({
      dtstart,
      rrule,
      dtstartTzid: 'America/New_York',
    });

    const windowStart = '2025-03-01T00:00:00';
    const windowEnd = '2025-03-31T23:59:59';

    const occurrences = expandRecurrence(
      event,
      windowStart,
      windowEnd,
      'America/New_York',
    );

    expect(occurrences.length).toBe(5);

    // All occurrences should have the same wall-clock time (09:00:00)
    for (const occ of occurrences) {
      const d = parseDate(occ.dtstart);
      expect(d.getHours()).toBe(9);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
    }
  });

  it('should maintain wall-clock time across fall-back DST transition', () => {
    // Fall back: November 2, 2025 in US
    const dtstart = '2025-10-31T14:30:00';
    const rrule: IRecurrenceRule = {
      freq: RecurrenceFrequency.Daily,
      count: 5,
      interval: 1,
    };
    const event = makeRecurringEvent({
      dtstart,
      rrule,
      dtstartTzid: 'America/New_York',
    });

    const windowStart = '2025-10-01T00:00:00';
    const windowEnd = '2025-11-30T23:59:59';

    const occurrences = expandRecurrence(
      event,
      windowStart,
      windowEnd,
      'America/New_York',
    );

    expect(occurrences.length).toBe(5);

    // All occurrences should maintain 14:30 wall-clock time
    for (const occ of occurrences) {
      const d = parseDate(occ.dtstart);
      expect(d.getHours()).toBe(14);
      expect(d.getMinutes()).toBe(30);
    }
  });

  it('should maintain wall-clock time for weekly events across DST', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 8, max: 18 }), // hour
        fc.constantFrom(0, 15, 30, 45), // minute
        (hour, minute) => {
          // Weekly event starting Feb 2025, spanning spring DST
          const dtstart = `2025-02-03T${pad2(hour)}:${pad2(minute)}:00`;
          const rrule: IRecurrenceRule = {
            freq: RecurrenceFrequency.Weekly,
            count: 10,
            interval: 1,
          };
          const event = makeRecurringEvent({
            dtstart,
            rrule,
            dtstartTzid: 'America/New_York',
          });

          const windowStart = '2025-01-01T00:00:00';
          const windowEnd = '2025-06-30T23:59:59';

          const occurrences = expandRecurrence(
            event,
            windowStart,
            windowEnd,
            'America/New_York',
          );

          // All occurrences should maintain the same wall-clock time
          for (const occ of occurrences) {
            const d = parseDate(occ.dtstart);
            expect(d.getHours()).toBe(hour);
            expect(d.getMinutes()).toBe(minute);
          }
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });
});
