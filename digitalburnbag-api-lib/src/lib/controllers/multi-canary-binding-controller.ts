/**
 * MultiCanaryBindingController — API endpoints for multi-canary redundancy bindings.
 *
 * Routes (mounted at /burnbag/multi-canary-bindings):
 *   POST   /                        — create binding (validate 2–20 providers, all connected)
 *   GET    /                        — list user's bindings
 *   GET    /target/:targetId        — get bindings for a target
 *   GET    /:id                     — get binding details
 *   PUT    /:id                     — update binding (add/remove providers, change policy)
 *   DELETE /:id                     — delete binding
 *
 * Feature: canary-provider-expansion
 * Requirements: 9.1, 9.2, 9.6
 */
import type {
  IMultiCanaryBindingService,
} from '@brightchain/digitalburnbag-lib';
import {
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
} from '@brightchain/digitalburnbag-lib';
import type { PlatformID } from '@digitaldefiance/ecies-lib';
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

type BindingResponse = IApiMessageResponse | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Serialization helper
// ---------------------------------------------------------------------------

/** Convert a TID to a string for JSON-safe responses. */
function sid<TID extends PlatformID>(value: TID | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    return Buffer.from(value).toString('hex');
  }
  return String(value);
}

/** Serialize a multi-canary binding to a JSON-safe DTO. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeBinding(b: any) {
  return {
    ...b,
    id: sid(b.id),
    userId: sid(b.userId),
    vaultContainerIds: (b.vaultContainerIds ?? []).map(sid),
    fileIds: (b.fileIds ?? []).map(sid),
    folderIds: (b.folderIds ?? []).map(sid),
    providerConnectionIds: (b.providerConnectionIds ?? []).map(sid),
  };
}

// ---------------------------------------------------------------------------
// Dependencies interface
// ---------------------------------------------------------------------------

export interface IMultiCanaryBindingControllerDeps<TID extends PlatformID> {
  multiCanaryBindingService: IMultiCanaryBindingService<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

// ---------------------------------------------------------------------------
// Handler type map
// ---------------------------------------------------------------------------

interface IMultiCanaryBindingHandlers extends TypedHandlers {
  createBinding: ApiRequestHandler<BindingResponse>;
  listBindings: ApiRequestHandler<BindingResponse>;
  getBinding: ApiRequestHandler<BindingResponse>;
  updateBinding: ApiRequestHandler<BindingResponse>;
  deleteBinding: ApiRequestHandler<BindingResponse>;
  getBindingsForTarget: ApiRequestHandler<BindingResponse>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class MultiCanaryBindingController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  BindingResponse,
  IMultiCanaryBindingHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IMultiCanaryBindingControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IMultiCanaryBindingControllerDeps<TID>,
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
      // POST / — create binding (Req 9.1, 9.2)
      routeConfig('post', '/', {
        handlerKey: 'createBinding',
        ...auth,
      }),
      // GET / — list user's bindings (Req 9.6)
      routeConfig('get', '/', {
        handlerKey: 'listBindings',
        ...auth,
      }),
      // GET /target/:targetId — get bindings for a target (Req 9.6)
      // Must be registered before /:id to avoid route conflict
      routeConfig('get', '/target/:targetId', {
        handlerKey: 'getBindingsForTarget',
        ...auth,
      }),
      // GET /:id — get binding details (Req 9.6)
      routeConfig('get', '/:id', {
        handlerKey: 'getBinding',
        ...auth,
      }),
      // PUT /:id — update binding (Req 9.2)
      routeConfig('put', '/:id', {
        handlerKey: 'updateBinding',
        ...auth,
      }),
      // DELETE /:id — delete binding
      routeConfig('delete', '/:id', {
        handlerKey: 'deleteBinding',
        ...auth,
      }),
    ];
    this.handlers = {
      createBinding: this.handleCreateBinding.bind(this),
      listBindings: this.handleListBindings.bind(this),
      getBinding: this.handleGetBinding.bind(this),
      updateBinding: this.handleUpdateBinding.bind(this),
      deleteBinding: this.handleDeleteBinding.bind(this),
      getBindingsForTarget: this.handleGetBindingsForTarget.bind(this),
    };
  }

  // -----------------------------------------------------------------------
  // POST / — create multi-canary binding
  // Requirements: 9.1, 9.2
  // -----------------------------------------------------------------------

  private async handleCreateBinding(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BindingResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BindingResponse,
      };
    }

    const body = req.body ?? {};

    // Parse provider connection IDs from the request body
    const providerConnectionIds: TID[] = (
      (body.providerConnectionIds as string[]) ?? []
    ).map((id: string) => this.deps.parseId(id));

    const params = {
      userId: requesterId,
      name: body.name as string,
      vaultContainerIds: ((body.vaultContainerIds as string[]) ?? []).map(
        (id: string) => this.deps.parseId(id),
      ),
      fileIds: ((body.fileIds as string[]) ?? []).map((id: string) =>
        this.deps.parseId(id),
      ),
      folderIds: ((body.folderIds as string[]) ?? []).map((id: string) =>
        this.deps.parseId(id),
      ),
      providerConnectionIds,
      redundancyPolicy: body.redundancyPolicy,
      providerWeights: body.providerWeights,
      weightedThresholdPercent: body.weightedThresholdPercent,
      protocolAction: body.protocolAction,
      canaryCondition: body.canaryCondition,
      absenceThresholdMs: body.absenceThresholdMs,
    };

    try {
      const binding =
        await this.deps.multiCanaryBindingService.createBinding(params);
      return {
        statusCode: 201,
        response: serializeBinding(binding) as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create binding';
      return {
        statusCode: 400,
        response: {
          message,
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BindingResponse,
      };
    }
  }

  // -----------------------------------------------------------------------
  // GET / — list user's multi-canary bindings
  // Requirement: 9.6
  // -----------------------------------------------------------------------

  private async handleListBindings(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BindingResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BindingResponse,
      };
    }

    const bindings =
      await this.deps.multiCanaryBindingService.getBindingsForUser(requesterId);

    return {
      statusCode: 200,
      response: bindings.map(
        serializeBinding,
      ) as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /:id — get binding details
  // Requirement: 9.6
  // -----------------------------------------------------------------------

  private async handleGetBinding(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BindingResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BindingResponse,
      };
    }

    const bindingId = this.safeParseId(req.params.id as string | undefined);
    if (!bindingId) {
      return {
        statusCode: 400,
        response: {
          message: 'Invalid binding ID',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BindingResponse,
      };
    }

    // Retrieve all bindings for the user and find the requested one
    const bindings =
      await this.deps.multiCanaryBindingService.getBindingsForUser(requesterId);
    const binding = bindings.find((b) => String(b.id) === String(bindingId));

    if (!binding) {
      return {
        statusCode: 404,
        response: {
          message: 'Multi-canary binding not found',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_NotFound,
          ),
        } as unknown as BindingResponse,
      };
    }

    return {
      statusCode: 200,
      response: serializeBinding(binding) as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // PUT /:id — update binding (add/remove providers, change policy)
  // Requirement: 9.2
  // -----------------------------------------------------------------------

  private async handleUpdateBinding(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BindingResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BindingResponse,
      };
    }

    const bindingId = this.safeParseId(req.params.id as string | undefined);
    if (!bindingId) {
      return {
        statusCode: 400,
        response: {
          message: 'Invalid binding ID',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BindingResponse,
      };
    }

    const body = req.body ?? {};

    // Build updates object — only include fields that were provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};

    if (body.name !== undefined) updates.name = body.name;
    if (body.redundancyPolicy !== undefined)
      updates.redundancyPolicy = body.redundancyPolicy;
    if (body.providerWeights !== undefined)
      updates.providerWeights = body.providerWeights;
    if (body.weightedThresholdPercent !== undefined)
      updates.weightedThresholdPercent = body.weightedThresholdPercent;
    if (body.protocolAction !== undefined)
      updates.protocolAction = body.protocolAction;
    if (body.canaryCondition !== undefined)
      updates.canaryCondition = body.canaryCondition;
    if (body.absenceThresholdMs !== undefined)
      updates.absenceThresholdMs = body.absenceThresholdMs;
    if (body.isActive !== undefined) updates.isActive = body.isActive;

    if (body.providerConnectionIds !== undefined) {
      updates.providerConnectionIds = (
        body.providerConnectionIds as string[]
      ).map((id: string) => this.deps.parseId(id));
    }
    if (body.vaultContainerIds !== undefined) {
      updates.vaultContainerIds = (body.vaultContainerIds as string[]).map(
        (id: string) => this.deps.parseId(id),
      );
    }
    if (body.fileIds !== undefined) {
      updates.fileIds = (body.fileIds as string[]).map((id: string) =>
        this.deps.parseId(id),
      );
    }
    if (body.folderIds !== undefined) {
      updates.folderIds = (body.folderIds as string[]).map((id: string) =>
        this.deps.parseId(id),
      );
    }

    try {
      const binding = await this.deps.multiCanaryBindingService.updateBinding(
        bindingId,
        updates,
      );
      return {
        statusCode: 200,
        response: serializeBinding(binding) as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update binding';
      const isNotFound = message.includes('not found');
      return {
        statusCode: isNotFound ? 404 : 400,
        response: {
          message,
          error: isNotFound
            ? getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_NotFound)
            : getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_BadRequest),
        } as unknown as BindingResponse,
      };
    }
  }

  // -----------------------------------------------------------------------
  // DELETE /:id — delete binding
  // -----------------------------------------------------------------------

  private async handleDeleteBinding(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BindingResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BindingResponse,
      };
    }

    const bindingId = this.safeParseId(req.params.id as string | undefined);
    if (!bindingId) {
      return {
        statusCode: 400,
        response: {
          message: 'Invalid binding ID',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BindingResponse,
      };
    }

    try {
      await this.deps.multiCanaryBindingService.deleteBinding(
        bindingId,
        requesterId,
      );
      return {
        statusCode: 204,
        response: {} as IApiMessageResponse,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete binding';
      const isNotFound = message.includes('not found');
      const isUnauthorized = message.includes('Unauthorized');
      return {
        statusCode: isNotFound ? 404 : isUnauthorized ? 403 : 400,
        response: {
          message,
          error: isNotFound
            ? getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_NotFound)
            : isUnauthorized
              ? getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_Forbidden)
              : getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_BadRequest),
        } as unknown as BindingResponse,
      };
    }
  }

  // -----------------------------------------------------------------------
  // GET /target/:targetId — get bindings for a specific target
  // Requirement: 9.6
  // -----------------------------------------------------------------------

  private async handleGetBindingsForTarget(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<BindingResponse>> {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        statusCode: 401,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_AuthMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_Unauthorized,
          ),
        } as unknown as BindingResponse,
      };
    }

    const targetId = this.safeParseId(
      req.params.targetId as string | undefined,
    );
    if (!targetId) {
      return {
        statusCode: 400,
        response: {
          message: 'Invalid target ID',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as BindingResponse,
      };
    }

    // Parse optional targetType query param (defaults to 'vault')
    const targetType = (req.query.targetType as 'vault' | 'file' | 'folder') ?? 'vault';

    const bindings =
      await this.deps.multiCanaryBindingService.getBindingsForTarget(
        targetId,
        targetType,
      );

    return {
      statusCode: 200,
      response: bindings.map(
        serializeBinding,
      ) as unknown as IApiMessageResponse,
    };
  }
}
