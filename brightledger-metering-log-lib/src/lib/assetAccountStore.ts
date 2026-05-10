import type { MemberDelta } from './batchAccumulator.js';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Pluggable interface for tracking per-`(memberId, assetId)` optimistic
 * balances and settlement confirmation timestamps (Requirements 8.1–8.3).
 *
 * All operations MUST be synchronous and O(1) to avoid blocking the hot
 * append path (Requirement 8.4).
 */
export interface IAssetAccountStore {
  /**
   * Apply an optimistic delta immediately after a record is appended to the
   * metering log (Requirement 8.1).
   *
   * @param memberId  32-byte member identifier.
   * @param assetId   Asset identifier string.
   * @param amount    Signed micro-unit amount (positive = credit, negative = debit).
   * @param opId      Idempotency key — same as the record's `opId`.
   */
  applyDelta(
    memberId: Uint8Array,
    assetId: string,
    amount: bigint,
    opId: string,
  ): void;

  /**
   * Return the current optimistic balance for `(memberId, assetId)`.
   * Returns `0n` if no deltas have been applied yet.
   */
  getBalance(memberId: Uint8Array, assetId: string): bigint;

  /**
   * Return the millisecond timestamp of the most recent settlement
   * confirmation for `(memberId, assetId)`.  Returns `null` if the pair has
   * never been settled (Requirement 8.2).
   */
  getLastSettledAt(memberId: Uint8Array, assetId: string): number | null;

  /**
   * Record that a batch settlement has been confirmed by the asset ledger for
   * `(memberId, assetId)`, updating the `lastSettledAt` timestamp
   * (Requirement 8.2).
   *
   * @param memberId       32-byte member identifier.
   * @param assetId        Asset identifier.
   * @param settledAmount  Net amount confirmed in this settlement.
   * @param confirmedAtMs  Wall-clock timestamp (ms since epoch) of confirmation.
   */
  confirmSettlement(
    memberId: Uint8Array,
    assetId: string,
    settledAmount: bigint,
    confirmedAtMs: number,
  ): void;

  /**
   * Replay a reversal of every delta in `memberDeltas`, reducing each
   * member's optimistic balance by `(earned − spent)`.
   *
   * Called when a challenge is resolved against the operator so that credits
   * already applied optimistically are rolled back (Requirement 8.3).
   *
   * @param memberDeltas  Deltas from the disputed `BatchSettlementAction`.
   */
  reverseDeltas(memberDeltas: MemberDelta[]): void;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Composite map key for `(memberId, assetId)`. */
function _storeKey(memberId: Uint8Array, assetId: string): string {
  return `${Buffer.from(memberId).toString('hex')}:${assetId}`;
}

interface AccountState {
  /** Running optimistic balance, updated on every `appendRecord`. */
  balance: bigint;
  /** Cumulative confirmed balance across all confirmed settlements. */
  confirmedBalance: bigint;
  /** Ms timestamp of the most recent confirmed settlement, or `null`. */
  lastSettledAt: number | null;
}

// ── InMemoryAssetAccountStore ─────────────────────────────────────────────────

/**
 * Pure in-memory reference implementation of {@link IAssetAccountStore}.
 *
 * All operations are O(1) and synchronous, ensuring that neither optimistic
 * delta application nor settlement confirmation ever blocks the hot append
 * path (Requirement 8.4).
 *
 * Suitable for testing and for single-process deployments where durability is
 * provided by replaying the metering log on restart.
 */
export class InMemoryAssetAccountStore implements IAssetAccountStore {
  private readonly _state = new Map<string, AccountState>();

  // ── Private helpers ───────────────────────────────────────────────────────

  private _getOrCreate(memberId: Uint8Array, assetId: string): AccountState {
    const k = _storeKey(memberId, assetId);
    let s = this._state.get(k);
    if (s === undefined) {
      s = { balance: 0n, confirmedBalance: 0n, lastSettledAt: null };
      this._state.set(k, s);
    }
    return s;
  }

  // ── IAssetAccountStore ────────────────────────────────────────────────────

  applyDelta(
    memberId: Uint8Array,
    assetId: string,
    amount: bigint,
    _opId: string,
  ): void {
    this._getOrCreate(memberId, assetId).balance += amount;
  }

  getBalance(memberId: Uint8Array, assetId: string): bigint {
    return this._getOrCreate(memberId, assetId).balance;
  }

  getLastSettledAt(memberId: Uint8Array, assetId: string): number | null {
    return this._getOrCreate(memberId, assetId).lastSettledAt;
  }

  confirmSettlement(
    memberId: Uint8Array,
    assetId: string,
    settledAmount: bigint,
    confirmedAtMs: number,
  ): void {
    const s = this._getOrCreate(memberId, assetId);
    s.confirmedBalance += settledAmount;
    s.lastSettledAt = confirmedAtMs;
  }

  reverseDeltas(memberDeltas: MemberDelta[]): void {
    for (const delta of memberDeltas) {
      const net = delta.earned - delta.spent;
      this._getOrCreate(delta.memberId, delta.assetId).balance -= net;
    }
  }
}
