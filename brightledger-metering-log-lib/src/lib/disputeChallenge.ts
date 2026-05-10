import * as path from 'node:path';

import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';

import type { IAssetAccountStore } from './assetAccountStore.js';
import type { MemberDelta } from './batchAccumulator.js';
import {
  generateInclusionProof,
  INDEX_DIR_NAME,
  readBatchIndex,
} from './merkleStore.js';
import {
  merkleLeafHash,
  merkleRootFromLeaves,
  verifyInclusionProof,
  type InclusionProof,
} from './merkleTree.js';

// ── Public constants ──────────────────────────────────────────────────────────

/**
 * Default dispute window duration in milliseconds (24 hours).
 * After this period, a settlement with no successful challenge is marked FINAL.
 * (Requirement 7.1)
 */
export const DEFAULT_DISPUTE_WINDOW_MS = 86_400_000;

/**
 * Default time allowed for an operator to respond to a dispute in milliseconds
 * (6 hours). Failure to respond causes DISPUTED_NO_RESPONSE.
 * (Requirement 7.1)
 */
export const DEFAULT_DISPUTE_RESPONSE_MS = 21_600_000;

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Lifecycle status of a batch settlement.
 *
 * - `PENDING`               — Within the dispute window; no challenge received.
 * - `CHALLENGED`            — A challenge has been received; awaiting response.
 * - `FINAL`                 — Dispute window closed with no valid challenge, or
 *                             operator responded and proofs verified.
 * - `DISPUTED_NO_RESPONSE`  — Operator failed to respond within `disputeResponseMs`.
 * - `DISPUTED_FRAUD`        — Operator's response contained mismatched hashes or
 *                             invalid Merkle proofs.
 */
export type SettlementStatus =
  | 'PENDING'
  | 'CHALLENGED'
  | 'FINAL'
  | 'DISPUTED_NO_RESPONSE'
  | 'DISPUTED_FRAUD';

/**
 * Action submitted by any party to challenge a settlement during the dispute
 * window (Requirement 7.2).
 */
export interface BatchChallengeAction {
  kind: 'BatchChallenge';
  /** Stable identifier of the settlement being challenged. */
  settlementBatchId: string;
  /** Shard that produced the challenged settlement. */
  shardId: GuidV7Uint8Array;
  /** First sequence number of the challenged batch window. */
  fromSeq: bigint;
  /** Last sequence number of the challenged batch window. */
  toSeq: bigint;
  /** Identifier of the challenging party. */
  challengerId: string;
  /**
   * Human-readable description of the claimed discrepancy (e.g.
   * "Missing charge for opId=X" or "tipHash does not match local records").
   */
  claimedDiscrepancy: string;
}

/**
 * Per-asset dispute window configuration (Requirement 7.1).
 *
 * Both fields are optional; defaults are used for any omitted value.
 */
export interface DisputeWindowOptions {
  /**
   * Duration of the dispute window in milliseconds.
   * Default: {@link DEFAULT_DISPUTE_WINDOW_MS} (24 h).
   */
  disputeWindowMs?: number;
  /**
   * Maximum time allowed for the operator to respond to a challenge.
   * Default: {@link DEFAULT_DISPUTE_RESPONSE_MS} (6 h).
   */
  disputeResponseMs?: number;
}

/**
 * Result of validating a `BatchSettlementAction` before it is accepted.
 *
 * Used to enforce `fromSeq` continuity (Requirement 5.5) and `tipHash`
 * integrity on challenge (Requirement 5.6).
 */
export type ValidationResult =
  | { valid: true }
  | {
      valid: false;
      reason:
        | 'FROM_SEQ_DISCONTINUITY'
        | 'TIP_HASH_MISMATCH'
        | 'ITEMS_ROOT_MISMATCH';
      detail: string;
    };

/**
 * Operator-produced response to a dispute challenge (Requirement 7.3).
 *
 * Contains the full record range plus Merkle inclusion proofs for every
 * record so that the challenger can verify the operator's claim without
 * further log access.
 */
export interface ChallengeResponse {
  /** Identifier of the settlement being disputed. */
  batchId: string;
  fromSeq: bigint;
  toSeq: bigint;
  /** BLAKE3 chain tip over the last record in this batch. */
  tipHash: Uint8Array;
  /** RFC-9162 Merkle root over the records in this batch. */
  itemsRoot: Uint8Array;
  /** CBOR-encoded records in seq order. */
  encodedRecords: Uint8Array[];
  /**
   * Merkle inclusion proof for each record (index-aligned with
   * `encodedRecords`).
   */
  inclusionProofs: InclusionProof[];
}

/**
 * Outcome of auto-resolving a challenge against the on-chain data
 * (Requirement 7.4).
 */
export type ResolutionResult =
  | { status: 'FINAL' }
  | { status: 'DISPUTED_NO_RESPONSE' }
  | { status: 'DISPUTED_FRAUD'; detail: string };

// ── DisputeResolver ───────────────────────────────────────────────────────────

