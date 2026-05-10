/**
 * BookingController
 *
 * REST API controller for booking page operations: create booking pages,
 * retrieve public booking pages, query available slots, and book appointments.
 * Extends BaseController with OpenAPI metadata and delegates to the service layer.
 *
 * Endpoints:
 *   POST /api/cal/booking/pages              — Create a booking page (auth required)
 *   GET  /api/cal/booking/pages/:slug        — Get booking page (public)
 *   GET  /api/cal/booking/pages/:slug/slots  — Get available slots (public)
 *   POST /api/cal/booking/pages/:slug/book   — Book an appointment (public)
 *
 * @see Requirements 9.1, 9.3, 9.5, 9.9
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
import type { ITypedBookingAppointment } from '../models/bookingAppointment.model.js';
import type { ITypedBookingPage } from '../models/bookingPage.model.js';
import type {
  IAvailableSlot,
  IBookAppointmentBody,
  ICreateBookingPageBody,
} from '../services/bookingEngineService.js';

// ─── Response interfaces ─────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface ICreateBookingPageResponse {
  page: ITypedBookingPage;
  [key: string]: any;
}

export interface IGetBookingPageResponse {
  page: ITypedBookingPage;
  [key: string]: any;
}

export interface IGetAvailableSlotsResponse {
  slots: IAvailableSlot[];
  [key: string]: any;
}

export interface IBookAppointmentResponse {
  appointment: ITypedBookingAppointment;
  [key: string]: any;
}

type BookingApiResponse =
  | ICreateBookingPageResponse
  | IGetBookingPageResponse
  | IGetAvailableSlotsResponse
  | IBookAppointmentResponse
  | ApiErrorResponse;

// ─── Handler types ───────────────────────────────────────────────────────────

interface BookingHandlers extends TypedHandlers {
  createPage: ApiRequestHandler<ICreateBookingPageResponse | ApiErrorResponse>;
  getPage: ApiRequestHandler<IGetBookingPageResponse | ApiErrorResponse>;
  getSlots: ApiRequestHandler<IGetAvailableSlotsResponse | ApiErrorResponse>;
  bookAppointment: ApiRequestHandler<
    IBookAppointmentResponse | ApiErrorResponse
  >;
}

// ─── Service interface ───────────────────────────────────────────────────────

/**
 * Interface for the booking service that this controller delegates to.
 * The actual implementation will be injected after construction.
 */
export interface IBookingService {
  createBookingPage(
    userId: string,
    config: ICreateBookingPageBody,
  ): Promise<ITypedBookingPage>;

  getBookingPage(slug: string): Promise<ITypedBookingPage | null>;

  getAvailableSlots(
    slug: string,
    date: string,
    appointmentType: string,
  ): Promise<IAvailableSlot[]>;

  bookAppointment(
    slug: string,
    booking: IBookAppointmentBody,
  ): Promise<ITypedBookingAppointment>;
}

// ─── Validation helpers ──────────────────────────────────────────────────────

