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

  // Message errors
  MESSAGE_NOT_FOUND = 'MESSAGE_NOT_FOUND',

  // Node errors
  NODE_NOT_FOUND = 'NODE_NOT_FOUND',

  // General errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_TOKEN = 'INVALID_TOKEN',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
}

/**
 * Standard error response structure for all API endpoints.
 * Follows the format specified in the design document.
 * @requirements 9.1, 9.2, 9.3, 9.4, 9.5
 */
export interface StandardErrorResponse {
  error: {
    code: ErrorCode | string;
    message: string;
    details?: Record<string, unknown>;
    requestId: string;
    timestamp: string;
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
 * Create a standardized API error response with requestId and timestamp.
 * This is the primary function for creating error responses that conform
 * to the API specification.
 *
 * @param code - The error code identifying the type of error
 * @param message - Human-readable error message
 * @param requestId - The unique request ID for tracing
 * @param details - Optional additional context about the error
 * @returns A properly formatted StandardErrorResponse
 * @requirements 9.1, 9.5
 */
export function createApiErrorResponse(
  code: ErrorCode | string,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): StandardErrorResponse {
  const response: StandardErrorResponse = {
    error: {
      code,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    },
  };

  if (details) {
    response.error.details = details;
  }

  return response;
}

/**
 * Create a standardized error response object (legacy format without requestId).
 * @deprecated Use createApiErrorResponse instead for new code
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
  const response: { error: { code: string; message: string; details?: Record<string, unknown> } } = {
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
 * Create a standardized API response with status code (legacy format).
 * @deprecated Use the factory functions with requestId parameter instead
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
 * Create a standardized API error result with requestId and timestamp.
 *
 * @param statusCode - HTTP status code
 * @param code - The error code identifying the type of error
 * @param message - Human-readable error message
 * @param requestId - The unique request ID for tracing
 * @param details - Optional additional context about the error
 * @returns Object with statusCode and response
 * @requirements 9.1, 9.5
 */
export function createApiErrorResultWithRequestId(
  statusCode: number,
  code: ErrorCode | string,
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): { statusCode: number; response: StandardErrorResponse } {
  return {
    statusCode,
    response: createApiErrorResponse(code, message, requestId, details),
  };
}

// ============================================================================
// Error Factory Functions with RequestId Support
// ============================================================================

/**
 * Create a validation error response (400).
 * @requirements 9.2
 *
 * @param message - Description of the validation failure
 * @param requestId - The unique request ID for tracing
 * @param details - Optional details about invalid fields
 * @returns Formatted validation error response with status code
 */
export function createValidationError(
  message: string,
  requestId: string,
  details?: Record<string, unknown>,
): { statusCode: number; response: StandardErrorResponse } {
  return createApiErrorResultWithRequestId(
    400,
    ErrorCode.VALIDATION_ERROR,
    message,
    requestId,
    details,
  );
}

/**
 * Create an unauthorized error response (401).
 * @requirements 9.1
 *
 * @param requestId - The unique request ID for tracing
 * @param message - Description of the authentication failure
 * @returns Formatted unauthorized error response with status code
 */
export function createUnauthorizedError(
  requestId: string,
  message: string = 'Invalid or missing authentication token',
): { statusCode: number; response: StandardErrorResponse } {
  return createApiErrorResultWithRequestId(
    401,
    ErrorCode.UNAUTHORIZED,
    message,
    requestId,
  );
}

/**
 * Create a token expired error response (401).
 * @requirements 9.1
 *
 * @param requestId - The unique request ID for tracing
 * @param message - Description of the token expiration
 * @returns Formatted token expired error response with status code
 */
export function createTokenExpiredError(
  requestId: string,
  message: string = 'Authentication token has expired',
): { statusCode: number; response: StandardErrorResponse } {
  return createApiErrorResultWithRequestId(
    401,
    ErrorCode.TOKEN_EXPIRED,
    message,
    requestId,
  );
}

/**
 * Create a forbidden error response (403).
 * @requirements 9.1
 *
 * @param requestId - The unique request ID for tracing
 * @param message - Description of the authorization failure
 * @returns Formatted forbidden error response with status code
 */
export function createForbiddenError(
  requestId: string,
  message: string = 'You do not have permission to perform this action',
): { statusCode: number; response: StandardErrorResponse } {
  return createApiErrorResultWithRequestId(
    403,
    ErrorCode.FORBIDDEN,
    message,
    requestId,
  );
}

/**
 * Create an insufficient permissions error response (403).
 * @requirements 9.1
 *
 * @param requestId - The unique request ID for tracing
 * @param requiredRole - The role that was required
 * @returns Formatted insufficient permissions error response with status code
 */
export function createInsufficientPermissionsError(
  requestId: string,
  requiredRole?: string,
): { statusCode: number; response: StandardErrorResponse } {
  const message = requiredRole
    ? `Insufficient permissions. Required role: ${requiredRole}`
    : 'Insufficient permissions to perform this action';
  return createApiErrorResultWithRequestId(
    403,
    ErrorCode.INSUFFICIENT_PERMISSIONS,
    message,
    requestId,
    requiredRole ? { requiredRole } : undefined,
  );
}

/**
 * Create a not found error response (404).
 * @requirements 9.4
 *
 * @param resourceType - Type of resource that was not found
 * @param resourceId - ID of the resource that was not found
 * @param requestId - The unique request ID for tracing
 * @returns Formatted not found error response with status code
 */
export function createNotFoundError(
  resourceType: string,
  resourceId: string,
  requestId: string,
): { statusCode: number; response: StandardErrorResponse } {
  const code = getNotFoundErrorCode(resourceType);
  return createApiErrorResultWithRequestId(
    404,
    code,
    `${resourceType} with ID ${resourceId} not found`,
    requestId,
    { resourceType, resourceId },
  );
}

/**
 * Create an already exists error response (409).
 * @requirements 9.1
 *
 * @param resourceType - Type of resource that already exists
 * @param resourceId - ID of the resource that already exists
 * @param requestId - The unique request ID for tracing
 * @returns Formatted already exists error response with status code
 */
export function createAlreadyExistsError(
  resourceType: string,
  resourceId: string,
  requestId: string,
): { statusCode: number; response: StandardErrorResponse } {
  return createApiErrorResultWithRequestId(
    409,
    ErrorCode.ALREADY_EXISTS,
    `${resourceType} with ID ${resourceId} already exists`,
    requestId,
    { resourceType, resourceId },
  );
}

/**
 * Create an internal error response (500).
 * Does not expose internal error details to the client.
 * @requirements 9.3
 *
 * @param requestId - The unique request ID for tracing
 * @param _error - The original error (logged but not exposed)
 * @returns Formatted internal error response with status code
 */
export function createInternalError(
  requestId: string,
  _error?: Error | string,
): { statusCode: number; response: StandardErrorResponse } {
  // Log the actual error server-side but don't expose details to client
  if (_error) {
    const errorMessage = _error instanceof Error ? _error.message : _error;
    console.error(`[${requestId}] Internal error:`, errorMessage);
  }
  return createApiErrorResultWithRequestId(
    500,
    ErrorCode.INTERNAL_ERROR,
    'An internal error occurred',
    requestId,
  );
}

/**
 * Create a service unavailable error response (503).
 * @requirements 9.1
 *
 * @param requestId - The unique request ID for tracing
 * @param message - Description of the service unavailability
 * @returns Formatted service unavailable error response with status code
 */
export function createServiceUnavailableError(
  requestId: string,
  message: string = 'Service temporarily unavailable',
): { statusCode: number; response: StandardErrorResponse } {
  return createApiErrorResultWithRequestId(
    503,
    ErrorCode.SERVICE_UNAVAILABLE,
    message,
    requestId,
  );
}

/**
 * Create a not implemented error response (501).
 * @requirements 9.1
 *
 * @param requestId - The unique request ID for tracing
 * @param message - Description of what is not implemented
 * @returns Formatted not implemented error response with status code
 */
export function createNotImplementedError(
  requestId: string,
  message: string = 'This feature is not yet implemented',
): { statusCode: number; response: StandardErrorResponse } {
  return createApiErrorResultWithRequestId(
    501,
    ErrorCode.NOT_IMPLEMENTED,
    message,
    requestId,
  );
}

// ============================================================================
// Legacy Error Factory Functions (without requestId)
// ============================================================================

/**
 * Create a validation error response (400).
 * @deprecated Use createValidationError with requestId instead
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
 * @deprecated Use createUnauthorizedError with requestId instead
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
 * @deprecated Use createForbiddenError with requestId instead
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
 * @deprecated Use createNotFoundError with requestId instead
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
 * @deprecated Use createInternalError with requestId instead
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
 * @deprecated Use createNotImplementedError with requestId instead
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
  if (resourceTypeLower === 'message') {
    return ErrorCode.MESSAGE_NOT_FOUND;
  }
  if (resourceTypeLower === 'node') {
    return ErrorCode.NODE_NOT_FOUND;
  }
  return ErrorCode.NOT_FOUND;
}

/**
 * Map a StoreError to an appropriate API error response.
 * @deprecated Use mapStoreErrorWithRequestId instead
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
 * Map a StoreError to an appropriate API error response with requestId.
 *
 * @param error - The StoreError to map
 * @param requestId - The unique request ID for tracing
 * @returns Object with statusCode and response
 */
export function mapStoreErrorWithRequestId(
  error: StoreError,
  requestId: string,
): { statusCode: number; response: StandardErrorResponse } {
  const mapping = mapStoreErrorToResult(error);
  return createApiErrorResultWithRequestId(
    mapping.statusCode,
    mapping.code,
    mapping.message,
    requestId,
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
 * @deprecated Use mapQuorumErrorWithRequestId instead
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
 * Map a QuorumError to an appropriate API error response with requestId.
 *
 * @param error - The QuorumError to map
 * @param requestId - The unique request ID for tracing
 * @returns Object with statusCode and response
 */
export function mapQuorumErrorWithRequestId(
  error: QuorumError,
  requestId: string,
): { statusCode: number; response: StandardErrorResponse } {
  const mapping = mapQuorumErrorToResult(error);
  return createApiErrorResultWithRequestId(
    mapping.statusCode,
    mapping.code,
    mapping.message,
    requestId,
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
 * @deprecated Use handleErrorWithRequestId instead
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
 * Handle any error and return an appropriate API error response with requestId.
 * This is a catch-all handler that can be used in catch blocks.
 *
 * @param error - Any error that was thrown
 * @param requestId - The unique request ID for tracing
 * @returns Object with statusCode and response
 */
export function handleErrorWithRequestId(
  error: unknown,
  requestId: string,
): { statusCode: number; response: StandardErrorResponse } {
  if (error instanceof StoreError) {
    return mapStoreErrorWithRequestId(error, requestId);
  }
  if (error instanceof QuorumError) {
    return mapQuorumErrorWithRequestId(error, requestId);
  }
  return createInternalError(requestId, error instanceof Error ? error : undefined);
}

/**
 * Type guard to check if an error response has the standard format with requestId.
 *
 * @param response - The response to check
 * @returns True if the response has the standard error format with requestId and timestamp
 */
export function isStandardErrorResponseWithRequestId(
  response: unknown,
): response is StandardErrorResponse {
  if (typeof response !== 'object' || response === null) {
    return false;
  }
  const obj = response as Record<string, unknown>;
  if (typeof obj['error'] !== 'object' || obj['error'] === null) {
    return false;
  }
  const errorObj = obj['error'] as Record<string, unknown>;
  return (
    typeof errorObj['code'] === 'string' &&
    typeof errorObj['message'] === 'string' &&
    typeof errorObj['requestId'] === 'string' &&
    typeof errorObj['timestamp'] === 'string'
  );
}

/**
 * Type guard to check if an error response has the standard format.
 * @deprecated Use isStandardErrorResponseWithRequestId for new code
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
  if (typeof obj['error'] !== 'object' || obj['error'] === null) {
    return false;
  }
  const errorObj = obj['error'] as Record<string, unknown>;
  return (
    typeof errorObj['code'] === 'string' &&
    typeof errorObj['message'] === 'string'
  );
}

/**
 * Validate that an error response conforms to the standard format with requestId.
 * Throws if the response is invalid.
 *
 * @param response - The response to validate
 * @throws Error if the response doesn't conform to the standard format
 */
export function validateErrorResponseWithRequestId(response: unknown): void {
  if (!isStandardErrorResponseWithRequestId(response)) {
    throw new Error('Response does not conform to standard error format with requestId');
  }
}

/**
 * Validate that an error response conforms to the standard format.
 * Throws if the response is invalid.
 * @deprecated Use validateErrorResponseWithRequestId for new code
 *
 * @param response - The response to validate
 * @throws Error if the response doesn't conform to the standard format
 */
export function validateErrorResponse(response: unknown): void {
  if (!isStandardErrorResponse(response)) {
    throw new Error('Response does not conform to standard error format');
  }
}
