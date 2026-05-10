/**
 * @fileoverview IAttestationAction — payload for recording a signed attestation on-ledger.
 *
 * The attestation binds an off-ledger claim (identified by `claimHash`) to an
 * asset class or a specific account. The claim content is kept off-chain;
 * only its hash is stored.
 *
 * @see Requirements 8.1
 */

import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** Payload that records a verifiable claim reference on the asset ledger. */
export interface IAttestationAction {
  readonly kind: ActionKind.Attestation;
  /** The asset class this attestation pertains to. */
  readonly assetId: AssetIdBuffer;
  /**
   * Account whose claim is being attested, or `null` for asset-level attestations.
   */
  readonly subject: Uint8Array | null;
  /**
   * SHA-256 hash of the off-chain claim document (exactly 32 bytes).
   */
  readonly claimHash: Uint8Array;
  /** Unix timestamp (ms) at which the attestation expires, or `null` for permanent. */
  readonly expiresAt: number | null;
}
