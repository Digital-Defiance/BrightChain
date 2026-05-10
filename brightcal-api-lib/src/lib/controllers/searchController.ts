/**
 * SearchController
 *
 * REST API controller for full-text search and structured filtering of
 * calendar events. Extends BaseController with OpenAPI metadata and
 * delegates to the SearchService.
 *
 * Endpoints:
 *   GET /api/cal/search         — Full-text search across events
 *   GET /api/cal/search/filter  — Structured filter by criteria
 *
 * @see Requirements 15.1, 15.2, 15.3, 15.4
 */

import { BrightCalStrings, translate } from '@brightchain/brightcal-lib';
import {
  BaseController,
  type IBrightChainApplication,
  handleError,
  unauthorizedError,
  validationError,
} from '@brightchain/brightchain-api-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  ControllerRegistry,
  IStatusCodeResponse,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import type { ITypedCalendarEvent } from '../models/calendarEvent.model.js';
import type {
  IFilterCriteria,
  ISearchService,
} from '../services/searchService.js';

// ─── Response interfaces ─────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ISearchResponse {
  results: ITypedCalendarEvent[];
  [key: string]: any;
}

export interface IFilterResponse {
  results: ITypedCalendarEvent[];
  [key: string]: any;
}

type SearchApiResponse = ISearchResponse | IFilterResponse | ApiErrorResponse;

// ─── Handler types ───────────────────────────────────────────────────────────

interface SearchHandlers extends TypedHandlers {
  search: ApiRequestHandler<ISearchResponse | ApiErrorResponse>;
  filter: ApiRequestHandler<IFilterResponse | ApiErrorResponse>;
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * Controller for search and filtering operations on calendar events.
 *
 * Provides REST API endpoints for full-text search and structured filtering.
 * All endpoints require authentication.
 *
 * ## Endpoints
 *
 * ### GET /api/cal/search
 * Full-text search across event titles, descriptions, locations, and attendee names.
 *
 * **Query Parameters:**
 * - `q` (string, required): Search query
 * - `calendarIds` (string, optional): Comma-separated calendar IDs to restrict search
 *
 * **Response:** `{ results: ITypedCalendarEvent[] }`
 *
 * ### GET /api/cal/search/filter
 * Structured filter with AND-combined criteria.
 *
 * **Query Parameters:**
 * - `calendarId` (string, optional): Filter by calendar ID
 * - `start` (string, optional): Filter events ending after this date (ISO 8601)
 * - `end` (string, optional): Filter events starting before this date (ISO 8601)
 * - `attendee` (string, optional): Filter by attendee ID
 * - `status` (string, optional): Filter by event status (CONFIRMED, TENTATIVE, CANCELLED)
 * - `recurring` (string, optional): Filter by recurrence ("true" or "false")
 *
 * **Response:** `{ results: ITypedCalendarEvent[] }`
 *
 * @requirements 15.1, 15.2, 15.3, 15.4
 */
export class SearchController<
  TID extends PlatformID = Buffer,
> extends BaseController<
  TID,
  SearchApiResponse,
  SearchHandlers,
  CoreLanguageCode
> {
  private searchService: ISearchService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the SearchService after construction.
   * Called during application initialization when the service is available.
   * @requirements 15.1, 15.2, 15.3, 15.4
   */
  public setSearchService(service: ISearchService): void {
    this.searchService = service;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'search',
        openapi: {
          summary: 'Full-text search events',
          description:
            'Search across event titles, descriptions, locations, and attendee names. Results ranked by relevance with recent/upcoming prioritized.',
          tags: ['Search'],
          responses: {
            200: {
              schema: 'SearchResponse',
              description: 'Search results',
            },
            400: {
              schema: 'ErrorResponse',
              description: 'Validation error',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Unauthorized',
            },
          },
        },
      }),
      routeConfig('get', '/filter', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'filter',
        openapi: {
          summary: 'Filter events by criteria',
          description:
            'Structured filter by date range, calendar, attendee, status, and recurrence type. All criteria combined with AND.',
          tags: ['Search'],
          responses: {
            200: {
              schema: 'FilterResponse',
              description: 'Filter results',
            },
            400: {
              schema: 'ErrorResponse',
              description: 'Validation error',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Unauthorized',
            },
          },
        },
      }),
    ];

    // Register with OpenAPI registry
    ControllerRegistry.register(
      '/cal/search',
      'SearchController',
      this.routeDefinitions,
    );

    this.handlers = {
      search: this.handleSearch.bind(this),
      filter: this.handleFilter.bind(this),
    };
  }

  /**
   * Extract the authenticated user ID from the request.
   */
  private getUserId(
    req: Parameters<ApiRequestHandler<ApiErrorResponse>>[0],
  ): string | null {
    const user = (req as { user?: { id?: string } }).user;
    return user?.id ?? null;
  }

  /**
   * Return a 503 response when the search service is not available.
   */
  private serviceUnavailable(): IStatusCodeResponse<ApiErrorResponse> {
    return {
      statusCode: 503,
      response: {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: translate(BrightCalStrings.Error_ServiceUnavailable_Search),
        },
      } as ApiErrorResponse,
    };
  }

  // ─── GET / ───────────────────────────────────────────────────────────

  /**
   * GET /api/cal/search?q=...&calendarIds=...
   * Full-text search across events.
   *
   * @requirements 15.1, 15.4
   */
  private async handleSearch(
    req: Parameters<ApiRequestHandler<ISearchResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<ISearchResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.searchService) {
        return this.serviceUnavailable();
      }

      const query = (req as unknown as { query: Record<string, string> }).query;
      const q = query['q'];

      if (!q || typeof q !== 'string' || !q.trim()) {
        return validationError(
          translate(BrightCalStrings.Error_MissingSearchQuery),
        );
      }

      const calendarIds = query['calendarIds']
        ? query['calendarIds']
            .split(',')
            .map((id) => id.trim())
            .filter(Boolean)
        : undefined;

      const results = await this.searchService.search(userId, q, calendarIds);

      return {
        statusCode: 200,
        response: { results },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── GET /filter ─────────────────────────────────────────────────────

  /**
   * GET /api/cal/search/filter?calendarId=...&start=...&end=...&attendee=...&status=...&recurring=...
   * Structured filter by criteria.
   *
   * @requirements 15.2, 15.3
   */
  private async handleFilter(
    req: Parameters<ApiRequestHandler<IFilterResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<IFilterResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.searchService) {
        return this.serviceUnavailable();
      }

      const query = (req as unknown as { query: Record<string, string> }).query;

      const criteria: IFilterCriteria = {};

      if (query['calendarId']) {
        criteria.calendarId = query['calendarId'];
      }
      if (query['start']) {
        if (isNaN(new Date(query['start']).getTime())) {
          return validationError(
            translate(BrightCalStrings.Error_InvalidStartDate),
          );
        }
        criteria.start = query['start'];
      }
      if (query['end']) {
        if (isNaN(new Date(query['end']).getTime())) {
          return validationError(
            translate(BrightCalStrings.Error_InvalidEndDate),
          );
        }
        criteria.end = query['end'];
      }
      if (query['attendee']) {
        criteria.attendee = query['attendee'];
      }
      if (query['status']) {
        criteria.status = query['status'];
      }
      if (query['recurring'] !== undefined) {
        criteria.recurring = query['recurring'] === 'true';
      }

      const results = await this.searchService.filter(userId, criteria);

      return {
        statusCode: 200,
        response: { results },
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
