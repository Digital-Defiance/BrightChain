/**
 * BrightDate Conversion Utilities for BrightChain
 *
 * Re-exports the core conversion functions from `@brightchain/brightdate` under
 * brightchain-idiomatic names, and adds two ecosystem-specific helpers:
 *
 *  - `normalizeToBrightDate` — re-export of `normalize` from brightdate, typed
 *    for brightchain consumers
 *  - `brightDateNow` — typed alias for `now()` returning `BrightDateTimestamp`
 *    (the brightchain canonical timestamp type) rather than the generic
 *    `BrightDateValue`
 *
 * All conversion math lives in `@brightchain/brightdate`. This module is a
 * thin adapter layer — do not add conversion logic here.
 *
 * @module brightDateConversions
 */

export {
  fromDate as dateToBrightDate,
  normalize as normalizeToBrightDate,
  toDate as brightDateToDate,
  toISO as brightDateToISO,
} from '@brightchain/brightdate';
import { fromISO, now } from '@brightchain/brightdate';
import type { BrightDateValue } from '@brightchain/brightdate';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';

/**
 * Convert an ISO 8601 string to a BrightDateValue.
 *
 * Wraps `fromISO` from `@brightchain/brightdate`, normalising the thrown error
 * to a `TypeError` with a consistent message for brightchain consumers.
 *
 * @param iso - ISO 8601 formatted date string
 * @returns BrightDateValue (decimal days since J2000.0)
 * @throws TypeError if the string cannot be parsed as a valid date
 */
export function isoToBrightDate(iso: string): BrightDateValue {
  try {
    return fromISO(iso);
  } catch {
    throw new TypeError(`Invalid date string: ${iso}`);
  }
}

/**
 * Generate the current timestamp as a `BrightDateTimestamp`.
 *
 * Typed alias for `now()` from `@brightchain/brightdate`. Use this wherever
 * `new Date()` was previously used for timestamp generation in brightchain code.
 *
 * @returns Current time as BrightDateTimestamp (decimal days since J2000.0)
 */
export function brightDateNow(): BrightDateTimestamp {
  return now();
}
