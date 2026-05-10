/**
 * EventController
 *
 * REST API controller for calendar event CRUD operations.
 * Extends BaseController with OpenAPI metadata and delegates to the service layer.
 *
 * Endpoints:
 *   POST   /api/cal/events      — Create a new event
 *   GET    /api/cal/events      — List events by calendar and/or date range
 *   GET    /api/cal/events/:id  — Get a specific event by ID
 *   PATCH  /api/cal/events/:id  — Update an event (supports recurrence modification modes)
 *   DELETE /api/cal/events/:id  — Delete an event (supports recurrence deletion modes)
 *
 * @see Requirements 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9
 */

import {
  BrightCalStrings,
  EventTransparency,
  EventVisibility,
  type IAttendeeDTO,
  type IRecurrenceRule,
  type IReminderDTO,
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
import type { ITypedCalendarEvent } from '../models/calendarEvent.model.js';

// ─── Recurrence modification mode ────────────────────────────────────────────

export type RecurrenceModificationMode = 'single' | 'thisAndFuture' | 'all';

// ─── Response interfaces ─────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ICreateEventResponse {
  event: ITypedCalendarEvent;
  [key: string]: any;
}

export interface IListEventsResponse {
  events: ITypedCalendarEvent[];
  [key: string]: any;
}

export interface IGetEventResponse {
  event: ITypedCalendarEvent;
  [key: string]: any;
}

export interface IUpdateEventResponse {
  event: ITypedCalendarEvent;
  [key: string]: any;
}

export interface IDeleteEventResponse {
  success: boolean;
  [key: string]: any;
}

type EventApiResponse =
  | ICreateEventResponse
  | IListEventsResponse
  | IGetEventResponse
  | IUpdateEventResponse
  | IDeleteEventResponse
  | ApiErrorResponse;

// ─── Request body interfaces ─────────────────────────────────────────────────

export interface ICreateEventBody {
  calendarId: string;
  summary: string;
  dtstart: string;
  dtend: string;
  dtstartTzid: string;
  dtendTzid: string;
  allDay: boolean;
  visibility: EventVisibility;
  transparency: EventTransparency;
  description?: string;
  location?: string;
  attendees?: IAttendeeDTO[];
  rrule?: IRecurrenceRule;
  reminders?: IReminderDTO[];
  categories?: string[];
}

export interface IUpdateEventBody {
  summary?: string;
  dtstart?: string;
  dtend?: string;
  dtstartTzid?: string;
  dtendTzid?: string;
  allDay?: boolean;
  visibility?: EventVisibility;
  transparency?: EventTransparency;
  description?: string;
  location?: string;
  attendees?: IAttendeeDTO[];
  rrule?: IRecurrenceRule;
  reminders?: IReminderDTO[];
  categories?: string[];
  modificationMode?: RecurrenceModificationMode;
}

// ─── Handler types ───────────────────────────────────────────────────────────

interface EventHandlers extends TypedHandlers {
  createEvent: ApiRequestHandler<ICreateEventResponse | ApiErrorResponse>;
  listEvents: ApiRequestHandler<IListEventsResponse | ApiErrorResponse>;
  getEvent: ApiRequestHandler<IGetEventResponse | ApiErrorResponse>;
  updateEvent: ApiRequestHandler<IUpdateEventResponse | ApiErrorResponse>;
  deleteEvent: ApiRequestHandler<IDeleteEventResponse | ApiErrorResponse>;
}

// ─── Service interface ───────────────────────────────────────────────────────

/**
 * Interface for the event engine service that this controller delegates to.
 * The actual implementation will be injected after construction.
 */
export interface IEventEngineService {
  createEvent(
    userId: string,
    eventData: ICreateEventBody,
  ): Promise<ITypedCalendarEvent>;

  listEvents(
    userId: string,
    calendarId: string,
    start?: string,
    end?: string,
  ): Promise<ITypedCalendarEvent[]>;

  getEventById(
    eventId: string,
    userId: string,
  ): Promise<ITypedCalendarEvent | null>;

  updateEvent(
    eventId: string,
    userId: string,
    updates: IUpdateEventBody,
    mode: RecurrenceModificationMode,
  ): Promise<ITypedCalendarEvent | null>;

  deleteEvent(
    eventId: string,
    userId: string,
    mode: RecurrenceModificationMode,
  ): Promise<boolean>;
}

// ─── Validation helpers ──────────────────────────────────────────────────────

const VALID_VISIBILITY = Object.values(EventVisibility);
const VALID_TRANSPARENCY = Object.values(EventTransparency);
const VALID_MODIFICATION_MODES: RecurrenceModificationMode[] = [
  'single',
  'thisAndFuture',
  'all',
];

