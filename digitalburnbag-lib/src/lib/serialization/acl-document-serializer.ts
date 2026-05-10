import { CrcService } from '@digitaldefiance/ecies-lib';
import { DeserializationError } from '../errors';
import type { IACLDocumentBase } from '../interfaces/bases/acl-document';
import type { IACLEntryBase } from '../interfaces/bases/acl-entry';

const VERSION = 0x01;

/** Principal type byte values */
const PRINCIPAL_USER = 0x01;
const PRINCIPAL_GROUP = 0x02;
const PRINCIPAL_SHARE_LINK = 0x03;

/** Presence flag bits for optional ACL entry fields */
const FLAG_CUSTOM_PERMISSION_SET_ID = 0x01; // bit 0
const FLAG_IP_RANGE = 0x02; // bit 1
const FLAG_TIME_WINDOW_START = 0x04; // bit 2
const FLAG_TIME_WINDOW_END = 0x08; // bit 3
const FLAG_TIME_WINDOW_TIMEZONE = 0x10; // bit 4
const FLAG_EXPIRES_AT = 0x20; // bit 5

const principalTypeToString: Record<
  number,
  IACLEntryBase<string>['principalType']
> = {
  [PRINCIPAL_USER]: 'user',
  [PRINCIPAL_GROUP]: 'group',
  [PRINCIPAL_SHARE_LINK]: 'share_link',
};

const principalStringToByte: Record<string, number> = {
  user: PRINCIPAL_USER,
  group: PRINCIPAL_GROUP,
  share_link: PRINCIPAL_SHARE_LINK,
};

/**
 * Deterministic binary serialization/deserialization of IACLDocumentBase<string>.
 *
 * Format:
 *   version(1) | id | createdAt(8) | updatedAt(8) | updatedBy |
 *   entryCount(2) | entries(var) | crc16(2)
 *
 * Per entry:
 *   principalType(1) | principalId | permissionLevel |
 *   presenceFlags(1) | canReshare(1) | blockDownload(1) |
 *   [customPermissionSetId] | [ipRange] |
 *   [timeWindowStart] | [timeWindowEnd] | [timeWindowTimezone] |
 *   [expiresAt(8)]
 *
 * Variable-length string fields are encoded as: uint32BE(byteLength) + UTF-8 bytes.
 * Optional string fields are only present when their presence bit is set.
 *
 * Validates: Requirements 33.1, 33.2, 33.3
 */
export class ACLDocumentSerializer {
  private static readonly crc = new CrcService();
  private static readonly encoder = new TextEncoder();
  private static readonly decoder = new TextDecoder();

  /**
   * Serialize an IACLDocumentBase<string> to a deterministic binary Uint8Array.
   */
  static serialize(acl: IACLDocumentBase<string>): Uint8Array {
    // Pre-encode document-level string fields
    const idBytes = this.encoder.encode(acl.id);
    const updatedByBytes = this.encoder.encode(acl.updatedBy);

    // Pre-encode all entry fields
    const entryData = acl.entries.map((entry) => this.preEncodeEntry(entry));

    // Calculate total body size
    let bodyLen =
      1 + // version
      4 +
      idBytes.length + // id
      8 + // createdAt (float64)
      8 + // updatedAt (float64)
      4 +
      updatedByBytes.length + // updatedBy
      2; // entryCount (uint16)

    for (const ed of entryData) {
      bodyLen += ed.size;
    }

    const buf = new Uint8Array(bodyLen + 2); // +2 for CRC-16
    const view = new DataView(buf.buffer);
    let offset = 0;

    // Version
    buf[offset++] = VERSION;

    // Document-level fields
    offset = this.writeString(buf, view, offset, idBytes);

    view.setFloat64(
      offset,
      new Date(acl.createdAt as string | Date).getTime(),
      false,
    );
    offset += 8;

    view.setFloat64(
      offset,
      new Date(acl.updatedAt as string | Date).getTime(),
      false,
    );
    offset += 8;

    offset = this.writeString(buf, view, offset, updatedByBytes);

    // Entry count
    view.setUint16(offset, acl.entries.length, false);
    offset += 2;

    // Serialize each entry
    for (let i = 0; i < acl.entries.length; i++) {
      offset = this.writeEntry(buf, view, offset, acl.entries[i], entryData[i]);
    }

    // CRC-16 checksum
    const crc = this.crc.crc16(buf.subarray(0, offset));
    buf.set(crc, offset);

    return buf;
  }

