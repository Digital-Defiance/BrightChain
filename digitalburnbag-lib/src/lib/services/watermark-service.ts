import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type { IWatermarkIdentity } from '../interfaces/params/watermark-params';
import type { IWatermarkService } from '../interfaces/services/watermark-service';

/**
 * MIME types that support visible watermarking.
 */
const VISIBLE_WATERMARK_MIME_TYPES: ReadonlySet<string> = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
]);

/** Marker prefix for visible watermarks: 0xFF 0xD9 0x57 0x4D */
const WM_MARKER = new Uint8Array([0xff, 0xd9, 0x57, 0x4d]);

/** Marker prefix for steganographic (invisible) watermarks: 0x00 0x53 0x54 0x47 */
const STG_MARKER = new Uint8Array([0x00, 0x53, 0x54, 0x47]);

/**
 * Dependencies injected into WatermarkService.
 */
export interface IWatermarkServiceDeps<TID extends PlatformID> {
  /** Log an audit entry */
  onAuditLog?: (entry: IAuditEntryParams<TID>) => Promise<void>;
}

/**
 * Applies visible and invisible watermarks to document content and
 * extracts steganographic identifiers for leak tracing.
 *
 * This is a simplified implementation — real watermarking would use
 * image/PDF manipulation libraries. The current approach appends
 * marker-delimited payloads to the content bytes.
 */
export class WatermarkService<TID extends PlatformID>
  implements IWatermarkService<TID>
{
  constructor(private readonly deps: IWatermarkServiceDeps<TID>) {}

  /**
   * Apply a visible watermark to document bytes.
   * For supported MIME types, appends a WM marker followed by the
   * accessor's username and timestamp encoded as UTF-8.
   * For unsupported types, returns the content unchanged.
   */
  async applyVisibleWatermark(
    content: Uint8Array,
    mimeType: string,
    accessor: IWatermarkIdentity<TID>,
  ): Promise<Uint8Array> {
    let result: Uint8Array;

    if (VISIBLE_WATERMARK_MIME_TYPES.has(mimeType)) {
      const watermarkString = `${accessor.username} | ${new Date(accessor.timestamp).toISOString()}`;
      const encoder = new TextEncoder();
      const watermarkBytes = encoder.encode(watermarkString);

      result = new Uint8Array(
        content.length + WM_MARKER.length + watermarkBytes.length,
      );
      result.set(content, 0);
      result.set(WM_MARKER, content.length);
      result.set(watermarkBytes, content.length + WM_MARKER.length);
    } else {
      result = content;
    }

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.WatermarkApplied,
        actorId: accessor.userId,
        targetId: accessor.userId,
        targetType: 'file',
        metadata: {
          mimeType,
          visible: true,
          supported: VISIBLE_WATERMARK_MIME_TYPES.has(mimeType),
        },
      });
    }

    return result;
  }

  /**
   * Embed a steganographic identifier in document content.
   * Appends an STG marker, a 4-byte big-endian length, and the
   * watermarkId encoded as UTF-8.
   */
  async applyInvisibleWatermark(
    content: Uint8Array,
    _mimeType: string,
    watermarkId: string,
  ): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const idBytes = encoder.encode(watermarkId);

    // 4-byte big-endian length
    const lengthBytes = new Uint8Array(4);
    const view = new DataView(lengthBytes.buffer);
    view.setUint32(0, idBytes.length, false); // big-endian

    const result = new Uint8Array(
      content.length + STG_MARKER.length + lengthBytes.length + idBytes.length,
    );
    result.set(content, 0);
    result.set(STG_MARKER, content.length);
    result.set(lengthBytes, content.length + STG_MARKER.length);
    result.set(
      idBytes,
      content.length + STG_MARKER.length + lengthBytes.length,
    );

    return result;
  }

  /**
   * Extract a steganographic identifier from document content.
   * Searches for the STG marker, reads the 4-byte length, then
   * decodes the watermarkId string.
   * Returns null if no marker is found.
   */
  async extractWatermark(
    content: Uint8Array,
    _mimeType: string,
  ): Promise<string | null> {
    const markerIndex = this.findMarker(content, STG_MARKER);
    if (markerIndex === -1) {
      return null;
    }

    const lengthOffset = markerIndex + STG_MARKER.length;
    if (lengthOffset + 4 > content.length) {
      return null;
    }

    const view = new DataView(
      content.buffer,
      content.byteOffset + lengthOffset,
      4,
    );
    const idLength = view.getUint32(0, false); // big-endian

    const idOffset = lengthOffset + 4;
    if (idOffset + idLength > content.length) {
      return null;
    }

    const idBytes = content.slice(idOffset, idOffset + idLength);
    const decoder = new TextDecoder();
    return decoder.decode(idBytes);
  }

  /**
   * Search for a byte marker sequence within content.
   * Returns the index of the first occurrence, or -1 if not found.
   */
  private findMarker(content: Uint8Array, marker: Uint8Array): number {
    for (let i = 0; i <= content.length - marker.length; i++) {
      let found = true;
      for (let j = 0; j < marker.length; j++) {
        if (content[i + j] !== marker[j]) {
          found = false;
          break;
        }
      }
      if (found) {
        return i;
      }
    }
    return -1;
  }
}