/**
 * Stateless helper that encodes the dispute-window validation and resolution
 * rules (Requirements 5.5, 5.6, 7.1–7.5).
 *
 * The class does not persist any state of its own; callers are responsible for
 * recording settlement status transitions externally.
 *
 * Usage pattern:
 * 1. On each incoming `BatchSettlementAction`:
 *    - Call `validateSequenceContinuity` to enforce `fromSeq` ordering.
 * 2. On a `BatchChallengeAction` during the dispute window:
 *    - Call `validateChallengeHashes` to check on-chain hashes vs. presented
 *      records.  A mismatch is itself evidence; the operator must respond.
 *    - Call `buildDisputeResponse` to assemble the operator's reply.
 * 3. After `disputeResponseMs`:
 *    - Call `resolveChallenge` with the response (or `null` for timeout).
 * 4. After `disputeWindowMs` with no challenge:
 *    - Call `finalizeIfExpired` to obtain `FINAL`.
 */
export class DisputeResolver {
  private readonly _dirPath: string;
  private readonly _disputeWindowMs: number;
  private readonly _disputeResponseMs: number;

  constructor(dirPath: string, options?: DisputeWindowOptions) {
    this._dirPath = dirPath;
    this._disputeWindowMs =
      options?.disputeWindowMs ?? DEFAULT_DISPUTE_WINDOW_MS;
    this._disputeResponseMs =
      options?.disputeResponseMs ?? DEFAULT_DISPUTE_RESPONSE_MS;
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  /** The configured dispute window duration in milliseconds. */
  get disputeWindowMs(): number {
    return this._disputeWindowMs;
  }

  /** The configured operator response deadline in milliseconds. */
  get disputeResponseMs(): number {
    return this._disputeResponseMs;
  }

  // ── Validation (Requirements 5.5, 5.6) ────────────────────────────────────

  /**
   * Reject a `BatchSettlementAction` whose `fromSeq` does not equal
   * `prevToSeq + 1` (or `0n` for the first batch from the shard).
   *
   * (Requirement 5.5)
   *
   * @param fromSeq    The `fromSeq` field from the incoming action.
   * @param prevToSeq  The `toSeq` of the shard's previous accepted batch, or
   *                   `null` if this is the first batch.
   */
  validateSequenceContinuity(
    fromSeq: bigint,
    prevToSeq: bigint | null,
  ): ValidationResult {
    const expected = prevToSeq === null ? 0n : prevToSeq + 1n;
    if (fromSeq !== expected) {
      return {
        valid: false,
        reason: 'FROM_SEQ_DISCONTINUITY',
        detail: `Expected fromSeq=${expected}, got fromSeq=${fromSeq}`,
      };
    }
    return { valid: true };
  }

  /**
   * Validate the on-chain `tipHash` and `itemsRoot` against a set of records
   * presented by the operator during a challenge (Requirement 5.6).
   *
   * A `tipHash` mismatch means the chain tip the operator committed to does
   * not match the hash they are now presenting — likely fraud.
   *
   * An `itemsRoot` mismatch means the Merkle root recomputed from the
   * presented records differs from the committed root — records were omitted
   * or altered.
   *
   * @param onChainTipHash    `tipHash` recorded on-chain in the settlement.
   * @param presentedTipHash  `tipHash` in the operator's challenge response.
   * @param onChainItemsRoot  `itemsRoot` recorded on-chain in the settlement.
   * @param encodedRecords    CBOR-encoded records in seq order (presented by
   *                          the operator in their response).
   */
  validateChallengeHashes(
    onChainTipHash: Uint8Array,
    presentedTipHash: Uint8Array,
    onChainItemsRoot: Uint8Array,
    encodedRecords: Uint8Array[],
  ): ValidationResult {
    if (!_bytesEqual(onChainTipHash, presentedTipHash)) {
      return {
        valid: false,
        reason: 'TIP_HASH_MISMATCH',
        detail: 'Presented tipHash does not match the on-chain tipHash',
      };
    }

    const leaves = encodedRecords.map((r) => merkleLeafHash(r));
    const computedRoot = merkleRootFromLeaves(leaves);
    if (!_bytesEqual(computedRoot, onChainItemsRoot)) {
      return {
        valid: false,
        reason: 'ITEMS_ROOT_MISMATCH',
        detail:
          'Recomputed itemsRoot from presented records does not match the on-chain itemsRoot',
      };
    }

    return { valid: true };
  }

  // ── Dispute response (Requirement 7.3) ─────────────────────────────────────

  /**
   * Build the operator's response to a dispute challenge.
   *
   * Loads the pre-computed batch Merkle index from disk and generates an
   * inclusion proof for every record in the range.  The caller must supply
   * the CBOR-encoded records in seq order.
   *
   * @param batchId        Stable batch identifier assigned at settlement time.
   * @param fromSeq        Start of the batch window.
   * @param toSeq          End of the batch window.
   * @param tipHash        Chain tip committed in the original settlement.
   * @param itemsRoot      Merkle root committed in the original settlement.
   * @param encodedRecords CBOR-encoded records in seq order for the batch.
   *
   * @throws {Error} if the on-disk batch index is missing or malformed.
   */
  buildDisputeResponse(
    batchId: string,
    fromSeq: bigint,
    toSeq: bigint,
    tipHash: Uint8Array,
    itemsRoot: Uint8Array,
    encodedRecords: Uint8Array[],
  ): ChallengeResponse {
    const indexDir = path.join(this._dirPath, INDEX_DIR_NAME);
    const idx = readBatchIndex(indexDir, fromSeq, toSeq);
    const inclusionProofs = encodedRecords.map((_, i) =>
      generateInclusionProof(idx, i),
    );

    return {
      batchId,
      fromSeq,
      toSeq,
      tipHash: new Uint8Array(tipHash),
      itemsRoot: new Uint8Array(itemsRoot),
      encodedRecords,
      inclusionProofs,
    };
  }

  // ── Auto-resolution (Requirement 7.4) ──────────────────────────────────────

  /**
   * Auto-resolve a challenge against the on-chain committed hashes.
   *
   * - If `response` is `null` (operator timed out), returns
   *   `DISPUTED_NO_RESPONSE`.
   * - If `response.tipHash` differs from `onChainTipHash`, returns
   *   `DISPUTED_FRAUD`.
   * - If the `itemsRoot` recomputed from `response.encodedRecords` differs
   *   from `onChainItemsRoot`, returns `DISPUTED_FRAUD`.
   * - If any inclusion proof in `response.inclusionProofs` fails verification,
   *   returns `DISPUTED_FRAUD`.
   * - Otherwise returns `FINAL`.
   *
   * (Requirement 7.4)
   *
   * @param response         Operator response, or `null` on timeout.
   * @param onChainTipHash   `tipHash` committed on-chain in the settlement.
   * @param onChainItemsRoot `itemsRoot` committed on-chain in the settlement.
   */
  resolveChallenge(
    response: ChallengeResponse | null,
    onChainTipHash: Uint8Array,
    onChainItemsRoot: Uint8Array,
  ): ResolutionResult {
    if (response === null) {
      return { status: 'DISPUTED_NO_RESPONSE' };
    }

    // tipHash must match on-chain record.
    if (!_bytesEqual(response.tipHash, onChainTipHash)) {
      return {
        status: 'DISPUTED_FRAUD',
        detail: 'Response tipHash does not match the on-chain tipHash',
      };
    }

    // itemsRoot must be reproducible from the presented records.
    const leaves = response.encodedRecords.map((r) => merkleLeafHash(r));
    const computedRoot = merkleRootFromLeaves(leaves);
    if (!_bytesEqual(computedRoot, onChainItemsRoot)) {
      return {
        status: 'DISPUTED_FRAUD',
        detail:
          'Recomputed itemsRoot from response records does not match the on-chain itemsRoot',
      };
    }

    // Every inclusion proof must verify against the committed root.
    for (let i = 0; i < response.inclusionProofs.length; i++) {
      const proof = response.inclusionProofs[i];
      if (!verifyInclusionProof(proof)) {
        return {
          status: 'DISPUTED_FRAUD',
          detail: `Inclusion proof at index ${i} failed verification`,
        };
      }
    }

    return { status: 'FINAL' };
  }

  /**
   * Mark the settlement `FINAL` if the dispute window has already expired with
   * no successful challenge (Requirement 7.5).
   *
   * @param settledAtMs  Wall-clock time (ms since epoch) when the settlement
   *                     was accepted on-chain.
   * @param nowMs        Current time; defaults to `Date.now()`.
   * @returns `'FINAL'` if the window has expired, `'PENDING'` otherwise.
   */
  finalizeIfExpired(
    settledAtMs: number,
    nowMs: number = Date.now(),
  ): SettlementStatus {
    if (nowMs - settledAtMs >= this._disputeWindowMs) {
      return 'FINAL';
    }
    return 'PENDING';
  }
}

// ── Internal utilities ────────────────────────────────────────────────────────

function _bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// ── Phase 7 — Dispute reversal ────────────────────────────────────────────────

/**
 * Reverse all optimistic deltas in `store` when a challenge has been resolved
 * against the operator (Requirement 8.3).
 *
 * This function is a no-op for any `resolution.status` value other than
 * `DISPUTED_FRAUD` or `DISPUTED_NO_RESPONSE`.
 *
 * @param resolution   Result returned by {@link DisputeResolver.resolveChallenge}.
 * @param memberDeltas Deltas from the disputed `BatchSettlementAction`.
 * @param store        Account store whose optimistic balances should be rolled back.
 */
export function applyDisputeReversal(
  resolution: ResolutionResult,
  memberDeltas: MemberDelta[],
  store: IAssetAccountStore,
): void {
  if (
    resolution.status === 'DISPUTED_FRAUD' ||
    resolution.status === 'DISPUTED_NO_RESPONSE'
  ) {
    store.reverseDeltas(memberDeltas);
  }
}
