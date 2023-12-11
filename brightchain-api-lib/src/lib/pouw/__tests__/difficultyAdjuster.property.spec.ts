/**
 * Property-Based Tests for DifficultyAdjuster
 *
 * Feature: proof-of-useful-work-ratelimit, Property 6: Difficulty Adjustment Monotonicity and Bounds
 *
 * For any client, the difficulty tier SHALL be monotonically non-decreasing with
 * consecutive violations within the escalation window, monotonically non-increasing
 * after cool-down periods without violations, and SHALL never exceed the configured
 * maximum difficulty cap nor fall below the default difficulty.
 *
 * **Validates: Requirements 5.1, 5.2, 5.4, 5.5**
 */

import { DifficultyTier } from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { DifficultyAdjuster } from '../difficultyAdjuster';

/**
 * Ordered difficulty tiers from lowest to highest.
 */
const TIER_ORDER = [
  DifficultyTier.Low,
  DifficultyTier.Medium,
  DifficultyTier.High,
];

/**
 * Returns the numeric index of a tier in the ordered tier list.
 * Higher index = harder difficulty.
 */
function tierIndex(tier: DifficultyTier): number {
  return TIER_ORDER.indexOf(tier);
}

describe('DifficultyAdjuster Property Tests', () => {
  /**
   * Property 6: Difficulty Adjustment Monotonicity and Bounds
   *
   * **Validates: Requirements 5.1, 5.2, 5.4, 5.5**
   */
  describe('Feature: proof-of-useful-work-ratelimit, Property 6: Difficulty Adjustment Monotonicity and Bounds', () => {
    it('difficulty is monotonically non-decreasing with consecutive violations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 20 }), // number of violations
          (violationCount) => {
            const adjuster = new DifficultyAdjuster({
              defaultDifficulty: DifficultyTier.Low,
              maxDifficulty: DifficultyTier.High,
              escalationWindowMs: 300_000, // 5 minutes — large enough that all violations are within window
              coolDownMs: 600_000,
              reputationDifficultyThreshold: 0.7,
              reputationExemptionThreshold: 0.95,
            });

            const clientId = 'test-client';
            let previousTier = adjuster.getDifficulty(clientId);

            for (let i = 0; i < violationCount; i++) {
              const currentTier = adjuster.recordViolation(clientId);
              // Difficulty should never decrease during consecutive violations
              expect(tierIndex(currentTier)).toBeGreaterThanOrEqual(
                tierIndex(previousTier),
              );
              previousTier = currentTier;
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('difficulty never exceeds max difficulty after many violations', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 10, max: 50 }), // number of violations
          (violationCount) => {
            const adjuster = new DifficultyAdjuster({
              defaultDifficulty: DifficultyTier.Low,
              maxDifficulty: DifficultyTier.High,
              escalationWindowMs: 300_000,
              coolDownMs: 600_000,
              reputationDifficultyThreshold: 0.7,
              reputationExemptionThreshold: 0.95,
            });

            const clientId = 'test-client';
            const maxIndex = tierIndex(DifficultyTier.High);

            for (let i = 0; i < violationCount; i++) {
              const currentTier = adjuster.recordViolation(clientId);
              // Difficulty should never exceed the configured max
              expect(tierIndex(currentTier)).toBeLessThanOrEqual(maxIndex);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('difficulty never falls below default difficulty after de-escalation', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // violations to escalate
          fc.integer({ min: 2, max: 10 }), // completions to de-escalate
          (violationCount, completionCount) => {
            const coolDownMs = 1000;
            const adjuster = new DifficultyAdjuster({
              defaultDifficulty: DifficultyTier.Low,
              maxDifficulty: DifficultyTier.High,
              escalationWindowMs: 300_000,
              coolDownMs,
              reputationDifficultyThreshold: 0.7,
              reputationExemptionThreshold: 0.95,
            });

            const clientId = 'test-client';
            const defaultIndex = tierIndex(DifficultyTier.Low);

            // Escalate via violations
            for (let i = 0; i < violationCount; i++) {
              adjuster.recordViolation(clientId);
            }

            // De-escalate via completions with time advancing past coolDownMs
            const originalDateNow = Date.now;
            let currentTime = originalDateNow.call(Date);

            try {
              for (let i = 0; i < completionCount; i++) {
                // Advance time past cool-down period
                currentTime += coolDownMs + 1;
                Date.now = () => currentTime;
                adjuster.recordCompletion(clientId);

                // Difficulty should never fall below default
                const currentTier = adjuster.getDifficulty(clientId);
                expect(tierIndex(currentTier)).toBeGreaterThanOrEqual(
                  defaultIndex,
                );
              }
            } finally {
              Date.now = originalDateNow;
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('difficulty is monotonically non-increasing after cool-down completions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 4, max: 15 }), // violations to escalate to high tier
          fc.integer({ min: 2, max: 10 }), // completions to de-escalate
          (violationCount, completionCount) => {
            const coolDownMs = 1000;
            const adjuster = new DifficultyAdjuster({
              defaultDifficulty: DifficultyTier.Low,
              maxDifficulty: DifficultyTier.High,
              escalationWindowMs: 300_000,
              coolDownMs,
              reputationDifficultyThreshold: 0.7,
              reputationExemptionThreshold: 0.95,
            });

            const clientId = 'test-client';

            // Escalate via violations
            for (let i = 0; i < violationCount; i++) {
              adjuster.recordViolation(clientId);
            }

            // Record the tier after escalation
            let previousTier = adjuster.getDifficulty(clientId);

            // De-escalate via completions with time advancing past coolDownMs each time
            const originalDateNow = Date.now;
            let currentTime = originalDateNow.call(Date);

            try {
              for (let i = 0; i < completionCount; i++) {
                // Advance time past cool-down period
                currentTime += coolDownMs + 1;
                Date.now = () => currentTime;
                adjuster.recordCompletion(clientId);

                const currentTier = adjuster.getDifficulty(clientId);
                // Difficulty should never increase during cool-down completions
                expect(tierIndex(currentTier)).toBeLessThanOrEqual(
                  tierIndex(previousTier),
                );
                previousTier = currentTier;
              }
            } finally {
              Date.now = originalDateNow;
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Reputation-Based Difficulty Scaling Properties
   *
   * For any client with reputation >= threshold, the effective difficulty
   * is <= the base difficulty. For any client with reputation >= exemption
   * threshold, exempt is true.
   */
  describe('Reputation-Based Difficulty Scaling', () => {
    it('reputation reduces effective difficulty: effective tier <= base tier when reputation >= threshold', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.7, max: 0.94, noNaN: true }), // reputation above difficulty threshold but below exemption
          fc.integer({ min: 2, max: 10 }), // violations to escalate
          (reputationScore, violationCount) => {
            const adjuster = new DifficultyAdjuster({
              defaultDifficulty: DifficultyTier.Low,
              maxDifficulty: DifficultyTier.High,
              escalationWindowMs: 300_000,
              coolDownMs: 600_000,
              reputationDifficultyThreshold: 0.7,
              reputationExemptionThreshold: 0.95,
            });

            const clientId = 'rep-client';

            // Escalate via violations
            for (let i = 0; i < violationCount; i++) {
              adjuster.recordViolation(clientId);
            }

            const baseTier = adjuster.getDifficulty(clientId);
            const { tier: effectiveTier, exempt } =
              adjuster.getEffectiveDifficulty(clientId, reputationScore);

            // Effective tier should be <= base tier
            expect(tierIndex(effectiveTier)).toBeLessThanOrEqual(
              tierIndex(baseTier),
            );
            // Should not be exempt at this reputation level
            expect(exempt).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('high reputation exempts from challenges: exempt is true when reputation >= exemption threshold', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.95, max: 1.0, noNaN: true }), // reputation at or above exemption threshold
          fc.integer({ min: 0, max: 10 }), // violations (shouldn't matter)
          (reputationScore, violationCount) => {
            const adjuster = new DifficultyAdjuster({
              defaultDifficulty: DifficultyTier.Low,
              maxDifficulty: DifficultyTier.High,
              escalationWindowMs: 300_000,
              coolDownMs: 600_000,
              reputationDifficultyThreshold: 0.7,
              reputationExemptionThreshold: 0.95,
            });

            const clientId = 'exempt-client';

            // Escalate via violations
            for (let i = 0; i < violationCount; i++) {
              adjuster.recordViolation(clientId);
            }

            const { exempt } = adjuster.getEffectiveDifficulty(
              clientId,
              reputationScore,
            );

            // Should be exempt at this reputation level
            expect(exempt).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('no reputation score returns base difficulty unchanged', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 10 }), // violations
          (violationCount) => {
            const adjuster = new DifficultyAdjuster({
              defaultDifficulty: DifficultyTier.Low,
              maxDifficulty: DifficultyTier.High,
              escalationWindowMs: 300_000,
              coolDownMs: 600_000,
              reputationDifficultyThreshold: 0.7,
              reputationExemptionThreshold: 0.95,
            });

            const clientId = 'no-rep-client';

            for (let i = 0; i < violationCount; i++) {
              adjuster.recordViolation(clientId);
            }

            const baseTier = adjuster.getDifficulty(clientId);
            const { tier: effectiveTier, exempt } =
              adjuster.getEffectiveDifficulty(clientId);

            // Without reputation, effective tier should equal base tier
            expect(effectiveTier).toBe(baseTier);
            expect(exempt).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('low reputation does not reduce difficulty', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.0, max: 0.69, noNaN: true }), // reputation below threshold
          fc.integer({ min: 2, max: 10 }), // violations
          (reputationScore, violationCount) => {
            const adjuster = new DifficultyAdjuster({
              defaultDifficulty: DifficultyTier.Low,
              maxDifficulty: DifficultyTier.High,
              escalationWindowMs: 300_000,
              coolDownMs: 600_000,
              reputationDifficultyThreshold: 0.7,
              reputationExemptionThreshold: 0.95,
            });

            const clientId = 'low-rep-client';

            for (let i = 0; i < violationCount; i++) {
              adjuster.recordViolation(clientId);
            }

            const baseTier = adjuster.getDifficulty(clientId);
            const { tier: effectiveTier, exempt } =
              adjuster.getEffectiveDifficulty(clientId, reputationScore);

            // Low reputation should not change the tier
            expect(effectiveTier).toBe(baseTier);
            expect(exempt).toBe(false);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
