import { blake3 } from '@noble/hashes/blake3';

import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';

/** The genesis `prev_hash` value: 32 zero bytes (Req 2.2). */
export const GENESIS_HASH = new Uint8Array(32);

/**
 * Compute the 32-byte BLAKE3 chain hash of an encoded metering record.
 *
 * The next record's `prev_hash` MUST equal `hashRecord(encodedCurrentRecord)`.
 */
export function hashRecord(encodedRecord: Uint8Array): Uint8Array {
  return blake3(encodedRecord);
}

/**
 * Compute the 32-byte BLAKE3 message that the process key signs (Req 3.2).
 *
 * Message = BLAKE3(
 *   utf8("metering-log-sig-v1") ||
 *   bytes(shardId) ||
 *   u64-BE(seq) ||
 *   tipHash(32 bytes) ||
 *   processKeyFingerprint(32 bytes)
 * )
 */
export function computeSignMessage(
  shardId: GuidV7Uint8Array,
  seq: bigint,
  tipHash: Uint8Array,
  processKeyFingerprint: Uint8Array,
): Uint8Array {
  const prefix = new TextEncoder().encode('metering-log-sig-v1');

  // Encode seq as 8-byte big-endian uint64.
  const seqBytes = new Uint8Array(8);
  new DataView(seqBytes.buffer).setBigUint64(0, seq, false);

  const total = prefix.length + shardId.length + 8 + 32 + 32;
  const msg = new Uint8Array(total);
  let offset = 0;
  msg.set(prefix, offset);
  offset += prefix.length;
  msg.set(shardId, offset);
  offset += shardId.length;
  msg.set(seqBytes, offset);
  offset += 8;
  msg.set(tipHash, offset);
  offset += 32;
  msg.set(processKeyFingerprint, offset);

  return blake3(msg);
}
