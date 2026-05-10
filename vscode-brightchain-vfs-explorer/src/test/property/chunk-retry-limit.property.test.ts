/**
 * Feature: brightchain-vfs-explorer, Property 16: Chunk upload retries do not exceed maximum
 *
 * For any sequence of chunk upload failures, the ApiClient should retry
 * each failed chunk at most 3 times before propagating the error.
 *
 * We test this by generating arbitrary session IDs, chunk indices, and data,
 * mocking `globalThis.fetch` to always return 500 errors, mocking
 * `ApiClient.delay` to avoid real waits, and verifying that:
 *   1. `uploadChunk` throws an `ApiError`
 *   2. `fetch` was called exactly 4 times (1 initial + 3 retries)
 *
 * **Validates: Requirements 7.6, 14.3**
 */

import fc from 'fast-check';
import { ApiClient, ApiError } from '../../api/api-client';
import type { AuthManager } from '../../auth/auth-manager';
import type { SettingsManager } from '../../services/settings-manager';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Arbitrary session IDs (UUID-like strings). */
const arbSessionId = fc.uuid();

/** Arbitrary chunk indices (non-negative integers). */
const arbChunkIndex = fc.nat({ max: 999 });

/** Arbitrary chunk data (small Uint8Arrays). */
const arbChunkData = fc
  .uint8Array({ minLength: 1, maxLength: 64 })
  .map((arr) => new Uint8Array(arr));

/** Arbitrary checksum strings (hex-like). */
const arbChecksum: fc.Arbitrary<string> = fc
  .array(fc.constantFrom(...'0123456789abcdef'.split('')), {
    minLength: 8,
    maxLength: 64,
  })
  .map((chars) => chars.join(''));

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

describe('Property 16: Chunk upload retries do not exceed maximum', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('uploadChunk retries at most 3 times on 500 errors then throws ApiError', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbSessionId,
        arbChunkIndex,
        arbChunkData,
        arbChecksum,
        async (sessionId, chunkIndex, data, checksum) => {
          // Mock AuthManager
          const mockAuth = {
            getToken: jest.fn().mockResolvedValue('fake-jwt-token'),
            handleUnauthorized: jest.fn().mockResolvedValue(undefined),
          } as unknown as AuthManager;

          // Mock SettingsManager
          const mockSettings = {
            apiHostUrl: 'https://brightchain.org',
          } as unknown as SettingsManager;

          // Mock fetch to always return 500
          const fetchSpy = jest.fn().mockResolvedValue({
            status: 500,
            ok: false,
            headers: new Headers(),
            text: async () => 'Internal Server Error',
          } as unknown as Response);
          globalThis.fetch = fetchSpy;

          const client = new ApiClient(mockSettings, mockAuth, 0);

          // Mock delay to avoid real waits
          jest.spyOn(client, 'delay').mockResolvedValue(undefined);

          // Act & Assert: uploadChunk should throw ApiError
          let thrownError: unknown;
          try {
            await client.uploadChunk(sessionId, chunkIndex, data, checksum);
          } catch (err) {
            thrownError = err;
          }

          // Verify it throws an ApiError with a 500 status
          expect(thrownError).toBeInstanceOf(ApiError);
          expect((thrownError as ApiError).statusCode).toBe(500);

          // Verify fetch was called exactly 4 times (1 initial + 3 retries)
          expect(fetchSpy).toHaveBeenCalledTimes(4);

          // Cleanup
          client.dispose();
        },
      ),
      { numRuns: 100 },
    );
  });
});
