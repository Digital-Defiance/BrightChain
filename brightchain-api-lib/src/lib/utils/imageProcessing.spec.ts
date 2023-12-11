/**
 * Unit Tests for Image Processing Utilities
 *
 * Feature: brightchat-server-icon-upload
 * Tests image processing functions for server icon uploads.
 *
 * **Validates: Requirements 2.4, 2.5**
 */

import { DEFAULT_SERVER_ICON_CONFIG } from '@brightchain/brightchain-lib';
import sharp from 'sharp';
import { getServerIconVaultName, processServerIcon } from './imageProcessing';

describe('Image Processing Utilities', () => {
  describe('processServerIcon', () => {
    /**
     * Test: PNG input produces 256×256 PNG output
     *
     * Validates: Requirement 2.4 - Image processing resizes to 256×256 and converts to PNG
     */
    it('should produce 256×256 PNG from PNG input', async () => {
      // Create a test PNG image (512×512)
      const inputBuffer = await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await processServerIcon(inputBuffer);

      // Verify output is a Buffer
      expect(Buffer.isBuffer(result)).toBe(true);

      // Verify output dimensions and format
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(DEFAULT_SERVER_ICON_CONFIG.outputSizePx);
      expect(metadata.height).toBe(DEFAULT_SERVER_ICON_CONFIG.outputSizePx);
      expect(metadata.format).toBe('png');
    });

    /**
     * Test: JPEG input produces 256×256 PNG output
     *
     * Validates: Requirement 2.4 - Image processing handles JPEG input
     */
    it('should produce 256×256 PNG from JPEG input', async () => {
      // Create a test JPEG image (1024×768)
      const inputBuffer = await sharp({
        create: {
          width: 1024,
          height: 768,
          channels: 3,
          background: { r: 0, g: 255, b: 0 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await processServerIcon(inputBuffer);

      // Verify output dimensions and format
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
      expect(metadata.format).toBe('png');
    });

    /**
     * Test: WebP input produces 256×256 PNG output
     *
     * Validates: Requirement 2.4 - Image processing handles WebP input
     */
    it('should produce 256×256 PNG from WebP input', async () => {
      // Create a test WebP image (800×600)
      const inputBuffer = await sharp({
        create: {
          width: 800,
          height: 600,
          channels: 4,
          background: { r: 0, g: 0, b: 255, alpha: 1 },
        },
      })
        .webp()
        .toBuffer();

      const result = await processServerIcon(inputBuffer);

      // Verify output dimensions and format
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
      expect(metadata.format).toBe('png');
    });

    /**
     * Test: Landscape (non-square) input produces square 256×256 output
     *
     * Validates: Requirement 2.4 - Image processing handles non-square inputs with cover-fit
     */
    it('should handle landscape (non-square) input with cover-fit', async () => {
      // Create a landscape image (1920×1080)
      const inputBuffer = await sharp({
        create: {
          width: 1920,
          height: 1080,
          channels: 3,
          background: { r: 128, g: 128, b: 128 },
        },
      })
        .png()
        .toBuffer();

      const result = await processServerIcon(inputBuffer);

      // Verify output is square
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
      expect(metadata.format).toBe('png');
    });

    /**
     * Test: Portrait (non-square) input produces square 256×256 output
     *
     * Validates: Requirement 2.4 - Image processing handles non-square inputs with cover-fit
     */
    it('should handle portrait (non-square) input with cover-fit', async () => {
      // Create a portrait image (1080×1920)
      const inputBuffer = await sharp({
        create: {
          width: 1080,
          height: 1920,
          channels: 3,
          background: { r: 200, g: 100, b: 50 },
        },
      })
        .png()
        .toBuffer();

      const result = await processServerIcon(inputBuffer);

      // Verify output is square
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
      expect(metadata.format).toBe('png');
    });

    /**
     * Test: Small input is upscaled to 256×256
     *
     * Validates: Requirement 2.4 - Image processing handles images smaller than target size
     */
    it('should upscale small images to 256×256', async () => {
      // Create a small image (64×64)
      const inputBuffer = await sharp({
        create: {
          width: 64,
          height: 64,
          channels: 4,
          background: { r: 255, g: 255, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const result = await processServerIcon(inputBuffer);

      // Verify output is upscaled to 256×256
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
      expect(metadata.format).toBe('png');
    });

    /**
     * Test: Large input is downscaled to 256×256
     *
     * Validates: Requirement 2.4 - Image processing handles images larger than target size
     */
    it('should downscale large images to 256×256', async () => {
      // Create a large image (4096×4096)
      const inputBuffer = await sharp({
        create: {
          width: 4096,
          height: 4096,
          channels: 3,
          background: { r: 50, g: 150, b: 250 },
        },
      })
        .png()
        .toBuffer();

      const result = await processServerIcon(inputBuffer);

      // Verify output is downscaled to 256×256
      const metadata = await sharp(result).metadata();
      expect(metadata.width).toBe(256);
      expect(metadata.height).toBe(256);
      expect(metadata.format).toBe('png');
    });

    /**
     * Test: Output has no EXIF metadata
     *
     * Validates: Requirement 2.4 - Image processing strips EXIF metadata for privacy
     */
    it('should strip EXIF metadata from output', async () => {
      // Create an image with EXIF data
      const inputBuffer = await sharp({
        create: {
          width: 512,
          height: 512,
          channels: 3,
          background: { r: 100, g: 100, b: 100 },
        },
      })
        .jpeg()
        .toBuffer();

      const result = await processServerIcon(inputBuffer);

      // Verify no EXIF data in output
      const metadata = await sharp(result).metadata();
      expect(metadata.exif).toBeUndefined();
      expect(metadata.xmp).toBeUndefined();
      expect(metadata.iptc).toBeUndefined();
    });

    /**
     * Test: Invalid input throws error
     *
     * Validates: Error handling for invalid image data
     */
    it('should throw error for invalid image data', async () => {
      const invalidBuffer = Buffer.from('not an image');

      await expect(processServerIcon(invalidBuffer)).rejects.toThrow();
    });

    /**
     * Test: Empty buffer throws error
     *
     * Validates: Error handling for empty input
     */
    it('should throw error for empty buffer', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(processServerIcon(emptyBuffer)).rejects.toThrow();
    });
  });

  describe('getServerIconVaultName', () => {
    /**
     * Test: Vault name follows naming convention
     *
     * Validates: Requirement 2.5 - Vault container naming convention
     */
    it('should return vault name following brightchat-server-{serverId}-assets pattern', () => {
      const serverId = 'abc123';
      const vaultName = getServerIconVaultName(serverId);

      expect(vaultName).toBe('brightchat-server-abc123-assets');
    });

    /**
     * Test: Vault name with UUID serverId
     *
     * Validates: Requirement 2.5 - Vault container naming with UUID
     */
    it('should handle UUID serverId', () => {
      const serverId = '550e8400-e29b-41d4-a716-446655440000';
      const vaultName = getServerIconVaultName(serverId);

      expect(vaultName).toBe(
        'brightchat-server-550e8400-e29b-41d4-a716-446655440000-assets',
      );
    });

    /**
     * Test: Vault name with numeric serverId
     *
     * Validates: Requirement 2.5 - Vault container naming with numeric ID
     */
    it('should handle numeric serverId', () => {
      const serverId = '12345';
      const vaultName = getServerIconVaultName(serverId);

      expect(vaultName).toBe('brightchat-server-12345-assets');
    });

    /**
     * Test: Vault name with alphanumeric serverId
     *
     * Validates: Requirement 2.5 - Vault container naming with alphanumeric ID
     */
    it('should handle alphanumeric serverId', () => {
      const serverId = 'server-abc-123-xyz';
      const vaultName = getServerIconVaultName(serverId);

      expect(vaultName).toBe('brightchat-server-server-abc-123-xyz-assets');
    });

    /**
     * Test: Vault name with single character serverId
     *
     * Validates: Requirement 2.5 - Vault container naming with minimal ID
     */
    it('should handle single character serverId', () => {
      const serverId = 'a';
      const vaultName = getServerIconVaultName(serverId);

      expect(vaultName).toBe('brightchat-server-a-assets');
    });
  });
});
