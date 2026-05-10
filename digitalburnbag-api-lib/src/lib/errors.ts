import {
  DigitalBurnbagStrings,
  getDigitalBurnbagTranslation,
} from '@brightchain/digitalburnbag-lib';

/**
 * Base error class for API-level errors with HTTP status codes.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnauthorizedError extends ApiError {
  constructor(
    message = getDigitalBurnbagTranslation(
      DigitalBurnbagStrings.Api_Error_AuthenticationRequired,
    ),
  ) {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends ApiError {
  constructor(
    message = getDigitalBurnbagTranslation(
      DigitalBurnbagStrings.Api_Error_InsufficientPermissions,
    ),
  ) {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends ApiError {
  public readonly code = 'NOT_FOUND';
  constructor(resource: string, id?: string) {
    super(
      id
        ? getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_ResourceWithIdNotFound,
            { resource, id },
          )
        : getDigitalBurnbagTranslation(
            DigitalBurnbagStrings.Api_Error_ResourceNotFound,
            { resource },
          ),
      404,
    );
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends ApiError {
  public readonly code: string;
  constructor(code: string) {
    super(code, 409);
    this.name = 'ConflictError';
    this.code = code;
  }
}

export class GoneError extends ApiError {
  public readonly code: string;
  constructor(code: string) {
    super(code, 410);
    this.name = 'GoneError';
    this.code = code;
  }
}