  /**
   * Deserialize a binary Uint8Array back to IACLDocumentBase<string>.
   * Throws DeserializationError on corrupted/malformed payloads.
   */
  static deserialize(data: Uint8Array): IACLDocumentBase<string> {
    // Minimum size: version(1) + id(4+0) + createdAt(8) + updatedAt(8) +
    // updatedBy(4+0) + entryCount(2) + crc(2) = 29
    const MIN_SIZE = 29;
    if (data.length < MIN_SIZE) {
      throw new DeserializationError('ACL document data too short');
    }

    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    // Verify CRC-16 first
    const crcOffset = data.length - 2;
    const storedCrc = data.subarray(crcOffset, crcOffset + 2);
    const computedCrc = this.crc.crc16(data.subarray(0, crcOffset));
    if (storedCrc[0] !== computedCrc[0] || storedCrc[1] !== computedCrc[1]) {
      throw new DeserializationError('ACL document CRC-16 mismatch');
    }

    let offset = 0;

    // Version
    const version = data[offset++];
    if (version !== VERSION) {
      throw new DeserializationError(
        `Unsupported ACL document version: ${version}`,
      );
    }

    // Document-level fields
    const [id, o1] = this.readString(data, view, offset, crcOffset);
    offset = o1;

    if (offset + 8 > crcOffset) {
      throw new DeserializationError('ACL document truncated at createdAt');
    }
    const createdAt = new Date(view.getFloat64(offset, false)).toISOString();
    offset += 8;

    if (offset + 8 > crcOffset) {
      throw new DeserializationError('ACL document truncated at updatedAt');
    }
    const updatedAt = new Date(view.getFloat64(offset, false)).toISOString();
    offset += 8;

    const [updatedBy, o2] = this.readString(data, view, offset, crcOffset);
    offset = o2;

    // Entry count
    if (offset + 2 > crcOffset) {
      throw new DeserializationError('ACL document truncated at entryCount');
    }
    const entryCount = view.getUint16(offset, false);
    offset += 2;

    // Deserialize entries
    const entries: IACLEntryBase<string>[] = [];
    for (let i = 0; i < entryCount; i++) {
      const [entry, nextOffset] = this.readEntry(
        data,
        view,
        offset,
        crcOffset,
        i,
      );
      entries.push(entry);
      offset = nextOffset;
    }

    return { id, entries, createdAt, updatedAt, updatedBy };
  }

  // ---- Private helpers ----

