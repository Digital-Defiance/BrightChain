/**
 * @fileoverview Asset-layer error types.
 *
 * Provides `AssetErrorCode` enum and the `MalformedActionError` class, which is
 * thrown by `AssetActionSerializer` when the byte stream is invalid, truncated,
 * or carries an unknown version or action kind.
 *
 * @see Design: Layer 3 — Programmable Asset Ledger § Error Handling
 */

/** Discriminated error codes for all asset-layer failures. */
export enum AssetErrorCode {
  /** Byte stream is too short to contain a valid header. */
  BufferTooShort = 'BUFFER_TOO_SHORT',
  /** Magic bytes are missing or incorrect. */
  BadMagic = 'BAD_MAGIC',
  /** Serialization format version is not supported. */
  UnsupportedVersion = 'UNSUPPORTED_VERSION',
  /** The `kind` discriminant byte does not correspond to any known action. */
  UnknownActionKind = 'UNKNOWN_ACTION_KIND',
  /** The CBOR payload could not be decoded. */
  CborDecodeFailed = 'CBOR_DECODE_FAILED',
  /** The decoded object is missing required fields. */
  MissingRequiredField = 'MISSING_REQUIRED_FIELD',
  /** A field value is out of the allowed range (e.g., decimals > 18, memo > 256 bytes). */
  FieldOutOfRange = 'FIELD_OUT_OF_RANGE',
}

/**
 * Thrown when `AssetActionSerializer.deserialize` encounters a byte stream
 * that is syntactically or semantically invalid.
 */
export class MalformedActionError extends Error {
  /** Machine-readable error category. */
  readonly code: AssetErrorCode;

  constructor(code: AssetErrorCode, message: string) {
    super(`[${code}] ${message}`);
    this.name = 'MalformedActionError';
    this.code = code;
  }
}
