/**
 * Test helper: build a deterministic GuidV7Uint8Array from a string label.
 *
 * Tests that need stable but distinct shard identifiers use this to satisfy
 * the `IBatchSettlementAction.shardId: GuidV7Uint8Array` type without
 * requiring a real GuidV7 generator. The bytes are derived from the UTF-8
 * encoding of the label, padded to 16 bytes, with the RFC 9562 UUIDv7
 * version (0x7 in the high nibble of byte 6) and variant (0b10 in the high
 * bits of byte 8) nibbles patched in so the result is a structurally valid
 * v7 UUID.
 */
import type { GuidV7Uint8Array } from '@digitaldefiance/ecies-lib';

function bytesFor(label: string): Uint8Array {
  const buf = new Uint8Array(16);
  const enc = new TextEncoder().encode(label);
  buf.set(enc.subarray(0, Math.min(enc.length, 16)));
  // RFC 9562: version = 7 in the high nibble of byte 6
  buf[6] = (buf[6] & 0x0f) | 0x70;
  // RFC 9562: variant = 0b10xx in the high bits of byte 8
  buf[8] = (buf[8] & 0x3f) | 0x80;
  return buf;
}

export function shardIdFromString(label: string): GuidV7Uint8Array {
  return bytesFor(label) as unknown as GuidV7Uint8Array;
}

/**
 * Hex of `shardIdFromString(label)`. Use wherever the validator/reducer
 * compares against `toHex(action.shardId)` — including
 * `IProcessKeyCertAction.shardIds`, `state.shardSettlement` map keys, and
 * `state.balances` map keys.
 */
export function shardIdHex(label: string): string {
  const b = bytesFor(label);
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, '0');
  return s;
}
