/**
 * CalendarController — unit tests.
 *
 * Tests CRUD operations, input validation, authentication enforcement,
 * and error handling by mocking the ICalendarEngineService interface.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 6.1, 6.2, 6.3
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { CalendarPermissionLevel } from '@brightchain/brightcal-lib';
import {
  CalendarController,
  ICalendarEngineService,
} from '../calendarController.ts';

// ─── Mock application ────────────────────────────────────────────────────────

function createMockApplication() {
  const mockServices = {
    get: jest.fn(() => null),
  };
  const mockSession = {
    withTransaction: jest.fn(async (cb: (s: unknown) => Promise<unknown>) =>
      cb(undefined),
    ),
    endSession: jest.fn(),
  } as any;
  const mockConnection = {
    startSession: jest.fn(async () => mockSession),
  } as any;

  return {
    services: mockServices,
    db: { connection: mockConnection },
    environment: { mongo: { useTransactions: false } },
    constants: {},
  };
}

// ─── Mock service ────────────────────────────────────────────────────────────

function createMockService(): jest.Mocked<ICalendarEngineService> {
  return {
    createCalendar: jest.fn(),
    listCalendarsForUser: jest.fn(),
    getCalendarById: jest.fn(),
    updateCalendar: jest.fn(),
    deleteCalendar: jest.fn(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(overrides: Record<string, any> = {}): any {
  return { user: undefined, params: {}, body: {}, ...overrides };
}

const SAMPLE_CALENDAR = {
  id: 'cal-1',
  ownerId: 'user-1',
  displayName: 'Work',
  color: '#4285F4',
  description: '',
  isDefault: false,
  isSubscription: false,
  defaultPermission: CalendarPermissionLevel.Viewer,
  dateCreated: new Date(),
  dateModified: new Date(),
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CalendarController', () => {
  let controller: CalendarController;
  let service: jest.Mocked<ICalendarEngineService>;

  beforeEach(() => {
    const app = createMockApplication();
    controller = new CalendarController(app as any);
    service = createMockService();
    controller.setCalendarService(service);
  });

  // ── POST / (createCalendar) ──────────────────────────────────────────

  describe('POST / (createCalendar)', () => {
    it('should return 201 with created calendar on valid input', async () => {
      service.createCalendar.mockResolvedValue(SAMPLE_CALENDAR as any);

      const req = makeReq({
        user: { id: 'user-1' },
        body: { displayName: 'Work', color: '#4285F4', description: 'desc' },
      });

      const result = await (controller as any).handleCreateCalendar(req);

      expect(result.statusCode).toBe(201);
      expect(result.response.calendar).toEqual(SAMPLE_CALENDAR);
      expect(service.createCalendar).toHaveBeenCalledWith(
        'user-1',
        'Work',
        '#4285F4',
        'desc',
      );
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({ body: { displayName: 'X', color: '#000000' } });

      const result = await (controller as any).handleCreateCalendar(req);

      expect(result.statusCode).toBe(401);
    });

    it('should return 400 if displayName is missing', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { color: '#FF5733' },
      });

      const result = await (controller as any).handleCreateCalendar(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if color is invalid (not hex)', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { displayName: 'Work', color: 'red' },
      });

      const result = await (controller as any).handleCreateCalendar(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if displayName exceeds 255 chars', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { displayName: 'A'.repeat(256), color: '#FF5733' },
      });

      const result = await (controller as any).handleCreateCalendar(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 503 if service is not available', async () => {
      const app = createMockApplication();
      const noServiceController = new CalendarController(app as any);
      // Don't call setCalendarService — service stays null

      const req = makeReq({
        user: { id: 'user-1' },
        body: { displayName: 'Work', color: '#FF5733' },
      });

      const result = await (noServiceController as any).handleCreateCalendar(
        req,
      );

      expect(result.statusCode).toBe(503);
    });
  });

  // ── GET / (listCalendars) ────────────────────────────────────────────

  describe('GET / (listCalendars)', () => {
    it('should return 200 with list of calendars', async () => {
      const calendars = [
        { ...SAMPLE_CALENDAR, permission: CalendarPermissionLevel.Owner },
      ];
      service.listCalendarsForUser.mockResolvedValue(calendars as any);

      const req = makeReq({ user: { id: 'user-1' } });

      const result = await (controller as any).handleListCalendars(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.calendars).toEqual(calendars);
      expect(service.listCalendarsForUser).toHaveBeenCalledWith('user-1');
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq();

      const result = await (controller as any).handleListCalendars(req);

      expect(result.statusCode).toBe(401);
    });
  });

  // ── GET /:id (getCalendar) ───────────────────────────────────────────

  describe('GET /:id (getCalendar)', () => {
    it('should return 200 with calendar and permission', async () => {
      service.getCalendarById.mockResolvedValue({
        calendar: SAMPLE_CALENDAR as any,
        permission: CalendarPermissionLevel.Owner,
      });

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'cal-1' },
      });

      const result = await (controller as any).handleGetCalendar(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.calendar).toEqual(SAMPLE_CALENDAR);
      expect(result.response.permission).toBe(CalendarPermissionLevel.Owner);
    });

    it('should return 404 if calendar not found', async () => {
      service.getCalendarById.mockResolvedValue(null);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'nonexistent' },
      });

      const result = await (controller as any).handleGetCalendar(req);

      expect(result.statusCode).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({ params: { id: 'cal-1' } });

      const result = await (controller as any).handleGetCalendar(req);

      expect(result.statusCode).toBe(401);
    });
  });

  // ── PATCH /:id (updateCalendar) ──────────────────────────────────────

  describe('PATCH /:id (updateCalendar)', () => {
    it('should return 200 with updated calendar', async () => {
      const updated = { ...SAMPLE_CALENDAR, displayName: 'Personal' };
      service.updateCalendar.mockResolvedValue(updated as any);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'cal-1' },
        body: { displayName: 'Personal' },
      });

      const result = await (controller as any).handleUpdateCalendar(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.calendar).toEqual(updated);
    });

    it('should return 400 if no update fields provided', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'cal-1' },
        body: {},
      });

      const result = await (controller as any).handleUpdateCalendar(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if color is invalid', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'cal-1' },
        body: { color: 'not-hex' },
      });

      const result = await (controller as any).handleUpdateCalendar(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 403 if not the owner (service throws FORBIDDEN)', async () => {
      service.updateCalendar.mockRejectedValue(new Error('FORBIDDEN'));

      const req = makeReq({
        user: { id: 'other-user' },
        params: { id: 'cal-1' },
        body: { displayName: 'Hacked' },
      });

      const result = await (controller as any).handleUpdateCalendar(req);

      expect(result.statusCode).toBe(403);
    });

    it('should return 404 if calendar not found', async () => {
      service.updateCalendar.mockResolvedValue(null);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'nonexistent' },
        body: { displayName: 'New Name' },
      });

      const result = await (controller as any).handleUpdateCalendar(req);

      expect(result.statusCode).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({
        params: { id: 'cal-1' },
        body: { displayName: 'X' },
      });

      const result = await (controller as any).handleUpdateCalendar(req);

      expect(result.statusCode).toBe(401);
    });
  });

  // ── DELETE /:id (deleteCalendar) ─────────────────────────────────────

  describe('DELETE /:id (deleteCalendar)', () => {
    it('should return 200 with success on deletion', async () => {
      service.deleteCalendar.mockResolvedValue(true);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'cal-1' },
      });

      const result = await (controller as any).handleDeleteCalendar(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.success).toBe(true);
    });

    it('should return 403 if not the owner', async () => {
      service.deleteCalendar.mockRejectedValue(new Error('FORBIDDEN'));

      const req = makeReq({
        user: { id: 'other-user' },
        params: { id: 'cal-1' },
      });

      const result = await (controller as any).handleDeleteCalendar(req);

      expect(result.statusCode).toBe(403);
    });

    it('should return 404 if calendar not found', async () => {
      service.deleteCalendar.mockResolvedValue(false);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'nonexistent' },
      });

      const result = await (controller as any).handleDeleteCalendar(req);

      expect(result.statusCode).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({ params: { id: 'cal-1' } });

      const result = await (controller as any).handleDeleteCalendar(req);

      expect(result.statusCode).toBe(401);
    });
  });
});
