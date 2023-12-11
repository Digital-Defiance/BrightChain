/**
 * Property-Based Tests for Image Processing
 *
 * Feature: brightchat-server-icon-upload
 * Property 9: Processed image dimensions
 * Property 10: Vault container naming convention
 *
 * **Validates: Requirements 2.4, 2.5**
 *
 * Property 9: For any valid image buffer (any dimensions, any supported format),
 * the processed output SHALL be exactly 256×256 pixels in PNG format.
 *
 * Property 10: For any serverId string, the vault container name SHALL equal
 * `brightchat-server-${serverId}-assets`.
 */

import { DEFAULT_SERVER_ICON_CONFIG } from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import sharp from 'sharp';
import { getServerIconVaultName, processServerIcon } from './imageProcessing';

// Arbitrary for generating valid image dimensions (1-4096 pixels)
const imageDimensionArb = fc.integer({ min: 1, max: 4096 });

// Arbitrary for generating RGB color values (0-255)
const colorChannelArb = fc.integer({ min: 0, max: 255 });

// Arbitrary for generating RGB colors
const rgbColorArb = fc.record({
  r: colorChannelArb,
  g: colorChannelArb,
  b: colorChannelArb,
});

// Arbitrary for generating RGBA colors
const rgbaColorArb = fc.record({
  r: colorChannelArb,
  g: colorChannelArb,
  b: colorChannelArb,
  alpha: fc.double({ min: 0, max: 1 }),
});

// Arbitrary for generating image formats
const imageFormatArb = fc.constantFrom('png', 'jpeg', 'webp');

// Arbitrary for generating server IDs (alphanumeric with hyphens)
const serverIdArb = fc.stringMatching(
  /^[a-zA-Z0-9][a-zA-Z0-9-]{0,98}[a-zA-Z0-9]$/,
);

// Arbitrary for generating UUID v4 strings
const uuidV4Arb = fc.uuid();

