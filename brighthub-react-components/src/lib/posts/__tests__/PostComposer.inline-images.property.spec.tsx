/**
 * Property-based tests for PostComposer inline image features.
 *
 * Feature: brighthub-post-images
 *
 * Tests pure functions used by PostComposer for inline image manipulation:
 * - Markdown image insertion at cursor position (Property 1)
 * - Frontend image count limit enforcement (Property 2)
 * - Alt text update preserves URL and surrounding content (Property 5)
 */
import {
  countInlineImages,
  getMaxInlineImages,
} from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import { updateAltText } from '../inlineImageUtils';

// ---------------------------------------------------------------------------
// Shared arbitraries
// ---------------------------------------------------------------------------

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
 * Generate a valid UUID v4 string.
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
 * Generate a staging preview URL from a UUID v4 token.
 */
const stagingUrlArb = uuidV4Arb.map(
  (uuid) => `/api/temp-upload/${uuid}/preview`,
);

/**
 * Safe text that won't accidentally contain markdown image syntax.
 */
const safeChars =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,\n\t-_=+@#%^&*;:\'"<>'.split(
    '',
  );
const safeTextArb = fc
  .array(fc.constantFrom(...safeChars), { minLength: 0, maxLength: 80 })
  .map((chars) => chars.join(''))
  .filter((text) => !text.includes('!['));

/**
 * Alt text characters — alphanumeric + spaces, no brackets.
 */
const altTextChars =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 -_'.split('');
const altTextArb = fc
  .array(fc.constantFrom(...altTextChars), { minLength: 0, maxLength: 30 })
  .map((chars) => chars.join(''));

// ---------------------------------------------------------------------------
// Pure function: insertMarkdownAtPosition
// This mirrors the insertion logic in PostComposer (content.substring(0, pos)
// + imageMarkdown + content.substring(pos)).
// ---------------------------------------------------------------------------

function insertMarkdownAtPosition(
  content: string,
  cursorPos: number,
  imageMarkdown: string,
): string {
  const pos = Math.max(0, Math.min(cursorPos, content.length));
  return content.substring(0, pos) + imageMarkdown + content.substring(pos);
}

// ---------------------------------------------------------------------------
// Property 1: Markdown image insertion at cursor position
// ---------------------------------------------------------------------------

