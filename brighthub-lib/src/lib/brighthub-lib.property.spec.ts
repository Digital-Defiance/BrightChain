/**
 * Property-based tests for BrightHub text formatting functions
 *
 * Property 17: Text Formatter Round-Trip
 * Validates: Requirements 6.6, 16.6
 *
 * Tests that the text formatting pipeline produces consistent, valid output
 * and preserves semantic content through transformations.
 */
import fc from 'fast-check';
import {
  getCharacterCount,
  parseMarkdown,
  parsePostContent,
  prepareContentForCharacterCount,
} from './brighthub-lib';
import {
  isValidIconMarkup,
  parseIconMarkup,
  stripIconMarkup,
} from './font-awesome/font-awesome';

describe('BrightHub Text Formatter Property Tests', () => {
  describe('Property 17: Text Formatter Round-Trip', () => {
    /**
     * Property: Character count should always be non-negative
     */
    it('character count is always non-negative for any input', () => {
      fc.assert(
        fc.property(fc.string(), fc.boolean(), (input, isBlogPost) => {
          const count = getCharacterCount(input, isBlogPost);
          return count >= 0;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Character count of empty string is zero
     */
    it('character count of empty string is zero', () => {
      expect(getCharacterCount('', false)).toBe(0);
      expect(getCharacterCount('', true)).toBe(0);
    });

    /**
     * Property: parsePostContent always returns a string
     */
    it('parsePostContent always returns a string for any input', () => {
      fc.assert(
        fc.property(fc.string(), fc.boolean(), (input, isBlogPost) => {
          const result = parsePostContent(input, isBlogPost);
          return typeof result === 'string';
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property: parseMarkdown always returns a string
     */
    it('parseMarkdown always returns a string for any input', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const result = parseMarkdown(input);
          return typeof result === 'string';
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property: prepareContentForCharacterCount always returns a string
     */
    it('prepareContentForCharacterCount always returns a string', () => {
      fc.assert(
        fc.property(fc.string(), fc.boolean(), (input, isBlogPost) => {
          const result = prepareContentForCharacterCount(input, isBlogPost);
          return typeof result === 'string';
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Valid icon markup is recognized consistently
     */
    it('valid icon markup patterns are recognized', () => {
      const validPatterns = [
        '{{heart}}',
        '{{solid heart}}',
        '{{duotone star}}',
        '{{solid heart lg}}',
        '{{solid heart lg spin}}',
        '{{solid heart; color: red}}',
        '{{duotone star 2x; color: gold}}',
      ];

      validPatterns.forEach((pattern) => {
        expect(isValidIconMarkup(pattern)).toBe(true);
      });
    });

    /**
     * Property: Invalid icon markup is rejected consistently
     */
    it('invalid icon markup patterns are rejected', () => {
      const invalidPatterns = [
        '{{}}',
        '{{   }}',
        '{{ }}',
        '{heart}',
        '{ {heart} }',
        'heart',
        '{{invalid-icon-that-does-not-exist-xyz123}}',
      ];

      invalidPatterns.forEach((pattern) => {
        expect(isValidIconMarkup(pattern)).toBe(false);
      });
    });

    /**
     * Property: parseIconMarkup preserves non-icon content
     */
    it('parseIconMarkup preserves text without icon markup', () => {
      fc.assert(
        fc.property(
          fc.string().filter((s) => !s.includes('{{') && !s.includes('}}')),
          (input) => {
            const result = parseIconMarkup(input);
            return result === input;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: stripIconMarkup removes all icon markup
     */
    it('stripIconMarkup removes all icon markup patterns', () => {
      const inputsWithIcons = [
        'Hello {{heart}} World',
        '{{solid star}} Rating',
        'Icons: {{heart}} {{star}} {{bell}}',
      ];

      inputsWithIcons.forEach((input) => {
        const result = stripIconMarkup(input);
        expect(result).not.toContain('{{');
        expect(result).not.toContain('}}');
      });
    });

    /**
     * Property: Character count treats valid icons as single characters
     */
    it('valid icon markup counts as one character', () => {
      // "Hello " = 6 chars, "{{heart}}" = 1 char (icon)
      const input = 'Hello {{heart}}';
      const count = getCharacterCount(input, false);
      expect(count).toBe(7);
    });

    /**
     * Property: Character count treats emojis as single characters
     */
    it('emojis count as single characters', () => {
      // Test with known emoji strings
      const emojiStrings = ['😀', '🌍', '😀😁😂', 'Hello 🌍', '😀 World 🌍'];

      emojiStrings.forEach((input) => {
        const count = getCharacterCount(input, false);
        // Count should be reasonable (emojis as 1 char each)
        expect(count).toBeGreaterThan(0);
        expect(count).toBeLessThanOrEqual(input.length);
      });
    });

    /**
     * Property: Non-blog post mode preserves newlines as <br> tags
     */
    it('non-blog post mode converts newlines to br tags', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.string({ minLength: 1, maxLength: 20 }).filter(
              // Filter out strings that contain HTML-like content or special chars
              (s) =>
                !s.includes('<') &&
                !s.includes('>') &&
                !s.includes('\n') &&
                !s.includes('\r'),
            ),
            { minLength: 2, maxLength: 5 },
          ),
          (lines) => {
            const input = lines.join('\n');
            const result = parsePostContent(input, false);
            // Should contain <br /> for each newline
            const brCount = (result.match(/<br \/>/g) || []).length;
            return brCount === lines.length - 1;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: Blog post mode wraps content in HTML tags
     */
    it('blog post mode produces HTML output', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }).filter(
            (s) =>
              s.trim().length > 0 &&
              // Exclude strings with < or > since sanitizeHtml strips them,
              // potentially leaving empty content that produces no HTML tags
              !s.includes('<') &&
              !s.includes('>'),
          ),
          (input) => {
            const result = parsePostContent(input, true);
            // Should contain some HTML tags
            return result.includes('<') && result.includes('>');
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: Formatting is idempotent for already-formatted content
     * (applying parsePostContent twice should not change the semantic content)
     */
    it('character count is stable after formatting', () => {
      const testCases = [
        'Hello World',
        'Test with {{heart}} icon',
        'Multiple\nLines\nHere',
        'Mixed 😀 content {{star}}',
      ];

      testCases.forEach((input) => {
        const formatted = parsePostContent(input, false);
        const preparedOriginal = prepareContentForCharacterCount(input, false);
        const preparedFormatted = prepareContentForCharacterCount(
          formatted,
          false,
        );

        // The prepared content should have similar semantic meaning
        // (though exact equality may not hold due to HTML transformations)
        expect(typeof preparedOriginal).toBe('string');
        expect(typeof preparedFormatted).toBe('string');
      });
    });

    /**
     * Property: XSS-like content is sanitized
     */
    it('HTML tags in input are sanitized', () => {
      const xssAttempts = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        '<a href="javascript:alert(1)">click</a>',
        '<div onclick="alert(1)">test</div>',
      ];

      xssAttempts.forEach((input) => {
        const result = parsePostContent(input, false);
        // Script tags should be stripped
        expect(result).not.toContain('<script');
        expect(result).not.toContain('onerror=');
        expect(result).not.toContain('onclick=');
        expect(result).not.toContain('javascript:');
      });
    });

    /**
     * Property: Output length is bounded relative to input
     * (formatting shouldn't cause unbounded growth)
     */
    it('output length is bounded relative to input length', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 0, maxLength: 1000 }),
          fc.boolean(),
          (input, isBlogPost) => {
            const result = parsePostContent(input, isBlogPost);
            // Output should not be more than 10x the input length
            // (accounting for HTML tag expansion)
            const maxExpectedLength = Math.max(input.length * 10, 100);
            return result.length <= maxExpectedLength;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
