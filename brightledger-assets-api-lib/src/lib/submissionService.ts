/**
 * @fileoverview SubmissionService — single-writer queue for asset-ledger entries.
 *
 * Pipeline per submission:
 *   1. Size cap check (OVERSIZED)
 *   2. Deserialise bytes → `IAssetAction` (MALFORMED on failure)
 *   3. Per-account rate-limit check (RATE_LIMIT)
 *   4. Deduplication by (sender, nonce, assetId) — returns prior receipt
 *   5. `AssetActionValidator.validate` — returns rejection on failure
 *   6. `ledger.append` — persists the raw bytes
 *   7. `projectionService.apply` — advances in-memory state
 *   8. Emit `AssetEntryAccepted` event
 *
 * The service serialises all write operations through a single promise chain
 * (the _queue field) so entries land in the ledger in strict submission order.
 *
 * @see Requirements 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 * @see Design: Layer 3 — Programmable Asset Ledger § SubmissionService
 */

import type { ILedgerSigner } from '@brightchain/brightchain-lib';
import {
  ActionKind,
  AssetActionSerializer,
  type IAssetAction,
  type IAttestationAction,
} from '@brightchain/brightledger-assets-lib';
import { EventEmitter } from 'node:events';
import { BalanceProjectionService } from './balanceProjection.js';
import { AssetActionValidator, type ILedgerContext } from './validator.js';

// ── Constants ─────────────────────────────────────────────────────────────────

/** Default maximum bytes per submitted payload (64 KiB). */
export const DEFAULT_SIZE_CAP_BYTES = 64 * 1024;

/** Default per-account submissions allowed per minute. */
export const DEFAULT_RATE_LIMIT_PER_MIN = 60;

/** Event name emitted when an entry is successfully accepted. */
export const ASSET_ENTRY_ACCEPTED_EVENT = 'AssetEntryAccepted';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Minimal ledger interface required by SubmissionService. */
export interface IAssetLedgerWriter {
  /** Current number of entries (= next sequence number). */
  readonly length: number;
  /** Append raw bytes signed by `signer`; resolves to the entry hash bytes. */
  append(
    payload: Uint8Array,
    signer: ILedgerSigner,
  ): Promise<{ toUint8Array(): Uint8Array }>;
}

/** Successful acceptance receipt returned to the caller. */
export interface ISubmissionReceipt {
  readonly entryHash: Uint8Array;
  readonly sequenceNumber: number;
  readonly acceptedAt: number;
}

/** Rejection result returned when validation or parsing fails. */
export interface ISubmissionRejection {
  readonly rejected: true;
  readonly code: string;
  readonly error: string;
}

/** Union of acceptance and rejection outcomes. */
export type SubmissionResult = ISubmissionReceipt | ISubmissionRejection;

/** Options for configuring SubmissionService behaviour. */
export interface ISubmissionServiceOptions {
  /** Maximum payload size in bytes (default: 64 KiB). */
  readonly sizeCap?: number;
  /** Maximum submissions per account per minute (default: 60). */
  readonly rateLimit?: number;
}

/** Payload carried by `AssetEntryAccepted` events. */
export interface IAssetEntryAcceptedEvent {
  readonly ledgerId: string;
  /** Asset ID (hex) if determinable from the action, otherwise `undefined`. */
  readonly assetId?: string;
  readonly entryHash: Uint8Array;
  readonly sequenceNumber: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Encode a Uint8Array as a lowercase hex string. */
function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('hex');
}

/**
 * Extract a (sender, nonce, assetId) triple for deduplication from an action.
 *
 * For `Transfer` and `MultiTransfer` actions we use the `from` field as sender
 * and the action-level `nonce`.  For all other actions the primary signer
 * public key (first in `signerPublicKeys`) acts as the sender and nonce is 0n.
 */
