/**
 * WebhookEndpointController — API endpoints for webhook endpoint management.
 *
 * Routes (mounted at /burnbag/webhook-endpoints):
 *   POST   /                        — create webhook endpoint for a connection
 *   GET    /                        — list user's endpoints
 *   PUT    /:id/rotate-secret       — rotate secret with grace period
 *   PUT    /:id/ip-allowlist        — update IP allowlist
 *   POST   /:id/test                — send test webhook
 *   GET    /:id/stats               — get delivery stats
 *
 * Feature: canary-provider-expansion
 * Requirements: 10.1, 10.6, 10.7, 17.6, 17.7
 */
import type { IWebhookEndpointService } from '@brightchain/digitalburnbag-lib';
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

type EndpointResponse = IApiMessageResponse | ApiErrorResponse;

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

/** Serialize a webhook endpoint to a JSON-safe DTO (omitting sensitive fields). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serializeEndpoint(e: any) {
  return {
    ...e,
    id: sid(e.id),
    connectionId: sid(e.connectionId),
    userId: sid(e.userId),
    // Omit previousSecret from responses for security
    previousSecret: undefined,
  };
}

// ---------------------------------------------------------------------------
// Dependencies interface
// ---------------------------------------------------------------------------

export interface IWebhookEndpointControllerDeps<TID extends PlatformID> {
  webhookEndpointService: IWebhookEndpointService<TID>;
  /** Repository for listing user's endpoints (not on the service interface) */
  getEndpointsForUser: (userId: TID) => Promise<unknown[]>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

// ---------------------------------------------------------------------------
// Handler type map
// ---------------------------------------------------------------------------

