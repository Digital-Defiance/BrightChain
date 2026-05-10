/**
 * ExportImportController
 *
 * REST API controller for calendar data export (ICS, JSON) and ICS import
 * with duplicate detection. Extends BaseController with OpenAPI metadata.
 *
 * Endpoints:
 *   GET  /api/cal/export/:calendarId/ics    — Export calendar as .ics
 *   GET  /api/cal/export/:calendarId/json   — Export calendar as JSON
 *   POST /api/cal/export/:calendarId/import — Import .ics file
 *
 * @see Requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */

import { BrightCalStrings, translate } from '@brightchain/brightcal-lib';
import {
  BaseController,
  type IBrightChainApplication,
  forbiddenError,
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
  IExportImportService,
  IImportResult,
} from '../services/exportImportService.js';

// ─── Response interfaces ─────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface IExportIcsResponse {
  icsData: string;
  [key: string]: any;
}

export interface IExportJsonResponse {
  events: ITypedCalendarEvent[];
  [key: string]: any;
}

export interface IImportIcsResponse {
  result: IImportResult;
  [key: string]: any;
}

type ExportImportApiResponse =
  | IExportIcsResponse
  | IExportJsonResponse
  | IImportIcsResponse
  | ApiErrorResponse;

// ─── Request body interfaces ─────────────────────────────────────────────────

export interface IImportIcsBody {
  icsData: string;
  duplicateMode: 'skip' | 'overwrite' | 'create-new';
}

// ─── Handler types ───────────────────────────────────────────────────────────

interface ExportImportHandlers extends TypedHandlers {
  exportIcs: ApiRequestHandler<IExportIcsResponse | ApiErrorResponse>;
  exportJson: ApiRequestHandler<IExportJsonResponse | ApiErrorResponse>;
  importIcs: ApiRequestHandler<IImportIcsResponse | ApiErrorResponse>;
}

// ─── Controller ──────────────────────────────────────────────────────────────

/**
 * Controller for calendar data export and import operations.
 *
 * Provides REST API endpoints for exporting calendars as ICS or JSON,
 * and importing ICS data with duplicate detection. All endpoints require
 * authentication.
 *
 * @requirements 16.1, 16.2, 16.3, 16.4, 16.5
 */
export class ExportImportController<
  TID extends PlatformID = Buffer,
> extends BaseController<
  TID,
  ExportImportApiResponse,
  ExportImportHandlers,
  CoreLanguageCode
