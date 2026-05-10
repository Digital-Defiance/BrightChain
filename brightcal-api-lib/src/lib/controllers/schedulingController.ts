/**
 * SchedulingController
 *
 * REST API controller for scheduling operations: free/busy queries and
 * find-available-times suggestions.
 * Extends BaseController with OpenAPI metadata and delegates to the service layer.
 *
 * Endpoints:
 *   POST /api/cal/scheduling/free-busy           — Query free/busy data for users
 *   POST /api/cal/scheduling/find-available-times — Find ranked available time slots
 *
 * @see Requirements 8.4, 8.7
 */

import {
  BrightCalStrings,
  type IFreeBusyDataDTO,
  type IWorkingHoursDTO,
  translate,
} from '@brightchain/brightcal-lib';
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
import type {
  IFindAvailableTimesParams,
  IRankedTimeSlot,
} from '../services/schedulingEngineService.js';

// ─── Response interfaces ─────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IFreeBusyResponse {
  freeBusy: Record<string, IFreeBusyDataDTO>;
  [key: string]: any;
}

export interface IFindAvailableTimesResponse {
  slots: IRankedTimeSlot[];
  [key: string]: any;
}

type SchedulingApiResponse =
  | IFreeBusyResponse
  | IFindAvailableTimesResponse
  | ApiErrorResponse;

// ─── Request body interfaces ─────────────────────────────────────────────────

export interface IFreeBusyBody {
  userIds: string[];
  rangeStart: string;
  rangeEnd: string;
}

export interface IFindAvailableTimesBody {
  requiredAttendees: string[];
  optionalAttendees: string[];
  durationMinutes: number;
  rangeStart: string;
  rangeEnd: string;
  workingHours?: IWorkingHoursDTO;
}

// ─── Handler types ───────────────────────────────────────────────────────────

interface SchedulingHandlers extends TypedHandlers {
  freeBusy: ApiRequestHandler<IFreeBusyResponse | ApiErrorResponse>;
  findAvailableTimes: ApiRequestHandler<
    IFindAvailableTimesResponse | ApiErrorResponse
  >;
}

// ─── Service interface ───────────────────────────────────────────────────────

/**
 * Interface for the scheduling service that this controller delegates to.
 * The actual implementation will be injected after construction.
 */
export interface ISchedulingService {
  computeGroupFreeBusy(
    userIds: string[],
    rangeStart: string,
    rangeEnd: string,
  ): Promise<Map<string, IFreeBusyDataDTO>>;

  findAvailableTimes(
    params: IFindAvailableTimesParams,
  ): Promise<IRankedTimeSlot[]>;
}

// ─── Validation helpers ──────────────────────────────────────────────────────

/**
 * Loose ISO 8601 date/datetime check.
 */
function isValidISODate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime());
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * Controller for scheduling operations.
 *
 * Provides REST API endpoints for querying free/busy data and finding
 * ranked available time slots for meetings.
 *
 * All endpoints require authentication.
 *
 * ## Endpoints
 *
 * ### POST /api/cal/scheduling/free-busy
 * Query free/busy data for one or more users over a time range.
 *
 * **Request Body:**
 * - `userIds` (string[], required): User IDs to query
 * - `rangeStart` (string, required): Range start (ISO 8601)
 * - `rangeEnd` (string, required): Range end (ISO 8601)
 *
 * **Response:** `{ freeBusy: Record<string, IFreeBusyDataDTO> }`
 *
 * ### POST /api/cal/scheduling/find-available-times
 * Find ranked available time slots for a meeting.
 *
 * **Request Body:**
 * - `requiredAttendees` (string[], required): Required attendee user IDs
 * - `optionalAttendees` (string[], required): Optional attendee user IDs
 * - `durationMinutes` (number, required): Meeting duration in minutes
 * - `rangeStart` (string, required): Range start (ISO 8601)
 * - `rangeEnd` (string, required): Range end (ISO 8601)
 * - `workingHours` (IWorkingHoursDTO, optional): Custom working hours
 *
 * **Response:** `{ slots: IRankedTimeSlot[] }`
 *
 * @requirements 8.4, 8.7
 */
export class SchedulingController<
  TID extends PlatformID = Buffer,
> extends BaseController<
  TID,
  SchedulingApiResponse,
  SchedulingHandlers,
  CoreLanguageCode