  /** Pre-encode an entry's string fields and calculate its serialized size. */
  private static preEncodeEntry(entry: IACLEntryBase<string>) {
    const principalIdBytes = this.encoder.encode(entry.principalId);
    const permissionLevelBytes = this.encoder.encode(entry.permissionLevel);

    let presenceFlags = 0;
    const customPermissionSetIdBytes =
      entry.customPermissionSetId !== undefined &&
      entry.customPermissionSetId !== null
        ? this.encoder.encode(entry.customPermissionSetId)
        : null;
    if (customPermissionSetIdBytes)
      presenceFlags |= FLAG_CUSTOM_PERMISSION_SET_ID;

    const ipRangeBytes =
      entry.ipRange !== undefined && entry.ipRange !== null
        ? this.encoder.encode(entry.ipRange)
        : null;
    if (ipRangeBytes) presenceFlags |= FLAG_IP_RANGE;

    const timeWindowStartBytes =
      entry.timeWindowStart !== undefined && entry.timeWindowStart !== null
        ? this.encoder.encode(entry.timeWindowStart)
        : null;
    if (timeWindowStartBytes) presenceFlags |= FLAG_TIME_WINDOW_START;

    const timeWindowEndBytes =
      entry.timeWindowEnd !== undefined && entry.timeWindowEnd !== null
        ? this.encoder.encode(entry.timeWindowEnd)
        : null;
    if (timeWindowEndBytes) presenceFlags |= FLAG_TIME_WINDOW_END;

    const timeWindowTimezoneBytes =
      entry.timeWindowTimezone !== undefined &&
      entry.timeWindowTimezone !== null
        ? this.encoder.encode(entry.timeWindowTimezone)
        : null;
    if (timeWindowTimezoneBytes) presenceFlags |= FLAG_TIME_WINDOW_TIMEZONE;

    const hasExpiresAt =
      entry.expiresAt !== undefined && entry.expiresAt !== null;
    if (hasExpiresAt) presenceFlags |= FLAG_EXPIRES_AT;

    let size =
      1 + // principalType
      4 +
      principalIdBytes.length + // principalId
      4 +
      permissionLevelBytes.length + // permissionLevel
      1 + // presenceFlags
      1 + // canReshare
      1; // blockDownload

    if (customPermissionSetIdBytes)
      size += 4 + customPermissionSetIdBytes.length;
    if (ipRangeBytes) size += 4 + ipRangeBytes.length;
    if (timeWindowStartBytes) size += 4 + timeWindowStartBytes.length;
    if (timeWindowEndBytes) size += 4 + timeWindowEndBytes.length;
    if (timeWindowTimezoneBytes) size += 4 + timeWindowTimezoneBytes.length;
    if (hasExpiresAt) size += 8;

    return {
      principalIdBytes,
      permissionLevelBytes,
      customPermissionSetIdBytes,
      ipRangeBytes,
      timeWindowStartBytes,
      timeWindowEndBytes,
      timeWindowTimezoneBytes,
      hasExpiresAt,
      presenceFlags,
      size,
    };
  }

  /** Write a single ACL entry to the buffer. */
  private static writeEntry(
    buf: Uint8Array,
    view: DataView,
    offset: number,
    entry: IACLEntryBase<string>,
    ed: ReturnType<typeof ACLDocumentSerializer.preEncodeEntry>,
  ): number {
    // principalType
    const ptByte = principalStringToByte[entry.principalType];
    buf[offset++] = ptByte;

    // principalId
    offset = this.writeString(buf, view, offset, ed.principalIdBytes);

    // permissionLevel
    offset = this.writeString(buf, view, offset, ed.permissionLevelBytes);

    // presenceFlags
    buf[offset++] = ed.presenceFlags;

    // canReshare
    buf[offset++] = entry.canReshare ? 0x01 : 0x00;

    // blockDownload
    buf[offset++] = entry.blockDownload ? 0x01 : 0x00;

    // Optional fields (only written when presence flag is set)
    if (ed.customPermissionSetIdBytes) {
      offset = this.writeString(
        buf,
        view,
        offset,
        ed.customPermissionSetIdBytes,
      );
    }
    if (ed.ipRangeBytes) {
      offset = this.writeString(buf, view, offset, ed.ipRangeBytes);
    }
    if (ed.timeWindowStartBytes) {
      offset = this.writeString(buf, view, offset, ed.timeWindowStartBytes);
    }
    if (ed.timeWindowEndBytes) {
      offset = this.writeString(buf, view, offset, ed.timeWindowEndBytes);
    }
    if (ed.timeWindowTimezoneBytes) {
      offset = this.writeString(buf, view, offset, ed.timeWindowTimezoneBytes);
    }
    if (ed.hasExpiresAt) {
      const ms = new Date(entry.expiresAt as string | Date).getTime();
      view.setFloat64(offset, ms, false);
      offset += 8;
    }

    return offset;
  }

