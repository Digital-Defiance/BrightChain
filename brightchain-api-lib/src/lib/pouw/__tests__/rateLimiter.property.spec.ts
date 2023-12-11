/**
 * Property-Based Tests for SlidingWindowRateLimiter
 *
 * Feature: proof-of-useful-work-ratelimit, Property 1: Sliding Window Rate Limiting
 *
 * Property 1: Sliding Window Rate Limiting
 * For any sequence of request timestamps from a single client, the rate limiter
 * reports the client as rate-limited if and only if the number of requests within
 * the most recent sliding window exceeds the configured threshold.
 *
 * **Validates: Requirements 1.1, 1.2**
 */

import * as fc from 'fast-check';
import { SlidingWindowRateLimiter } from '../rateLimiter';

describe('SlidingWindowRateLimiter Property Tests', () => {
  /**
   * Property 1: Sliding Window Rate Limiting
   *
   * For any sequence of request timestamps, the rate limiter reports
   * rate-limited iff requests within the sliding window exceed the threshold.
   *
   * **Validates: Requirements 1.1, 1.2**
   */
  describe('Property 1: Sliding Window Rate Limiting', () => {
    it('allows exactly `limit` requests and denies subsequent ones within the same window', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }), // limit
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          fc.integer({ min: 1, max: 200 }), // requestCount
          (limit, windowMs, requestCount) => {
            const limiter = new SlidingWindowRateLimiter(limit, windowMs);
            const clientId = 'test-client';

            let allowedCount = 0;
            let deniedCount = 0;

            for (let i = 0; i < requestCount; i++) {
              const result = limiter.checkRate(clientId);
              if (result.allowed) {
                allowedCount++;
              } else {
                deniedCount++;
              }
            }

            // The first `limit` requests should be allowed
            const expectedAllowed = Math.min(requestCount, limit);
            const expectedDenied = Math.max(0, requestCount - limit);

            expect(allowedCount).toBe(expectedAllowed);
            expect(deniedCount).toBe(expectedDenied);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('allows requests again after clearing state', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }), // limit
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          fc.integer({ min: 1, max: 100 }), // requestCount (enough to exhaust limit)
          (limit, windowMs, requestCount) => {
            const limiter = new SlidingWindowRateLimiter(limit, windowMs);
            const clientId = 'test-client';

            // Exhaust the limit
            const totalFirst = limit + requestCount;
            for (let i = 0; i < totalFirst; i++) {
              limiter.checkRate(clientId);
            }

            // Verify the client is now rate-limited
            const beforeClear = limiter.checkRate(clientId);
            expect(beforeClear.allowed).toBe(false);

            // Clear state
            limiter.clear();

            // After clearing, the first request should be allowed again
            const afterClear = limiter.checkRate(clientId);
            expect(afterClear.allowed).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('reports accurate remaining count after N allowed requests (N < limit)', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 50 }), // limit (at least 2 so we can send fewer)
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          (limit, windowMs) => {
            // Pick a random N < limit
            return fc.assert(
              fc.property(
                fc.integer({ min: 1, max: limit - 1 }), // N requests to send (less than limit)
                (n) => {
                  const limiter = new SlidingWindowRateLimiter(limit, windowMs);
                  const clientId = 'test-client';

                  let lastResult;
                  for (let i = 0; i < n; i++) {
                    lastResult = limiter.checkRate(clientId);
                    expect(lastResult.allowed).toBe(true);
                  }

                  // After N allowed requests, remaining should be limit - N
                  expect(lastResult!.remaining).toBe(limit - n);
                },
              ),
              { numRuns: 10 },
            );
          },
        ),
        { numRuns: 100 },
      );
    });

    it('enforces per-route isolation: requests to different routes have independent limits', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 30 }), // limit
          fc.integer({ min: 1000, max: 60000 }), // windowMs
          fc.integer({ min: 1, max: 100 }), // requestsPerRoute
          (limit, windowMs, requestsPerRoute) => {
            const limiter = new SlidingWindowRateLimiter(limit, windowMs);
            const clientId = 'test-client';
            const routeA = '/api/route-a';
            const routeB = '/api/route-b';

            // Send requests to route A
            let routeAAllowed = 0;
            for (let i = 0; i < requestsPerRoute; i++) {
              const result = limiter.checkRate(clientId, routeA);
              if (result.allowed) routeAAllowed++;
            }

            // Send requests to route B — should have its own independent limit
            let routeBAllowed = 0;
            for (let i = 0; i < requestsPerRoute; i++) {
              const result = limiter.checkRate(clientId, routeB);
              if (result.allowed) routeBAllowed++;
            }

            // Both routes should independently allow up to `limit` requests
            const expectedAllowed = Math.min(requestsPerRoute, limit);
            expect(routeAAllowed).toBe(expectedAllowed);
            expect(routeBAllowed).toBe(expectedAllowed);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
