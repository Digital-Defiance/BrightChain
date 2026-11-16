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

import {
  Constants,
  type IBrightChainApplication,
  type IBrightChainControllerApplication,
} from '@brightchain/brightchain-api-lib';
import type {
  IAppSubsystemPlugin,
  ISubsystemContext,
} from '@brightchain/brightchain-lib';
import type { Router } from 'express';
import { HolidayCatalogController } from '../controllers/holidayCatalogController.js';
import { createCalendarRouter } from '../router/calendarRouter.js';

/**
 * Structural view of ISubsystemContext.apiRouter (declared loosely in
 * brightchain-lib to avoid a dependency on brightchain-api-lib's AppRouter).
 */
interface IApiRouterHandle {
  router?: Router;
  application?: { authProvider?: IBrightChainApplication['authProvider'] };
}

/**
 * The application members the calendar code reads at runtime: the calendar
 * controllers, brightchain-api-lib's BaseController (`services`) and the
 * upstream BaseController and auth middlewares (`constants`, `database`,
 * `authProvider`). The compiler checks the shim against this type.
 */
type IAppShimCore = IBrightChainControllerApplication;
type IAppShimMembers = IAppShimCore & {
  environment: ISubsystemContext['environment'];
  expressApp: ISubsystemContext['expressApp'];
  db: ISubsystemContext['brightDb'];
  getModel: ISubsystemContext['getModel'];
};
export class BrightCalSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'brightcal';
  public readonly isOptional = true;

  public async initialize(context: ISubsystemContext): Promise<void> {
    // createCalendarRouter and the calendar controllers need only
    // IBrightChainControllerApplication (constants, database, authProvider,
    // services). Build that from the ISubsystemContext so the plugin doesn't
    // need the full App class.

    const apiRouterHandle = context.apiRouter as IApiRouterHandle | null;
    const shimMembers: IAppShimMembers = {
      expressApp: context.expressApp,
      environment: context.environment,
      services: context.services,
      db: context.brightDb,
      getModel: context.getModel,
      // The auth provider lives on the apiRouter's application reference.
      // BaseController's auth middleware checks application.authProvider.
      get authProvider() {
        return apiRouterHandle?.application?.authProvider;
      },
      // No database adapter is exposed to plugins, so controller handlers run
      // without a transaction, as they always have with this shim.
      database: undefined,
      // Without constants, upstream BaseController throws "Constants not
      // initialized" on error paths. Use the same object App uses.
      constants: Constants,
    };
    // The compiler checks `services`, `authProvider`, `database` and
    // `constants` against IBrightChainControllerApplication. `environment`
    // comes from ISubsystemContext, which declares it as `any`; `expressApp`,
    // `db` and `getModel` are typed from ISubsystemContext and are not part
    // of the port. Every other IBrightChainApplication member is absent at
    // runtime, and the controllers do not read them.
    const appShim: IBrightChainControllerApplication = shimMembers;
    const calendarResult = createCalendarRouter(appShim, context.brightDb);

    // Mount calendar controllers on the API router (not expressApp) so
    // they are registered under /api/* before the upstream catch-all 404
    // handler that AppRouter.init() installs on expressApp.
    const apiRouter: Pick<Router, 'use'> =
      apiRouterHandle?.router ?? context.expressApp;

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
