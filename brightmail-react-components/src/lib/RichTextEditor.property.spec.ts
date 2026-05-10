// Feature: brightmail-composer-enhancements, Property 8: HTML sanitization removes unsafe content

/**
 * Property-based test for HTML sanitization.
 *
 * Validates: Requirements 4.5
 *
 * Property 8: For any HTML string, after sanitization the output SHALL
 * contain no <script> tags, no javascript: URI schemes, and no inline
 * event handler attributes (e.g., onclick, onerror, onload, onmouseover).
 *
 * This is a pure logic test — no React rendering needed. We test the
 * exported sanitizeHtml function directly.
 */

import fc from 'fast-check';
import { extractPlainText, sanitizeHtml } from './RichTextEditor';

describe('Feature: brightmail-composer-enhancements, Property 8: HTML sanitization removes unsafe content', () => {
  /**
   * **Validates: Requirements 4.5**
   *
   * Generates arbitrary strings with injected <script> tags and verifies
   * the sanitized output contains no <script> tags.
   */
  it('removes <script> tags from any input', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(fc.string(), fc.string(), fc.string())
          .map(
            ([before, payload, after]) =>
              `${before}<script>${payload}</script>${after}`,
          ),
        (html) => {
          const result = sanitizeHtml(html);
          expect(result.toLowerCase()).not.toMatch(/<script[\s>]/);
          expect(result.toLowerCase()).not.toMatch(/<\/script>/);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.5**
   *
   * Generates arbitrary strings with injected inline event handlers
   * (onclick, onerror, onload, onmouseover) and verifies the sanitized
   * output contains none of them.
   */
  it('removes inline event handler attributes from any input', () => {
    const eventHandlers = ['onclick', 'onerror', 'onload', 'onmouseover'];

    fc.assert(
      fc.property(
        fc
          .tuple(fc.string(), fc.constantFrom(...eventHandlers), fc.string())
          .map(
            ([content, handler, payload]) =>
              `<div ${handler}="${payload}">${content}</div>`,
          ),
        (html) => {
          const result = sanitizeHtml(html);
          // No inline event handler attributes should remain
          expect(result).not.toMatch(/\son\w+\s*=/i);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.5**
   *
   * Generates arbitrary strings with injected javascript: URIs in href
   * attributes and verifies the sanitized output contains no javascript: URIs.
   */
  it('removes javascript: URIs from any input', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(fc.string(), fc.string())
          .map(
            ([content, payload]) =>
              `<a href="javascript:${payload}">${content}</a>`,
          ),
        (html) => {
          const result = sanitizeHtml(html);
          expect(result.toLowerCase()).not.toMatch(
            /href\s*=\s*["']?javascript:/,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.5**
   *
   * Combines all three unsafe patterns in a single input and verifies
   * the sanitized output is free of all of them simultaneously.
   */
  it('removes all unsafe patterns when combined in a single input', () => {
    fc.assert(
      fc.property(
        fc
          .tuple(fc.string(), fc.string(), fc.string())
          .map(
            ([text, scriptPayload, handlerPayload]) =>
              `<div onclick="${handlerPayload}">${text}</div>` +
              `<script>${scriptPayload}</script>` +
              `<a href="javascript:void(0)">link</a>`,
          ),
        (html) => {
          const result = sanitizeHtml(html);
          // No script tags
          expect(result.toLowerCase()).not.toMatch(/<script[\s>]/);
          expect(result.toLowerCase()).not.toMatch(/<\/script>/);
          // No event handlers
          expect(result).not.toMatch(/\son\w+\s*=/i);
          // No javascript: URIs
          expect(result.toLowerCase()).not.toMatch(
            /href\s*=\s*["']?javascript:/,
          );
        },
      ),
      { numRuns: 100 },
    );
  });
});

// Feature: brightmail-composer-enhancements, Property 7: HTML to plain-text extraction preserves text content

/**
 * Property-based test for HTML to plain-text extraction.
 *
 * Validates: Requirements 4.4
 *
 * Property 7: For any HTML string containing text nodes wrapped in safe HTML
 * tags (<b>, <i>, <ul>, <ol>, <li>, <a>, <u>), the plain-text extraction
 * function SHALL produce a string that contains every text node's content
 * and the result SHALL contain no HTML tags.
 */

describe('Feature: brightmail-composer-enhancements, Property 7: HTML to plain-text extraction preserves text content', () => {
  /**
   * Generator for safe text content that won't be confused with HTML markup.
   * Excludes <, >, and & to avoid ambiguity in assertions.
   */
  const safeTextArb = fc
    .string({ minLength: 0, maxLength: 50 })
    .map((s) => s.replace(/[<>&]/g, ''));

  /** HTML tags to randomly wrap text content in. */
  const htmlTags: Array<{ open: string; close: string }> = [
    { open: '<b>', close: '</b>' },
    { open: '<i>', close: '</i>' },
    { open: '<u>', close: '</u>' },
    { open: '<ul><li>', close: '</li></ul>' },
    { open: '<ol><li>', close: '</li></ol>' },
    { open: '<li>', close: '</li>' },
    { open: '<a href="https://example.com">', close: '</a>' },
  ];

  const tagArb = fc.constantFrom(...htmlTags);

  /**
   * **Validates: Requirements 4.4**
   *
   * Wraps arbitrary safe text in a random HTML tag and verifies the
   * extracted plain text contains the original text content.
   */
  it('plain-text output contains every text node from the HTML input', () => {
    fc.assert(
      fc.property(safeTextArb, tagArb, (text, tag) => {
        const html = `${tag.open}${text}${tag.close}`;
        const result = extractPlainText(html);
        // The plain text output must contain the original text content
        expect(result).toContain(text.trim());
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.4**
   *
   * Wraps arbitrary safe text in random HTML tags and verifies the
   * extracted plain text contains no HTML tag markers.
   */
  it('plain-text output contains no HTML tags', () => {
    fc.assert(
      fc.property(safeTextArb, tagArb, (text, tag) => {
        const html = `${tag.open}${text}${tag.close}`;
        const result = extractPlainText(html);
        // No HTML tags should remain — check for patterns like <tagname> or </tagname>
        expect(result).not.toMatch(/<\/?[a-zA-Z][^>]*>/);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.4**
   *
   * Generates multiple text nodes wrapped in different HTML tags and
   * verifies all text content is preserved in the plain-text output.
   */
  it('preserves all text nodes when multiple tags are combined', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.tuple(
            fc
              .string({ minLength: 1, maxLength: 30 })
              .map((s) => s.replace(/[<>&]/g, ''))
              .filter((s) => s.length > 0),
            tagArb,
          ),
          { minLength: 1, maxLength: 5 },
        ),
        (segments) => {
          const html = segments
            .map(([text, tag]) => `${tag.open}${text}${tag.close}`)
            .join('');
          const result = extractPlainText(html);

          // Every non-empty text segment must appear in the output
          for (const [text] of segments) {
            const trimmed = text.trim();
            if (trimmed.length > 0) {
              expect(result).toContain(trimmed);
            }
          }

          // No HTML tags in the output
          expect(result).not.toMatch(/<\/?[a-zA-Z][^>]*>/);
        },
      ),
      { numRuns: 100 },
    );
  });
});
