/**
 * Image processing utilities for server icon uploads.
 *
 * Uses sharp to resize, convert, and strip EXIF metadata from uploaded images.
 *
 * Requirements: 2.4, 2.5
 */

import sharp from 'sharp';

/** Default icon output size in pixels (256×256 square). */
const ICON_OUTPUT_SIZE_PX = 256;

/**
 * Process an uploaded server icon image.
 *
 * - Resizes to 256×256 pixels (square, cover-fit, center gravity)
 * - Converts to PNG format
 * - Strips EXIF metadata for privacy
 *
 * @param buffer - The raw image buffer from the upload
 * @returns Processed PNG image buffer
 */
export async function processServerIcon(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(ICON_OUTPUT_SIZE_PX, ICON_OUTPUT_SIZE_PX, {
      fit: 'cover',
      position: 'centre',
    })
    .png({ quality: 90 })
    .toBuffer();
}

/**
 * Get the vault container name for a server's assets.
 *
 * Convention: `brightchat-server-{serverId}-assets`
 *
 * @param serverId - The server's unique identifier
 * @returns Vault container name
 */
export function getServerIconVaultName(serverId: string): string {
  return `brightchat-server-${serverId}-assets`;
}
