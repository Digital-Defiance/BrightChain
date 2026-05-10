/**
 * @fileoverview IAssetProjectedState — the full in-memory projection of the
 * asset ledger produced by replaying all accepted actions through the
 * `AssetStateReducer`.
 *
 * @see Requirements 3.2, 3.3
 * @see Design: Layer 3 — Programmable Asset Ledger § Balance Projection
 */

import type {
  AuthorizedSignerSet,
  IBrightTrustPolicy,
} from '@brightchain/brightchain-lib';
import type {
  SupplyPolicy,
  TransferPolicy,
} from '@brightchain/brightledger-assets-lib';

// ── Per-asset descriptor ─────────────────────────────────────────────────────

/**
 * Static descriptor recorded when an asset is issued.
 * Mirrors `IIssueAssetAction` fields; immutable once set.
 */
export interface IAssetDescriptor {
  readonly symbol: string;
  readonly displayName: string;
  readonly decimals: number;
  readonly supplyPolicy: SupplyPolicy;
  readonly transferPolicy: TransferPolicy;
  readonly freezable: boolean;
  readonly burnable: boolean;
  readonly brightTrustPolicy: IBrightTrustPolicy;
}

// ── Shard settlement state ────────────────────────────────────────────────────

/**
 * Per-shard settlement cursor.
 * Used to enforce strict contiguous sequence ordering for batch settlements.
 */
export interface IShardSettlementState {
  /** The next sequence number expected from this shard. */
  readonly nextExpectedSeq: bigint;
  /** Wall-clock timestamp of the most recent accepted settlement (ms). */
  readonly lastSettledAt: number;
  /** Hash of the tip from the most recent accepted settlement (32 bytes). */
  readonly lastTipHash: Uint8Array;
}

// ── Process key record ────────────────────────────────────────────────────────

/**
 * State of a certified ephemeral process key.
 */
export interface IProcessKeyRecord {
  /** The public key bytes (33 bytes, compressed Ed25519/secp256k1). */
  readonly publicKey: Uint8Array;
  /** Unix timestamp (ms) at which the key becomes valid. */
  readonly notBefore: number;
  /** Unix timestamp (ms) at which the key expires. */
  readonly notAfter: number;
  /** Shard IDs this key is authorized to sign. */
  readonly shardIds: readonly string[];
  /** Whether this key has been revoked. */
  readonly revoked: boolean;
  /**
   * If revoked, the first settlement sequence number at which the revocation
   * takes effect.  If `undefined`, revocation is immediate.
   */
  readonly effectiveRevokedAtSeq?: bigint;
}

// ── Dispute record ────────────────────────────────────────────────────────────

/**
 * Record of an open or resolved dispute against a settlement batch.
 */
export interface IDisputeRecord {
  /** Shard identifier of the disputed settlement. */
  readonly shardId: string;
  /** Sequence number of the disputed `BatchSettlement` entry. */
  readonly settlementSeq: bigint;
  /** Sequence number of the `BatchChallenge` ledger entry. */
  readonly challengeSeq: bigint;
  /** Challenger's account public key (hex). */
  readonly challengerKey: string;
  /** Whether this dispute has been resolved. */
  readonly resolved: boolean;
  /** `'accepted' | 'rejected'` once resolved, undefined while open. */
  readonly outcome?: 'accepted' | 'rejected';
}

// ── Full projected state ──────────────────────────────────────────────────────

/**
 * The deterministic in-memory projection of the asset ledger.
 *
 * All map keys are hex-encoded strings (asset IDs, account public keys, etc.)
 * to allow structural equality checks and JSON snapshots.
 *
 * Map key conventions:
 * - Asset maps: `assetId` = hex(SHA-256(issuerPubKey || issuanceEntryHash))
 * - Account maps: `accountKey` = hex(compressedPublicKey)
 * - Shard maps: `shardId` = opaque string identifier
 * - Process key maps: `fingerprint` = hex(SHA-256(processPublicKey))
 * - Dispute maps: `${shardId}:${settlementSeq}`
 */
