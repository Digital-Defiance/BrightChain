import { PlatformID } from '@digitaldefiance/ecies-lib';
import { PlatformID as NodePlatformID } from '@digitaldefiance/node-ecies-lib';
import type { IApplication } from '@digitaldefiance/node-express-suite';
import { Router, type RequestHandler } from 'express';
import {
  createBrightNexusDiscoveryRouter,
  type IDiscoveryRoutesDeps,
} from './discovery-routes';
import {
  LocationController,
  type ILocationControllerDeps,
} from './location-controller';

export type IAllBrightNexusControllerDeps<TID extends PlatformID> =
  ILocationControllerDeps<TID> & IDiscoveryRoutesDeps<TID>;

export interface IRegisterBrightNexusRoutesOptions {
  /** Applied to public lookup and discovery paths. */
  publicReadRateLimiter?: RequestHandler;
}

/**
 * Register BrightNexus geo registry routes on an Express router.
 *
 * @param prefix - Location API prefix (default `/brightnexus/location`)
 */
export function registerBrightNexusRoutesOnRouter<
  TID extends NodePlatformID = NodePlatformID,
>(
  router: Router,
  application: IApplication<TID>,
  deps: IAllBrightNexusControllerDeps<TID>,
  prefix = '/brightnexus/location',
  options: IRegisterBrightNexusRoutesOptions = {},
): void {
  const rateLimiter = options.publicReadRateLimiter;

  if (rateLimiter) {
    router.use(`${prefix}/lookup`, rateLimiter);
    router.use('/brightnexus/discovery', rateLimiter);
  }

  const location = new LocationController<TID>(application, deps);
  router.use(prefix, location.router);

  const discovery = createBrightNexusDiscoveryRouter(deps);
  router.use('/brightnexus/discovery', discovery);
}
