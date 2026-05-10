/**
 * @fileoverview IOperatorFreezeAction — payload for a platform-level freeze.
 *
 * Unlike FreezeAccount (which is scoped to a single asset), an operator freeze
 * suspends ALL asset activity for an account. Can only be submitted by a
 * platform operator key.
 *
 * @see Requirements 9.1–9.2
 */

import { ActionKind } from './actionKind.js';

/** Payload that suspends all asset activity for an account at the operator level. */
export interface IOperatorFreezeAction {
  readonly kind: ActionKind.OperatorFreeze;
  /** The account being suspended. */
  readonly account: Uint8Array;
  /** Whether to freeze (`true`) or unfreeze (`false`) the account. */
  readonly frozen: boolean;
  /** Human-readable rationale (<= 256 bytes). */
  readonly reason: Uint8Array;
}
