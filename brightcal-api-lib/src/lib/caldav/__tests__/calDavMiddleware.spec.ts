/**
 * CalDavMiddleware — unit tests.
 *
 * Tests URL parsing, ETag handling, WebDAV method routing,
 * authentication enforcement, and PROPFIND/REPORT/GET/PUT/DELETE/
 * MKCALENDAR/POST handlers.
 *
 * @see Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.9, 2.10
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NextFunction } from 'express';
import {
  CalDavMiddleware,
  generateETag,
  parseCalDavUrl,
  type CalDavCalendarInfo,
  type CalDavEventResource,
  type ICalDavService,
} from '../calDavMiddleware.ts';

// ─── Mock service ────────────────────────────────────────────────────────────

function createMockService(): jest.Mocked<ICalDavService> {
  return {
    discoverCalendars: jest.fn(),
    getCalendarEvents: jest.fn(),
    getEvent: jest.fn(),
    putEvent: jest.fn(),
    deleteEvent: jest.fn(),
    createCalendar: jest.fn(),
  };
}

// ─── Mock request/response ───────────────────────────────────────────────────

function makeReq(overrides: Record<string, any> = {}): any {
  return {
    method: 'GET',
    path: '/caldav/user1/calendars/cal1/evt1.ics',
    headers: { authorization: 'Bearer test-token' },
    body: '',
    ...overrides,
  };
}

interface MockResState {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  ended: boolean;
}

function makeRes(): { mock: any; state: MockResState } {
  const state: MockResState = {
    statusCode: 200,
    headers: {},
    body: '',
    ended: false,
  };
  const mock: any = {
    status(code: number) {
      state.statusCode = code;
      return mock;
    },
    setHeader(key: string, value: string) {
      state.headers[key.toLowerCase()] = value;
      return mock;
    },
    send(data: string) {
      state.body = data;
      state.ended = true;
      return mock;
    },
    end() {
      state.ended = true;
      return mock;
    },
  };
  return { mock, state };
}

const mockNext: NextFunction = jest.fn();

// ─── Sample data ─────────────────────────────────────────────────────────────

const SAMPLE_CALENDAR: CalDavCalendarInfo = {
  calendarId: 'cal1',
  displayName: 'Work',
  color: '#4285F4',
  description: 'Work calendar',
  ctag: 'ctag-123',
};

const SAMPLE_EVENT: CalDavEventResource = {
  uid: 'evt1',
  etag: '"abc123"',
  icalData:
    'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:Test\r\nEND:VEVENT\r\nEND:VCALENDAR',
};

/** Helper to wait for async handler completion */
const tick = () => new Promise((r) => setTimeout(r, 10));

// ─── parseCalDavUrl tests ────────────────────────────────────────────────────

describe('parseCalDavUrl', () => {
  it('parses user root path', () => {
    expect(parseCalDavUrl('/caldav/user1')).toEqual({ userId: 'user1' });
  });

  it('parses user root path with trailing slash', () => {
    expect(parseCalDavUrl('/caldav/user1/')).toEqual({ userId: 'user1' });
  });

  it('parses calendar home set path', () => {
    expect(parseCalDavUrl('/caldav/user1/calendars/')).toEqual({
      userId: 'user1',
    });
  });

  it('parses calendar collection path', () => {
    expect(parseCalDavUrl('/caldav/user1/calendars/cal1/')).toEqual({
      userId: 'user1',
      calendarId: 'cal1',
    });
  });

  it('parses calendar collection path without trailing slash', () => {
    expect(parseCalDavUrl('/caldav/user1/calendars/cal1')).toEqual({
      userId: 'user1',
      calendarId: 'cal1',
    });
  });

  it('parses event resource path', () => {
    expect(parseCalDavUrl('/caldav/user1/calendars/cal1/evt1.ics')).toEqual({
      userId: 'user1',
      calendarId: 'cal1',
      eventUid: 'evt1',
    });
  });

  it('returns null for invalid paths', () => {
    expect(parseCalDavUrl('/invalid/path')).toBeNull();
    expect(parseCalDavUrl('/caldav')).toBeNull();
    expect(parseCalDavUrl('/')).toBeNull();
  });
});

// ─── generateETag tests ─────────────────────────────────────────────────────

