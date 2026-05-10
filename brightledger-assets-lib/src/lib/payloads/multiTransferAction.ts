/**
 * @fileoverview IMultiTransferAction — payload for an atomic multi-leg transfer.
 *
 * All legs must succeed atomically. The outer signature covers the serialized
 * batch of legs and is produced by the initiating account.
 *
 * @see Requirements 3.6
 */

import { ActionKind } from './actionKind.js';
import { ITransferAction } from './transferAction.js';

/** Payload that groups multiple transfer legs into one atomic operation. */
export interface IMultiTransferAction {
  readonly kind: ActionKind.MultiTransfer;
  /** Individual transfer legs, evaluated atomically (all-or-nothing). */
  readonly legs: readonly ITransferAction[];
  /** Signature over the serialized legs by the initiating account. */
  readonly signature: Uint8Array;
}
