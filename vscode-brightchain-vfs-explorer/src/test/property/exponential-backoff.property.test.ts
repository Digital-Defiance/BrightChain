/**
 * Feature: brightchain-vfs-explorer, Property 18: 5xx errors trigger exponential backoff retries
 *
 * For any HTTP 5xx response, the ApiClient should retry up to 2 times.
 * The delay before retry k (1-indexed) should be at least
 * `baseRetryDelayMs * 2^(k-1)`.
 *
 * We test this by generating arbitrary baseRetryDelayMs values (10–500) and
 * 5xx status codes (500–504), mocking `globalThis.fetch` to always return
 * the generated 5xx status, spying on `client.delay` to capture delay
 * arguments, and verifying:
 *   1. `fetch` called 3 times (1 initial + 2 retries)
 *   2. `delay` called 2 times
 *   3. First delay  = baseRetryDelayMs * 2^0 = baseRetryDelayMs
 *   4. Second delay = baseRetryDelayMs * 2^1 = baseRetryDelayMs * 2
 *
 * **Validates: Requirements 14.3**
 */

import fc from 'fast-check';
import { ApiClient, ApiError } from '../../api/api-client';
import type { AuthManager } from '../../auth/auth-manager';
import type { SettingsManager } from '../../services/settings-manager';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary base retry delay in milliseconds (10–500). */
const arbBaseDelayMs = fc.integer({ min: 10, max: 500 });

/** Arbitrary 5xx status codes (500–504). */
const arbStatusCode = fc.integer({ min: 500, max: 504 });

/** Arbitrary API path segments. */
const arbPath: fc.Arbitrary<string> = fc
  .tuple(
    fc.constantFrom(
      '/files',
      '/folders',
      '/upload',
      '/api/user',
      '/files/search',
    ),
    fc.option(fc.uuid(), { nil: undefined }),
  )
  .map(([base, id]) => (id ? `${base}/${id}` : base));

/** Arbitrary HTTP methods. */
const arbMethod = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE');

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 18: 5xx errors trigger exponential backoff retries', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('retries 2 times with exponential backoff delays on 5xx errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBaseDelayMs,
        arbStatusCode,
        arbPath,
        arbMethod,
        async (baseDelayMs, statusCode, path, method) => {
          // Mock AuthManager
          const mockAuth = {
            getToken: jest.fn().mockResolvedValue('fake-jwt-token'),
            handleUnauthorized: jest.fn().mockResolvedValue(undefined),
          } as unknown as AuthManager;

          // Mock SettingsManager
          const mockSettings = {
            apiHostUrl: 'https://brightchain.org',
          } as unknown as SettingsManager;

          // Mock fetch to always return the generated 5xx status
          const fetchSpy = jest.fn().mockResolvedValue({
            status: statusCode,
            ok: false,
            headers: new Headers(),
            text: async () => `Server Error ${statusCode}`,
          } as unknown as Response);
          globalThis.fetch = fetchSpy;

          const client = new ApiClient(mockSettings, mockAuth, baseDelayMs);

          // Spy on delay to avoid real waits and capture arguments
          const delaySpy = jest
            .spyOn(client, 'delay')
            .mockResolvedValue(undefined);

          // Act: request should throw after exhausting retries
          let thrownError: unknown;
          try {
            await client.request(method, path);
          } catch (err) {
            thrownError = err;
          }

          // Verify it throws an ApiError with the correct status
          expect(thrownError).toBeInstanceOf(ApiError);
          expect((thrownError as ApiError).statusCode).toBe(statusCode);

          // 1. fetch called 3 times (1 initial + 2 retries)
          expect(fetchSpy).toHaveBeenCalledTimes(3);

          // 2. delay called 2 times (once before each retry)
          expect(delaySpy).toHaveBeenCalledTimes(2);

          // 3. First delay = baseDelayMs * 2^0 = baseDelayMs
          expect(delaySpy).toHaveBeenNthCalledWith(1, baseDelayMs);

          // 4. Second delay = baseDelayMs * 2^1 = baseDelayMs * 2
          expect(delaySpy).toHaveBeenNthCalledWith(2, baseDelayMs * 2);

          // Cleanup
          client.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });
});
