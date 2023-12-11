/**
 * @fileoverview Property-based tests for exponential back-off calculation
 *
 * **Feature: email-gateway**
 *
 * This test suite verifies:
 * - Property 4: Back-off delay is baseInterval × 2^retryCount ± 25% jitter
 *
 * **Validates: Requirements 3.2**
 */

import fc from 'fast-check';
import { computeBackoffDelay } from './retryBackoff';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Base interval in ms: 1–100000 */
const arbBaseInterval = fc.integer({ min: 1, max: 100_000 });

/** Retry count: 0–10 */
const arbRetryCount = fc.integer({ min: 0, max: 10 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Exponential Back-Off Calculation Property Tests', () => {
  describe('Property 4: Back-off delay is baseInterval × 2^retryCount ± 25% jitter', () => {
    /**
     * **Feature: email-gateway, Property 4: Back-off delay bounds**
     *
     * *For any* baseInterval (1–100000) and retryCount (0–10),
     * computeBackoffDelay returns a value >= baseInterval × 2^retryCount
     * (the delay is always at least the base delay — no negative jitter).
     *
     * **Validates: Requirements 3.2**
     */
    it('should always return a delay >= baseInterval × 2^retryCount (no negative jitter)', () => {
      fc.assert(
        fc.property(arbBaseInterval, arbRetryCount, (base, retry) => {
          const delay = computeBackoffDelay(base, retry);
          const expectedMin = base * Math.pow(2, retry);
          expect(delay).toBeGreaterThanOrEqual(expectedMin);
        }),
        { numRuns: 1000 },
      );
    });

    /**
     * *For any* baseInterval (1–100000) and retryCount (0–10),
     * computeBackoffDelay returns a value <= baseInterval × 2^retryCount × 1.25
     * (max 25% jitter above the base delay).
     *
     * **Validates: Requirements 3.2**
     */
    it('should always return a delay <= baseInterval × 2^retryCount × 1.25 (max 25% jitter)', () => {
      fc.assert(
        fc.property(arbBaseInterval, arbRetryCount, (base, retry) => {
          const delay = computeBackoffDelay(base, retry);
          const expectedMax = base * Math.pow(2, retry) * 1.25;
          expect(delay).toBeLessThanOrEqual(expectedMax);
        }),
        { numRuns: 1000 },
      );
    });

    /**
     * *For any* baseInterval and retryCount, when the random function
     * returns 0 the delay equals exactly baseInterval × 2^retryCount
     * (zero jitter boundary).
     *
     * **Validates: Requirements 3.2**
     */
    it('should return exactly baseInterval × 2^retryCount when jitter is 0', () => {
      fc.assert(
        fc.property(arbBaseInterval, arbRetryCount, (base, retry) => {
          const delay = computeBackoffDelay(base, retry, () => 0);
          const expected = base * Math.pow(2, retry);
          expect(delay).toBe(expected);
        }),
        { numRuns: 1000 },
      );
    });

    /**
     * *For any* baseInterval and retryCount, when the random function
     * returns 1 the delay equals exactly baseInterval × 2^retryCount × 1.25
     * (maximum jitter boundary).
     *
     * **Validates: Requirements 3.2**
     */
    it('should return exactly baseInterval × 2^retryCount × 1.25 when jitter is max', () => {
      fc.assert(
        fc.property(arbBaseInterval, arbRetryCount, (base, retry) => {
          const delay = computeBackoffDelay(base, retry, () => 1);
          const expected = base * Math.pow(2, retry) * 1.25;
          expect(delay).toBe(expected);
        }),
        { numRuns: 1000 },
      );
    });
  });
});
