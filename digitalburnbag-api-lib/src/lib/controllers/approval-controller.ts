import type { IApprovalService } from '@brightchain/digitalburnbag-lib';
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

export interface IApprovalControllerDeps<TID extends PlatformID> {
  approvalService: IApprovalService<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

interface IApprovalHandlers extends TypedHandlers {
  requestApproval: ApiRequestHandler<BurnbagResponse>;
  approve: ApiRequestHandler<BurnbagResponse>;
  reject: ApiRequestHandler<BurnbagResponse>;
}

export class ApprovalController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  IApprovalHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IApprovalControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IApprovalControllerDeps<TID>,
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
      routeConfig('post', '/request', {
        handlerKey: 'requestApproval',
        ...auth,
      }),
      routeConfig('post', '/:requestId/approve', {
        handlerKey: 'approve',
        ...auth,
      }),
      routeConfig('post', '/:requestId/reject', {
        handlerKey: 'reject',
        ...auth,
      }),
    ];
    this.handlers = {
      requestApproval: this.handleRequestApproval.bind(this),
      approve: this.handleApprove.bind(this),
      reject: this.handleReject.bind(this),
    };
  }

  private async handleRequestApproval(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const result = await this.deps.approvalService.requestApproval(req.body);
    return {
      statusCode: 201,
      response: result as unknown as IApiMessageResponse,
    };
  }

  private async handleApprove(
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
    const requestId = this.safeParseId(req.params.requestId as string);
    if (!requestId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidRequestId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const { signature } = req.body;
    const status = await this.deps.approvalService.approve(
      requestId,
      requesterId,
      signature,
    );
    return {
      statusCode: 200,
      response: status as unknown as IApiMessageResponse,
    };
  }

  private async handleReject(
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
    const requestId = this.safeParseId(req.params.requestId as string);
    if (!requestId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidRequestId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const { reason } = req.body;
    const status = await this.deps.approvalService.reject(
      requestId,
      requesterId,
      reason,
    );
    return {
      statusCode: 200,
      response: status as unknown as IApiMessageResponse,
    };
  }
}
