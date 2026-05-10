/**
 * CalendarController
 *
 * REST API controller for calendar collection CRUD operations.
 * Extends BaseController with OpenAPI metadata and delegates to the service layer.
 *
 * Endpoints:
 *   POST   /api/cal/calendars      — Create a new calendar collection
 *   GET    /api/cal/calendars      — List all calendars for the authenticated user
 *   GET    /api/cal/calendars/:id  — Get a specific calendar by ID
 *   PATCH  /api/cal/calendars/:id  — Update a calendar (rename, recolor, description)
 *   DELETE /api/cal/calendars/:id  — Delete a calendar and all its events
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.5
 */

import {
  BrightCalStrings,
  CalendarPermissionLevel,
  translate,
} from '@brightchain/brightcal-lib';
import {
  BaseController,
  type IBrightChainApplication,
  forbiddenError,
  handleError,
  notFoundError,
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
import type { ITypedCalendarCollection } from '../models/calendarCollection.model.js';

// ─── Response interfaces ─────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ICreateCalendarResponse {
  calendar: ITypedCalendarCollection;
  [key: string]: any; // ApiResponse index signature compatibility
}

export interface IListCalendarsResponse {
  calendars: Array<
    ITypedCalendarCollection & { permission: CalendarPermissionLevel }
  >;
  [key: string]: any;
}

export interface IGetCalendarResponse {
  calendar: ITypedCalendarCollection;
  permission: CalendarPermissionLevel;
  [key: string]: any;
}

export interface IUpdateCalendarResponse {
  calendar: ITypedCalendarCollection;
  [key: string]: any;
}

export interface IDeleteCalendarResponse {
  success: boolean;
  [key: string]: any;
}

type CalendarApiResponse =
  | ICreateCalendarResponse
  | IListCalendarsResponse
  | IGetCalendarResponse
  | IUpdateCalendarResponse
  | IDeleteCalendarResponse
  | ApiErrorResponse;

// ─── Request body interfaces ─────────────────────────────────────────────────

export interface ICreateCalendarBody {
  displayName: string;
  color: string;
  description?: string;
}

export interface IUpdateCalendarBody {
  displayName?: string;
  color?: string;
  description?: string;
}

// ─── Handler types ───────────────────────────────────────────────────────────

interface CalendarHandlers extends TypedHandlers {
  createCalendar: ApiRequestHandler<ICreateCalendarResponse | ApiErrorResponse>;
  listCalendars: ApiRequestHandler<IListCalendarsResponse | ApiErrorResponse>;
  getCalendar: ApiRequestHandler<IGetCalendarResponse | ApiErrorResponse>;
  updateCalendar: ApiRequestHandler<IUpdateCalendarResponse | ApiErrorResponse>;
  deleteCalendar: ApiRequestHandler<IDeleteCalendarResponse | ApiErrorResponse>;
}

// ─── Service interface ───────────────────────────────────────────────────────

/**
 * Interface for the calendar engine service that this controller delegates to.
 * The actual implementation will be injected after construction.
 */
export interface ICalendarEngineService {
  createCalendar(
    ownerId: string,
    displayName: string,
    color: string,
    description: string,
  ): Promise<ITypedCalendarCollection>;

  listCalendarsForUser(
    userId: string,
  ): Promise<
    Array<ITypedCalendarCollection & { permission: CalendarPermissionLevel }>
  >;

  getCalendarById(
    calendarId: string,
    userId: string,
  ): Promise<{
    calendar: ITypedCalendarCollection;
    permission: CalendarPermissionLevel;
  } | null>;

  updateCalendar(
    calendarId: string,
    userId: string,
    updates: IUpdateCalendarBody,
  ): Promise<ITypedCalendarCollection | null>;

  deleteCalendar(calendarId: string, userId: string): Promise<boolean>;
}

// ─── Hex color validation ────────────────────────────────────────────────────

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * Controller for calendar collection CRUD operations.
 *
 * Provides REST API endpoints for creating, listing, retrieving, updating,
 * and deleting calendar collections. All endpoints require authentication.
 *
 * ## Endpoints
 *
 * ### POST /api/cal/calendars
 * Create a new calendar collection.
 *
 * **Request Body:**
 * - `displayName` (string, required): Display name for the calendar
 * - `color` (string, required): Hex color code (e.g., "#FF5733")
 * - `description` (string, optional): Calendar description
 *
 * **Response:** The created calendar object
 *
 * ### GET /api/cal/calendars
 * List all calendars the authenticated user owns or has been shared with.
 *
 * **Response:** Array of calendars with permission level for each
 *
 * ### GET /api/cal/calendars/:id
 * Get a specific calendar by ID.
 *
 * **Response:** Calendar object with the user's permission level
 *
 * ### PATCH /api/cal/calendars/:id
 * Update a calendar (rename, recolor, update description).
 * Only the calendar owner can update.
 *
 * **Request Body:**
 * - `displayName` (string, optional): New display name
 * - `color` (string, optional): New hex color code
 * - `description` (string, optional): New description
 *
 * **Response:** The updated calendar object
 *
 * ### DELETE /api/cal/calendars/:id
 * Delete a calendar and all its events.
 * Only the calendar owner can delete.
 *
 * **Response:** Success confirmation
 *
 * @requirements 3.1, 3.2, 3.3, 3.5
 */
