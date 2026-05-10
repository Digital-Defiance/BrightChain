/**
 * @fileoverview Supply-policy and transfer-policy types for asset issuance.
 *
 * SupplyPolicy governs whether new units can ever be created after issuance.
 * TransferPolicy governs who is allowed to receive units of the asset.
 *
 * @see Requirements 1.1, 1.3
 */

/**
 * Governs whether additional units may be created after initial issuance.
 *
 * - `'fixed'`   — total supply is sealed at issuance; no further minting allowed.
 * - `'mintable'`— supply is unbounded; the issuer set may mint at will.
 * - `{ kind: 'capped'; cap: bigint }` — supply is capped at `cap` units (µ-denomination).
 */
export type SupplyPolicy =
  | 'fixed'
  | 'mintable'
  | { readonly kind: 'capped'; readonly cap: bigint };

/**
 * Governs which accounts may receive units of the asset.
 *
 * - `'open'`      — any account may receive the asset.
 * - `'whitelist'` — only accounts on the issuer-managed allow-list may receive.
 */
export type TransferPolicy = 'open' | 'whitelist';
