/**
 * @fileoverview LedgerEntrySerializer — deterministic binary serialization
 * for blockchain ledger entries.
 *
 * Binary format (hashable content):
 *   sequenceNumber  uint32 BE  (4 bytes)
 *   timestamp       uint64 BE  (8 bytes, ms since epoch)
 *   hasPreviousHash uint8      (0x00 = null, 0x01 = present)
 *   previousHash    0 | 64     (SHA3-512 bytes, present when flag = 0x01)
 *   pubKeyLength    uint32 BE  (4 bytes)
 *   signerPublicKey variable
 *   payloadLength   uint32 BE  (4 bytes)
 *   payload         variable
 *
 * Full serialized entry:
 *   magic           4 bytes    0x4C454447 ("LEDG")
 *   version         2 bytes    0x0001
 *   hashableContent variable
 *   entryHash       64 bytes   SHA3-512
 *   signature       64 bytes   SECP256k1
 *
 * @see Design: Block Chain Ledger — LedgerEntrySerializer
 * @see Requirements 2.1–2.7, 9.1, 9.3
 */

import { SignatureUint8Array } from '@digitaldefiance/ecies-lib';
import {
  LedgerSerializationError,
  LedgerSerializationErrorType,
} from '../errors/ledgerSerializationError';
import { ILedgerEntry } from '../interfaces/ledger/ledgerEntry';
import { ChecksumService } from '../services/checksum.service';
import { Checksum } from '../types/checksum';

/** Magic bytes identifying a ledger entry: "LEDG" in ASCII. */
const MAGIC = 0x4c454447;
/** Current serialization format version. */
const VERSION = 0x0001;
/** SHA3-512 hash length in bytes. */
const HASH_LENGTH = 64;
/** Signature length in bytes. */
const SIGNATURE_LENGTH = 64;
/**
 * Minimum serialized entry size:
 *   4 (magic) + 2 (version) + 4 (seq) + 8 (ts) + 1 (hasPrev)
 *   + 4 (pubKeyLen) + 33 (min compressed pubkey) + 4 (payloadLen)
 *   + 0 (empty payload) + 64 (hash) + 64 (sig) = 184
 */
const MIN_ENTRY_SIZE = 184;

/**
 * Deterministic binary serializer / deserializer for ledger entries.
 *
 * All multi-byte integers use big-endian byte order.
 * Only Uint8Array is used — no Node.js Buffer dependency.
 */
export class LedgerEntrySerializer {
  constructor(private readonly checksumService: ChecksumService) {}

  /**
   * Serialize the hashable portion of an entry (everything except entryHash
   * and signature). The output is the input to SHA3-512 for entryHash
   * computation.
   */
  serializeForHashing(
    entry: Omit<ILedgerEntry, 'entryHash' | 'signature'>,
  ): Uint8Array {
    const previousHashBytes =
      entry.previousEntryHash !== null
        ? entry.previousEntryHash.toUint8Array()
        : null;

    const pubKeyBytes = entry.signerPublicKey;
    const payloadBytes = entry.payload;

    // Calculate total size
    const hasPrev = previousHashBytes !== null;
    const size =
      4 + // sequenceNumber
      8 + // timestamp
      1 + // hasPreviousHash flag
      (hasPrev ? HASH_LENGTH : 0) +
      4 + // signerPublicKeyLength
      pubKeyBytes.length +
      4 + // payloadLength
      payloadBytes.length;

    const buf = new Uint8Array(size);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let offset = 0;

    // sequenceNumber — uint32 BE
    view.setUint32(offset, entry.sequenceNumber, false);
    offset += 4;

    // timestamp — uint64 BE (ms since epoch)
    const ms = BigInt(entry.timestamp.getTime());
    view.setBigUint64(offset, ms, false);
    offset += 8;

    // hasPreviousHash flag
    buf[offset] = hasPrev ? 0x01 : 0x00;
    offset += 1;

    // previousEntryHash bytes (only when present)
    if (hasPrev && previousHashBytes) {
      buf.set(previousHashBytes, offset);
      offset += HASH_LENGTH;
    }

    // signerPublicKey length + bytes
    view.setUint32(offset, pubKeyBytes.length, false);
    offset += 4;
    buf.set(pubKeyBytes, offset);
    offset += pubKeyBytes.length;

    // payload length + bytes
    view.setUint32(offset, payloadBytes.length, false);
    offset += 4;
    buf.set(payloadBytes, offset);

    return buf;
  }

