/**
 * AnalyticsController — API endpoints for heartbeat history analytics.
 *
 * Follows the same pattern as ProviderController: extends BaseController,
 * uses routeConfig, and defines typed handlers.
 *
 * Feature: heartbeat-history-analytics
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */
import type { IStatusHistoryEntry } from '@brightchain/digitalburnbag-lib';
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
import { AnalyticsEngine } from '../services/analytics-engine';
import type {
  IConnectionRepository,
  IStatusHistoryRepository,
} from '../services/health-monitor-service';

type AnalyticsResponse = IApiMessageResponse | ApiErrorResponse;

// ---------------------------------------------------------------------------
// Discriminated-union helpers
// ---------------------------------------------------------------------------

/**
 * Type predicate for the `{ ok: false; response: ... }` branch of the
 * validateAuth / validateConnectionOwnership result unions.
 *
 * TypeScript 5.9 does not always narrow generic discriminated unions via
 * `if (!result.ok)`, so we use an explicit predicate instead.
 */
function isErrorResult<T>(
  result: { ok: true } | { ok: false; response: T },
): result is { ok: false; response: T } {
  return !result.ok;
}

// ---------------------------------------------------------------------------
// Dependencies interface
// ---------------------------------------------------------------------------

export interface IAnalyticsControllerDeps<TID extends PlatformID> {
  statusHistoryRepo: IStatusHistoryRepository<TID>;
  connectionRepo: IConnectionRepository<TID>;
  parseId: (idString: string) => TID;
  parseSafeId?: (idString: string) => TID | undefined;
}

// ---------------------------------------------------------------------------
// Handler type map
// ---------------------------------------------------------------------------

interface IAnalyticsHandlers extends TypedHandlers {
  getTimeseries: ApiRequestHandler<AnalyticsResponse>;
  getStats: ApiRequestHandler<AnalyticsResponse>;
  getHeatmap: ApiRequestHandler<AnalyticsResponse>;
  getStreak: ApiRequestHandler<AnalyticsResponse>;
  getCompare: ApiRequestHandler<AnalyticsResponse>;
  getExport: ApiRequestHandler<AnalyticsResponse>;
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class AnalyticsController<
  TID extends NodePlatformID = NodePlatformID,
> extends BaseController<
  AnalyticsResponse,
  IAnalyticsHandlers,
  CoreLanguageCode,
  TID,
  IApplication<TID>
> {
  private readonly deps: IAnalyticsControllerDeps<TID>;

  constructor(
    application: IApplication<TID>,
    deps: IAnalyticsControllerDeps<TID>,
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

  /**
   * Convert TID-typed entries to string-typed entries for the AnalyticsEngine.
   * The AnalyticsEngine operates on IStatusHistoryEntry<string>.
   */
  private toStringEntries(
    entries: IStatusHistoryEntry<TID>[],
  ): IStatusHistoryEntry<string>[] {
    return entries as unknown as IStatusHistoryEntry<string>[];
  }

  /**
   * Parse shared query params: since, until (ISO 8601), signalTypes (comma-separated).
   */
  private parseQueryParams(req: ExpressRequest): {
    since: Date | undefined;
    until: Date | undefined;
    signalTypes: HeartbeatSignalType[] | undefined;
  } {
    const sinceParam = req.query.since as string | undefined;
    const untilParam = req.query.until as string | undefined;
    const signalTypesParam = req.query.signalTypes as string | undefined;

    const since = sinceParam ? new Date(sinceParam) : undefined;
    const until = untilParam ? new Date(untilParam) : undefined;
    const signalTypes = signalTypesParam
      ? signalTypesParam.split(',').map((s) => s.trim() as HeartbeatSignalType)
      : undefined;

    return { since, until, signalTypes };
  }

  /**
   * Validate that the requesting user is authenticated.
   * Returns the requester ID or an error response.
   */
  private validateAuth(
    req: ExpressRequest,
  ):
    | { ok: true; requesterId: TID }
    | { ok: false; response: IStatusCodeResponse<AnalyticsResponse> } {
    const requesterId = this.safeParseId(req.user?.id as string);
    if (!requesterId) {
      return {
        ok: false,
        response: {
          statusCode: 401,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_AuthMissing,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_Unauthorized,
            ),
          } as unknown as AnalyticsResponse,
        },
      };
    }
    return { ok: true, requesterId };
  }

