import { InvalidAmountError } from '../errors/asset/invalidAmountError';
import { JOULE_MICROUNITS_PER_UNIT } from './jouleConstants';

/**
 * Convert a joule value (display-tier `number`) into microjoule microunits
 * (`bigint`). Use only at trust boundaries (rate tables, user input, legacy
 * DTO hydration). Internal arithmetic SHALL stay in `bigint` microunits.
 *
 * @throws {InvalidAmountError} If the input is non-finite or negative.
 *
 * @see asset-account-store-generalization spec, Requirement 1.2.
 */
export function joulesToMicrojoules(joules: number): bigint {
  if (typeof joules !== 'number' || !Number.isFinite(joules) || joules < 0) {
    throw new InvalidAmountError(
      'joulesToMicrojoules expects a finite, non-negative number.',
      joules,
    );
  }
  // Multiply in number space, round, then promote to bigint.
  // Display-tier inputs are bounded by Number.MAX_SAFE_INTEGER / 1e6
  // (~9e9 J) which is far above any expected request budget.
  const microunits = Math.round(joules * Number(JOULE_MICROUNITS_PER_UNIT));
  return BigInt(microunits);
}

/**
 * Convert microjoule microunits (`bigint`) back into a joule `number` for
 * display only. This conversion may lose precision above
 * `Number.MAX_SAFE_INTEGER`; do **not** round-trip arithmetic through it.
 *
 * @see asset-account-store-generalization spec, Requirement 1.2.
 */
export function microjoulesToJoules(microjoules: bigint): number {
  return Number(microjoules) / Number(JOULE_MICROUNITS_PER_UNIT);
}
