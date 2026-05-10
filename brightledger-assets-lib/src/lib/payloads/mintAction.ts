/**
 * @fileoverview IMintAction — payload for creating additional units of an asset.
 *
 * Only valid when the asset's `supplyPolicy` is `'mintable'` or `'capped'` (and
 * the cap has not been reached). Requires a quorum of the issuer set.
 *
 * @see Requirements 2.1–2.2
 */

import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** Payload that creates new units of an existing asset. */
export interface IMintAction {
  readonly kind: ActionKind.Mint;
  /** The asset class to mint additional units for. */
  readonly assetId: AssetIdBuffer;
  /** Recipient account public key. */
  readonly to: Uint8Array;
  /** Amount to create, expressed in the smallest unit (µ-denomination). */
  readonly amount: bigint;
  /** Monotonically increasing per-issuer nonce for replay protection. */
  readonly nonce: bigint;
  /** Optional human-readable rationale (<= 256 bytes). */
  readonly memo?: Uint8Array;
}
