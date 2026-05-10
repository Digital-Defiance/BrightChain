/**
 * EventController — unit tests.
 *
 * Tests event CRUD operations, input validation, authentication enforcement,
 * recurrence modification modes, and error handling by mocking the
 * IEventEngineService interface.
 *
 * @see Requirements 4.1, 4.3, 4.4, 5.5, 5.6, 5.7
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { EventTransparency, EventVisibility } from '@brightchain/brightcal-lib';
import type { ITypedCalendarEvent } from '../../models/calendarEvent.model.ts';
import { EventController, IEventEngineService } from '../eventController.ts';

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

function createMockService(): jest.Mocked<IEventEngineService> {
  return {
    createEvent: jest.fn(),
    listEvents: jest.fn(),
    getEventById: jest.fn(),
    updateEvent: jest.fn(),
    deleteEvent: jest.fn(),
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReq(overrides: Record<string, any> = {}): any {
  return { user: undefined, params: {}, body: {}, query: {}, ...overrides };
}

const SAMPLE_EVENT: ITypedCalendarEvent = {
  id: 'evt-1',
  calendarId: 'cal-1',
  uid: '550e8400-e29b-41d4-a716-446655440000',
  sequence: 0,
  summary: 'Team Standup',
  dtstart: new Date('2024-01-15T09:00:00Z'),
  dtend: new Date('2024-01-15T09:30:00Z'),
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
  dateCreated: new Date(),
  dateModified: new Date(),
  searchText: 'Team Standup',
};

const VALID_CREATE_BODY = {
  calendarId: 'cal-1',
  summary: 'Team Standup',
  dtstart: '2024-01-15T09:00:00Z',
  dtend: '2024-01-15T09:30:00Z',
  dtstartTzid: 'America/New_York',
  dtendTzid: 'America/New_York',
  allDay: false,
  visibility: EventVisibility.Public,
  transparency: EventTransparency.Opaque,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('EventController', () => {
  let controller: EventController;
  let service: jest.Mocked<IEventEngineService>;

  beforeEach(() => {
    const app = createMockApplication();
    controller = new EventController(app as any);
    service = createMockService();
    controller.setEventService(service);
  });

  // ── POST / (createEvent) ─────────────────────────────────────────────

  describe('POST / (createEvent)', () => {
    it('should return 201 with created event on valid input', async () => {
      service.createEvent.mockResolvedValue(SAMPLE_EVENT);

      const req = makeReq({
        user: { id: 'user-1' },
        body: { ...VALID_CREATE_BODY },
      });

      const result = await (controller as any).handleCreateEvent(req);

      expect(result.statusCode).toBe(201);
      expect(result.response.event).toEqual(SAMPLE_EVENT);
      expect(service.createEvent).toHaveBeenCalledWith(
        'user-1',
        VALID_CREATE_BODY,
      );
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({ body: { ...VALID_CREATE_BODY } });

      const result = await (controller as any).handleCreateEvent(req);

      expect(result.statusCode).toBe(401);
    });

    it('should return 400 if calendarId is missing', async () => {
      const { calendarId: _, ...bodyWithout } = VALID_CREATE_BODY;
      const req = makeReq({
        user: { id: 'user-1' },
        body: bodyWithout,
      });

      const result = await (controller as any).handleCreateEvent(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if summary is missing', async () => {
      const { summary: _, ...bodyWithout } = VALID_CREATE_BODY;
      const req = makeReq({
        user: { id: 'user-1' },
        body: bodyWithout,
      });

      const result = await (controller as any).handleCreateEvent(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if dtstart is invalid', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { ...VALID_CREATE_BODY, dtstart: 'not-a-date' },
      });

      const result = await (controller as any).handleCreateEvent(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if dtend is before dtstart', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: {
          ...VALID_CREATE_BODY,
          dtstart: '2024-01-15T10:00:00Z',
          dtend: '2024-01-15T09:00:00Z',
        },
      });

      const result = await (controller as any).handleCreateEvent(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if visibility is invalid', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { ...VALID_CREATE_BODY, visibility: 'INVALID' },
      });

      const result = await (controller as any).handleCreateEvent(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 if transparency is invalid', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        body: { ...VALID_CREATE_BODY, transparency: 'INVALID' },
      });

      const result = await (controller as any).handleCreateEvent(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 503 if service is not available', async () => {
      const app = createMockApplication();
      const noServiceController = new EventController(app as any);
      // Don't call setEventService — service stays null

      const req = makeReq({
        user: { id: 'user-1' },
        body: { ...VALID_CREATE_BODY },
      });

      const result = await (noServiceController as any).handleCreateEvent(req);

      expect(result.statusCode).toBe(503);
    });
  });

  // ── GET / (listEvents) ──────────────────────────────────────────────

  describe('GET / (listEvents)', () => {
    it('should return 200 with list of events', async () => {
      const events = [SAMPLE_EVENT];
      service.listEvents.mockResolvedValue(events);

      const req = makeReq({
        user: { id: 'user-1' },
        query: { calendarId: 'cal-1' },
      });

      const result = await (controller as any).handleListEvents(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.events).toEqual(events);
      expect(service.listEvents).toHaveBeenCalledWith(
        'user-1',
        'cal-1',
        undefined,
        undefined,
      );
    });

    it('should return 400 if calendarId is missing', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        query: {},
      });

      const result = await (controller as any).handleListEvents(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({ query: { calendarId: 'cal-1' } });

      const result = await (controller as any).handleListEvents(req);

      expect(result.statusCode).toBe(401);
    });
  });

  // ── GET /:id (getEvent) ─────────────────────────────────────────────

  describe('GET /:id (getEvent)', () => {
    it('should return 200 with event', async () => {
      service.getEventById.mockResolvedValue(SAMPLE_EVENT);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'evt-1' },
      });

      const result = await (controller as any).handleGetEvent(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.event).toEqual(SAMPLE_EVENT);
      expect(service.getEventById).toHaveBeenCalledWith('evt-1', 'user-1');
    });

    it('should return 404 if event not found', async () => {
      service.getEventById.mockResolvedValue(null);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'nonexistent' },
      });

      const result = await (controller as any).handleGetEvent(req);

      expect(result.statusCode).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({ params: { id: 'evt-1' } });

      const result = await (controller as any).handleGetEvent(req);

      expect(result.statusCode).toBe(401);
    });
  });

  // ── PATCH /:id (updateEvent) ────────────────────────────────────────

  describe('PATCH /:id (updateEvent)', () => {
    it('should return 200 with updated event (mode all)', async () => {
      const updated = { ...SAMPLE_EVENT, summary: 'Updated Standup' };
      service.updateEvent.mockResolvedValue(updated);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'evt-1' },
        body: { summary: 'Updated Standup', modificationMode: 'all' },
      });

      const result = await (controller as any).handleUpdateEvent(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.event).toEqual(updated);
      expect(service.updateEvent).toHaveBeenCalledWith(
        'evt-1',
        'user-1',
        { summary: 'Updated Standup' },
        'all',
      );
    });

    it('should return 200 with exception event (mode single)', async () => {
      const exception = {
        ...SAMPLE_EVENT,
        id: 'evt-1-exc',
        recurrenceId: new Date('2024-01-15T09:00:00Z'),
        summary: 'Modified Occurrence',
      };
      service.updateEvent.mockResolvedValue(exception);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'evt-1' },
        body: { summary: 'Modified Occurrence', modificationMode: 'single' },
      });

      const result = await (controller as any).handleUpdateEvent(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.event).toEqual(exception);
      expect(service.updateEvent).toHaveBeenCalledWith(
        'evt-1',
        'user-1',
        { summary: 'Modified Occurrence' },
        'single',
      );
    });

    it('should return 400 if summary is empty string', async () => {
      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'evt-1' },
        body: { summary: '' },
      });

      const result = await (controller as any).handleUpdateEvent(req);

      expect(result.statusCode).toBe(400);
    });

    it('should return 403 if service throws FORBIDDEN', async () => {
      service.updateEvent.mockRejectedValue(new Error('FORBIDDEN'));

      const req = makeReq({
        user: { id: 'other-user' },
        params: { id: 'evt-1' },
        body: { summary: 'Hacked' },
      });

      const result = await (controller as any).handleUpdateEvent(req);

      expect(result.statusCode).toBe(403);
    });

    it('should return 404 if event not found', async () => {
      service.updateEvent.mockResolvedValue(null);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'nonexistent' },
        body: { summary: 'New Name' },
      });

      const result = await (controller as any).handleUpdateEvent(req);

      expect(result.statusCode).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({
        params: { id: 'evt-1' },
        body: { summary: 'X' },
      });

      const result = await (controller as any).handleUpdateEvent(req);

      expect(result.statusCode).toBe(401);
    });

    it('should default to mode all if modificationMode not specified', async () => {
      const updated = { ...SAMPLE_EVENT, summary: 'Updated' };
      service.updateEvent.mockResolvedValue(updated);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'evt-1' },
        body: { summary: 'Updated' },
      });

      const result = await (controller as any).handleUpdateEvent(req);

      expect(result.statusCode).toBe(200);
      expect(service.updateEvent).toHaveBeenCalledWith(
        'evt-1',
        'user-1',
        { summary: 'Updated' },
        'all',
      );
    });
  });

  // ── DELETE /:id (deleteEvent) ───────────────────────────────────────

  describe('DELETE /:id (deleteEvent)', () => {
    it('should return 200 with success on deletion', async () => {
      service.deleteEvent.mockResolvedValue(true);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'evt-1' },
        query: {},
      });

      const result = await (controller as any).handleDeleteEvent(req);

      expect(result.statusCode).toBe(200);
      expect(result.response.success).toBe(true);
    });

    it('should return 403 if service throws FORBIDDEN', async () => {
      service.deleteEvent.mockRejectedValue(new Error('FORBIDDEN'));

      const req = makeReq({
        user: { id: 'other-user' },
        params: { id: 'evt-1' },
        query: {},
      });

      const result = await (controller as any).handleDeleteEvent(req);

      expect(result.statusCode).toBe(403);
    });

    it('should return 404 if event not found', async () => {
      service.deleteEvent.mockResolvedValue(false);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'nonexistent' },
        query: {},
      });

      const result = await (controller as any).handleDeleteEvent(req);

      expect(result.statusCode).toBe(404);
    });

    it('should return 401 if not authenticated', async () => {
      const req = makeReq({ params: { id: 'evt-1' }, query: {} });

      const result = await (controller as any).handleDeleteEvent(req);

      expect(result.statusCode).toBe(401);
    });

    it('should default to mode all if mode query param not specified', async () => {
      service.deleteEvent.mockResolvedValue(true);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'evt-1' },
        query: {},
      });

      await (controller as any).handleDeleteEvent(req);

      expect(service.deleteEvent).toHaveBeenCalledWith(
        'evt-1',
        'user-1',
        'all',
      );
    });

    it('should pass mode single from query param', async () => {
      service.deleteEvent.mockResolvedValue(true);

      const req = makeReq({
        user: { id: 'user-1' },
        params: { id: 'evt-1' },
        query: { mode: 'single' },
      });

      await (controller as any).handleDeleteEvent(req);

      expect(service.deleteEvent).toHaveBeenCalledWith(
        'evt-1',
        'user-1',
        'single',
      );
    });
  });
});
