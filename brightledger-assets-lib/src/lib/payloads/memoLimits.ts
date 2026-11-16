/**
 * @fileoverview Shared size limit for free-form memo / reason fields.
 *
 * @see .kiro/specs/programmable-asset-ledger/requirements.md Req 1.3
 */

/**
 * Maximum size, in bytes, of any `memo` or `reason` field carried by an asset
 * action payload.
 *
 * Enforced on new submissions only (by `AssetActionValidator`). The codec does
 * not reject on decode, so entries already on the ledger always replay.
 */
export const MEMO_MAX_BYTES = 256;
