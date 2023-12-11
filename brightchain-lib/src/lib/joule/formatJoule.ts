/**
 * Scale-aware Joule formatter and parser.
 *
 * Rules (Req 7.7):
 *  - ≥ 1 J  → render in J, up to 6 decimal places (trailing zeros trimmed
 *              unless `opts.trim === false`).
 *  - ≥ 1 mJ → render in mJ (3 µJ = 1 mJ = 1_000 µJ).
 *  - otherwise → render in µJ with no decimal point.
 *
 * All arithmetic is bigint — `Number()` is NEVER used on µJ amounts.
 * `parseJoule` is the exact inverse of `formatJoule` for round-trip fidelity.
 *
 * @see joule-resource-credits spec, Requirement 7.7
 */

import { JOULE_MICROUNITS_PER_UNIT } from './jouleConstants';

/** µJ per mJ */
const MICROJOULES_PER_MILLIJOULE = 1_000n;

export interface IFormatJouleOptions {
  /**
   * Trim trailing decimal zeros from fractional parts.
   * Defaults to `true`.
   */
  trim?: boolean;
}

/**
 * Format a µJ bigint amount as a human-readable string at the most
 * appropriate scale (J, mJ, or µJ).
 *
 * Negative amounts render with a leading `-`.
 *
 * @example
 * formatJoule(2_500_000n)  // '2.5 J'
 * formatJoule(1_500n)      // '1.5 mJ'
 * formatJoule(42n)         // '42 µJ'
 */
export function formatJoule(
  microJoules: bigint,
  opts?: IFormatJouleOptions,
): string {
  const trim = opts?.trim !== false; // default true

  const negative = microJoules < 0n;
  const abs = negative ? -microJoules : microJoules;
  const sign = negative ? '-' : '';

  if (abs === 0n) {
    return '0.00 J';
  }

  if (abs >= JOULE_MICROUNITS_PER_UNIT) {
    // J scale — 6 decimal places, bigint division
    const wholeJ = abs / JOULE_MICROUNITS_PER_UNIT;
    const remainder = abs % JOULE_MICROUNITS_PER_UNIT;
    const fracStr = remainder.toString().padStart(6, '0');
    const fracTrimmed = trim ? fracStr.replace(/0+$/, '') : fracStr;
    const body =
      fracTrimmed.length > 0 ? `${wholeJ}.${fracTrimmed}` : wholeJ.toString();
    return `${sign}${body} J`;
  }

  if (abs >= MICROJOULES_PER_MILLIJOULE) {
    // mJ scale — 3 decimal places
    const wholeMJ = abs / MICROJOULES_PER_MILLIJOULE;
    const remainder = abs % MICROJOULES_PER_MILLIJOULE;
    const fracStr = remainder.toString().padStart(3, '0');
    const fracTrimmed = trim ? fracStr.replace(/0+$/, '') : fracStr;
    const body =
      fracTrimmed.length > 0 ? `${wholeMJ}.${fracTrimmed}` : wholeMJ.toString();
    return `${sign}${body} mJ`;
  }

  // µJ scale — exact integer
  return `${sign}${abs} µJ`;
}

/**
 * Parse a string produced by `formatJoule` back into µJ as a bigint.
 *
 * This is the exact inverse of `formatJoule` with default options (trim=true).
 * Designed for test round-trips and serialization boundaries only;
 * UI display layers should call `formatJoule` exclusively.
 *
 * @throws {Error} if the string cannot be parsed.
 */
export function parseJoule(formatted: string): bigint {
  const s = formatted.trim();

  if (s.endsWith(' J')) {
    return parseScaled(s.slice(0, -2).trim(), JOULE_MICROUNITS_PER_UNIT, 6);
  }
  if (s.endsWith(' mJ')) {
    return parseScaled(s.slice(0, -3).trim(), MICROJOULES_PER_MILLIJOULE, 3);
  }
  if (s.endsWith(' µJ')) {
    const inner = s.slice(0, -3).trim();
    const negative = inner.startsWith('-');
    const digits = negative ? inner.slice(1) : inner;
    if (!/^\d+$/.test(digits)) {
      throw new Error(`parseJoule: invalid µJ value: ${JSON.stringify(s)}`);
    }
    const val = BigInt(digits);
    return negative ? -val : val;
  }

  throw new Error(`parseJoule: unrecognized format: ${JSON.stringify(s)}`);
}

/**
 * Helper: parse `"<integer>[.<fraction>]"` and return the value scaled
 * to µJ using the given multiplier.
 */
function parseScaled(
  numStr: string,
  multiplier: bigint,
  maxFracDigits: number,
): bigint {
  const negative = numStr.startsWith('-');
  const abs = negative ? numStr.slice(1) : numStr;
  const dotIdx = abs.indexOf('.');

  let intPart: string;
  let fracPart: string;

  if (dotIdx === -1) {
    intPart = abs;
    fracPart = '';
  } else {
    intPart = abs.slice(0, dotIdx);
    fracPart = abs.slice(dotIdx + 1);
  }

  if (!/^\d*$/.test(intPart) || !/^\d*$/.test(fracPart)) {
    throw new Error(`parseJoule: invalid number: ${JSON.stringify(numStr)}`);
  }

  // Pad or truncate fractional part to maxFracDigits
  const paddedFrac = fracPart
    .padEnd(maxFracDigits, '0')
    .slice(0, maxFracDigits);

  const intBig = intPart.length > 0 ? BigInt(intPart) : 0n;
  const fracBig = paddedFrac.length > 0 ? BigInt(paddedFrac) : 0n;
  const val = intBig * multiplier + fracBig;
  return negative ? -val : val;
}
