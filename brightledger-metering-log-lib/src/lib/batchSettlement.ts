import * as fs from 'node:fs';
import * as path from 'node:path';

import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';
import type { IAssetAccountStore } from './assetAccountStore.js';
import { BatchAccumulator, type MemberDelta } from './batchAccumulator.js';
import { INDEX_DIR_NAME, writeBatchIndex } from './merkleStore.js';
import { merkleLeafHash } from './merkleTree.js';
import type { ISignatureEntry } from './sidecar.js';

// ── Public constants ──────────────────────────────────────────────────────────

/** Default maximum records per batch window (Requirement 5.1). */
export const DEFAULT_MAX_RECORDS = 10_000;

/** Default maximum age of a batch window in milliseconds (Requirement 5.1). */
export const DEFAULT_MAX_AGE_MS = 5_000;

/** Sub-directory name within a shard directory for local settlement records. */
export const SETTLEMENTS_DIR_NAME = 'settlements';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * Settlement action emitted once per batch window (Requirement 5.2).
 *
 * Carries all the information needed by the asset ledger and by downstream
 * verifiers to authenticate the settlement without holding the full sidecar
 * (Requirement 5.7).
 */
export interface BatchSettlementAction {
  kind: 'BatchSettlement';
  shardId: GuidV7Uint8Array;
  fromSeq: bigint;
  toSeq: bigint;
  /** BLAKE3 chain tip of the last record in the batch. */
  tipHash: Uint8Array;
  /**
   * RFC-9162 Merkle root over the BLAKE3 leaf hashes of every record in this
   * batch, in `seq` order (Requirement 5.3).
   */
  itemsRoot: Uint8Array;
  /** Sorted, deduplicated per-`(memberId, assetId)` deltas (Requirement 5.4). */
  memberDeltas: MemberDelta[];
  /** Most recent valid signature entry covering `toSeq` (Requirement 5.7). */
  sigEnvelope: ISignatureEntry;
}

/**
 * Minimal adapter interface for submitting settlements to the asset ledger
 * (Requirement 5.4).
 */
export interface IAssetLedgerAdapter {
  /**
   * Submit a settlement action and return a stable batch identifier assigned
   * by the ledger.
   */
  submit(action: BatchSettlementAction): Promise<string>;
}

/** Options for constructing a {@link Batcher}. */
export interface BatcherOptions {
  /** Owning shard identifier. */
  shardId: GuidV7Uint8Array;
  /**
   * Sequence number at which the first batch window begins.
   * Subsequent windows are continuous (`prevToSeq + 1`).  Default `0n`.
   */
  fromSeq?: bigint;
  /** Maximum records before an auto-flush is triggered. Default 10,000. */
  maxRecords?: number;
  /** Maximum age (ms) of a window before an auto-flush is triggered. Default 5,000. */
  maxAgeMs?: number;
  /** Root directory of the owning shard (for `index/` and `settlements/` sub-dirs). */
  dirPath: string;
  /** Optional ledger adapter; omit to skip remote submission. */
  ledger?: IAssetLedgerAdapter;
  /**
   * Optional account store for settlement confirmation tracking.
   * When provided, `flush()` calls `confirmSettlement` for each member delta
   * after the ledger confirms the batch (Requirement 8.2).
   */
  accountStore?: IAssetAccountStore;
}

/** Result returned when `addRecord` succeeds. */
export interface AddRecordResult {
  isDuplicate: false;
  /**
   * `true` when the window trigger has fired (maxRecords reached or age
   * exceeded) but no `sigEnvelope` was available to auto-flush.  The caller
   * should emit a signature and call `flush(sigEnvelope)` promptly.
   */
  pendingFlush: boolean;
}

