/**
 * @fileoverview JouleRateTableController — public REST endpoints that expose
 * the current and historical Joule resource-credit rate tables.
 *
 * ## Endpoints (all unauthenticated)
 *
 * ### GET /joule/rate-table
 * Returns the rate table that is currently active (i.e. effective at the
 * moment the request is received).  BigInt amounts are serialized as decimal
 * strings so JSON parsers that cannot handle 64-bit integers receive a
 * lossless representation.
 *
 * ### GET /joule/rate-table/history
 * Returns all stored rate tables in ascending `effectiveAt` order.
 *
 * @requirements joule-resource-credits spec, Req 1.5
 */

import { BOOTSTRAP_RATE_TABLE } from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
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
import { IBrightChainApplication } from '../../interfaces/application';
import { RateTableCache } from '../../joule/rateTableCache';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * JSON.stringify replacer that converts `bigint` values to their decimal
 * string representation so clients that cannot parse 64-bit integers still
 * receive a lossless value.
 */
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === 'bigint' ? value.toString(10) : value;
}

// ---------------------------------------------------------------------------
// Handler map
// ---------------------------------------------------------------------------

interface IJouleRateTableHandlers extends TypedHandlers {
  getCurrentRateTable: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
  getRateTableHistory: ApiRequestHandler<
    IApiMessageResponse | ApiErrorResponse
  >;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * Public controller for the Joule resource-credit rate tables.
 *
 * Holds a `RateTableCache` that is seeded with the bootstrap table on
 * construction.  Use `setRateTableCache()` to inject a pre-populated cache
 * once ledger replay has completed.
 */
export class JouleRateTableController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IApiMessageResponse | ApiErrorResponse,
  IJouleRateTableHandlers,
  CoreLanguageCode
> {
  private rateTableCache: RateTableCache;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
    this.rateTableCache = new RateTableCache(BOOTSTRAP_RATE_TABLE);
  }

  /**
   * Replace the internal cache (e.g. after ledger replay is complete).
   * Safe to call at any point; subsequent requests will use the new cache.
   */
  public setRateTableCache(cache: RateTableCache): void {
    this.rateTableCache = cache;
  }

  // --------------------------------------------------------------------------
  // Route definitions
  // --------------------------------------------------------------------------

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'getCurrentRateTable',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Current Joule rate table',
          description:
            'Returns the rate table that is currently active.  BigInt ' +
            'amounts are encoded as decimal strings.',
          tags: ['Joule'],
          responses: {
            200: {
              schema: 'JouleRateTable',
              description: 'Active rate table',
            },
          },
        },
      }),
      routeConfig('get', '/history', {
        handlerKey: 'getRateTableHistory',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Joule rate table history',
          description:
            'Returns all stored rate tables in ascending effectiveAt order.',
          tags: ['Joule'],
          responses: {
            200: {
              schema: 'JouleRateTableHistory',
              description: 'Full rate table history',
            },
          },
        },
      }),
    ];

    ControllerRegistry.register(
      '/joule/rate-table',
      'JouleRateTableController',
      this.routeDefinitions,
    );

    this.handlers = {
      getCurrentRateTable: this.handleGetCurrentRateTable.bind(this),
      getRateTableHistory: this.handleGetRateTableHistory.bind(this),
    };
  }

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  private async handleGetCurrentRateTable(): Promise<
    IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>
  > {
    const table = this.rateTableCache.getCurrentRate();
    // Serialize bigints as strings for JSON safety
    const safe = JSON.parse(JSON.stringify(table, bigintReplacer));
    return {
      statusCode: 200,
      response: {
        message: 'Current rate table',
        rateTable: safe,
      } as IApiMessageResponse,
    };
  }

  private async handleGetRateTableHistory(): Promise<
    IStatusCodeResponse<IApiMessageResponse | ApiErrorResponse>
  > {
    const history = this.rateTableCache.getHistory();
    const safe = JSON.parse(JSON.stringify(history, bigintReplacer));
    return {
      statusCode: 200,
      response: {
        message: 'Rate table history',
        history: safe,
      } as IApiMessageResponse,
    };
  }
}
