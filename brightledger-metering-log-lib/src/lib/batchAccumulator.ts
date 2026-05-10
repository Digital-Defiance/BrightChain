import { DuplicateOpIdError } from './errors.js';

/** Convert a Uint8Array to a lowercase hex string (used as map key). */
function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

/**
 * Accumulated net delta for a single `(memberId, assetId)` pair within a
 * batch window (Requirement 5.4).
 */
export interface MemberDelta {
  /** 32-byte member identifier. */
  memberId: Uint8Array;
  /** Human-readable asset identifier (e.g. "joule"). */
  assetId: string;
  /** Sum of all positive-amount credits recorded in this window. */
  earned: bigint;
  /** Sum of the absolute values of all negative-amount debits in this window. */
  spent: bigint;
}

/**
 * In-memory accumulator that tracks `(memberId, assetId)` → `{earned, spent}`
 * net deltas for a single batch window.
 *
 * Idempotency (Requirement 2.5): each `(memberId, opId)` pair may only be
 * added once per window.  Duplicate additions throw {@link DuplicateOpIdError}.
 */
export class BatchAccumulator {
  /** Delta map: composite key = `${memberId hex}|${assetId}`. */
  private readonly _deltas = new Map<
    string,
    { memberId: Uint8Array; assetId: string; earned: bigint; spent: bigint }
  >();

  /** Idempotency map: composite key = `${memberId hex}|${opId}` → seq. */
  private readonly _opSeqMap = new Map<string, bigint>();

  private _recordCount = 0;

  // ── Queries ────────────────────────────────────────────────────────────────

  /** Total number of records added to this window (not reset to zero yet). */
  get recordCount(): number {
    return this._recordCount;
  }

  /**
   * Whether `(memberId, opId)` has already been recorded in this window.
   */
  hasDuplicate(memberId: Uint8Array, opId: string): boolean {
    return this._opSeqMap.has(`${toHex(memberId)}|${opId}`);
  }

  /**
   * Retrieve the sequence number assigned when `(memberId, opId)` was first
   * added.  Returns `null` if not present.
   */
  getExistingSeq(memberId: Uint8Array, opId: string): bigint | null {
    return this._opSeqMap.get(`${toHex(memberId)}|${opId}`) ?? null;
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  /**
   * Record the contribution of one metering record.
   *
   * Positive `amount` values increment `earned`; negative values increment
   * `spent` (stored as the absolute value).  Zero-amount records are tracked
   * for idempotency but do not affect `earned` or `spent`.
   *
   * @throws {DuplicateOpIdError} if `(memberId, opId)` was already added.
   */
  add(
    memberId: Uint8Array,
    assetId: string,
    amount: bigint,
    opId: string,
    seq: bigint,
  ): void {
    const opKey = `${toHex(memberId)}|${opId}`;
    if (this._opSeqMap.has(opKey)) {
      throw new DuplicateOpIdError(opId);
    }
    this._opSeqMap.set(opKey, seq);

    const deltaKey = `${toHex(memberId)}|${assetId}`;
    let delta = this._deltas.get(deltaKey);
    if (delta === undefined) {
      delta = {
        memberId: new Uint8Array(memberId),
        assetId,
        earned: 0n,
        spent: 0n,
      };
      this._deltas.set(deltaKey, delta);
    }

    if (amount > 0n) {
      delta.earned += amount;
    } else if (amount < 0n) {
      delta.spent += -amount;
    }

    this._recordCount++;
  }

  // ── Finalisation ──────────────────────────────────────────────────────────

  /**
   * Materialise the accumulated deltas, sorted by `(memberId bytes
   * lexicographic, assetId)` (Requirement 5.4).
   */
  materialize(): MemberDelta[] {
    return [...this._deltas.values()]
      .map(({ memberId, assetId, earned, spent }) => ({
        memberId: new Uint8Array(memberId),
        assetId,
        earned,
        spent,
      }))
      .sort((a, b) => {
        const len = Math.min(a.memberId.length, b.memberId.length);
        for (let i = 0; i < len; i++) {
          const diff = (a.memberId[i] ?? 0) - (b.memberId[i] ?? 0);
          if (diff !== 0) return diff;
        }
        if (a.memberId.length !== b.memberId.length) {
          return a.memberId.length - b.memberId.length;
        }
        return a.assetId < b.assetId ? -1 : a.assetId > b.assetId ? 1 : 0;
      });
  }

  /** Clear all accumulated state, ready for the next batch window. */
  reset(): void {
    this._deltas.clear();
    this._opSeqMap.clear();
    this._recordCount = 0;
  }
}
