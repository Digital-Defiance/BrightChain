/**
 * Property-based tests for parsePostContent inline image rendering
 *
 * Feature: brighthub-post-images, Property 4: Markdown image rendering with correct attributes
 * Validates: Requirements 3.1, 3.4, 4.3, 4.4, 9.1, 9.2
 *
 * Tests that parsePostContent() renders markdown image syntax `![alt](url)` as
 * `<img>` tags with correct `src`, `alt`, `loading="lazy"`, and `style="max-width: 100%"`.
 */
import fc from 'fast-check';
import { parsePostContent } from '../brighthub-lib';

/**
 * Generate a fixed-length lowercase hex string.
 */
const hexChars = '0123456789abcdef'.split('');
function hexStringArb(length: number) {
  return fc
    .array(fc.constantFrom(...hexChars), {
      minLength: length,
      maxLength: length,
    })
    .map((chars) => chars.join(''));
}

/**
 * Generate a valid UUID v4 string (lowercase hex, version 4, variant 8/9/a/b).
 */
const uuidV4Arb = fc
  .tuple(
    hexStringArb(8),
    hexStringArb(4),
    hexStringArb(3),
    fc.constantFrom('8', '9', 'a', 'b'),
    hexStringArb(3),
    hexStringArb(12),
  )
  .map(
    ([p1, p2, p3, variant, p4, p5]) =>
      `${p1}-${p2}-4${p3}-${variant}${p4}-${p5}`,
  );

/**
 * Generate alphanumeric alt text strings.
 * Avoids special chars that might break markdown parsing like `]`, `(`, `)`.
 */
const altTextChars =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('');
const altTextArb = fc
  .array(fc.constantFrom(...altTextChars), {
    minLength: 0,
    maxLength: 30,
  })
  .map((chars) => chars.join(''));

/**
 * Generate non-empty alphanumeric alt text strings.
 */
const nonEmptyAltTextArb = fc
  .array(fc.constantFrom(...altTextChars), {
    minLength: 1,
    maxLength: 30,
  })
  .map((chars) => chars.join(''))
  .filter((s) => s.trim().length > 0);

/**
 * Generate valid-looking image URLs:
 * - /api/post-images/{uuid} (permanent URLs)
 * - https://example.com/img.png style URLs
 */
const imageUrlArb = fc.oneof(
  uuidV4Arb.map((uuid) => `/api/post-images/${uuid}`),
  fc
    .tuple(
      fc
        .array(
          fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
          { minLength: 3, maxLength: 15 },
        )
        .map((chars) => chars.join('')),
      fc.constantFrom('.png', '.jpg', '.gif', '.webp'),
    )
    .map(([name, ext]) => `https://example.com/${name}${ext}`),
);

describe('Feature: brighthub-post-images, Property 4: Markdown image rendering with correct attributes', () => {
  /**
   * Property: For any alt text and URL, parsePostContent with isBlogPost=true
   * produces HTML containing an <img> tag with the correct src, alt,
   * loading="lazy", and style="max-width: 100%".
   *
   * **Validates: Requirements 3.1, 3.4, 4.3, 4.4, 9.1, 9.2**
   */
  it('renders markdown images with correct src, alt, loading="lazy", and style="max-width: 100%"', () => {
    fc.assert(
      fc.property(altTextArb, imageUrlArb, (altText, url) => {
        const markdown = `![${altText}](${url})`;
        const result = parsePostContent(markdown, true);

        // Should contain an <img> tag
        expect(result).toContain('<img');

        // Should have the correct src attribute
        expect(result).toContain(`src="${url}"`);

        // Should have loading="lazy"
        expect(result).toContain('loading="lazy"');

        // Should have style="max-width: 100%"
        expect(result).toContain('style="max-width: 100%"');

        // Should have an alt attribute (either with text or empty)
        expect(result).toMatch(/alt="[^"]*"/);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When alt text is empty, the alt attribute is alt="".
   *
   * **Validates: Requirements 4.3, 9.1**
   */
  it('renders alt="" when alt text is empty', () => {
    fc.assert(
      fc.property(imageUrlArb, (url) => {
        const markdown = `![](${url})`;
        const result = parsePostContent(markdown, true);

        // MarkdownIt produces alt="" for empty alt text
        expect(result).toContain('alt=""');
        expect(result).toContain(`src="${url}"`);
        expect(result).toContain('loading="lazy"');
        expect(result).toContain('style="max-width: 100%"');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When alt text is non-empty, the alt attribute contains
   * the provided text.
   *
   * **Validates: Requirements 4.4, 9.2**
   */
  it('renders the provided alt text in the alt attribute when non-empty', () => {
    fc.assert(
      fc.property(nonEmptyAltTextArb, imageUrlArb, (altText, url) => {
        const markdown = `![${altText}](${url})`;
        const result = parsePostContent(markdown, true);

        // Should contain the alt text in the alt attribute
        expect(result).toContain(`alt="${altText}"`);
        expect(result).toContain(`src="${url}"`);
        expect(result).toContain('loading="lazy"');
        expect(result).toContain('style="max-width: 100%"');
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Each attribute (loading, style) appears exactly once per img tag,
   * ensuring no duplication from the enhancement phase.
   *
   * **Validates: Requirements 3.4, 9.1, 9.2**
   */
  it('does not duplicate loading or style attributes on img tags', () => {
    fc.assert(
      fc.property(altTextArb, imageUrlArb, (altText, url) => {
        const markdown = `![${altText}](${url})`;
        const result = parsePostContent(markdown, true);

        const loadingCount = (result.match(/loading="lazy"/g) || []).length;
        const styleCount = (result.match(/style="max-width: 100%"/g) || [])
          .length;

        // Exactly one of each attribute per img tag
        expect(loadingCount).toBe(1);
        expect(styleCount).toBe(1);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Multiple images in the same content each get the correct attributes.
   *
   * **Validates: Requirements 3.1, 3.4, 9.1, 9.2**
   */
  it('renders multiple images each with correct attributes', () => {
    fc.assert(
      fc.property(
        fc.array(fc.tuple(altTextArb, imageUrlArb), {
          minLength: 2,
          maxLength: 5,
        }),
        (images) => {
          const markdown = images
            .map(([alt, url]) => `![${alt}](${url})`)
            .join('\n\n');
          const result = parsePostContent(markdown, true);

          // Each image should have its src in the output
          for (const [, url] of images) {
            expect(result).toContain(`src="${url}"`);
          }

          // Count of loading="lazy" should match number of images
          const loadingCount = (result.match(/loading="lazy"/g) || []).length;
          expect(loadingCount).toBe(images.length);

          // Count of style="max-width: 100%" should match number of images
          const styleCount = (result.match(/style="max-width: 100%"/g) || [])
            .length;
          expect(styleCount).toBe(images.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