function dedupKey(action: IAssetAction, context: ILedgerContext): string {
  switch (action.kind) {
    case ActionKind.Transfer: {
      const senderHex = toHex(action.from);
      const assetHex = toHex(action.assetId);
      return `${senderHex}:${action.nonce.toString()}:${assetHex}`;
    }
    case ActionKind.MultiTransfer: {
      // MultiTransfer has no top-level `from`; derive key from the first leg.
      const firstLeg = action.legs[0];
      if (firstLeg === undefined) {
        return 'unknown:0:';
      }
      const senderHex = toHex(firstLeg.from);
      const assetHex = toHex(firstLeg.assetId);
      return `${senderHex}:${firstLeg.nonce.toString()}:${assetHex}`;
    }
    default: {
      // Issuer/operator actions: key off action kind + first signer + derived asset.
      const signerHex =
        context.signerPublicKeys.length > 0
          ? toHex(context.signerPublicKeys[0])
          : 'unknown';
      const assetId = context.derivedAssetId ?? '';
      return `${action.kind}:${signerHex}:0:${assetId}`;
    }
  }
}

/** Extract the hex asset ID from an action for event emission. */
function extractAssetId(action: IAssetAction): string | undefined {
  switch (action.kind) {
    case ActionKind.IssueAsset:
    case ActionKind.Mint:
    case ActionKind.Burn:
    case ActionKind.Transfer:
    case ActionKind.MultiTransfer:
    case ActionKind.FreezeAccount:
    case ActionKind.UnfreezeAccount:
    case ActionKind.WhitelistAdd:
    case ActionKind.WhitelistRemove:
    case ActionKind.RotateIssuerSet:
    case ActionKind.RetireAsset:
    case ActionKind.OperatorFreeze:
      return 'assetId' in action
        ? toHex(action.assetId as Uint8Array)
        : undefined;
    default:
      return undefined;
  }
}

// ── SubmissionService ─────────────────────────────────────────────────────────

/**
 * Serialised single-writer queue that validates, appends, and projects
 * each incoming asset-action entry.
 */
export class SubmissionService extends EventEmitter {
  private readonly _ledger: IAssetLedgerWriter;
  private readonly _ledgerId: string;
  private readonly _projectionService: BalanceProjectionService;
  private readonly _signer: ILedgerSigner;
  private readonly _sizeCap: number;
  private readonly _rateLimit: number;

  /** Serial execution queue — all writes chain off this promise. */
  private _queue: Promise<unknown> = Promise.resolve();

  /**
   * Dedup store: maps dedupKey → prior receipt.
   * Only successful acceptances are stored.
   */
  private readonly _dedup = new Map<string, ISubmissionReceipt>();

  /**
   * Per-account sliding-window rate limiter.
   * Maps hex(accountKey) → sorted array of submission timestamps (ms).
   */
  private readonly _rateLimiter = new Map<string, number[]>();

  /**
   * Set of entry-hash hex strings that have been operator-redacted.
   * Checked by the read API before serving proofs (returns 451).
   */
  private readonly _redactionList = new Set<string>();

