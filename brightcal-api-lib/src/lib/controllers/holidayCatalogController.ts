/**
 * HolidayCatalogController
 *
 * Lightweight REST controller that serves the static holiday catalog data.
 * Single endpoint: GET / → returns the full list of IHolidayFeedEntry objects.
 *
 * @see Requirements 10.2, 5.6
 */

import type { IHolidayFeedEntry } from '@brightchain/brightcal-lib';
import {
  BaseController,
  type IBrightChainApplication,
} from '@brightchain/brightchain-api-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  IApiMessageResponse,
  IStatusCodeResponse,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { holidayCatalogData } from '../data/holidayCatalogData.js';

// ─── Response interface ──────────────────────────────────────────────────────

export interface IHolidayCatalogResponse extends IApiMessageResponse {
  catalog: readonly IHolidayFeedEntry[];
}

type HolidayCatalogApiResponse = IHolidayCatalogResponse | ApiErrorResponse;

// ─── Handler types ───────────────────────────────────────────────────────────

interface HolidayCatalogHandlers extends TypedHandlers {
  getCatalog: ApiRequestHandler<IHolidayCatalogResponse | ApiErrorResponse>;
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * Serves the static holiday catalog as JSON.
 *
 * ## Endpoints
 *
 * ### GET /
 * Returns the full list of pre-configured holiday feed entries.
 *
 * **Response:** JSON array of IHolidayFeedEntry objects
 *
 * @requirements 10.2, 5.6
 */
export class HolidayCatalogController<
  TID extends PlatformID = Buffer,
> extends BaseController<
  TID,
  HolidayCatalogApiResponse,
  HolidayCatalogHandlers,
  string
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        useAuthentication: false,
        useCryptoAuthentication: false,
        handlerKey: 'getCatalog',
        openapi: {
          summary: 'Get holiday catalog',
          description:
            'Returns the full list of pre-configured holiday ICS feed entries.',
          tags: ['HolidayCatalog'],
          responses: {
            200: {
              schema: 'HolidayCatalogResponse',
              description: 'Holiday catalog entries',
            },
          },
        },
      }),
    ];

    ControllerRegistry.register(
      '/cal/holiday-catalog',
      'HolidayCatalogController',
      this.routeDefinitions,
    );

    this.handlers = {
      getCatalog: this.handleGetCatalog.bind(this),
    };
  }

  /**
   * GET /
   * Returns the static holiday catalog array.
   *
   * @requirements 10.2, 5.6
   */
  private async handleGetCatalog(): Promise<
    IStatusCodeResponse<IHolidayCatalogResponse>
  > {
    return {
      statusCode: 200,
      response: {
        message: 'Holiday catalog retrieved',
        catalog: holidayCatalogData,
      },
    };
  }
}