function isValidISODate(value: string): boolean {
  const d = new Date(value);
  return !isNaN(d.getTime());
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * Controller for booking page operations.
 *
 * Provides REST API endpoints for creating booking pages (authenticated),
 * retrieving public booking pages, querying available slots, and booking
 * appointments. Public endpoints do not require authentication.
 *
 * @requirements 9.1, 9.3, 9.5, 9.9
 */
export class BookingController<
  TID extends PlatformID = Buffer,
> extends BaseController<
  TID,
  BookingApiResponse,
  BookingHandlers,
  CoreLanguageCode
> {
  private bookingService: IBookingService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the BookingEngineService after construction.
   * @requirements 9.1, 9.3, 9.5, 9.9
   */
  public setBookingService(service: IBookingService): void {
    this.bookingService = service;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/pages', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'createPage',
        openapi: {
          summary: 'Create a booking page',
          description:
            'Create a new booking page with appointment types and availability configuration. Requires authentication.',
          tags: ['Booking'],
          requestBody: {
            schema: 'CreateBookingPageRequest',
            example: {
              slug: 'john-doe-consulting',
              title: 'Book a consultation',
              appointmentTypes: [
                {
                  name: '30-min consultation',
                  durationMinutes: 30,
                  bufferMinutes: 10,
                  availableWindows: [
                    { dayOfWeek: 1, startTime: '09:00', endTime: '17:00' },
                  ],
                  questions: [],
                },
              ],
            },
          },
          responses: {
            201: {
              schema: 'CreateBookingPageResponse',
              description: 'Booking page created',
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
      routeConfig('get', '/pages/:slug', {
        useAuthentication: false,
        useCryptoAuthentication: false,
        handlerKey: 'getPage',
        openapi: {
          summary: 'Get a booking page',
          description:
            'Retrieve a public booking page by its slug. No authentication required.',
          tags: ['Booking'],
          responses: {
            200: {
              schema: 'GetBookingPageResponse',
              description: 'Booking page retrieved',
            },
            404: {
              schema: 'ErrorResponse',
              description: 'Booking page not found',
            },
          },
        },
      }),
      routeConfig('get', '/pages/:slug/slots', {
        useAuthentication: false,
        useCryptoAuthentication: false,
        handlerKey: 'getSlots',
        openapi: {
          summary: 'Get available booking slots',
          description:
            'Query available time slots for a booking page on a specific date. No authentication required.',
          tags: ['Booking'],
          responses: {
            200: {
              schema: 'GetAvailableSlotsResponse',
              description: 'Available slots retrieved',
            },
            400: {
              schema: 'ErrorResponse',
              description: 'Validation error',
            },
            404: {
              schema: 'ErrorResponse',
              description: 'Booking page not found',
            },
          },
        },
      }),
      routeConfig('post', '/pages/:slug/book', {
        useAuthentication: false,
        useCryptoAuthentication: false,
        handlerKey: 'bookAppointment',
        openapi: {
          summary: 'Book an appointment',
          description:
            'Book an appointment on a booking page. No authentication required — only booker name and email.',
          tags: ['Booking'],
          requestBody: {
            schema: 'BookAppointmentRequest',
            example: {
              appointmentType: '30-min consultation',
              startTime: '2024-06-15T10:00:00Z',
              bookerName: 'Jane Smith',
              bookerEmail: 'jane@example.com',
            },
          },
          responses: {
            201: {
              schema: 'BookAppointmentResponse',
              description: 'Appointment booked',
            },
            400: {
              schema: 'ErrorResponse',
              description: 'Validation error',
            },
            409: {
              schema: 'ErrorResponse',
              description: 'Slot no longer available',
            },
          },
        },
      }),
    ];

    // Register with OpenAPI registry
    ControllerRegistry.register(
      '/cal/booking',
      'BookingController',
      this.routeDefinitions,
    );

    this.handlers = {
      createPage: this.handleCreatePage.bind(this),
      getPage: this.handleGetPage.bind(this),
      getSlots: this.handleGetSlots.bind(this),
      bookAppointment: this.handleBookAppointment.bind(this),
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
   * Return a 503 response when the booking service is not available.
   */
  private serviceUnavailable(): IStatusCodeResponse<ApiErrorResponse> {
    return {
      statusCode: 503,
      response: {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: translate(BrightCalStrings.Error_ServiceUnavailable_Booking),
        },
      } as ApiErrorResponse,
    };
  }

  // ─── POST /pages ─────────────────────────────────────────────────────

  /**
   * POST /api/cal/booking/pages
   * Create a new booking page. Requires authentication.
   *
   * @requirements 9.1
   */
  private async handleCreatePage(
    req: Parameters<
      ApiRequestHandler<ICreateBookingPageResponse | ApiErrorResponse>
    >[0],
  ): Promise<
    IStatusCodeResponse<ICreateBookingPageResponse | ApiErrorResponse>
  > {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.bookingService) {
        return this.serviceUnavailable();
      }

      const body = (req as unknown as { body: ICreateBookingPageBody }).body;

      // Validate required fields
      if (!body.slug || typeof body.slug !== 'string' || !body.slug.trim()) {
        return validationError(translate(BrightCalStrings.Error_MissingSlug));
      }
      if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
        return validationError(translate(BrightCalStrings.Error_MissingTitle));
      }
      if (
        !Array.isArray(body.appointmentTypes) ||
        body.appointmentTypes.length === 0
      ) {
        return validationError(
          translate(BrightCalStrings.Error_EmptyAppointmentTypes),
        );
      }

      const page = await this.bookingService.createBookingPage(userId, body);

      return {
        statusCode: 201,
        response: { page },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── GET /pages/:slug ────────────────────────────────────────────────

  /**
   * GET /api/cal/booking/pages/:slug
   * Get a public booking page. No authentication required.
   *
   * @requirements 9.9
   */
  private async handleGetPage(
    req: Parameters<
      ApiRequestHandler<IGetBookingPageResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IGetBookingPageResponse | ApiErrorResponse>> {
    try {
      if (!this.bookingService) {
        return this.serviceUnavailable();
      }

      const slug = (req as unknown as { params: { slug: string } }).params.slug;

      if (!slug) {
        return validationError(translate(BrightCalStrings.Error_MissingSlug));
      }

      const page = await this.bookingService.getBookingPage(slug);
      if (!page) {
        return {
          statusCode: 404,
          response: {
            error: {
              code: 'NOT_FOUND',
              message: translate(BrightCalStrings.Error_NotFound_BookingPage),
            },
          } as ApiErrorResponse,
        };
      }

      return {
        statusCode: 200,
        response: { page },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── GET /pages/:slug/slots ──────────────────────────────────────────

  /**
   * GET /api/cal/booking/pages/:slug/slots?date=YYYY-MM-DD&appointmentType=...
   * Get available booking slots. No authentication required.
   *
   * @requirements 9.2, 9.5
   */
  private async handleGetSlots(
    req: Parameters<
      ApiRequestHandler<IGetAvailableSlotsResponse | ApiErrorResponse>
    >[0],
  ): Promise<
    IStatusCodeResponse<IGetAvailableSlotsResponse | ApiErrorResponse>
  > {
    try {
      if (!this.bookingService) {
        return this.serviceUnavailable();
      }

      const slug = (req as unknown as { params: { slug: string } }).params.slug;
      const query = (
        req as unknown as {
          query: { date?: string; appointmentType?: string };
        }
      ).query;

      if (!slug) {
        return validationError(translate(BrightCalStrings.Error_MissingSlug));
      }
      if (!query.date || typeof query.date !== 'string') {
        return validationError(translate(BrightCalStrings.Error_MissingDate));
      }
      if (!query.appointmentType || typeof query.appointmentType !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingAppointmentType),
        );
      }

      const slots = await this.bookingService.getAvailableSlots(
        slug,
        query.date,
        query.appointmentType,
      );

      return {
        statusCode: 200,
        response: { slots },
      };
    } catch (error) {
      return handleError(error);
    }
  }

  // ─── POST /pages/:slug/book ──────────────────────────────────────────

  /**
   * POST /api/cal/booking/pages/:slug/book
   * Book an appointment. No authentication required.
   *
   * @requirements 9.3, 9.5, 9.9
   */
  private async handleBookAppointment(
    req: Parameters<
      ApiRequestHandler<IBookAppointmentResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IBookAppointmentResponse | ApiErrorResponse>> {
    try {
      if (!this.bookingService) {
        return this.serviceUnavailable();
      }

      const slug = (req as unknown as { params: { slug: string } }).params.slug;
      const body = (req as unknown as { body: IBookAppointmentBody }).body;

      if (!slug) {
        return validationError(translate(BrightCalStrings.Error_MissingSlug));
      }
      if (!body.appointmentType || typeof body.appointmentType !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingAppointmentType),
        );
      }
      if (!body.startTime || typeof body.startTime !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingStartTime),
        );
      }
      if (!isValidISODate(body.startTime)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidISODate_Template, {
            field: 'startTime',
          }),
        );
      }
      if (
        !body.bookerName ||
        typeof body.bookerName !== 'string' ||
        !body.bookerName.trim()
      ) {
        return validationError(
          translate(BrightCalStrings.Error_MissingBookerName),
        );
      }
      if (
        !body.bookerEmail ||
        typeof body.bookerEmail !== 'string' ||
        !body.bookerEmail.trim()
      ) {
        return validationError(
          translate(BrightCalStrings.Error_MissingBookerEmail),
        );
      }

      const appointment = await this.bookingService.bookAppointment(slug, body);

      return {
        statusCode: 201,
        response: { appointment },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'SLOT_UNAVAILABLE') {
        return {
          statusCode: 409,
          response: {
            error: {
              code: 'SLOT_UNAVAILABLE',
              message: translate(BrightCalStrings.Error_SlotUnavailable),
            },
          } as ApiErrorResponse,
        };
      }
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return {
          statusCode: 404,
          response: {
            error: {
              code: 'NOT_FOUND',
              message: translate(
                BrightCalStrings.Error_NotFound_AppointmentType,
              ),
            },
          } as ApiErrorResponse,
        };
      }
      return handleError(error);
    }
  }
}
