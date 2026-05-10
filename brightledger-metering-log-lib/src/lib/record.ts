import { decode, encode } from 'cbor-x';

/**
 * A single metering record as stored in the shard log.
 *
 * Field layout follows Requirement 2.1.  When serialised via
 * `encodeMeteringRecord`, the canonical CBOR encoding is a fixed-order
 * array so that `BLAKE3(encodeMeteringRecord(r))` is reproducible across
 * platforms and runtimes.
 */
export interface MeteringRecord {
  /** Monotonically-increasing record index (uint64, starts at 0). */
  seq: bigint;

  /** BLAKE3 hash of the previous record's canonical encoding (32 bytes). */
  prev_hash: Uint8Array;

  /** Wall-clock time in microseconds since Unix epoch (uint64). */
  ts: bigint;

  /** Caller-supplied event discriminator (e.g. "joule.charge"). */
  op: string;

  /** 32-byte identifier of the affected member. */
  memberId: Uint8Array;

  /** Human-readable asset identifier (e.g. "joule"). */
  assetId: string;

  /** Net micro-unit amount; positive = credit, negative = debit. */
  amount: bigint;

  /** Caller-supplied idempotency key (unique within a batch window). */
  opId: string;

  /**
   * Opaque 32-byte caller context.
   * For genesis records (seq=0), the shard sets this to the activating
   * process-key fingerprint (BLAKE3 of the public key).
   */
  context_hash: Uint8Array;
}

// Canonical field indices in the CBOR array.  MUST NOT be changed — altering
// indices would break backward compatibility of the hash chain.
const SEQ_IDX = 0;
const PREV_HASH_IDX = 1;
const TS_IDX = 2;
const OP_IDX = 3;
const MEMBER_ID_IDX = 4;
const ASSET_ID_IDX = 5;
const AMOUNT_IDX = 6;
const OP_ID_IDX = 7;
const CONTEXT_HASH_IDX = 8;

/**
 * Encode a metering record to its canonical CBOR representation.
 *
 * The output is a CBOR array in the fixed field order defined above.
 * This encoding is stored verbatim in the flat-file log and is what
 * BLAKE3 hashes to form the hash chain (Req 2.3).
 */
export function encodeMeteringRecord(r: MeteringRecord): Uint8Array {
  return encode([
    r.seq,
    r.prev_hash,
    r.ts,
    r.op,
    r.memberId,
    r.assetId,
    r.amount,
    r.opId,
    r.context_hash,
  ]);
}

/**
 * Decode a canonical CBOR array back into a {@link MeteringRecord}.
 *
 * @throws {TypeError} if the payload is not a well-formed CBOR array with
 *   at least 9 elements.
 */
export function decodeMeteringRecord(bytes: Uint8Array): MeteringRecord {
  const arr = decode(bytes) as unknown[];
  if (!Array.isArray(arr) || arr.length < 9) {
    throw new TypeError(
      `Invalid MeteringRecord encoding: expected array length >= 9, got ${
        Array.isArray(arr) ? arr.length : typeof arr
      }`,
    );
  }
  return {
    seq: asBigInt(arr[SEQ_IDX]),
    prev_hash: asBytes(arr[PREV_HASH_IDX]),
    ts: asBigInt(arr[TS_IDX]),
    op: String(arr[OP_IDX]),
    memberId: asBytes(arr[MEMBER_ID_IDX]),
    assetId: String(arr[ASSET_ID_IDX]),
    amount: asBigInt(arr[AMOUNT_IDX]),
    opId: String(arr[OP_ID_IDX]),
    context_hash: asBytes(arr[CONTEXT_HASH_IDX]),
  };
}

/**
 * Coerce a decoded CBOR value to bigint.
 * cbor-x may decode small integers as JS numbers rather than BigInt.
 */
export function asBigInt(v: unknown): bigint {
  if (typeof v === 'bigint') return v;
  if (typeof v === 'number') return BigInt(v);
  throw new TypeError(`Expected number or bigint, got ${typeof v}`);
}

/**
 * Coerce a decoded CBOR value to Uint8Array.
 * cbor-x may return a Buffer (Node.js subclass) for byte strings.
 */
export function asBytes(v: unknown): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (Buffer.isBuffer(v)) {
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }
  throw new TypeError(`Expected Uint8Array or Buffer, got ${typeof v}`);
}
