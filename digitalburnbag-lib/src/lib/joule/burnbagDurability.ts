import { DurabilityLevel } from '@brightchain/brightchain-lib';

/**
 * Burnbag storage tier — maps to a specific Reed-Solomon (k, m) configuration.
 *
 * - `performance`:   RS(10,6) — tolerates 6 node failures, 1.60× overhead
 * - `standard`:      RS(8,4)  — tolerates 4 node failures, 1.50× overhead
 * - `archive`:       RS(6,2)  — tolerates 2 node failures, 1.33× overhead
 * - `pending-burn`:  RS(4,1)  — tolerates 1 node failure,  1.25× overhead (auto-applied when burn date is set)
 * - `none`:          RS(1,0)  — tolerates 0 node failures, 1.00× overhead (no redundancy)
 */
export type BurnbagStorageTier =
  | 'performance'
  | 'standard'
  | 'archive'
  | 'pending-burn'
  | 'none';

/**
 * Reed-Solomon erasure coding parameters for a storage tier.
 * k = data shards, m = parity shards.
 */
export interface IBurnbagRsParams {
  readonly k: number;
  readonly m: number;
}

/**
 * Canonical RS parameters per storage tier.
 */
export const BURNBAG_TIER_RS_PARAMS: Record<
  BurnbagStorageTier,
  IBurnbagRsParams
> = Object.freeze({
  performance: { k: 10, m: 6 },
  standard: { k: 8, m: 4 },
  archive: { k: 6, m: 2 },
  'pending-burn': { k: 4, m: 1 },
  none: { k: 1, m: 0 },
});

/**
 * Maps each Burnbag storage tier to the corresponding brightchain-lib DurabilityLevel.
 */
export const BURNBAG_TIER_TO_DURABILITY: Record<
  BurnbagStorageTier,
  DurabilityLevel
> = Object.freeze({
  performance: DurabilityLevel.HighDurability,
  standard: DurabilityLevel.Standard,
  archive: DurabilityLevel.Standard,
  'pending-burn': DurabilityLevel.Ephemeral,
  none: DurabilityLevel.Ephemeral,
});

/**
 * Returns the effective storage tier after accounting for a burn date.
 * When `hasBurnDate` is true the file is automatically downgraded to
 * `'pending-burn'` regardless of the user-chosen tier.
 */
export function effectiveTier(
  userTier: BurnbagStorageTier,
  hasBurnDate: boolean,
): BurnbagStorageTier {
  return hasBurnDate ? 'pending-burn' : userTier;
}
