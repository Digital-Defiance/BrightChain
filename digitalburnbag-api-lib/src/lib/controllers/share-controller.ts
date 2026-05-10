import type { IShareService } from '@brightchain/digitalburnbag-lib';
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

export interface IShareControllerDeps<TID extends PlatformID> {
  shareService: IShareService<TID>;
  parseId: (idString: string) => TID;
}

interface IShareHandlers extends TypedHandlers {
  shareInternal: ApiRequestHandler<BurnbagResponse>;
  createShareLink: ApiRequestHandler<BurnbagResponse>;
  getSharedWithMe: ApiRequestHandler<BurnbagResponse>;
  accessShareLink: ApiRequestHandler<BurnbagResponse>;
  revokeShareLink: ApiRequestHandler<BurnbagResponse>;
  getShareAuditTrail: ApiRequestHandler<BurnbagResponse>;
  getMagnetUrl: ApiRequestHandler<BurnbagResponse>;
}

export class ShareController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  IShareHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IShareControllerDeps<TID>;

  constructor(application: IApplication<TID>, deps: IShareControllerDeps<TID>) {
    super(application);
    this.deps = deps;
  }

  private safeParseId(idString: string | undefined): TID | undefined {
    if (!idString) return undefined;
    try {
      return this.deps.parseId(idString);
    } catch {
      return undefined;
    }
  }

  protected initRouteDefinitions(): void {
    const auth = { useAuthentication: true, useCryptoAuthentication: false };
    this.routeDefinitions = [
      routeConfig('post', '/internal', {
        handlerKey: 'shareInternal',
        ...auth,
      }),
      routeConfig('post', '/link', {
        handlerKey: 'createShareLink',
        ...auth,
      }),
      routeConfig('get', '/shared-with-me', {
        handlerKey: 'getSharedWithMe',
        ...auth,
      }),
      routeConfig('get', '/link/:token', {
        handlerKey: 'accessShareLink',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/link/:id', {
        handlerKey: 'revokeShareLink',
        ...auth,
      }),
      routeConfig('get', '/:fileId/audit', {
        handlerKey: 'getShareAuditTrail',
        ...auth,
      }),
      routeConfig('get', '/:fileId/magnet', {
        handlerKey: 'getMagnetUrl',
        ...auth,
      }),
    ];
    this.handlers = {
      shareInternal: this.handleShareInternal.bind(this),
      createShareLink: this.handleCreateShareLink.bind(this),
      getSharedWithMe: this.handleGetSharedWithMe.bind(this),
      accessShareLink: this.handleAccessShareLink.bind(this),
      revokeShareLink: this.handleRevokeShareLink.bind(this),
      getShareAuditTrail: this.handleGetShareAuditTrail.bind(this),
      getMagnetUrl: this.handleGetMagnetUrl.bind(this),
    };
  }

  private async handleShareInternal(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    await this.deps.shareService.shareWithUser(req.body);
    return {
      statusCode: 201,
      response: { shared: true } as unknown as IApiMessageResponse,
    };
  }

  private async handleCreateShareLink(
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
    const shareLink = await this.deps.shareService.createShareLink(
      req.body,
      requesterId,
    );
    return {
      statusCode: 201,
      response: shareLink as unknown as IApiMessageResponse,
    };
  }

  private async handleGetSharedWithMe(
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
    const items = await this.deps.shareService.getSharedWithMe(requesterId);
    return {
      statusCode: 200,
      response: items as unknown as IApiMessageResponse,
    };
  }

  private async handleAccessShareLink(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const token = req.params.token as string;
    const password = req.query.password as string | undefined;
    const access = await this.deps.shareService.accessShareLink(
      token,
      password,
      {
        ipAddress: req.ip ?? '0.0.0.0',
        timestamp: new Date(),
      },
    );
    return {
      statusCode: 200,
      response: access as unknown as IApiMessageResponse,
    };
  }

  private async handleRevokeShareLink(
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
    const shareLinkId = this.safeParseId(req.params.id as string);
    if (!shareLinkId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidShareLinkId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    await this.deps.shareService.revokeShareLink(shareLinkId, requesterId);
    return {
      statusCode: 204,
      response: {} as IApiMessageResponse,
    };
  }

  private async handleGetShareAuditTrail(
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
    const fileId = this.safeParseId(req.params.fileId as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const trail = await this.deps.shareService.getShareAuditTrail(
      fileId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: trail as unknown as IApiMessageResponse,
    };
  }

  private async handleGetMagnetUrl(
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
    const fileId = this.safeParseId(req.params.fileId as string);
    if (!fileId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidFileId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const result = await this.deps.shareService.getMagnetUrl(
      fileId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: result as unknown as IApiMessageResponse,
    };
  }
}
