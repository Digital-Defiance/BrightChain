import {
  ErrorCode,
  StandardErrorResponse,
  createAlreadyExistsError,
  createApiErrorResponse,
  createForbiddenError,
  createInsufficientPermissionsError,
  createInternalError,
  createNotFoundError,
  createNotImplementedError,
  createServiceUnavailableError,
  createTokenExpiredError,
  createUnauthorizedError,
  createValidationError,
  isStandardErrorResponseWithRequestId,
  validateErrorResponseWithRequestId,
} from './errorResponse';

describe('Error Response Utilities', () => {
  const testRequestId = '550e8400-e29b-41d4-a716-446655440000';

  describe('createApiErrorResponse', () => {
    it('should create a response with code, message, requestId, and timestamp', () => {
      const response = createApiErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Test error message',
        testRequestId,
      );

      expect(response.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(response.error.message).toBe('Test error message');
      expect(response.error.requestId).toBe(testRequestId);
      expect(response.error.timestamp).toBeDefined();
      // Verify timestamp is a valid ISO date
      expect(() => new Date(response.error.timestamp)).not.toThrow();
    });

    it('should include details when provided', () => {
      const details = { field: 'email', reason: 'invalid format' };
      const response = createApiErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Validation failed',
        testRequestId,
        details,
      );

      expect(response.error.details).toEqual(details);
    });

    it('should not include details when not provided', () => {
      const response = createApiErrorResponse(
        ErrorCode.VALIDATION_ERROR,
        'Test error',
        testRequestId,
      );

      expect(response.error.details).toBeUndefined();
    });
  });

  describe('createValidationError', () => {
    it('should return 400 status code with VALIDATION_ERROR code', () => {
      const result = createValidationError('Invalid input', testRequestId);

      expect(result.statusCode).toBe(400);
      expect(result.response.error.code).toBe(ErrorCode.VALIDATION_ERROR);
      expect(result.response.error.message).toBe('Invalid input');
      expect(result.response.error.requestId).toBe(testRequestId);
    });

    it('should include field-specific details', () => {
      const details = { email: 'Invalid email format', name: 'Required' };
      const result = createValidationError(
        'Validation failed',
        testRequestId,
        details,
      );

      expect(result.response.error.details).toEqual(details);
    });
  });

  describe('createUnauthorizedError', () => {
    it('should return 401 status code with UNAUTHORIZED code', () => {
      const result = createUnauthorizedError(testRequestId);

      expect(result.statusCode).toBe(401);
      expect(result.response.error.code).toBe(ErrorCode.UNAUTHORIZED);
      expect(result.response.error.requestId).toBe(testRequestId);
    });

    it('should use custom message when provided', () => {
      const result = createUnauthorizedError(
        testRequestId,
        'Custom auth error',
      );

      expect(result.response.error.message).toBe('Custom auth error');
    });
  });

  describe('createTokenExpiredError', () => {
    it('should return 401 status code with TOKEN_EXPIRED code', () => {
      const result = createTokenExpiredError(testRequestId);

      expect(result.statusCode).toBe(401);
      expect(result.response.error.code).toBe(ErrorCode.TOKEN_EXPIRED);
      expect(result.response.error.requestId).toBe(testRequestId);
    });
  });

  describe('createForbiddenError', () => {
    it('should return 403 status code with FORBIDDEN code', () => {
      const result = createForbiddenError(testRequestId);

      expect(result.statusCode).toBe(403);
      expect(result.response.error.code).toBe(ErrorCode.FORBIDDEN);
      expect(result.response.error.requestId).toBe(testRequestId);
    });
  });

  describe('createInsufficientPermissionsError', () => {
    it('should return 403 status code with INSUFFICIENT_PERMISSIONS code', () => {
      const result = createInsufficientPermissionsError(testRequestId);

      expect(result.statusCode).toBe(403);
      expect(result.response.error.code).toBe(
        ErrorCode.INSUFFICIENT_PERMISSIONS,
      );
    });

    it('should include required role in message and details', () => {
      const result = createInsufficientPermissionsError(testRequestId, 'admin');

      expect(result.response.error.message).toContain('admin');
      expect(result.response.error.details).toEqual({ requiredRole: 'admin' });
    });
  });

  describe('createNotFoundError', () => {
    it('should return 404 status code with appropriate error code', () => {
      const result = createNotFoundError('Block', 'abc123', testRequestId);

      expect(result.statusCode).toBe(404);
      expect(result.response.error.code).toBe(ErrorCode.BLOCK_NOT_FOUND);
      expect(result.response.error.details).toEqual({
        resourceType: 'Block',
        resourceId: 'abc123',
      });
    });

    it('should use MESSAGE_NOT_FOUND for message resources', () => {
      const result = createNotFoundError('Message', 'msg123', testRequestId);

      expect(result.response.error.code).toBe(ErrorCode.MESSAGE_NOT_FOUND);
    });

    it('should use NODE_NOT_FOUND for node resources', () => {
      const result = createNotFoundError('Node', 'node123', testRequestId);

      expect(result.response.error.code).toBe(ErrorCode.NODE_NOT_FOUND);
    });
  });

  describe('createAlreadyExistsError', () => {
    it('should return 409 status code with ALREADY_EXISTS code', () => {
      const result = createAlreadyExistsError('Block', 'abc123', testRequestId);

      expect(result.statusCode).toBe(409);
      expect(result.response.error.code).toBe(ErrorCode.ALREADY_EXISTS);
      expect(result.response.error.details).toEqual({
        resourceType: 'Block',
        resourceId: 'abc123',
      });
    });
  });

  describe('createInternalError', () => {
    it('should return 500 status code with INTERNAL_ERROR code', () => {
      const result = createInternalError(testRequestId);

      expect(result.statusCode).toBe(500);
      expect(result.response.error.code).toBe(ErrorCode.INTERNAL_ERROR);
      expect(result.response.error.message).toBe('An internal error occurred');
    });

    it('should not expose internal error details', () => {
      const result = createInternalError(
        testRequestId,
        new Error('Sensitive database error'),
      );

      // The message should be generic, not exposing the actual error
      expect(result.response.error.message).toBe('An internal error occurred');
      expect(result.response.error.details).toBeUndefined();
    });
  });

  describe('createServiceUnavailableError', () => {
    it('should return 503 status code with SERVICE_UNAVAILABLE code', () => {
      const result = createServiceUnavailableError(testRequestId);

      expect(result.statusCode).toBe(503);
      expect(result.response.error.code).toBe(ErrorCode.SERVICE_UNAVAILABLE);
    });
  });

  describe('createNotImplementedError', () => {
    it('should return 501 status code with NOT_IMPLEMENTED code', () => {
      const result = createNotImplementedError(
        testRequestId,
        'Feature X is not implemented',
      );

      expect(result.statusCode).toBe(501);
      expect(result.response.error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
      expect(result.response.error.message).toBe(
        'Feature X is not implemented',
      );
    });
  });

  describe('isStandardErrorResponseWithRequestId', () => {
    it('should return true for valid error response', () => {
      const response: StandardErrorResponse = {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Test error',
          requestId: testRequestId,
          timestamp: new Date().toISOString(),
        },
      };

      expect(isStandardErrorResponseWithRequestId(response)).toBe(true);
    });

    it('should return false for response without requestId', () => {
      const response = {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Test error',
          timestamp: new Date().toISOString(),
        },
      };

      expect(isStandardErrorResponseWithRequestId(response)).toBe(false);
    });

    it('should return false for response without timestamp', () => {
      const response = {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Test error',
          requestId: testRequestId,
        },
      };

      expect(isStandardErrorResponseWithRequestId(response)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isStandardErrorResponseWithRequestId(null)).toBe(false);
    });

    it('should return false for non-object', () => {
      expect(isStandardErrorResponseWithRequestId('string')).toBe(false);
    });
  });

  describe('validateErrorResponseWithRequestId', () => {
    it('should not throw for valid response', () => {
      const response: StandardErrorResponse = {
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Test error',
          requestId: testRequestId,
          timestamp: new Date().toISOString(),
        },
      };

      expect(() => validateErrorResponseWithRequestId(response)).not.toThrow();
    });

    it('should throw for invalid response', () => {
      const response = { error: { code: 'TEST' } };

      expect(() => validateErrorResponseWithRequestId(response)).toThrow(
        'Response does not conform to standard error format with requestId',
      );
    });
  });
});
