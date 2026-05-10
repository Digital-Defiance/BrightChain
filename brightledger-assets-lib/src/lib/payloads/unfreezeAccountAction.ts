/**
 * @fileoverview IUnfreezeAccountAction — payload for lifting an account freeze.
 *
 * Reverses a previous FreezeAccount action. Requires issuer-set quorum.
 *
 * @see Requirements 4.3
 */

import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** Payload that restores transfer rights for a previously frozen (account, asset) pair. */
export interface IUnfreezeAccountAction {
  readonly kind: ActionKind.UnfreezeAccount;
  /** The asset class being unfrozen. */
  readonly assetId: AssetIdBuffer;
  /** The account being unfrozen. */
  readonly account: Uint8Array;
  /** Human-readable rationale for lifting the freeze (<= 256 bytes). */
  readonly reason: Uint8Array;
}
