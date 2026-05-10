import { encode } from 'cbor-x';

import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';

/**
 * Maximum allowed process key lifetime in milliseconds (7 days).
 * Requirement 4.6.
 */
export const MAX_PROCESS_KEY_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Maximum allowed process key lifetime in microseconds (7 days).
 */
export const MAX_PROCESS_KEY_LIFETIME_US =
  BigInt(MAX_PROCESS_KEY_LIFETIME_MS) * 1000n;

/**
 * Asset-ledger action that certifies an ephemeral Ed25519 process key for a
 * metering shard.  The action payload must be submitted to and confirmed by
 * the asset ledger before the shard may append any metering records.
 *
 * Requirement 4.1.
 */
export interface ProcessKeyCertAction {
  kind: 'ProcessKeyCert';

  /** Shard that owns this process key. */
  shardId: GuidV7Uint8Array;

  /** 32-byte BLAKE3 fingerprint of the public key. */
  fingerprint: Uint8Array;

  /** 32-byte Ed25519 compressed public key. */
  pubKey: Uint8Array;

  /** Validity start time — microseconds since Unix epoch. */
  notBefore: bigint;

  /** Validity end time — ≤ notBefore + 7 days — microseconds since epoch. */
  notAfter: bigint;

  /**
   * 64-byte Ed25519 signature produced by the operator's long-term signing
   * key over the canonical payload (see {@link encodeProcessKeyCertPayload}).
   */
  operatorSig: Uint8Array;
}

/**
 * Asset-ledger action that revokes a previously certified process key.
 *
 * Requirements 4.3, 4.4.
 */
export interface ProcessKeyRevokeAction {
  kind: 'ProcessKeyRevoke';

  /** Shard that owns the key being revoked. */
  shardId: GuidV7Uint8Array;

  /** 32-byte BLAKE3 fingerprint of the revoked key. */
  fingerprint: Uint8Array;

  /**
   * - `'rotation'`   — normal key rotation on graceful shutdown.
   * - `'shutdown'`   — graceful shutdown without an immediate successor.
   * - `'compromise'` — key compromise; `effectiveAtSeq` marks the earliest
   *                    invalidated record.
   */
  reason: 'rotation' | 'compromise' | 'shutdown';

  /**
   * For `reason === 'compromise'`: the lowest seq at which signatures by this
   * key are retroactively invalid.  Verifiers MUST ignore any Signature entry
   * whose `seq >= effectiveAtSeq` and whose fingerprint matches.
   * Absent for rotation/shutdown revocations (Requirement 4.4).
   */
  effectiveAtSeq?: bigint;

  /**
   * 64-byte Ed25519 signature produced by the operator's long-term signing
   * key over the canonical payload (see {@link encodeProcessKeyRevokePayload}).
   */
  operatorSig: Uint8Array;
}

// ── Canonical payload encoders (for operator signing) ─────────────────────

/**
 * Encode the canonical signable payload for a {@link ProcessKeyCertAction}.
 *
 * The payload is a fixed-order CBOR array that the operator's long-term key
 * signs.  Layer 3 verifies this signature; Layer 2 only packages it.
 */
export function encodeProcessKeyCertPayload(
  shardId: GuidV7Uint8Array,
  fingerprint: Uint8Array,
  pubKey: Uint8Array,
  notBefore: bigint,
  notAfter: bigint,
): Uint8Array {
  return encode([
    'ProcessKeyCert',
    shardId,
    fingerprint,
    pubKey,
    notBefore,
    notAfter,
  ]);
}

/**
 * Encode the canonical signable payload for a {@link ProcessKeyRevokeAction}.
 */
export function encodeProcessKeyRevokePayload(
  shardId: GuidV7Uint8Array,
  fingerprint: Uint8Array,
  reason: 'rotation' | 'compromise' | 'shutdown',
  effectiveAtSeq?: bigint,
): Uint8Array {
  return encode([
    'ProcessKeyRevoke',
    shardId,
    fingerprint,
    reason,
    effectiveAtSeq ?? null,
  ]);
}

// ── Factory helpers ────────────────────────────────────────────────────────

/**
 * Construct a {@link ProcessKeyCertAction} with a validated lifetime.
 *
 * @param shardId        - Shard identifier.
 * @param fingerprint    - 32-byte BLAKE3 fingerprint of the process key.
 * @param pubKey         - 32-byte Ed25519 public key.
 * @param operatorSignFn - Operator signing function.  Receives the canonical
 *                         CBOR payload and returns a 64-byte signature.
 * @param notBefore      - Validity start in µs.  Defaults to now.
 * @param lifetimeMs     - Key lifetime in milliseconds.  Must be ≤ 7 days.
 *
 * @throws {RangeError} if `lifetimeMs > MAX_PROCESS_KEY_LIFETIME_MS`.
 */
export function createProcessKeyCertAction(
  shardId: GuidV7Uint8Array,
  fingerprint: Uint8Array,
  pubKey: Uint8Array,
  operatorSignFn: (payload: Uint8Array) => Uint8Array,
  notBefore: bigint = BigInt(Date.now()) * 1000n,
  lifetimeMs: number = MAX_PROCESS_KEY_LIFETIME_MS,
): ProcessKeyCertAction {
  if (lifetimeMs > MAX_PROCESS_KEY_LIFETIME_MS) {
    throw new RangeError(
      `Process key lifetime ${lifetimeMs} ms exceeds maximum ` +
        `${MAX_PROCESS_KEY_LIFETIME_MS} ms (7 days)`,
    );
  }
  const notAfter = notBefore + BigInt(lifetimeMs) * 1000n;
  const payload = encodeProcessKeyCertPayload(
    shardId,
    fingerprint,
    pubKey,
    notBefore,
    notAfter,
  );
  const operatorSig = operatorSignFn(payload);
  return {
    kind: 'ProcessKeyCert',
    shardId,
    fingerprint,
    pubKey,
    notBefore,
    notAfter,
    operatorSig,
  };
}

/**
 * Construct a {@link ProcessKeyRevokeAction}.
 *
 * @param shardId        - Shard identifier.
 * @param fingerprint    - 32-byte BLAKE3 fingerprint of the revoked key.
 * @param reason         - Revocation reason.
 * @param operatorSignFn - Operator signing function.
 * @param effectiveAtSeq - For compromise revocations only: the earliest seq
 *                         that is retroactively invalidated.
 */
export function createProcessKeyRevokeAction(
  shardId: GuidV7Uint8Array,
  fingerprint: Uint8Array,
  reason: 'rotation' | 'compromise' | 'shutdown',
  operatorSignFn: (payload: Uint8Array) => Uint8Array,
  effectiveAtSeq?: bigint,
): ProcessKeyRevokeAction {
  const payload = encodeProcessKeyRevokePayload(
    shardId,
    fingerprint,
    reason,
    effectiveAtSeq,
  );
  const operatorSig = operatorSignFn(payload);
  return {
    kind: 'ProcessKeyRevoke',
    shardId,
    fingerprint,
    reason,
    ...(effectiveAtSeq !== undefined ? { effectiveAtSeq } : {}),
    operatorSig,
  };
}