interface IWebhookEndpointHandlers extends TypedHandlers {
  createEndpoint: ApiRequestHandler<EndpointResponse>;
  listEndpoints: ApiRequestHandler<EndpointResponse>;
  rotateSecret: ApiRequestHandler<EndpointResponse>;
  updateIpAllowlist: ApiRequestHandler<EndpointResponse>;
  testWebhook: ApiRequestHandler<EndpointResponse>;
  getStats: ApiRequestHandler<EndpointResponse>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class WebhookEndpointController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  EndpointResponse,
  IWebhookEndpointHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IWebhookEndpointControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IWebhookEndpointControllerDeps<TID>,
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
      // POST / — create webhook endpoint (Req 10.1)
      routeConfig('post', '/', {
        handlerKey: 'createEndpoint',
        ...auth,
      }),
      // GET / — list user's endpoints (Req 10.7)
      routeConfig('get', '/', {
        handlerKey: 'listEndpoints',
        ...auth,
      }),
      // PUT /:id/rotate-secret — rotate secret with grace period (Req 10.6)
      routeConfig('put', '/:id/rotate-secret', {
        handlerKey: 'rotateSecret',
        ...auth,
      }),
      // PUT /:id/ip-allowlist — update IP allowlist (Req 17.6)
      routeConfig('put', '/:id/ip-allowlist', {
        handlerKey: 'updateIpAllowlist',
        ...auth,
      }),
      // POST /:id/test — send test webhook (Req 17.7)
      routeConfig('post', '/:id/test', {
        handlerKey: 'testWebhook',
        ...auth,
      }),
      // GET /:id/stats — get delivery stats (Req 10.7)
      routeConfig('get', '/:id/stats', {
        handlerKey: 'getStats',
        ...auth,
      }),
    ];
    this.handlers = {
      createEndpoint: this.handleCreateEndpoint.bind(this),
      listEndpoints: this.handleListEndpoints.bind(this),
      rotateSecret: this.handleRotateSecret.bind(this),
      updateIpAllowlist: this.handleUpdateIpAllowlist.bind(this),
      testWebhook: this.handleTestWebhook.bind(this),
      getStats: this.handleGetStats.bind(this),
    };
  }

  // -----------------------------------------------------------------------
  // POST / — create webhook endpoint for a connection
  // Requirement: 10.1
  // -----------------------------------------------------------------------

  private async handleCreateEndpoint(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<EndpointResponse>> {
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
        } as unknown as EndpointResponse,
      };
    }

    const body = req.body ?? {};
    const connectionId = this.safeParseId(body.connectionId as string | undefined);
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
        } as unknown as EndpointResponse,
      };
    }

    const providerId = body.providerId as string | undefined;
    if (!providerId) {
      return {
        statusCode: 400,
        response: {
          message: 'providerId is required',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as EndpointResponse,
      };
    }

    try {
      const endpoint = await this.deps.webhookEndpointService.createEndpoint(
        connectionId,
        providerId,
        requesterId,
      );
      return {
        statusCode: 201,
        response: serializeEndpoint(endpoint) as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to create endpoint';
      return {
        statusCode: 400,
        response: {
          message,
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as EndpointResponse,
      };
    }
  }

  // -----------------------------------------------------------------------
  // GET / — list user's webhook endpoints
  // Requirement: 10.7
  // -----------------------------------------------------------------------

  private async handleListEndpoints(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<EndpointResponse>> {
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
        } as unknown as EndpointResponse,
      };
    }

    const endpoints = await this.deps.getEndpointsForUser(requesterId);

    return {
      statusCode: 200,
      response: endpoints.map(
        serializeEndpoint,
      ) as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // PUT /:id/rotate-secret — rotate secret with grace period
  // Requirement: 10.6
  // -----------------------------------------------------------------------

  private async handleRotateSecret(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<EndpointResponse>> {
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
        } as unknown as EndpointResponse,
      };
    }

    const endpointId = this.safeParseId(req.params.id as string | undefined);
    if (!endpointId) {
      return {
        statusCode: 400,
        response: {
          message: 'Invalid endpoint ID',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as EndpointResponse,
      };
    }

    // Optional grace period override from request body (in ms)
    const gracePeriodMs = req.body?.gracePeriodMs as number | undefined;

    try {
      const result = await this.deps.webhookEndpointService.rotateSecret(
        endpointId,
        gracePeriodMs,
      );
      return {
        statusCode: 200,
        response: {
          newSecret: result.newSecret,
          message: 'Secret rotated successfully. Previous secret remains valid during grace period.',
        } as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to rotate secret';
      const isNotFound = message.includes('not found');
      return {
        statusCode: isNotFound ? 404 : 400,
        response: {
          message,
          error: isNotFound
            ? getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_NotFound)
            : getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_BadRequest),
        } as unknown as EndpointResponse,
      };
    }
  }

  // -----------------------------------------------------------------------
  // PUT /:id/ip-allowlist — update IP allowlist
  // Requirement: 17.6
  // -----------------------------------------------------------------------

  private async handleUpdateIpAllowlist(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<EndpointResponse>> {
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
        } as unknown as EndpointResponse,
      };
    }

    const endpointId = this.safeParseId(req.params.id as string | undefined);
    if (!endpointId) {
      return {
        statusCode: 400,
        response: {
          message: 'Invalid endpoint ID',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as EndpointResponse,
      };
    }

    const cidrs = req.body?.cidrs as string[] | undefined;
    if (!Array.isArray(cidrs)) {
      return {
        statusCode: 400,
        response: {
          message: 'cidrs must be an array of CIDR strings',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as EndpointResponse,
      };
    }

    try {
      await this.deps.webhookEndpointService.updateIpAllowlist(endpointId, cidrs);
      return {
        statusCode: 200,
        response: {
          message: 'IP allowlist updated successfully',
          cidrs,
        } as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to update IP allowlist';
      const isNotFound = message.includes('not found');
      return {
        statusCode: isNotFound ? 404 : 400,
        response: {
          message,
          error: isNotFound
            ? getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_NotFound)
            : getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_BadRequest),
        } as unknown as EndpointResponse,
      };
    }
  }

  // -----------------------------------------------------------------------
  // POST /:id/test — send test webhook
  // Requirement: 17.7
  // -----------------------------------------------------------------------

  private async handleTestWebhook(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<EndpointResponse>> {
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
        } as unknown as EndpointResponse,
      };
    }

    const endpointId = this.safeParseId(req.params.id as string | undefined);
    if (!endpointId) {
      return {
        statusCode: 400,
        response: {
          message: 'Invalid endpoint ID',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as EndpointResponse,
      };
    }

    try {
      const result =
        await this.deps.webhookEndpointService.sendTestWebhook(endpointId);
      return {
        statusCode: 200,
        response: result as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to send test webhook';
      const isNotFound = message.includes('not found');
      return {
        statusCode: isNotFound ? 404 : 400,
        response: {
          message,
          error: isNotFound
            ? getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_NotFound)
            : getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_BadRequest),
        } as unknown as EndpointResponse,
      };
    }
  }

  // -----------------------------------------------------------------------
  // GET /:id/stats — get delivery stats
  // Requirement: 10.7
  // -----------------------------------------------------------------------

  private async handleGetStats(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<EndpointResponse>> {
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
        } as unknown as EndpointResponse,
      };
    }

    const endpointId = this.safeParseId(req.params.id as string | undefined);
    if (!endpointId) {
      return {
        statusCode: 400,
        response: {
          message: 'Invalid endpoint ID',
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as EndpointResponse,
      };
    }

    try {
      const stats =
        await this.deps.webhookEndpointService.getDeliveryStats(endpointId);
      return {
        statusCode: 200,
        response: stats as unknown as IApiMessageResponse,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to get delivery stats';
      const isNotFound = message.includes('not found');
      return {
        statusCode: isNotFound ? 404 : 400,
        response: {
          message,
          error: isNotFound
            ? getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_NotFound)
            : getDigitalBurnbagTranslation(DigitalBurnbagStrings.Api_Http_BadRequest),
        } as unknown as EndpointResponse,
      };
    }
  }
}
