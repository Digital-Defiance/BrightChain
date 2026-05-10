/**
 * Property-Based Tests for Conflict Detection
 *
 * Feature: brightcal-shared-calendar
 * Property 11: Conflict Detection Correctness
 * Property 12: Multi-Attendee Conflict Aggregation
 *
 * Validates: Requirements 7.1, 7.2, 7.3, 7.5, 7.6
 */
import * as fc from 'fast-check';
import { detectConflicts } from '../conflict/detectConflicts';
import { ConflictSeverity, EventTransparency, EventVisibility } from '../enums';
import type { ICalendarEventDTO } from '../interfaces';

// ── Helpers ──────────────────────────────────────────────────────────

const pad2 = (n: number) => n.toString().padStart(2, '0');

function formatLocal(d: Date): string {
  return (
    `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
  );
}

function parseDate(s: string): Date {
  const cleaned = s.replace(/Z$/, '');
  const parts = cleaned.split('T');
  const dp = parts[0].split('-').map(Number);
  if (parts.length === 1) return new Date(dp[0], dp[1] - 1, dp[2]);
  const tp = parts[1].split(':').map((p) => parseInt(p, 10));
  return new Date(dp[0], dp[1] - 1, dp[2], tp[0] || 0, tp[1] || 0, tp[2] || 0);
}

let uidCounter = 0;
function makeEvent(overrides: Partial<ICalendarEventDTO>): ICalendarEventDTO {
  uidCounter++;
  const {
    dtstart = '2025-03-15T09:00:00',
    dtend = '2025-03-15T10:00:00',
    ...rest
  } = overrides;
  return {
    id: `evt-${uidCounter}`,
    calendarId: 'cal-1',
    uid: `uid-${uidCounter}`,
    sequence: 0,
    summary: `Event ${uidCounter}`,
    dtstart,
    dtend,
    dtstartTzid: 'UTC',
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

/** Generate a start hour and duration for an event */
const arbTimeSlot = fc.record({
  day: fc.integer({ min: 1, max: 28 }),
  hour: fc.integer({ min: 0, max: 21 }),
  durationHours: fc.integer({ min: 1, max: 3 }),
});

/** Generate transparency */
const arbTransparency = fc.constantFrom(
  EventTransparency.Opaque,
  EventTransparency.Transparent,
);

/** Generate status */
const arbStatus = fc.constantFrom('CONFIRMED' as const, 'TENTATIVE' as const);

// ── Property 11: Conflict Detection Correctness ──────────────────────

describe('Feature: brightcal-shared-calendar, Property 11: Conflict Detection Correctness', () => {
  beforeEach(() => {
    uidCounter = 0;
  });

  it('should report overlapping events as conflicts', () => {
    fc.assert(
      fc.property(arbTimeSlot, arbTimeSlot, (slotA, slotB) => {
        // Use January (month 0) to avoid DST transition issues in March
        const startA = new Date(2025, 0, slotA.day, slotA.hour, 0, 0);
        const endA = new Date(
          2025,
          0,
          slotA.day,
          slotA.hour + slotA.durationHours,
          0,
          0,
        );
        const startB = new Date(2025, 0, slotB.day, slotB.hour, 0, 0);
        const endB = new Date(
          2025,
          0,
          slotB.day,
          slotB.hour + slotB.durationHours,
          0,
          0,
        );

        const candidate = makeEvent({
          dtstart: formatLocal(startA),
          dtend: formatLocal(endA),
        });
        const existing = makeEvent({
          dtstart: formatLocal(startB),
          dtend: formatLocal(endB),
        });

        const conflicts = detectConflicts(candidate, [existing]);

        // Check if there's actually an overlap
        const hasOverlap = startA < endB && startB < endA;

        if (hasOverlap) {
          expect(conflicts.length).toBe(1);
          // Verify overlap bounds
          const expectedOverlapStart = startA > startB ? startA : startB;
          const expectedOverlapEnd = endA < endB ? endA : endB;
          expect(conflicts[0].overlapStart).toBe(
            formatLocal(expectedOverlapStart),
          );
          expect(conflicts[0].overlapEnd).toBe(formatLocal(expectedOverlapEnd));
        } else {
          expect(conflicts.length).toBe(0);
        }
      }),
      { numRuns: 100, verbose: true },
    );
  });

  it('should exclude TRANSPARENT events from conflict detection', () => {
    fc.assert(
      fc.property(arbTimeSlot, arbTransparency, (slot, transparency) => {
        // Use January (month 0) to avoid DST transition issues in March
        const start = new Date(2025, 0, slot.day, slot.hour, 0, 0);
        const end = new Date(
          2025,
          0,
          slot.day,
          slot.hour + slot.durationHours,
          0,
          0,
        );

        // Create overlapping events
        const candidate = makeEvent({
          dtstart: formatLocal(start),
          dtend: formatLocal(end),
        });
        const existing = makeEvent({
          dtstart: formatLocal(start), // exact same time = guaranteed overlap
          dtend: formatLocal(end),
          transparency,
        });

        const conflicts = detectConflicts(candidate, [existing]);

        if (transparency === EventTransparency.Transparent) {
          // Transparent events should never cause conflicts
          expect(conflicts.length).toBe(0);
        } else {
          // Opaque overlapping events should conflict
          expect(conflicts.length).toBe(1);
        }
      }),
      { numRuns: 100, verbose: true },
    );
  });

  it('should correctly classify conflict severity', () => {
    fc.assert(
      fc.property(
        arbStatus,
        arbStatus,
        fc.boolean(), // candidateAllDay
        fc.boolean(), // existingAllDay
        (statusA, statusB, allDayA, allDayB) => {
          const start = new Date(2025, 0, 15, 9, 0, 0);
          const end = new Date(2025, 0, 15, 10, 0, 0);

          const candidate = makeEvent({
            dtstart: formatLocal(start),
            dtend: formatLocal(end),
            status: statusA,
            allDay: allDayA,
          });
          const existing = makeEvent({
            dtstart: formatLocal(start),
            dtend: formatLocal(end),
            status: statusB,
            allDay: allDayB,
          });

          const conflicts = detectConflicts(candidate, [existing]);
          expect(conflicts.length).toBe(1);

          const severity = conflicts[0].severity;

          if (allDayA !== allDayB) {
            expect(severity).toBe(ConflictSeverity.Informational);
          } else if (statusA === 'TENTATIVE' || statusB === 'TENTATIVE') {
            expect(severity).toBe(ConflictSeverity.Soft);
          } else {
            expect(severity).toBe(ConflictSeverity.Hard);
          }
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });

  it('should not report conflicts for non-overlapping events', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 1, max: 3 }),
        fc.integer({ min: 4, max: 6 }), // gap ensures no overlap
        (day, durationA, gap) => {
          const startA = new Date(2025, 0, day, 9, 0, 0);
          const endA = new Date(2025, 0, day, 9 + durationA, 0, 0);
          const startB = new Date(2025, 0, day, 9 + durationA + gap, 0, 0);
          const endB = new Date(2025, 0, day, 9 + durationA + gap + 2, 0, 0);

          const candidate = makeEvent({
            dtstart: formatLocal(startA),
            dtend: formatLocal(endA),
          });
          const existing = makeEvent({
            dtstart: formatLocal(startB),
            dtend: formatLocal(endB),
          });

          const conflicts = detectConflicts(candidate, [existing]);
          expect(conflicts.length).toBe(0);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });

  it('should not report conflict when candidate is TRANSPARENT', () => {
    const start = new Date(2025, 0, 15, 9, 0, 0);
    const end = new Date(2025, 0, 15, 10, 0, 0);

    const candidate = makeEvent({
      dtstart: formatLocal(start),
      dtend: formatLocal(end),
      transparency: EventTransparency.Transparent,
    });
    const existing = makeEvent({
      dtstart: formatLocal(start),
      dtend: formatLocal(end),
    });

    const conflicts = detectConflicts(candidate, [existing]);
    expect(conflicts.length).toBe(0);
  });
});

// ── Property 12: Multi-Attendee Conflict Aggregation ─────────────────

describe('Feature: brightcal-shared-calendar, Property 12: Multi-Attendee Conflict Aggregation', () => {
  beforeEach(() => {
    uidCounter = 0;
  });

  it('should report per-attendee conflict status independently', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 5 }), // number of attendees
        fc.array(fc.boolean(), { minLength: 2, maxLength: 5 }), // whether each attendee has a conflicting event
        (numAttendees, hasConflict) => {
          const actualAttendees = Math.min(numAttendees, hasConflict.length);
          const candidateStart = new Date(2025, 0, 15, 10, 0, 0);
          const candidateEnd = new Date(2025, 0, 15, 11, 0, 0);

          const candidate = makeEvent({
            dtstart: formatLocal(candidateStart),
            dtend: formatLocal(candidateEnd),
          });

          // For each attendee, create their calendar events
          const perAttendeeConflicts: number[] = [];

          for (let i = 0; i < actualAttendees; i++) {
            const attendeeEvents: ICalendarEventDTO[] = [];

            if (hasConflict[i]) {
              // Create an overlapping event for this attendee
              attendeeEvents.push(
                makeEvent({
                  calendarId: `cal-attendee-${i}`,
                  dtstart: formatLocal(new Date(2025, 0, 15, 10, 30, 0)),
                  dtend: formatLocal(new Date(2025, 0, 15, 11, 30, 0)),
                }),
              );
            } else {
              // Create a non-overlapping event
              attendeeEvents.push(
                makeEvent({
                  calendarId: `cal-attendee-${i}`,
                  dtstart: formatLocal(new Date(2025, 0, 15, 12, 0, 0)),
                  dtend: formatLocal(new Date(2025, 0, 15, 13, 0, 0)),
                }),
              );
            }

            // Check conflicts for this attendee independently
            const conflicts = detectConflicts(candidate, attendeeEvents);
            perAttendeeConflicts.push(conflicts.length);
          }

          // Verify each attendee's conflict status matches expectation
          for (let i = 0; i < actualAttendees; i++) {
            if (hasConflict[i]) {
              expect(perAttendeeConflicts[i]).toBeGreaterThan(0);
            } else {
              expect(perAttendeeConflicts[i]).toBe(0);
            }
          }
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });
});
