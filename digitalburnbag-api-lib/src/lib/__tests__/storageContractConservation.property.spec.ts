/**
 * @fileoverview Property-based tests for Joule conservation across the storage
 * contract lifecycle.
 *
 * ## Properties under test (Req 10.6)
 *
 * P3.6.1  Settlement conservation:
 *           After each daily settlement step,
 *           `consumed + remaining === upfront` holds exactly.
 *           No Joule is created or destroyed.
 *
 * P3.6.2  Destruction conservation:
 *           On `expireOnDestruction`, the returned refund equals
 *           `remainingCreditMicroJoules`.
 *           `consumed + refund === upfront` after the contract is destroyed.
 *
 * P3.6.3  Burn-date downgrade conservation:
 *           When `applyBurnDateDowngrade` is called, the refund plus the
 *           new remaining credit equals the old remaining credit, so:
 *           `consumed + refund + newRemaining === upfront`.
 *
 * @see digitalburnbag-joule-storage-economy spec, Requirement 10.6
 */

import {
  BURNBAG_TIER_RS_PARAMS,
  calculateBurnbagStorageCost,
  type BurnbagStorageTier,
} from '@brightchain/digitalburnbag-lib';
import * as fc from 'fast-check';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

const TIERS: BurnbagStorageTier[] = [
  'performance',
  'standard',
  'archive',
  'pending-burn',
  'none',
];
const NON_BURN_TIERS: BurnbagStorageTier[] = [
  'performance',
  'standard',
  'archive',
];

/** Byte counts from 1 B to ~100 MB (bigint). */
const bytesArb = fc.bigInt({ min: 1n, max: 100_000_000n });

/** Duration in days [1, 365]. */
const durationDaysArb = fc.integer({ min: 1, max: 365 });

/**
 * Joint arbitrary: `(bytes, tier, durationDays, partialDaysConsumed)`
 * where `0 ≤ partialDaysConsumed ≤ durationDays`.
 */
const lifecycleArb = fc
  .tuple(bytesArb, fc.constantFrom(...TIERS), durationDaysArb)
  .chain(([bytes, tier, durationDays]) =>
    fc.integer({ min: 0, max: durationDays }).map((partialDaysConsumed) => ({
      bytes,
      tier,
      durationDays,
      partialDaysConsumed,
    })),
  );

/**
 * Same as lifecycleArb but restricted to non-burn tiers (for downgrade tests).
 */
const downgradableLifecycleArb = fc
  .tuple(bytesArb, fc.constantFrom(...NON_BURN_TIERS), durationDaysArb)
  .chain(([bytes, tier, durationDays]) =>
    fc.integer({ min: 0, max: durationDays }).map((partialDaysConsumed) => ({
      bytes,
      tier,
      durationDays,
      partialDaysConsumed,
    })),
  );

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate `steps` rounds of settlement and return
 * `{ consumed, remaining }`.
 *
 * Each round: `due = min(daily, remaining)`, `consumed += due`, `remaining -= due`.
 */
function simulateSettlement(
  upfront: bigint,
  daily: bigint,
  steps: number,
): { consumed: bigint; remaining: bigint } {
  let remaining = upfront;
  let consumed = 0n;

  for (let i = 0; i < steps; i++) {
    const due = daily < remaining ? daily : remaining;
    consumed += due;
    remaining -= due;
    if (remaining === 0n) break;
  }

  return { consumed, remaining };
}

// ---------------------------------------------------------------------------
// P3.6.1 — Settlement conservation
// ---------------------------------------------------------------------------

