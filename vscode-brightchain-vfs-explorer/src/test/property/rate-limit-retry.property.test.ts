/**
 * Feature: brightchain-vfs-explorer, Property 17: Rate-limit (429) respects Retry-After header
 *
 * For any HTTP 429 response with a `Retry-After` header value of `N` seconds,
 * the ApiClient should wait at least `N * 1000` milliseconds before retrying
 * the request.
 *
 * We test this by generating arbitrary Retry-After values (integers 1–30),
 * mocking `globalThis.fetch` to return 429 first then 200, spying on
 * `client.delay`, and verifying it was called with `N * 1000`.
 *
 * **Validates: Requirements 14.2**
 */

import fc from 'fast-check';
import { ApiClient } from '../../api/api-client';
import type { AuthManager } from '../../auth/auth-manager';
import type { SettingsManager } from '../../services/settings-manager';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary Retry-After header values in seconds (integers 1–30). */
const arbRetryAfterSeconds = fc.integer({ min: 1, max: 30 });

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

describe('Property 17: Rate-limit (429) respects Retry-After header', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('waits N * 1000 ms when 429 response has Retry-After: N', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbRetryAfterSeconds,
        arbPath,
        arbMethod,
        async (retryAfterSec, path, method) => {
          // Mock AuthManager
          const mockAuth = {
            getToken: jest.fn().mockResolvedValue('fake-jwt-token'),
            handleUnauthorized: jest.fn().mockResolvedValue(undefined),
          } as unknown as AuthManager;

          // Mock SettingsManager
          const mockSettings = {
            apiHostUrl: 'https://brightchain.org',
          } as unknown as SettingsManager;

          // First call returns 429 with Retry-After header, second returns 200
          let callCount = 0;
          const fetchSpy = jest.fn().mockImplementation(async () => {
            callCount++;
            if (callCount === 1) {
              return {
                status: 429,
                ok: false,
                headers: new Headers({ 'Retry-After': String(retryAfterSec) }),
                text: async () => 'Too Many Requests',
              } as unknown as Response;
            }
            return {
              status: 200,
              ok: true,
              headers: new Headers(),
              json: async () => ({ ok: true }),
            } as unknown as Response;
          });
          globalThis.fetch = fetchSpy;

          const client = new ApiClient(mockSettings, mockAuth, 0);

          // Spy on delay to avoid real waits and capture the argument
          const delaySpy = jest
            .spyOn(client, 'delay')
            .mockResolvedValue(undefined);

          // Act
          await client.request(method, path);

          // Assert: delay was called with exactly N * 1000
          expect(delaySpy).toHaveBeenCalledTimes(1);
          expect(delaySpy).toHaveBeenCalledWith(retryAfterSec * 1000);

          // Assert: fetch was called twice (1 × 429, 1 × 200)
          expect(fetchSpy).toHaveBeenCalledTimes(2);

          // Cleanup
          client.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });
});
