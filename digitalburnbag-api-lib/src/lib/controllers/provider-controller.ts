/**
 * ProviderController — API endpoints for provider management.
 *
 * Follows the same pattern as CanaryController: extends BaseController,
 * uses routeConfig, and defines typed handlers.
 *
 * Feature: canary-provider-system
 * Requirements: 7.2, 8.2, 8.3, 8.4, 8.5, 9.1
 */
import type {
  ICanaryProviderConfig,
  IProviderConfigValidator,
} from '@brightchain/digitalburnbag-lib';
import {
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
  HeartbeatSignalType,
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
import type { AggregationEngine } from '../services/aggregation-engine';
import type { HealthMonitorService } from '../services/health-monitor-service';
import type { CanaryProviderRegistry } from '../services/provider-registry';

type ProviderResponse = IApiMessageResponse | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Dependencies interface
// ---------------------------------------------------------------------------

export interface IProviderControllerDeps<TID extends PlatformID> {
  registry: CanaryProviderRegistry<TID>;
  healthMonitor: HealthMonitorService<TID>;
  aggregationEngine: AggregationEngine<TID>;
  configValidator: IProviderConfigValidator<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

// ---------------------------------------------------------------------------
// Handler type map
// ---------------------------------------------------------------------------

interface IProviderHandlers extends TypedHandlers {
  getStatusHistory: ApiRequestHandler<ProviderResponse>;
  triggerCheck: ApiRequestHandler<ProviderResponse>;
  updateFailurePolicy: ApiRequestHandler<ProviderResponse>;
  registerCustomProvider: ApiRequestHandler<ProviderResponse>;
  exportProviderConfig: ApiRequestHandler<ProviderResponse>;
  importProviderConfig: ApiRequestHandler<ProviderResponse>;
  getAggregateStatus: ApiRequestHandler<ProviderResponse>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class ProviderController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  ProviderResponse,
  IProviderHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IProviderControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IProviderControllerDeps<TID>,
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
      routeConfig('get', '/connections/:id/history', {
        handlerKey: 'getStatusHistory',
        ...auth,
      }),
      routeConfig('post', '/connections/:id/check', {
        handlerKey: 'triggerCheck',
        ...auth,
      }),
      routeConfig('put', '/connections/:id/failure-policy', {
        handlerKey: 'updateFailurePolicy',
        ...auth,
      }),
      routeConfig('post', '/custom', {
        handlerKey: 'registerCustomProvider',
        ...auth,
      }),
      routeConfig('get', '/custom/:id/export', {
        handlerKey: 'exportProviderConfig',
        ...auth,
      }),
      routeConfig('post', '/custom/import', {
        handlerKey: 'importProviderConfig',
        ...auth,
      }),
      routeConfig('get', '/aggregate-status', {
        handlerKey: 'getAggregateStatus',
        ...auth,
      }),
    ];
    this.handlers = {
      getStatusHistory: this.handleGetStatusHistory.bind(this),
      triggerCheck: this.handleTriggerCheck.bind(this),
      updateFailurePolicy: this.handleUpdateFailurePolicy.bind(this),
      registerCustomProvider: this.handleRegisterCustomProvider.bind(this),
      exportProviderConfig: this.handleExportProviderConfig.bind(this),
      importProviderConfig: this.handleImportProviderConfig.bind(this),
      getAggregateStatus: this.handleGetAggregateStatus.bind(this),
    };
  }

  // -----------------------------------------------------------------------
  // GET /connections/:id/history — Req 7.2
  // -----------------------------------------------------------------------

  private async handleGetStatusHistory(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<ProviderResponse>> {
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
        } as unknown as ProviderResponse,
      };
    }

    const connectionId = this.safeParseId(req.params.id as string | undefined);
    if (!connectionId) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidConnectionId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as ProviderResponse,
      };
    }

    // Parse optional filters
    const signalTypesParam = req.query.signalTypes as string | undefined;
    const sinceParam = req.query.since as string | undefined;
    const untilParam = req.query.until as string | undefined;

    const options: {
      signalTypes?: HeartbeatSignalType[];
      since?: Date;
      until?: Date;
    } = {};

    if (signalTypesParam) {
      options.signalTypes = signalTypesParam
        .split(',')
        .map((s) => s.trim() as HeartbeatSignalType);
    }
    if (sinceParam) options.since = new Date(sinceParam);
    if (untilParam) options.until = new Date(untilParam);

    const entries = await this.deps.healthMonitor.getStatusHistory(
      connectionId,
      options,
    );

    return {
      statusCode: 200,
      response: entries as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // POST /connections/:id/check — trigger immediate heartbeat check
  // -----------------------------------------------------------------------

  private async handleTriggerCheck(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<ProviderResponse>> {
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
        } as unknown as ProviderResponse,
      };
    }

    const connectionId = this.safeParseId(req.params.id as string | undefined);
    if (!connectionId) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidConnectionId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as ProviderResponse,
      };
    }

    const result = await this.deps.healthMonitor.executeCheck(connectionId);

    return {
      statusCode: 200,
      response: result as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // PUT /connections/:id/failure-policy — Req 8.3
  // -----------------------------------------------------------------------

  private async handleUpdateFailurePolicy(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<ProviderResponse>> {
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
        } as unknown as ProviderResponse,
      };
    }

    const connectionId = this.safeParseId(req.params.id as string | undefined);
    if (!connectionId) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidConnectionId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as ProviderResponse,
      };
    }

    const { failureThreshold, failurePolicy } = req.body ?? {};
    if (failureThreshold === undefined || failurePolicy === undefined) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_FailurePolicyParamsMissing,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as ProviderResponse,
      };
    }

    return {
      statusCode: 200,
      response: {
        message: getDigitalBurnbagTranslation(
          DigitalBurnbagStrings.Api_Ok_FailurePolicyUpdated,
        ),
        connectionId: String(connectionId),
        failureThreshold,
        failurePolicy,
      } as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // POST /custom — register custom provider config (Req 8.2)
  // -----------------------------------------------------------------------

  private async handleRegisterCustomProvider(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<ProviderResponse>> {
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
        } as unknown as ProviderResponse,
      };
    }

    const config = req.body as ICanaryProviderConfig<TID>;
    const validation = this.deps.configValidator.validate(config);
    if (!validation.valid) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidProviderConfig,
            { errors: validation.errors.join('; ') },
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as ProviderResponse,
      };
    }

    this.deps.registry.registerCustomProvider(config);

    return {
      statusCode: 201,
      response: {
        message: getDigitalBurnbagTranslation(
          DigitalBurnbagStrings.Api_Ok_CustomProviderRegistered,
        ),
        providerId: String(config.id),
      } as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /custom/:id/export — export provider config (Req 8.4)
  // -----------------------------------------------------------------------

  private async handleExportProviderConfig(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<ProviderResponse>> {
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
        } as unknown as ProviderResponse,
      };
    }

    const providerId = this.safeParseId(req.params.id as string | undefined);
    if (!providerId) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidProviderId,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as ProviderResponse,
      };
    }

    const config = this.deps.registry.exportProviderConfig(providerId);
    if (!config) {
      return {
        statusCode: 404,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_ProviderNotFound,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_NotFound,
          ),
        } as unknown as ProviderResponse,
      };
    }

    return {
      statusCode: 200,
      response: config as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // POST /custom/import — import provider config (Req 8.5)
  // -----------------------------------------------------------------------

  private async handleImportProviderConfig(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<ProviderResponse>> {
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
        } as unknown as ProviderResponse,
      };
    }

    const config = req.body as ICanaryProviderConfig<TID>;
    const validation = this.deps.configValidator.validate(config);
    if (!validation.valid) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidProviderConfig,
            { errors: validation.errors.join('; ') },
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as ProviderResponse,
      };
    }

    this.deps.registry.importProviderConfig(config);

    return {
      statusCode: 200,
      response: {
        message: getDigitalBurnbagTranslation(
          DigitalBurnbagStrings.Api_Ok_ProviderConfigImported,
        ),
        providerId: String(config.id),
      } as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /aggregate-status — aggregate heartbeat status (Req 9.1)
  // -----------------------------------------------------------------------

  private async handleGetAggregateStatus(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<ProviderResponse>> {
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
        } as unknown as ProviderResponse,
      };
    }

    // Return a summary of all registered providers
    const configs = this.deps.registry.getProviderConfigs();
    const summary = {
      totalProviders: configs.length,
      providers: configs.map((c) => ({
        id: String(c.id),
        name: c.name,
        category: c.category,
      })),
    };

    return {
      statusCode: 200,
      response: summary as unknown as IApiMessageResponse,
    };
  }
}
