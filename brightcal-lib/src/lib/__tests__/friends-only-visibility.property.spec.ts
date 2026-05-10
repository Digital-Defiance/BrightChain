/**
 * Property-Based Tests for Friends-Only Calendar Event Visibility Gate
 *
 * Feature: brightchain-friends-system
 * Property 22: Friends-only calendar event visibility gate
 *
 * For any calendar event with FriendsOnly visibility and any non-organizer viewer,
 * filterEventByPermission SHALL grant full details if and only if
 * IFriendsService.areFriends(organizerId, viewerId) returns true,
 * and SHALL return free/busy only otherwise.
 *
 * **Validates: Requirements 18.1**
 */
import * as fc from 'fast-check';
import {
  CalendarPermissionLevel,
  EventTransparency,
  EventVisibility,
} from '../enums';
import type { ICalendarEventDTO } from '../interfaces';
import {
  filterEventByPermission,
  type IPermissionFilterOptions,
} from '../permissions/filterByPermission';

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
    visibility: EventVisibility.FriendsOnly,
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

const arbSafeString = fc
  .array(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789 '.split('')),
    { minLength: 1, maxLength: 20 },
  )
  .map((chars) => chars.join('').trim() || 'a');

// ── Property 22: Friends-only calendar event visibility gate ─────────

describe('Feature: brightchain-friends-system, Property 22: Friends-only calendar event visibility gate', () => {
  beforeEach(() => {
    uidCounter = 0;
  });

  it('should grant full details to friends for FriendsOnly events', () => {
    fc.assert(
      fc.property(arbSafeString, arbSafeString, (summary, description) => {
        const event = makeEvent({
          visibility: EventVisibility.FriendsOnly,
          summary,
          description,
        });
        const options: IPermissionFilterOptions = {
          isFriend: true,
          isOrganizer: false,
        };
        const result = filterEventByPermission(
          event,
          CalendarPermissionLevel.Viewer,
          options,
        );

        expect(result.granted).toBe(true);
        expect(result.event).toBeDefined();
        // Friends see full details
        expect(result.event!.summary).toBe(summary);
        expect(result.event!.description).toBe(description);
        expect(result.event!.attendees).toEqual(event.attendees);
        expect(result.event!.location).toBe(event.location);
      }),
      { numRuns: 100, verbose: true },
    );
  });

  it('should return free/busy only for non-friends on FriendsOnly events', () => {
    fc.assert(
      fc.property(arbSafeString, arbSafeString, (summary, description) => {
        const event = makeEvent({
          visibility: EventVisibility.FriendsOnly,
          summary,
          description,
        });
        const options: IPermissionFilterOptions = {
          isFriend: false,
          isOrganizer: false,
        };
        const result = filterEventByPermission(
          event,
          CalendarPermissionLevel.Viewer,
          options,
        );

        expect(result.granted).toBe(true);
        // Non-friends see time info
        expect(result.event!.dtstart).toBe(event.dtstart);
        expect(result.event!.dtend).toBe(event.dtend);
        expect(result.event!.transparency).toBe(event.transparency);
        // Non-friends do NOT see details
        expect(result.event!.summary).toBeUndefined();
        expect(result.event!.description).toBeUndefined();
        expect(result.event!.attendees).toBeUndefined();
        expect(result.event!.location).toBeUndefined();
      }),
      { numRuns: 100, verbose: true },
    );
  });

  it('should grant full details to the organizer for FriendsOnly events', () => {
    fc.assert(
      fc.property(arbSafeString, arbSafeString, (summary, description) => {
        const event = makeEvent({
          visibility: EventVisibility.FriendsOnly,
          summary,
          description,
        });
        const options: IPermissionFilterOptions = {
          isFriend: false,
          isOrganizer: true,
        };
        const result = filterEventByPermission(
          event,
          CalendarPermissionLevel.Viewer,
          options,
        );

        expect(result.granted).toBe(true);
        expect(result.event).toBeDefined();
        // Organizer always sees full details
        expect(result.event!.summary).toBe(summary);
        expect(result.event!.description).toBe(description);
        expect(result.event!.attendees).toEqual(event.attendees);
      }),
      { numRuns: 100, verbose: true },
    );
  });

  it('should treat FriendsOnly as free/busy when no options provided (non-friend default)', () => {
    fc.assert(
      fc.property(arbSafeString, (summary) => {
        const event = makeEvent({
          visibility: EventVisibility.FriendsOnly,
          summary,
        });
        // No options = no friendship info = non-friend behavior
        const result = filterEventByPermission(
          event,
          CalendarPermissionLevel.Viewer,
        );

        expect(result.granted).toBe(true);
        expect(result.event!.dtstart).toBe(event.dtstart);
        expect(result.event!.summary).toBeUndefined();
        expect(result.event!.description).toBeUndefined();
        expect(result.event!.attendees).toBeUndefined();
      }),
      { numRuns: 100, verbose: true },
    );
  });
});
