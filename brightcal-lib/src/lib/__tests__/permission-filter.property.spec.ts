/**
 * Property-Based Tests for Permission-Based Data Filtering
 *
 * Feature: brightcal-shared-calendar
 * Property 10: Permission-Based Data Filtering
 *
 * For any calendar event and any requesting user:
 * (a) viewer permission → full event details
 * (b) free-busy-only permission → only time range and busy/free status
 * (c) no permission → access denied
 * (d) private events → display only as "busy" to viewers
 * (e) confidential events → display title only without description/attendees to viewers
 *
 * Validates: Requirements 6.5, 6.6, 6.7, 6.8
 */
import * as fc from 'fast-check';
import {
  CalendarPermissionLevel,
  EventTransparency,
  EventVisibility,
} from '../enums';
import type { ICalendarEventDTO } from '../interfaces';
import { filterEventByPermission } from '../permissions/filterByPermission';

// ── Helpers ──────────────────────────────────────────────────────────

let uidCounter = 0;
function makeEvent(overrides?: Partial<ICalendarEventDTO>): ICalendarEventDTO {
  uidCounter++;
  return {
    id: `evt-${uidCounter}`,
    calendarId: 'cal-1',
    uid: `uid-${uidCounter}`,
    sequence: 0,
    summary: `Meeting ${uidCounter}`,
    description: `Description for event ${uidCounter}`,
    location: `Room ${uidCounter}`,
    dtstart: '2025-03-15T09:00:00',
    dtend: '2025-03-15T10:00:00',
    dtstartTzid: 'UTC',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    status: 'CONFIRMED' as const,
    organizerId: 'org-1',
    attendees: [
      {
        email: 'attendee@example.com',
        displayName: 'Attendee',
        partstat: 'ACCEPTED' as never,
        role: 'REQ-PARTICIPANT',
        rsvp: true,
      },
    ],
    reminders: [{ action: 'DISPLAY', triggerMinutesBefore: 30 }],
    categories: ['work'],
    dateCreated: '2024-01-01T00:00:00',
    dateModified: '2024-01-01T00:00:00',
    ...overrides,
  };
}

// ── Arbitraries ──────────────────────────────────────────────────────

const arbVisibility = fc.constantFrom(
  EventVisibility.Public,
  EventVisibility.Private,
  EventVisibility.Confidential,
);

const arbPermission = fc.constantFrom(
  CalendarPermissionLevel.Owner,
  CalendarPermissionLevel.Editor,
  CalendarPermissionLevel.Viewer,
  CalendarPermissionLevel.FreeBusyOnly,
  undefined as CalendarPermissionLevel | undefined,
);

const arbSafeString = fc
  .array(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')),
    { minLength: 1, maxLength: 20 },
  )
  .map((chars) => chars.join('').trim() || 'a');

// ── Property 10: Permission-Based Data Filtering ─────────────────────

