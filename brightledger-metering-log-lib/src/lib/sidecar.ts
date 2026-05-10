import { decode, encode } from 'cbor-x';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { asBigInt, asBytes } from './record.js';

/** A single signature checkpoint entry stored in the sidecar file (Req 3.1). */
export interface ISignatureEntry {
  /** Sequence number of the last signed record. */
  seq: bigint;

  /** BLAKE3 hash of the last signed record (chain tip, 32 bytes). */
  tipHash: Uint8Array;

  /** BLAKE3 fingerprint of the signing process key (32 bytes). */
  processKeyFingerprint: Uint8Array;

  /** 64-byte Ed25519 signature over the computed sign message. */
  sig: Uint8Array;
}

/** Fixed name of the sidecar file within a shard directory (Req 3.3). */
export const SIDECAR_FILE_NAME = 'sidecar.sigs';

/** Byte length of the u32-LE length prefix preceding each sidecar entry. */
const LENGTH_PREFIX_SIZE = 4;

/** Resolve the sidecar file path within a shard directory. */
export function getSidecarPath(dirPath: string): string {
  return path.join(dirPath, SIDECAR_FILE_NAME);
}

/** Canonical CBOR encoding for a signature entry (fixed-order array). */
export function encodeSignatureEntry(e: ISignatureEntry): Uint8Array {
  return encode([e.seq, e.tipHash, e.processKeyFingerprint, e.sig]);
}

/**
 * Decode a CBOR array back into an {@link ISignatureEntry}.
 *
 * @throws {TypeError} if the payload is malformed.
 */
export function decodeSignatureEntry(bytes: Uint8Array): ISignatureEntry {
  const arr = decode(bytes) as unknown[];
  if (!Array.isArray(arr) || arr.length < 4) {
    throw new TypeError(
      `Invalid SignatureEntry encoding: expected array length >= 4`,
    );
  }
  return {
    seq: asBigInt(arr[0]),
    tipHash: asBytes(arr[1]),
    processKeyFingerprint: asBytes(arr[2]),
    sig: asBytes(arr[3]),
  };
}

/**
 * Append-only writer for the sidecar file.
 *
 * Keeps a file descriptor open for the lifetime of the parent shard so
 * that signature emission does not pay repeated open/close costs.
 */
export class SidecarWriter {
  private _fd: number | null = null;

  /** Open (or create) the sidecar file in append mode. */
  open(filePath: string): void {
    if (this._fd !== null) {
      throw new Error('SidecarWriter is already open');
    }
    this._fd = fs.openSync(
      filePath,
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_APPEND,
      0o600,
    );
  }

  /** Append a signature entry and flush to durable storage. */
  append(entry: ISignatureEntry): void {
    if (this._fd === null) {
      throw new Error('SidecarWriter is not open');
    }
    const payload = encodeSignatureEntry(entry);
    const prefix = Buffer.allocUnsafe(LENGTH_PREFIX_SIZE);
    prefix.writeUInt32LE(payload.length, 0);
    fs.writeSync(this._fd, prefix);
    fs.writeSync(this._fd, payload);
    fs.fdatasyncSync(this._fd);
  }

  /** Close the sidecar file descriptor. */
  close(): void {
    if (this._fd !== null) {
      fs.closeSync(this._fd);
      this._fd = null;
    }
  }

  /** Whether the writer currently has an open file descriptor. */
  get isOpen(): boolean {
    return this._fd !== null;
  }
}

/**
 * Read all complete signature entries from a sidecar file.
 * Returns an empty array if the file does not exist.
 * Partial entries at the tail (due to a crash mid-write) are silently ignored.
 */
export function readSignatureEntries(sidecarPath: string): ISignatureEntry[] {
  if (!fs.existsSync(sidecarPath)) {
    return [];
  }

  const buf = fs.readFileSync(sidecarPath);
  const entries: ISignatureEntry[] = [];
  let offset = 0;

  while (offset + LENGTH_PREFIX_SIZE <= buf.length) {
    const payloadLen = buf.readUInt32LE(offset);
    offset += LENGTH_PREFIX_SIZE;

    if (offset + payloadLen > buf.length) {
      // Partial (truncated) entry at the tail — stop reading.
      break;
    }

    const payload = new Uint8Array(
      buf.buffer,
      buf.byteOffset + offset,
      payloadLen,
    );
    offset += payloadLen;

    entries.push(decodeSignatureEntry(payload));
  }

  return entries;
}
