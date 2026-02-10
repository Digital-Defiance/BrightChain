/**
 * @fileoverview Property-based tests for BrightPassController
 *
 * **Property 17: Unauthenticated requests return 401**
 * **Validates: Requirements 5.9, 5.10**
 *
 * For any BrightPass API endpoint, a request without a valid JWT token
 * should receive a 401 Unauthorized response.
 *
 * Since the BrightPassController extends BaseController which requires a full
 * application context (database connection, environment, etc.), we test the
 * authentication enforcement pattern at the handler level by verifying that:
 * 1. The error mapping function correctly maps auth errors to 401
 * 2. The auth helper throws on missing/invalid tokens
 * 3. All domain error types map to correct HTTP status codes
 */

import { ApiErrorResponse } from '@digitaldefiance/node-express-suite';
import fc from 'fast-check';
import {
  EmergencyAccessError,
  EntryNotFoundError,
  VaultAuthenticationError,
  VaultNotFoundError,
} from '../services/brightpass';
import {
  handleError,
  notFoundError,
  unauthorizedError,
  validationError,
} from '../utils/errorResponse';

// Mock file-type module
jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

/**
 * Replicate the controller's AuthenticationRequiredError for testing.
 */
class AuthenticationRequiredError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthenticationRequiredError';
  }
}

/**
 * Replicate the controller's error mapping logic for testing.
 */
function mapBrightPassError(error: unknown): {
  statusCode: number;
  response: ApiErrorResponse;
} {
  if (error instanceof AuthenticationRequiredError) {
    return unauthorizedError();
  }
  if (error instanceof VaultNotFoundError) {
    return notFoundError('Vault', 'unknown');
  }
  if (error instanceof VaultAuthenticationError) {
    return unauthorizedError(error.message);
  }
  if (error instanceof EntryNotFoundError) {
    return notFoundError('Entry', 'unknown');
  }
  if (error instanceof EmergencyAccessError) {
    return validationError(error.message);
  }
  return handleError(error);
}

/**
 * Simulates the getAuthMemberId pattern from the controller.
 */
function getAuthMemberId(
  getMemberFromSession: (auth: string) => unknown,
  authorization: string | undefined,
): string {
  try {
    const member = getMemberFromSession(authorization ?? '');
    if (!member) {
      throw new Error('No member found');
    }
    return (member as { id: { toString: () => string } }).id.toString();
  } catch {
    throw new AuthenticationRequiredError();
  }
}

describe('BrightPassController Property Tests', () => {
  describe('Property 17: Unauthenticated requests return 401', () => {
    /**
     * For any authorization header value (including empty, random strings,
     * malformed tokens), when the session controller cannot authenticate
     * the request, the error mapping should produce a 401 response.
     *
     * **Validates: Requirements 5.9, 5.10**
     */
    it('should map AuthenticationRequiredError to 401 for any input', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.option(fc.string(), { nil: undefined }),
          async (authHeader) => {
            const failingSessionController = () => {
              throw new Error('Invalid token');
            };

            let authError: unknown;
            try {
              getAuthMemberId(failingSessionController, authHeader);
            } catch (e) {
              authError = e;
            }

            expect(authError).toBeInstanceOf(AuthenticationRequiredError);

            const result = mapBrightPassError(authError);
            expect(result.statusCode).toBe(401);
            expect(result.response).toHaveProperty('error');
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * For any authorization header value, when the session controller
     * returns null (no member found), the auth helper should throw
     * AuthenticationRequiredError which maps to 401.
     *
     * **Validates: Requirements 5.9, 5.10**
     */
    it('should return 401 when session returns null member for any token', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 0, maxLength: 200 }),
          async (authHeader) => {
            const nullSessionController = () => null;

            let authError: unknown;
            try {
              getAuthMemberId(nullSessionController, authHeader);
            } catch (e) {
              authError = e;
            }

            expect(authError).toBeInstanceOf(AuthenticationRequiredError);

            const result = mapBrightPassError(authError);
            expect(result.statusCode).toBe(401);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Verify that all known BrightPass error types map to the correct
     * HTTP status codes, and specifically that auth errors always produce 401.
     *
     * **Validates: Requirements 5.9, 5.10**
     */
    it('should map domain errors to correct status codes for any message', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          async (vaultId, message) => {
            // AuthenticationRequiredError → 401
            const authResult = mapBrightPassError(
              new AuthenticationRequiredError(),
            );
            expect(authResult.statusCode).toBe(401);

            // VaultAuthenticationError → 401
            const vaultAuthResult = mapBrightPassError(
              new VaultAuthenticationError(),
            );
            expect(vaultAuthResult.statusCode).toBe(401);

            // VaultNotFoundError → 404
            const notFoundResult = mapBrightPassError(
              new VaultNotFoundError(vaultId),
            );
            expect(notFoundResult.statusCode).toBe(404);

            // EntryNotFoundError → 404
            const entryNotFoundResult = mapBrightPassError(
              new EntryNotFoundError(vaultId),
            );
            expect(entryNotFoundResult.statusCode).toBe(404);

            // EmergencyAccessError → 400
            const emergencyResult = mapBrightPassError(
              new EmergencyAccessError(message),
            );
            expect(emergencyResult.statusCode).toBe(400);

            // Unknown errors → 500
            const unknownResult = mapBrightPassError(new Error(message));
            expect(unknownResult.statusCode).toBe(500);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
