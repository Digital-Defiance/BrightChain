/**
 * @fileoverview Property-based tests for Error Response Format Consistency
 *
 * **Feature: backend-blockstore-quorum, Property 27: Error Response Format Consistency**
 * **Validates: Requirements 15.6**
 *
 * This test suite verifies that:
 * - All API error responses follow the standard format with error.code and error.message
 * - HTTP status codes match the error type
 * - Error responses are consistent across all error utility functions
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createApiErrorResult,
  createErrorResponse,
  ErrorCode,
  forbiddenError,
  handleError,
  internalError,
  isStandardErrorResponse,
  mapQuorumError,
  mapStoreError,
  notFoundError,
  notImplementedError,
  unauthorizedError,
  validateErrorResponse,
  validationError,
} from '@brightchain/brightchain-api-lib';
import {
  QuorumError,
  QuorumErrorType,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';

describe('Error Response Format Consistency Property Tests', () => {
  describe('Property 27: Error Response Format Consistency', () => {
    /**
     * Property: For any error code and message, createErrorResponse SHALL produce
     * a response with the standard error format containing code and message.
     *
     * **Validates: Requirements 15.6**
     */
    it('should create error responses with standard format', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ErrorCode)),
          fc.string({ minLength: 1, maxLength: 200 }),
          (code, message) => {
            const response = createErrorResponse(code, message) as any;

            // Verify standard format
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code', code);
            expect(response.error).toHaveProperty('message', message);
            expect(isStandardErrorResponse(response)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: For any error code, message, and optional details, createApiErrorResult
     * SHALL produce a response with statusCode and properly formatted error response.
     *
     * **Validates: Requirements 15.6**
     */
    it('should create API error results with status code and standard format', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 400, max: 599 }),
          fc.constantFrom(...Object.values(ErrorCode)),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.option(
            fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }),
              fc.string(),
            ),
          ),
          (statusCode, code, message, details) => {
            const result = createApiErrorResult(
              statusCode,
              code,
              message,
              details ?? undefined,
            );
            const response = result.response as any;

            // Verify result structure
            expect(result).toHaveProperty('statusCode', statusCode);
            expect(result).toHaveProperty('response');
            expect(response).toHaveProperty('error');
            expect(response.error).toHaveProperty('code', code);
            expect(response.error).toHaveProperty('message', message);

            // Verify details if provided
            if (details) {
              expect(response.error).toHaveProperty('details', details);
            }

            expect(isStandardErrorResponse(result.response)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: validationError SHALL always return status 400 with VALIDATION_ERROR code.
     *
     * **Validates: Requirements 15.1**
     */
    it('should return 400 status for validation errors', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (message) => {
          const result = validationError(message);
          const response = result.response as any;

          expect(result.statusCode).toBe(400);
          expect(response.error.code).toBe(ErrorCode.VALIDATION_ERROR);
          expect(response.error.message).toBe(message);
          expect(isStandardErrorResponse(result.response)).toBe(true);
        }),
        { numRuns: 50 },
      );
    });

    /**
     * Property: unauthorizedError SHALL always return status 401 with UNAUTHORIZED code.
     *
     * **Validates: Requirements 15.2**
     */
    it('should return 401 status for unauthorized errors', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1, maxLength: 200 })),
          (message) => {
            const result = message
              ? unauthorizedError(message)
              : unauthorizedError();
            const response = result.response as any;

            expect(result.statusCode).toBe(401);
            expect(response.error.code).toBe(ErrorCode.UNAUTHORIZED);
            expect(typeof response.error.message).toBe('string');
            expect(response.error.message.length).toBeGreaterThan(0);
            expect(isStandardErrorResponse(result.response)).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: forbiddenError SHALL always return status 403 with FORBIDDEN code.
     *
     * **Validates: Requirements 15.3**
     */
    it('should return 403 status for forbidden errors', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1, maxLength: 200 })),
          (message) => {
            const result = message ? forbiddenError(message) : forbiddenError();
            const response = result.response as any;

            expect(result.statusCode).toBe(403);
            expect(response.error.code).toBe(ErrorCode.FORBIDDEN);
            expect(typeof response.error.message).toBe('string');
            expect(response.error.message.length).toBeGreaterThan(0);
            expect(isStandardErrorResponse(result.response)).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: notFoundError SHALL always return status 404 with appropriate not found code.
     *
     * **Validates: Requirements 15.4**
     */
    it('should return 404 status for not found errors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('Block', 'Member', 'Document', 'CBL', 'Other'),
          fc.string({ minLength: 1, maxLength: 50 }),
          (resourceType, resourceId) => {
            const result = notFoundError(resourceType, resourceId);
            const response = result.response as any;

            expect(result.statusCode).toBe(404);
            expect(typeof response.error.code).toBe('string');
            expect(response.error.message).toContain(resourceId);
            expect(response.error.details).toEqual({
              resourceType,
              resourceId,
            });
            expect(isStandardErrorResponse(result.response)).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: internalError SHALL always return status 500 with INTERNAL_ERROR code.
     *
     * **Validates: Requirements 15.5**
     */
    it('should return 500 status for internal errors', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string({ minLength: 1, maxLength: 200 }),
            fc
              .string({ minLength: 1, maxLength: 200 })
              .map((msg) => new Error(msg)),
          ),
          (error) => {
            const result = internalError(error);
            const response = result.response as any;

            expect(result.statusCode).toBe(500);
            expect(response.error.code).toBe(ErrorCode.INTERNAL_ERROR);
            expect(typeof response.error.message).toBe('string');
            expect(response.error.message.length).toBeGreaterThan(0);
            expect(isStandardErrorResponse(result.response)).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: notImplementedError SHALL always return status 501 with NOT_IMPLEMENTED code.
     *
     * **Validates: Requirements 15.6**
     */
    it('should return 501 status for not implemented errors', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (message) => {
          const result = notImplementedError(message);
          const response = result.response as any;

          expect(result.statusCode).toBe(501);
          expect(response.error.code).toBe(ErrorCode.NOT_IMPLEMENTED);
          expect(response.error.message).toBe(message);
          expect(isStandardErrorResponse(result.response)).toBe(true);
        }),
        { numRuns: 50 },
      );
    });

    /**
     * Property: mapStoreError SHALL map StoreError types to appropriate HTTP status codes.
     *
     * **Validates: Requirements 15.6**
     */
    it('should map StoreError to appropriate status codes', () => {
      const storeErrorMappings: Array<{
        type: StoreErrorType;
        expectedStatus: number;
      }> = [
        { type: StoreErrorType.KeyNotFound, expectedStatus: 404 },
        { type: StoreErrorType.BlockSizeMismatch, expectedStatus: 400 },
        { type: StoreErrorType.BlockFileSizeMismatch, expectedStatus: 400 },
        { type: StoreErrorType.BlockValidationFailed, expectedStatus: 400 },
        { type: StoreErrorType.InsufficientRandomBlocks, expectedStatus: 400 },
        { type: StoreErrorType.BlockAlreadyExists, expectedStatus: 409 },
        { type: StoreErrorType.BlockPathAlreadyExists, expectedStatus: 409 },
        { type: StoreErrorType.BlockIdMismatch, expectedStatus: 400 },
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...storeErrorMappings),
          ({ type, expectedStatus }) => {
            const error = new StoreError(type);
            const result = mapStoreError(error);
            const response = result.response as any;

            expect(result.statusCode).toBe(expectedStatus);
            expect(typeof response.error.message).toBe('string');
            expect(isStandardErrorResponse(result.response)).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: mapQuorumError SHALL map QuorumError types to appropriate HTTP status codes.
     *
     * **Validates: Requirements 15.6**
     */
    it('should map QuorumError to appropriate status codes', () => {
      const quorumErrorMappings: Array<{
        type: QuorumErrorType;
        expectedStatus: number;
      }> = [
        { type: QuorumErrorType.MemberNotFound, expectedStatus: 404 },
        { type: QuorumErrorType.DocumentNotFound, expectedStatus: 404 },
        { type: QuorumErrorType.NotEnoughMembers, expectedStatus: 400 },
      ];

      fc.assert(
        fc.property(
          fc.constantFrom(...quorumErrorMappings),
          ({ type, expectedStatus }) => {
            const error = new QuorumError(type);
            const result = mapQuorumError(error);
            const response = result.response as any;

            expect(result.statusCode).toBe(expectedStatus);
            expect(typeof response.error.message).toBe('string');
            expect(isStandardErrorResponse(result.response)).toBe(true);
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: handleError SHALL handle any error type and return a valid error response.
     *
     * **Validates: Requirements 15.6**
     */
    it('should handle any error type and return valid response', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            // StoreError
            fc
              .constantFrom(...Object.values(StoreErrorType))
              .map((type) => new StoreError(type)),
            // QuorumError
            fc
              .constantFrom(...Object.values(QuorumErrorType))
              .map((type) => new QuorumError(type)),
            // Generic Error
            fc
              .string({ minLength: 1, maxLength: 200 })
              .map((msg) => new Error(msg)),
            // String error
            fc.string({ minLength: 1, maxLength: 200 }),
          ),
          (error) => {
            const result = handleError(error);

            // Verify result has required structure
            expect(result).toHaveProperty('statusCode');
            expect(result.statusCode).toBeGreaterThanOrEqual(400);
            expect(result.statusCode).toBeLessThan(600);
            expect(result).toHaveProperty('response');
            expect(isStandardErrorResponse(result.response)).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: isStandardErrorResponse SHALL correctly identify valid error responses.
     *
     * **Validates: Requirements 15.6**
     */
    it('should correctly identify valid and invalid error responses', () => {
      // Test valid responses - use legacy format without requestId/timestamp
      // since isStandardErrorResponse checks for the minimal format
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (code, message) => {
            const validResponse = {
              error: { code, message },
            };
            expect(isStandardErrorResponse(validResponse)).toBe(true);
          },
        ),
        { numRuns: 50 },
      );

      // Test invalid responses
      const invalidResponses = [
        null,
        undefined,
        {},
        { error: null },
        { error: {} },
        { error: { code: 'TEST' } }, // missing message
        { error: { message: 'test' } }, // missing code
        { error: { code: 123, message: 'test' } }, // code not string
        { error: { code: 'TEST', message: 123 } }, // message not string
        'string',
        123,
        [],
      ];

      for (const invalid of invalidResponses) {
        expect(isStandardErrorResponse(invalid)).toBe(false);
      }
    });

    /**
     * Property: validateErrorResponse SHALL throw for invalid responses and not throw for valid ones.
     *
     * **Validates: Requirements 15.6**
     */
    it('should validate error responses correctly', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.string({ minLength: 1, maxLength: 200 }),
          (code, message) => {
            // Use legacy format without requestId/timestamp
            // since validateErrorResponse checks for the minimal format
            const validResponse = {
              error: { code, message },
            };

            // Should not throw for valid response
            expect(() => validateErrorResponse(validResponse)).not.toThrow();
          },
        ),
        { numRuns: 50 },
      );

      // Should throw for invalid responses
      expect(() => validateErrorResponse(null)).toThrow();
      expect(() => validateErrorResponse({})).toThrow();
      expect(() => validateErrorResponse({ error: {} })).toThrow();
    });

    /**
     * Property: Error responses with details SHALL include the details in the response.
     *
     * **Validates: Requirements 15.6**
     */
    it('should include details in error responses when provided', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(...Object.values(ErrorCode)),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.oneof(fc.string(), fc.integer(), fc.boolean()),
          ),
          (code, message, details) => {
            const response = createErrorResponse(code, message, details) as any;

            expect(response.error.details).toEqual(details);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
