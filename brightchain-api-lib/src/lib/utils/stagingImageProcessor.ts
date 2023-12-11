/**
 * Image processing utilities for the temporary upload staging system.
 *
 * Provides format-aware image transformation (resize, format conversion,
 * EXIF stripping) applied at commit time. Processing is deferred to commit
 * so the same staged file can be committed with different transformations.
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */

import { IProcessingParams } from '@brightchain/brightchain-lib';
import sharp from 'sharp';

/** MIME types accepted for image processing at commit time. */
const SUPPORTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
];

/**
 * Check whether a MIME type is a supported image type for processing.
 *
 * @param mimeType - The MIME type string to check
 * @returns `true` if the MIME type is in the supported list
 */
export function isSupportedImageType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType);
}

/**
 * Process an image buffer according to the given parameters.
 *
 * - Resizes to the requested width/height (cover-fit, centre gravity)
 * - Converts to the requested format (defaults to PNG)
 * - Strips EXIF/XMP/IPTC metadata unless `stripExif` is explicitly `false`
 *
 * @param buffer - The raw image buffer to process
 * @param params - Processing parameters (width, height, format, stripExif)
 * @returns Processed image buffer and its MIME type
 */
export async function processImage(
  buffer: Buffer,
  params: IProcessingParams,
): Promise<{ buffer: Buffer; mimeType: string }> {
  let pipeline = sharp(buffer);

  if (params.width || params.height) {
    pipeline = pipeline.resize(params.width, params.height, {
      fit: 'cover',
      position: 'centre',
    });
  }

  const format = params.format ?? 'png';
  switch (format) {
    case 'png':
      pipeline = pipeline.png({ quality: 90 });
      break;
    case 'jpeg':
      pipeline = pipeline.jpeg({ quality: 85 });
      break;
    case 'webp':
      pipeline = pipeline.webp({ quality: 85 });
      break;
  }

  // sharp strips EXIF by default; this is explicit for clarity
  if (params.stripExif !== false) {
    pipeline = pipeline.rotate(); // auto-rotate based on EXIF, then strip
  }

  const outputBuffer = await pipeline.toBuffer();
  return {
    buffer: outputBuffer,
    mimeType: `image/${format}`,
  };
}
