/**
 * @fileoverview ITransferAction — payload for a single-leg asset transfer.
 *
 * Transfers `amount` units of `assetId` from `from` to `to`. The transfer
 * must be signed by the private key corresponding to `from`.
 *
 * @see Requirements 3.1–3.5
 */

import { AssetIdBuffer } from '../assetId.js';
import { ActionKind } from './actionKind.js';

/** Payload for moving units between two accounts. */
export interface ITransferAction {
  readonly kind: ActionKind.Transfer;
  /** The asset class being transferred. */
  readonly assetId: AssetIdBuffer;
  /** Sender account public key. */
  readonly from: Uint8Array;
  /** Recipient account public key. */
  readonly to: Uint8Array;
  /** Amount to transfer, expressed in the smallest unit (µ-denomination). */
  readonly amount: bigint;
  /** Monotonically increasing per-account nonce for replay protection. */
  readonly nonce: bigint;
  /**
   * Unix timestamp (ms) after which the transfer is no longer valid,
   * or `null` for no expiry.
   */
  readonly expiry: number | null;
  /** Optional memo, at most 256 bytes. */
  readonly memo?: Uint8Array;
}
