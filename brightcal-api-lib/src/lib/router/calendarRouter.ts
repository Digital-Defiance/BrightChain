/**
 * Calendar Router Factory
 *
 * Creates and wires all BrightCal controllers, services, and middleware.
 * This is the main entry point for integrating BrightCal into the
 * BrightChain API application.
 *
 * The factory:
 * 1. Creates all BrightDb models from the db instance
 * 2. Creates all services with their dependencies
 * 3. Creates all controllers with the app instance
 * 4. Injects services into controllers via their setter methods
 * 5. Returns the wired-up controllers, middleware, and services
 *
 * @see Requirements: All API requirements
 */

import type { IBrightChainApplication } from '@brightchain/brightchain-api-lib';
import type { BrightDb } from '@brightchain/db';

import { CalDavMiddleware } from '../caldav/calDavMiddleware.js';
import { CalDavService } from '../caldav/calDavService.js';
import { BookingController } from '../controllers/bookingController.js';
import { CalendarController } from '../controllers/calendarController.js';
import { EventController } from '../controllers/eventController.js';
import { ExportImportController } from '../controllers/exportImportController.js';
import { InvitationController } from '../controllers/invitationController.js';
import { SchedulingController } from '../controllers/schedulingController.js';
import { SearchController } from '../controllers/searchController.js';
import {
  createBookingAppointmentModel,
  createBookingPageModel,
  createCalendarCollectionModel,
  createCalendarEventModel,
  createCalendarReminderModel,
  createCalendarShareModel,
  createFreeBusySummaryModel,
} from '../models/index.js';
import { BookingEngineService } from '../services/bookingEngineService.js';
import { CalendarEngineService } from '../services/calendarEngineService.js';
import { CalendarNotificationService } from '../services/calendarNotificationService.js';
import { CalendarPermissionService } from '../services/calendarPermissionService.js';
import { EncryptionService } from '../services/encryptionService.js';
import { EventEngineService } from '../services/eventEngineService.js';
import { ExportImportService } from '../services/exportImportService.js';
import { IcsSubscriptionService } from '../services/icsSubscriptionService.js';
import { SchedulingEngineService } from '../services/schedulingEngineService.js';
import { SearchService } from '../services/searchService.js';

// ─── Return type ─────────────────────────────────────────────────────────────

export interface ICalendarRouterResult {
  controllers: {
    calendar: CalendarController;
    event: EventController;
    scheduling: SchedulingController;
    booking: BookingController;
    invitation: InvitationController;
    search: SearchController;
    exportImport: ExportImportController;
  };
  middleware: {
    caldav: CalDavMiddleware;
  };
  services: {
    calendarEngine: CalendarEngineService;
    eventEngine: EventEngineService;
    schedulingEngine: SchedulingEngineService;
    bookingEngine: BookingEngineService;
    notification: CalendarNotificationService;
    permission: CalendarPermissionService;
    search: SearchService;
    exportImport: ExportImportService;
    encryption: EncryptionService;
    icsSubscription: IcsSubscriptionService;
    caldav: CalDavService;
  };
}

// ─── Factory ─────────────────────────────────────────────────────────────────

/**
 * Create and configure the BrightCal API router with all controllers,
 * services, and middleware wired together.
 *
 * @param app - The BrightChain application instance (provides auth, config, etc.)
 * @param db - The BrightDb instance for database access
 * @returns Fully wired controllers, middleware, and services
 *
 * @example
 * ```typescript
 * const { controllers, middleware, services } = createCalendarRouter(app, db);
 *
 * // Mount controllers on Express router
 * apiRouter.use('/api/cal/calendars', controllers.calendar.router);
 * apiRouter.use('/api/cal/events', controllers.event.router);
 * apiRouter.use('/api/cal/scheduling', controllers.scheduling.router);
 * apiRouter.use('/api/cal/booking', controllers.booking.router);
 * apiRouter.use('/api/cal/invitations', controllers.invitation.router);
 * apiRouter.use('/api/cal/search', controllers.search.router);
 * apiRouter.use('/api/cal/export', controllers.exportImport.router);
 * apiRouter.use('/caldav', middleware.caldav.middleware());
 * ```
 */
export function createCalendarRouter(
  app: IBrightChainApplication,
  db: BrightDb,
): ICalendarRouterResult {
  // ── 1. Create BrightDb models ───────────────────────────────────────────

  const calendarCollectionModel = createCalendarCollectionModel(db);
  const calendarEventModel = createCalendarEventModel(db);
  const calendarShareModel = createCalendarShareModel(db);
  const calendarReminderModel = createCalendarReminderModel(db);
  const bookingPageModel = createBookingPageModel(db);
  const bookingAppointmentModel = createBookingAppointmentModel(db);
  const _freeBusySummaryModel = createFreeBusySummaryModel(db);

  // ── 2. Create services with their dependencies ──────────────────────────

  const encryption = new EncryptionService();

  const permission = new CalendarPermissionService(
    calendarCollectionModel,
    calendarShareModel,
  );

  const calendarEngine = new CalendarEngineService(
    calendarCollectionModel,
    calendarShareModel,
    encryption,
  );

  const eventEngine = new EventEngineService(
    calendarEventModel,
    calendarCollectionModel,
    permission,
    encryption,
  );

  const schedulingEngine = new SchedulingEngineService(
    calendarCollectionModel,
    calendarEventModel,
  );

  const bookingEngine = new BookingEngineService(
    bookingPageModel,
    bookingAppointmentModel,
    calendarCollectionModel,
    calendarEventModel,
    encryption,
  );

  const notification = new CalendarNotificationService(
    calendarEventModel,
    calendarReminderModel,
  );

  const search = new SearchService(calendarEventModel, permission);

  const exportImport = new ExportImportService(
    calendarEventModel,
    calendarCollectionModel,
    permission,
    encryption,
  );

  const icsSubscription = new IcsSubscriptionService();

  const caldavService = new CalDavService(calendarEngine, eventEngine);

  // ── 3. Create controllers ───────────────────────────────────────────────

  const calendarController = new CalendarController(app);
  const eventController = new EventController(app);
  const schedulingController = new SchedulingController(app);
  const bookingController = new BookingController(app);
  const invitationController = new InvitationController(app);
  const searchController = new SearchController(app);
  const exportImportController = new ExportImportController(app);

  // ── 4. Inject services into controllers ─────────────────────────────────

  calendarController.setCalendarService(calendarEngine);
  eventController.setEventService(eventEngine);
  schedulingController.setSchedulingService(schedulingEngine);
  bookingController.setBookingService(bookingEngine);
  invitationController.setInvitationService(notification);
  searchController.setSearchService(search);
  exportImportController.setExportImportService(exportImport);

  // ── 5. Create CalDAV middleware ─────────────────────────────────────────

  const caldavMiddleware = new CalDavMiddleware(caldavService);

  // ── Return wired-up result ──────────────────────────────────────────────

  return {
    controllers: {
      calendar: calendarController,
      event: eventController,
      scheduling: schedulingController,
      booking: bookingController,
      invitation: invitationController,
      search: searchController,
      exportImport: exportImportController,
    },
    middleware: {
      caldav: caldavMiddleware,
    },
    services: {
      calendarEngine,
      eventEngine,
      schedulingEngine,
      bookingEngine,
      notification,
      permission,
      search,
      exportImport,
      encryption,
      icsSubscription,
      caldav: caldavService,
    },
  };
}
