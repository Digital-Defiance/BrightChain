import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';

import type { IAssetAccountStore } from './assetAccountStore.js';
import {
  MeteringLogClosedError,
  ProcessKeyExpiredError,
  ProcessKeyNotConfirmedError,
} from './errors.js';
import { computeSignMessage, GENESIS_HASH, hashRecord } from './hashChain.js';
import {
  generateProcessKey,
  type IProcessKey,
  signMessage,
} from './processKey.js';
import {
  createProcessKeyCertAction,
  createProcessKeyRevokeAction,
  MAX_PROCESS_KEY_LIFETIME_MS,
} from './processKeyActions.js';
import type { IProcessKeyLedger } from './processKeyLedger.js';
import {
  decodeMeteringRecord,
  encodeMeteringRecord,
  type MeteringRecord,
} from './record.js';
import {
  getSidecarPath,
  readSignatureEntries,
  SidecarWriter,
} from './sidecar.js';
import type {
  ILogPosition,
  IMeteringLogStorage,
  IStorageEntry,
} from './storage/meteringLogStorage.js';

/** Minimum allowed signing cadence (K) — Req 3.1. */
export const MIN_SIGNING_CADENCE = 16;

/** Maximum allowed signing cadence (K) — Req 3.1. */
export const MAX_SIGNING_CADENCE = 256;

/** Default signing cadence: sign every 64 records — Req 3.1. */
export const DEFAULT_SIGNING_CADENCE = 64;

/** Parameters for appending a metering record. */
export interface AppendRecordParams {
  /** Event discriminator (e.g. "joule.charge"). */
  op: string;

  /** 32-byte member identifier. */
  memberId: Uint8Array;

  /** Asset identifier string. */
  assetId: string;

  /** Signed micro-unit amount (positive = credit, negative = debit). */
  amount: bigint;

  /** Idempotency key, unique within a batch window. */
  opId: string;

  /**
   * Opaque 32-byte caller context.
   * Overridden by the shard with the process key fingerprint for seq=0
   * (genesis) records per Req 2.2.
   */
  contextHash: Uint8Array;
}

/** Result returned from a successful {@link MeteringLogShard.appendRecord} call. */
export interface AppendRecordResult {
  /** Sequence number assigned to this record. */
  seq: bigint;

  /** Storage position of the written record. */
  position: ILogPosition;
}

/** Construction options for {@link MeteringLogShard}. */
export interface MeteringLogShardOptions {
  /** The Ed25519 process key used to sign hash-chain checkpoints. */
  processKey: IProcessKey;

  /**
   * Number of records between automatic signature checkpoints (K).
   * Must be between MIN_SIGNING_CADENCE and MAX_SIGNING_CADENCE.
   * Defaults to DEFAULT_SIGNING_CADENCE (64).
   */
  signingCadence?: number;

  /**
   * Asset-ledger adapter for process key lifecycle (Requirement 4.1–4.4).
   * When provided, the shard submits a `ProcessKeyCertAction` on `open()`,
   * waits for confirmation, and emits `ProcessKeyRevokeAction` on `close()`.
   * When absent, lifecycle enforcement is skipped (standalone / test mode).
   */
  processKeyLedger?: IProcessKeyLedger;

  /**
   * Operator signing function used to authenticate
   * `ProcessKeyCertAction` / `ProcessKeyRevokeAction` payloads.
   * Defaults to a no-op that returns 64 zero bytes when no ledger is set.
   * Required in production when `processKeyLedger` is provided.
   */
  operatorSignFn?: (payload: Uint8Array) => Uint8Array;

  /**
   * Process key validity window in milliseconds.
   * Must be ≤ MAX_PROCESS_KEY_LIFETIME_MS (7 days).
   * Defaults to MAX_PROCESS_KEY_LIFETIME_MS.
   */
  certLifetimeMs?: number;

  /**
   * Optional account store for optimistic balance tracking.
   * When provided, `appendRecord` calls `applyDelta` immediately after each
   * record is written to the log (Requirement 8.1).
   */
  accountStore?: IAssetAccountStore;
}

/**
 * Layer-2 metering log shard.
 *
 * Wraps a pluggable {@link IMeteringLogStorage} back-end with:
 * - BLAKE3 hash-chain chaining across records (Req 2.3)
 * - Ed25519 signature checkpoints every K records (Req 3.1)
 * - Signature sidecar file co-located with the log directory (Req 3.3)
 * - Graceful-shutdown signature on `close()` and on explicit `flush()` (Req 3.5)
 *
 * On `open()`, any existing records are scanned to reconstruct the current
 * chain state, enabling crash recovery.
 */