  /** Read a single ACL entry from the buffer. Returns [entry, newOffset]. */
  private static readEntry(
    data: Uint8Array,
    view: DataView,
    offset: number,
    crcOffset: number,
    entryIndex: number,
  ): [IACLEntryBase<string>, number] {
    // principalType
    if (offset >= crcOffset) {
      throw new DeserializationError(
        `ACL document truncated at entry ${entryIndex} principalType`,
      );
    }
    const ptByte = data[offset++];
    const principalType = principalTypeToString[ptByte];
    if (!principalType) {
      throw new DeserializationError(
        `Invalid principal type byte 0x${ptByte.toString(16).padStart(2, '0')} at entry ${entryIndex}`,
      );
    }

    // principalId
    const [principalId, o1] = this.readString(data, view, offset, crcOffset);
    offset = o1;

    // permissionLevel
    const [permissionLevel, o2] = this.readString(
      data,
      view,
      offset,
      crcOffset,
    );
    offset = o2;

    // presenceFlags
    if (offset >= crcOffset) {
      throw new DeserializationError(
        `ACL document truncated at entry ${entryIndex} presenceFlags`,
      );
    }
    const presenceFlags = data[offset++];

    // canReshare
    if (offset >= crcOffset) {
      throw new DeserializationError(
        `ACL document truncated at entry ${entryIndex} canReshare`,
      );
    }
    const canReshare = data[offset++] !== 0x00;

    // blockDownload
    if (offset >= crcOffset) {
      throw new DeserializationError(
        `ACL document truncated at entry ${entryIndex} blockDownload`,
      );
    }
    const blockDownload = data[offset++] !== 0x00;

    const entry: IACLEntryBase<string> = {
      principalType,
      principalId,
      permissionLevel,
      canReshare,
      blockDownload,
    };

    // Optional fields
    if (presenceFlags & FLAG_CUSTOM_PERMISSION_SET_ID) {
      const [val, nextOff] = this.readString(data, view, offset, crcOffset);
      entry.customPermissionSetId = val;
      offset = nextOff;
    }
    if (presenceFlags & FLAG_IP_RANGE) {
      const [val, nextOff] = this.readString(data, view, offset, crcOffset);
      entry.ipRange = val;
      offset = nextOff;
    }
    if (presenceFlags & FLAG_TIME_WINDOW_START) {
      const [val, nextOff] = this.readString(data, view, offset, crcOffset);
      entry.timeWindowStart = val;
      offset = nextOff;
    }
    if (presenceFlags & FLAG_TIME_WINDOW_END) {
      const [val, nextOff] = this.readString(data, view, offset, crcOffset);
      entry.timeWindowEnd = val;
      offset = nextOff;
    }
    if (presenceFlags & FLAG_TIME_WINDOW_TIMEZONE) {
      const [val, nextOff] = this.readString(data, view, offset, crcOffset);
      entry.timeWindowTimezone = val;
      offset = nextOff;
    }
    if (presenceFlags & FLAG_EXPIRES_AT) {
      if (offset + 8 > crcOffset) {
        throw new DeserializationError(
          `ACL document truncated at entry ${entryIndex} expiresAt`,
        );
      }
      const ms = view.getFloat64(offset, false);
      entry.expiresAt = new Date(ms).toISOString();
      offset += 8;
    }

    return [entry, offset];
  }

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
      throw new DeserializationError('ACL document truncated at string length');
    }
    const len = view.getUint32(offset, false);
    offset += 4;
    if (offset + len > crcOffset) {
      throw new DeserializationError('ACL document truncated at string data');
    }
    const str = this.decoder.decode(data.subarray(offset, offset + len));
    offset += len;
    return [str, offset];
  }
}
