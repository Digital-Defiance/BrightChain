/**
 * Property-Based Tests for Staging Image Processor
 *
 * Feature: temp-upload-staging
 * Property 8: Image processing produces correct output
 * Property 9: Processing rejected for non-image MIME types
 *
 * Uses fast-check to verify universal properties across many inputs.
 */

import { IProcessingParams } from '@brightchain/brightchain-lib';
import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import sharp from 'sharp';
import { isSupportedImageType, processImage } from '../stagingImageProcessor';

// --- Arbitraries ---

/** Valid image dimensions (1–2048 pixels) */
const dimensionArb = fc.integer({ min: 1, max: 2048 });

/** Output formats supported by IProcessingParams */
const formatArb = fc.constantFrom<'png' | 'jpeg' | 'webp'>(
  'png',
  'jpeg',
  'webp',
);

/** RGB color for generating test images */
const rgbColorArb = fc.record({
  r: fc.integer({ min: 0, max: 255 }),
  g: fc.integer({ min: 0, max: 255 }),
  b: fc.integer({ min: 0, max: 255 }),
});

/**
 * Generate a valid test image buffer using sharp.
 * Creates a solid-color image of the given dimensions.
 */
async function createTestImage(
  width: number,
  height: number,
  color: { r: number; g: number; b: number },
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: color,
    },
  })
    .png()
    .toBuffer();
}

describe('Staging Image Processor Property Tests', () => {
  /**
   * Property 8: Image processing produces correct output
   *
   * For any valid image buffer and any IProcessingParams specifying width,
   * height, format, and/or stripExif, the processed output SHALL have
   * dimensions matching the requested width and height (when specified),
   * format matching the requested format, and no EXIF/XMP/IPTC metadata
   * when stripExif is true.
   *
   * **Validates: Requirements 6.1, 6.2, 6.3**
   */
  describe('Property 8: Image processing produces correct output', () => {
    it('output dimensions match requested width/height and format matches requested format', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Source image dimensions
          dimensionArb,
          dimensionArb,
          rgbColorArb,
          // Target processing params
          dimensionArb,
          dimensionArb,
          formatArb,
          async (
            srcWidth,
            srcHeight,
            color,
            targetWidth,
            targetHeight,
            targetFormat,
          ) => {
            const inputBuffer = await createTestImage(
              srcWidth,
              srcHeight,
              color,
            );

            const params: IProcessingParams = {
              width: targetWidth,
              height: targetHeight,
              format: targetFormat,
            };

            const result = await processImage(inputBuffer, params);

            // Verify output dimensions match requested
            const metadata = await sharp(result.buffer).metadata();
            expect(metadata.width).toBe(targetWidth);
            expect(metadata.height).toBe(targetHeight);

            // Verify output format matches requested
            expect(metadata.format).toBe(targetFormat);

            // Verify returned mimeType matches
            expect(result.mimeType).toBe(`image/${targetFormat}`);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('output format defaults to PNG when no format specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          dimensionArb,
          dimensionArb,
          rgbColorArb,
          dimensionArb,
          dimensionArb,
          async (srcWidth, srcHeight, color, targetWidth, targetHeight) => {
            const inputBuffer = await createTestImage(
              srcWidth,
              srcHeight,
              color,
            );

            const params: IProcessingParams = {
              width: targetWidth,
              height: targetHeight,
              // no format specified — should default to png
            };

            const result = await processImage(inputBuffer, params);

            const metadata = await sharp(result.buffer).metadata();
            expect(metadata.format).toBe('png');
            expect(result.mimeType).toBe('image/png');
          },
        ),
        { numRuns: 100 },
      );
    });

    it('EXIF metadata is stripped when stripExif is true or unset', async () => {
      await fc.assert(
        fc.asyncProperty(
          dimensionArb,
          dimensionArb,
          rgbColorArb,
          formatArb,
          fc.constantFrom(true, undefined),
          async (srcWidth, srcHeight, color, targetFormat, stripExif) => {
            const inputBuffer = await createTestImage(
              srcWidth,
              srcHeight,
              color,
            );

            const params: IProcessingParams = {
              width: 128,
              height: 128,
              format: targetFormat,
              stripExif,
            };

            const result = await processImage(inputBuffer, params);

            const metadata = await sharp(result.buffer).metadata();
            expect(metadata.exif).toBeUndefined();
            expect(metadata.xmp).toBeUndefined();
            expect(metadata.iptc).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * Property 9: Processing rejected for non-image MIME types
   *
   * For any staged file whose MIME type is not in
   * ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
   * isSupportedImageType() SHALL return false.
   *
   * **Validates: Requirements 6.4**
   */
  describe('Property 9: Processing rejected for non-image MIME types', () => {
    it('isSupportedImageType returns false for arbitrary non-image MIME types', async () => {
      // Generate MIME types that are NOT in the supported list
      const nonImageMimeArb = fc
        .tuple(
          fc
            .stringMatching(/^[a-z]+$/)
            .filter((s) => s.length > 0 && s.length <= 20),
          fc
            .stringMatching(/^[a-z0-9.+-]+$/)
            .filter((s) => s.length > 0 && s.length <= 40),
        )
        .map(([type, subtype]) => `${type}/${subtype}`)
        .filter(
          (mime) =>
            !['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(
              mime,
            ),
        );

      await fc.assert(
        fc.property(nonImageMimeArb, (mimeType) => {
          expect(isSupportedImageType(mimeType)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('isSupportedImageType returns true for all supported image types', () => {
      const supportedTypes = [
        'image/png',
        'image/jpeg',
        'image/gif',
        'image/webp',
      ];
      for (const mimeType of supportedTypes) {
        expect(isSupportedImageType(mimeType)).toBe(true);
      }
    });
  });
});
