/**
 * Property-Based Tests for CircuitBreaker
 *
 * Feature: proof-of-useful-work-ratelimit, Property 19: Circuit Breaker Activation
 *
 * For any sequence of consecutive work coordinator failures, the circuit breaker
 * SHALL transition to the open state if and only if the number of consecutive
 * failures meets or exceeds the configured threshold.
 *
 * **Validates: Requirements 13.3**
 */

import * as fc from 'fast-check';
import { CircuitBreaker } from '../circuitBreaker';

describe('CircuitBreaker Property Tests', () => {
  /**
   * Property 19: Circuit Breaker Activation
   *
   * **Validates: Requirements 13.3**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 19: Circuit Breaker Activation', () => {
    it('circuit opens iff consecutive failures >= threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 20 }), // threshold
          fc.integer({ min: 1000, max: 60000 }), // probeIntervalMs
          (threshold, probeIntervalMs) => {
            const cb = new CircuitBreaker(threshold, probeIntervalMs);

            // Record exactly (threshold - 1) failures — circuit should NOT be open
            for (let i = 0; i < threshold - 1; i++) {
              cb.recordFailure();
              expect(cb.isOpen).toBe(false);
            }

            // Record one more failure — circuit SHOULD be open
            cb.recordFailure();
            expect(cb.isOpen).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('success resets failure count so circuit stays closed', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }), // threshold
          fc.integer({ min: 1000, max: 60000 }), // probeIntervalMs
          fc.integer({ min: 1, max: 19 }), // failuresBeforeReset (will be clamped to < threshold)
          (threshold, probeIntervalMs, rawFailures) => {
            const failuresBeforeReset = Math.min(rawFailures, threshold - 1);
            const cb = new CircuitBreaker(threshold, probeIntervalMs);

            // Record some failures (less than threshold)
            for (let i = 0; i < failuresBeforeReset; i++) {
              cb.recordFailure();
            }
            expect(cb.isOpen).toBe(false);

            // Success resets the counter
            cb.recordSuccess();
            expect(cb.isOpen).toBe(false);

            // Record failures again (less than threshold) — circuit should stay closed
            for (let i = 0; i < failuresBeforeReset; i++) {
              cb.recordFailure();
            }
            expect(cb.isOpen).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('mixed success/failure sequences: isOpen matches consecutiveFailures >= threshold', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 15 }), // threshold
          fc.integer({ min: 1000, max: 60000 }), // probeIntervalMs
          fc.array(fc.boolean(), { minLength: 1, maxLength: 50 }), // true = success, false = failure
          (threshold, probeIntervalMs, actions) => {
            const cb = new CircuitBreaker(threshold, probeIntervalMs);
            let consecutiveFailures = 0;

            for (const isSuccess of actions) {
              if (isSuccess) {
                cb.recordSuccess();
                consecutiveFailures = 0;
              } else {
                cb.recordFailure();
                consecutiveFailures++;
              }

              const expectedOpen = consecutiveFailures >= threshold;
              expect(cb.isOpen).toBe(expectedOpen);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