/** Default timeout (ms) when waiting for ledger cert confirmation. */
const DEFAULT_CERT_CONFIRMATION_TIMEOUT_MS = 30_000;

/** No-op operator signing function used when no ledger is configured. */
const _noopSign = (_payload: Uint8Array): Uint8Array => new Uint8Array(64);

export class MeteringLogShard {
  private readonly _storage: IMeteringLogStorage;
  private _processKey: IProcessKey;
  private readonly _signingCadence: number;
  private readonly _sidecarWriter = new SidecarWriter();
  private readonly _ledger: IProcessKeyLedger | null;
  private _operatorSignFn: (payload: Uint8Array) => Uint8Array;
  private readonly _certLifetimeMs: number;
  private readonly _accountStore: IAssetAccountStore | null;

  private _shardId: GuidV7Uint8Array | null = null;
  private _dirPath: string | null = null;
  private _seq: bigint = -1n;
  private _tipHash: Uint8Array = new Uint8Array(GENESIS_HASH);
  private _appendsSinceSig = 0;

  /** Whether the current process-key cert has been confirmed by the ledger. */
  private _certConfirmed: boolean;

  /**
   * Process key notAfter (µs since epoch).  `null` when no ledger is
   * configured.  Populated after cert submission in `open()`.
   */
  private _notAfter: bigint | null = null;

