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

import type { IBrightChainApplication } from '@brightchain/brightchain-api-lib';
import type {
  IAppSubsystemPlugin,
  ISubsystemContext,
} from '@brightchain/brightchain-lib';
import type { ServiceContainer } from '@digitaldefiance/node-express-suite';
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
 * upstream BaseController and auth middlewares (`environment`,
 * `authProvider`, `database`). `constants` is also read upstream, but only on
 * error paths, and the shim has never provided it (see below).
 */
type IAppShimCore = Pick<
  IBrightChainApplication,
  'environment' | 'services' | 'authProvider' | 'database'
>;
type IAppShimMembers = IAppShimCore & {
  expressApp: ISubsystemContext['expressApp'];
  db: ISubsystemContext['brightDb'];
  getModel: ISubsystemContext['getModel'];
};

export class BrightCalSubsystemPlugin implements IAppSubsystemPlugin {
  public readonly name = 'brightcal';
  public readonly isOptional = true;

  public async initialize(context: ISubsystemContext): Promise<void> {
    // createCalendarRouter and HolidayCatalogController expect an
    // IBrightChainApplication (the full App instance). Build a minimal
    // shim from the ISubsystemContext so the plugin doesn't need a
    // compile-time dependency on brightchain-api-lib's App class.

    const apiRouterHandle = context.apiRouter as IApiRouterHandle | null;
    const shimMembers: IAppShimMembers = {
      expressApp: context.expressApp,
      environment: context.environment,
      // ISubsystemContext declares the container through IServiceContainer,
      // which has the same shape as the ServiceContainer class the
      // application exposes. This is an assertion, not a compiler check.
      services: context.services as ServiceContainer,
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
    };
    // What the compiler checks, and what it does not:
    // - `authProvider` and `database` are checked against
    //   IBrightChainApplication through IAppShimCore.
    // - `environment` comes from ISubsystemContext, which declares it as
    //   `any`, so its check is nominal only.
    // - `services` is asserted from IServiceContainer to the ServiceContainer
    //   class above. The class has private fields, so no structural value can
    //   satisfy it without an assertion.
    // - `expressApp`, `db` and `getModel` are typed from ISubsystemContext and
    //   are not part of IBrightChainApplication.
    // - Every other member (`constants`, `ready`, `plugins`, `start`,
    //   `getController`, `setController`, `getNodeId`, `reseedDevStore`) is
    //   absent at runtime.
    // The downcast below is an assertion. The controllers extend
    // brightchain-api-lib's BaseController, whose upstream base class requires
    // the full IApplication (including the private-field PluginManager and
    // ServiceContainer classes), so a narrower port cannot be passed through
    // without changing @digitaldefiance/node-express-suite.
    const checkedShim: IAppShimCore = shimMembers;
    const appShim = checkedShim as IBrightChainApplication;

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