export class CalendarController<
  TID extends PlatformID = Buffer,
> extends BaseController<
  TID,
  CalendarApiResponse,
  CalendarHandlers,
  CoreLanguageCode
> {
  private calendarService: ICalendarEngineService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the CalendarEngineService after construction.
   * Called during application initialization when the service is available.
   * @requirements 3.1, 3.2, 3.3, 3.5
   */
  public setCalendarService(service: ICalendarEngineService): void {
    this.calendarService = service;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'createCalendar',
        openapi: {
          summary: 'Create a calendar collection',
          description:
            'Create a new calendar collection with a display name, color, and optional description.',
          tags: ['Calendars'],
          requestBody: {
            schema: 'CreateCalendarRequest',
            example: {
              displayName: 'Work',
              color: '#4285F4',
              description: 'Work-related events',
            },
          },
          responses: {
            201: {
              schema: 'CreateCalendarResponse',
              description: 'Calendar created',
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
      routeConfig('get', '/', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'listCalendars',
        openapi: {
          summary: 'List calendars',
          description:
            'List all calendars the authenticated user owns or has been shared with, including the permission level for each.',
          tags: ['Calendars'],
          responses: {
            200: {
              schema: 'ListCalendarsResponse',
              description: 'Calendars retrieved',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Unauthorized',
            },
          },
        },
      }),
      routeConfig('get', '/:id', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'getCalendar',
        openapi: {
          summary: 'Get a calendar by ID',
          description:
            'Retrieve a specific calendar collection by its ID. Requires at least viewer permission.',
          tags: ['Calendars'],
          responses: {
            200: {
              schema: 'GetCalendarResponse',
              description: 'Calendar retrieved',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Unauthorized',
            },
            404: {
              schema: 'ErrorResponse',
              description: 'Calendar not found',
            },
          },
        },
      }),
      routeConfig('patch', '/:id', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'updateCalendar',
        openapi: {
          summary: 'Update a calendar',
          description:
            'Update a calendar collection (rename, recolor, update description). Only the owner can update.',
          tags: ['Calendars'],
          requestBody: {
            schema: 'UpdateCalendarRequest',
            example: {
              displayName: 'Personal',
              color: '#0B8043',
            },
          },
          responses: {
            200: {
              schema: 'UpdateCalendarResponse',
              description: 'Calendar updated',
            },
            400: {
              schema: 'ErrorResponse',
              description: 'Validation error',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Unauthorized',
            },
            403: {
              schema: 'ErrorResponse',
              description: 'Forbidden — not the owner',
            },
            404: {
              schema: 'ErrorResponse',
              description: 'Calendar not found',
            },
          },
        },
      }),
      routeConfig('delete', '/:id', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'deleteCalendar',
        openapi: {
          summary: 'Delete a calendar',
          description:
            'Delete a calendar collection and all its events. Only the owner can delete.',
          tags: ['Calendars'],
          responses: {
            200: {
              schema: 'DeleteCalendarResponse',
              description: 'Calendar deleted',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Unauthorized',
            },
            403: {
              schema: 'ErrorResponse',
              description: 'Forbidden — not the owner',
            },
            404: {
              schema: 'ErrorResponse',
              description: 'Calendar not found',
            },
          },
        },
      }),
    ];

    // Register with OpenAPI registry
    ControllerRegistry.register(
      '/cal/calendars',
      'CalendarController',
      this.routeDefinitions,
    );

    this.handlers = {
      createCalendar: this.handleCreateCalendar.bind(this),
      listCalendars: this.handleListCalendars.bind(this),
      getCalendar: this.handleGetCalendar.bind(this),
      updateCalendar: this.handleUpdateCalendar.bind(this),
      deleteCalendar: this.handleDeleteCalendar.bind(this),
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
   * Return a 503 response when the calendar service is not available.
   */
  private serviceUnavailable(): IStatusCodeResponse<ApiErrorResponse> {
    return {
      statusCode: 503,
      response: {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: translate(
            BrightCalStrings.Error_ServiceUnavailable_Calendar,
          ),
        },
      } as ApiErrorResponse,
    };
  }

  // ─── POST / ──────────────────────────────────────────────────────────

  /**
   * POST /api/cal/calendars
   * Create a new calendar collection.
   *
   * @requirements 3.1
   */
  private async handleCreateCalendar(
    req: Parameters<
      ApiRequestHandler<ICreateCalendarResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<ICreateCalendarResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.calendarService) {
        return this.serviceUnavailable();
      }

      const body = (req as unknown as { body: ICreateCalendarBody }).body;

      // Validate required fields
      if (!body.displayName || typeof body.displayName !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'displayName',
          }),
        );
      }
      if (body.displayName.length > 255) {
        return validationError(
          translate(BrightCalStrings.Error_FieldTooLong_Template, {
            field: 'displayName',
            max: 255,
          }),
        );
      }
      if (!body.color || typeof body.color !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'color',
          }),
        );
      }
      if (!HEX_COLOR_PATTERN.test(body.color)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidHexColor),
        );
      }

      const description =
        body.description && typeof body.description === 'string'
          ? body.description
          : '';

      const calendar = await this.calendarService.createCalendar(
        userId,
        body.displayName.trim(),
        body.color,
        description,
      );

      return {
        statusCode: 201,
        response: { calendar },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── GET / ───────────────────────────────────────────────────────────

  /**
   * GET /api/cal/calendars
   * List all calendars for the authenticated user (owned + shared).
   *
   * @requirements 3.5
   */
  private async handleListCalendars(
    req: Parameters<
      ApiRequestHandler<IListCalendarsResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IListCalendarsResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.calendarService) {
        return this.serviceUnavailable();
      }

      const calendars = await this.calendarService.listCalendarsForUser(userId);

      return {
        statusCode: 200,
        response: { calendars },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── GET /:id ────────────────────────────────────────────────────────

  /**
   * GET /api/cal/calendars/:id
   * Get a specific calendar by ID.
   *
   * @requirements 3.5
   */
  private async handleGetCalendar(
    req: Parameters<
      ApiRequestHandler<IGetCalendarResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IGetCalendarResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.calendarService) {
        return this.serviceUnavailable();
      }

      const { id } = (req as unknown as { params: { id: string } }).params;
      if (!id) {
        return validationError(translate(BrightCalStrings.Error_MissingId));
      }

      const result = await this.calendarService.getCalendarById(id, userId);
      if (!result) {
        return notFoundError('Calendar', id);
      }

      return {
        statusCode: 200,
        response: {
          calendar: result.calendar,
          permission: result.permission,
        },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── PATCH /:id ──────────────────────────────────────────────────────

  /**
   * PATCH /api/cal/calendars/:id
   * Update a calendar (rename, recolor, update description).
   * Only the calendar owner can update.
   *
   * @requirements 3.2
   */
  private async handleUpdateCalendar(
    req: Parameters<
      ApiRequestHandler<IUpdateCalendarResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IUpdateCalendarResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.calendarService) {
        return this.serviceUnavailable();
      }

      const { id } = (req as unknown as { params: { id: string } }).params;
      if (!id) {
        return validationError(translate(BrightCalStrings.Error_MissingId));
      }

      const body = (req as unknown as { body: IUpdateCalendarBody }).body;

      // Validate optional fields if provided
      if (body.displayName !== undefined) {
        if (typeof body.displayName !== 'string' || !body.displayName.trim()) {
          return validationError(
            translate(BrightCalStrings.Error_MissingField_Template, {
              field: 'displayName',
            }),
          );
        }
        if (body.displayName.length > 255) {
          return validationError(
            translate(BrightCalStrings.Error_FieldTooLong_Template, {
              field: 'displayName',
              max: 255,
            }),
          );
        }
      }
      if (body.color !== undefined) {
        if (
          typeof body.color !== 'string' ||
          !HEX_COLOR_PATTERN.test(body.color)
        ) {
          return validationError(
            translate(BrightCalStrings.Error_InvalidHexColor),
          );
        }
      }
      if (
        body.description !== undefined &&
        typeof body.description !== 'string'
      ) {
        return validationError(
          translate(BrightCalStrings.Error_DescriptionMustBeString),
        );
      }

      // Build sanitized updates
      const updates: IUpdateCalendarBody = {};
      if (body.displayName !== undefined) {
        updates.displayName = body.displayName.trim();
      }
      if (body.color !== undefined) {
        updates.color = body.color;
      }
      if (body.description !== undefined) {
        updates.description = body.description;
      }

      if (Object.keys(updates).length === 0) {
        return validationError(
          translate(BrightCalStrings.Error_NoUpdateFields),
        );
      }

      const calendar = await this.calendarService.updateCalendar(
        id,
        userId,
        updates,
      );

      if (!calendar) {
        return notFoundError('Calendar', id);
      }

      return {
        statusCode: 200,
        response: { calendar },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return forbiddenError(
          translate(BrightCalStrings.Error_Forbidden_CalendarUpdate),
        );
      }
      return handleError(error);
    }
  }

  // ─── DELETE /:id ─────────────────────────────────────────────────────

  /**
   * DELETE /api/cal/calendars/:id
   * Delete a calendar and all its events.
   * Only the calendar owner can delete.
   *
   * @requirements 3.3
   */
  private async handleDeleteCalendar(
    req: Parameters<
      ApiRequestHandler<IDeleteCalendarResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IDeleteCalendarResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.calendarService) {
        return this.serviceUnavailable();
      }

      const { id } = (req as unknown as { params: { id: string } }).params;
      if (!id) {
        return validationError(translate(BrightCalStrings.Error_MissingId));
      }

      const deleted = await this.calendarService.deleteCalendar(id, userId);
      if (!deleted) {
        return notFoundError('Calendar', id);
      }

      return {
        statusCode: 200,
        response: { success: true },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return forbiddenError(
          translate(BrightCalStrings.Error_Forbidden_CalendarDelete),
        );
      }
      return handleError(error);
    }
  }
}
