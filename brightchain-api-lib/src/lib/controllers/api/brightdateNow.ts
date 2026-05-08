/**
 * @fileoverview BrightDateNowController — public REST endpoint that returns
 * the current BrightDate and related time representations.
 *
 * ## Endpoint (unauthenticated, rate-limited)
 *
 * ### GET /brightdate/now
 * Returns the current time as a BrightDate value along with multiple
 * standard time representations (ISO 8601, Unix, Julian, etc.) and
 * the current TAI-UTC offset.
 *
 * This endpoint is designed to be a simple, public-facing "legacy" API
 * that allows external projects to sync to the BrightDate standard
 * without installing the full NPM package.
 *
 * Rate limiting is applied via an in-memory sliding window rate limiter
 * (60 requests/minute per IP) mounted as middleware in the ApiRouter.
 */

import { computeBrightDateNowData } from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  IStatusCodeResponse,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { IBrightDateNowApiResponse } from '../../interfaces/responses';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

// ---------------------------------------------------------------------------
// Handler map
// ---------------------------------------------------------------------------

type BrightDateNowApiResponse = IBrightDateNowApiResponse | ApiErrorResponse;

interface IBrightDateNowHandlers extends TypedHandlers {
  getNow: ApiRequestHandler<BrightDateNowApiResponse>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

/**
 * Public controller for the BrightDate /now endpoint.
 *
 * Returns the current time in BrightDate format along with multiple
 * standard representations. Rate limiting is handled externally by
 * middleware mounted in the ApiRouter.
 *
 * ## Query Parameters
 *
 * - `precision` (optional, 0–12, default 8): Number of decimal places
 *   for the full BrightDate value.
 */
export class BrightDateNowController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  BrightDateNowApiResponse,
  IBrightDateNowHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  // --------------------------------------------------------------------------
  // Route definitions
  // --------------------------------------------------------------------------

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/now', {
        handlerKey: 'getNow',
        useAuthentication: false,
        useCryptoAuthentication: false,
        openapi: {
          summary: 'Current BrightDate',
          description:
            'Returns the current time as a BrightDate value (decimal days ' +
            'since J2000.0 epoch) along with multiple standard time ' +
            'representations. Public endpoint, rate-limited to 60 req/min ' +
            'per IP. Accepts an optional `precision` query parameter (0–12, ' +
            'default 8).',
          tags: ['BrightDate'],
          parameters: [
            {
              name: 'precision',
              in: 'query',
              required: false,
              schema: { type: 'integer', minimum: 0, maximum: 12, default: 8 },
              description:
                'Number of decimal places for the BrightDate value (0–12)',
            },
          ],
          responses: {
            200: {
              schema: 'BrightDateNow',
              description: 'Current BrightDate and time representations',
            },
            429: {
              description: 'Rate limit exceeded',
            },
          },
        },
      }),
    ];

    ControllerRegistry.register(
      '/brightdate',
      'BrightDateNowController',
      this.routeDefinitions,
    );

    this.handlers = {
      getNow: this.handleGetNow.bind(this),
    };
  }

  // --------------------------------------------------------------------------
  // Handler
  // --------------------------------------------------------------------------

  private async handleGetNow(
    req: Parameters<ApiRequestHandler<BrightDateNowApiResponse>>[0],
  ): Promise<IStatusCodeResponse<BrightDateNowApiResponse>> {
    // Parse optional precision query param (default 8 for sub-millisecond)
    const rawPrecision = (req as unknown as { query?: { precision?: string } })
      .query?.precision;
    let precision = 8;
    if (rawPrecision !== undefined) {
      const parsed = parseInt(rawPrecision, 10);
      if (!isNaN(parsed) && parsed >= 0 && parsed <= 12) {
        precision = parsed;
      }
    }

    const responseData = computeBrightDateNowData(precision);

    return {
      statusCode: 200,
      response: {
        message: 'Current BrightDate',
        ...responseData,
      } as IBrightDateNowApiResponse,
    };
  }
}