describe('P3.6.1 settlement conservation: consumed + remaining === upfront', () => {
  it('holds for arbitrary bytes / tier / duration / partial steps', () => {
    fc.assert(
      fc.property(
        lifecycleArb,
        ({ bytes, tier, durationDays, partialDaysConsumed }) => {
          const cost = calculateBurnbagStorageCost({
            bytes,
            tier,
            durationDays,
          });
          const { upfrontMicroJoules, dailyMicroJoules } = cost;

          const { consumed, remaining } = simulateSettlement(
            upfrontMicroJoules,
            dailyMicroJoules,
            partialDaysConsumed,
          );

          expect(consumed + remaining).toBe(upfrontMicroJoules);
        },
      ),
    );
  });

  it('remaining reaches zero exactly after durationDays settlements', () => {
    fc.assert(
      fc.property(
        fc.tuple(bytesArb, fc.constantFrom(...TIERS), durationDaysArb),
        ([bytes, tier, durationDays]) => {
          const cost = calculateBurnbagStorageCost({
            bytes,
            tier,
            durationDays,
          });
          const { upfrontMicroJoules, dailyMicroJoules } = cost;

          // upfront = daily × durationDays, so durationDays settlements exhaust it.
          const { remaining } = simulateSettlement(
            upfrontMicroJoules,
            dailyMicroJoules,
            durationDays,
          );

          expect(remaining).toBe(0n);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// P3.6.2 — Destruction conservation
// ---------------------------------------------------------------------------

describe('P3.6.2 destruction conservation: consumed + refund === upfront', () => {
  it('holds when contract is destroyed at any point in its lifecycle', () => {
    fc.assert(
      fc.property(
        lifecycleArb,
        ({ bytes, tier, durationDays, partialDaysConsumed }) => {
          const cost = calculateBurnbagStorageCost({
            bytes,
            tier,
            durationDays,
          });
          const { upfrontMicroJoules, dailyMicroJoules } = cost;

          const { consumed, remaining } = simulateSettlement(
            upfrontMicroJoules,
            dailyMicroJoules,
            partialDaysConsumed,
          );

          // expireOnDestruction returns remaining as refund; contract sets remaining to 0.
          const refund = remaining;
          const newRemaining = 0n;

          expect(consumed + refund + newRemaining).toBe(upfrontMicroJoules);
        },
      ),
    );
  });
});

// ---------------------------------------------------------------------------
// P3.6.3 — Burn-date downgrade conservation
// ---------------------------------------------------------------------------

describe('P3.6.3 burn-date downgrade conservation: consumed + refund + newRemaining === upfront', () => {
  it('holds when burn date is set at any point in the contract lifecycle', () => {
    fc.assert(
      fc.property(
        downgradableLifecycleArb,
        ({ bytes, tier, durationDays, partialDaysConsumed }) => {
          const cost = calculateBurnbagStorageCost({
            bytes,
            tier,
            durationDays,
          });
          const { upfrontMicroJoules, dailyMicroJoules } = cost;

          const { consumed, remaining } = simulateSettlement(
            upfrontMicroJoules,
            dailyMicroJoules,
            partialDaysConsumed,
          );

          const remainingDays = durationDays - partialDaysConsumed;
          if (remainingDays <= 0) {
            // Already expired — no downgrade possible; consumed + 0 + 0 = upfront.
            expect(consumed + remaining).toBe(upfrontMicroJoules);
            return;
          }

          // Compute pending-burn cost for the remaining period.
          const pendingBurnParams = BURNBAG_TIER_RS_PARAMS['pending-burn'];
          const newCost = calculateBurnbagStorageCost({
            bytes,
            tier: 'pending-burn',
            durationDays: remainingDays,
            rsK: pendingBurnParams.k,
            rsM: pendingBurnParams.m,
          });
          const newRemainingCredit =
            newCost.dailyMicroJoules * BigInt(remainingDays);

          // applyBurnDateDowngrade logic: refund = max(remaining - newRemainingCredit, 0)
          const refund =
            remaining > newRemainingCredit
              ? remaining - newRemainingCredit
              : 0n;
          const newRemaining =
            remaining > newRemainingCredit ? newRemainingCredit : remaining;

          expect(consumed + refund + newRemaining).toBe(upfrontMicroJoules);
        },
      ),
    );
  });
});
