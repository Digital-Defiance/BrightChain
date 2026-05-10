import { CrcService } from '@digitaldefiance/ecies-lib';
import { DeserializationError } from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';

const VERSION = 0x01;
const HASH_SIZE = 64; // SHA3-512

/**
 * Deterministic binary serialization/deserialization of IFileMetadataBase<string>.
 *
 * Format (see design doc for full layout):
 *   version(1) | id | ownerId | folderId | fileName | mimeType |
 *   sizeBytes(8) | tagCount(2) | tags(var) | currentVersionId |
 *   vaultCreationLedgerEntryHash(64) |
 *   presenceFlags(1) | [description] | [aclId] | [deletedAt(8)] |
 *   [deletedFromPath] | [scheduledDestructionAt(8)] |
 *   booleanFlags(1) | createdAt(8) | updatedAt(8) |
 *   createdBy | updatedBy | crc16(2)
 *
 * Variable-length string fields are encoded as: uint32BE(byteLength) + UTF-8 bytes.
 * Optional string fields are only present when their presence bit is set.
 * Optional date fields are encoded as uint64BE milliseconds when present.
 *
 * Validates: Requirements 32.1, 32.2, 32.3
 */
export class FileMetadataSerializer {
  private static readonly crc = new CrcService();
  private static readonly encoder = new TextEncoder();
  private static readonly decoder = new TextDecoder();

  // Presence flag bits for optional fields
  private static readonly FLAG_DESCRIPTION = 0x01; // bit 0
  private static readonly FLAG_ACL_ID = 0x02; // bit 1
  private static readonly FLAG_DELETED_AT = 0x04; // bit 2
  private static readonly FLAG_DELETED_FROM_PATH = 0x08; // bit 3
  private static readonly FLAG_SCHEDULED_DESTRUCTION = 0x10; // bit 4

