/**
 * Property-Based Tests for Error Response Consistency
 *
 * Feature: api-server-operations
 * Property 19: Error Response Consistency
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
 *
 * For any error condition across all endpoints, the response SHALL be JSON containing
 * error.code (string), error.message (string), and error.requestId (string).
 * Validation errors SHALL return 400 with field-specific messages,
 * not-found errors SHALL return 404 with resource type and identifier,
 * and internal errors SHALL return 500 without exposing stack traces.
 */

import * as fc from 'fast-check';
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
} from './errorResponse';

// Arbitrary for generating valid UUID v4 strings
const uuidV4Arb = fc.uuid();

// Arbitrary for generating non-empty strings
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 100 });

// Arbitrary for generating error codes
const errorCodeArb = fc.constantFrom(...Object.values(ErrorCode));

// Arbitrary for generating resource types
const resourceTypeArb = fc.constantFrom(
  'Block',
  'Member',
  'Document',
  'CBL',
  'Message',
  'Node',
  'User',
  'Session',
);

// Arbitrary for generating optional details objects
const detailsArb = fc.option(
  fc.dictionary(
    fc.string({ minLength: 1, maxLength: 20 }),
    fc.oneof(fc.string(), fc.integer(), fc.boolean()),
  ),
  { nil: undefined },
);

