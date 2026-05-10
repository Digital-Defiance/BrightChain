/**
 * @fileoverview IRetireAssetAction — payload for permanently retiring an asset class.
 *
 * After retirement the asset is immutable: no further minting, transfers, or
 * governance changes are allowed. Requires unanimous issuer-set consensus.
 *
 * @see Requirements 7.1
 */

import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** Payload that irrevocably closes an asset class. */
export interface IRetireAssetAction {
  readonly kind: ActionKind.RetireAsset;
  /** The asset class to retire. */
  readonly assetId: AssetIdBuffer;
  /** Human-readable rationale (<= 256 bytes). */
  readonly reason: Uint8Array;
}