  constructor(
    ledger: IAssetLedgerWriter,
    ledgerId: string,
    projectionService: BalanceProjectionService,
    signer: ILedgerSigner,
    validator: AssetActionValidator,
    options?: ISubmissionServiceOptions,
  ) {
    super();
    this._ledger = ledger;
    this._ledgerId = ledgerId;
    this._projectionService = projectionService;
    this._signer = signer;
    this._sizeCap = options?.sizeCap ?? DEFAULT_SIZE_CAP_BYTES;
    this._rateLimit = options?.rateLimit ?? DEFAULT_RATE_LIMIT_PER_MIN;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Submit a serialised `IAssetAction` for acceptance.
   *
   * Returns either an `ISubmissionReceipt` on success or an
   * `ISubmissionRejection` when the action is invalid, oversized, rate-limited,
   * or a duplicate.
   */
  submit(
    payload: Uint8Array,
    context: ILedgerContext,
  ): Promise<SubmissionResult> {
    const next = this._queue.then(
      () => this._submitInternal(payload, context),
      () => this._submitInternal(payload, context),
    );
    this._queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  /**
   * Wait for all queued submissions to settle (resolve or reject).
   * Safe to call multiple times; subsequent calls see the same settled queue.
   */
  drain(): Promise<void> {
    return this._queue.then(
      () => undefined,
      () => undefined,
    );
  }

  // ── Redaction API ─────────────────────────────────────────────────────────

  /**
   * Return `true` when the given entry-hash hex string is in the redaction list.
   * The read API uses this to gate the proof endpoint with HTTP 451.
   */
  isRedacted(entryHashHex: string): boolean {
    return this._redactionList.has(entryHashHex.toLowerCase());
  }

  /**
   * Mark an entry as redacted without recording a ledger attestation.
   * Use `recordRedaction` when a durable ledger record is also needed.
   */
  addRedaction(entryHashHex: string): void {
    this._redactionList.add(entryHashHex.toLowerCase());
  }

  /**
   * Remove an entry from the runtime redaction list.
   * Does NOT remove any `AttestationAction` already written to the ledger.
   */
  removeRedaction(entryHashHex: string): void {
    this._redactionList.delete(entryHashHex.toLowerCase());
  }

  /**
   * Operator-level path: mark `entryHashHex` as redacted AND append an
   * `AttestationAction` to the ledger for audit purposes.
   *
   * This bypasses the normal validation pipeline because
   * `validateAttestation` requires the `assetId` to exist in state —
   * redaction attestations use a sentinel zero assetId that would fail
   * that check.  The reducer (`reduceAttestation`) only increments
   * `lastSequence` and does not inspect the assetId, so state remains
   * consistent.
   *
   * The operation is serialised through the same `_queue` as regular
   * submissions to prevent interleaving.
   */
  recordRedaction(
    entryHashHex: string,
    context: ILedgerContext,
  ): Promise<void> {
    const hex = entryHashHex.toLowerCase();
    const next = this._queue.then(
      () => this._recordRedactionInternal(hex, context),
      () => this._recordRedactionInternal(hex, context),
    );
    this._queue = next.then(
      () => undefined,
      () => undefined,
    );
    return next;
  }

  // ── Internal pipeline ─────────────────────────────────────────────────────

  /**
   * Internal implementation of `recordRedaction`.
   * Called exclusively from within the `_queue` chain.
   */
  private async _recordRedactionInternal(
    entryHashHex: string,
    context: ILedgerContext,
  ): Promise<void> {
    this._redactionList.add(entryHashHex);

    // Build a claimHash: use the entry hash bytes directly if 32 bytes,
    // otherwise zero-pad/truncate to 32.
    const entryHashBytes = Buffer.from(entryHashHex, 'hex');
    const claimHash = new Uint8Array(32);
    claimHash.set(entryHashBytes.subarray(0, 32));

    // Sentinel zero assetId — the validator would reject this assetId but
    // we bypass validation for operator redaction actions.
    const zeroAssetId = new Uint8Array(
      32,
    ) as unknown as IAttestationAction['assetId'];

    const attestation: IAttestationAction = {
      kind: ActionKind.Attestation,
      assetId: zeroAssetId,
      subject: Buffer.from(entryHashHex, 'ascii'),
      claimHash,
      expiresAt: null,
    };

    const payload = AssetActionSerializer.serialize(attestation);
    await this._ledger.append(payload, this._signer);
    // Advance projection sequence — reduceAttestation only increments
    // lastSequence and does not check the assetId.
    await this._projectionService.apply(attestation, context);
  }

  private async _submitInternal(
    payload: Uint8Array,
    context: ILedgerContext,
  ): Promise<SubmissionResult> {
    // ── Step 1: size cap ────────────────────────────────────────────────────
    if (payload.byteLength > this._sizeCap) {
      return {
        rejected: true,
        code: 'OVERSIZED',
        error: `Payload ${payload.byteLength} bytes exceeds the ${this._sizeCap}-byte cap`,
      };
    }

    // ── Step 2: deserialise ─────────────────────────────────────────────────
    let action: IAssetAction;
    try {
      action = AssetActionSerializer.deserialize(payload);
    } catch (err: unknown) {
      const code = 'MALFORMED';
      const msg =
        err instanceof Error ? err.message : 'Failed to deserialise payload';
      return { rejected: true, code, error: msg };
    }

    // ── Step 3: rate limit ──────────────────────────────────────────────────
    const accountKey = this._accountKey(action, context);
    if (!this._checkRateLimit(accountKey)) {
      return {
        rejected: true,
        code: 'RATE_LIMIT',
        error: `Account ${accountKey} has exceeded the rate limit of ${this._rateLimit} submissions per minute`,
      };
    }

    // ── Step 4: deduplication ───────────────────────────────────────────────
    const dkey = dedupKey(action, context);
    const existing = this._dedup.get(dkey);
    if (existing !== undefined) {
      return existing;
    }

    // ── Step 5: validate ────────────────────────────────────────────────────
    const vResult = AssetActionValidator.validate(
      action,
      this._projectionService.state,
      context,
    );
    if (vResult.valid === false) {
      return {
        rejected: true,
        code: vResult.code,
        error: vResult.message,
      };
    }

    // ── Step 6: append to ledger ────────────────────────────────────────────
    const sequenceNumber = this._ledger.length;
    const checksum = await this._ledger.append(payload, this._signer);
    const entryHash = checksum.toUint8Array();

    // ── Step 7: apply to projection ─────────────────────────────────────────
    await this._projectionService.apply(action, context);

    // ── Step 8: record rate-limit hit ───────────────────────────────────────
    this._recordRateLimitHit(accountKey);

    // ── Build receipt ───────────────────────────────────────────────────────
    const receipt: ISubmissionReceipt = {
      entryHash,
      sequenceNumber,
      acceptedAt: context.now,
    };

    // Store in dedup map (only non-operator-class actions benefit from dedup)
    this._dedup.set(dkey, receipt);

    // ── Step 9: emit event ──────────────────────────────────────────────────
    const event: IAssetEntryAcceptedEvent = {
      ledgerId: this._ledgerId,
      assetId: extractAssetId(action),
      entryHash,
      sequenceNumber,
    };
    this.emit(ASSET_ENTRY_ACCEPTED_EVENT, event);

    return receipt;
  }

  // ── Rate-limit helpers ────────────────────────────────────────────────────

  /**
   * Returns `true` if the account has NOT yet exceeded the rate limit for the
   * current sliding minute window.  Does NOT record the hit (call
   * `_recordRateLimitHit` after acceptance).
   */
  private _checkRateLimit(accountKey: string): boolean {
    const now = Date.now();
    const windowStart = now - 60_000;
    const hits = this._rateLimiter.get(accountKey) ?? [];
    const recentHits = hits.filter((t) => t > windowStart);
    return recentHits.length < this._rateLimit;
  }

  private _recordRateLimitHit(accountKey: string): void {
    const now = Date.now();
    const windowStart = now - 60_000;
    const hits = (this._rateLimiter.get(accountKey) ?? []).filter(
      (t) => t > windowStart,
    );
    hits.push(now);
    this._rateLimiter.set(accountKey, hits);
  }

  // ── Account key extraction ────────────────────────────────────────────────

  /**
   * Derive a stable hex identifier for the rate-limit bucket.
   * For Transfer/MultiTransfer, use `from`.  Otherwise use the first signer.
   */
  private _accountKey(action: IAssetAction, context: ILedgerContext): string {
    if (action.kind === ActionKind.Transfer) {
      return toHex(action.from);
    }
    if (action.kind === ActionKind.MultiTransfer) {
      const firstLeg = action.legs[0];
      if (firstLeg !== undefined) {
        return toHex(firstLeg.from);
      }
    }
    if (context.signerPublicKeys.length > 0) {
      return toHex(context.signerPublicKeys[0]);
    }
    return 'unknown';
  }
}
