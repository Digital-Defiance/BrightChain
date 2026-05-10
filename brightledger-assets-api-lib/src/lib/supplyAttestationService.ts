/**
 * @fileoverview SupplyAttestationService — periodically emits supply-level
 * `AttestationAction` entries to the asset ledger.
 *
 * A supply attestation encodes the current `issuedTotal`, `burnedTotal`, and
 * `stateHash` for a given asset into a deterministic `claimHash` and appends
 * it as an `AttestationAction`.  An independent verifier can replay the ledger
 * and confirm that the attested figures match the projected state at the same
 * sequence number.
 *
 * Wire format of the `claimHash` (all big-endian, 32 bytes total):
 *   SHA-256(
 *     assetIdHex               NUL-terminated ASCII
 *     issued:${issuedTotal}    NUL-terminated ASCII
 *     burned:${burnedTotal}    NUL-terminated ASCII
 *     stateHash:${stateHashHex} NUL-terminated ASCII
 *   )
 *
 * @see Requirement 11.3
 */

import { createHash } from 'node:crypto';

import type { ILedgerSigner } from '@brightchain/brightchain-lib';
import {
  ActionKind,
  AssetActionSerializer,
  type IAttestationAction,
} from '@brightchain/brightledger-assets-lib';

import type { IAssetProjectedState } from './projectedState.js';
import { computeStateHash } from './snapshot.js';
import type { IAssetLedgerWriter } from './submissionService.js';

// ── Public interface ──────────────────────────────────────────────────────────

/** Callback used by the service to obtain the current projected state. */
export type StateProvider = () => IAssetProjectedState;

/** Options for `SupplyAttestationService`. */
export interface ISupplyAttestationOptions {
  /**
   * How often (in milliseconds) to emit a supply attestation for each
   * tracked asset.  Defaults to 3 600 000 (one hour).
   */
  readonly intervalMs?: number;
}

const DEFAULT_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build a deterministic 32-byte `claimHash` that encodes the supply figures
 * and state hash for a single asset at a point in time.
 */
export function buildSupplyClaimHash(
  assetIdHex: string,
  issuedTotal: bigint,
  burnedTotal: bigint,
  stateHashHex: string,
): Uint8Array {
  const h = createHash('sha256');
  h.update(`assetId:${assetIdHex}\x00`);
  h.update(`issued:${issuedTotal.toString()}\x00`);
  h.update(`burned:${burnedTotal.toString()}\x00`);
  h.update(`stateHash:${stateHashHex}\x00`);
  return h.digest();
}

// ── SupplyAttestationService ─────────────────────────────────────────────────

/**
 * Periodically writes supply attestation entries to the ledger.
 *
 * @see Requirement 11.3
 */
export class SupplyAttestationService {
  private readonly _ledger: IAssetLedgerWriter;
  private readonly _signer: ILedgerSigner;
  private readonly _stateProvider: StateProvider;
  private readonly _intervalMs: number;

  /** Set of asset IDs (hex) to attest. */
  private readonly _trackedAssets = new Set<string>();

  /** Pending timer handles, one per tracked asset. */
  private readonly _timers = new Map<string, ReturnType<typeof setInterval>>();

  constructor(
    ledger: IAssetLedgerWriter,
    signer: ILedgerSigner,
    stateProvider: StateProvider,
    options?: ISupplyAttestationOptions,
  ) {
    this._ledger = ledger;
    this._signer = signer;
    this._stateProvider = stateProvider;
    this._intervalMs = options?.intervalMs ?? DEFAULT_INTERVAL_MS;
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Begin periodic attestation for `assetIdHex`.
   * If the asset is already tracked, this is a no-op.
   */
  track(assetIdHex: string): void {
    if (this._trackedAssets.has(assetIdHex)) return;

    this._trackedAssets.add(assetIdHex);

    // Emit once immediately, then on each interval tick.
    void this.emitAttestation(assetIdHex);

    const timer = setInterval(
      () => void this.emitAttestation(assetIdHex),
      this._intervalMs,
    );

    // Do not prevent the process from exiting when the timer is the only
    // remaining handle.
    if (typeof timer === 'object' && 'unref' in timer) {
      (timer as { unref(): void }).unref();
    }

    this._timers.set(assetIdHex, timer);
  }

  /**
   * Stop periodic attestation for `assetIdHex`.
   * If the asset is not tracked, this is a no-op.
   */
  untrack(assetIdHex: string): void {
    const timer = this._timers.get(assetIdHex);
    if (timer !== undefined) {
      clearInterval(timer);
      this._timers.delete(assetIdHex);
    }
    this._trackedAssets.delete(assetIdHex);
  }

  /** Stop all periodic timers. */
  stop(): void {
    for (const assetIdHex of [...this._trackedAssets]) {
      this.untrack(assetIdHex);
    }
  }

  /**
   * Manually emit a supply attestation for `assetIdHex` right now.
   *
   * This is also called internally by the periodic timer.  Callers may
   * invoke it directly (e.g. immediately after a mint/burn) without
   * affecting the periodic schedule.
   *
   * Resolves silently when the asset is not yet present in the projected
   * state (the attestation would carry zeroes, which is unhelpful).
   */
  async emitAttestation(assetIdHex: string): Promise<void> {
    const state = this._stateProvider();

    const issuedTotal = state.issuedTotal.get(assetIdHex) ?? 0n;
    const burnedTotal = state.burnedTotal.get(assetIdHex) ?? 0n;

    // Only write when the asset has been registered.
    if (!state.assets.has(assetIdHex)) return;

    const stateHashBytes = computeStateHash(state);
    const stateHashHex = Buffer.from(stateHashBytes).toString('hex');

    const claimHash = buildSupplyClaimHash(
      assetIdHex,
      issuedTotal,
      burnedTotal,
      stateHashHex,
    );

    // AssetId bytes from hex string.
    const assetIdBytes = Buffer.from(assetIdHex, 'hex');
    const assetId = new Uint8Array(32);
    assetId.set(assetIdBytes.subarray(0, 32));

    const attestation: IAttestationAction = {
      kind: ActionKind.Attestation,
      assetId: assetId as unknown as IAttestationAction['assetId'],
      subject: null,
      claimHash,
      expiresAt: null,
    };

    const payload = AssetActionSerializer.serialize(attestation);
    await this._ledger.append(payload, this._signer);
  }
}