describe('generateETag', () => {
  it('generates a quoted ETag from content', () => {
    expect(generateETag('test content')).toMatch(/^"[a-f0-9]{32}"$/);
  });

  it('generates different ETags for different content', () => {
    expect(generateETag('content A')).not.toEqual(generateETag('content B'));
  });

  it('generates the same ETag for the same content', () => {
    expect(generateETag('same')).toEqual(generateETag('same'));
  });
});

// ─── CalDavMiddleware tests ─────────────────────────────────────────────────

describe('CalDavMiddleware', () => {
  let service: jest.Mocked<ICalDavService>;
  let handler: (req: any, res: any, next: NextFunction) => void;

  beforeEach(() => {
    service = createMockService();
    handler = new CalDavMiddleware(service).middleware();
  });

  // ── Authentication ──────────────────────────────────────────────────

  describe('authentication', () => {
    it('returns 401 when Authorization header is missing', () => {
      const { mock, state } = makeRes();
      handler(makeReq({ headers: {} }), mock, mockNext);
      expect(state.statusCode).toBe(401);
      expect(state.headers['www-authenticate']).toBe(
        'Bearer realm="BrightCal CalDAV"',
      );
    });

    it('allows requests with Authorization header', async () => {
      service.getEvent.mockResolvedValue(SAMPLE_EVENT);
      const { mock, state } = makeRes();
      handler(makeReq(), mock, mockNext);
      await tick();
      expect(state.statusCode).toBe(200);
    });
  });

  // ── OPTIONS ─────────────────────────────────────────────────────────

  describe('OPTIONS', () => {
    it('returns supported methods and DAV headers', () => {
      const { mock, state } = makeRes();
      handler(makeReq({ method: 'OPTIONS' }), mock, mockNext);
      expect(state.statusCode).toBe(200);
      expect(state.headers['allow']).toContain('PROPFIND');
      expect(state.headers['allow']).toContain('PUT');
      expect(state.headers['dav']).toContain('calendar-access');
    });
  });

  // ── Invalid URL ─────────────────────────────────────────────────────

  describe('invalid URL', () => {
    it('returns 404 for unrecognized paths', () => {
      const { mock, state } = makeRes();
      handler(makeReq({ path: '/invalid' }), mock, mockNext);
      expect(state.statusCode).toBe(404);
    });
  });

  // ── Unsupported method ──────────────────────────────────────────────

  describe('unsupported method', () => {
    it('returns 405 for unsupported HTTP methods', () => {
      const { mock, state } = makeRes();
      handler(makeReq({ method: 'PATCH' }), mock, mockNext);
      expect(state.statusCode).toBe(405);
      expect(state.headers['allow']).toContain('PROPFIND');
    });
  });

  // ── GET ─────────────────────────────────────────────────────────────

  describe('handleGet', () => {
    it('returns iCalendar data with ETag for a valid event', async () => {
      service.getEvent.mockResolvedValue(SAMPLE_EVENT);
      const { mock, state } = makeRes();
      handler(makeReq({ method: 'GET' }), mock, mockNext);
      await tick();
      expect(state.statusCode).toBe(200);
      expect(state.headers['content-type']).toBe(
        'text/calendar; charset=utf-8',
      );
      expect(state.headers['etag']).toBe('"abc123"');
      expect(state.body).toContain('BEGIN:VCALENDAR');
    });

    it('returns 404 when event is not found', async () => {
      service.getEvent.mockResolvedValue(null);
      const { mock, state } = makeRes();
      handler(makeReq({ method: 'GET' }), mock, mockNext);
      await tick();
      expect(state.statusCode).toBe(404);
    });

    it('returns 304 when If-None-Match matches the ETag', async () => {
      service.getEvent.mockResolvedValue(SAMPLE_EVENT);
      const { mock, state } = makeRes();
      handler(
        makeReq({
          method: 'GET',
          headers: { authorization: 'Bearer t', 'if-none-match': '"abc123"' },
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(304);
    });

    it('returns 200 when If-None-Match does not match', async () => {
      service.getEvent.mockResolvedValue(SAMPLE_EVENT);
      const { mock, state } = makeRes();
      handler(
        makeReq({
          method: 'GET',
          headers: { authorization: 'Bearer t', 'if-none-match': '"other"' },
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(200);
    });

    it('returns 400 when path does not target a specific event', async () => {
      const { mock, state } = makeRes();
      handler(
        makeReq({ method: 'GET', path: '/caldav/user1/calendars/cal1/' }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(400);
    });
  });

  // ── PUT ─────────────────────────────────────────────────────────────

  describe('handlePut', () => {
    const icalBody =
      'BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:X\r\nEND:VEVENT\r\nEND:VCALENDAR';

    it('creates a new event and returns 201', async () => {
      service.putEvent.mockResolvedValue({ created: true, etag: '"new"' });
      const { mock, state } = makeRes();
      handler(makeReq({ method: 'PUT', body: icalBody }), mock, mockNext);
      await tick();
      expect(state.statusCode).toBe(201);
      expect(state.headers['etag']).toBe('"new"');
      expect(service.putEvent).toHaveBeenCalledWith(
        'user1',
        'cal1',
        'evt1',
        icalBody,
        undefined,
      );
    });

    it('updates an existing event and returns 204', async () => {
      service.putEvent.mockResolvedValue({ created: false, etag: '"upd"' });
      const { mock, state } = makeRes();
      handler(
        makeReq({
          method: 'PUT',
          body: icalBody,
          headers: { authorization: 'Bearer t', 'if-match': '"old"' },
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(204);
      expect(service.putEvent).toHaveBeenCalledWith(
        'user1',
        'cal1',
        'evt1',
        icalBody,
        'old',
      );
    });

    it('returns 412 when If-Match ETag does not match', async () => {
      service.putEvent.mockRejectedValue(new Error('PRECONDITION_FAILED'));
      const { mock, state } = makeRes();
      handler(
        makeReq({
          method: 'PUT',
          body: icalBody,
          headers: { authorization: 'Bearer t', 'if-match': '"stale"' },
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(412);
    });

    it('returns 400 when body is empty', async () => {
      const { mock, state } = makeRes();
      handler(makeReq({ method: 'PUT', body: '' }), mock, mockNext);
      await tick();
      expect(state.statusCode).toBe(400);
    });
  });

  // ── DELETE ──────────────────────────────────────────────────────────

  describe('handleDelete', () => {
    it('deletes an event and returns 204', async () => {
      service.deleteEvent.mockResolvedValue(true);
      const { mock, state } = makeRes();
      handler(makeReq({ method: 'DELETE' }), mock, mockNext);
      await tick();
      expect(state.statusCode).toBe(204);
    });

    it('returns 404 when event does not exist', async () => {
      service.deleteEvent.mockResolvedValue(false);
      const { mock, state } = makeRes();
      handler(makeReq({ method: 'DELETE' }), mock, mockNext);
      await tick();
      expect(state.statusCode).toBe(404);
    });

    it('returns 412 when If-Match ETag does not match', async () => {
      service.deleteEvent.mockRejectedValue(new Error('PRECONDITION_FAILED'));
      const { mock, state } = makeRes();
      handler(
        makeReq({
          method: 'DELETE',
          headers: { authorization: 'Bearer t', 'if-match': '"stale"' },
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(412);
    });

    it('passes If-Match ETag to service', async () => {
      service.deleteEvent.mockResolvedValue(true);
      const { mock } = makeRes();
      handler(
        makeReq({
          method: 'DELETE',
          headers: { authorization: 'Bearer t', 'if-match': '"my-etag"' },
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(service.deleteEvent).toHaveBeenCalledWith(
        'user1',
        'cal1',
        'evt1',
        'my-etag',
      );
    });
  });

  // ── PROPFIND ────────────────────────────────────────────────────────

  describe('handlePropfind', () => {
    it('returns calendar list for user root', async () => {
      service.discoverCalendars.mockResolvedValue([SAMPLE_CALENDAR]);
      const { mock, state } = makeRes();
      handler(
        makeReq({ method: 'PROPFIND', path: '/caldav/user1/' }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(207);
      expect(state.headers['content-type']).toBe(
        'application/xml; charset=utf-8',
      );
      expect(state.body).toContain('multistatus');
      expect(state.body).toContain('Work');
    });

    it('returns events for a calendar collection', async () => {
      service.getCalendarEvents.mockResolvedValue([SAMPLE_EVENT]);
      const { mock, state } = makeRes();
      handler(
        makeReq({ method: 'PROPFIND', path: '/caldav/user1/calendars/cal1/' }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(207);
      expect(state.body).toContain('evt1.ics');
    });

    it('returns event properties for a single event', async () => {
      service.getEvent.mockResolvedValue(SAMPLE_EVENT);
      const { mock, state } = makeRes();
      handler(
        makeReq({
          method: 'PROPFIND',
          path: '/caldav/user1/calendars/cal1/evt1.ics',
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(207);
      expect(state.body).toContain('&quot;abc123&quot;');
    });

    it('returns 404 for PROPFIND on non-existent event', async () => {
      service.getEvent.mockResolvedValue(null);
      const { mock, state } = makeRes();
      handler(
        makeReq({
          method: 'PROPFIND',
          path: '/caldav/user1/calendars/cal1/missing.ics',
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(404);
    });
  });

  // ── REPORT ──────────────────────────────────────────────────────────

  describe('handleReport', () => {
    it('returns events matching a calendar-query', async () => {
      service.getCalendarEvents.mockResolvedValue([SAMPLE_EVENT]);
      const { mock, state } = makeRes();
      handler(
        makeReq({
          method: 'REPORT',
          path: '/caldav/user1/calendars/cal1/',
          body: '<C:calendar-query xmlns:C="urn:ietf:params:xml:ns:caldav"><C:filter><C:comp-filter name="VCALENDAR"><C:comp-filter name="VEVENT"><C:time-range start="20240101T000000Z" end="20241231T235959Z"/></C:comp-filter></C:comp-filter></C:filter></C:calendar-query>',
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(207);
      expect(state.body).toContain('calendar-data');
      expect(service.getCalendarEvents).toHaveBeenCalledWith(
        'user1',
        'cal1',
        expect.objectContaining({
          timeRangeStart: '20240101T000000Z',
          timeRangeEnd: '20241231T235959Z',
        }),
      );
    });

    it('returns 400 when REPORT targets user root (no calendar)', async () => {
      const { mock, state } = makeRes();
      handler(
        makeReq({ method: 'REPORT', path: '/caldav/user1/' }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(400);
    });
  });

  // ── MKCALENDAR ──────────────────────────────────────────────────────

  describe('handleMkcalendar', () => {
    it('creates a calendar and returns 201 with Location header', async () => {
      service.createCalendar.mockResolvedValue({
        ...SAMPLE_CALENDAR,
        calendarId: 'new-cal',
      });
      const { mock, state } = makeRes();
      handler(
        makeReq({
          method: 'MKCALENDAR',
          path: '/caldav/user1/calendars/new-cal/',
          body: '<D:displayname>My Calendar</D:displayname>',
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(201);
      expect(state.headers['location']).toBe(
        '/caldav/user1/calendars/new-cal/',
      );
      expect(service.createCalendar).toHaveBeenCalledWith(
        'user1',
        'My Calendar',
      );
    });

    it('uses calendarId as display name when body has no displayname', async () => {
      service.createCalendar.mockResolvedValue(SAMPLE_CALENDAR);
      const { mock } = makeRes();
      handler(
        makeReq({
          method: 'MKCALENDAR',
          path: '/caldav/user1/calendars/cal1/',
          body: '',
        }),
        mock,
        mockNext,
      );
      await tick();
      expect(service.createCalendar).toHaveBeenCalledWith('user1', 'cal1');
    });
  });

  // ── POST (Scheduling Outbox) ────────────────────────────────────────

  describe('handlePost', () => {
    it('returns a schedule-response XML', async () => {
      const { mock, state } = makeRes();
      handler(
        makeReq({ method: 'POST', path: '/caldav/user1/calendars/' }),
        mock,
        mockNext,
      );
      await tick();
      expect(state.statusCode).toBe(200);
      expect(state.body).toContain('schedule-response');
      expect(state.body).toContain('2.0;Success');
    });
  });

  // ── Permission errors ───────────────────────────────────────────────

  describe('permission errors', () => {
    it('returns 403 when service throws FORBIDDEN', async () => {
      service.getEvent.mockRejectedValue(new Error('FORBIDDEN'));
      const { mock, state } = makeRes();
      handler(makeReq({ method: 'GET' }), mock, mockNext);
      await tick();
      expect(state.statusCode).toBe(403);
      expect(state.body).toContain('need-privileges');
    });
  });
});
