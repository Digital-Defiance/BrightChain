/**
 * @fileoverview IBurnAction — payload for destroying units of an asset.
 *
 * Only valid when the asset's `burnable` flag is `true`. The signer must own
 * at least `amount` units in the `from` account.
 *
 * @see Requirements 2.3
 */

import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** Payload that permanently removes units from circulation. */
export interface IBurnAction {
  readonly kind: ActionKind.Burn;
  /** The asset class whose units are being burned. */
  readonly assetId: AssetIdBuffer;
  /** Account from which units are removed. */
  readonly from: Uint8Array;
  /** Amount to destroy, expressed in the smallest unit (µ-denomination). */
  readonly amount: bigint;
  /** Monotonically increasing per-account nonce for replay protection. */
  readonly nonce: bigint;
  /** Optional human-readable rationale (<= 256 bytes). */
  readonly memo?: Uint8Array;
}
