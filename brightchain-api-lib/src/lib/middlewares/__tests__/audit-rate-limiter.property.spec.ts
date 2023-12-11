/**
 * Property-Based Tests for AuditRateLimiter
 *
 * Feature: vault-access-audit-logging
 *
 * Property 6: Rate limiter enforces window limits
 * Property 7: Rate limiter skipped counter accuracy
 */

import * as fc from 'fast-check';
import { AuditRateLimiter } from '../audit-rate-limiter';

describe('AuditRateLimiter Property Tests', () => {
  /**
   * Property 6: Rate limiter enforces window limits
   *
   * For any sequence of N requests with maxEntries = M and windowMs = W,
   * the number of entries written within any window of duration W does not
   * exceed M. When no rate limit is configured, every request produces an entry.
   *
   * **Validates: Requirements 10.1, 10.2, 10.4**
   */
  describe('Property 6: Rate limiter enforces window limits', () => {
    it('never allows more than maxEntries writes within a single window', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 100 }), // maxEntries
          fc.integer({ min: 1, max: 500 }), // requestCount
          (maxEntries, requestCount) => {
            const limiter = new AuditRateLimiter();
            const routeKey = '/test-route';
            // Use a large window so all requests fall within it
            const windowMs = 60_000;

            let acquiredCount = 0;
            for (let i = 0; i < requestCount; i++) {
              if (limiter.tryAcquire(routeKey, maxEntries, windowMs)) {
                acquiredCount++;
              }
            }

            // The number of acquired entries should never exceed maxEntries
            expect(acquiredCount).toBeLessThanOrEqual(maxEntries);
            // And should be exactly min(requestCount, maxEntries)
            expect(acquiredCount).toBe(Math.min(requestCount, maxEntries));
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 7: Rate limiter skipped counter accuracy
   *
   * For any sequence where K requests are skipped, the next written entry
   * reports skippedEntries = K and the counter resets to 0.
   *
   * **Validates: Requirements 10.3**
   */
  describe('Property 7: Rate limiter skipped counter accuracy', () => {
    it('reports the exact number of skipped entries and resets to 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 50 }), // maxEntries
          fc.integer({ min: 1, max: 200 }), // totalRequests
          (maxEntries, totalRequests) => {
            const limiter = new AuditRateLimiter();
            const routeKey = '/test-route';
            const windowMs = 60_000;

            let skippedSinceLastWrite = 0;

            for (let i = 0; i < totalRequests; i++) {
              const acquired = limiter.tryAcquire(
                routeKey,
                maxEntries,
                windowMs,
              );
              if (acquired) {
                // On a successful write, check the skipped count
                const reported = limiter.getAndResetSkipped(routeKey);
                expect(reported).toBe(skippedSinceLastWrite);

                // After getAndResetSkipped, counter should be 0
                const afterReset = limiter.getAndResetSkipped(routeKey);
                expect(afterReset).toBe(0);

                skippedSinceLastWrite = 0;
              } else {
                skippedSinceLastWrite++;
              }
            }

            // If there are remaining skipped entries, verify they're tracked
            if (skippedSinceLastWrite > 0) {
              const finalSkipped = limiter.getAndResetSkipped(routeKey);
              expect(finalSkipped).toBe(skippedSinceLastWrite);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
