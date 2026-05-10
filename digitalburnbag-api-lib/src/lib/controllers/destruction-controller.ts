import type {
  IApprovalService,
  IDestructionService,
} from '@brightchain/digitalburnbag-lib';
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

export interface IDestructionControllerDeps<TID extends PlatformID> {
  destructionService: IDestructionService<TID>;
  approvalService: IApprovalService<TID>;
  parseId: (idString: string) => TID;
}

interface IDestructionHandlers extends TypedHandlers {
  batchDestroy: ApiRequestHandler<BurnbagResponse>;
  scheduleDestruction: ApiRequestHandler<BurnbagResponse>;
  cancelScheduledDestruction: ApiRequestHandler<BurnbagResponse>;
  verifyDestruction: ApiRequestHandler<BurnbagResponse>;
  destroyFile: ApiRequestHandler<BurnbagResponse>;
}

export class DestructionController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  IDestructionHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IDestructionControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IDestructionControllerDeps<TID>,
  ) {
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
      routeConfig('post', '/batch', {
        handlerKey: 'batchDestroy',
        ...auth,
      }),
      routeConfig('post', '/:fileId/schedule', {
        handlerKey: 'scheduleDestruction',
        ...auth,
      }),
      routeConfig('delete', '/:fileId/schedule', {
        handlerKey: 'cancelScheduledDestruction',
        ...auth,
      }),
      routeConfig('post', '/:fileId/verify', {
        handlerKey: 'verifyDestruction',
        ...auth,
      }),
      routeConfig('post', '/:fileId', {
        handlerKey: 'destroyFile',
        ...auth,
      }),
    ];
    this.handlers = {
      batchDestroy: this.handleBatchDestroy.bind(this),
      scheduleDestruction: this.handleScheduleDestruction.bind(this),
      cancelScheduledDestruction:
        this.handleCancelScheduledDestruction.bind(this),
      verifyDestruction: this.handleVerifyDestruction.bind(this),
      destroyFile: this.handleDestroyFile.bind(this),
    };
  }

  private async handleBatchDestroy(
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
    const { fileIds } = req.body;
    const result = await this.deps.destructionService.batchDestroy(
      fileIds,
      requesterId,
    );
    return {
      statusCode: 200,
      response: result as unknown as IApiMessageResponse,
    };
  }

  private async handleScheduleDestruction(
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
    const { scheduledAt } = req.body;
    await this.deps.destructionService.scheduleDestruction(
      fileId,
      new Date(scheduledAt),
      requesterId,
    );
    return {
      statusCode: 201,
      response: { scheduled: true } as unknown as IApiMessageResponse,
    };
  }

  private async handleCancelScheduledDestruction(
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
    await this.deps.destructionService.cancelScheduledDestruction(
      fileId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: { cancelled: true } as unknown as IApiMessageResponse,
    };
  }

  private async handleVerifyDestruction(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BurnbagResponse>> {
    const { proof, bundle } = req.body;
    const result = this.deps.destructionService.verifyDestruction(
      proof,
      bundle,
    );
    return {
      statusCode: 200,
      response: result as unknown as IApiMessageResponse,
    };
  }

  private async handleDestroyFile(
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
    const proofResult = await this.deps.destructionService.destroyFile(
      fileId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: proofResult as unknown as IApiMessageResponse,
    };
  }
}
