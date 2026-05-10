/**
 * Unit tests for FriendsOnly event visibility in filterEventByPermission.
 *
 * Requirements: 18.1
 */
import {
  CalendarPermissionLevel,
  EventTransparency,
  EventVisibility,
} from '../enums';
import type { ICalendarEventDTO } from '../interfaces';
import { filterEventByPermission } from '../permissions/filterByPermission';

function makeEvent(overrides?: Partial<ICalendarEventDTO>): ICalendarEventDTO {
  return {
    id: 'evt-1',
    calendarId: 'cal-1',
    uid: 'uid-1',
    sequence: 0,
    summary: 'Team Standup',
    description: 'Daily standup meeting',
    location: 'Room A',
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

describe('filterEventByPermission — FriendsOnly visibility (Req 18.1)', () => {
  it('shows full details to friends', () => {
    const event = makeEvent();
    const result = filterEventByPermission(
      event,
      CalendarPermissionLevel.Viewer,
      {
        isFriend: true,
        isOrganizer: false,
      },
    );

    expect(result.granted).toBe(true);
    expect(result.event!.summary).toBe('Team Standup');
    expect(result.event!.description).toBe('Daily standup meeting');
    expect(result.event!.attendees).toEqual(event.attendees);
    expect(result.event!.location).toBe('Room A');
  });

  it('shows free/busy only to non-friends', () => {
    const event = makeEvent();
    const result = filterEventByPermission(
      event,
      CalendarPermissionLevel.Viewer,
      {
        isFriend: false,
        isOrganizer: false,
      },
    );

    expect(result.granted).toBe(true);
    expect(result.event!.dtstart).toBe(event.dtstart);
    expect(result.event!.dtend).toBe(event.dtend);
    expect(result.event!.summary).toBeUndefined();
    expect(result.event!.description).toBeUndefined();
    expect(result.event!.attendees).toBeUndefined();
    expect(result.event!.location).toBeUndefined();
  });

  it('shows full details to the organizer even if not a friend', () => {
    const event = makeEvent();
    const result = filterEventByPermission(
      event,
      CalendarPermissionLevel.Viewer,
      {
        isFriend: false,
        isOrganizer: true,
      },
    );

    expect(result.granted).toBe(true);
    expect(result.event!.summary).toBe('Team Standup');
    expect(result.event!.description).toBe('Daily standup meeting');
    expect(result.event!.attendees).toEqual(event.attendees);
  });

  it('owner/editor always sees full details for FriendsOnly events', () => {
    const event = makeEvent();
    const ownerResult = filterEventByPermission(
      event,
      CalendarPermissionLevel.Owner,
    );
    const editorResult = filterEventByPermission(
      event,
      CalendarPermissionLevel.Editor,
    );

    expect(ownerResult.granted).toBe(true);
    expect(ownerResult.event!.summary).toBe('Team Standup');
    expect(editorResult.granted).toBe(true);
    expect(editorResult.event!.summary).toBe('Team Standup');
  });

  it('FreeBusyOnly permission returns free/busy for FriendsOnly events', () => {
    const event = makeEvent();
    const result = filterEventByPermission(
      event,
      CalendarPermissionLevel.FreeBusyOnly,
    );

    expect(result.granted).toBe(true);
    expect(result.event!.dtstart).toBe(event.dtstart);
    expect(result.event!.summary).toBeUndefined();
    expect(result.event!.description).toBeUndefined();
  });
});
