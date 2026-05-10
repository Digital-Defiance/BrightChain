/**
 * NativeCanaryController — API endpoints for BrightChain-native canary configuration.
 *
 * Routes (mounted at /burnbag/native-canaries):
 *   POST   /               — configure native canary
 *   GET    /               — list user's native canary configs
 *   PUT    /:id            — update native canary config
 *   PUT    /duress-codes   — set duress codes (encrypted at rest)
 *
 * Feature: canary-provider-expansion
 * Requirements: 8.1, 8.7
 */
import type { INativeCanaryService } from '@brightchain/digitalburnbag-lib';
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

type NativeCanaryResponse = IApiMessageResponse | ApiErrorResponse;

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

/** Serialize a native canary config to a JSON-safe DTO (omitting encrypted codes). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeConfig(c: any) {
  return {
    ...c,
    id: sid(c.id),
    userId: sid(c.userId),
    connectionId: c.connectionId ? sid(c.connectionId) : undefined,
    // Never expose encrypted duress codes in API responses
    encryptedDuressCodes: undefined,
    // Indicate whether duress codes are configured (without exposing them)
    hasDuressCodes:
      Array.isArray(c.encryptedDuressCodes) && c.encryptedDuressCodes.length > 0,
  };
}

// ---------------------------------------------------------------------------
// Dependencies interface
// ---------------------------------------------------------------------------

export interface INativeCanaryControllerDeps<TID extends PlatformID> {
  nativeCanaryService: INativeCanaryService<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

// ---------------------------------------------------------------------------
// Handler type map
// ---------------------------------------------------------------------------

interface INativeCanaryHandlers extends TypedHandlers {
  configureCanary: ApiRequestHandler<NativeCanaryResponse>;
  listConfigs: ApiRequestHandler<NativeCanaryResponse>;
  updateConfig: ApiRequestHandler<NativeCanaryResponse>;
  setDuressCodes: ApiRequestHandler<NativeCanaryResponse>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class NativeCanaryController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  NativeCanaryResponse,
  INativeCanaryHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: INativeCanaryControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: INativeCanaryControllerDeps<TID>,
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
      // POST / — configure native canary (Req 8.1)
      routeConfig('post', '/', {
        handlerKey: 'configureCanary',
        ...auth,
      }),
      // GET / — list user's native canary configs (Req 8.1)
      routeConfig('get', '/', {
        handlerKey: 'listConfigs',
        ...auth,
      }),
      // PUT /duress-codes — set duress codes (Req 8.7)
      // Must be registered before /:id to avoid route conflict
      routeConfig('put', '/duress-codes', {
        handlerKey: 'setDuressCodes',
        ...auth,
      }),
      // PUT /:id — update native canary config (Req 8.1)
      routeConfig('put', '/:id', {
        handlerKey: 'updateConfig',
        ...auth,
      }),
    ];
    this.handlers = {
      configureCanary: this.handleConfigureCanary.bind(this),
      listConfigs: this.handleListConfigs.bind(this),
      updateConfig: this.handleUpdateConfig.bind(this),
      setDuressCodes: this.handleSetDuressCodes.bind(this),
    };
  }

  // -----------------------------------------------------------------------
  // POST / — configure native canary
  // Requirement: 8.1
  // -----------------------------------------------------------------------

  private async handleConfigureCanary(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<NativeCanaryResponse>> {
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
        } as unknown as NativeCanaryResponse,
      };
    }

    const body = req.body ?? {};

    // Validate required fields
    if (!body.type) {
      return {
        statusCode: 400,
        response: {
          message: 'type is required (login_activity, duress_code, file_access, api_usage, vault_interaction)',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as NativeCanaryResponse,
      };
    }

    const params = {
      userId: requesterId,
      type: body.type,
      isEnabled: body.isEnabled ?? true,
      loginThreshold: body.loginThreshold,
      loginPeriodMs: body.loginPeriodMs,
      fileAccessThreshold: body.fileAccessThreshold,
      fileAccessPeriodMs: body.fileAccessPeriodMs,
      apiUsageThreshold: body.apiUsageThreshold,
      apiUsagePeriodMs: body.apiUsagePeriodMs,
      vaultInteractionThreshold: body.vaultInteractionThreshold,
      vaultInteractionPeriodMs: body.vaultInteractionPeriodMs,
      connectionId: body.connectionId
        ? this.safeParseId(body.connectionId as string)
        : undefined,
    };

    try {
      const config = await this.deps.nativeCanaryService.configure(params);
      return {
        statusCode: 201,
        response: serializeConfig(config) as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to configure native canary';
      return {
        statusCode: 400,
        response: {
          message,
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as NativeCanaryResponse,
      };
    }
  }

  // -----------------------------------------------------------------------
  // GET / — list user's native canary configs
  // Requirement: 8.1
  // -----------------------------------------------------------------------

  private async handleListConfigs(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<NativeCanaryResponse>> {
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
        } as unknown as NativeCanaryResponse,
      };
    }

    const configs = await this.deps.nativeCanaryService.getConfigs(requesterId);

    return {
      statusCode: 200,
      response: configs.map(
        serializeConfig,
      ) as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // PUT /:id — update native canary config
  // Requirement: 8.1
  // -----------------------------------------------------------------------

  private async handleUpdateConfig(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<NativeCanaryResponse>> {
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
        } as unknown as NativeCanaryResponse,
      };
    }

    const configId = this.safeParseId(req.params.id as string | undefined);
    if (!configId) {
      return {
        statusCode: 400,
        response: {
          message: 'Invalid config ID',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as NativeCanaryResponse,
      };
    }

    const body = req.body ?? {};

    // Build updates — only include fields that were provided
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: Record<string, any> = {};

    if (body.isEnabled !== undefined) updates.isEnabled = body.isEnabled;
    if (body.loginThreshold !== undefined)
      updates.loginThreshold = body.loginThreshold;
    if (body.loginPeriodMs !== undefined)
      updates.loginPeriodMs = body.loginPeriodMs;
    if (body.fileAccessThreshold !== undefined)
      updates.fileAccessThreshold = body.fileAccessThreshold;
    if (body.fileAccessPeriodMs !== undefined)
      updates.fileAccessPeriodMs = body.fileAccessPeriodMs;
    if (body.apiUsageThreshold !== undefined)
      updates.apiUsageThreshold = body.apiUsageThreshold;
    if (body.apiUsagePeriodMs !== undefined)
      updates.apiUsagePeriodMs = body.apiUsagePeriodMs;
    if (body.vaultInteractionThreshold !== undefined)
      updates.vaultInteractionThreshold = body.vaultInteractionThreshold;
    if (body.vaultInteractionPeriodMs !== undefined)
      updates.vaultInteractionPeriodMs = body.vaultInteractionPeriodMs;

    try {
      const config = await this.deps.nativeCanaryService.updateConfig(
        configId,
        updates,
      );
      return {
        statusCode: 200,
        response: serializeConfig(config) as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update native canary config';
      const isNotFound = message.includes('not found');
      return {
        statusCode: isNotFound ? 404 : 400,
        response: {
          message,
          error: isNotFound
            ? getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_NotFound)
            : getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_BadRequest),
        } as unknown as NativeCanaryResponse,
      };
    }
  }

  // -----------------------------------------------------------------------
  // PUT /duress-codes — set duress codes (encrypted at rest)
  // Requirement: 8.7
  // -----------------------------------------------------------------------

  private async handleSetDuressCodes(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<NativeCanaryResponse>> {
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
        } as unknown as NativeCanaryResponse,
      };
    }

    const codes = req.body?.codes as string[] | undefined;
    if (!Array.isArray(codes) || codes.length === 0) {
      return {
        statusCode: 400,
        response: {
          message: 'codes must be a non-empty array of strings',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as NativeCanaryResponse,
      };
    }

    // Validate that codes are non-empty strings
    const invalidCodes = codes.filter(
      (c) => typeof c !== 'string' || c.trim().length === 0,
    );
    if (invalidCodes.length > 0) {
      return {
        statusCode: 400,
        response: {
          message: 'All duress codes must be non-empty strings',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as NativeCanaryResponse,
      };
    }

    try {
      // Requirement 8.7: duress codes are encrypted at rest
      await this.deps.nativeCanaryService.setDuressCodes(requesterId, codes);
      return {
        statusCode: 200,
        response: {
          message: 'Duress codes set successfully',
          count: codes.length,
        } as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to set duress codes';
      return {
        statusCode: 400,
        response: {
          message,
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as NativeCanaryResponse,
      };
    }
  }
}
