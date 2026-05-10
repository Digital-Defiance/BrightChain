/**
 * @fileoverview IProcessKeyCertAction — payload for issuing an ephemeral process key certificate.
 *
 * Process keys are short-lived signing keys used by automation agents to sign
 * metering-log windows without exposing long-term issuer keys. The certificate
 * bounds the key's validity to a specific time window (max 7 days) and set of
 * shard IDs.
 *
 * @see Requirements 11.1–11.3
 */

import { ActionKind } from './actionKind.js';

/** Maximum validity span for a process key in milliseconds (7 days). */
export const PROCESS_KEY_MAX_VALIDITY_MS = 7 * 24 * 60 * 60 * 1000;

/** Payload that certifies an ephemeral process key for shard-window signing. */
export interface IProcessKeyCertAction {
  readonly kind: ActionKind.ProcessKeyCert;
  /** The ephemeral public key being certified (33 bytes, compressed). */
  readonly processPublicKey: Uint8Array;
  /** Unix timestamp (ms) at which the key becomes valid. */
  readonly notBefore: number;
  /**
   * Unix timestamp (ms) at which the key expires.
   * `notAfter - notBefore` must be <= {@link PROCESS_KEY_MAX_VALIDITY_MS}.
   */
  readonly notAfter: number;
  /** Shard IDs this key is authorized to sign settlement windows for. */
  readonly shardIds: readonly string[];
}
