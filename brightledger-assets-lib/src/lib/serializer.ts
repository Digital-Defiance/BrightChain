/**
 * @fileoverview AssetActionSerializer — versioned CBOR encoding / decoding for
 * all asset action payloads.
 *
 * Wire format:
 *
 *   magic      4 bytes   0x4143544c  ("ACTL")
 *   version    1 byte    0x01
 *   kindCode   1 byte    see ACTION_KIND_CODE
 *   length     4 bytes   uint32 BE — byte length of the CBOR payload
 *   payload    variable  CBOR-encoded action object (map)
 *
 * The CBOR payload encodes the full action object as a map keyed by field name,
 * preserving forward compatibility for optional fields. `bigint` and `Uint8Array`
 * are encoded natively by cbor-x.
 *
 * @see Design: Layer 3 — Programmable Asset Ledger § Serialization
 * @see Requirements 1.4
 */

import { decode, encode } from 'cbor-x';
import { AssetErrorCode, MalformedActionError } from './errors.js';
import {
  ACTION_KIND_CODE,
  ActionKind,
  CODE_TO_ACTION_KIND,
} from './payloads/actionKind.js';
import { IAssetAction } from './payloads/index.js';

/** ASCII "ACTL" in big-endian. */
const MAGIC = 0x4143544c;
/** Current wire-format version. */
const VERSION = 0x01;
/** Byte offset of each header field. */
const OFFSET_MAGIC = 0;
const OFFSET_VERSION = 4;
const OFFSET_KIND = 5;
const OFFSET_LENGTH = 6;
const OFFSET_PAYLOAD = 10;
/** Minimum valid buffer size (10-byte header + at least 1 CBOR byte). */
const MIN_BUFFER_SIZE = 11;

/**
 * Deterministic serializer / deserializer for {@link IAssetAction} payloads.
 *
 * All methods are pure (no side effects, no I/O).
 */
export class AssetActionSerializer {
  /**
   * Encode an asset action to its canonical wire representation.
   *
   * @param action - Any valid `IAssetAction` variant.
   * @returns A `Uint8Array` containing the full framed payload.
   */
  static serialize(action: IAssetAction): Uint8Array {
    const kindCode = ACTION_KIND_CODE[action.kind];
    const cborPayload = encode(action);

    const buf = new Uint8Array(OFFSET_PAYLOAD + cborPayload.length);
    const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

    view.setUint32(OFFSET_MAGIC, MAGIC, false);
    buf[OFFSET_VERSION] = VERSION;
    buf[OFFSET_KIND] = kindCode;
    view.setUint32(OFFSET_LENGTH, cborPayload.length, false);
    buf.set(cborPayload, OFFSET_PAYLOAD);

    return buf;
  }

  /**
   * Decode a wire-format buffer back into an `IAssetAction`.
   *
   * @param bytes - The full framed payload as returned by {@link serialize}.
   * @throws {MalformedActionError} on any structural or semantic violation.
   * @returns The decoded action.
   */
  static deserialize(bytes: Uint8Array): IAssetAction {
    if (bytes.length < MIN_BUFFER_SIZE) {
      throw new MalformedActionError(
        AssetErrorCode.BufferTooShort,
        `Buffer length ${bytes.length} is below the minimum of ${MIN_BUFFER_SIZE}`,
      );
    }

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

    const magic = view.getUint32(OFFSET_MAGIC, false);
    if (magic !== MAGIC) {
      throw new MalformedActionError(
        AssetErrorCode.BadMagic,
        `Expected magic 0x${MAGIC.toString(16)}, got 0x${magic.toString(16)}`,
      );
    }

    const version = bytes[OFFSET_VERSION];
    if (version !== VERSION) {
      throw new MalformedActionError(
        AssetErrorCode.UnsupportedVersion,
        `Unsupported version byte 0x${version.toString(16)}; expected 0x${VERSION.toString(16)}`,
      );
    }

    const kindCode = bytes[OFFSET_KIND];
    const kind = CODE_TO_ACTION_KIND[kindCode];
    if (kind === undefined) {
      throw new MalformedActionError(
        AssetErrorCode.UnknownActionKind,
        `Unknown kind code 0x${kindCode.toString(16)}`,
      );
    }

    const payloadLength = view.getUint32(OFFSET_LENGTH, false);
    if (bytes.length < OFFSET_PAYLOAD + payloadLength) {
      throw new MalformedActionError(
        AssetErrorCode.BufferTooShort,
        `Declared payload length ${payloadLength} exceeds remaining buffer size ${bytes.length - OFFSET_PAYLOAD}`,
      );
    }

    const cborPayload = bytes.subarray(
      OFFSET_PAYLOAD,
      OFFSET_PAYLOAD + payloadLength,
    );

    let action: unknown;
    try {
      action = decode(cborPayload);
    } catch (err) {
      throw new MalformedActionError(
        AssetErrorCode.CborDecodeFailed,
        `CBOR decode failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (
      action === null ||
      typeof action !== 'object' ||
      (action as Record<string, unknown>)['kind'] !== kind
    ) {
      throw new MalformedActionError(
        AssetErrorCode.MissingRequiredField,
        `Decoded payload missing or mismatched 'kind' field (expected '${kind}')`,
      );
    }

    return action as IAssetAction;
  }

  /**
   * Returns the wire-format version byte that `serialize` writes.
   * Useful for inspecting serialized buffers without fully decoding them.
   */
  static readonly CURRENT_VERSION = VERSION;

  /**
   * Reads the version byte from a framed buffer without decoding the payload.
   *
   * @throws {MalformedActionError} if the buffer is shorter than the header.
   */
  static peekVersion(bytes: Uint8Array): number {
    if (bytes.length < OFFSET_PAYLOAD) {
      throw new MalformedActionError(
        AssetErrorCode.BufferTooShort,
        `Buffer length ${bytes.length} too short to contain version byte`,
      );
    }
    return bytes[OFFSET_VERSION];
  }

  /**
   * Reads the action kind from a framed buffer without fully decoding the payload.
   *
   * @throws {MalformedActionError} if the buffer is too short or the kind code is unknown.
   */
  static peekKind(bytes: Uint8Array): ActionKind {
    if (bytes.length < OFFSET_PAYLOAD) {
      throw new MalformedActionError(
        AssetErrorCode.BufferTooShort,
        `Buffer length ${bytes.length} too short to contain kind byte`,
      );
    }
    const kindCode = bytes[OFFSET_KIND];
    const kind = CODE_TO_ACTION_KIND[kindCode];
    if (kind === undefined) {
      throw new MalformedActionError(
        AssetErrorCode.UnknownActionKind,
        `Unknown kind code 0x${kindCode.toString(16)}`,
      );
    }
    return kind;
  }
}