> {
  private exportImportService: IExportImportService | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Inject the ExportImportService after construction.
   * Called during application initialization when the service is available.
   * @requirements 16.1, 16.2, 16.3, 16.4, 16.5
   */
  public setExportImportService(service: IExportImportService): void {
    this.exportImportService = service;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/:calendarId/ics', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'exportIcs',
        openapi: {
          summary: 'Export calendar as ICS',
          description:
            'Export an entire calendar collection as a single iCalendar (.ics) file.',
          tags: ['Export/Import'],
          responses: {
            200: {
              schema: 'ExportIcsResponse',
              description: 'ICS data returned',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Unauthorized',
            },
            403: {
              schema: 'ErrorResponse',
              description: 'Forbidden',
            },
          },
        },
      }),
      routeConfig('get', '/:calendarId/json', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'exportJson',
        openapi: {
          summary: 'Export calendar as JSON',
          description:
            'Export an entire calendar collection as a JSON array of events.',
          tags: ['Export/Import'],
          responses: {
            200: {
              schema: 'ExportJsonResponse',
              description: 'JSON events returned',
            },
            401: {
              schema: 'ErrorResponse',
              description: 'Unauthorized',
            },
            403: {
              schema: 'ErrorResponse',
              description: 'Forbidden',
            },
          },
        },
      }),
      routeConfig('post', '/:calendarId/import', {
        useAuthentication: true,
        useCryptoAuthentication: false,
        handlerKey: 'importIcs',
        openapi: {
          summary: 'Import ICS file',
          description:
            'Import events from an iCalendar (.ics) file into a calendar with duplicate detection by UID.',
          tags: ['Export/Import'],
          requestBody: {
            schema: 'ImportIcsRequest',
            example: {
              icsData: 'BEGIN:VCALENDAR...',
              duplicateMode: 'skip',
            },
          },
          responses: {
            200: {
              schema: 'ImportIcsResponse',
              description: 'Import result',
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
              description: 'Forbidden',
            },
          },
        },
      }),
    ];

    // Register with OpenAPI registry
    ControllerRegistry.register(
      '/cal/export',
      'ExportImportController',
      this.routeDefinitions,
    );

    this.handlers = {
      exportIcs: this.handleExportIcs.bind(this),
      exportJson: this.handleExportJson.bind(this),
      importIcs: this.handleImportIcs.bind(this),
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
   * Return a 503 response when the service is not available.
   */
  private serviceUnavailable(): IStatusCodeResponse<ApiErrorResponse> {
    return {
      statusCode: 503,
      response: {
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: translate(
            BrightCalStrings.Error_ServiceUnavailable_ExportImport,
          ),
        },
      } as ApiErrorResponse,
    };
  }

  // ─── GET /:calendarId/ics ────────────────────────────────────────────

  /**
   * GET /api/cal/export/:calendarId/ics
   * Export calendar as ICS.
   *
   * @requirements 16.1, 16.5
   */
  private async handleExportIcs(
    req: Parameters<
      ApiRequestHandler<IExportIcsResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IExportIcsResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.exportImportService) {
        return this.serviceUnavailable();
      }

      const { calendarId } = (
        req as unknown as { params: { calendarId: string } }
      ).params;
      if (!calendarId) {
        return validationError(
          translate(BrightCalStrings.Error_MissingCalendarIdParam),
        );
      }

      const icsData = await this.exportImportService.exportAsIcs(
        userId,
        calendarId,
      );

      return {
        statusCode: 200,
        response: { icsData },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return forbiddenError(
          translate(BrightCalStrings.Error_Forbidden_Export),
        );
      }
      return handleError(error);
    }
  }

  // ─── GET /:calendarId/json ───────────────────────────────────────────

  /**
   * GET /api/cal/export/:calendarId/json
   * Export calendar as JSON.
   *
   * @requirements 16.4
   */
  private async handleExportJson(
    req: Parameters<
      ApiRequestHandler<IExportJsonResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IExportJsonResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.exportImportService) {
        return this.serviceUnavailable();
      }

      const { calendarId } = (
        req as unknown as { params: { calendarId: string } }
      ).params;
      if (!calendarId) {
        return validationError(
          translate(BrightCalStrings.Error_MissingCalendarIdParam),
        );
      }

      const events = await this.exportImportService.exportAsJson(
        userId,
        calendarId,
      );

      return {
        statusCode: 200,
        response: { events },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return forbiddenError(
          translate(BrightCalStrings.Error_Forbidden_Export),
        );
      }
      return handleError(error);
    }
  }

  // ─── POST /:calendarId/import ────────────────────────────────────────

  /**
   * POST /api/cal/export/:calendarId/import
   * Import ICS file with duplicate detection.
   *
   * @requirements 16.2, 16.3
   */
  private async handleImportIcs(
    req: Parameters<
      ApiRequestHandler<IImportIcsResponse | ApiErrorResponse>
    >[0],
  ): Promise<IStatusCodeResponse<IImportIcsResponse | ApiErrorResponse>> {
    try {
      const userId = this.getUserId(req);
      if (!userId) {
        return unauthorizedError();
      }

      if (!this.exportImportService) {
        return this.serviceUnavailable();
      }

      const { calendarId } = (
        req as unknown as { params: { calendarId: string } }
      ).params;
      if (!calendarId) {
        return validationError(
          translate(BrightCalStrings.Error_MissingCalendarIdParam),
        );
      }

      const body = (req as unknown as { body: IImportIcsBody }).body;

      if (!body.icsData || typeof body.icsData !== 'string') {
        return validationError(
          translate(BrightCalStrings.Error_MissingIcsData),
        );
      }

      const validModes = ['skip', 'overwrite', 'create-new'];
      if (!body.duplicateMode || !validModes.includes(body.duplicateMode)) {
        return validationError(
          translate(BrightCalStrings.Error_InvalidDuplicateMode),
        );
      }

      const result = await this.exportImportService.importIcs(
        userId,
        calendarId,
        body.icsData,
        body.duplicateMode,
      );

      return {
        statusCode: 200,
        response: { result },
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'FORBIDDEN') {
        return forbiddenError(
          translate(BrightCalStrings.Error_Forbidden_Import),
        );
      }
      return handleError(error);
    }
  }
}
