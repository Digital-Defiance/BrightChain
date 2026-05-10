/**
 * @fileoverview IWhitelistAddAction — payload for adding an account to the transfer allow-list.
 *
 * Only applicable when the asset's `transferPolicy` is `'whitelist'`.
 * Requires issuer-set quorum.
 *
 * @see Requirements 5.1
 */

import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** Payload that grants an account permission to receive a whitelist-gated asset. */
export interface IWhitelistAddAction {
  readonly kind: ActionKind.WhitelistAdd;
  /** The asset class whose whitelist is being updated. */
  readonly assetId: AssetIdBuffer;
  /** The account being added to the allow-list. */
  readonly account: Uint8Array;
}