  /**
   * Serialize a complete ledger entry including magic, version, hashable
   * content, entryHash, and signature.
   */
  serialize(entry: ILedgerEntry): Uint8Array {
    const hashableContent = this.serializeForHashing(entry);
    const entryHashBytes = entry.entryHash.toUint8Array();
    const signatureBytes = entry.signature as Uint8Array;

    const totalSize =
      4 + // magic
      2 + // version
      hashableContent.length +
      HASH_LENGTH + // entryHash
      SIGNATURE_LENGTH; // signature

    const buf = new Uint8Array(totalSize);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let offset = 0;

    // magic — uint32 BE
    view.setUint32(offset, MAGIC, false);
    offset += 4;

    // version — uint16 BE
    view.setUint16(offset, VERSION, false);
    offset += 2;

    // hashable content
    buf.set(hashableContent, offset);
    offset += hashableContent.length;

    // entryHash (64 bytes)
    buf.set(entryHashBytes, offset);
    offset += HASH_LENGTH;

    // signature (64 bytes)
    buf.set(signatureBytes, offset);

    return buf;
  }

  /**
   * Deserialize a Uint8Array back into an ILedgerEntry.
   *
   * Validates magic bytes, version, minimum size, and field lengths.
   * Throws LedgerSerializationError on any invalid input.
   */
  deserialize(data: Uint8Array): ILedgerEntry {
    // --- Minimum size check ---
    if (data.length < MIN_ENTRY_SIZE) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.DataTooShort,
        `Data length ${data.length} is below minimum entry size ${MIN_ENTRY_SIZE}`,
      );
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 0;

    // --- Magic ---
    const magic = view.getUint32(offset, false);
    offset += 4;
    if (magic !== MAGIC) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.InvalidMagic,
        `Invalid magic bytes: expected 0x${MAGIC.toString(16).toUpperCase()}, got 0x${magic.toString(16).toUpperCase()}`,
      );
    }

    // --- Version ---
    const version = view.getUint16(offset, false);
    offset += 2;
    if (version !== VERSION) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.UnsupportedVersion,
        `Unsupported version: expected ${VERSION}, got ${version}`,
      );
    }

    // --- Hashable content fields ---

    // sequenceNumber
    this.ensureRemaining(data, offset, 4, 'sequenceNumber');
    const sequenceNumber = view.getUint32(offset, false);
    offset += 4;

    // timestamp
    this.ensureRemaining(data, offset, 8, 'timestamp');
    const timestampMs = view.getBigUint64(offset, false);
    offset += 8;
    const timestamp = new Date(Number(timestampMs));

    // hasPreviousHash flag
    this.ensureRemaining(data, offset, 1, 'hasPreviousHash');
    const hasPrev = data[offset];
    offset += 1;

    // previousEntryHash
    let previousEntryHash: Checksum | null = null;
    if (hasPrev === 0x01) {
      this.ensureRemaining(data, offset, HASH_LENGTH, 'previousEntryHash');
      previousEntryHash = Checksum.fromUint8Array(
        data.slice(offset, offset + HASH_LENGTH),
      );
      offset += HASH_LENGTH;
    }

    // signerPublicKey
    this.ensureRemaining(data, offset, 4, 'signerPublicKeyLength');
    const pubKeyLength = view.getUint32(offset, false);
    offset += 4;
    this.ensureRemaining(data, offset, pubKeyLength, 'signerPublicKey');
    const signerPublicKey = data.slice(offset, offset + pubKeyLength);
    offset += pubKeyLength;

    // payload
    this.ensureRemaining(data, offset, 4, 'payloadLength');
    const payloadLength = view.getUint32(offset, false);
    offset += 4;
    this.ensureRemaining(data, offset, payloadLength, 'payload');
    const payload = data.slice(offset, offset + payloadLength);
    offset += payloadLength;

    // --- entryHash (64 bytes) ---
    this.ensureRemaining(data, offset, HASH_LENGTH, 'entryHash');
    const entryHash = Checksum.fromUint8Array(
      data.slice(offset, offset + HASH_LENGTH),
    );
    offset += HASH_LENGTH;

    // --- signature (64 bytes) ---
    this.ensureRemaining(data, offset, SIGNATURE_LENGTH, 'signature');
    const signature = data.slice(
      offset,
      offset + SIGNATURE_LENGTH,
    ) as SignatureUint8Array;

    return {
      sequenceNumber,
      timestamp,
      previousEntryHash,
      signerPublicKey,
      payload,
      entryHash,
      signature,
    };
  }

  /**
   * Compute the entryHash for a partial entry (without entryHash and
   * signature) by hashing the serializeForHashing() output with SHA3-512.
   */
  computeEntryHash(
    entry: Omit<ILedgerEntry, 'entryHash' | 'signature'>,
  ): Checksum {
    const hashableContent = this.serializeForHashing(entry);
    return this.checksumService.calculateChecksum(hashableContent);
  }

  // ── private helpers ──────────────────────────────────────────────────

  /**
   * Ensure there are at least `needed` bytes remaining from `offset`.
   * Throws FieldOverflow if not.
   */
  private ensureRemaining(
    data: Uint8Array,
    offset: number,
    needed: number,
    fieldName: string,
  ): void {
    if (offset + needed > data.length) {
      throw new LedgerSerializationError(
        LedgerSerializationErrorType.FieldOverflow,
        `Field '${fieldName}' requires ${needed} bytes at offset ${offset}, but only ${data.length - offset} bytes remain`,
      );
    }
  }
}
