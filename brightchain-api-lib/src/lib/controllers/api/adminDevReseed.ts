import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  IStatusCodeResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import type { Request } from 'express';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import { BaseController } from '../base';

type AdminDevReseedApiResponse = IApiMessageResponse | ApiErrorResponse;

interface AdminDevReseedHandlers extends TypedHandlers {
  reseed: ApiRequestHandler<AdminDevReseedApiResponse>;
}

/**
 * Admin-only dev reseed controller.
 *
 * Only available when the server is running in in-memory (DEV_DATABASE) mode.
 * Drops the current in-memory block store and re-seeds it with fresh RBAC
 * credentials, printing the new credentials to the server console.
 *
 * ## Endpoints
 *
 * ### POST /api/admin/dev/reseed
 * Drops and re-seeds the in-memory block store. Returns the new credentials.
 * Requires admin role JWT. Returns 503 if not in dev/memory mode.
 *
 * @requirements dev-mode-only, admin-only
 */
export class AdminDevReseedController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  AdminDevReseedApiResponse,
  AdminDevReseedHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/reseed', {
        handlerKey: 'reseed',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      reseed: this.handleReseed.bind(this),
    };
  }

  private async handleReseed(
    req: Request,
  ): Promise<IStatusCodeResponse<AdminDevReseedApiResponse>> {
    if (!this.application.environment.devDatabasePoolName) {
      return {
        statusCode: 503,
        response: {
          error:
            'Dev reseed is only available when running in DEV_DATABASE (in-memory) mode.',
        } as ApiErrorResponse,
      };
    }

    try {
      const result = await this.application.reseedDevStore();
      return {
        statusCode: 200,
        response: {
          message: 'Dev store re-seeded successfully.',
          credentials: result,
        } as IApiMessageResponse,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        statusCode: 500,
        response: { error: `Reseed failed: ${message}` } as ApiErrorResponse,
      };
    }
  }
}