export interface IAssetProjectedState {
  // ── Asset registry ─────────────────────────────────────────────────────
  /** Static descriptor for each registered asset. */
  readonly assets: ReadonlyMap<string, IAssetDescriptor>;

  // ── Balances ───────────────────────────────────────────────────────────
  /**
   * Per-asset per-account balances (bigint, in smallest unit).
   * Missing entry ≡ balance zero.
   */
  readonly balances: ReadonlyMap<string, ReadonlyMap<string, bigint>>;

  // ── Nonces ────────────────────────────────────────────────────────────
  /**
   * Monotonically increasing per-account nonce for transfer replay protection.
   * Missing entry ≡ nonce zero.
   */
  readonly nonces: ReadonlyMap<string, bigint>;

  // ── Frozen sets ───────────────────────────────────────────────────────
  /**
   * Per-asset set of frozen account keys (hex).
   * An account frozen here via `FreezeAccountAction`.
   */
  readonly frozen: ReadonlyMap<string, ReadonlySet<string>>;

  /**
   * Per-asset set of operator-frozen account keys (hex).
   * An account frozen here via `OperatorFreezeAction`.
   */
  readonly operatorFrozen: ReadonlyMap<string, ReadonlySet<string>>;

  // ── Whitelist ──────────────────────────────────────────────────────────
  /**
   * Per-asset whitelist of permitted receiver accounts (hex).
   * Only populated for assets with `transferPolicy === 'whitelist'`.
   */
  readonly whitelist: ReadonlyMap<string, ReadonlySet<string>>;

  // ── Supply accounting ──────────────────────────────────────────────────
  /**
   * Total units ever issued (minted) per asset.
   * Conservation: `issuedTotal[assetId] - burnedTotal[assetId] === sum(balances[assetId])`.
   */
  readonly issuedTotal: ReadonlyMap<string, bigint>;

  /**
   * Total units ever burned per asset.
   */
  readonly burnedTotal: ReadonlyMap<string, bigint>;

  // ── Governance ─────────────────────────────────────────────────────────
  /**
   * Current `AuthorizedSignerSet` governing each asset (mint, freeze, rotate…).
   */
  readonly issuerSets: ReadonlyMap<string, AuthorizedSignerSet>;

  // ── Shard settlement ───────────────────────────────────────────────────
  /**
   * Per-shard settlement cursor used to enforce contiguous sequence ordering.
   */
  readonly shardSettlement: ReadonlyMap<string, IShardSettlementState>;

  // ── Process keys ──────────────────────────────────────────────────────
  /**
   * Certified process keys, keyed by `hex(fingerprint)`.
   */
  readonly processKeys: ReadonlyMap<string, IProcessKeyRecord>;

  // ── Disputes ──────────────────────────────────────────────────────────
  /**
   * Active and resolved disputes, keyed by `${shardId}:${settlementSeq}`.
   */
  readonly disputes: ReadonlyMap<string, IDisputeRecord>;

  // ── Ledger cursor ──────────────────────────────────────────────────────
  /**
   * Sequence number of the last accepted ledger entry applied to this state.
   */
  readonly lastSequence: bigint;

  // ── Retired assets ─────────────────────────────────────────────────────
  /**
   * Set of asset IDs (hex) that have been retired.
   * Retired assets remain in `assets` for historical lookup but reject new actions.
   */
  readonly retiredAssets: ReadonlySet<string>;
}

// ── Empty state factory ───────────────────────────────────────────────────────

/** Produce a deterministic zero-value projected state. */
export function emptyState(): IAssetProjectedState {
  return {
    assets: new Map(),
    balances: new Map(),
    nonces: new Map(),
    frozen: new Map(),
    operatorFrozen: new Map(),
    whitelist: new Map(),
    issuedTotal: new Map(),
    burnedTotal: new Map(),
    issuerSets: new Map(),
    shardSettlement: new Map(),
    processKeys: new Map(),
    disputes: new Map(),
    lastSequence: 0n,
    retiredAssets: new Set(),
  };
}
