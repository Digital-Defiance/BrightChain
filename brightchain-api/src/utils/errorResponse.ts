/* eslint-disable @nx/enforce-module-boundaries */
import {
  QuorumError,
  QuorumErrorType,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { ApiErrorResponse } from '@digitaldefiance/node-express-suite';

/**
 * Unified error codes for all API operations.
 * These codes provide consistent error identification across all endpoints.
 */
export enum ErrorCode {
  // Block errors
  BLOCK_NOT_FOUND = 'BLOCK_NOT_FOUND',
  BLOCK_VALIDATION_FAILED = 'BLOCK_VALIDATION_FAILED',
  BLOCK_SIZE_MISMATCH = 'BLOCK_SIZE_MISMATCH',
  INSUFFICIENT_RANDOM_BLOCKS = 'INSUFFICIENT_RANDOM_BLOCKS',
  BLOCK_ALREADY_EXISTS = 'BLOCK_ALREADY_EXISTS',
  METADATA_CORRUPTED = 'METADATA_CORRUPTED',

  // Quorum errors
  MEMBER_NOT_FOUND = 'MEMBER_NOT_FOUND',
  DOCUMENT_NOT_FOUND = 'DOCUMENT_NOT_FOUND',
  INSUFFICIENT_SHARES = 'INSUFFICIENT_SHARES',
  SHARE_DECRYPTION_FAILED = 'SHARE_DECRYPTION_FAILED',
  INVALID_MEMBER_COUNT = 'INVALID_MEMBER_COUNT',
  INVALID_THRESHOLD = 'INVALID_THRESHOLD',

  // CBL errors
  CBL_NOT_FOUND = 'CBL_NOT_FOUND',
  INVALID_CBL_SIGNATURE = 'INVALID_CBL_SIGNATURE',
  INVALID_BLOCK_ADDRESSES = 'INVALID_BLOCK_ADDRESSES',
  MISSING_BLOCKS = 'MISSING_BLOCKS',

  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

/**
 * Standard error response structure for all API endpoints.
 * Follows the format specified in the design document.
 */
export interface StandardErrorResponse {
  error: {
    code: ErrorCode | string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Result of mapping an error to an API response
 */
export interface ErrorMappingResult {
  statusCode: number;
  code: ErrorCode | string;
  message: string;
  details?: Record<string, unknown>;
}

/**
 * Create a standardized error response object.
 *
 * @param code - The error code identifying the type of error
 * @param message - Human-readable error message
 * @param details - Optional additional context about the error
 * @returns A properly formatted ApiErrorResponse
 */
export function createErrorResponse(
  code: ErrorCode | string,
  message: string,
  details?: Record<string, unknown>,
): ApiErrorResponse {
  const response: StandardErrorResponse = {
    error: {
      code,
      message,
    },
  };

  if (details) {
    response.error.details = details;
  }

  return response as ApiErrorResponse;
}

/**
 * Create a standardized API response with status code.
 *
 * @param statusCode - HTTP status code
 * @param code - The error code identifying the type of error
 * @param message - Human-readable error message
 * @param details - Optional additional context about the error
 * @returns Object with statusCode and response
 */
export function createApiErrorResult(
  statusCode: number,
  code: ErrorCode | string,
  message: string,
  details?: Record<string, unknown>,
): { statusCode: number; response: ApiErrorResponse } {
  return {
    statusCode,
    response: createErrorResponse(code, message, details),
  };
}

/**
 * Create a validation error response (400).
 *
 * @param message - Description of the validation failure
 * @param details - Optional details about invalid fields
 * @returns Formatted validation error response
 */
export function validationError(
  message: string,
  details?: Record<string, unknown>,
): { statusCode: number; response: ApiErrorResponse } {
  return createApiErrorResult(
    400,
    ErrorCode.VALIDATION_ERROR,
    message,
    details,
  );
}

/**
 * Create an unauthorized error response (401).
 *
 * @param message - Description of the authentication failure
 * @returns Formatted unauthorized error response
 */
export function unauthorizedError(
  message: string = 'Invalid or missing authentication token',
): { statusCode: number; response: ApiErrorResponse } {
  return createApiErrorResult(401, ErrorCode.UNAUTHORIZED, message);
}

/**
 * Create a forbidden error response (403).
 *
 * @param message - Description of the authorization failure
 * @returns Formatted forbidden error response
 */
export function forbiddenError(
  message: string = 'You do not have permission to perform this action',
): { statusCode: number; response: ApiErrorResponse } {
  return createApiErrorResult(403, ErrorCode.FORBIDDEN, message);
}

/**
 * Create a not found error response (404).
 *
 * @param resourceType - Type of resource that was not found
 * @param resourceId - ID of the resource that was not found
 * @returns Formatted not found error response
 */
export function notFoundError(
  resourceType: string,
  resourceId: string,
): { statusCode: number; response: ApiErrorResponse } {
  const code = getNotFoundErrorCode(resourceType);
  return createApiErrorResult(
    404,
    code,
    `${resourceType} with ID ${resourceId} not found`,
    { resourceType, resourceId },
  );
}

/**
 * Create an internal error response (500).
 *
 * @param error - The original error (message will be extracted)
 * @returns Formatted internal error response
 */
export function internalError(error: Error | string): {
  statusCode: number;
  response: ApiErrorResponse;
} {
  const message = error instanceof Error ? error.message : error;
  return createApiErrorResult(500, ErrorCode.INTERNAL_ERROR, message);
}

/**
 * Create a not implemented error response (501).
 *
 * @param message - Description of what is not implemented
 * @returns Formatted not implemented error response
 */
export function notImplementedError(message: string): {
  statusCode: number;
  response: ApiErrorResponse;
} {
  return createApiErrorResult(501, ErrorCode.NOT_IMPLEMENTED, message);
}

/**
 * Get the appropriate not found error code based on resource type.
 */
function getNotFoundErrorCode(resourceType: string): ErrorCode {
  const resourceTypeLower = resourceType.toLowerCase();
  if (resourceTypeLower === 'block') {
    return ErrorCode.BLOCK_NOT_FOUND;
  }
  if (resourceTypeLower === 'member') {
    return ErrorCode.MEMBER_NOT_FOUND;
  }
  if (resourceTypeLower === 'document') {
    return ErrorCode.DOCUMENT_NOT_FOUND;
  }
  if (resourceTypeLower === 'cbl') {
    return ErrorCode.CBL_NOT_FOUND;
  }
  return ErrorCode.INTERNAL_ERROR;
}

/**
 * Map a StoreError to an appropriate API error response.
 *
 * @param error - The StoreError to map
 * @returns Object with statusCode and response
 */
export function mapStoreError(error: StoreError): {
  statusCode: number;
  response: ApiErrorResponse;
} {
  const mapping = mapStoreErrorToResult(error);
  return createApiErrorResult(
    mapping.statusCode,
    mapping.code,
    mapping.message,
    mapping.details,
  );
}

/**
 * Map a StoreError to error mapping result.
 */
function mapStoreErrorToResult(error: StoreError): ErrorMappingResult {
  switch (error.type) {
    case StoreErrorType.KeyNotFound:
      return {
        statusCode: 404,
        code: ErrorCode.BLOCK_NOT_FOUND,
        message: error.message,
      };
    case StoreErrorType.BlockSizeMismatch:
    case StoreErrorType.BlockFileSizeMismatch:
      return {
        statusCode: 400,
        code: ErrorCode.BLOCK_SIZE_MISMATCH,
        message: error.message,
      };
    case StoreErrorType.BlockValidationFailed:
      return {
        statusCode: 400,
        code: ErrorCode.BLOCK_VALIDATION_FAILED,
        message: error.message,
      };
    case StoreErrorType.InsufficientRandomBlocks:
      return {
        statusCode: 400,
        code: ErrorCode.INSUFFICIENT_RANDOM_BLOCKS,
        message: error.message,
      };
    case StoreErrorType.BlockAlreadyExists:
    case StoreErrorType.BlockPathAlreadyExists:
      return {
        statusCode: 409,
        code: ErrorCode.BLOCK_ALREADY_EXISTS,
        message: error.message,
      };
    case StoreErrorType.BlockIdMismatch:
      return {
        statusCode: 400,
        code: ErrorCode.VALIDATION_ERROR,
        message: error.message,
      };
    default:
      return {
        statusCode: 500,
        code: ErrorCode.INTERNAL_ERROR,
        message: error.message,
      };
  }
}

/**
 * Map a QuorumError to an appropriate API error response.
 *
 * @param error - The QuorumError to map
 * @returns Object with statusCode and response
 */
export function mapQuorumError(error: QuorumError): {
  statusCode: number;
  response: ApiErrorResponse;
} {
  const mapping = mapQuorumErrorToResult(error);
  return createApiErrorResult(
    mapping.statusCode,
    mapping.code,
    mapping.message,
    mapping.details,
  );
}

/**
 * Map a QuorumError to error mapping result.
 */
function mapQuorumErrorToResult(error: QuorumError): ErrorMappingResult {
  switch (error.type) {
    case QuorumErrorType.MemberNotFound:
      return {
        statusCode: 404,
        code: ErrorCode.MEMBER_NOT_FOUND,
        message: error.message,
      };
    case QuorumErrorType.DocumentNotFound:
      return {
        statusCode: 404,
        code: ErrorCode.DOCUMENT_NOT_FOUND,
        message: error.message,
      };
    case QuorumErrorType.NotEnoughMembers:
      return {
        statusCode: 400,
        code: ErrorCode.INVALID_MEMBER_COUNT,
        message: error.message,
      };
    default:
      return {
        statusCode: 500,
        code: ErrorCode.INTERNAL_ERROR,
        message: error.message,
      };
  }
}

/**
 * Handle any error and return an appropriate API error response.
 * This is a catch-all handler that can be used in catch blocks.
 *
 * @param error - Any error that was thrown
 * @returns Object with statusCode and response
 */
export function handleError(error: unknown): {
  statusCode: number;
  response: ApiErrorResponse;
} {
  if (error instanceof StoreError) {
    return mapStoreError(error);
  }
  if (error instanceof QuorumError) {
    return mapQuorumError(error);
  }
  if (error instanceof Error) {
    return internalError(error);
  }
  return internalError('Unknown error occurred');
}

/**
 * Type guard to check if an error response has the standard format.
 *
 * @param response - The response to check
 * @returns True if the response has the standard error format
 */
export function isStandardErrorResponse(
  response: unknown,
): response is StandardErrorResponse {
  if (typeof response !== 'object' || response === null) {
    return false;
  }
  const obj = response as Record<string, unknown>;
  if (typeof obj.error !== 'object' || obj.error === null) {
    return false;
  }
  const errorObj = obj.error as Record<string, unknown>;
  return (
    typeof errorObj.code === 'string' && typeof errorObj.message === 'string'
  );
}

/**
 * Validate that an error response conforms to the standard format.
 * Throws if the response is invalid.
 *
 * @param response - The response to validate
 * @throws Error if the response doesn't conform to the standard format
 */
export function validateErrorResponse(response: unknown): void {
  if (!isStandardErrorResponse(response)) {
    throw new Error('Response does not conform to standard error format');
  }
}
