/**
 * Rate table primitives for Joule resource-credit metering.
 *
 * A `IRateTable` maps each `ResourceClass` to a `µJ-per-unit` price.
 * All arithmetic is `bigint`; no floating-point is introduced.
 *
 * @see joule-resource-credits spec, Requirement 1.1, 1.6
 */

import { ResourceClass } from './resourceClass';

/**
 * Per-class pricing row inside a rate table.
 */
export interface IRateTableEntry {
  /** Denominator unit string, e.g. `'request'`, `'MB-day'`, `'MB-out'`. */
  unit: string;
  /** Cost per one unit expressed in µJ (bigint). */
  microJoulesPerUnit: bigint;
  /** Human-readable description of what this class covers. */
  description: string;
}

/**
 * Versioned, signed rate table.
 *
 * Once recorded on-ledger, a rate table is immutable.
 * Historical pricing is preserved so that per-request events can
 * reference the version that was active at emit time (Req 1.3).
 */
export interface IRateTable {
  /** Monotonically increasing, starting at 1. */
  version: number;
  /** Unix milliseconds at which this table becomes effective. */
  effectiveAt: number;
  /** One entry per resource class. All four v1 classes must be present. */
  entries: Record<ResourceClass, IRateTableEntry>;
  /** Operator quorum key fingerprints that signed this table. */
  signedBy: ReadonlyArray<string>;
}

/**
 * Compute the µJ cost for `units` of resource class `cls` under `rate`.
 *
 * Formula: `microJoules = units * microJoulesPerUnit` (bigint, exact).
 *
 * @see joule-resource-credits spec, Requirement 1.6
 */
export function priceMicroJoules(
  rate: IRateTable,
  cls: ResourceClass,
  units: bigint,
): bigint {
  return units * rate.entries[cls].microJoulesPerUnit;
}

/**
 * Default bootstrap rate table (version 1).
 *
 * Rates are intentionally conservative placeholders; the operator quorum
 * SHOULD submit a `RateTableUpdateAction` before opening to members.
 *
 * @see joule-resource-credits spec, Requirement 1.1
 */
export const BOOTSTRAP_RATE_TABLE: Readonly<IRateTable> = {
  version: 1,
  effectiveAt: 0, // overridden by bootstrap caller with actual timestamp
  entries: {
    compute: {
      unit: 'request',
      microJoulesPerUnit: 1_000n, // 1 mJ per request
      description: 'CPU/compute per API request',
    },
    storage: {
      unit: 'MB-day',
      microJoulesPerUnit: 100n, // 0.1 mJ per MB-day
      description: 'Persistent storage per megabyte per day',
    },
    network: {
      unit: 'MB-out',
      microJoulesPerUnit: 500n, // 0.5 mJ per MB transferred out
      description: 'Outbound bandwidth per megabyte',
    },
    proofOfWork: {
      unit: 'proof',
      microJoulesPerUnit: 10_000n, // 10 mJ per proof submission
      description: 'Proof-of-work submission cost',
    },
  },
  signedBy: [],
};
