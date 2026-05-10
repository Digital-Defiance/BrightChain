/**
 * @fileoverview IFreezeAccountAction — payload for freezing an account's asset balance.
 *
 * Only valid when the asset's `freezable` flag is `true`. Requires issuer-set quorum.
 * While frozen, the account cannot send or receive that asset.
 *
 * @see Requirements 4.1–4.2
 */

import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** Payload that suspends all transfers for a specific (account, asset) pair. */
export interface IFreezeAccountAction {
  readonly kind: ActionKind.FreezeAccount;
  /** The asset class whose balance is being frozen. */
  readonly assetId: AssetIdBuffer;
  /** The account whose balance is frozen. */
  readonly account: Uint8Array;
  /** Human-readable rationale for the freeze (<= 256 bytes). */
  readonly reason: Uint8Array;
}
