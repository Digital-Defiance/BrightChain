/**
 * CalDavService — unit tests.
 *
 * Tests resource discovery, event retrieval with filtering, ETag management,
 * PUT (create/update) with precondition checks, DELETE with precondition
 * checks, and calendar creation.
 *
 * @see Requirements 2.2, 2.6, 2.7, 2.8
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  CalendarPermissionLevel,
  EventTransparency,
  EventVisibility,
} from '@brightchain/brightcal-lib';
import { CalDavService } from '../calDavService.ts';

// ─── Test helpers ────────────────────────────────────────────────────────────

function makeTypedEvent(overrides: Partial<any> = {}): any {
  const now = new Date('2024-06-15T10:00:00Z');
  return {
    id: 'event-id-1',
    calendarId: 'cal-1',
    uid: 'uid-1',
    sequence: 0,
    summary: 'Test Event',
    dtstart: now,
    dtend: new Date('2024-06-15T11:00:00Z'),
    dtstartTzid: 'America/New_York',
    dtendTzid: 'America/New_York',
    allDay: false,
    visibility: EventVisibility.Public,
    transparency: EventTransparency.Opaque,
    status: 'CONFIRMED',
    organizerId: 'user-1',
    attendeeIds: [],
    isRecurring: false,
    blockId: 'block-1',
    dateCreated: now,
    dateModified: now,
    searchText: 'Test Event',
    ...overrides,
  };
}

function makeTypedCalendar(overrides: Partial<any> = {}): any {
  const now = new Date('2024-06-15T10:00:00Z');
  return {
    id: 'cal-1',
    ownerId: 'user-1',
    displayName: 'Work',
    color: '#4285F4',
    description: 'Work calendar',
    isDefault: false,
    isSubscription: false,
    defaultPermission: CalendarPermissionLevel.Viewer,
    dateCreated: now,
    dateModified: now,
    permission: CalendarPermissionLevel.Owner,
    ...overrides,
  };
}

function createMockCalendarEngine(): any {
  return {
    listCalendarsForUser: jest.fn(),
    createCalendar: jest.fn(),
  };
}

function createMockEventEngine(): any {
  return {
    listEvents: jest.fn(),
    createEvent: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
    getEventById: jest.fn(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CalDavService', () => {
  let calendarEngine: ReturnType<typeof createMockCalendarEngine>;
  let eventEngine: ReturnType<typeof createMockEventEngine>;
  let service: CalDavService;

  beforeEach(() => {
    calendarEngine = createMockCalendarEngine();
    eventEngine = createMockEventEngine();
    service = new CalDavService(calendarEngine, eventEngine);
  });

  // ── discoverCalendars ─────────────────────────────────────────────

  describe('discoverCalendars', () => {
    it('returns calendar info with ctag for each calendar', async () => {
      const cal = makeTypedCalendar();
      calendarEngine.listCalendarsForUser.mockResolvedValue([cal]);
      eventEngine.listEvents.mockResolvedValue([makeTypedEvent()]);

      const result = await service.discoverCalendars('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].calendarId).toBe('cal-1');
      expect(result[0].displayName).toBe('Work');
      expect(result[0].color).toBe('#4285F4');
      expect(result[0].ctag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('returns empty array when user has no calendars', async () => {
      calendarEngine.listCalendarsForUser.mockResolvedValue([]);
      const result = await service.discoverCalendars('user-1');
      expect(result).toEqual([]);
    });

    it('generates different ctags for calendars with different events', async () => {
      const cal1 = makeTypedCalendar({ id: 'cal-1' });
      const cal2 = makeTypedCalendar({
        id: 'cal-2',
        dateModified: new Date('2024-07-01T00:00:00Z'),
      });
      calendarEngine.listCalendarsForUser.mockResolvedValue([cal1, cal2]);

      // Different events for each calendar
      eventEngine.listEvents
        .mockResolvedValueOnce([makeTypedEvent()])
        .mockResolvedValueOnce([
          makeTypedEvent({ dateModified: new Date('2024-07-01T12:00:00Z') }),
        ]);

      const result = await service.discoverCalendars('user-1');
      expect(result[0].ctag).not.toBe(result[1].ctag);
    });

    it('falls back to calendar dateModified when events cannot be listed', async () => {
      const cal = makeTypedCalendar();
      calendarEngine.listCalendarsForUser.mockResolvedValue([cal]);
      eventEngine.listEvents.mockRejectedValue(new Error('FORBIDDEN'));

      const result = await service.discoverCalendars('user-1');
      expect(result).toHaveLength(1);
      expect(result[0].ctag).toMatch(/^"[a-f0-9]{32}"$/);
    });
  });

  // ── getCalendarEvents ─────────────────────────────────────────────

  describe('getCalendarEvents', () => {
    it('returns all events serialized to iCal with ETags', async () => {
      eventEngine.listEvents.mockResolvedValue([makeTypedEvent()]);

      const result = await service.getCalendarEvents('user-1', 'cal-1');

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-1');
      expect(result[0].icalData).toContain('BEGIN:VCALENDAR');
      expect(result[0].icalData).toContain('BEGIN:VEVENT');
      expect(result[0].icalData).toContain('Test Event');
      expect(result[0].etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('passes time-range filter to eventEngine', async () => {
      eventEngine.listEvents.mockResolvedValue([]);

      await service.getCalendarEvents('user-1', 'cal-1', {
        timeRangeStart: '2024-01-01',
        timeRangeEnd: '2024-12-31',
      });

      expect(eventEngine.listEvents).toHaveBeenCalledWith(
        'user-1',
        'cal-1',
        '2024-01-01',
        '2024-12-31',
      );
    });

    it('filters events by UIDs for calendar-multiget', async () => {
      const evt1 = makeTypedEvent({ uid: 'uid-1' });
      const evt2 = makeTypedEvent({ uid: 'uid-2', id: 'event-id-2' });
      eventEngine.listEvents.mockResolvedValue([evt1, evt2]);

      const result = await service.getCalendarEvents('user-1', 'cal-1', {
        uids: ['uid-1'],
      });

      expect(result).toHaveLength(1);
      expect(result[0].uid).toBe('uid-1');
    });

    it('returns empty array when no events match', async () => {
      eventEngine.listEvents.mockResolvedValue([]);
      const result = await service.getCalendarEvents('user-1', 'cal-1');
      expect(result).toEqual([]);
    });
  });

  // ── getEvent ──────────────────────────────────────────────────────

  describe('getEvent', () => {
    it('returns event resource with iCal data and ETag', async () => {
      eventEngine.listEvents.mockResolvedValue([makeTypedEvent()]);

      const result = await service.getEvent('user-1', 'cal-1', 'uid-1');

      expect(result).not.toBeNull();
      expect(result!.uid).toBe('uid-1');
      expect(result!.icalData).toContain('BEGIN:VEVENT');
      expect(result!.etag).toMatch(/^"[a-f0-9]{32}"$/);
    });

    it('returns null when event does not exist', async () => {
      eventEngine.listEvents.mockResolvedValue([]);

      const result = await service.getEvent('user-1', 'cal-1', 'nonexistent');
      expect(result).toBeNull();
    });

    it('generates consistent ETags for the same event', async () => {
      const event = makeTypedEvent();
      eventEngine.listEvents.mockResolvedValue([event]);

      const result1 = await service.getEvent('user-1', 'cal-1', 'uid-1');
      const result2 = await service.getEvent('user-1', 'cal-1', 'uid-1');

      expect(result1!.etag).toBe(result2!.etag);
    });
  });

  // ── putEvent ──────────────────────────────────────────────────────

  describe('putEvent', () => {
    const validIcal = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      'UID:uid-new',
      'DTSTART:20240615T100000Z',
      'DTEND:20240615T110000Z',
      'SUMMARY:New Event',
      'SEQUENCE:0',
      'STATUS:CONFIRMED',
      'TRANSP:OPAQUE',
      'CLASS:PUBLIC',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    it('creates a new event when none exists with the given UID', async () => {
      eventEngine.listEvents.mockResolvedValue([]);
      eventEngine.createEvent.mockResolvedValue(
        makeTypedEvent({ uid: 'uid-new' }),
      );

      const result = await service.putEvent(
        'user-1',
        'cal-1',
        'uid-new',
        validIcal,
      );

      expect(result.created).toBe(true);
      expect(result.etag).toMatch(/^"[a-f0-9]{32}"$/);
      expect(eventEngine.createEvent).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({
          calendarId: 'cal-1',
          summary: 'New Event',
        }),
      );
    });

    it('updates an existing event when UID matches', async () => {
      const existing = makeTypedEvent({ uid: 'uid-1' });
      eventEngine.listEvents.mockResolvedValue([existing]);
      eventEngine.updateEvent.mockResolvedValue(existing);

      const result = await service.putEvent(
        'user-1',
        'cal-1',
        'uid-1',
        validIcal,
      );

      expect(result.created).toBe(false);
      expect(eventEngine.updateEvent).toHaveBeenCalledWith(
        'event-id-1',
        'user-1',
        expect.objectContaining({ summary: 'New Event' }),
        'all',
      );
    });

    it('throws PRECONDITION_FAILED when ETag does not match on update', async () => {
      const existing = makeTypedEvent({ uid: 'uid-1' });
      eventEngine.listEvents.mockResolvedValue([existing]);

      await expect(
        service.putEvent('user-1', 'cal-1', 'uid-1', validIcal, 'stale-etag'),
      ).rejects.toThrow('PRECONDITION_FAILED');
    });

    it('succeeds when provided ETag matches current event', async () => {
      const existing = makeTypedEvent({ uid: 'uid-1' });
      eventEngine.listEvents.mockResolvedValue([existing]);
      eventEngine.updateEvent.mockResolvedValue(existing);

      // Get the current ETag first
      const currentEvent = await service.getEvent('user-1', 'cal-1', 'uid-1');
      const currentEtag = currentEvent!.etag.replace(/^"|"$/g, '');

      const result = await service.putEvent(
        'user-1',
        'cal-1',
        'uid-1',
        validIcal,
        currentEtag,
      );

      expect(result.created).toBe(false);
    });

    it('throws when iCal data contains no VEVENT', async () => {
      const emptyIcal = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR';
      eventEngine.listEvents.mockResolvedValue([]);

      await expect(
        service.putEvent('user-1', 'cal-1', 'uid-1', emptyIcal),
      ).rejects.toThrow('No VEVENT found');
    });
  });

  // ── deleteEvent ───────────────────────────────────────────────────

  describe('deleteEvent', () => {
    it('deletes an existing event and returns true', async () => {
      eventEngine.listEvents.mockResolvedValue([makeTypedEvent()]);
      eventEngine.deleteEvent.mockResolvedValue(true);

      const result = await service.deleteEvent('user-1', 'cal-1', 'uid-1');
      expect(result).toBe(true);
      expect(eventEngine.deleteEvent).toHaveBeenCalledWith(
        'event-id-1',
        'user-1',
        'all',
      );
    });

    it('returns false when event does not exist', async () => {
      eventEngine.listEvents.mockResolvedValue([]);

      const result = await service.deleteEvent(
        'user-1',
        'cal-1',
        'nonexistent',
      );
      expect(result).toBe(false);
    });

    it('throws PRECONDITION_FAILED when ETag does not match', async () => {
      eventEngine.listEvents.mockResolvedValue([makeTypedEvent()]);

      await expect(
        service.deleteEvent('user-1', 'cal-1', 'uid-1', 'stale-etag'),
      ).rejects.toThrow('PRECONDITION_FAILED');
    });

    it('succeeds when provided ETag matches current event', async () => {
      const event = makeTypedEvent();
      eventEngine.listEvents.mockResolvedValue([event]);
      eventEngine.deleteEvent.mockResolvedValue(true);

      // Get the current ETag
      const currentResource = await service.getEvent(
        'user-1',
        'cal-1',
        'uid-1',
      );
      const currentEtag = currentResource!.etag.replace(/^"|"$/g, '');

      const result = await service.deleteEvent(
        'user-1',
        'cal-1',
        'uid-1',
        currentEtag,
      );
      expect(result).toBe(true);
    });
  });

  // ── createCalendar ────────────────────────────────────────────────

  describe('createCalendar', () => {
    it('creates a calendar and returns CalDavCalendarInfo', async () => {
      const cal = makeTypedCalendar({ id: 'new-cal' });
      calendarEngine.createCalendar.mockResolvedValue(cal);

      const result = await service.createCalendar('user-1', 'My Calendar');

      expect(result.calendarId).toBe('new-cal');
      expect(result.displayName).toBe('Work');
      expect(result.ctag).toMatch(/^"[a-f0-9]{32}"$/);
      expect(calendarEngine.createCalendar).toHaveBeenCalledWith(
        'user-1',
        'My Calendar',
        '#4285F4',
        '',
      );
    });
  });

  // ── ETag consistency ──────────────────────────────────────────────

  describe('ETag consistency', () => {
    it('getEvent and getCalendarEvents produce the same ETag for the same event', async () => {
      const event = makeTypedEvent();
      eventEngine.listEvents.mockResolvedValue([event]);

      const singleResult = await service.getEvent('user-1', 'cal-1', 'uid-1');
      const listResult = await service.getCalendarEvents('user-1', 'cal-1');

      expect(singleResult!.etag).toBe(listResult[0].etag);
    });
  });
});
