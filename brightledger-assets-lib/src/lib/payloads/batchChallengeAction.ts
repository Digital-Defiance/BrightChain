/**
 * @fileoverview IBatchChallengeAction — payload for disputing a settlement window.
 *
 * Any participant in a shard may raise a challenge against a settlement entry
 * during the dispute window (default 24h, min 6h, max 7 days). The challenge
 * must include the competing tip hash that the challenger believes is correct.
 *
 * @see Requirements 12.1–12.3
 */

import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';
import { ActionKind } from './actionKind.js';

/** Default dispute window in milliseconds (24 hours). */
export const DEFAULT_DISPUTE_WINDOW_MS = 24 * 60 * 60 * 1000;
/** Minimum dispute window in milliseconds (6 hours). */
export const MIN_DISPUTE_WINDOW_MS = 6 * 60 * 60 * 1000;
/** Maximum dispute window in milliseconds (7 days). */
export const MAX_DISPUTE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Payload that raises a dispute against a settlement window. */
export interface IBatchChallengeAction {
  readonly kind: ActionKind.BatchChallenge;
  /** Shard identifier of the settlement being challenged. */
  readonly shardId: GuidV7Uint8Array;
  /** Sequence number of the `BatchSettlement` entry being disputed. */
  readonly settlementSeq: bigint;
  /** The tip hash the challenger claims is correct (32 bytes). */
  readonly claimedTipHash: Uint8Array;
  /** Challenger's account public key. */
  readonly challengerKey: Uint8Array;
  /** Signature by `challengerKey` over `(shardId ‖ settlementSeq ‖ claimedTipHash)`. */
  readonly signature: Uint8Array;
}
