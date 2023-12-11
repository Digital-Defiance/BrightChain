/**
 * @fileoverview TCBL Manifest Serializer.
 *
 * Provides deterministic binary serialization and deserialization of TCBL manifests.
 * The binary format is:
 *   - version: uint16 (2 bytes, big-endian)
 *   - entryCount: uint32 (4 bytes, big-endian)
 *   - For each entry:
 *     - fileNameLength: uint16 (2 bytes, big-endian)
 *     - fileName: UTF-8 bytes (variable)
 *     - mimeTypeLength: uint8 (1 byte)
 *     - mimeType: UTF-8 bytes (variable)
 *     - originalDataLength: uint48 (6 bytes, big-endian)
 *     - cblAddress: fixed-size checksum bytes (64 bytes for SHA3-512)
 *   - checksum: 64 bytes (SHA3-512 of all preceding data)
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 * @see Requirement 2.5
 */

import { CHECKSUM } from '@digitaldefiance/ecies-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { TcblErrorType } from '../../enumerations/tcblErrorType';
import { TcblError } from '../../errors/tcblError';
import { ITcblEntryDescriptor } from '../../interfaces/tcbl/tcblEntryDescriptor';
import { ITcblManifest } from '../../interfaces/tcbl/tcblManifest';
import { Checksum } from '../../types/checksum';

/** Fixed size of a checksum in bytes (SHA3-512). */
const CHECKSUM_BYTE_LENGTH = CHECKSUM.SHA3_BUFFER_LENGTH; // 64

/** Size of the version field in bytes. */
const VERSION_SIZE = 2;

/** Size of the entryCount field in bytes. */
const ENTRY_COUNT_SIZE = 4;

/** Size of the fileNameLength field in bytes. */
const FILE_NAME_LENGTH_SIZE = 2;

/** Size of the mimeTypeLength field in bytes. */
const MIME_TYPE_LENGTH_SIZE = 1;

/** Size of the originalDataLength field in bytes (uint48). */
const ORIGINAL_DATA_LENGTH_SIZE = 6;

/** Minimum header size: version + entryCount. */
const MIN_HEADER_SIZE = VERSION_SIZE + ENTRY_COUNT_SIZE;

/**
 * Static utility class for deterministic binary serialization and
 * deserialization of TCBL manifests.
 *
 * @see Requirement 3
 */
export class TcblManifestSerializer {
  /**
   * Serialize a TCBL manifest into a deterministic binary `Uint8Array`.
   *
   * The checksum field on the manifest is ignored during serialization;
   * a fresh checksum is computed over the entry data and appended.
   *
   * @param manifest - The manifest to serialize
   * @returns The serialized binary representation
   *
   * @see Requirements 3.1, 3.5
   */
  static serialize(manifest: ITcblManifest): Uint8Array {
    const encoder = new TextEncoder();

    // Pre-compute total size
    let totalSize = VERSION_SIZE + ENTRY_COUNT_SIZE;
    const encodedEntries: {
      fileNameBytes: Uint8Array;
      mimeTypeBytes: Uint8Array;
      entry: ITcblEntryDescriptor;
    }[] = [];

    for (const entry of manifest.entries) {
      const fileNameBytes = encoder.encode(entry.fileName);
      const mimeTypeBytes = encoder.encode(entry.mimeType);
      encodedEntries.push({ fileNameBytes, mimeTypeBytes, entry });

      totalSize +=
        FILE_NAME_LENGTH_SIZE +
        fileNameBytes.length +
        MIME_TYPE_LENGTH_SIZE +
        mimeTypeBytes.length +
        ORIGINAL_DATA_LENGTH_SIZE +
        CHECKSUM_BYTE_LENGTH;
    }

    // Add checksum at the end
    totalSize += CHECKSUM_BYTE_LENGTH;

    const buffer = new Uint8Array(totalSize);
    const view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
    let offset = 0;

    // Version (uint16 big-endian)
    view.setUint16(offset, manifest.version, false);
    offset += VERSION_SIZE;

    // Entry count (uint32 big-endian)
    view.setUint32(offset, manifest.entries.length, false);
    offset += ENTRY_COUNT_SIZE;

    // Entries
    for (const { fileNameBytes, mimeTypeBytes, entry } of encodedEntries) {
      // fileNameLength (uint16 big-endian)
      view.setUint16(offset, fileNameBytes.length, false);
      offset += FILE_NAME_LENGTH_SIZE;

      // fileName (UTF-8 bytes)
      buffer.set(fileNameBytes, offset);
      offset += fileNameBytes.length;

      // mimeTypeLength (uint8)
      view.setUint8(offset, mimeTypeBytes.length);
      offset += MIME_TYPE_LENGTH_SIZE;

      // mimeType (UTF-8 bytes)
      buffer.set(mimeTypeBytes, offset);
      offset += mimeTypeBytes.length;

      // originalDataLength (uint48 big-endian)
      TcblManifestSerializer.writeUint48(
        view,
        offset,
        entry.originalDataLength,
      );
      offset += ORIGINAL_DATA_LENGTH_SIZE;

      // cblAddress (fixed-size checksum bytes)
      buffer.set(entry.cblAddress.toUint8Array(), offset);
      offset += CHECKSUM_BYTE_LENGTH;
    }

    // Compute checksum over everything before the checksum slot
    const entryData = buffer.subarray(0, offset);
    const checksumBytes = sha3_512(entryData);
    buffer.set(checksumBytes, offset);

    return buffer;
  }

