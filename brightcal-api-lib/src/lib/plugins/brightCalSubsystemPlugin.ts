/**
 * BrightCal calendar subsystem plugin.
 *
 * Extracts the BrightCal calendar initialization block from App.start()
 * into a self-contained plugin. Calls createCalendarRouter to obtain
 * controllers, middleware, and services, then mounts all calendar API
 * routes on the Express app and registers calendar services in the
 * service container.
 *
 * IMPORTANT: This plugin imports its interface from @brightchain/brightchain-lib
 * (NOT from brightchain-api-lib) to break the circular dependency.
 *
 * @see Requirements 11.1, 11.2, 11.3, 11.4, 11.5, 13.1, 13.2
 */

import type {
  IAppSubsystemPlugin,
  ISubsystemContext,
} from '@brightchain/brightchain-lib';
import { HolidayCatalogController } from '../controllers/holidayCatalogController.js';
import { createCalendarRouter } from '../router/calendarRouter.js';

export class BrightCalSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'brightcal';
  public readonly isOptional = true;

  public async initialize(context: ISubsystemContext): Promise<void> {
    // createCalendarRouter and HolidayCatalogController expect an
    // IBrightChainApplication (the full App instance). Build a minimal
    // shim from the ISubsystemContext so the plugin doesn't need a
    // compile-time dependency on brightchain-api-lib's App class.

    const appShim = {
      expressApp: context.expressApp,
      environment: context.environment,
      services: context.services,
      db: context.brightDb,
      getModel: context.getModel,
      // The auth provider lives on the apiRouter's application reference.
      // BaseController's auth middleware checks application.authProvider.
      get authProvider() {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (context.apiRouter as any)?.application?.authProvider;
      },
    } as any;

    const calendarResult = createCalendarRouter(appShim, context.brightDb);

    // Mount calendar controllers on the API router (not expressApp) so
    // they are registered under /api/* before the upstream catch-all 404
    // handler that AppRouter.init() installs on expressApp.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const apiRouter = (context.apiRouter as any)?.router ?? context.expressApp;

    apiRouter.use('/cal/calendars', calendarResult.controllers.calendar.router);
    apiRouter.use('/cal/events', calendarResult.controllers.event.router);
    apiRouter.use(
      '/cal/scheduling',
      calendarResult.controllers.scheduling.router,
    );
    apiRouter.use('/cal/booking', calendarResult.controllers.booking.router);
    apiRouter.use(
      '/cal/invitations',
      calendarResult.controllers.invitation.router,
    );
    apiRouter.use('/cal/search', calendarResult.controllers.search.router);
    apiRouter.use(
      '/cal/export',
      calendarResult.controllers.exportImport.router,
    );

    // CalDAV is a protocol endpoint, not an API route — mount on expressApp
    context.expressApp.use(
      '/caldav',
      calendarResult.middleware.caldav.middleware(),
    );

    // Holiday catalog is a public API endpoint
    const holidayCatalogController = new HolidayCatalogController(appShim);
    apiRouter.use('/cal/holiday-catalog', holidayCatalogController.router);

    // Register calendar services in the service container
    context.services.register(
      'calendarEngine',
      () => calendarResult.services.calendarEngine,
    );
    context.services.register(
      'eventEngine',
      () => calendarResult.services.eventEngine,
    );
  }
}
