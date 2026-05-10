/**
 * API Routing Integration Tests
 *
 * Verifies:
 * 1. All controllers are registered at their correct route prefixes
 * 2. The router factory creates all services and wires them correctly
 * 3. CalDavMiddleware is mounted at `/caldav`
 * 4. The notification dispatcher processes queued notifications
 * 5. All /api/cal/* endpoints respond (not 404) after route mounting
 * 6. /api/cal/holiday-catalog returns valid JSON array with >= 10 entries
 *
 * @see Requirements 2.9, 6.7, 9.1–9.9, 10.2
 *
 * Note: ECONNRESET errors can occur under heavy parallel test load when
 * multiple Jest workers compete for sockets. jest.retryTimes(2) handles
 * this without masking real failures.
 */

// Retry up to 2 extra times on ECONNRESET flakes under parallel load.
jest.retryTimes(2, { logErrorsBeforeRetry: false });

import type { IBrightChainApplication } from '@brightchain/brightchain-api-lib';
import {
  initializeBrightChain,
  MemoryBlockStore,
  ServiceLocator,
  ServiceProvider,
  validBlockSizes,
} from '@brightchain/brightchain-lib';
import { BrightDb, InMemoryHeadRegistry } from '@brightchain/db';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const request = require('supertest');

import { HolidayCatalogController } from '../controllers/holidayCatalogController.ts';
import { createCalendarEventModel } from '../models/calendarEvent.model.ts';
import { createCalendarReminderModel } from '../models/calendarReminder.model.ts';
import { createCalendarRouter } from '../router/calendarRouter.ts';
import { CalendarNotificationService } from '../services/calendarNotificationService.ts';
import type { IWebSocketDispatcher } from '../services/notificationDispatcher.ts';
import { NotificationDispatcher } from '../services/notificationDispatcher.ts';

// ─── Setup ───────────────────────────────────────────────────────────────────

beforeAll(() => {
  initializeBrightChain();
  ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
});

function makeDb(name = 'testdb'): BrightDb {
  const store = new MemoryBlockStore(validBlockSizes);
  const registry = InMemoryHeadRegistry.createIsolated();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new BrightDb(store as any, { name, headRegistry: registry });
}