  /**
   * Serialize an IFileMetadataBase<string> to a deterministic binary Uint8Array.
   */
  static serialize(metadata: IFileMetadataBase<string>): Uint8Array {
    // Pre-encode all variable-length string fields
    const idBytes = this.encoder.encode(metadata.id);
    const ownerIdBytes = this.encoder.encode(metadata.ownerId);
    const vaultContainerIdBytes = this.encoder.encode(
      metadata.vaultContainerId,
    );
    const folderIdBytes = this.encoder.encode(metadata.folderId);
    const fileNameBytes = this.encoder.encode(metadata.fileName);
    const mimeTypeBytes = this.encoder.encode(metadata.mimeType);
    const currentVersionIdBytes = this.encoder.encode(
      metadata.currentVersionId,
    );
    const createdByBytes = this.encoder.encode(metadata.createdBy);
    const updatedByBytes = this.encoder.encode(metadata.updatedBy);

    // Encode tags
    const tagByteArrays = metadata.tags.map((t) => this.encoder.encode(t));

    // Encode optional string fields
    const descriptionBytes =
      metadata.description !== undefined && metadata.description !== null
        ? this.encoder.encode(metadata.description)
        : null;
    const aclIdBytes =
      metadata.aclId !== undefined && metadata.aclId !== null
        ? this.encoder.encode(metadata.aclId)
        : null;
    const deletedFromPathBytes =
      metadata.deletedFromPath !== undefined &&
      metadata.deletedFromPath !== null
        ? this.encoder.encode(metadata.deletedFromPath)
        : null;

    // Build presence flags
    let presenceFlags = 0;
    if (metadata.description !== undefined && metadata.description !== null)
      presenceFlags |= this.FLAG_DESCRIPTION;
    if (metadata.aclId !== undefined && metadata.aclId !== null)
      presenceFlags |= this.FLAG_ACL_ID;
    if (metadata.deletedAt !== undefined && metadata.deletedAt !== null)
      presenceFlags |= this.FLAG_DELETED_AT;
    if (
      metadata.deletedFromPath !== undefined &&
      metadata.deletedFromPath !== null
    )
      presenceFlags |= this.FLAG_DELETED_FROM_PATH;
    if (
      metadata.scheduledDestructionAt !== undefined &&
      metadata.scheduledDestructionAt !== null
    )
      presenceFlags |= this.FLAG_SCHEDULED_DESTRUCTION;

    // Calculate total body size
    let bodyLen =
      1 + // version
      4 +
      idBytes.length + // id
      4 +
      ownerIdBytes.length + // ownerId
      4 +
      vaultContainerIdBytes.length + // vaultContainerId
      4 +
      folderIdBytes.length + // folderId
      4 +
      fileNameBytes.length + // fileName
      4 +
      mimeTypeBytes.length + // mimeType
      8 + // sizeBytes (float64)
      2; // tagCount (uint16)

    // Tags: each is uint16 length + UTF-8 bytes
    for (const tb of tagByteArrays) {
      bodyLen += 2 + tb.length;
    }

    bodyLen +=
      4 +
      currentVersionIdBytes.length + // currentVersionId
      HASH_SIZE + // vaultCreationLedgerEntryHash
      1; // presenceFlags byte

    // Optional fields
    if (descriptionBytes) bodyLen += 4 + descriptionBytes.length;
    if (aclIdBytes) bodyLen += 4 + aclIdBytes.length;
    if (presenceFlags & this.FLAG_DELETED_AT) bodyLen += 8;
    if (deletedFromPathBytes) bodyLen += 4 + deletedFromPathBytes.length;
    if (presenceFlags & this.FLAG_SCHEDULED_DESTRUCTION) bodyLen += 8;

    bodyLen +=
      1 + // boolean flags
      8 + // createdAt
      8 + // updatedAt
      4 +
      createdByBytes.length + // createdBy
      4 +
      updatedByBytes.length; // updatedBy

    const buf = new Uint8Array(bodyLen + 2); // +2 for CRC-16
    const view = new DataView(buf.buffer);
    let offset = 0;

    // Version
    buf[offset++] = VERSION;

    // Required string fields: id, ownerId, folderId, fileName, mimeType
    offset = this.writeString(buf, view, offset, idBytes);
    offset = this.writeString(buf, view, offset, ownerIdBytes);
    offset = this.writeString(buf, view, offset, vaultContainerIdBytes);
    offset = this.writeString(buf, view, offset, folderIdBytes);
    offset = this.writeString(buf, view, offset, fileNameBytes);
    offset = this.writeString(buf, view, offset, mimeTypeBytes);

    // sizeBytes as float64 BE
    view.setFloat64(offset, metadata.sizeBytes, false);
    offset += 8;

    // Tags
    view.setUint16(offset, metadata.tags.length, false);
    offset += 2;
    for (const tb of tagByteArrays) {
      view.setUint16(offset, tb.length, false);
      offset += 2;
      buf.set(tb, offset);
      offset += tb.length;
    }

    // currentVersionId
    offset = this.writeString(buf, view, offset, currentVersionIdBytes);

    // vaultCreationLedgerEntryHash (fixed 64 bytes)
    const hash = metadata.vaultCreationLedgerEntryHash;
    if (hash instanceof Uint8Array) {
      buf.set(hash.subarray(0, HASH_SIZE), offset);
    } else {
      // Handle number[] (from JSON round-trip in tests)
      const arr = hash as unknown as number[];
      for (let i = 0; i < HASH_SIZE; i++) {
        buf[offset + i] = arr[i] ?? 0;
      }
    }
    offset += HASH_SIZE;

    // Presence flags
    buf[offset++] = presenceFlags;

    // Optional fields (only written when flag is set)
    if (descriptionBytes) {
      offset = this.writeString(buf, view, offset, descriptionBytes);
    }
    if (aclIdBytes) {
      offset = this.writeString(buf, view, offset, aclIdBytes);
    }
    if (presenceFlags & this.FLAG_DELETED_AT) {
      const ms = new Date(metadata.deletedAt as string | Date).getTime();
      view.setFloat64(offset, ms, false);
      offset += 8;
    }
    if (deletedFromPathBytes) {
      offset = this.writeString(buf, view, offset, deletedFromPathBytes);
    }
    if (presenceFlags & this.FLAG_SCHEDULED_DESTRUCTION) {
      const ms = new Date(
        metadata.scheduledDestructionAt as string | Date,
      ).getTime();
      view.setFloat64(offset, ms, false);
      offset += 8;
    }

    // Boolean flags: bit 0 = approvalGoverned, bit 1 = visibleWatermark, bit 2 = invisibleWatermark
    let boolFlags = 0;
    if (metadata.approvalGoverned) boolFlags |= 0x01;
    if (metadata.visibleWatermark) boolFlags |= 0x02;
    if (metadata.invisibleWatermark) boolFlags |= 0x04;
    buf[offset++] = boolFlags;

    // createdAt, updatedAt as float64 BE milliseconds
    view.setFloat64(
      offset,
      new Date(metadata.createdAt as string | Date).getTime(),
      false,
    );
    offset += 8;
    view.setFloat64(
      offset,
      new Date(metadata.updatedAt as string | Date).getTime(),
      false,
    );
    offset += 8;

    // createdBy, updatedBy
    offset = this.writeString(buf, view, offset, createdByBytes);
    offset = this.writeString(buf, view, offset, updatedByBytes);

    // CRC-16 checksum
    const crc = this.crc.crc16(buf.subarray(0, offset));
    buf.set(crc, offset);

    return buf;
  }