describe('Image Processing Property Tests', () => {
  describe('Property 9: Processed image dimensions', () => {
    /**
     * Property 9a: Any valid square image produces 256×256 PNG output
     *
     * For any square image (width === height) with any valid dimensions,
     * the processed output SHALL be exactly 256×256 pixels in PNG format.
     */
    it('Property 9a: Any valid square image produces 256×256 PNG output', async () => {
      await fc.assert(
        fc.asyncProperty(
          imageDimensionArb,
          rgbColorArb,
          imageFormatArb,
          async (dimension, color, format) => {
            // Feature: brightchat-server-icon-upload, Property 9: Processed image dimensions
            // Create a square test image with the given dimensions and format
            const inputBuffer = await sharp({
              create: {
                width: dimension,
                height: dimension,
                channels: 3,
                background: color,
              },
            })
              [format]()
              .toBuffer();

            const result = await processServerIcon(inputBuffer);

            // Verify output dimensions are exactly 256×256
            const metadata = await sharp(result).metadata();
            expect(metadata.width).toBe(
              DEFAULT_SERVER_ICON_CONFIG.outputSizePx,
            );
            expect(metadata.height).toBe(
              DEFAULT_SERVER_ICON_CONFIG.outputSizePx,
            );

            // Verify output format is PNG
            expect(metadata.format).toBe('png');

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 9b: Any valid landscape image produces 256×256 PNG output
     *
     * For any landscape image (width > height) with any valid dimensions,
     * the processed output SHALL be exactly 256×256 pixels in PNG format.
     */
    it('Property 9b: Any valid landscape image produces 256×256 PNG output', async () => {
      await fc.assert(
        fc.asyncProperty(
          imageDimensionArb,
          imageDimensionArb,
          rgbColorArb,
          imageFormatArb,
          async (width, height, color, format) => {
            // Ensure width > height for landscape
            const landscapeWidth = Math.max(width, height);
            const landscapeHeight = Math.min(width, height);

            // Skip if dimensions are equal (not landscape)
            fc.pre(landscapeWidth > landscapeHeight);

            // Feature: brightchat-server-icon-upload, Property 9: Processed image dimensions
            const inputBuffer = await sharp({
              create: {
                width: landscapeWidth,
                height: landscapeHeight,
                channels: 3,
                background: color,
              },
            })
              [format]()
              .toBuffer();

            const result = await processServerIcon(inputBuffer);

            // Verify output dimensions are exactly 256×256
            const metadata = await sharp(result).metadata();
            expect(metadata.width).toBe(256);
            expect(metadata.height).toBe(256);
            expect(metadata.format).toBe('png');

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 9c: Any valid portrait image produces 256×256 PNG output
     *
     * For any portrait image (height > width) with any valid dimensions,
     * the processed output SHALL be exactly 256×256 pixels in PNG format.
     */
    it('Property 9c: Any valid portrait image produces 256×256 PNG output', async () => {
      await fc.assert(
        fc.asyncProperty(
          imageDimensionArb,
          imageDimensionArb,
          rgbColorArb,
          imageFormatArb,
          async (width, height, color, format) => {
            // Ensure height > width for portrait
            const portraitWidth = Math.min(width, height);
            const portraitHeight = Math.max(width, height);

            // Skip if dimensions are equal (not portrait)
            fc.pre(portraitHeight > portraitWidth);

            // Feature: brightchat-server-icon-upload, Property 9: Processed image dimensions
            const inputBuffer = await sharp({
              create: {
                width: portraitWidth,
                height: portraitHeight,
                channels: 3,
                background: color,
              },
            })
              [format]()
              .toBuffer();

            const result = await processServerIcon(inputBuffer);

            // Verify output dimensions are exactly 256×256
            const metadata = await sharp(result).metadata();
            expect(metadata.width).toBe(256);
            expect(metadata.height).toBe(256);
            expect(metadata.format).toBe('png');

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 9d: PNG with alpha channel produces 256×256 PNG output
     *
     * For any PNG image with alpha channel (RGBA), the processed output
     * SHALL be exactly 256×256 pixels in PNG format.
     */
    it('Property 9d: PNG with alpha channel produces 256×256 PNG output', async () => {
      await fc.assert(
        fc.asyncProperty(
          imageDimensionArb,
          imageDimensionArb,
          rgbaColorArb,
          async (width, height, color) => {
            // Feature: brightchat-server-icon-upload, Property 9: Processed image dimensions
            const inputBuffer = await sharp({
              create: {
                width,
                height,
                channels: 4,
                background: color,
              },
            })
              .png()
              .toBuffer();

            const result = await processServerIcon(inputBuffer);

            // Verify output dimensions are exactly 256×256
            const metadata = await sharp(result).metadata();
            expect(metadata.width).toBe(256);
            expect(metadata.height).toBe(256);
            expect(metadata.format).toBe('png');

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 9e: Output is always a valid PNG buffer
     *
     * For any valid input image, the processed output SHALL be a valid
     * Buffer that can be parsed as a PNG image.
     */
    it('Property 9e: Output is always a valid PNG buffer', async () => {
      await fc.assert(
        fc.asyncProperty(
          imageDimensionArb,
          imageDimensionArb,
          rgbColorArb,
          imageFormatArb,
          async (width, height, color, format) => {
            // Feature: brightchat-server-icon-upload, Property 9: Processed image dimensions
            const inputBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: color,
              },
            })
              [format]()
              .toBuffer();

            const result = await processServerIcon(inputBuffer);

            // Verify result is a Buffer
            expect(Buffer.isBuffer(result)).toBe(true);

            // Verify result can be parsed as a valid image
            const metadata = await sharp(result).metadata();
            expect(metadata).toBeDefined();
            expect(metadata.format).toBe('png');

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 9f: Output has no EXIF metadata
     *
     * For any valid input image, the processed output SHALL have no
     * EXIF, XMP, or IPTC metadata (privacy requirement).
     */
    it('Property 9f: Output has no EXIF metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          imageDimensionArb,
          imageDimensionArb,
          rgbColorArb,
          imageFormatArb,
          async (width, height, color, format) => {
            // Feature: brightchat-server-icon-upload, Property 9: Processed image dimensions
            const inputBuffer = await sharp({
              create: {
                width,
                height,
                channels: 3,
                background: color,
              },
            })
              [format]()
              .toBuffer();

            const result = await processServerIcon(inputBuffer);

            // Verify no metadata in output
            const metadata = await sharp(result).metadata();
            expect(metadata.exif).toBeUndefined();
            expect(metadata.xmp).toBeUndefined();
            expect(metadata.iptc).toBeUndefined();

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 10: Vault container naming convention', () => {
    /**
     * Property 10a: Vault name always follows pattern
     *
     * For any serverId string, the vault container name SHALL equal
     * `brightchat-server-${serverId}-assets`.
     */
    it('Property 10a: Vault name always follows brightchat-server-{serverId}-assets pattern', async () => {
      await fc.assert(
        fc.asyncProperty(serverIdArb, async (serverId) => {
          // Feature: brightchat-server-icon-upload, Property 10: Vault container naming convention
          const vaultName = getServerIconVaultName(serverId);

          // Verify pattern matches
          expect(vaultName).toBe(`brightchat-server-${serverId}-assets`);

          // Verify pattern structure
          expect(vaultName).toMatch(/^brightchat-server-.+-assets$/);

          // Verify serverId is embedded correctly
          expect(vaultName).toContain(serverId);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10b: Vault name with UUID serverId
     *
     * For any UUID v4 serverId, the vault container name SHALL follow
     * the naming convention.
     */
    it('Property 10b: Vault name with UUID serverId follows pattern', async () => {
      await fc.assert(
        fc.asyncProperty(uuidV4Arb, async (serverId) => {
          // Feature: brightchat-server-icon-upload, Property 10: Vault container naming convention
          const vaultName = getServerIconVaultName(serverId);

          // Verify pattern matches
          expect(vaultName).toBe(`brightchat-server-${serverId}-assets`);

          // Verify UUID is preserved in vault name
          expect(vaultName).toContain(serverId);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10c: Vault name is deterministic
     *
     * For any serverId, calling getServerIconVaultName multiple times
     * SHALL always return the same vault name.
     */
    it('Property 10c: Vault name is deterministic for same serverId', async () => {
      await fc.assert(
        fc.asyncProperty(serverIdArb, async (serverId) => {
          // Feature: brightchat-server-icon-upload, Property 10: Vault container naming convention
          const vaultName1 = getServerIconVaultName(serverId);
          const vaultName2 = getServerIconVaultName(serverId);
          const vaultName3 = getServerIconVaultName(serverId);

          // Verify all calls return the same result
          expect(vaultName1).toBe(vaultName2);
          expect(vaultName2).toBe(vaultName3);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10d: Different serverIds produce different vault names
     *
     * For any two different serverIds, the vault container names SHALL
     * be different.
     */
    it('Property 10d: Different serverIds produce different vault names', async () => {
      await fc.assert(
        fc.asyncProperty(
          serverIdArb,
          serverIdArb,
          async (serverId1, serverId2) => {
            // Skip if serverIds are the same
            fc.pre(serverId1 !== serverId2);

            // Feature: brightchat-server-icon-upload, Property 10: Vault container naming convention
            const vaultName1 = getServerIconVaultName(serverId1);
            const vaultName2 = getServerIconVaultName(serverId2);

            // Verify vault names are different
            expect(vaultName1).not.toBe(vaultName2);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10e: Vault name always starts with prefix
     *
     * For any serverId, the vault container name SHALL always start
     * with 'brightchat-server-'.
     */
    it('Property 10e: Vault name always starts with brightchat-server- prefix', async () => {
      await fc.assert(
        fc.asyncProperty(serverIdArb, async (serverId) => {
          // Feature: brightchat-server-icon-upload, Property 10: Vault container naming convention
          const vaultName = getServerIconVaultName(serverId);

          // Verify prefix
          expect(vaultName.startsWith('brightchat-server-')).toBe(true);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10f: Vault name always ends with suffix
     *
     * For any serverId, the vault container name SHALL always end
     * with '-assets'.
     */
    it('Property 10f: Vault name always ends with -assets suffix', async () => {
      await fc.assert(
        fc.asyncProperty(serverIdArb, async (serverId) => {
          // Feature: brightchat-server-icon-upload, Property 10: Vault container naming convention
          const vaultName = getServerIconVaultName(serverId);

          // Verify suffix
          expect(vaultName.endsWith('-assets')).toBe(true);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 10g: Vault name length is predictable
     *
     * For any serverId, the vault container name length SHALL equal
     * the serverId length plus the length of the prefix and suffix.
     */
    it('Property 10g: Vault name length is predictable', async () => {
      await fc.assert(
        fc.asyncProperty(serverIdArb, async (serverId) => {
          // Feature: brightchat-server-icon-upload, Property 10: Vault container naming convention
          const vaultName = getServerIconVaultName(serverId);

          const prefix = 'brightchat-server-';
          const suffix = '-assets';
          const expectedLength =
            prefix.length + serverId.length + suffix.length;

          // Verify length
          expect(vaultName.length).toBe(expectedLength);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });
});
