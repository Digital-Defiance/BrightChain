/**
 * @fileoverview IOperatorGrantAction — on-ledger payload for granting Joule
 * credits to a member account.
 *
 * This action is a thin Layer-4 wrapper over the Layer-3 `MintAction`
 * primitive.  Only operator quorum members may submit this action;
 * the gateway MUST reject member-originated `TransferAction` for the
 * `joule` asset (Req 4.1, 4.4).
 *
 * Wire format: `microJoules` is serialized as a decimal string.
 *
 * @see joule-resource-credits spec, Requirement 4.1, 4.4
 */

import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/**
 * On-ledger action that credits `microJoules` to `to` for a stated `reason`.
 *
 * - `reason` is non-empty, max 256 characters, stored on-ledger.
 * - `quorumSignatures` contains the raw signature bytes from each signing
 *    operator key in the active quorum set.
 * - `nonce` prevents replay of identical grant payloads.
 */
export interface IOperatorGrantAction {
  readonly kind: ActionKind.OperatorGrant;
  /** Must always be the Joule asset identifier buffer. */
  readonly assetId: AssetIdBuffer;
  /** Recipient account key (public key bytes). */
  readonly to: Uint8Array;
  /** Amount in µJ (bigint, > 0). */
  readonly microJoules: bigint;
  /**
   * Human-readable reason for the grant; non-empty, max 256 chars.
   * Stored on-ledger and surfaced in member balance history.
   */
  readonly reason: string;
  /** Raw signature bytes from each signing operator key. */
  readonly quorumSignatures: ReadonlyArray<Uint8Array>;
  /** Per-action nonce — must be unique per issuer across the asset lifetime. */
  readonly nonce: bigint;
  /** Optional memo, max 256 bytes. */
  readonly memo?: Uint8Array;
}

// ---------------------------------------------------------------------------
// Validator
// ---------------------------------------------------------------------------

/** Errors returned by `validateOperatorGrant`. */
export type OperatorGrantValidationError =
  | { code: 'AMOUNT_MUST_BE_POSITIVE'; microJoules: bigint }
  | { code: 'REASON_EMPTY' }
  | { code: 'REASON_TOO_LONG'; length: number; max: number }
  | { code: 'NO_SIGNATURES' };

/** Maximum allowed length of `reason` in UTF-16 code units. */
export const OPERATOR_GRANT_REASON_MAX_LENGTH = 256;

/**
 * Validate a proposed `IOperatorGrantAction` payload.
 *
 * @returns `[]` when valid, or an array of validation errors.
 */
export function validateOperatorGrant(
  action: Pick<
    IOperatorGrantAction,
    'microJoules' | 'reason' | 'quorumSignatures'
  >,
): OperatorGrantValidationError[] {
  const errors: OperatorGrantValidationError[] = [];

  if (action.microJoules <= 0n) {
    errors.push({
      code: 'AMOUNT_MUST_BE_POSITIVE',
      microJoules: action.microJoules,
    });
  }

  if (!action.reason || action.reason.trim().length === 0) {
    errors.push({ code: 'REASON_EMPTY' });
  } else if (action.reason.length > OPERATOR_GRANT_REASON_MAX_LENGTH) {
    errors.push({
      code: 'REASON_TOO_LONG',
      length: action.reason.length,
      max: OPERATOR_GRANT_REASON_MAX_LENGTH,
    });
  }

  if (!action.quorumSignatures || action.quorumSignatures.length === 0) {
    errors.push({ code: 'NO_SIGNATURES' });
  }

  return errors;
}