describe('Feature: brighthub-post-images, Property 1: Markdown image insertion at cursor position', () => {
  /**
   * Property: For any content string and valid cursor position, inserting
   * image markdown produces a string where the markdown appears at the
   * cursor position and surrounding content is unchanged.
   *
   * **Validates: Requirements 1.3, 1.4**
   */
  it('inserted markdown appears at the correct cursor position', () => {
    fc.assert(
      fc.property(safeTextArb, stagingUrlArb, (content, previewUrl) => {
        // Generate a valid cursor position within the content
        const cursorPos =
          content.length > 0
            ? Math.floor(Math.random() * (content.length + 1))
            : 0;
        const imageMarkdown = `![](${previewUrl})`;
        const result = insertMarkdownAtPosition(
          content,
          cursorPos,
          imageMarkdown,
        );

        // (a) The image markdown appears starting at cursorPos
        expect(
          result.substring(cursorPos, cursorPos + imageMarkdown.length),
        ).toBe(imageMarkdown);

        // (b) Content before cursor is unchanged
        expect(result.substring(0, cursorPos)).toBe(
          content.substring(0, cursorPos),
        );

        // (c) Content after cursor is shifted by the length of the inserted markdown
        expect(result.substring(cursorPos + imageMarkdown.length)).toBe(
          content.substring(cursorPos),
        );
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When cursor position is 0, markdown is prepended.
   *
   * **Validates: Requirements 1.3, 1.4**
   */
  it('inserts markdown at the beginning when cursor position is 0', () => {
    fc.assert(
      fc.property(safeTextArb, stagingUrlArb, (content, previewUrl) => {
        const imageMarkdown = `![](${previewUrl})`;
        const result = insertMarkdownAtPosition(content, 0, imageMarkdown);

        expect(result.startsWith(imageMarkdown)).toBe(true);
        expect(result.substring(imageMarkdown.length)).toBe(content);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When cursor position equals content.length, markdown is appended.
   *
   * **Validates: Requirements 1.3, 1.4**
   */
  it('appends markdown at the end when cursor position equals content length', () => {
    fc.assert(
      fc.property(safeTextArb, stagingUrlArb, (content, previewUrl) => {
        const imageMarkdown = `![](${previewUrl})`;
        const result = insertMarkdownAtPosition(
          content,
          content.length,
          imageMarkdown,
        );

        expect(result.endsWith(imageMarkdown)).toBe(true);
        expect(result.substring(0, content.length)).toBe(content);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The resulting string length equals original length plus
   * the inserted markdown length.
   *
   * **Validates: Requirements 1.3, 1.4**
   */
  it('result length equals original length plus markdown length', () => {
    fc.assert(
      fc.property(
        safeTextArb,
        fc.nat(),
        stagingUrlArb,
        (content, rawPos, previewUrl) => {
          const cursorPos =
            content.length > 0 ? rawPos % (content.length + 1) : 0;
          const imageMarkdown = `![](${previewUrl})`;
          const result = insertMarkdownAtPosition(
            content,
            cursorPos,
            imageMarkdown,
          );

          expect(result.length).toBe(content.length + imageMarkdown.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 2: Frontend image count limit enforcement
// ---------------------------------------------------------------------------

/**
 * Build a content string containing exactly N markdown images.
 */
function buildContentWithNImages(n: number, urls: string[]): string {
  return urls
    .slice(0, n)
    .map((url) => `![image](${url})`)
    .join('\n');
}

describe('Feature: brighthub-post-images, Property 2: Frontend image count limit enforcement', () => {
  /**
   * Property: When content contains N < 20 images, insertion is allowed
   * (countInlineImages returns N < getMaxInlineImages()).
   *
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it('allows insertion when image count is below the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: getMaxInlineImages() - 1 }),
        fc.array(stagingUrlArb, {
          minLength: getMaxInlineImages(),
          maxLength: getMaxInlineImages(),
        }),
        (n, urls) => {
          const content = buildContentWithNImages(n, urls);
          const count = countInlineImages(content);

          expect(count).toBe(n);
          expect(count < getMaxInlineImages()).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When content contains N ≥ 20 images, insertion is rejected
   * (countInlineImages returns N ≥ getMaxInlineImages()).
   *
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it('rejects insertion when image count is at or above the limit', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: getMaxInlineImages(), max: 25 }),
        fc.array(stagingUrlArb, { minLength: 26, maxLength: 26 }),
        (n, urls) => {
          const content = buildContentWithNImages(n, urls);
          const count = countInlineImages(content);

          expect(count).toBe(n);
          expect(count >= getMaxInlineImages()).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: The boundary is exactly at 20 — 19 images allows insertion,
   * 20 images rejects.
   *
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it('enforces the boundary at exactly getMaxInlineImages() (20)', () => {
    fc.assert(
      fc.property(
        fc.array(stagingUrlArb, { minLength: 21, maxLength: 21 }),
        (urls) => {
          const contentAt19 = buildContentWithNImages(19, urls);
          const contentAt20 = buildContentWithNImages(20, urls);
          const contentAt21 = buildContentWithNImages(21, urls);

          expect(countInlineImages(contentAt19) < getMaxInlineImages()).toBe(
            true,
          );
          expect(countInlineImages(contentAt20) >= getMaxInlineImages()).toBe(
            true,
          );
          expect(countInlineImages(contentAt21) >= getMaxInlineImages()).toBe(
            true,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: countInlineImages accurately counts the number of markdown
   * image entries regardless of surrounding text.
   *
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it('countInlineImages accurately counts images mixed with text', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 25 }),
        fc.array(stagingUrlArb, { minLength: 26, maxLength: 26 }),
        safeTextArb,
        (n, urls, filler) => {
          const images = urls.slice(0, n).map((url) => `![img](${url})`);
          const content = images.join(`\n${filler}\n`);
          expect(countInlineImages(content)).toBe(n);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property 5: Alt text update preserves URL and surrounding content
// ---------------------------------------------------------------------------

describe('Feature: brighthub-post-images, Property 5: Alt text update preserves URL and surrounding content', () => {
  /**
   * Property: After updating alt text, the image URL is unchanged.
   *
   * **Validates: Requirements 4.2**
   */
  it('preserves the image URL after alt text update', () => {
    fc.assert(
      fc.property(
        safeTextArb,
        altTextArb,
        stagingUrlArb,
        altTextArb,
        safeTextArb,
        (before, oldAlt, url, newAlt, after) => {
          const content = `${before}![${oldAlt}](${url})${after}`;
          const result = updateAltText(content, url, newAlt);

          // The URL should still be present in the result
          expect(result).toContain(`](${url})`);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: After updating alt text, the new alt text appears in the
   * image markdown.
   *
   * **Validates: Requirements 4.2**
   */
  it('replaces the alt text with the new value', () => {
    fc.assert(
      fc.property(
        safeTextArb,
        altTextArb,
        stagingUrlArb,
        altTextArb,
        safeTextArb,
        (before, oldAlt, url, newAlt, after) => {
          const content = `${before}![${oldAlt}](${url})${after}`;
          const result = updateAltText(content, url, newAlt);

          // The result should contain the new alt text in the image markdown
          expect(result).toContain(`![${newAlt}](${url})`);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Content before the image markdown is unchanged after alt
   * text update.
   *
   * **Validates: Requirements 4.2**
   */
  it('preserves content before the image markdown', () => {
    fc.assert(
      fc.property(
        safeTextArb,
        altTextArb,
        stagingUrlArb,
        altTextArb,
        safeTextArb,
        (before, oldAlt, url, newAlt, after) => {
          const imageMarkdown = `![${oldAlt}](${url})`;
          const content = `${before}${imageMarkdown}${after}`;
          const result = updateAltText(content, url, newAlt);

          // Content before the image should be unchanged
          const imageIndex = result.indexOf(`![${newAlt}](${url})`);
          expect(result.substring(0, imageIndex)).toBe(before);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Content after the image markdown is unchanged after alt
   * text update.
   *
   * **Validates: Requirements 4.2**
   */
  it('preserves content after the image markdown', () => {
    fc.assert(
      fc.property(
        safeTextArb,
        altTextArb,
        stagingUrlArb,
        altTextArb,
        safeTextArb,
        (before, oldAlt, url, newAlt, after) => {
          const imageMarkdown = `![${oldAlt}](${url})`;
          const content = `${before}${imageMarkdown}${after}`;
          const result = updateAltText(content, url, newAlt);

          // Content after the image should be unchanged
          const newImageMarkdown = `![${newAlt}](${url})`;
          const imageIndex = result.indexOf(newImageMarkdown);
          expect(result.substring(imageIndex + newImageMarkdown.length)).toBe(
            after,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Only the first occurrence of the image with the matching URL
   * has its alt text updated; subsequent occurrences are unchanged.
   *
   * **Validates: Requirements 4.2**
   */
  it('updates only the first occurrence when multiple images share the same URL', () => {
    fc.assert(
      fc.property(
        altTextArb,
        altTextArb,
        stagingUrlArb,
        altTextArb,
        (oldAlt1, oldAlt2, url, newAlt) => {
          const content = `![${oldAlt1}](${url}) text ![${oldAlt2}](${url})`;
          const result = updateAltText(content, url, newAlt);

          // First occurrence should have new alt text
          const firstIdx = result.indexOf(`![${newAlt}](${url})`);
          expect(firstIdx).toBeGreaterThanOrEqual(0);

          // Second occurrence should retain its original alt text
          const afterFirst = result.substring(
            firstIdx + `![${newAlt}](${url})`.length,
          );
          expect(afterFirst).toContain(`![${oldAlt2}](${url})`);
        },
      ),
      { numRuns: 100 },
    );
  });
});