/** Result returned when `addRecord` detects an already-seen `(memberId, opId)`. */
export interface DuplicateAddRecordResult {
  isDuplicate: true;
  /** The sequence number assigned when the operation was first recorded. */
  existingSeq: bigint;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

/** Persisted representation of a settled batch (serialised to disk as JSON). */
interface PersistedSettlement {
  batchId: string;
  fromSeq: string;
  toSeq: string;
  tipHash: string;
  itemsRoot: string;
  memberDeltas: Array<{
    memberId: string;
    assetId: string;
    earned: string;
    spent: string;
  }>;
  confirmedAt: string;
}

function _settlementPath(
  settlementsDir: string,
  fromSeq: bigint,
  toSeq: bigint,
): string {
  return path.join(settlementsDir, `settlement_${fromSeq}_${toSeq}.json`);
}

function _persistSettlement(
  settlementsDir: string,
  batchId: string,
  action: BatchSettlementAction,
): void {
  fs.mkdirSync(settlementsDir, { recursive: true });
  const record: PersistedSettlement = {
    batchId,
    fromSeq: action.fromSeq.toString(),
    toSeq: action.toSeq.toString(),
    tipHash: Buffer.from(action.tipHash).toString('hex'),
    itemsRoot: Buffer.from(action.itemsRoot).toString('hex'),
    memberDeltas: action.memberDeltas.map((d) => ({
      memberId: Buffer.from(d.memberId).toString('hex'),
      assetId: d.assetId,
      earned: d.earned.toString(),
      spent: d.spent.toString(),
    })),
    confirmedAt: BigInt(Date.now()).toString(),
  };
  fs.writeFileSync(
    _settlementPath(settlementsDir, action.fromSeq, action.toSeq),
    JSON.stringify(record, null, 2),
  );
}

// ── Batcher ───────────────────────────────────────────────────────────────────

/**
 * Accumulates metering records into windows and emits
 * {@link BatchSettlementAction} objects when a window is flushed.
 *
 * Window triggers (Requirement 5.1):
 *  - `maxRecords` — flush once the record count reaches the limit.
 *  - `maxAgeMs`   — flush once the window has been open long enough.
 *  - explicit `flush(sigEnvelope)` — caller-driven.
 *
 * After each flush the window resets and `fromSeq` advances to
 * `prevToSeq + 1`, maintaining continuity (Requirement 5.5).
 */
export class Batcher {
  private readonly _shardId: GuidV7Uint8Array;
  private readonly _maxRecords: number;
  private readonly _maxAgeMs: number;
  private readonly _dirPath: string;
  private readonly _ledger: IAssetLedgerAdapter | null;
  private readonly _accountStore: IAssetAccountStore | null;

  private readonly _accumulator = new BatchAccumulator();
  private _leaves: Uint8Array[] = [];
  private _fromSeq: bigint;
  private _toSeq = -1n;
  private _tipHash = new Uint8Array(32);
  private _latestSig: ISignatureEntry | null = null;
  private _pendingFlush = false;
  private _windowStartMs = 0;
  private _timer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: BatcherOptions) {
    this._shardId = options.shardId;
    this._fromSeq = options.fromSeq ?? 0n;
    this._maxRecords = options.maxRecords ?? DEFAULT_MAX_RECORDS;
    this._maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    this._dirPath = options.dirPath;
    this._ledger = options.ledger ?? null;
    this._accountStore = options.accountStore ?? null;
  }

  // ── Queries ────────────────────────────────────────────────────────────────

  /** Number of records buffered in the current window. */
  get pendingCount(): number {
    return this._accumulator.recordCount;
  }

  /**
   * `true` when a window trigger has fired but no `sigEnvelope` was available
   * to complete the auto-flush.  The caller should emit a signature and call
   * `flush(sigEnvelope)`.
   */
  get pendingFlush(): boolean {
    return this._pendingFlush;
  }

  /** Current window start sequence number. */
  get fromSeq(): bigint {
    return this._fromSeq;
  }

  /** Whether the current window has reached `maxRecords`. */
  isWindowFull(): boolean {
    return this._accumulator.recordCount >= this._maxRecords;
  }

  /** Whether the current window has exceeded `maxAgeMs` since the first record. */
  isWindowAged(): boolean {
    if (this._accumulator.recordCount === 0) return false;
    return Date.now() - this._windowStartMs >= this._maxAgeMs;
  }

  // ── Writes ────────────────────────────────────────────────────────────────

  /**
   * Add one metering record to the current batch window.
   *
   * If `(memberId, opId)` was already seen in this window, the record is
   * **not** re-added and a {@link DuplicateAddRecordResult} is returned
   * carrying the original sequence number (Requirement 2.5).
   *
   * If the window becomes full after this addition and a `sigEnvelope` is
   * available, an automatic flush is initiated.  Otherwise `pendingFlush` is
   * set to `true`.
   *
   * @param encodedRecord  Raw CBOR bytes (as returned by `encodeMeteringRecord`).
   * @param memberId       32-byte member identifier.
   * @param assetId        Human-readable asset identifier.
   * @param amount         Net micro-unit amount (positive = credit, negative = debit).
   * @param opId           Caller-supplied idempotency key.
   * @param seq            Sequence number assigned to the record in the log.
   * @param tipHash        BLAKE3 chain tip after appending this record.
   * @param sigEnvelope    Most recent valid signature entry (optional).
   */
  addRecord(
    encodedRecord: Uint8Array,
    memberId: Uint8Array,
    assetId: string,
    amount: bigint,
    opId: string,
    seq: bigint,
    tipHash: Uint8Array,
    sigEnvelope?: ISignatureEntry,
  ): AddRecordResult | DuplicateAddRecordResult {
    // Idempotency check (Requirement 2.5).
    if (this._accumulator.hasDuplicate(memberId, opId)) {
      return {
        isDuplicate: true,
        existingSeq: this._accumulator.getExistingSeq(memberId, opId) as bigint,
      };
    }

    // Start the age timer on the first record in this window.
    if (this._accumulator.recordCount === 0) {
      this._windowStartMs = Date.now();
      this._startTimer();
    }

    this._accumulator.add(memberId, assetId, amount, opId, seq);
    this._leaves.push(merkleLeafHash(encodedRecord));
    this._toSeq = seq;
    this._tipHash = new Uint8Array(tipHash);
    if (sigEnvelope !== undefined) {
      this._latestSig = sigEnvelope;
    }

    // Check maxRecords window trigger (Requirement 5.1).
    if (this.isWindowFull()) {
      this._pendingFlush = true;
    }

    return { isDuplicate: false, pendingFlush: this._pendingFlush };
  }

