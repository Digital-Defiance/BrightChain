/**
 * Unit Tests for Staging Image Processor
 *
 * Feature: temp-upload-staging
 * Tests specific dimension/format combinations, corrupt input handling,
 * and isSupportedImageType for each supported and non-image type.
 *
 * **Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.5, 6.6**
 */

import { describe, expect, it } from '@jest/globals';
import sharp from 'sharp';
import { isSupportedImageType, processImage } from '../stagingImageProcessor';

/**
 * Helper: create a solid-color test image buffer.
 */
async function createTestImage(
  width: number,
  height: number,
  format: 'png' | 'jpeg' | 'webp' = 'png',
): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  })
    [format]()
    .toBuffer();
}

describe('stagingImageProcessor', () => {
  describe('processImage', () => {
    it('should resize to 256×256 PNG', async () => {
      const input = await createTestImage(512, 512);
      const result = await processImage(input, {
        width: 256,
        height: 256,
        format: 'png',
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
      expect(metadata.format).toBe('png');
      expect(result.mimeType).toBe('image/png');
    });

    it('should resize to 800×600 JPEG', async () => {
      const input = await createTestImage(1920, 1080);
      const result = await processImage(input, {
        width: 800,
        height: 600,
        format: 'jpeg',
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBe(800);
      expect(metadata.height).toBe(600);
      expect(metadata.format).toBe('jpeg');
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should resize to 400×400 WebP', async () => {
      const input = await createTestImage(1024, 768);
      const result = await processImage(input, {
        width: 400,
        height: 400,
        format: 'webp',
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBe(400);
      expect(metadata.height).toBe(400);
      expect(metadata.format).toBe('webp');
      expect(result.mimeType).toBe('image/webp');
    });

    it('should convert JPEG input to PNG output', async () => {
      const input = await createTestImage(300, 300, 'jpeg');
      const result = await processImage(input, {
        width: 128,
        height: 128,
        format: 'png',
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.format).toBe('png');
      expect(result.mimeType).toBe('image/png');
    });

    it('should convert WebP input to JPEG output', async () => {
      const input = await createTestImage(500, 500, 'webp');
      const result = await processImage(input, {
        width: 200,
        height: 200,
        format: 'jpeg',
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.format).toBe('jpeg');
      expect(result.mimeType).toBe('image/jpeg');
    });

    it('should default to PNG when no format is specified', async () => {
      const input = await createTestImage(300, 300);
      const result = await processImage(input, {
        width: 100,
        height: 100,
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.format).toBe('png');
      expect(result.mimeType).toBe('image/png');
    });

    it('should strip EXIF metadata by default', async () => {
      const input = await createTestImage(256, 256, 'jpeg');
      const result = await processImage(input, {
        width: 128,
        height: 128,
        format: 'jpeg',
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.iptc).toBeUndefined();
    });

    it('should strip EXIF metadata when stripExif is true', async () => {
      const input = await createTestImage(256, 256, 'jpeg');
      const result = await processImage(input, {
        width: 128,
        height: 128,
        format: 'png',
        stripExif: true,
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.exif).toBeUndefined();
    });

    it('should handle resize with only width specified', async () => {
      const input = await createTestImage(800, 600);
      const result = await processImage(input, {
        width: 400,
        format: 'png',
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.width).toBe(400);
      // Height is auto-calculated by sharp with cover fit
      expect(metadata.height).toBeDefined();
    });

    it('should handle resize with only height specified', async () => {
      const input = await createTestImage(800, 600);
      const result = await processImage(input, {
        height: 300,
        format: 'png',
      });

      const metadata = await sharp(result.buffer).metadata();
      expect(metadata.height).toBe(300);
      // Width is auto-calculated by sharp with cover fit
      expect(metadata.width).toBeDefined();
    });

    it('should process without resize when no dimensions specified', async () => {
      const input = await createTestImage(200, 150);
      const result = await processImage(input, {
        format: 'webp',
      });

      const metadata = await sharp(result.buffer).metadata();
      // Dimensions should remain the same as input
      expect(metadata.width).toBe(200);
      expect(metadata.height).toBe(150);
      expect(metadata.format).toBe('webp');
      expect(result.mimeType).toBe('image/webp');
    });

    it('should throw for corrupt image data', async () => {
      const corruptBuffer = Buffer.from('this is not an image at all');

      await expect(
        processImage(corruptBuffer, { width: 100, height: 100, format: 'png' }),
      ).rejects.toThrow();
    });

    it('should throw for empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(
        processImage(emptyBuffer, { width: 100, height: 100, format: 'png' }),
      ).rejects.toThrow();
    });

    it('should return a valid Buffer', async () => {
      const input = await createTestImage(256, 256);
      const result = await processImage(input, {
        width: 64,
        height: 64,
        format: 'png',
      });

      expect(Buffer.isBuffer(result.buffer)).toBe(true);
      expect(result.buffer.length).toBeGreaterThan(0);
    });
  });

  describe('isSupportedImageType', () => {
    it('should return true for image/png', () => {
      expect(isSupportedImageType('image/png')).toBe(true);
    });

    it('should return true for image/jpeg', () => {
      expect(isSupportedImageType('image/jpeg')).toBe(true);
    });

    it('should return true for image/gif', () => {
      expect(isSupportedImageType('image/gif')).toBe(true);
    });

    it('should return true for image/webp', () => {
      expect(isSupportedImageType('image/webp')).toBe(true);
    });

    it('should return false for application/pdf', () => {
      expect(isSupportedImageType('application/pdf')).toBe(false);
    });

    it('should return false for text/plain', () => {
      expect(isSupportedImageType('text/plain')).toBe(false);
    });

    it('should return false for application/json', () => {
      expect(isSupportedImageType('application/json')).toBe(false);
    });

    it('should return false for video/mp4', () => {
      expect(isSupportedImageType('video/mp4')).toBe(false);
    });

    it('should return false for audio/mpeg', () => {
      expect(isSupportedImageType('audio/mpeg')).toBe(false);
    });

    it('should return false for application/octet-stream', () => {
      expect(isSupportedImageType('application/octet-stream')).toBe(false);
    });

    it('should return false for image/svg+xml (not in supported list)', () => {
      expect(isSupportedImageType('image/svg+xml')).toBe(false);
    });

    it('should return false for image/tiff (not in supported list)', () => {
      expect(isSupportedImageType('image/tiff')).toBe(false);
    });

    it('should return false for image/bmp (not in supported list)', () => {
      expect(isSupportedImageType('image/bmp')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isSupportedImageType('')).toBe(false);
    });
  });
});
