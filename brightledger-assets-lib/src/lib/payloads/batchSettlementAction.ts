/**
 * @fileoverview IBatchSettlementAction — payload for settling a metered-ledger shard window.
 *
 * Carries the delta snapshot for all members in a shard during a given sequence
 * window, together with the Merkle / hash-chain proofs needed to verify the
 * settlement against the live metering log.
 *
 * @see Requirements 10.1–10.4
 */

import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';
import { ActionKind } from './actionKind.js';

/** Per-member balance delta within a settlement window. */
export interface IMemberDelta {
  /** Member account public key. */
  readonly memberKey: Uint8Array;
  /** Net change in µ-units (may be negative for net debtors). */
  readonly delta: bigint;
}

/** Payload that closes a metered-ledger shard window and records balance deltas. */
export interface IBatchSettlementAction {
  readonly kind: ActionKind.BatchSettlement;
  /** Shard identifier (matches the metering-log shard). */
  readonly shardId: GuidV7Uint8Array;
  /** First sequence number in the settlement window (inclusive). */
  readonly fromSeq: bigint;
  /** Last sequence number in the settlement window (inclusive). */
  readonly toSeq: bigint;
  /** Balance deltas for every member in the shard. */
  readonly memberDeltas: readonly IMemberDelta[];
  /** Hash of the last metering-log entry in the window (32 bytes). */
  readonly tipHash: Uint8Array;
  /** Merkle root of all entries in the window (32 bytes). */
  readonly itemsRoot: Uint8Array;
  /** SHA-256 fingerprint of the process key that signed the window (32 bytes). */
  readonly processKeyFingerprint: Uint8Array;
  /** Signature over `(shardId ‖ fromSeq ‖ toSeq ‖ itemsRoot ‖ tipHash)` by the process key. */
  readonly signature: Uint8Array;
}
