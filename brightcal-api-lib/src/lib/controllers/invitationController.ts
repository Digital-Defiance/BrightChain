/**
 * InvitationController
 *
 * REST API controller for event invitation operations: RSVP, counter proposals,
 * and declining counter proposals (iTIP COUNTER / DECLINECOUNTER).
 * Extends BaseController with OpenAPI metadata and delegates to the service layer.
 *
 * Endpoints:
 *   POST /api/cal/invitations/rsvp             — RSVP to an event invitation
 *   POST /api/cal/invitations/counter          — Propose a new time (iTIP COUNTER)
 *   POST /api/cal/invitations/decline-counter  — Decline a counter proposal (iTIP DECLINECOUNTER)
 *
 * @see Requirements 10.1, 10.2, 10.3, 10.4
 */

import {
  BrightCalStrings,
  ParticipationStatus,
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
import type { ITypedCalendarEvent } from '../models/calendarEvent.model.js';

// ─── Response interfaces ─────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IRsvpResponse {
  success: boolean;
  event: ITypedCalendarEvent;
  [key: string]: any;
}

export interface ICounterResponse {
  success: boolean;
  [key: string]: any;
}

export interface IDeclineCounterResponse {
  success: boolean;
  [key: string]: any;
}

type InvitationApiResponse =
  | IRsvpResponse
  | ICounterResponse
  | IDeclineCounterResponse
  | ApiErrorResponse;

// ─── Request body interfaces ─────────────────────────────────────────────────

export interface IRsvpBody {
  eventId: string;
  response: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE';
}

export interface ICounterBody {
  eventId: string;
  proposedStart: string;
  proposedEnd: string;
  comment?: string;
}

export interface IDeclineCounterBody {
  eventId: string;
  counterProposalId: string;
}

// ─── Handler types ───────────────────────────────────────────────────────────

interface InvitationHandlers extends TypedHandlers {
  rsvp: ApiRequestHandler<IRsvpResponse | ApiErrorResponse>;
  counter: ApiRequestHandler<ICounterResponse | ApiErrorResponse>;
  declineCounter: ApiRequestHandler<IDeclineCounterResponse | ApiErrorResponse>;
}

// ─── Service interface ───────────────────────────────────────────────────────

/**
 * Interface for the invitation service that this controller delegates to.
 * The actual implementation will be injected after construction.
 */
export interface IInvitationService {
  rsvp(
    userId: string,
    eventId: string,
    response: ParticipationStatus,
  ): Promise<ITypedCalendarEvent>;

  counter(
    userId: string,
    eventId: string,
    proposedStart: string,
    proposedEnd: string,
    comment?: string,
  ): Promise<void>;

  declineCounter(
    userId: string,
    eventId: string,
    counterProposalId: string,
  ): Promise<void>;
}

// ─── Validation helpers ──────────────────────────────────────────────────────

const VALID_RSVP_RESPONSES = ['ACCEPTED', 'DECLINED', 'TENTATIVE'] as const;

/**
 * Loose ISO 8601 date/datetime check.
 */
function isValidISODate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime());
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * Controller for event invitation operations.
 *
 * Provides REST API endpoints for responding to event invitations (RSVP),
 * proposing alternative times (iTIP COUNTER), and declining counter proposals
 * (iTIP DECLINECOUNTER).
 *
 * All endpoints require authentication.
 *
 * ## Endpoints
 *
 * ### POST /api/cal/invitations/rsvp
 * RSVP to an event invitation.
 *
 * **Request Body:**
 * - `eventId` (string, required): The event to respond to
 * - `response` ('ACCEPTED' | 'DECLINED' | 'TENTATIVE', required): RSVP response
 *
 * **Response:** `{ success: boolean, event: ITypedCalendarEvent }`
 *
 * ### POST /api/cal/invitations/counter
 * Propose a new time for an event (iTIP COUNTER).
 *
 * **Request Body:**
 * - `eventId` (string, required): The event to counter
 * - `proposedStart` (string, required): Proposed start time (ISO 8601)
 * - `proposedEnd` (string, required): Proposed end time (ISO 8601)
 * - `comment` (string, optional): Reason for the counter proposal
 *
 * **Response:** `{ success: boolean }`
 *
 * ### POST /api/cal/invitations/decline-counter
 * Decline a counter proposal (iTIP DECLINECOUNTER).
 *
 * **Request Body:**
 * - `eventId` (string, required): The event the counter was for
 * - `counterProposalId` (string, required): The counter proposal to decline
 *
 * **Response:** `{ success: boolean }`
 *
 * @requirements 10.1, 10.2, 10.3, 10.4
 */
export class InvitationController<
  TID extends PlatformID = Buffer,
> extends BaseController<
  TID,
  InvitationApiResponse,
  InvitationHandlers,
  CoreLanguageCode