  /**
   * Deserialize a binary Uint8Array back to IFileMetadataBase<string>.
   * Throws DeserializationError on corrupted/malformed payloads.
   */
  static deserialize(data: Uint8Array): IFileMetadataBase<string> {
    // Minimum size: version(1) + 5 string fields (4+0 each = 20) + sizeBytes(8) +
    // tagCount(2) + currentVersionId(4+0) + hash(64) + presenceFlags(1) +
    // boolFlags(1) + createdAt(8) + updatedAt(8) + createdBy(4+0) + updatedBy(4+0) + crc(2)
    const MIN_SIZE = 1 + 20 + 8 + 2 + 4 + 64 + 1 + 1 + 8 + 8 + 4 + 4 + 2;
    if (data.length < MIN_SIZE) {
      throw new DeserializationError('File metadata data too short');
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // Verify CRC-16 first
    const crcOffset = data.length - 2;
    const storedCrc = data.subarray(crcOffset, crcOffset + 2);
    const computedCrc = this.crc.crc16(data.subarray(0, crcOffset));
    if (storedCrc[0] !== computedCrc[0] || storedCrc[1] !== computedCrc[1]) {
      throw new DeserializationError('File metadata CRC-16 mismatch');
    }

    let offset = 0;

    // Version
    const version = data[offset++];
    if (version !== VERSION) {
      throw new DeserializationError(
        `Unsupported file metadata version: ${version}`,
      );
    }

    // Required string fields
    const [id, o1] = this.readString(data, view, offset, crcOffset);
    offset = o1;
    const [ownerId, o2] = this.readString(data, view, offset, crcOffset);
    offset = o2;
    const [vaultContainerId, o2b] = this.readString(
      data,
      view,
      offset,
      crcOffset,
    );
    offset = o2b;
    const [folderId, o3] = this.readString(data, view, offset, crcOffset);
    offset = o3;
    const [fileName, o4] = this.readString(data, view, offset, crcOffset);
    offset = o4;
    const [mimeType, o5] = this.readString(data, view, offset, crcOffset);
    offset = o5;

    // sizeBytes
    if (offset + 8 > crcOffset) {
      throw new DeserializationError('File metadata truncated at sizeBytes');
    }
    const sizeBytes = view.getFloat64(offset, false);
    offset += 8;

    // Tags
    if (offset + 2 > crcOffset) {
      throw new DeserializationError('File metadata truncated at tagCount');
    }
    const tagCount = view.getUint16(offset, false);
    offset += 2;
    const tags: string[] = [];
    for (let i = 0; i < tagCount; i++) {
      if (offset + 2 > crcOffset) {
        throw new DeserializationError(
          `File metadata truncated at tag ${i} length`,
        );
      }
      const tagLen = view.getUint16(offset, false);
      offset += 2;
      if (offset + tagLen > crcOffset) {
        throw new DeserializationError(
          `File metadata truncated at tag ${i} data`,
        );
      }
      tags.push(this.decoder.decode(data.subarray(offset, offset + tagLen)));
      offset += tagLen;
    }

    // currentVersionId
    const [currentVersionId, o6] = this.readString(
      data,
      view,
      offset,
      crcOffset,
    );
    offset = o6;

    // vaultCreationLedgerEntryHash (fixed 64 bytes)
    if (offset + HASH_SIZE > crcOffset) {
      throw new DeserializationError(
        'File metadata truncated at vaultCreationLedgerEntryHash',
      );
    }
    const vaultCreationLedgerEntryHash = data.slice(offset, offset + HASH_SIZE);
    offset += HASH_SIZE;

    // Presence flags
    if (offset >= crcOffset) {
      throw new DeserializationError(
        'File metadata truncated at presence flags',
      );
    }
    const presenceFlags = data[offset++];

    // Optional fields
    let description: string | undefined;
    if (presenceFlags & this.FLAG_DESCRIPTION) {
      const [val, nextOff] = this.readString(data, view, offset, crcOffset);
      description = val;
      offset = nextOff;
    }

    let aclId: string | undefined;
    if (presenceFlags & this.FLAG_ACL_ID) {
      const [val, nextOff] = this.readString(data, view, offset, crcOffset);
      aclId = val;
      offset = nextOff;
    }

    let deletedAt: string | undefined;
    if (presenceFlags & this.FLAG_DELETED_AT) {
      if (offset + 8 > crcOffset) {
        throw new DeserializationError('File metadata truncated at deletedAt');
      }
      const ms = view.getFloat64(offset, false);
      deletedAt = new Date(ms).toISOString();
      offset += 8;
    }

    let deletedFromPath: string | undefined;
    if (presenceFlags & this.FLAG_DELETED_FROM_PATH) {
      const [val, nextOff] = this.readString(data, view, offset, crcOffset);
      deletedFromPath = val;
      offset = nextOff;
    }

    let scheduledDestructionAt: string | undefined;
    if (presenceFlags & this.FLAG_SCHEDULED_DESTRUCTION) {
      if (offset + 8 > crcOffset) {
        throw new DeserializationError(
          'File metadata truncated at scheduledDestructionAt',
        );
      }
      const ms = view.getFloat64(offset, false);
      scheduledDestructionAt = new Date(ms).toISOString();
      offset += 8;
    }

    // Boolean flags
    if (offset >= crcOffset) {
      throw new DeserializationError(
        'File metadata truncated at boolean flags',
      );
    }
    const boolFlags = data[offset++];
    const approvalGoverned = (boolFlags & 0x01) !== 0;
    const visibleWatermark = (boolFlags & 0x02) !== 0;
    const invisibleWatermark = (boolFlags & 0x04) !== 0;

    // createdAt, updatedAt
    if (offset + 16 > crcOffset) {
      throw new DeserializationError('File metadata truncated at timestamps');
    }
    const createdAt = new Date(view.getFloat64(offset, false)).toISOString();
    offset += 8;
    const updatedAt = new Date(view.getFloat64(offset, false)).toISOString();
    offset += 8;

    // createdBy, updatedBy
    const [createdBy, o7] = this.readString(data, view, offset, crcOffset);
    offset = o7;
    const [updatedBy, _o8] = this.readString(data, view, offset, crcOffset);

    const result: IFileMetadataBase<string> = {
      id,
      ownerId,
      vaultContainerId,
      folderId,
      fileName,
      mimeType,
      sizeBytes,
      tags,
      currentVersionId,
      vaultCreationLedgerEntryHash,
      approvalGoverned,
      visibleWatermark,
      invisibleWatermark,
      createdAt,
      updatedAt,
      createdBy,
      updatedBy,
    };

    // Only set optional fields if present (preserve undefined semantics)
    if (description !== undefined) result.description = description;
    if (aclId !== undefined) result.aclId = aclId;
    if (deletedAt !== undefined) result.deletedAt = deletedAt;
    if (deletedFromPath !== undefined) result.deletedFromPath = deletedFromPath;
    if (scheduledDestructionAt !== undefined)
      result.scheduledDestructionAt = scheduledDestructionAt;

    return result;
  }

  // ---- Private helpers ----

  /** Write a length-prefixed UTF-8 string (uint32BE length + bytes). */
  private static writeString(
    buf: Uint8Array,
    view: DataView,
    offset: number,
    encoded: Uint8Array,
  ): number {
    view.setUint32(offset, encoded.length, false);
    offset += 4;
    buf.set(encoded, offset);
    offset += encoded.length;
    return offset;
  }

  /** Read a length-prefixed UTF-8 string. Returns [value, newOffset]. */
  private static readString(
    data: Uint8Array,
    view: DataView,
    offset: number,
    crcOffset: number,
  ): [string, number] {
    if (offset + 4 > crcOffset) {
      throw new DeserializationError(
        'File metadata truncated at string length',
      );
    }
    const len = view.getUint32(offset, false);
    offset += 4;
    if (offset + len > crcOffset) {
      throw new DeserializationError('File metadata truncated at string data');
    }
    const str = this.decoder.decode(data.subarray(offset, offset + len));
    offset += len;
    return [str, offset];
  }
}
