/**
 * Feature: brightchain-vfs-explorer, Property 10: 401 response triggers token clearance
 *
 * For any API request that returns HTTP 401, the ApiClient should invoke
 * `AuthManager.handleUnauthorized()`, which clears the stored token and
 * sets the auth state to `{ authenticated: false }`.
 *
 * We test this by generating arbitrary API paths and HTTP methods, mocking
 * `globalThis.fetch` to return 401 responses, and verifying that:
 *   1. `auth.handleUnauthorized` is called exactly once per 401
 *   2. The request throws an `ApiError` with statusCode 401
 *
 * **Validates: Requirements 4.4**
 */

import fc from 'fast-check';
import { ApiClient, ApiError } from '../../api/api-client';
import type { AuthManager } from '../../auth/auth-manager';
import type { SettingsManager } from '../../services/settings-manager';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary HTTP methods the ApiClient might use. */
const arbMethod = fc.constantFrom('GET', 'POST', 'PUT', 'DELETE', 'PATCH');

/** Arbitrary API path segments (e.g. /files/abc123/metadata). */
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
    fc.option(
      fc.constantFrom(
        '/metadata',
        '/contents',
        '/versions',
        '/path',
        '/init',
        '/finalize',
      ),
      { nil: undefined },
    ),
  )
  .map(([base, id, suffix]) => {
    let path = base;
    if (id) path += `/${id}`;
    if (suffix) path += suffix;
    return path;
  });

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 10: 401 response triggers token clearance', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('any API request returning 401 calls handleUnauthorized exactly once and throws ApiError(401)', async () => {
    await fc.assert(
      fc.asyncProperty(arbMethod, arbPath, async (method, path) => {
        // Mock AuthManager
        const mockAuth = {
          getToken: jest.fn().mockResolvedValue('fake-jwt-token'),
          handleUnauthorized: jest.fn().mockResolvedValue(undefined),
        } as unknown as AuthManager;

        // Mock SettingsManager
        const mockSettings = {
          apiHostUrl: 'https://brightchain.org',
        } as unknown as SettingsManager;

        // Mock fetch to return 401
        globalThis.fetch = jest.fn().mockResolvedValue({
          status: 401,
          ok: false,
          headers: new Headers(),
          text: async () => 'Unauthorized',
        } as unknown as Response);

        const client = new ApiClient(mockSettings, mockAuth);

        // Act & Assert: request should throw ApiError with statusCode 401
        let thrownError: unknown;
        try {
          await client.request(method, path);
        } catch (err) {
          thrownError = err;
        }

        // Verify ApiError with 401
        expect(thrownError).toBeInstanceOf(ApiError);
        expect((thrownError as ApiError).statusCode).toBe(401);

        // Verify handleUnauthorized was called exactly once
        expect(mockAuth.handleUnauthorized).toHaveBeenCalledTimes(1);

        // Verify fetch was called exactly once (no retry on 401)
        expect(globalThis.fetch).toHaveBeenCalledTimes(1);

        // Cleanup
        client.dispose();
      }),
      { numRuns: 100 },
    );
  });

  it('401 is never retried regardless of method or path', async () => {
    await fc.assert(
      fc.asyncProperty(arbMethod, arbPath, async (method, path) => {
        const mockAuth = {
          getToken: jest.fn().mockResolvedValue('some-token'),
          handleUnauthorized: jest.fn().mockResolvedValue(undefined),
        } as unknown as AuthManager;

        const mockSettings = {
          apiHostUrl: 'https://brightchain.org',
        } as unknown as SettingsManager;

        const fetchSpy = jest.fn().mockResolvedValue({
          status: 401,
          ok: false,
          headers: new Headers(),
          text: async () => '{"error":"token expired"}',
        } as unknown as Response);
        globalThis.fetch = fetchSpy;

        const client = new ApiClient(mockSettings, mockAuth);

        await expect(client.request(method, path)).rejects.toThrow(ApiError);

        // 401 must NOT be retried — fetch called exactly once
        expect(fetchSpy).toHaveBeenCalledTimes(1);

        client.dispose();
      }),
      { numRuns: 100 },
    );
  });
});
