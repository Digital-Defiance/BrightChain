import * as fc from 'fast-check';
import {
  BURNBAG_TIER_RS_PARAMS,
  type BurnbagStorageTier,
} from './burnbagDurability';
import { calculateBurnbagStorageCost } from './burnbagStorageCost';

const ALL_TIERS: BurnbagStorageTier[] = [
  'performance',
  'standard',
  'archive',
  'pending-burn',
  'none',
];

const tierArb = fc.constantFrom(...ALL_TIERS);
const bytesArb = fc.bigInt({ min: 0n, max: 1_000_000_000_000n }); // 0 – 1 TB
const durationArb = fc.integer({ min: 1, max: 3650 }); // 1 day – 10 years

describe('calculateBurnbagStorageCost — property tests', () => {
  test('determinism: same inputs always produce same output', () => {
    fc.assert(
      fc.property(
        bytesArb,
        tierArb,
        durationArb,
        (bytes, tier, durationDays) => {
          const a = calculateBurnbagStorageCost({ bytes, tier, durationDays });
          const b = calculateBurnbagStorageCost({ bytes, tier, durationDays });
          expect(a.upfrontMicroJoules).toBe(b.upfrontMicroJoules);
          expect(a.dailyMicroJoules).toBe(b.dailyMicroJoules);
        },
      ),
    );
  });

  test('upfront conservation: upfront = daily × durationDays', () => {
    fc.assert(
      fc.property(
        bytesArb,
        tierArb,
        durationArb,
        (bytes, tier, durationDays) => {
          const result = calculateBurnbagStorageCost({
            bytes,
            tier,
            durationDays,
          });
          expect(result.upfrontMicroJoules).toBe(
            result.dailyMicroJoules * BigInt(durationDays),
          );
        },
      ),
    );
  });

  test('minimum charge: daily is always ≥ 1 µJ', () => {
    fc.assert(
      fc.property(
        bytesArb,
        tierArb,
        durationArb,
        (bytes, tier, durationDays) => {
          const result = calculateBurnbagStorageCost({
            bytes,
            tier,
            durationDays,
          });
          expect(result.dailyMicroJoules).toBeGreaterThanOrEqual(1n);
        },
      ),
    );
  });

  test('monotonicity: larger bytes → larger or equal daily charge', () => {
    fc.assert(
      fc.property(
        bytesArb,
        bytesArb,
        tierArb,
        durationArb,
        (a, b, tier, durationDays) => {
          const small = a < b ? a : b;
          const large = a < b ? b : a;
          const costSmall = calculateBurnbagStorageCost({
            bytes: small,
            tier,
            durationDays,
          });
          const costLarge = calculateBurnbagStorageCost({
            bytes: large,
            tier,
            durationDays,
          });
          expect(costLarge.dailyMicroJoules).toBeGreaterThanOrEqual(
            costSmall.dailyMicroJoules,
          );
        },
      ),
    );
  });

  test('tier ordering: performance ≥ standard ≥ archive ≥ pending-burn ≥ none (per byte)', () => {
    fc.assert(
      fc.property(bytesArb, durationArb, (bytes, durationDays) => {
        // Use a non-zero byte count to avoid min-charge collisions.
        const testBytes = bytes + 1n;
        const performance = calculateBurnbagStorageCost({
          bytes: testBytes,
          tier: 'performance',
          durationDays,
        });
        const standard = calculateBurnbagStorageCost({
          bytes: testBytes,
          tier: 'standard',
          durationDays,
        });
        const archive = calculateBurnbagStorageCost({
          bytes: testBytes,
          tier: 'archive',
          durationDays,
        });
        const pendingBurn = calculateBurnbagStorageCost({
          bytes: testBytes,
          tier: 'pending-burn',
          durationDays,
        });
        const none = calculateBurnbagStorageCost({
          bytes: testBytes,
          tier: 'none',
          durationDays,
        });
        expect(performance.dailyMicroJoules).toBeGreaterThanOrEqual(
          standard.dailyMicroJoules,
        );
        expect(standard.dailyMicroJoules).toBeGreaterThanOrEqual(
          archive.dailyMicroJoules,
        );
        expect(archive.dailyMicroJoules).toBeGreaterThanOrEqual(
          pendingBurn.dailyMicroJoules,
        );
        expect(pendingBurn.dailyMicroJoules).toBeGreaterThanOrEqual(
          none.dailyMicroJoules,
        );
      }),
    );
  });

  test('RS monotonicity: higher parity (more m) → larger or equal daily charge', () => {
    fc.assert(
      fc.property(
        bytesArb,
        tierArb,
        durationArb,
        (bytes, tier, durationDays) => {
          const defaults = BURNBAG_TIER_RS_PARAMS[tier];
          const base = calculateBurnbagStorageCost({
            bytes,
            tier,
            durationDays,
            rsK: defaults.k,
            rsM: defaults.m,
          });
          // Adding one more parity shard increases RS overhead
          const higher = calculateBurnbagStorageCost({
            bytes,
            tier,
            durationDays,
            rsK: defaults.k,
            rsM: defaults.m + 1,
          });
          expect(higher.dailyMicroJoules).toBeGreaterThanOrEqual(
            base.dailyMicroJoules,
          );
        },
      ),
    );
  });

  test('explicit RS params override defaults', () => {
    fc.assert(
      fc.property(
        bytesArb,
        tierArb,
        durationArb,
        (bytes, tier, durationDays) => {
          const defaults = BURNBAG_TIER_RS_PARAMS[tier];
          const withDefaults = calculateBurnbagStorageCost({
            bytes,
            tier,
            durationDays,
          });
          const withExplicit = calculateBurnbagStorageCost({
            bytes,
            tier,
            durationDays,
            rsK: defaults.k,
            rsM: defaults.m,
          });
          expect(withDefaults.dailyMicroJoules).toBe(
            withExplicit.dailyMicroJoules,
          );
          expect(withDefaults.rsK).toBe(defaults.k);
          expect(withDefaults.rsM).toBe(defaults.m);
        },
      ),
    );
  });

  test('invalid durationDays throws RangeError', () => {
    expect(() =>
      calculateBurnbagStorageCost({
        bytes: 1000n,
        tier: 'standard',
        durationDays: 0,
      }),
    ).toThrow(RangeError);
    expect(() =>
      calculateBurnbagStorageCost({
        bytes: 1000n,
        tier: 'standard',
        durationDays: -1,
      }),
    ).toThrow(RangeError);
  });

  test('invalid rsK throws RangeError', () => {
    expect(() =>
      calculateBurnbagStorageCost({
        bytes: 1000n,
        tier: 'standard',
        durationDays: 30,
        rsK: 0,
        rsM: 2,
      }),
    ).toThrow(RangeError);
  });

  test('invalid rsM throws RangeError', () => {
    expect(() =>
      calculateBurnbagStorageCost({
        bytes: 1000n,
        tier: 'standard',
        durationDays: 30,
        rsK: 4,
        rsM: -1,
      }),
    ).toThrow(RangeError);
  });
});
