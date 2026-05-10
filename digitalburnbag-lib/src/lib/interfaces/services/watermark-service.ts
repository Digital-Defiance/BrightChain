import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IWatermarkIdentity } from '../params/watermark-params';

/**
 * Service interface for document watermarking operations.
 * Supports visible watermarks (overlay accessor identity), invisible
 * steganographic identifiers, and extraction for leak tracing.
 */
export interface IWatermarkService<TID extends PlatformID> {
  /** Apply visible watermark to document bytes (overlay accessor username + timestamp) */
  applyVisibleWatermark(
    content: Uint8Array,
    mimeType: string,
    accessor: IWatermarkIdentity<TID>,
  ): Promise<Uint8Array>;

  /** Embed steganographic identifier in document content */
  applyInvisibleWatermark(
    content: Uint8Array,
    mimeType: string,
    watermarkId: string,
  ): Promise<Uint8Array>;

  /** Extract steganographic identifier from a document for leak tracing */
  extractWatermark(
    content: Uint8Array,
    mimeType: string,
  ): Promise<string | null>;
}