  /**
   * Validate ownership of a connection.
   * Returns the connection ID or an error response.
   */
  private async validateConnectionOwnership(
    req: ExpressRequest,
    requesterId: TID,
  ): Promise<
    | { ok: true; connectionId: TID }
    | { ok: false; response: IStatusCodeResponse<AnalyticsResponse> }
  > {
    const connectionId = this.safeParseId(req.params.id as string | undefined);
    if (!connectionId) {
      return {
        ok: false,
        response: {
          statusCode: 400,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_InvalidConnectionId,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_BadRequest,
            ),
          } as unknown as AnalyticsResponse,
        },
      };
    }

    // Check connection exists and user owns it
    const connection =
      await this.deps.connectionRepo.getConnection(connectionId);
    if (!connection) {
      return {
        ok: false,
        response: {
          statusCode: 404,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_ConnectionNotFound,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_NotFound,
            ),
          } as unknown as AnalyticsResponse,
        },
      };
    }

    if (String(connection.userId) !== String(requesterId)) {
      return {
        ok: false,
        response: {
          statusCode: 403,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_Forbidden,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_Forbidden,
            ),
          } as unknown as AnalyticsResponse,
        },
      };
    }

    return { ok: true, connectionId };
  }

  protected initRouteDefinitions(): void {
    const auth = { useAuthentication: true, useCryptoAuthentication: false };
    this.routeDefinitions = [
      routeConfig('get', '/connections/:id/analytics/timeseries', {
        handlerKey: 'getTimeseries',
        ...auth,
      }),
      routeConfig('get', '/connections/:id/analytics/stats', {
        handlerKey: 'getStats',
        ...auth,
      }),
      routeConfig('get', '/connections/:id/analytics/heatmap', {
        handlerKey: 'getHeatmap',
        ...auth,
      }),
      routeConfig('get', '/connections/:id/analytics/streak', {
        handlerKey: 'getStreak',
        ...auth,
      }),
      routeConfig('get', '/analytics/compare', {
        handlerKey: 'getCompare',
        ...auth,
      }),
      routeConfig('get', '/connections/:id/history/export', {
        handlerKey: 'getExport',
        ...auth,
      }),
    ];
    this.handlers = {
      getTimeseries: this.handleGetTimeseries.bind(this),
      getStats: this.handleGetStats.bind(this),
      getHeatmap: this.handleGetHeatmap.bind(this),
      getStreak: this.handleGetStreak.bind(this),
      getCompare: this.handleGetCompare.bind(this),
      getExport: this.handleGetExport.bind(this),
    };
  }

  // -----------------------------------------------------------------------
  // GET /connections/:id/analytics/timeseries — Task 6.2
  // -----------------------------------------------------------------------

  private async handleGetTimeseries(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<AnalyticsResponse>> {
    const authResult = this.validateAuth(req);
    if (isErrorResult(authResult)) return authResult.response;

    const ownerResult = await this.validateConnectionOwnership(
      req,
      authResult.requesterId,
    );
    if (isErrorResult(ownerResult)) return ownerResult.response;

    const { since, until, signalTypes } = this.parseQueryParams(req);

    if (!since || !until) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_SinceUntilRequired,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as AnalyticsResponse,
      };
    }

    if (since.getTime() > until.getTime()) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidDateRange,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as AnalyticsResponse,
      };
    }

    const entries = await this.deps.statusHistoryRepo.getEntriesByConnection(
      ownerResult.connectionId,
      { since, until, signalTypes },
    );

    const granularity = AnalyticsEngine.selectGranularity(since, until);
    const stringEntries = this.toStringEntries(entries);
    const buckets = AnalyticsEngine.aggregateIntoBuckets(
      stringEntries,
      since,
      until,
      granularity,
    );

    return {
      statusCode: 200,
      response: buckets as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /connections/:id/analytics/stats — Task 6.3
  // -----------------------------------------------------------------------

  private async handleGetStats(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<AnalyticsResponse>> {
    const authResult = this.validateAuth(req);
    if (isErrorResult(authResult)) return authResult.response;

    const ownerResult = await this.validateConnectionOwnership(
      req,
      authResult.requesterId,
    );
    if (isErrorResult(ownerResult)) return ownerResult.response;

    const { since, until, signalTypes } = this.parseQueryParams(req);

    const now = new Date();
    const effectiveSince =
      since ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const effectiveUntil = until ?? now;

    const entries = await this.deps.statusHistoryRepo.getEntriesByConnection(
      ownerResult.connectionId,
      { since: effectiveSince, until: effectiveUntil, signalTypes },
    );

    const stringEntries = this.toStringEntries(entries);
    const stats = AnalyticsEngine.computeStatistics(
      stringEntries,
      effectiveSince,
      effectiveUntil,
    );

    return {
      statusCode: 200,
      response: stats as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /connections/:id/analytics/heatmap — Task 6.4
  // -----------------------------------------------------------------------

  private async handleGetHeatmap(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<AnalyticsResponse>> {
    const authResult = this.validateAuth(req);
    if (isErrorResult(authResult)) return authResult.response;

    const ownerResult = await this.validateConnectionOwnership(
      req,
      authResult.requesterId,
    );
    if (isErrorResult(ownerResult)) return ownerResult.response;

    const { since, until, signalTypes } = this.parseQueryParams(req);

    const now = new Date();
    const effectiveSince =
      since ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const effectiveUntil = until ?? now;

    const entries = await this.deps.statusHistoryRepo.getEntriesByConnection(
      ownerResult.connectionId,
      { since: effectiveSince, until: effectiveUntil, signalTypes },
    );

    const stringEntries = this.toStringEntries(entries);
    const heatmap = AnalyticsEngine.computeHeatmap(
      stringEntries,
      effectiveSince,
      effectiveUntil,
    );

    return {
      statusCode: 200,
      response: heatmap as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /connections/:id/analytics/streak — Task 6.5
  // -----------------------------------------------------------------------

  private async handleGetStreak(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<AnalyticsResponse>> {
    const authResult = this.validateAuth(req);
    if (isErrorResult(authResult)) return authResult.response;

    const ownerResult = await this.validateConnectionOwnership(
      req,
      authResult.requesterId,
    );
    if (isErrorResult(ownerResult)) return ownerResult.response;

    const { signalTypes } = this.parseQueryParams(req);

    const entries = await this.deps.statusHistoryRepo.getEntriesByConnection(
      ownerResult.connectionId,
      { signalTypes },
    );

    const stringEntries = this.toStringEntries(entries);
    const streakInfo = AnalyticsEngine.computeStreakInfo(
      stringEntries,
      new Date(),
    );

    return {
      statusCode: 200,
      response: streakInfo as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /analytics/compare — Task 6.6
  // -----------------------------------------------------------------------

  private async handleGetCompare(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<AnalyticsResponse>> {
    const authResult = this.validateAuth(req);
    if (isErrorResult(authResult)) return authResult.response;

    const connectionIdsParam = req.query.connectionIds as string | undefined;
    if (!connectionIdsParam) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_ConnectionIdsRequired,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as AnalyticsResponse,
      };
    }

    const idStrings = connectionIdsParam.split(',').map((s) => s.trim());
    if (idStrings.length > 5) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_MaxConnectionsCompare,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as AnalyticsResponse,
      };
    }

    const { since, until, signalTypes } = this.parseQueryParams(req);

    if (!since || !until) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_SinceUntilRequired,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as AnalyticsResponse,
      };
    }

    if (since.getTime() > until.getTime()) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidDateRange,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as AnalyticsResponse,
      };
    }

    // Validate all connection IDs and ownership
    const connectionIds: TID[] = [];
    for (const idStr of idStrings) {
      const connId = this.safeParseId(idStr);
      if (!connId) {
        return {
          statusCode: 400,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_InvalidConnectionIdTemplate,
              { id: idStr },
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_BadRequest,
            ),
          } as unknown as AnalyticsResponse,
        };
      }

      const connection = await this.deps.connectionRepo.getConnection(connId);
      if (!connection) {
        return {
          statusCode: 404,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Error_ConnectionNotFoundTemplate,
              { id: idStr },
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_NotFound,
            ),
          } as unknown as AnalyticsResponse,
        };
      }

      if (String(connection.userId) !== String(authResult.requesterId)) {
        return {
          statusCode: 403,
          response: {
            message: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_Forbidden,
            ),
            error: getDigitalBurnbagTranslation(
              DigitalBurnbagStrings.Api_Http_Forbidden,
            ),
          } as unknown as AnalyticsResponse,
        };
      }

      connectionIds.push(connId);
    }

    const granularity = AnalyticsEngine.selectGranularity(since, until);

    // Aggregate each connection's entries
    const datasets = [];
    for (const connId of connectionIds) {
      const entries = await this.deps.statusHistoryRepo.getEntriesByConnection(
        connId,
        {
          since,
          until,
          signalTypes,
        },
      );

      const connection = await this.deps.connectionRepo.getConnection(connId);

      const stringEntries = this.toStringEntries(entries);
      const buckets = AnalyticsEngine.aggregateIntoBuckets(
        stringEntries,
        since,
        until,
        granularity,
      );

      datasets.push({
        connectionId: String(connId),
        connectionName: connection?.providerUsername ?? String(connId),
        buckets,
      });
    }

    return {
      statusCode: 200,
      response: datasets as unknown as IApiMessageResponse,
    };
  }

  // -----------------------------------------------------------------------
  // GET /connections/:id/history/export — Task 6.7
  // -----------------------------------------------------------------------

  private async handleGetExport(
    req: ExpressRequest,
  ): Promise<IStatusCodeResponse<AnalyticsResponse>> {
    const authResult = this.validateAuth(req);
    if (isErrorResult(authResult)) return authResult.response;

    const ownerResult = await this.validateConnectionOwnership(
      req,
      authResult.requesterId,
    );
    if (isErrorResult(ownerResult)) return ownerResult.response;

    const format = req.query.format as string | undefined;
    if (!format || (format !== 'csv' && format !== 'json')) {
      return {
        statusCode: 400,
        response: {
          message: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_InvalidExportFormat,
          ),
          error: getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Http_BadRequest,
          ),
        } as unknown as AnalyticsResponse,
      };
    }

    const { since, until, signalTypes } = this.parseQueryParams(req);

    const entries = await this.deps.statusHistoryRepo.getEntriesByConnection(
      ownerResult.connectionId,
      { since, until, signalTypes },
    );

    const stringEntries = this.toStringEntries(entries);

    if (format === 'csv') {
      const csv = AnalyticsEngine.formatCSV(stringEntries);
      // Set headers via the response object if available
      const connectionIdStr = String(ownerResult.connectionId);
      return {
        statusCode: 200,
        response: {
          _exportData: csv,
          _contentType: 'text/csv',
          _contentDisposition: `attachment; filename="history-${connectionIdStr}.csv"`,
        } as unknown as IApiMessageResponse,
      };
    } else {
      const json = AnalyticsEngine.formatJSON(stringEntries);
      const connectionIdStr = String(ownerResult.connectionId);
      return {
        statusCode: 200,
        response: {
          _exportData: json,
          _contentType: 'application/json',
          _contentDisposition: `attachment; filename="history-${connectionIdStr}.json"`,
        } as unknown as IApiMessageResponse,
      };
    }
  }
}