describe('Feature: brightcal-shared-calendar, Property 10: Permission-Based Data Filtering', () => {
  beforeEach(() => {
    uidCounter = 0;
  });

  it('should grant full details to owner/editor regardless of visibility', () => {
    fc.assert(
      fc.property(
        arbVisibility,
        fc.constantFrom(
          CalendarPermissionLevel.Owner,
          CalendarPermissionLevel.Editor,
        ),
        arbSafeString,
        arbSafeString,
        (visibility, permission, summary, description) => {
          const event = makeEvent({ visibility, summary, description });
          const result = filterEventByPermission(event, permission);

          expect(result.granted).toBe(true);
          expect(result.event).toBeDefined();
          expect(result.event!.summary).toBe(summary);
          expect(result.event!.description).toBe(description);
          expect(result.event!.attendees).toEqual(event.attendees);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });

  it('should return full details to viewer for PUBLIC events', () => {
    fc.assert(
      fc.property(arbSafeString, arbSafeString, (summary, description) => {
        const event = makeEvent({
          visibility: EventVisibility.Public,
          summary,
          description,
        });
        const result = filterEventByPermission(
          event,
          CalendarPermissionLevel.Viewer,
        );

        expect(result.granted).toBe(true);
        expect(result.event!.summary).toBe(summary);
        expect(result.event!.description).toBe(description);
        expect(result.event!.attendees).toEqual(event.attendees);
      }),
      { numRuns: 100, verbose: true },
    );
  });

  it('should show PRIVATE events as "Busy" to viewers (no details)', () => {
    fc.assert(
      fc.property(arbSafeString, arbSafeString, (summary, description) => {
        const event = makeEvent({
          visibility: EventVisibility.Private,
          summary,
          description,
        });
        const result = filterEventByPermission(
          event,
          CalendarPermissionLevel.Viewer,
        );

        expect(result.granted).toBe(true);
        // Should show as "Busy" without real summary
        expect(result.event!.summary).toBe('Busy');
        // Should not contain description
        expect(result.event!.description).toBeUndefined();
        // Should not contain attendees
        expect(result.event!.attendees).toEqual([]);
        // Should still have time information
        expect(result.event!.dtstart).toBe(event.dtstart);
        expect(result.event!.dtend).toBe(event.dtend);
      }),
      { numRuns: 100, verbose: true },
    );
  });

  it('should show CONFIDENTIAL events with title only to viewers (no description/attendees)', () => {
    fc.assert(
      fc.property(arbSafeString, arbSafeString, (summary, description) => {
        const event = makeEvent({
          visibility: EventVisibility.Confidential,
          summary,
          description,
        });
        const result = filterEventByPermission(
          event,
          CalendarPermissionLevel.Viewer,
        );

        expect(result.granted).toBe(true);
        // Should show the real title
        expect(result.event!.summary).toBe(summary);
        // Should NOT contain description
        expect(result.event!.description).toBeUndefined();
        // Should NOT contain attendees
        expect(result.event!.attendees).toEqual([]);
        // Should still have time information
        expect(result.event!.dtstart).toBe(event.dtstart);
      }),
      { numRuns: 100, verbose: true },
    );
  });

  it('should return only time range for FreeBusyOnly permission', () => {
    fc.assert(
      fc.property(arbVisibility, arbSafeString, (visibility, summary) => {
        const event = makeEvent({ visibility, summary, description: 'secret' });
        const result = filterEventByPermission(
          event,
          CalendarPermissionLevel.FreeBusyOnly,
        );

        expect(result.granted).toBe(true);
        // Should have time information
        expect(result.event!.dtstart).toBe(event.dtstart);
        expect(result.event!.dtend).toBe(event.dtend);
        expect(result.event!.transparency).toBe(event.transparency);
        // Should NOT have title, description, or attendees
        expect(result.event!.summary).toBeUndefined();
        expect(result.event!.description).toBeUndefined();
        expect(result.event!.attendees).toBeUndefined();
        expect(result.event!.location).toBeUndefined();
      }),
      { numRuns: 100, verbose: true },
    );
  });

  it('should deny access when no permission is provided', () => {
    fc.assert(
      fc.property(arbVisibility, arbSafeString, (visibility, summary) => {
        const event = makeEvent({ visibility, summary });
        const result = filterEventByPermission(event, undefined);

        expect(result.granted).toBe(false);
        expect(result.event).toBeUndefined();
      }),
      { numRuns: 100, verbose: true },
    );
  });

  it('should always preserve time information when access is granted', () => {
    fc.assert(
      fc.property(
        arbVisibility,
        fc.constantFrom(
          CalendarPermissionLevel.Owner,
          CalendarPermissionLevel.Editor,
          CalendarPermissionLevel.Viewer,
          CalendarPermissionLevel.FreeBusyOnly,
        ),
        (visibility, permission) => {
          const event = makeEvent({ visibility });
          const result = filterEventByPermission(event, permission);

          expect(result.granted).toBe(true);
          expect(result.event!.dtstart).toBe(event.dtstart);
          expect(result.event!.dtend).toBe(event.dtend);
        },
      ),
      { numRuns: 100, verbose: true },
    );
  });
});
