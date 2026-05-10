import { DurabilityLevel } from '@brightchain/brightchain-lib';
import {
  BURNBAG_TIER_TO_DURABILITY,
  type BurnbagStorageTier,
} from './burnbagDurability';

/**
 * Base storage rate: 500 µJ per GB per day.
 * 1 GB = 1,000,000,000 bytes (SI).
 */
export const STORAGE_BASE_RATE_UJ_PER_GB_DAY = 500n;

/**
 * Durability multipliers × 1000 (to stay in integer arithmetic).
 * Actual multiplier = constant / 1000.
 */
export const STORAGE_HOT_MUL_1000 = 2000n; // performance  → 2.0×
export const STORAGE_WARM_MUL_1000 = 1000n; // standard     → 1.0×
export const STORAGE_COLD_MUL_1000 = 500n; // archive      → 0.5×
export const STORAGE_FROZEN_MUL_1000 = 250n; // pending-burn → 0.25×
export const STORAGE_NONE_MUL_1000 = 125n; // none         → 0.125× (no RS redundancy, base storage only)

/**
 * Minimum daily charge per contract — never allow a zero daily charge.
 */
export const STORAGE_MIN_CHARGE_UJ = 1n;

/**
 * Returns the ×1000 durability multiplier for the given Burnbag storage tier.
 * Multipliers reflect access-hot vs access-cold pricing.
 */
export function durabilityMul1000(tier: BurnbagStorageTier): bigint {
  if (tier === 'none') {
    return STORAGE_NONE_MUL_1000;
  }
  const level = BURNBAG_TIER_TO_DURABILITY[tier];
  switch (level) {
    case DurabilityLevel.HighDurability:
      return STORAGE_HOT_MUL_1000;
    case DurabilityLevel.Standard:
      // standard tier → warm, archive tier → cold
      return tier === 'archive' ? STORAGE_COLD_MUL_1000 : STORAGE_WARM_MUL_1000;
    case DurabilityLevel.Ephemeral:
      return STORAGE_FROZEN_MUL_1000;
    default:
      return STORAGE_WARM_MUL_1000;
  }
}

/**
 * Integer ceiling division: ⌈numerator / denominator⌉.
 * Uses only bigint arithmetic — no floating-point.
 * @throws {RangeError} if denominator ≤ 0n
 */
export function ceilDiv(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) {
    throw new RangeError(
      `ceilDiv: denominator must be > 0, got ${denominator}`,
    );
  }
  return (numerator + denominator - 1n) / denominator;
}
