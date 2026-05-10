/**
 * @fileoverview AssetIdBuffer — branded Uint8Array type for asset identifiers,
 * and `deriveAssetId` — deterministic derivation via SHA-256.
 *
 * Asset ID = SHA-256(issuerPublicKey ‖ issuanceEntryHash)
 *
 * Using @noble/hashes for browser-safe SHA-256 (no Node.js `crypto` dependency).
 *
 * @see Requirements 1.2
 * @see Design: Layer 3 — Programmable Asset Ledger § Asset Identity
 */

import { sha256 } from '@noble/hashes/sha256';

declare const ASSET_ID_BRAND: unique symbol;

/**
 * A 32-byte SHA-256 digest branded as an asset identifier.
 * Use {@link deriveAssetId} to produce values of this type.
 */
export type AssetIdBuffer = Uint8Array & { readonly [ASSET_ID_BRAND]: true };

/**
 * Derives a deterministic asset identifier from the issuer's public key and
 * the hash of the issuance ledger entry.
 *
 * @param issuerPublicKey   - Compressed public key of the issuing signer (33 bytes recommended).
 * @param issuanceEntryHash - SHA-256 or SHA3-512 hash of the IssueAsset ledger entry.
 * @returns 32-byte branded `AssetIdBuffer`.
 */
export function deriveAssetId(
  issuerPublicKey: Uint8Array,
  issuanceEntryHash: Uint8Array,
): AssetIdBuffer {
  const combined = new Uint8Array(
    issuerPublicKey.length + issuanceEntryHash.length,
  );
  combined.set(issuerPublicKey, 0);
  combined.set(issuanceEntryHash, issuerPublicKey.length);
  return sha256(combined) as AssetIdBuffer;
}