> {
  private schedulingService: ISchedulingService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the SchedulingEngineService after construction.
   * Called during application initialization when the service is available.
   * @requirements 8.4, 8.7
   */
  public setSchedulingService(service: ISchedulingService): void {
    this.schedulingService = service;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/free-busy', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'freeBusy',
        openapi: {
          summary: 'Query free/busy data',
          description:
            'Query free/busy data for one or more users over a specified time range. Returns per-user busy slots.',
          tags: ['Scheduling'],
          requestBody: {
            schema: 'FreeBusyRequest',
            example: {
              userIds: ['user-1', 'user-2'],
              rangeStart: '2024-01-15T00:00:00Z',
              rangeEnd: '2024-01-22T00:00:00Z',
            },
          },
          responses: {
            200: {
              schema: 'FreeBusyResponse',
              description: 'Free/busy data retrieved',
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
      routeConfig('post', '/find-available-times', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'findAvailableTimes',
        openapi: {
          summary: 'Find available time slots',
          description:
            'Find and rank available time slots for a meeting based on attendee availability, duration, and working hours preferences.',
          tags: ['Scheduling'],
          requestBody: {
            schema: 'FindAvailableTimesRequest',
            example: {
              requiredAttendees: ['user-1', 'user-2'],
              optionalAttendees: ['user-3'],
              durationMinutes: 30,
              rangeStart: '2024-01-15T00:00:00Z',
              rangeEnd: '2024-01-22T00:00:00Z',
            },
          },
          responses: {
            200: {
              schema: 'FindAvailableTimesResponse',
              description: 'Available time slots retrieved',
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
      '/cal/scheduling',
      'SchedulingController',
      this.routeDefinitions,
    );

    this.handlers = {
      freeBusy: this.handleFreeBusy.bind(this),
      findAvailableTimes: this.handleFindAvailableTimes.bind(this),
    };
  }

  /**
   * Extract the authenticated user ID from the request.
   * Returns null if the user is not authenticated.
   */
  private getUserId(
    req: Parameters<ApiRequestHandler<ApiErrorResponse>>[0],
  ): string | null {
    const user = (req as { user?: { id?: string } }).user;
    return user?.id ?? null;
  }

  /**
   * Return a 503 response when the scheduling service is not available.
   */
  private serviceUnavailable(): IStatusCodeResponse<ApiErrorResponse> {
    return {
      statusCode: 503,
      response: {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: translate(
            BrightCalStrings.Error_ServiceUnavailable_Scheduling,
          ),
        },
      } as ApiErrorResponse,
    };
  }

  // ─── POST /free-busy ─────────────────────────────────────────────────

  /**
   * POST /api/cal/scheduling/free-busy
   * Query free/busy data for one or more users.
   *
   * @requirements 8.4, 8.7
   */
  private async handleFreeBusy(
    req: Parameters<ApiRequestHandler<IFreeBusyResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<IFreeBusyResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.schedulingService) {
        return this.serviceUnavailable();
      }

      const body = (req as unknown as { body: IFreeBusyBody }).body;

      // Validate required fields
      if (!Array.isArray(body.userIds) || body.userIds.length === 0) {
        return validationError(translate(BrightCalStrings.Error_EmptyUserIds));
      }
      for (const id of body.userIds) {
        if (typeof id !== 'string' || !id.trim()) {
          return validationError(
            translate(BrightCalStrings.Error_InvalidUserId),
          );
        }
      }
      if (!body.rangeStart || typeof body.rangeStart !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'rangeStart',
          }),
        );
      }
      if (!isValidISODate(body.rangeStart)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'rangeStart',
          }),
        );
      }
      if (!body.rangeEnd || typeof body.rangeEnd !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'rangeEnd',
          }),
        );
      }
      if (!isValidISODate(body.rangeEnd)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'rangeEnd',
          }),
        );
      }
      if (new Date(body.rangeEnd) <= new Date(body.rangeStart)) {
        return validationError(
          translate(BrightCalStrings.Error_EndBeforeStart),
        );
      }

      const freeBusyMap = await this.schedulingService.computeGroupFreeBusy(
        body.userIds,
        body.rangeStart,
        body.rangeEnd,
      );

      // Convert Map to plain object for JSON serialization
      const freeBusy: Record<string, IFreeBusyDataDTO> = {};
      for (const [key, value] of freeBusyMap) {
        freeBusy[key] = value;
      }

      return {
        statusCode: 200,
        response: { freeBusy },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── POST /find-available-times ──────────────────────────────────────

  /**
   * POST /api/cal/scheduling/find-available-times
   * Find ranked available time slots for a meeting.
   *
   * @requirements 8.4, 8.7
   */
  private async handleFindAvailableTimes(
    req: Parameters<
      ApiRequestHandler<IFindAvailableTimesResponse | ApiErrorResponse>
    >[0],
  ): Promise<
    IStatusCodeResponse<IFindAvailableTimesResponse | ApiErrorResponse>
  > {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.schedulingService) {
        return this.serviceUnavailable();
      }

      const body = (req as unknown as { body: IFindAvailableTimesBody }).body;

      // Validate required fields
      if (!Array.isArray(body.requiredAttendees)) {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'requiredAttendees',
          }),
        );
      }
      if (!Array.isArray(body.optionalAttendees)) {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'optionalAttendees',
          }),
        );
      }
      if (
        body.requiredAttendees.length === 0 &&
        body.optionalAttendees.length === 0
      ) {
        return validationError(translate(BrightCalStrings.Error_NoAttendees));
      }
      if (
        typeof body.durationMinutes !== 'number' ||
        body.durationMinutes <= 0
      ) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidDuration),
        );
      }
      if (!body.rangeStart || typeof body.rangeStart !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'rangeStart',
          }),
        );
      }
      if (!isValidISODate(body.rangeStart)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'rangeStart',
          }),
        );
      }
      if (!body.rangeEnd || typeof body.rangeEnd !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'rangeEnd',
          }),
        );
      }
      if (!isValidISODate(body.rangeEnd)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'rangeEnd',
          }),
        );
      }
      if (new Date(body.rangeEnd) <= new Date(body.rangeStart)) {
        return validationError(
          translate(BrightCalStrings.Error_EndBeforeStart),
        );
      }

      const slots = await this.schedulingService.findAvailableTimes({
        requiredAttendees: body.requiredAttendees,
        optionalAttendees: body.optionalAttendees,
        durationMinutes: body.durationMinutes,
        rangeStart: body.rangeStart,
        rangeEnd: body.rangeEnd,
        workingHours: body.workingHours,
      });

      return {
        statusCode: 200,
        response: { slots },
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
