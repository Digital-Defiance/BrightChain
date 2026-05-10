import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';

import { computeSignMessage, hashRecord } from './hashChain.js';
import { verifySignature } from './processKey.js';
import { decodeMeteringRecord } from './record.js';
import type { ISignatureEntry } from './sidecar.js';

/**
 * A record as provided to the range verifier.
 * The `encodedPayload` is the raw CBOR bytes as stored in the log (i.e.,
 * the exact bytes returned by `encodeMeteringRecord`).
 */
export interface VerifiableRecord {
  /** Sequence number of this record. */
  seq: bigint;

  /**
   * The raw CBOR-encoded payload as stored in the log.
   * BLAKE3 of this value is the record's chain hash.
   */
  encodedPayload: Uint8Array;
}

/**
 * Describes a process-key revocation for use by the range verifier.
 *
 * - `'rotation'` and `'shutdown'` revocations do NOT retroactively invalidate
 *   historical signatures; they only prevent the key from being used for new
 *   records after the revocation point.
 * - `'compromise'` revocations set `effectiveAtSeq`: any signature entry
 *   whose `seq >= effectiveAtSeq` AND whose fingerprint matches is treated as
 *   invalid (Requirement 4.4).
 */
export interface RevocationEntry {
  /** 32-byte BLAKE3 fingerprint of the revoked key. */
  fingerprint: Uint8Array;

  /** Why the key was revoked. */
  reason: 'rotation' | 'compromise' | 'shutdown';

  /**
   * For `reason === 'compromise'`: the lowest seq at which signatures by this
   * key are retroactively invalid.  Verifiers MUST ignore any sig entry whose
   * `seq >= effectiveAtSeq` and whose fingerprint matches.
   * Must be absent for rotation/shutdown (ignored if present).
   */
  effectiveAtSeq?: bigint;
}

/**
 * Verify a contiguous range of metering records.
 *
 * Returns `true` if and only if all of the following hold:
 * 1. `records` is non-empty and all seqs are contiguous with no gaps.
 * 2. For each consecutive pair, the later record's decoded `prev_hash`
 *    equals `BLAKE3(encodedPayload)` of the earlier record.
 * 3. At least one {@link ISignatureEntry} exists whose:
 *    - `seq` equals `records[last].seq`,
 *    - `tipHash` equals `hashRecord(records[last].encodedPayload)`,
 *    - Ed25519 signature is valid for the corresponding process key,
 *    - The signing key has not been compromise-revoked at or before this seq
 *      (see {@link RevocationEntry}).
 *
 * @param records     - Contiguous records in ascending seq order.
 *                      Records must extend to the seq covered by a signature.
 * @param sigEntries  - Signature checkpoints from the sidecar file.
 * @param processKeys - Map of fingerprint hex string → Ed25519 public key.
 * @param shardId     - Shard identifier used when computing the sign message.
 * @param revocations - Optional revocation entries.  Only `'compromise'`
 *                      revocations with a defined `effectiveAtSeq` affect
 *                      historical range verification.
 */
export function verifyRange(
  records: VerifiableRecord[],
  sigEntries: ISignatureEntry[],
  processKeys: Map<string, Uint8Array>,
  shardId: GuidV7Uint8Array,
  revocations?: RevocationEntry[],
): boolean {
  if (records.length === 0) return false;

  // 1. Verify sequential ordering with no gaps.
  for (let i = 1; i < records.length; i++) {
    if (records[i].seq !== records[i - 1].seq + 1n) {
      return false;
    }
  }

  // 2. Verify the BLAKE3 hash chain.
  for (let i = 1; i < records.length; i++) {
    const expectedPrevHash = hashRecord(records[i - 1].encodedPayload);
    const curr = decodeMeteringRecord(records[i].encodedPayload);
    if (!bytesEqual(curr.prev_hash, expectedPrevHash)) {
      return false;
    }
  }

  // 3. Find a valid covering signature at records[last].seq.
  const lastRecord = records[records.length - 1];
  const expectedTipHash = hashRecord(lastRecord.encodedPayload);

  for (const sigEntry of sigEntries) {
    // Only accept signatures whose seq matches the last record in the range.
    if (sigEntry.seq !== lastRecord.seq) continue;

    // The signature's tip hash must match our computed chain tip.
    if (!bytesEqual(sigEntry.tipHash, expectedTipHash)) continue;

    // Look up the public key for this fingerprint.
    const fpHex = toHex(sigEntry.processKeyFingerprint);
    const pubKey = processKeys.get(fpHex);
    if (pubKey === undefined) continue;

    // Compromise revocation: skip signatures retroactively invalidated (Req 4.4).
    if (revocations !== undefined) {
      const compromised = revocations.some(
        (r) =>
          r.reason === 'compromise' &&
          r.effectiveAtSeq !== undefined &&
          sigEntry.seq >= r.effectiveAtSeq &&
          toHex(r.fingerprint) === fpHex,
      );
      if (compromised) continue;
    }

    // Re-derive the sign message and verify.
    const message = computeSignMessage(
      shardId,
      sigEntry.seq,
      sigEntry.tipHash,
      sigEntry.processKeyFingerprint,
    );
    if (verifySignature(pubKey, message, sigEntry.sig)) {
      return true;
    }
  }

  return false;
}

/** Convert a byte array to a lowercase hex string for use as a map key. */
export function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
