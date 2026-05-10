import type { ICanaryService } from '@brightchain/digitalburnbag-lib';
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

/** Convert a TID to a hex string for JSON-safe responses. */
function sid<TID extends PlatformID>(value: TID | undefined): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return Buffer.from(value).toString('hex');
  }
  return String(value);
}

/** Serialize a canary binding to a JSON-safe DTO with string IDs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeBinding(b: any) {
  return {
    ...b,
    id: sid(b.id),
    protocolId: b.protocolId ? sid(b.protocolId) : null,
    fileIds: (b.fileIds ?? []).map(sid),
    folderIds: (b.folderIds ?? []).map(sid),
    customProviderId: b.customProviderId ? sid(b.customProviderId) : undefined,
    providerCredentialsId: b.providerCredentialsId
      ? sid(b.providerCredentialsId)
      : undefined,
    recipientListId: b.recipientListId ? sid(b.recipientListId) : undefined,
    cascadeBindingIds: b.cascadeBindingIds
      ? b.cascadeBindingIds.map(sid)
      : undefined,
    createdBy: b.createdBy ? sid(b.createdBy) : undefined,
  };
}

/** Serialize a recipient list to a JSON-safe DTO with string IDs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeRecipientList(l: any) {
  return {
    ...l,
    id: sid(l.id),
    ownerId: l.ownerId ? sid(l.ownerId) : undefined,
  };
}

/** Serialize a dry-run report to a JSON-safe DTO with string IDs. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeDryRunReport(r: any) {
  return {
    ...r,
    bindingId: r.bindingId ? sid(r.bindingId) : undefined,
    filesAffected: r.filesAffected ? r.filesAffected.map(sid) : [],
    foldersAffected: r.foldersAffected ? r.foldersAffected.map(sid) : [],
    // Provide frontend-friendly aliases
    affectedFileCount: r.filesAffected?.length ?? 0,
    recipientCount:
      (r as { recipientsToContact?: unknown[] }).recipientsToContact?.length ??
      0,
    actionsDescription: [],
  };
}

export interface ICanaryControllerDeps<TID extends PlatformID> {
  canaryService: ICanaryService<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

interface ICanaryHandlers extends TypedHandlers {
  getBindings: ApiRequestHandler<BurnbagResponse>;
  getRecipientLists: ApiRequestHandler<BurnbagResponse>;
  createBinding: ApiRequestHandler<BurnbagResponse>;
  createRecipientList: ApiRequestHandler<BurnbagResponse>;
  dryRun: ApiRequestHandler<BurnbagResponse>;
  updateBinding: ApiRequestHandler<BurnbagResponse>;
  deleteBinding: ApiRequestHandler<BurnbagResponse>;
  updateRecipientList: ApiRequestHandler<BurnbagResponse>;
  prepareBindingKeys: ApiRequestHandler<BurnbagResponse>;
}

export class CanaryController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BurnbagResponse,
  ICanaryHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: ICanaryControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: ICanaryControllerDeps<TID>,
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
      routeConfig('get', '/bindings', {
        handlerKey: 'getBindings',
        ...auth,
      }),
      routeConfig('get', '/recipients', {
        handlerKey: 'getRecipientLists',
        ...auth,
      }),
      routeConfig('post', '/bindings', {
        handlerKey: 'createBinding',
        ...auth,
      }),
      routeConfig('post', '/recipients', {
        handlerKey: 'createRecipientList',
        ...auth,
      }),
      routeConfig('post', '/bindings/:id/dry-run', {
        handlerKey: 'dryRun',
        ...auth,
      }),
      routeConfig('post', '/bindings/:id/prepare-keys', {
        handlerKey: 'prepareBindingKeys',
        ...auth,
      }),
      routeConfig('patch', '/bindings/:id', {
        handlerKey: 'updateBinding',
        ...auth,
      }),
      routeConfig('delete', '/bindings/:id', {
        handlerKey: 'deleteBinding',
        ...auth,
      }),
      routeConfig('patch', '/recipients/:id', {
        handlerKey: 'updateRecipientList',
        ...auth,
      }),
    ];
    this.handlers = {
      getBindings: this.handleGetBindings.bind(this),
      getRecipientLists: this.handleGetRecipientLists.bind(this),
      createBinding: this.handleCreateBinding.bind(this),
      createRecipientList: this.handleCreateRecipientList.bind(this),
      dryRun: this.handleDryRun.bind(this),
      updateBinding: this.handleUpdateBinding.bind(this),
      deleteBinding: this.handleDeleteBinding.bind(this),
      updateRecipientList: this.handleUpdateRecipientList.bind(this),
      prepareBindingKeys: this.handlePrepareBindingKeys.bind(this),
    };
  }

  private async handleGetBindings(
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
    const bindings = await this.deps.canaryService.getBindings(requesterId);
    return {
      statusCode: 200,
      response: bindings.map(
        serializeBinding,
      ) as unknown as IApiMessageResponse,
    };
  }

  private async handleGetRecipientLists(
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
    const lists = await this.deps.canaryService.getRecipientLists(requesterId);
    return {
      statusCode: 200,
      response: lists.map(
        serializeRecipientList,
      ) as unknown as IApiMessageResponse,
    };
  }

  /**
   * Map frontend-friendly shorthand field names to the service's
   * ICreateCanaryBindingParams shape. Accepts both forms so the API
   * works with the React client and direct service-style payloads.
   */

  private mapCreateBindingBody(
    body: Record<string, unknown>,
    generateProtocolId: TID,
  ): Record<string, unknown> {
    return {
      // Service-style fields pass through as-is
      ...body,
      // Map shorthand → service fields (shorthand wins if both present)
      protocolAction: body.action ?? body.protocolAction,
      canaryCondition: body.condition ?? body.canaryCondition,
      canaryProvider: body.provider ?? body.canaryProvider,
      protocolId: body.protocolId ?? generateProtocolId,
      fileIds: body.targetIds ?? body.fileIds ?? [],
      folderIds: body.folderIds ?? [],
      recipientListId: body.recipientListId,
      cascadeDelayMs:
        body.cascadeDelay != null ? [body.cascadeDelay] : body.cascadeDelayMs,
    };
  }

  private async handleCreateBinding(
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
    const params = this.mapCreateBindingBody(req.body, requesterId);
    const binding = await this.deps.canaryService.createBinding(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params as any,
      requesterId,
    );
    return {
      statusCode: 201,
      response: serializeBinding(binding) as unknown as IApiMessageResponse,
    };
  }

  private async handleCreateRecipientList(
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
    const list = await this.deps.canaryService.createRecipientList(
      req.body,
      requesterId,
    );
    return {
      statusCode: 201,
      response: serializeRecipientList(list) as unknown as IApiMessageResponse,
    };
  }

  private async handleDryRun(
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
    const bindingId = this.safeParseId(req.params.id as string);
    if (!bindingId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidBindingId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const report = await this.deps.canaryService.dryRun(bindingId, requesterId);
    return {
      statusCode: 200,
      response: serializeDryRunReport(report) as unknown as IApiMessageResponse,
    };
  }

  private async handlePrepareBindingKeys(
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
    const bindingId = this.safeParseId(req.params.id as string);
    if (!bindingId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidBindingId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const result = await this.deps.canaryService.prepareBindingKeys(
      bindingId,
      requesterId,
    );
    return {
      statusCode: 200,
      response: {
        keyWrappingEntryIds: result.keyWrappingEntryIds.map(sid),
        ephemeralShares: result.ephemeralShares.map((s) => ({
          fileId: sid(s.fileId),
          recipientEmail: s.recipientEmail,
          shareUrl: s.shareUrl,
          // passphrase is intentionally included — it's only returned once
          passphrase: s.passphrase,
        })),
      } as unknown as IApiMessageResponse,
    };
  }

  private async handleUpdateBinding(
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
    const bindingId = this.safeParseId(req.params.id as string);
    if (!bindingId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidBindingId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const binding = await this.deps.canaryService.updateBinding(
      bindingId,
      req.body,
      requesterId,
    );
    return {
      statusCode: 200,
      response: serializeBinding(binding) as unknown as IApiMessageResponse,
    };
  }

  private async handleDeleteBinding(
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
    const bindingId = this.safeParseId(req.params.id as string);
    if (!bindingId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidBindingId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    await this.deps.canaryService.deleteBinding(bindingId, requesterId);
    return {
      statusCode: 204,
      response: {} as IApiMessageResponse,
    };
  }

  private async handleUpdateRecipientList(
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
    const listId = this.safeParseId(req.params.id as string);
    if (!listId)
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidRecipientListId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BurnbagResponse,
      };
    const list = await this.deps.canaryService.updateRecipientList(
      listId,
      req.body,
      requesterId,
    );
    return {
      statusCode: 200,
      response: serializeRecipientList(list) as unknown as IApiMessageResponse,
    };
  }
}