/**
 * Loose ISO 8601 date/datetime check.
 * Accepts full ISO strings (2024-01-15T09:00:00Z) and date-only (2024-01-15).
 */
function isValidISODate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime());
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * Controller for calendar event CRUD operations.
 *
 * Provides REST API endpoints for creating, listing, retrieving, updating,
 * and deleting calendar events. Supports recurrence modification modes
 * (single, thisAndFuture, all) for recurring event operations.
 *
 * All endpoints require authentication.
 *
 * ## Endpoints
 *
 * ### POST /api/cal/events
 * Create a new calendar event.
 *
 * **Request Body:**
 * - `calendarId` (string, required): Target calendar ID
 * - `summary` (string, required): Event title
 * - `dtstart` (string, required): Start time (ISO 8601)
 * - `dtend` (string, required): End time (ISO 8601)
 * - `dtstartTzid` (string, required): IANA timezone for start
 * - `dtendTzid` (string, required): IANA timezone for end
 * - `allDay` (boolean, required): Whether this is an all-day event
 * - `visibility` (EventVisibility, required): PUBLIC, PRIVATE, or CONFIDENTIAL
 * - `transparency` (EventTransparency, required): OPAQUE or TRANSPARENT
 * - `description` (string, optional): Event description
 * - `location` (string, optional): Event location
 * - `attendees` (IAttendeeDTO[], optional): Event attendees
 * - `rrule` (IRecurrenceRule, optional): Recurrence rule
 * - `reminders` (IReminderDTO[], optional): Event reminders
 * - `categories` (string[], optional): Event categories
 *
 * **Response:** The created event object
 *
 * ### GET /api/cal/events
 * List events by calendar and/or date range.
 *
 * **Query Parameters:**
 * - `calendarId` (string, required): Calendar to list events from
 * - `start` (string, optional): Range start (ISO 8601)
 * - `end` (string, optional): Range end (ISO 8601)
 *
 * **Response:** Array of events
 *
 * ### GET /api/cal/events/:id
 * Get a specific event by ID.
 *
 * **Response:** Event object
 *
 * ### PATCH /api/cal/events/:id
 * Update an event. For recurring events, supports modification modes.
 *
 * **Request Body:** Any updatable event fields plus:
 * - `modificationMode` ('single' | 'thisAndFuture' | 'all', default: 'all')
 *
 * **Response:** The updated event object
 *
 * ### DELETE /api/cal/events/:id
 * Delete an event. For recurring events, supports deletion modes.
 *
 * **Query Parameter:**
 * - `mode` ('single' | 'thisAndFuture' | 'all', default: 'all')
 *
 * **Response:** Success confirmation
 *
 * @requirements 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9
 */
export class EventController<
  TID extends PlatformID = Buffer,
> extends BaseController<
  TID,
  EventApiResponse,
  EventHandlers,
  CoreLanguageCode