> {
  private invitationService: IInvitationService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the InvitationService after construction.
   * Called during application initialization when the service is available.
   * @requirements 10.1, 10.2, 10.3, 10.4
   */
  public setInvitationService(service: IInvitationService): void {
    this.invitationService = service;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/rsvp', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'rsvp',
        openapi: {
          summary: 'RSVP to an event invitation',
          description:
            'Respond to an event invitation with ACCEPTED, DECLINED, or TENTATIVE. Updates the attendee PARTSTAT and sends an iTIP REPLY to the organizer.',
          tags: ['Invitations'],
          requestBody: {
            schema: 'RsvpRequest',
            example: {
              eventId: 'evt-123',
              response: 'ACCEPTED',
            },
          },
          responses: {
            200: {
              schema: 'RsvpResponse',
              description: 'RSVP recorded',
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
      routeConfig('post', '/counter', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'counter',
        openapi: {
          summary: 'Propose a new time (iTIP COUNTER)',
          description:
            'Propose an alternative time for an event. Sends an iTIP COUNTER message to the organizer.',
          tags: ['Invitations'],
          requestBody: {
            schema: 'CounterRequest',
            example: {
              eventId: 'evt-123',
              proposedStart: '2024-01-16T14:00:00Z',
              proposedEnd: '2024-01-16T15:00:00Z',
              comment: 'I have a conflict at the original time',
            },
          },
          responses: {
            200: {
              schema: 'CounterResponse',
              description: 'Counter proposal sent',
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
      routeConfig('post', '/decline-counter', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'declineCounter',
        openapi: {
          summary: 'Decline a counter proposal (iTIP DECLINECOUNTER)',
          description:
            'Decline a counter proposal from an attendee. Sends an iTIP DECLINECOUNTER message to the attendee.',
          tags: ['Invitations'],
          requestBody: {
            schema: 'DeclineCounterRequest',
            example: {
              eventId: 'evt-123',
              counterProposalId: 'counter-456',
            },
          },
          responses: {
            200: {
              schema: 'DeclineCounterResponse',
              description: 'Counter proposal declined',
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
      '/cal/invitations',
      'InvitationController',
      this.routeDefinitions,
    );

    this.handlers = {
      rsvp: this.handleRsvp.bind(this),
      counter: this.handleCounter.bind(this),
      declineCounter: this.handleDeclineCounter.bind(this),
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
   * Return a 503 response when the invitation service is not available.
   */
  private serviceUnavailable(): IStatusCodeResponse<ApiErrorResponse> {
    return {
      statusCode: 503,
      response: {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: translate(
            BrightCalStrings.Error_ServiceUnavailable_Invitation,
          ),
        },
      } as ApiErrorResponse,
    };
  }

  // ─── POST /rsvp ──────────────────────────────────────────────────────

  /**
   * POST /api/cal/invitations/rsvp
   * RSVP to an event invitation.
   *
   * @requirements 10.1, 10.2
   */
  private async handleRsvp(
    req: Parameters<ApiRequestHandler<IRsvpResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<IRsvpResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.invitationService) {
        return this.serviceUnavailable();
      }

      const body = (req as unknown as { body: IRsvpBody }).body;

      // Validate required fields
      if (!body.eventId || typeof body.eventId !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingEventId),
        );
      }
      if (
        !body.response ||
        typeof body.response !== 'string' ||
        !VALID_RSVP_RESPONSES.includes(
          body.response as (typeof VALID_RSVP_RESPONSES)[number],
        )
      ) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidRsvpResponse),
        );
      }

      // Map the string response to the ParticipationStatus enum
      const partstat = body.response as ParticipationStatus;

      const event = await this.invitationService.rsvp(
        userId,
        body.eventId,
        partstat,
      );

      return {
        statusCode: 200,
        response: { success: true, event },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── POST /counter ─────────────────────────────────────────────────

  /**
   * POST /api/cal/invitations/counter
   * Propose a new time for an event (iTIP COUNTER).
   *
   * @requirements 10.4
   */
  private async handleCounter(
    req: Parameters<ApiRequestHandler<ICounterResponse | ApiErrorResponse>>[0],
  ): Promise<IStatusCodeResponse<ICounterResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.invitationService) {
        return this.serviceUnavailable();
      }

      const body = (req as unknown as { body: ICounterBody }).body;

      // Validate required fields
      if (!body.eventId || typeof body.eventId !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingEventId),
        );
      }
      if (!body.proposedStart || typeof body.proposedStart !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingProposedStart),
        );
      }
      if (!isValidISODate(body.proposedStart)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'proposedStart',
          }),
        );
      }
      if (!body.proposedEnd || typeof body.proposedEnd !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingProposedEnd),
        );
      }
      if (!isValidISODate(body.proposedEnd)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'proposedEnd',
          }),
        );
      }
      if (new Date(body.proposedEnd) <= new Date(body.proposedStart)) {
        return validationError(
          translate(BrightCalStrings.Error_EndBeforeStart),
        );
      }
      if (body.comment !== undefined && typeof body.comment !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_InvalidComment),
        );
      }

      await this.invitationService.counter(
        userId,
        body.eventId,
        body.proposedStart,
        body.proposedEnd,
        body.comment,
      );

      return {
        statusCode: 200,
        response: { success: true },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── POST /decline-counter ─────────────────────────────────────────

  /**
   * POST /api/cal/invitations/decline-counter
   * Decline a counter proposal (iTIP DECLINECOUNTER).
   *
   * @requirements 10.4
   */
  private async handleDeclineCounter(
    req: Parameters<
      ApiRequestHandler<IDeclineCounterResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IDeclineCounterResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.invitationService) {
        return this.serviceUnavailable();
      }

      const body = (req as unknown as { body: IDeclineCounterBody }).body;

      // Validate required fields
      if (!body.eventId || typeof body.eventId !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingEventId),
        );
      }
      if (
        !body.counterProposalId ||
        typeof body.counterProposalId !== 'string'
      ) {
        return validationError(
          translate(BrightCalStrings.Error_MissingCounterProposalId),
        );
      }

      await this.invitationService.declineCounter(
        userId,
        body.eventId,
        body.counterProposalId,
      );

      return {
        statusCode: 200,
        response: { success: true },
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
