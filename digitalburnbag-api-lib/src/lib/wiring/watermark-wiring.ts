/**
 * Watermark wiring — applies visible/invisible watermarks into download
 * and preview flows based on file metadata and share link configuration.
 */
import { PlatformID } from '@digitaldefiance/ecies-lib';

export interface IWatermarkWiringDeps<TID extends PlatformID> {
  getFileMetadata: (fileId: TID) => Promise<{
    visibleWatermark?: boolean;
    invisibleWatermark?: boolean;
  } | null>;
  getShareLink: (
    shareLinkId: TID,
  ) => Promise<{ blockDownload?: boolean } | null>;
  applyVisibleWatermark: (
    content: Buffer,
    mimeType: string,
    accessor: { userId: TID; username: string; timestamp: Date },
  ) => Promise<Buffer>;
  applyInvisibleWatermark: (
    content: Buffer,
    mimeType: string,
    watermarkId: string,
  ) => Promise<Buffer>;
}

/**
 * Apply watermarks to file content based on metadata flags and share context.
 */
export async function applyWatermarks<TID extends PlatformID>(
  fileId: TID,
  content: Buffer,
  mimeType: string,
  accessor: { userId: TID; username: string },
  deps: IWatermarkWiringDeps<TID>,
  shareLinkId?: TID,
): Promise<Buffer> {
  let result = content;
  const metadata = await deps.getFileMetadata(fileId);
  if (!metadata) return result;

  // Apply visible watermark if file is configured for it
  // or if the share link has block_download (view-only with watermark)
  let needsVisibleWatermark = metadata.visibleWatermark === true;
  if (shareLinkId) {
    const link = await deps.getShareLink(shareLinkId);
    if (link?.blockDownload) {
      needsVisibleWatermark = true;
    }
  }

  if (needsVisibleWatermark) {
    result = await deps.applyVisibleWatermark(result, mimeType, {
      userId: accessor.userId,
      username: accessor.username,
      timestamp: new Date(),
    });
  }

  // Apply invisible watermark if configured
  if (metadata.invisibleWatermark) {
    const watermarkId = `${String(fileId)}-${String(accessor.userId)}-${Date.now()}`;
    result = await deps.applyInvisibleWatermark(result, mimeType, watermarkId);
  }

  return result;
}