  constructor(storage: IMeteringLogStorage, options: MeteringLogShardOptions) {
    const k = options.signingCadence ?? DEFAULT_SIGNING_CADENCE;
    if (k < MIN_SIGNING_CADENCE || k > MAX_SIGNING_CADENCE) {
      throw new RangeError(
        `signingCadence must be between ${MIN_SIGNING_CADENCE} and ${MAX_SIGNING_CADENCE}, got ${k}`,
      );
    }
    this._storage = storage;
    this._processKey = options.processKey;
    this._signingCadence = k;
    this._ledger = options.processKeyLedger ?? null;
    this._operatorSignFn = options.operatorSignFn ?? _noopSign;
    this._certLifetimeMs =
      options.certLifetimeMs ?? MAX_PROCESS_KEY_LIFETIME_MS;
    this._accountStore = options.accountStore ?? null;
    // When no ledger is provided, consider the cert pre-confirmed.
    this._certConfirmed = this._ledger === null;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  /**
   * Open the underlying storage and reconstruct chain state from any existing
   * records in the shard directory.
   *
   * When a `processKeyLedger` was provided at construction time, this method
   * also submits a `ProcessKeyCertAction` and awaits confirmation before
   * returning (Requirement 4.1).
   *
   * @throws {ProcessKeyNotConfirmedError} if the ledger does not confirm the
   *         cert within the timeout.
   */
  async open(dirPath: string, shardId: GuidV7Uint8Array): Promise<void> {
    await this._storage.open(dirPath, shardId);
    this._shardId = shardId;
    this._dirPath = dirPath;

    // Reconstruct seq and tipHash from existing records.
    let lastEncoded: Uint8Array | null = null;
    for await (const entry of this._storage.scan()) {
      lastEncoded = entry.payload;
      const rec = decodeMeteringRecord(entry.payload);
      this._seq = rec.seq;
    }

    if (lastEncoded !== null) {
      this._tipHash = hashRecord(lastEncoded);
    } else {
      this._tipHash = new Uint8Array(GENESIS_HASH);
    }

    // Reconstruct appendsSinceSig from the sidecar.
    const sidecarPath = getSidecarPath(dirPath);
    const existingSigs = readSignatureEntries(sidecarPath);
    if (existingSigs.length > 0) {
      const lastSig = existingSigs[existingSigs.length - 1];
      this._appendsSinceSig = Number(this._seq - lastSig.seq);
    } else if (this._seq >= 0n) {
      this._appendsSinceSig = Number(this._seq) + 1;
    } else {
      this._appendsSinceSig = 0;
    }

    // Open the sidecar writer for subsequent appends.
    this._sidecarWriter.open(sidecarPath);

    // Process-key lifecycle: submit cert and await confirmation (Req 4.1).
    if (this._ledger !== null) {
      await this._submitAndConfirmCert(shardId);
    }
  }

  /**
   * Submit a `ProcessKeyCertAction` for the current process key and wait for
   * ledger confirmation.  Sets `_certConfirmed` and `_notAfter` on success.
   *
   * @throws {ProcessKeyNotConfirmedError} if confirmation times out.
   */
  private async _submitAndConfirmCert(
    shardId: GuidV7Uint8Array,
  ): Promise<void> {
    if (this._ledger === null) return;
    const notBefore = BigInt(Date.now()) * 1000n;
    const certAction = createProcessKeyCertAction(
      shardId,
      this._processKey.fingerprint,
      this._processKey.publicKey,
      this._operatorSignFn,
      notBefore,
      this._certLifetimeMs,
    );
    await this._ledger.submitCert(certAction);
    const confirmed = await this._ledger.awaitCertConfirmation(
      this._processKey.fingerprint,
      DEFAULT_CERT_CONFIRMATION_TIMEOUT_MS,
    );
    if (!confirmed) {
      throw new ProcessKeyNotConfirmedError(
        _toHex(this._processKey.fingerprint),
      );
    }
    this._certConfirmed = true;
    this._notAfter = certAction.notAfter;
  }

  /**
   * Emit a final signature checkpoint and close all resources.
   *
   * When a `processKeyLedger` is configured, a `ProcessKeyRevokeAction` with
   * `reason: 'shutdown'` is submitted before the storage is closed
   * (Requirement 4.3).
   */
  async close(): Promise<void> {
    if (!this._storage.isOpen) return;

    // Graceful-shutdown signature (Req 3.5).
    if (this._seq >= 0n) {
      this._emitSignature();
    }

    // Revoke the process key on graceful shutdown (Req 4.3).
    if (this._ledger !== null && this._shardId !== null) {
      const revokeAction = createProcessKeyRevokeAction(
        this._shardId,
        this._processKey.fingerprint,
        'shutdown',
        this._operatorSignFn,
      );
      await this._ledger.submitRevoke(revokeAction);
    }

    this._sidecarWriter.close();
    await this._storage.close();

    this._shardId = null;
    this._dirPath = null;
    this._seq = -1n;
    this._tipHash = new Uint8Array(GENESIS_HASH);
    this._appendsSinceSig = 0;
    this._certConfirmed = this._ledger === null;
    this._notAfter = null;
  }

  // ── Writes ───────────────────────────────────────────────────────────────

  /**
   * Append a metering record, updating the hash chain and emitting a
   * signature checkpoint every K records (Req 3.1).
   *
   * @throws {ProcessKeyNotConfirmedError} if the process key cert has not yet
   *         been confirmed by the asset ledger (Requirement 4.1).
   * @throws {ProcessKeyExpiredError} if the current time exceeds `notAfter`
   *         (Requirement 4.6 — key rotation required).
   */
  async appendRecord(params: AppendRecordParams): Promise<AppendRecordResult> {
    if (!this._storage.isOpen || this._shardId === null) {
      throw new MeteringLogClosedError();
    }

    // Guard: cert must be confirmed before any records may be appended (Req 4.1).
    if (!this._certConfirmed) {
      throw new ProcessKeyNotConfirmedError(
        _toHex(this._processKey.fingerprint),
      );
    }

    // Guard: reject if the process key has passed its notAfter (Req 4.6).
    if (
      this._notAfter !== null &&
      BigInt(Date.now()) * 1000n > this._notAfter
    ) {
      throw new ProcessKeyExpiredError(_toHex(this._processKey.fingerprint));
    }

    const seq = this._seq + 1n;
    const ts = BigInt(Date.now()) * 1000n; // microseconds since epoch

    // Genesis records carry the process key fingerprint as context_hash (Req 2.2).
    const contextHash =
      seq === 0n ? this._processKey.fingerprint : params.contextHash;

    const record: MeteringRecord = {
      seq,
      prev_hash: new Uint8Array(this._tipHash),
      ts,
      op: params.op,
      memberId: params.memberId,
      assetId: params.assetId,
      amount: params.amount,
      opId: params.opId,
      context_hash: contextHash,
    };

    const encoded = encodeMeteringRecord(record);
    const position = await this._storage.append(encoded);

    // Advance chain state.
    this._seq = seq;
    this._tipHash = hashRecord(encoded);
    this._appendsSinceSig++;

    // Optimistic account balance update (Req 8.1).
    this._accountStore?.applyDelta(
      params.memberId,
      params.assetId,
      params.amount,
      params.opId,
    );

    // Sign every K records (Req 3.1).
    if (this._appendsSinceSig >= this._signingCadence) {
      this._emitSignature();
    }

    return { seq, position };
  }

  /**
   * Flush pending writes to durable storage and emit a signature checkpoint
   * if any records have been appended since the last signature (Req 3.5).
   */
  async flush(): Promise<void> {
    if (!this._storage.isOpen) return;

    if (this._seq >= 0n && this._appendsSinceSig > 0) {
      this._emitSignature();
    }

    await this._storage.flush();
  }

  // ── Reads ────────────────────────────────────────────────────────────────

  /** Delegate scan to the underlying storage. */
  scan(from?: ILogPosition): AsyncIterable<IStorageEntry> {
    return this._storage.scan(from);
  }

  // ── State accessors ──────────────────────────────────────────────────────

  get isOpen(): boolean {
    return this._storage.isOpen;
  }

  /** Current highest sequence number (–1n if no records have been written). */
  get seq(): bigint {
    return this._seq;
  }

  /** BLAKE3 hash of the last appended record (32 zero bytes if empty). */
  get tipHash(): Uint8Array {
    return this._tipHash;
  }

  get shardId(): GuidV7Uint8Array {
    if (this._shardId === null) throw new MeteringLogClosedError();
    return this._shardId;
  }

  get dirPath(): string {
    if (this._dirPath === null) throw new MeteringLogClosedError();
    return this._dirPath;
  }

  // ── Private ──────────────────────────────────────────────────────────────

  private _emitSignature(): void {
    if (this._shardId === null || !this._sidecarWriter.isOpen) return;

    const message = computeSignMessage(
      this._shardId,
      this._seq,
      this._tipHash,
      this._processKey.fingerprint,
    );
    const sig = signMessage(this._processKey, message);

    this._sidecarWriter.append({
      seq: this._seq,
      tipHash: new Uint8Array(this._tipHash),
      processKeyFingerprint: new Uint8Array(this._processKey.fingerprint),
      sig,
    });

    this._appendsSinceSig = 0;
  }

  // ── Key rotation ─────────────────────────────────────────────────────────

  /**
   * Rotate the process key.
   *
   * 1. Emits a signature checkpoint at the current chain tip (sealing the
   *    old-key epoch).
   * 2. If a ledger is configured, submits a `ProcessKeyRevokeAction` with
   *    `reason: 'rotation'` for the old key (Requirement 4.3).
   * 3. Installs the new process key (generating one if not supplied).
   * 4. If a ledger is configured, submits a new `ProcessKeyCertAction` and
   *    awaits confirmation (Requirement 4.1).
   *
   * @param newKey          - New process key to install.  Generated if absent.
   * @param newOperatorSignFn - Optional updated operator signing function.
   * @returns The installed new process key.
   * @throws {ProcessKeyNotConfirmedError} if the new cert cannot be confirmed.
   */
  async rotate(
    newKey?: IProcessKey,
    newOperatorSignFn?: (payload: Uint8Array) => Uint8Array,
  ): Promise<IProcessKey> {
    const oldKey = this._processKey;
    const shardId = this._shardId;

    // Seal the current epoch with a signature at the rotation point.
    if (this._seq >= 0n) {
      this._emitSignature();
    }

    // Revoke old key as 'rotation' (Req 4.3).
    if (this._ledger !== null && shardId !== null) {
      const revokeAction = createProcessKeyRevokeAction(
        shardId,
        oldKey.fingerprint,
        'rotation',
        this._operatorSignFn,
      );
      await this._ledger.submitRevoke(revokeAction);
    }

    // Update operator signing function if a new one was provided.
    if (newOperatorSignFn !== undefined) {
      this._operatorSignFn = newOperatorSignFn;
    }

    // Install new process key.
    this._processKey = newKey ?? generateProcessKey();
    this._certConfirmed = this._ledger === null;
    this._notAfter = null;

    // Submit cert for new key (Req 4.1).
    if (this._ledger !== null && shardId !== null) {
      await this._submitAndConfirmCert(shardId);
    }

    return this._processKey;
  }
}

// ── Module-private helpers ────────────────────────────────────────────────

/** Hex-encode a Uint8Array (used for error messages). */
function _toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