  /**
   * Deserialize a binary `Uint8Array` back into a TCBL manifest object.
   *
   * @param data - The binary data to deserialize
   * @returns The deserialized manifest
   * @throws {TcblError} with `ManifestTruncated` if data is too short
   * @throws {TcblError} with `ManifestCorrupted` if data is structurally invalid
   *
   * @see Requirements 3.2, 3.4
   */
  static deserialize(data: Uint8Array): ITcblManifest {
    if (data.length < MIN_HEADER_SIZE + CHECKSUM_BYTE_LENGTH) {
      throw new TcblError(TcblErrorType.ManifestTruncated);
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    let offset = 0;

    // Version (uint16 big-endian)
    const version = view.getUint16(offset, false);
    offset += VERSION_SIZE;

    // Entry count (uint32 big-endian)
    const entryCount = view.getUint32(offset, false);
    offset += ENTRY_COUNT_SIZE;

    const decoder = new TextDecoder('utf-8', { fatal: true });
    const entries: ITcblEntryDescriptor[] = [];

    for (let i = 0; i < entryCount; i++) {
      // fileNameLength (uint16 big-endian)
      if (offset + FILE_NAME_LENGTH_SIZE > data.length - CHECKSUM_BYTE_LENGTH) {
        throw new TcblError(TcblErrorType.ManifestTruncated);
      }
      const fileNameLength = view.getUint16(offset, false);
      offset += FILE_NAME_LENGTH_SIZE;

      // fileName (UTF-8 bytes)
      if (offset + fileNameLength > data.length - CHECKSUM_BYTE_LENGTH) {
        throw new TcblError(TcblErrorType.ManifestTruncated);
      }
      let fileName: string;
      try {
        fileName = decoder.decode(
          data.subarray(offset, offset + fileNameLength),
        );
      } catch {
        throw new TcblError(TcblErrorType.ManifestCorrupted);
      }
      offset += fileNameLength;

      // mimeTypeLength (uint8)
      if (offset + MIME_TYPE_LENGTH_SIZE > data.length - CHECKSUM_BYTE_LENGTH) {
        throw new TcblError(TcblErrorType.ManifestTruncated);
      }
      const mimeTypeLength = view.getUint8(offset);
      offset += MIME_TYPE_LENGTH_SIZE;

      // mimeType (UTF-8 bytes)
      if (offset + mimeTypeLength > data.length - CHECKSUM_BYTE_LENGTH) {
        throw new TcblError(TcblErrorType.ManifestTruncated);
      }
      let mimeType: string;
      try {
        mimeType = decoder.decode(
          data.subarray(offset, offset + mimeTypeLength),
        );
      } catch {
        throw new TcblError(TcblErrorType.ManifestCorrupted);
      }
      offset += mimeTypeLength;

      // originalDataLength (uint48 big-endian)
      if (
        offset + ORIGINAL_DATA_LENGTH_SIZE >
        data.length - CHECKSUM_BYTE_LENGTH
      ) {
        throw new TcblError(TcblErrorType.ManifestTruncated);
      }
      const originalDataLength = TcblManifestSerializer.readUint48(
        view,
        offset,
      );
      offset += ORIGINAL_DATA_LENGTH_SIZE;

      // cblAddress (fixed-size checksum bytes)
      if (offset + CHECKSUM_BYTE_LENGTH > data.length - CHECKSUM_BYTE_LENGTH) {
        throw new TcblError(TcblErrorType.ManifestTruncated);
      }
      const cblAddressBytes = data.slice(offset, offset + CHECKSUM_BYTE_LENGTH);
      const cblAddress = Checksum.fromUint8Array(cblAddressBytes);
      offset += CHECKSUM_BYTE_LENGTH;

      entries.push({ fileName, mimeType, originalDataLength, cblAddress });
    }

    // Verify we consumed exactly the right amount before the checksum
    const expectedChecksumOffset = data.length - CHECKSUM_BYTE_LENGTH;
    if (offset !== expectedChecksumOffset) {
      throw new TcblError(TcblErrorType.ManifestCorrupted);
    }

    // Extract and verify checksum
    const storedChecksumBytes = data.slice(
      offset,
      offset + CHECKSUM_BYTE_LENGTH,
    );
    const checksum = Checksum.fromUint8Array(storedChecksumBytes);

    // Verify checksum integrity
    const entryData = data.subarray(0, offset);
    const computedChecksumBytes = sha3_512(entryData);
    const computedChecksum = Checksum.fromUint8Array(computedChecksumBytes);
    if (!checksum.equals(computedChecksum)) {
      throw new TcblError(TcblErrorType.ManifestCorrupted);
    }

    return {
      version,
      entryCount,
      entries,
      checksum,
    };
  }

  /**
   * Compute the manifest checksum over the serialized entry data
   * (version + entryCount + entries), excluding the checksum itself.
   *
   * @param manifest - The manifest to compute the checksum for
   * @returns The computed checksum
   *
   * @see Requirement 2.5
   */
  static computeChecksum(manifest: ITcblManifest): Checksum {
    const serialized = TcblManifestSerializer.serialize(manifest);
    // The checksum is the last CHECKSUM_BYTE_LENGTH bytes;
    // compute over everything before it
    const entryData = serialized.subarray(
      0,
      serialized.length - CHECKSUM_BYTE_LENGTH,
    );
    return Checksum.fromUint8Array(sha3_512(entryData));
  }

  /**
   * Write a uint48 value (6 bytes, big-endian) into a DataView.
   *
   * @param view - The DataView to write to
   * @param offset - The byte offset to write at
   * @param value - The value to write (must be <= 2^48 - 1)
   */
  private static writeUint48(
    view: DataView,
    offset: number,
    value: number,
  ): void {
    // Split into high 16 bits and low 32 bits
    const high = Math.floor(value / 0x100000000) & 0xffff;
    const low = value >>> 0;
    view.setUint16(offset, high, false);
    view.setUint32(offset + 2, low, false);
  }

  /**
   * Read a uint48 value (6 bytes, big-endian) from a DataView.
   *
   * @param view - The DataView to read from
   * @param offset - The byte offset to read at
   * @returns The uint48 value as a number
   */
  private static readUint48(view: DataView, offset: number): number {
    const high = view.getUint16(offset, false);
    const low = view.getUint32(offset + 2, false);
    return high * 0x100000000 + low;
  }
}
