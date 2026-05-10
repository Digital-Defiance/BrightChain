/**
 * @fileoverview BalanceProjectionService — stateful projection of an
 * `IAssetProjectedState` from a stream of `IAssetAction` entries.
 *
 * Supports:
 *  - Cold replay (start from `emptyState()`, apply every entry in order).
 *  - Warm replay (load latest snapshot, replay only entries after the
 *    snapshot's `sequenceNumber`, then verify against cold hash; fall back
 *    to cold on mismatch — Req 3.6).
 *  - Incremental `apply` with automatic snapshotting every N entries.
 *
 * @see Requirements 3.1, 3.3, 3.4, 3.6, 3.7
 */

import type { IAssetAction } from '@brightchain/brightledger-assets-lib';
import { emptyState, type IAssetProjectedState } from './projectedState.js';
import { AssetStateReducer } from './reducer.js';
import { computeStateHash, type SnapshotService } from './snapshot.js';
import type { ILedgerContext } from './validator.js';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * A single ordered entry in the ledger, pairing the action with the
 * environmental context at the time of its acceptance.
 */
export interface ILedgerEntry {
  readonly action: IAssetAction;
  readonly context: ILedgerContext;
}

// ── BalanceProjectionService ──────────────────────────────────────────────────

/**
 * Stateful projection service.
 *
 * Maintains the current `IAssetProjectedState` and orchestrates snapshotting
 * via an injected `SnapshotService`.
 *
 * Typical usage:
 * ```typescript
 * const store   = new MemorySnapshotStore();
 * const svc     = new SnapshotService(store, 100);
 * const proj    = new BalanceProjectionService(svc);
 *
 * await proj.start('ledger-1', allEntries);   // cold or warm
 * await proj.apply(action, context);          // incremental update
 * const current = proj.state;
 * ```
 */
export class BalanceProjectionService {
  private _state: IAssetProjectedState;
  private _ledgerId: string | undefined = undefined;
  private _entriesSinceSnapshot = 0;

  constructor(
    private readonly snapshotService: SnapshotService,
    initialState?: IAssetProjectedState,
  ) {
    this._state = initialState ?? emptyState();
  }

  // ── Read-only accessors ───────────────────────────────────────────────────

  /** The current projected state. */
  get state(): IAssetProjectedState {
    return this._state;
  }

  // ── Start / warm+cold replay ──────────────────────────────────────────────

  /**
   * Initialise the projection for `ledgerId` by replaying `entries`.
   *
   * **Warm path** (Req 3.4):
   *   Load the latest snapshot, replay entries with index ≥ snapshot's
   *   `sequenceNumber`, and compare the resulting state hash with a full
   *   cold replay.  If hashes match, adopt the warm state (faster).
   *
   * **Cold path fallback** (Req 3.3, 3.6):
   *   If no snapshot exists, or the warm-replay hash differs from the cold
   *   hash, replay every entry from `emptyState()`.
   *
   * After `start`, `_entriesSinceSnapshot` is reset to 0.
   */
  async start(
    ledgerId: string,
    entries: ReadonlyArray<ILedgerEntry>,
  ): Promise<void> {
    this._ledgerId = ledgerId;
    this._entriesSinceSnapshot = 0;

    const snapshot = await this.snapshotService.loadLatest(ledgerId);

    if (snapshot !== undefined) {
      // Warm path: replay only entries not yet reflected in the snapshot.
      // `lastSequence` after K reductions is exactly K, so slice from index K.
      const remaining = entries.slice(Number(snapshot.sequenceNumber));
      let warmState = snapshot.state;
      for (const entry of remaining) {
        warmState = AssetStateReducer.reduce(
          warmState,
          entry.action,
          entry.context,
        );
      }

      // Verify warm equals cold (Req 3.6).
      const coldState = BalanceProjectionService.replayAll(entries);
      const warmHash = computeStateHash(warmState);
      const coldHash = computeStateHash(coldState);

      if (warmHash.every((b, i) => b === coldHash[i])) {
        this._state = warmState;
        return;
      }
      // Hash mismatch — fall through to cold path.
    }

    // Cold path.
    this._state = BalanceProjectionService.replayAll(entries);
  }

  // ── Incremental apply ─────────────────────────────────────────────────────

  /**
   * Apply a single pre-validated action to the projection.
   *
   * Callers MUST have already run `AssetActionValidator.validate` and confirmed
   * the result is `valid: true` before invoking this method (Req 3.7).
   *
   * A snapshot is automatically written every `snapshotService.snapshotIntervalEntries`
   * entries (Req 3.5).
   *
   * @returns The updated state after the action has been applied.
   */
  async apply(
    action: IAssetAction,
    context: ILedgerContext,
  ): Promise<IAssetProjectedState> {
    this._state = AssetStateReducer.reduce(this._state, action, context);
    this._entriesSinceSnapshot++;

    if (
      this._ledgerId !== undefined &&
      this._entriesSinceSnapshot >= this.snapshotService.snapshotIntervalEntries
    ) {
      await this.snapshotService.save(this._ledgerId, this._state);
      this._entriesSinceSnapshot = 0;
    }

    return this._state;
  }

  // ── Static helpers ────────────────────────────────────────────────────────

  /**
   * Pure function: replay `entries` starting from `fromState` (defaults to
   * `emptyState()`) and return the resulting `IAssetProjectedState`.
   *
   * Does NOT trigger any snapshotting or side effects.
   */
  static replayAll(
    entries: ReadonlyArray<ILedgerEntry>,
    fromState?: IAssetProjectedState,
  ): IAssetProjectedState {
    let state = fromState ?? emptyState();
    for (const entry of entries) {
      state = AssetStateReducer.reduce(state, entry.action, entry.context);
    }
    return state;
  }
}