> {
  private eventService: IEventEngineService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the EventEngineService after construction.
   * Called during application initialization when the service is available.
   * @requirements 4.1, 4.2, 4.3, 4.4, 4.7, 4.8, 4.9
   */
  public setEventService(service: IEventEngineService): void {
    this.eventService = service;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'createEvent',
        openapi: {
          summary: 'Create a calendar event',
          description:
            'Create a new calendar event with title, times, attendees, recurrence, and other metadata.',
          tags: ['Events'],
          requestBody: {
            schema: 'CreateEventRequest',
            example: {
              calendarId: 'cal-123',
              summary: 'Team Standup',
              dtstart: '2024-01-15T09:00:00',
              dtend: '2024-01-15T09:30:00',
              dtstartTzid: 'America/New_York',
              dtendTzid: 'America/New_York',
              allDay: false,
              visibility: 'PUBLIC',
              transparency: 'OPAQUE',
            },
          },
          responses: {
            201: {
              schema: 'CreateEventResponse',
              description: 'Event created',
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
        handlerKey: 'listEvents',
        openapi: {
          summary: 'List events',
          description:
            'List events for a calendar, optionally filtered by date range.',
          tags: ['Events'],
          responses: {
            200: {
              schema: 'ListEventsResponse',
              description: 'Events retrieved',
            },
            400: {
              schema: 'ErrorResponse',
              description: 'Validation error — missing calendarId',
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
        handlerKey: 'getEvent',
        openapi: {
          summary: 'Get an event by ID',
          description: 'Retrieve a specific calendar event by its ID.',
          tags: ['Events'],
          responses: {
            200: {
              schema: 'GetEventResponse',
              description: 'Event retrieved',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Unauthorized',
            },
            404: {
              schema: 'ErrorResponse',
              description: 'Event not found',
            },
          },
        },
      }),
      routeConfig('patch', '/:id', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'updateEvent',
        openapi: {
          summary: 'Update an event',
          description:
            'Update a calendar event. For recurring events, use modificationMode to control scope: single, thisAndFuture, or all.',
          tags: ['Events'],
          requestBody: {
            schema: 'UpdateEventRequest',
            example: {
              summary: 'Updated Standup',
              modificationMode: 'all',
            },
          },
          responses: {
            200: {
              schema: 'UpdateEventResponse',
              description: 'Event updated',
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
              description: 'Forbidden — insufficient permission',
            },
            404: {
              schema: 'ErrorResponse',
              description: 'Event not found',
            },
          },
        },
      }),
      routeConfig('delete', '/:id', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'deleteEvent',
        openapi: {
          summary: 'Delete an event',
          description:
            'Delete a calendar event. For recurring events, use the mode query parameter: single, thisAndFuture, or all.',
          tags: ['Events'],
          responses: {
            200: {
              schema: 'DeleteEventResponse',
              description: 'Event deleted',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Unauthorized',
            },
            403: {
              schema: 'ErrorResponse',
              description: 'Forbidden — insufficient permission',
            },
            404: {
              schema: 'ErrorResponse',
              description: 'Event not found',
            },
          },
        },
      }),
    ];

    // Register with OpenAPI registry
    ControllerRegistry.register(
      '/cal/events',
      'EventController',
      this.routeDefinitions,
    );

    this.handlers = {
      createEvent: this.handleCreateEvent.bind(this),
      listEvents: this.handleListEvents.bind(this),
      getEvent: this.handleGetEvent.bind(this),
      updateEvent: this.handleUpdateEvent.bind(this),
      deleteEvent: this.handleDeleteEvent.bind(this),
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
   * Return a 503 response when the event service is not available.
   */
  private serviceUnavailable(): IStatusCodeResponse<ApiErrorResponse> {
    return {
      statusCode: 503,
      response: {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: translate(BrightCalStrings.Error_ServiceUnavailable_Event),
        },
      } as ApiErrorResponse,
    };
  }

  // ─── POST / ──────────────────────────────────────────────────────────

  /**
   * POST /api/cal/events
   * Create a new calendar event.
   *
   * @requirements 4.1, 4.2, 4.8
   */
  private async handleCreateEvent(
    req: Parameters<
      ApiRequestHandler<ICreateEventResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<ICreateEventResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.eventService) {
        return this.serviceUnavailable();
      }

      const body = (req as unknown as { body: ICreateEventBody }).body;

      // Validate required fields
      if (!body.calendarId || typeof body.calendarId !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'calendarId',
          }),
        );
      }
      if (!body.summary || typeof body.summary !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'summary',
          }),
        );
      }
      if (!body.dtstart || typeof body.dtstart !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'dtstart',
          }),
        );
      }
      if (!isValidISODate(body.dtstart)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'dtstart',
          }),
        );
      }
      if (!body.dtend || typeof body.dtend !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'dtend',
          }),
        );
      }
      if (!isValidISODate(body.dtend)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'dtend',
          }),
        );
      }
      if (!body.dtstartTzid || typeof body.dtstartTzid !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'dtstartTzid',
          }),
        );
      }
      if (!body.dtendTzid || typeof body.dtendTzid !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'dtendTzid',
          }),
        );
      }
      if (typeof body.allDay !== 'boolean') {
        return validationError(
          translate(BrightCalStrings.Error_MissingField_Template, {
            field: 'allDay',
          }),
        );
      }
      if (
        !body.visibility ||
        !VALID_VISIBILITY.includes(body.visibility as EventVisibility)
      ) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidVisibility, {
            values: VALID_VISIBILITY.join(', '),
          }),
        );
      }
      if (
        !body.transparency ||
        !VALID_TRANSPARENCY.includes(body.transparency as EventTransparency)
      ) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidTransparency, {
            values: VALID_TRANSPARENCY.join(', '),
          }),
        );
      }

      // Validate dtend is after dtstart
      if (new Date(body.dtend) <= new Date(body.dtstart)) {
        return validationError(
          translate(BrightCalStrings.Error_EndBeforeStart),
        );
      }

      const event = await this.eventService.createEvent(userId, body);

      return {
        statusCode: 201,
        response: { event },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── GET / ───────────────────────────────────────────────────────────

  /**
   * GET /api/cal/events
   * List events by calendar and/or date range.
   *
   * @requirements 4.1
   */
  private async handleListEvents(
    req: Parameters<
      ApiRequestHandler<IListEventsResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IListEventsResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.eventService) {
        return this.serviceUnavailable();
      }

      const query = (
        req as unknown as {
          query: { calendarId?: string; start?: string; end?: string };
        }
      ).query;

      if (!query.calendarId || typeof query.calendarId !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingCalendarId),
        );
      }

      // Validate optional date range params
      if (query.start && !isValidISODate(query.start)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidStartDate),
        );
      }
      if (query.end && !isValidISODate(query.end)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidEndDate),
        );
      }

      const events = await this.eventService.listEvents(
        userId,
        query.calendarId,
        query.start,
        query.end,
      );

      return {
        statusCode: 200,
        response: { events },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── GET /:id ────────────────────────────────────────────────────────

  /**
   * GET /api/cal/events/:id
   * Get a specific event by ID.
   *
   * @requirements 4.1
   */
  private async handleGetEvent(
    req: Parameters<ApiRequestHandler<IGetEventResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<IGetEventResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.eventService) {
        return this.serviceUnavailable();
      }

      const { id } = (req as unknown as { params: { id: string } }).params;
      if (!id) {
        return validationError(translate(BrightCalStrings.Error_MissingId));
      }

      const event = await this.eventService.getEventById(id, userId);
      if (!event) {
        return notFoundError('Event', id);
      }

      return {
        statusCode: 200,
        response: { event },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── PATCH /:id ──────────────────────────────────────────────────────

  /**
   * PATCH /api/cal/events/:id
   * Update an event. Supports recurrence modification modes.
   *
   * @requirements 4.3, 4.9
   */
  private async handleUpdateEvent(
    req: Parameters<
      ApiRequestHandler<IUpdateEventResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IUpdateEventResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.eventService) {
        return this.serviceUnavailable();
      }

      const { id } = (req as unknown as { params: { id: string } }).params;
      if (!id) {
        return validationError(translate(BrightCalStrings.Error_MissingId));
      }

      const body = (req as unknown as { body: IUpdateEventBody }).body;

      // Validate optional fields if provided
      if (body.summary !== undefined) {
        if (typeof body.summary !== 'string' || !body.summary.trim()) {
          return validationError(
            translate(BrightCalStrings.Error_EmptySummary),
          );
        }
      }
      if (body.dtstart !== undefined && !isValidISODate(body.dtstart)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'dtstart',
          }),
        );
      }
      if (body.dtend !== undefined && !isValidISODate(body.dtend)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'dtend',
          }),
        );
      }
      if (
        body.visibility !== undefined &&
        !VALID_VISIBILITY.includes(body.visibility as EventVisibility)
      ) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidVisibility, {
            values: VALID_VISIBILITY.join(', '),
          }),
        );
      }
      if (
        body.transparency !== undefined &&
        !VALID_TRANSPARENCY.includes(body.transparency as EventTransparency)
      ) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidTransparency, {
            values: VALID_TRANSPARENCY.join(', '),
          }),
        );
      }

      // Determine modification mode (default: 'all')
      const mode: RecurrenceModificationMode =
        body.modificationMode &&
        VALID_MODIFICATION_MODES.includes(body.modificationMode)
          ? body.modificationMode
          : 'all';

      // Strip modificationMode from the updates passed to the service
      const { modificationMode: _mode, ...updates } = body;

      const event = await this.eventService.updateEvent(
        id,
        userId,
        updates,
        mode,
      );

      if (!event) {
        return notFoundError('Event', id);
      }

      return {
        statusCode: 200,
        response: { event },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return forbiddenError(
          translate(BrightCalStrings.Error_Forbidden_EventUpdate),
        );
      }
      return handleError(error);
    }
  }

  // ─── DELETE /:id ─────────────────────────────────────────────────────

  /**
   * DELETE /api/cal/events/:id
   * Delete an event. Supports recurrence deletion modes via query param.
   *
   * @requirements 4.4
   */
  private async handleDeleteEvent(
    req: Parameters<
      ApiRequestHandler<IDeleteEventResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IDeleteEventResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.eventService) {
        return this.serviceUnavailable();
      }

      const { id } = (req as unknown as { params: { id: string } }).params;
      if (!id) {
        return validationError(translate(BrightCalStrings.Error_MissingId));
      }

      const query = (req as unknown as { query: { mode?: string } }).query;

      // Determine deletion mode (default: 'all')
      const mode: RecurrenceModificationMode =
        query.mode &&
        VALID_MODIFICATION_MODES.includes(
          query.mode as RecurrenceModificationMode,
        )
          ? (query.mode as RecurrenceModificationMode)
          : 'all';

      const deleted = await this.eventService.deleteEvent(id, userId, mode);
      if (!deleted) {
        return notFoundError('Event', id);
      }

      return {
        statusCode: 200,
        response: { success: true },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return forbiddenError(
          translate(BrightCalStrings.Error_Forbidden_EventDelete),
        );
      }
      return handleError(error);
    }
  }
}
