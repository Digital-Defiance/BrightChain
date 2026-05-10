/**
 * @fileoverview IProcessKeyRevokeAction — payload for revoking an ephemeral process key.
 *
 * Immediately invalidates the certified process key identified by its fingerprint.
 * Any settlement window signed with that key after the revocation sequence is rejected.
 *
 * @see Requirements 11.4
 */

import { ActionKind } from './actionKind.js';

/** Why the process key is being revoked. */
export type ProcessKeyRevokeReason = 'rotation' | 'compromise' | 'shutdown';

/** Payload that invalidates a previously certified process key. */
export interface IProcessKeyRevokeAction {
  readonly kind: ActionKind.ProcessKeyRevoke;
  /** SHA-256 fingerprint of the process key being revoked (32 bytes). */
  readonly processKeyFingerprint: Uint8Array;
  /** Reason for the revocation. */
  readonly reason: ProcessKeyRevokeReason;
  /**
   * If set, the revocation only applies to entries at or after this sequence.
   * Useful for graceful rotation without invalidating in-flight settlements.
   */
  readonly effectiveAtSeq?: bigint;
}