describe('Error Response Consistency Property Tests', () => {
  describe('Property 19: Error Response Consistency', () => {
    /**
     * Property 19a: All error responses contain required fields
     *
     * For any error code, message, and requestId, the created error response
     * SHALL contain error.code (string), error.message (string),
     * error.requestId (string), and error.timestamp (string).
     */
    it('Property 19a: All error responses contain required fields (code, message, requestId, timestamp)', async () => {
      await fc.assert(
        fc.asyncProperty(
          errorCodeArb,
          nonEmptyStringArb,
          uuidV4Arb,
          detailsArb,
          async (code, message, requestId, details) => {
            // Feature: api-server-operations, Property 19: Error Response Consistency
            const response = createApiErrorResponse(
              code,
              message,
              requestId,
              details,
            );

            // Verify required fields exist and are strings
            expect(typeof response.error.code).toBe('string');
            expect(typeof response.error.message).toBe('string');
            expect(typeof response.error.requestId).toBe('string');
            expect(typeof response.error.timestamp).toBe('string');

            // Verify values match inputs
            expect(response.error.code).toBe(code);
            expect(response.error.message).toBe(message);
            expect(response.error.requestId).toBe(requestId);

            // Verify timestamp is valid ISO date
            const timestamp = new Date(response.error.timestamp);
            expect(timestamp.toISOString()).toBe(response.error.timestamp);

            // Verify type guard passes
            expect(isStandardErrorResponseWithRequestId(response)).toBe(true);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 19b: Validation errors return 400 with field-specific messages
     *
     * For any validation error with field details, the response SHALL have
     * status code 400 and include the field-specific error details.
     */
    it('Property 19b: Validation errors return 400 with field-specific messages', async () => {
      await fc.assert(
        fc.asyncProperty(
          nonEmptyStringArb,
          uuidV4Arb,
          fc.dictionary(
            fc.string({ minLength: 1, maxLength: 20 }),
            fc.string({ minLength: 1, maxLength: 50 }),
          ),
          async (message, requestId, fieldErrors) => {
            // Feature: api-server-operations, Property 19: Error Response Consistency
            const result = createValidationError(
              message,
              requestId,
              fieldErrors,
            );

            // Verify status code is 400
            expect(result.statusCode).toBe(400);

            // Verify error code is VALIDATION_ERROR
            expect(result.response.error.code).toBe(ErrorCode.VALIDATION_ERROR);

            // Verify requestId is included
            expect(result.response.error.requestId).toBe(requestId);

            // Verify field-specific details are included
            if (Object.keys(fieldErrors).length > 0) {
              expect(result.response.error.details).toEqual(fieldErrors);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 19c: Not-found errors return 404 with resource type and identifier
     *
     * For any resource type and identifier, the not-found error response SHALL
     * have status code 404 and include resourceType and resourceId in details.
     */
    it('Property 19c: Not-found errors return 404 with resource type and identifier', async () => {
      await fc.assert(
        fc.asyncProperty(
          resourceTypeArb,
          nonEmptyStringArb,
          uuidV4Arb,
          async (resourceType, resourceId, requestId) => {
            // Feature: api-server-operations, Property 19: Error Response Consistency
            const result = createNotFoundError(
              resourceType,
              resourceId,
              requestId,
            );

            // Verify status code is 404
            expect(result.statusCode).toBe(404);

            // Verify requestId is included
            expect(result.response.error.requestId).toBe(requestId);

            // Verify resource details are included
            expect(result.response.error.details).toBeDefined();
            expect(result.response.error.details?.['resourceType']).toBe(
              resourceType,
            );
            expect(result.response.error.details?.['resourceId']).toBe(
              resourceId,
            );

            // Verify message includes resource info
            expect(result.response.error.message).toContain(resourceType);
            expect(result.response.error.message).toContain(resourceId);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 19d: Internal errors return 500 without exposing stack traces
     *
     * For any internal error, the response SHALL have status code 500 and
     * SHALL NOT expose internal error details or stack traces.
     */
    it('Property 19d: Internal errors return 500 without exposing stack traces', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidV4Arb,
          // Generate error messages that are clearly identifiable (not substrings of generic message)
          fc
            .string({ minLength: 10, maxLength: 100 })
            .filter(
              (s) => !s.includes('internal error') && s.trim().length >= 10,
            ),
          async (requestId, sensitiveErrorMessage) => {
            // Feature: api-server-operations, Property 19: Error Response Consistency
            const sensitiveError = new Error(sensitiveErrorMessage);
            sensitiveError.stack = `Error: ${sensitiveErrorMessage}\n    at SomeInternalFunction (internal.ts:42:13)`;

            // Suppress console.error during test
            const consoleSpy = jest
              .spyOn(console, 'error')
              .mockImplementation();

            try {
              const result = createInternalError(requestId, sensitiveError);

              // Verify status code is 500
              expect(result.statusCode).toBe(500);

              // Verify error code is INTERNAL_ERROR
              expect(result.response.error.code).toBe(ErrorCode.INTERNAL_ERROR);

              // Verify requestId is included
              expect(result.response.error.requestId).toBe(requestId);

              // Verify the actual sensitive error message is NOT in the response
              // (the generic message should be used instead)
              expect(result.response.error.message).not.toBe(
                sensitiveErrorMessage,
              );
              expect(result.response.error.message).not.toContain(
                'internal.ts',
              );
              expect(result.response.error.message).not.toContain(
                'SomeInternalFunction',
              );

              // Verify no details are exposed
              expect(result.response.error.details).toBeUndefined();

              // Verify generic message is used
              expect(result.response.error.message).toBe(
                'An internal error occurred',
              );
            } finally {
              consoleSpy.mockRestore();
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 19e: All error factory functions produce valid responses
     *
     * For any inputs to any error factory function, the result SHALL be
     * a valid StandardErrorResponse with the correct status code.
     */
    it('Property 19e: All error factory functions produce valid responses', async () => {
      await fc.assert(
        fc.asyncProperty(
          uuidV4Arb,
          nonEmptyStringArb,
          resourceTypeArb,
          async (requestId, message, resourceType) => {
            // Feature: api-server-operations, Property 19: Error Response Consistency
            const errorFactories: Array<{
              name: string;
              fn: () => { statusCode: number; response: StandardErrorResponse };
              expectedStatus: number;
            }> = [
              {
                name: 'createValidationError',
                fn: () => createValidationError(message, requestId),
                expectedStatus: 400,
              },
              {
                name: 'createUnauthorizedError',
                fn: () => createUnauthorizedError(requestId, message),
                expectedStatus: 401,
              },
              {
                name: 'createTokenExpiredError',
                fn: () => createTokenExpiredError(requestId, message),
                expectedStatus: 401,
              },
              {
                name: 'createForbiddenError',
                fn: () => createForbiddenError(requestId, message),
                expectedStatus: 403,
              },
              {
                name: 'createInsufficientPermissionsError',
                fn: () =>
                  createInsufficientPermissionsError(requestId, 'admin'),
                expectedStatus: 403,
              },
              {
                name: 'createNotFoundError',
                fn: () =>
                  createNotFoundError(resourceType, 'test-id', requestId),
                expectedStatus: 404,
              },
              {
                name: 'createAlreadyExistsError',
                fn: () =>
                  createAlreadyExistsError(resourceType, 'test-id', requestId),
                expectedStatus: 409,
              },
              {
                name: 'createInternalError',
                fn: () => {
                  const spy = jest.spyOn(console, 'error').mockImplementation();
                  const result = createInternalError(requestId);
                  spy.mockRestore();
                  return result;
                },
                expectedStatus: 500,
              },
              {
                name: 'createNotImplementedError',
                fn: () => createNotImplementedError(requestId, message),
                expectedStatus: 501,
              },
              {
                name: 'createServiceUnavailableError',
                fn: () => createServiceUnavailableError(requestId, message),
                expectedStatus: 503,
              },
            ];

            for (const { name: _name, fn, expectedStatus } of errorFactories) {
              const result = fn();

              // Verify status code
              expect(result.statusCode).toBe(expectedStatus);

              // Verify response is valid
              expect(
                isStandardErrorResponseWithRequestId(result.response),
              ).toBe(true);

              // Verify requestId is included
              expect(result.response.error.requestId).toBe(requestId);
            }

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 19f: RequestId is preserved across all error types
     *
     * For any requestId, all error responses SHALL include that exact requestId.
     */
    it('Property 19f: RequestId is preserved across all error types', async () => {
      await fc.assert(
        fc.asyncProperty(uuidV4Arb, async (requestId) => {
          // Feature: api-server-operations, Property 19: Error Response Consistency
          const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

          try {
            const responses = [
              createValidationError('test', requestId),
              createUnauthorizedError(requestId),
              createTokenExpiredError(requestId),
              createForbiddenError(requestId),
              createInsufficientPermissionsError(requestId),
              createNotFoundError('Block', 'id', requestId),
              createAlreadyExistsError('Block', 'id', requestId),
              createInternalError(requestId),
              createNotImplementedError(requestId),
              createServiceUnavailableError(requestId),
            ];

            for (const result of responses) {
              expect(result.response.error.requestId).toBe(requestId);
            }
          } finally {
            consoleSpy.mockRestore();
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 19g: Timestamps are valid ISO 8601 dates
     *
     * For any error response, the timestamp SHALL be a valid ISO 8601 date string.
     */
    it('Property 19g: Timestamps are valid ISO 8601 dates', async () => {
      await fc.assert(
        fc.asyncProperty(
          errorCodeArb,
          nonEmptyStringArb,
          uuidV4Arb,
          async (code, message, requestId) => {
            // Feature: api-server-operations, Property 19: Error Response Consistency
            const response = createApiErrorResponse(code, message, requestId);

            // Verify timestamp is a string
            expect(typeof response.error.timestamp).toBe('string');

            // Verify timestamp can be parsed as a date
            const date = new Date(response.error.timestamp);
            expect(date.toString()).not.toBe('Invalid Date');

            // Verify timestamp is in ISO 8601 format
            expect(response.error.timestamp).toMatch(
              /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/,
            );

            // Verify timestamp is recent (within last minute)
            const now = Date.now();
            const timestampMs = date.getTime();
            expect(timestampMs).toBeLessThanOrEqual(now);
            expect(timestampMs).toBeGreaterThan(now - 60000);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
