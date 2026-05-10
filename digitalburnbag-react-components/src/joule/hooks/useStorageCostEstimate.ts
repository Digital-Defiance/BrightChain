import {
  calculateBurnbagStorageCost,
  effectiveTier,
  type BurnbagStorageTier,
  type IBurnbagStorageCost,
} from '@brightchain/digitalburnbag-lib';
import { useMemo } from 'react';

/**
 * Custom hook that computes the Burnbag storage cost estimate in the browser.
 * Memoised on input changes. Gracefully handles `bytes = 0n` by using the
 * minimum charge path inside `calculateBurnbagStorageCost`.
 *
 * @param bytes       Plaintext byte count as bigint (0n is allowed — yields min charge).
 * @param tier        User-selected storage tier.
 * @param durationDays Committed storage duration in days (≥ 1).
 * @param hasBurnDate  When true the tier is overridden to 'pending-burn'.
 * @returns            Full cost breakdown or null when inputs are invalid.
 *
 * Requirement 8.9 (Phase 6.6)
 */
export function useStorageCostEstimate(
  bytes: bigint,
  tier: BurnbagStorageTier,
  durationDays: number,
  hasBurnDate: boolean,
): IBurnbagStorageCost | null {
  return useMemo(() => {
    if (!Number.isInteger(durationDays) || durationDays < 1) {
      return null;
    }
    try {
      return calculateBurnbagStorageCost({
        bytes,
        tier: effectiveTier(tier, hasBurnDate),
        durationDays,
      });
    } catch {
      return null;
    }
  }, [bytes, tier, durationDays, hasBurnDate]);
}