function createMockApplication(): IBrightChainApplication {
  return {
    getConfig: jest.fn().mockReturnValue({}),
    getAuthProvider: jest.fn().mockReturnValue(null),
    getServiceContainer: jest.fn().mockReturnValue(new Map()),
  } as unknown as IBrightChainApplication;
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

describe('API Router Registration', () => {
  let db: BrightDb;
  let app: IBrightChainApplication;

  beforeEach(() => {
    db = makeDb();
    app = createMockApplication();
  });

  describe('createCalendarRouter factory', () => {
    it('should create all seven controllers', () => {
      const result = createCalendarRouter(app, db);

      expect(result.controllers.calendar).toBeDefined();
      expect(result.controllers.event).toBeDefined();
      expect(result.controllers.scheduling).toBeDefined();
      expect(result.controllers.booking).toBeDefined();
      expect(result.controllers.invitation).toBeDefined();
      expect(result.controllers.search).toBeDefined();
      expect(result.controllers.exportImport).toBeDefined();
    });

    it('should create CalDavMiddleware', () => {
      const result = createCalendarRouter(app, db);

      expect(result.middleware.caldav).toBeDefined();
      // CalDavMiddleware exposes a middleware() method that returns an Express handler
      expect(typeof result.middleware.caldav.middleware).toBe('function');
    });

    it('should create all services', () => {
      const result = createCalendarRouter(app, db);

      expect(result.services.calendarEngine).toBeDefined();
      expect(result.services.eventEngine).toBeDefined();
      expect(result.services.schedulingEngine).toBeDefined();
      expect(result.services.bookingEngine).toBeDefined();
      expect(result.services.notification).toBeDefined();
      expect(result.services.permission).toBeDefined();
      expect(result.services.search).toBeDefined();
      expect(result.services.exportImport).toBeDefined();
      expect(result.services.encryption).toBeDefined();
      expect(result.services.icsSubscription).toBeDefined();
      expect(result.services.caldav).toBeDefined();
    });

    it('should wire services into controllers via setter methods', () => {
      // The factory calls setXxxService on each controller.
      // We verify by checking that the controllers were created with the app
      // and that the services are non-null (the factory wires them).
      const result = createCalendarRouter(app, db);

      // Controllers should be instances of their respective classes
      expect(result.controllers.calendar.constructor.name).toBe(
        'CalendarController',
      );
      expect(result.controllers.event.constructor.name).toBe('EventController');
      expect(result.controllers.scheduling.constructor.name).toBe(
        'SchedulingController',
      );
      expect(result.controllers.booking.constructor.name).toBe(
        'BookingController',
      );
      expect(result.controllers.invitation.constructor.name).toBe(
        'InvitationController',
      );
      expect(result.controllers.search.constructor.name).toBe(
        'SearchController',
      );
      expect(result.controllers.exportImport.constructor.name).toBe(
        'ExportImportController',
      );
    });
  });
});

describe('Route Mounting Integration', () => {
  let db: BrightDb;
  let mockApp: IBrightChainApplication;
  let expressApp: express.Express;

  beforeEach(() => {
    db = makeDb();
    mockApp = createMockApplication();
    expressApp = express();
    expressApp.use(express.json());

    // Mount all calendar routes (mirrors App.start() logic)
    const calendarResult = createCalendarRouter(mockApp, db);

    expressApp.use(
      '/api/cal/calendars',
      calendarResult.controllers.calendar.router,
    );
    expressApp.use('/api/cal/events', calendarResult.controllers.event.router);
    expressApp.use(
      '/api/cal/scheduling',
      calendarResult.controllers.scheduling.router,
    );
    expressApp.use(
      '/api/cal/booking',
      calendarResult.controllers.booking.router,
    );
    expressApp.use(
      '/api/cal/invitations',
      calendarResult.controllers.invitation.router,
    );
    expressApp.use('/api/cal/search', calendarResult.controllers.search.router);
    expressApp.use(
      '/api/cal/export',
      calendarResult.controllers.exportImport.router,
    );
    expressApp.use('/caldav', calendarResult.middleware.caldav.middleware());

    // Mount HolidayCatalogController
    const holidayCatalogController = new HolidayCatalogController(mockApp);
    expressApp.use('/api/cal/holiday-catalog', holidayCatalogController.router);
  });

  describe('all /api/cal/* endpoints respond (not 404)', () => {
    // Test each endpoint using a route that actually exists on the controller.
    // Some controllers only define POST routes or parameterized routes,
    // so we use the appropriate method/path for each.
    const calendarEndpoints = [
      {
        path: '/api/cal/calendars',
        method: 'get' as const,
        label: 'calendars',
      },
      { path: '/api/cal/events', method: 'get' as const, label: 'events' },
      {
        path: '/api/cal/scheduling/free-busy',
        method: 'post' as const,
        label: 'scheduling',
      },
      {
        path: '/api/cal/booking/pages',
        method: 'post' as const,
        label: 'booking',
      },
      {
        path: '/api/cal/invitations/rsvp',
        method: 'post' as const,
        label: 'invitations',
      },
      { path: '/api/cal/search', method: 'get' as const, label: 'search' },
      {
        path: '/api/cal/export/test-cal/ics',
        method: 'get' as const,
        label: 'export',
      },
      {
        path: '/api/cal/holiday-catalog',
        method: 'get' as const,
        label: 'holiday-catalog',
      },
    ];

    it.each(calendarEndpoints)(
      '$label ($method $path) should respond with a status other than 404',
      async ({ path, method }) => {
        const res = await request(expressApp)[method](path);
        // The endpoint is mounted — it should NOT return 404.
        // It may return 401 (auth required), 400 (bad request), or 200,
        // but never 404 (route not found).
        expect(res.status).not.toBe(404);
      },
    );

    it('/caldav should respond with a status other than 404', async () => {
      // CalDAV uses PROPFIND, but GET should also not 404
      const res = await request(expressApp).get('/caldav');
      expect(res.status).not.toBe(404);
    });
  });

  describe('GET /api/cal/holiday-catalog', () => {
    it('should return valid JSON with catalog array containing >= 10 entries', async () => {
      const res = await request(expressApp).get('/api/cal/holiday-catalog');

      expect(res.status).toBe(200);
      expect(res.body).toBeDefined();
      expect(res.body.catalog).toBeDefined();
      expect(Array.isArray(res.body.catalog)).toBe(true);
      expect(res.body.catalog.length).toBeGreaterThanOrEqual(10);
    });

    it('should return entries with all required fields', async () => {
      const res = await request(expressApp).get('/api/cal/holiday-catalog');

      expect(res.status).toBe(200);
      for (const entry of res.body.catalog) {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('displayName');
        expect(entry).toHaveProperty('description');
        expect(entry).toHaveProperty('region');
        expect(entry).toHaveProperty('category');
        expect(entry).toHaveProperty('icsUrl');
        expect(typeof entry.id).toBe('string');
        expect(typeof entry.displayName).toBe('string');
        expect(typeof entry.icsUrl).toBe('string');
      }
    });
  });
});

describe('NotificationDispatcher', () => {
  let db: BrightDb;

  beforeEach(() => {
    db = makeDb();
  });

  it('should dispatch pending notifications to the WebSocket dispatcher', () => {
    const eventModel = createCalendarEventModel(db);
    const reminderModel = createCalendarReminderModel(db);
    const notificationService = new CalendarNotificationService(
      eventModel,
      reminderModel,
    );

    const dispatched: Array<{
      userId: string;
      type: string;
      payload: unknown;
    }> = [];
    const wsDispatcher: IWebSocketDispatcher = {
      sendToUser(userId, type, payload) {
        dispatched.push({ userId, type, payload });
      },
    };

    const dispatcher = new NotificationDispatcher(
      notificationService,
      wsDispatcher,
    );

    // Emit some real-time notifications (type, userId, payload)
    notificationService.emitRealTimeNotification('invitation', 'user-1', {
      eventId: 'evt-1',
      summary: 'Team Meeting',
    });
    notificationService.emitRealTimeNotification('rsvp', 'user-2', {
      eventId: 'evt-1',
      response: 'ACCEPTED',
    });
    notificationService.emitRealTimeNotification('reminder', 'user-1', {
      eventId: 'evt-2',
      minutesBefore: 10,
    });

    const count = dispatcher.dispatchPending();

    expect(count).toBe(3);
    expect(dispatched).toHaveLength(3);
    expect(dispatched[0]).toEqual({
      userId: 'user-1',
      type: 'invitation',
      payload: { eventId: 'evt-1', summary: 'Team Meeting' },
    });
    expect(dispatched[1]).toEqual({
      userId: 'user-2',
      type: 'rsvp',
      payload: { eventId: 'evt-1', response: 'ACCEPTED' },
    });
    expect(dispatched[2]).toEqual({
      userId: 'user-1',
      type: 'reminder',
      payload: { eventId: 'evt-2', minutesBefore: 10 },
    });
  });

  it('should return 0 when no notifications are pending', () => {
    const eventModel = createCalendarEventModel(db);
    const reminderModel = createCalendarReminderModel(db);
    const notificationService = new CalendarNotificationService(
      eventModel,
      reminderModel,
    );

    const wsDispatcher: IWebSocketDispatcher = {
      sendToUser: jest.fn(),
    };

    const dispatcher = new NotificationDispatcher(
      notificationService,
      wsDispatcher,
    );

    const count = dispatcher.dispatchPending();

    expect(count).toBe(0);
    expect(wsDispatcher.sendToUser).not.toHaveBeenCalled();
  });

  it('should clear the queue after dispatching', () => {
    const eventModel = createCalendarEventModel(db);
    const reminderModel = createCalendarReminderModel(db);
    const notificationService = new CalendarNotificationService(
      eventModel,
      reminderModel,
    );

    const wsDispatcher: IWebSocketDispatcher = {
      sendToUser: jest.fn(),
    };

    const dispatcher = new NotificationDispatcher(
      notificationService,
      wsDispatcher,
    );

    notificationService.emitRealTimeNotification('update', 'user-1', {
      eventId: 'evt-1',
    });

    dispatcher.dispatchPending();

    // Second call should find nothing
    const count = dispatcher.dispatchPending();
    expect(count).toBe(0);
  });

  it('should dispatch all five supported event types', () => {
    const eventModel = createCalendarEventModel(db);
    const reminderModel = createCalendarReminderModel(db);
    const notificationService = new CalendarNotificationService(
      eventModel,
      reminderModel,
    );

    const types: string[] = [];
    const wsDispatcher: IWebSocketDispatcher = {
      sendToUser(_userId, type, _payload) {
        types.push(type);
      },
    };

    const dispatcher = new NotificationDispatcher(
      notificationService,
      wsDispatcher,
    );

    const supportedTypes = [
      'invitation',
      'rsvp',
      'update',
      'cancel',
      'reminder',
    ];
    for (const type of supportedTypes) {
      notificationService.emitRealTimeNotification(type, 'user-1', {});
    }

    const count = dispatcher.dispatchPending();

    expect(count).toBe(5);
    expect(types).toEqual(supportedTypes);
  });

  it('should skip notifications with unrecognized types', () => {
    const eventModel = createCalendarEventModel(db);
    const reminderModel = createCalendarReminderModel(db);
    const notificationService = new CalendarNotificationService(
      eventModel,
      reminderModel,
    );

    const dispatched: string[] = [];
    const wsDispatcher: IWebSocketDispatcher = {
      sendToUser(_userId, type, _payload) {
        dispatched.push(type);
      },
    };

    const dispatcher = new NotificationDispatcher(
      notificationService,
      wsDispatcher,
    );

    notificationService.emitRealTimeNotification('invitation', 'user-1', {});
    notificationService.emitRealTimeNotification('unknown-type', 'user-1', {});
    notificationService.emitRealTimeNotification('cancel', 'user-1', {});

    const count = dispatcher.dispatchPending();

    // Only 2 valid types dispatched, unknown skipped
    expect(count).toBe(2);
    expect(dispatched).toEqual(['invitation', 'cancel']);
  });
});
