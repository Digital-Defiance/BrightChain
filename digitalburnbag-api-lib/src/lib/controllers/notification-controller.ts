import type { INotificationService } from '@brightchain/digitalburnbag-lib';
import {
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
} from '@brightchain/digitalburnbag-lib';
import { PlatformID } from '@digitaldefiance/ecies-lib';
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

type BurnbagResponse = IApiMessageResponse | ApiErrorResponse;

export interface INotificationControllerDeps<TID extends PlatformID> {
  notificationService: INotificationService<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

interface INotificationHandlers extends TypedHandlers {
  getNotifications: ApiRequestHandler<BurnbagResponse>;
  markRead: ApiRequestHandler<BurnbagResponse>;
}

export class NotificationController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  INotificationHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: INotificationControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: INotificationControllerDeps<TID>,
  ) {
    super(application);
    this.deps = deps;
  }

  private safeParseId(idString: string | undefined): TID | undefined {
    if (!idString) return undefined;
    if (this.deps.parseSafeId) return this.deps.parseSafeId(idString);
    try {
      return this.deps.parseId(idString);
    } catch {
      return undefined;
    }
  }

  protected initRouteDefinitions(): void {
    const auth = { useAuthentication: true, useCryptoAuthentication: false };
    this.routeDefinitions = [
      routeConfig('get', '/', { handlerKey: 'getNotifications', ...auth }),
      routeConfig('post', '/read', { handlerKey: 'markRead', ...auth }),
    ];
    this.handlers = {
      getNotifications: this.handleGetNotifications.bind(this),
      markRead: this.handleMarkRead.bind(this),
    };
  }

  private async handleGetNotifications(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId)
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BurnbagResponse,
      };
    const notifications =
      await this.deps.notificationService.getQueuedNotifications(requesterId);
    return {
      statusCode: 200,
      response: notifications as unknown as IApiMessageResponse,
    };
  }

  private async handleMarkRead(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const { ids } = req.body as { ids: TID[] };
    await this.deps.notificationService.markDelivered(ids);
    return {
      statusCode: 204,
      response: {} as IApiMessageResponse,
    };
  }
}
