import type { BurnbagStorageTier } from '@brightchain/digitalburnbag-lib';
import {
  calculateBurnbagStorageCost,
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
} from '@brightchain/digitalburnbag-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID as NodePlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  BaseController,
  routeConfig,
  type ApiErrorResponse,
  type ApiRequestHandler,
  type IApiMessageResponse,
  type IApplication,
  type IStatusCodeResponse,
  type TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import type { Request as ExpressRequest } from 'express';
import { isBurnbagJouleEnabled } from '../config/burnbagConfig';

interface IStorageCostSuccessResponse extends IApiMessageResponse {
  upfrontMicroJoules: string;
  dailyMicroJoules: string;
  effectiveTier: string;
  rsK: number;
  rsM: number;
  overheadDisplay: string;
}

type StorageCostResponse = IStorageCostSuccessResponse | ApiErrorResponse;

interface IJouleCostHandlers extends TypedHandlers {
  getStorageCost: ApiRequestHandler<StorageCostResponse>;
}

const VALID_TIERS = new Set<string>([
  'performance',
  'standard',
  'archive',
  'pending-burn',
]);

/**
 * Controller for the unauthenticated `GET /burnbag/joule/storage-cost` endpoint.
 *
 * Returns a breakdown of the upfront and daily Joule cost for a given file
 * size, storage tier, and committed duration.
 *
 * Requirements: 7.1, 7.2
 */
export class JouleCostController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  StorageCostResponse,
  IJouleCostHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  constructor(application: IApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/storage-cost', {
        handlerKey: 'getStorageCost',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
    ];
    this.handlers = {
      getStorageCost: this.handleGetStorageCost.bind(this),
    };
  }

  private async handleGetStorageCost(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<StorageCostResponse>> {
    if (!isBurnbagJouleEnabled()) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_JouleNotEnabled,
      );
      return {
        statusCode: 503,
        response: { message, error: message },
      };
    }

    const query = req.query as Record<string, string | undefined>;
    const bytesStr = query['bytes'];
    const tierStr = query['tier'];
    const daysStr = query['days'];

    if (!bytesStr || !tierStr || !daysStr) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_JouleParamsMissing,
      );
      return {
        statusCode: 400,
        response: { message, error: message },
      };
    }

    if (!VALID_TIERS.has(tierStr)) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_JouleInvalidTier,
        { tiers: [...VALID_TIERS].join(', ') },
      );
      return {
        statusCode: 400,
        response: { message, error: message },
      };
    }

    if (!/^\d+$/.test(bytesStr)) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_JouleInvalidBytes,
      );
      return {
        statusCode: 400,
        response: { message, error: message },
      };
    }

    if (!/^\d+$/.test(daysStr)) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_JouleInvalidDays,
      );
      return {
        statusCode: 400,
        response: { message, error: message },
      };
    }

    const bytes = BigInt(bytesStr);
    const durationDays = parseInt(daysStr, 10);

    if (durationDays < 1) {
      const message = getDigitalBurnbagTranslation(
        DigitalBurnbagStrings.Api_Error_JouleInvalidDaysMin,
      );
      return {
        statusCode: 400,
        response: { message, error: message },
      };
    }

    try {
      const cost = calculateBurnbagStorageCost({
        bytes,
        tier: tierStr as BurnbagStorageTier,
        durationDays,
      });
      return {
        statusCode: 200,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Ok,
          ),
          upfrontMicroJoules: cost.upfrontMicroJoules.toString(),
          dailyMicroJoules: cost.dailyMicroJoules.toString(),
          effectiveTier: cost.effectiveTier,
          rsK: cost.rsK,
          rsM: cost.rsM,
          overheadDisplay: cost.overheadDisplay,
        },
      };
    } catch (err) {
      const message =
        err instanceof RangeError
          ? err.message
          : getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_JouleCalcFailed,
            );
      return {
        statusCode: 400,
        response: { message, error: message },
      };
    }
  }
}
