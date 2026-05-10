/**
 * @fileoverview IRateTableUpdateAction — on-ledger payload for updating the
 * Joule resource-credit rate table.
 *
 * This action is a thin Layer-4 wrapper over the Layer-3 attestation primitive.
 * The operator quorum signs the new rate table and submits it as a ledger entry;
 * `RateTableCache` listens for these events and serves the latest rates.
 *
 * Validation rules (Req 1.2, 1.4):
 *  - `version` must be strictly greater than the current active version.
 *  - `effectiveAt` must be strictly in the future relative to the ledger clock.
 *  - All four v1 resource classes must be present in `entries`.
 *  - `microJoulesPerUnit` must be > 0n for every entry.
 *
 * @see joule-resource-credits spec, Requirement 1.2, 1.4
 */

import type {
  IRateTable,
  IRateTableEntry,
  ResourceClass,
} from '@brightchain/brightchain-lib';
import { RESOURCE_CLASSES } from '@brightchain/brightchain-lib';
import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** The canonical `kind` discriminant string written on-ledger. */
export const RATE_TABLE_UPDATE_KIND = 'rate_table_update' as const;

/**
 * On-ledger payload that updates the active resource-credit rate table.
 *
 * The `claimHash` field carries the SHA-256 of the canonical JSON encoding
 * of the `rateTable` object, exactly as defined by the Layer-3
 * `AttestationAction` primitive (Req 1.3).
 */
export interface IRateTableUpdateAction {
  readonly kind: ActionKind.RateTableUpdate;
  /** Must always be the Joule asset identifier buffer. */
  readonly assetId: AssetIdBuffer;
  /** The full new rate table including version, effectiveAt and entries. */
  readonly rateTable: IRateTable;
  /**
   * SHA-256 hash of the canonical JSON encoding of `rateTable`.
   * Allows lightweight verification without re-serializing the payload.
   */
  readonly claimHash: Uint8Array;
  /** Optional memo, max 256 bytes. */
  readonly memo?: Uint8Array;
}

// ---------------------------------------------------------------------------
// Payload schema (inner body submitted on-chain)
// ---------------------------------------------------------------------------

/**
 * The signed body that is hashed into `claimHash`.
 * Entries are serialized with bigint amounts as decimal strings.
 */
export interface IRateTableUpdatePayload {
  readonly kind: typeof RATE_TABLE_UPDATE_KIND;
  readonly version: number;
  readonly effectiveAt: number;
  readonly entries: Record<
    ResourceClass,
    {
      unit: string;
      /** Decimal string encoding of bigint µJ/unit. */
      microJoulesPerUnit: string;
      description: string;
    }
  >;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/** Errors returned by `validateRateTableUpdatePayload`. */
export type RateTableUpdateValidationError =
  | {
      code: 'VERSION_NOT_INCREASING';
      currentVersion: number;
      proposedVersion: number;
    }
  | { code: 'EFFECTIVE_AT_NOT_FUTURE'; effectiveAt: number; now: number }
  | { code: 'MISSING_RESOURCE_CLASS'; missingClass: ResourceClass }
  | { code: 'INVALID_RATE'; cls: ResourceClass; reason: string };

/**
 * Validate a proposed `IRateTable` against the current active version and
 * the ledger clock.
 *
 * @param proposed   - Incoming rate table to validate.
 * @param currentVersion - Version number of the currently active table (0 = none).
 * @param nowMs      - Current ledger timestamp in Unix milliseconds.
 * @returns `[]` when valid, or an array of validation errors.
 */
export function validateRateTableUpdate(
  proposed: IRateTable,
  currentVersion: number,
  nowMs: number,
): RateTableUpdateValidationError[] {
  const errors: RateTableUpdateValidationError[] = [];

  if (proposed.version <= currentVersion) {
    errors.push({
      code: 'VERSION_NOT_INCREASING',
      currentVersion,
      proposedVersion: proposed.version,
    });
  }

  if (proposed.effectiveAt <= nowMs) {
    errors.push({
      code: 'EFFECTIVE_AT_NOT_FUTURE',
      effectiveAt: proposed.effectiveAt,
      now: nowMs,
    });
  }

  for (const cls of RESOURCE_CLASSES) {
    const entry: IRateTableEntry | undefined = proposed.entries[cls];
    if (!entry) {
      errors.push({ code: 'MISSING_RESOURCE_CLASS', missingClass: cls });
      continue;
    }
    if (entry.microJoulesPerUnit <= 0n) {
      errors.push({
        code: 'INVALID_RATE',
        cls,
        reason: `microJoulesPerUnit must be > 0, got ${entry.microJoulesPerUnit}`,
      });
    }
    if (!entry.unit || entry.unit.trim().length === 0) {
      errors.push({
        code: 'INVALID_RATE',
        cls,
        reason: 'unit string must be non-empty',
      });
    }
  }

  return errors;
}
