/**
 * @fileoverview IBatchSettlementResolutionAction — payload for resolving a settlement dispute.
 *
 * Written by the platform operator after adjudicating a BatchChallenge. Records
 * whether the original settlement stands (`accepted`) or is voided (`rejected`),
 * together with an optional corrected delta set.
 *
 * @see Requirements 12.4–12.5
 */

import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';
import { ActionKind } from './actionKind.js';
import { IMemberDelta } from './batchSettlementAction.js';

/** Outcome of a dispute resolution. */
export type ResolutionOutcome = 'accepted' | 'rejected';

/** Payload that resolves a BatchChallenge dispute. */
export interface IBatchSettlementResolutionAction {
  readonly kind: ActionKind.BatchSettlementResolution;
  /** Shard identifier of the disputed settlement. */
  readonly shardId: GuidV7Uint8Array;
  /** Sequence number of the `BatchSettlement` entry that was disputed. */
  readonly settlementSeq: bigint;
  /** Sequence number of the `BatchChallenge` entry that triggered this resolution. */
  readonly challengeSeq: bigint;
  /** Whether the original settlement is accepted or voided. */
  readonly outcome: ResolutionOutcome;
  /**
   * Corrected member deltas when `outcome === 'rejected'`.
   * Empty or absent when `outcome === 'accepted'`.
   */
  readonly correctedDeltas?: readonly IMemberDelta[];
  /** Human-readable rationale (<= 256 bytes). */
  readonly reason: Uint8Array;
}
