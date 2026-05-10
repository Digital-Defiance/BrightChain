import {
  BURNBAG_TIER_RS_PARAMS,
  effectiveTier,
  type BurnbagStorageTier,
} from './burnbagDurability';
import {
  STORAGE_BASE_RATE_UJ_PER_GB_DAY,
  STORAGE_MIN_CHARGE_UJ,
  ceilDiv,
  durabilityMul1000,
} from './burnbagStorageRates';

/**
 * Input parameters for calculating Burnbag storage cost.
 * All Joule amounts are bigint (µJ); no floating-point.
 */
export interface IBurnbagStorageCostParams {
  /** Plaintext (or block-aligned) byte count as bigint. */
  bytes: bigint;
  /** User-selected storage tier (hasBurnDate override is caller's responsibility). */
  tier: BurnbagStorageTier;
  /** Committed storage duration in days (≥ 1). */
  durationDays: number;
  /**
   * Override data shards. Defaults to BURNBAG_TIER_RS_PARAMS[effectiveTier].k.
   * Only set when AUTO_RS_UPGRADE has run on the contract.
   */
  rsK?: number;
  /**
   * Override parity shards. Defaults to BURNBAG_TIER_RS_PARAMS[effectiveTier].m.
   * Only set when AUTO_RS_UPGRADE has run on the contract.
   */
  rsM?: number;
}

/**
 * Computed Burnbag storage cost breakdown.
 * All Joule amounts are bigint (µJ).
 */
export interface IBurnbagStorageCost {
  /** Total upfront charge for the committed duration (= dailyMicroJoules × durationDays). */
  upfrontMicroJoules: bigint;
  /** Daily recurring charge in µJ. */
  dailyMicroJoules: bigint;
  /** Resolved data shards (k). */
  rsK: number;
  /** Resolved parity shards (m). */
  rsM: number;
  /** Human-readable RS overhead factor, e.g. "1.50×". */
  overheadDisplay: string;
  /** The tier actually used for cost calculation (may differ from input due to burn date). */
  effectiveTier: BurnbagStorageTier;
}

/**
 * Pure, browser-safe storage cost calculator.
 * Uses only bigint arithmetic — no floating-point in the hot path.
 *
 * Formula:
 *   daily = max(
 *     ⌈bytes × BASE_RATE × durabilityMul1000(tier) × (rsK + rsM)
 *      / (1_000_000_000 × 1000 × rsK)⌉,
 *     STORAGE_MIN_CHARGE_UJ
 *   )
 *   upfront = daily × durationDays
 *
 * @throws {RangeError} INVALID_DURATION if durationDays < 1
 * @throws {RangeError} INVALID_RS_PARAMS if rsK < 1 or rsM < 0
 */
export function calculateBurnbagStorageCost(
  params: IBurnbagStorageCostParams,
): IBurnbagStorageCost {
  const { bytes, tier, durationDays } = params;

  if (!Number.isInteger(durationDays) || durationDays < 1) {
    throw new RangeError(
      `INVALID_DURATION: durationDays must be an integer ≥ 1, got ${durationDays}`,
    );
  }

  // hasBurnDate override is the caller's responsibility — they pass tier='pending-burn' directly.
  const resolvedTier = effectiveTier(tier, false);
  const defaults = BURNBAG_TIER_RS_PARAMS[resolvedTier];

  const rsK = params.rsK ?? defaults.k;
  const rsM = params.rsM ?? defaults.m;

  if (rsK < 1) {
    throw new RangeError(`INVALID_RS_PARAMS: rsK must be ≥ 1, got ${rsK}`);
  }
  if (rsM < 0) {
    throw new RangeError(`INVALID_RS_PARAMS: rsM must be ≥ 0, got ${rsM}`);
  }

  const mul = durabilityMul1000(resolvedTier);
  const bigRsK = BigInt(rsK);
  const bigRsM = BigInt(rsM);

  // ⌈bytes × 500 × mul × (k+m) / (1_000_000_000 × 1000 × k)⌉
  const numerator =
    bytes * STORAGE_BASE_RATE_UJ_PER_GB_DAY * mul * (bigRsK + bigRsM);
  const denominator = 1_000_000_000n * 1000n * bigRsK;

  const rawDaily = ceilDiv(numerator, denominator);
  const dailyMicroJoules =
    rawDaily < STORAGE_MIN_CHARGE_UJ ? STORAGE_MIN_CHARGE_UJ : rawDaily;

  const upfrontMicroJoules = dailyMicroJoules * BigInt(durationDays);

  // Build overhead display using integer arithmetic only.
  // overheadFactor = (k+m)/k as an exact fraction, displayed as X.YY×
  const totalShards = rsK + rsM;
  const whole = Math.floor(totalShards / rsK);
  const fractPer100 = Math.round(((totalShards % rsK) * 100) / rsK);
  const fractStr =
    fractPer100 === 0
      ? '00'
      : fractPer100 < 10
        ? `0${fractPer100}`
        : `${fractPer100}`;
  const overheadDisplay = `${whole}.${fractStr}×`;

  return {
    upfrontMicroJoules,
    dailyMicroJoules,
    rsK,
    rsM,
    overheadDisplay,
    effectiveTier: resolvedTier,
  };
}
