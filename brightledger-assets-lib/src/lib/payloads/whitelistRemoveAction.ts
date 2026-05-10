/**
 * @fileoverview IWhitelistRemoveAction — payload for removing an account from the transfer allow-list.
 *
 * Only applicable when the asset's `transferPolicy` is `'whitelist'`.
 * Requires issuer-set quorum.
 *
 * @see Requirements 5.2
 */

import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** Payload that revokes an account's permission to receive a whitelist-gated asset. */
export interface IWhitelistRemoveAction {
  readonly kind: ActionKind.WhitelistRemove;
  /** The asset class whose whitelist is being updated. */
  readonly assetId: AssetIdBuffer;
  /** The account being removed from the allow-list. */
  readonly account: Uint8Array;
}
