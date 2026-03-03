/**
 * Property-based tests for BrightPassApiService
 *
 * **Property 1: Service success response extraction**
 * **Property 2: Service error response mapping**
 * **Validates: Requirements 2.3, 2.4**
 *
 * Property 1: For any valid API response object with a `data` field,
 * BrightPassApiService should extract and return the `data` payload with the
 * correct TypeScript type.
 *
 * Property 2: For any API error response with HTTP status >= 400 and a body
 * containing `code`, `message`, and optional `details`, BrightPassApiService
 * should throw an `IBrightPassError` containing all three fields.
 */

import fc from 'fast-check';
import { AxiosError, AxiosHeaders } from 'axios';
import type { IBrightPassError } from '@brightchain/brightchain-lib';

// Create mock axios instance for testing
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPut = jest.fn();
const mockDelete = jest.fn();

const mockAxios = {
  get: (...args: unknown[]) => mockGet(...args),
  post: (...args: unknown[]) => mockPost(...args),
  put: (...args: unknown[]) => mockPut(...args),
  delete: (...args: unknown[]) => mockDelete(...args),
};

import BrightPassApiService from './BrightPassApiService';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSuccessResponse<T>(data: T) {
  return {
    data: { success: true, data },
    status: 200,
    statusText: 'OK',
    headers: {},
    config: { headers: new AxiosHeaders() },
  };
}

function makeAxiosError(
  status: number,
  body: Record<string, unknown>,
): AxiosError {
  return new AxiosError(
    'Request failed',
    AxiosError.ERR_BAD_REQUEST,
    { headers: new AxiosHeaders() },
    {},
    {
      data: body,
      status,
      statusText: 'Error',
      headers: {},
      config: { headers: new AxiosHeaders() },
    },
  );
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary for a non-empty printable string (used for codes, messages). */
const arbNonEmptyString = fc.string({ minLength: 1, maxLength: 100 });

/** Arbitrary for an HTTP error status code (400–599). */
const arbErrorStatus = fc.integer({ min: 400, max: 599 });

/** Arbitrary for optional details record. */
const arbOptionalDetails: fc.Arbitrary<Record<string, unknown> | undefined> =
  fc.oneof(
    fc.constant(undefined),
    fc.dictionary(
      fc.string({ minLength: 1, maxLength: 20 }),
      fc.oneof(fc.string(), fc.integer(), fc.boolean()),
      { minKeys: 1, maxKeys: 5 },
    ),
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Feature: brightpass-frontend, Properties 1 & 2: BrightPassApiService', () => {
  let service: BrightPassApiService;

  beforeEach(() => {
    service = new BrightPassApiService(mockAxios as unknown as import('axios').AxiosInstance);
    jest.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // Property 1: Service success response extraction
  // -------------------------------------------------------------------------
  describe('Property 1: Service success response extraction', () => {
    /**
     * **Validates: Requirements 2.3**
     *
     * For any arbitrary data payload wrapped in the standard
     * `{ success: true, data: { vaults: <payload> } }` envelope,
     * listVaults() should return the extracted vaults array.
     */
    it('listVaults extracts the vaults array from a success envelope', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              id: arbNonEmptyString,
              name: arbNonEmptyString,
            }),
            { minLength: 0, maxLength: 10 },
          ),
          async (vaults) => {
            mockGet.mockResolvedValueOnce(makeSuccessResponse({ vaults }));

            const result = await service.listVaults();
            expect(result).toEqual(vaults);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 2.3**
     *
     * For any arbitrary password generation result wrapped in the standard
     * success envelope, generatePassword() should return the extracted payload.
     */
    it('generatePassword extracts the password object from a success envelope', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            password: arbNonEmptyString,
            entropy: fc.double({ min: 0, max: 200, noNaN: true }),
            strength: fc.constantFrom(
              'weak' as const,
              'fair' as const,
              'strong' as const,
              'very_strong' as const,
            ),
          }),
          async (passwordResult) => {
            mockPost.mockResolvedValueOnce(
              makeSuccessResponse({ password: passwordResult }),
            );

            const result = await service.generatePassword({
              length: 16,
              uppercase: true,
              lowercase: true,
              digits: true,
              symbols: false,
            });
            expect(result).toEqual(passwordResult);
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 2.3**
     *
     * For any arbitrary breach check result, checkBreach() should return
     * the extracted payload directly (no nested key).
     */
    it('checkBreach extracts the breach result from a success envelope', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            breached: fc.boolean(),
            count: fc.nat({ max: 1000000 }),
          }),
          async (breachResult) => {
            mockPost.mockResolvedValueOnce(makeSuccessResponse(breachResult));

            const result = await service.checkBreach('test-password');
            expect(result).toEqual(breachResult);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // Property 2: Service error response mapping
  // -------------------------------------------------------------------------
  describe('Property 2: Service error response mapping', () => {
    /**
     * **Validates: Requirements 2.4**
     *
     * For any API error response with HTTP status >= 400 and a body
     * containing `code`, `message`, and optional `details`,
     * BrightPassApiService should throw an IBrightPassError containing
     * all three fields with values matching the response body.
     */
    it('maps error responses with code, message, and details to IBrightPassError', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbErrorStatus,
          arbNonEmptyString,
          arbNonEmptyString,
          arbOptionalDetails,
          async (status, code, message, details) => {
            const body: Record<string, unknown> = { code, message };
            if (details !== undefined) {
              body['details'] = details;
            }

            mockGet.mockRejectedValueOnce(makeAxiosError(status, body));

            try {
              await service.listVaults();
              // Should not reach here
              expect(true).toBe(false);
            } catch (err) {
              const bpError = err as IBrightPassError;
              expect(bpError.code).toBe(code);
              expect(bpError.message).toBe(message);
              if (details !== undefined) {
                expect(bpError.details).toEqual(details);
              }
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 2.4**
     *
     * When the error body has no `code` field, the service should fall back
     * to `HTTP_<status>` as the error code.
     */
    it('falls back to HTTP_<status> code when body has no code field', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbErrorStatus,
          arbNonEmptyString,
          async (status, message) => {
            const body = { message };

            mockPost.mockRejectedValueOnce(makeAxiosError(status, body));

            try {
              await service.checkBreach('test');
              expect(true).toBe(false);
            } catch (err) {
              const bpError = err as IBrightPassError;
              expect(bpError.code).toBe(`HTTP_${status}`);
              expect(bpError.message).toBe(message);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 2.4**
     *
     * When the error is not an AxiosError (e.g. network failure),
     * the service should throw an IBrightPassError with code 'NETWORK_ERROR'.
     */
    it('maps non-Axios errors to NETWORK_ERROR IBrightPassError', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbNonEmptyString,
          async (errorMessage) => {
            mockGet.mockRejectedValueOnce(new Error(errorMessage));

            try {
              await service.listVaults();
              expect(true).toBe(false);
            } catch (err) {
              const bpError = err as IBrightPassError;
              expect(bpError.code).toBe('NETWORK_ERROR');
              expect(bpError.message).toBe(errorMessage);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