  /**
   * Flush the current batch window and produce a {@link BatchSettlementAction}.
   *
   * Returns `null` when the window is empty.
   *
   * The supplied `sigEnvelope` MUST cover `toSeq` so that verifiers can
   * authenticate the settlement (Requirement 5.7).
   *
   * Side-effects:
   *  - Writes a batch Merkle index to `<dirPath>/index/`.
   *  - Persists a local settlement record to `<dirPath>/settlements/`.
   *  - Optionally submits to the configured asset ledger.
   *  - Resets the accumulator and advances `fromSeq` to `toSeq + 1`.
   */
  async flush(
    sigEnvelope: ISignatureEntry,
  ): Promise<BatchSettlementAction | null> {
    if (this._accumulator.recordCount === 0) return null;

    this._clearTimer();
    this._pendingFlush = false;

    const indexDir = path.join(this._dirPath, INDEX_DIR_NAME);
    const idx = writeBatchIndex(
      indexDir,
      this._fromSeq,
      this._toSeq,
      this._leaves,
    );

    const action: BatchSettlementAction = {
      kind: 'BatchSettlement',
      shardId: this._shardId,
      fromSeq: this._fromSeq,
      toSeq: this._toSeq,
      tipHash: new Uint8Array(this._tipHash),
      itemsRoot: new Uint8Array(idx.root),
      memberDeltas: this._accumulator.materialize(),
      sigEnvelope,
    };

    // Submit to asset ledger (Requirement 5.4).
    let batchId = `${this._shardId.asShortHexGuid}:${this._fromSeq}:${this._toSeq}`;
    if (this._ledger !== null) {
      batchId = await this._ledger.submit(action);
    }

    // Persist locally for dispute response (Requirement 5.4).
    const settlementsDir = path.join(this._dirPath, SETTLEMENTS_DIR_NAME);
    _persistSettlement(settlementsDir, batchId, action);

    // Confirm settlement in account store (Req 8.2).
    if (this._accountStore !== null) {
      const confirmedAt = Date.now();
      for (const delta of action.memberDeltas) {
        const net = delta.earned - delta.spent;
        this._accountStore.confirmSettlement(
          delta.memberId,
          delta.assetId,
          net,
          confirmedAt,
        );
      }
    }

    // Advance window (Requirement 5.5 — fromSeq continuity).
    const nextFromSeq = this._toSeq + 1n;
    this._accumulator.reset();
    this._leaves = [];
    this._fromSeq = nextFromSeq;
    this._toSeq = nextFromSeq - 1n;
    this._tipHash = new Uint8Array(32);
    this._latestSig = null;

    return action;
  }

  /**
   * Reverse all member deltas in the account store for a disputed settlement
   * (Requirement 8.3).  No-op when no account store was configured.
   *
   * @param memberDeltas  Deltas from the disputed `BatchSettlementAction`.
   */
  reverseSettlement(memberDeltas: MemberDelta[]): void {
    this._accountStore?.reverseDeltas(memberDeltas);
  }

  /**
   * Stop the age timer and mark the window as needing a flush if records are
   * pending.  Call before discarding the batcher instance.
   */
  stop(): void {
    this._clearTimer();
    if (this._accumulator.recordCount > 0) {
      this._pendingFlush = true;
    }
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _startTimer(): void {
    if (this._timer !== null || this._maxAgeMs <= 0) return;
    this._timer = setTimeout(() => {
      this._timer = null;
      if (this._accumulator.recordCount === 0) return;
      if (this._latestSig !== null) {
        void this.flush(this._latestSig);
      } else {
        this._pendingFlush = true;
      }
    }, this._maxAgeMs);
  }

  private _clearTimer(): void {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
}
