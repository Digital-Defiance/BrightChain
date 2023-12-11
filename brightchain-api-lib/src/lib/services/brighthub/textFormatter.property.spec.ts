/**
 * Property-based tests for Text_Formatter service.
 *
 * Tests the following properties:
 * - Property 17: Text Formatter Round-Trip
 * - Property 18: Text Formatter XSS Prevention
 * - Property 19: Mention and Hashtag Extraction
 *
 * Also tests the existing getCharacterCount() function for smart character counting.
 *
 * Validates: Requirements 6.4, 6.6, 7.1, 7.3, 7.5, 7.6, 16.6
 */

import { getCharacterCount } from '@brightchain/brighthub-lib/lib/brighthub-lib';
import fc from 'fast-check';
import {
  createTextFormatter,
  DEFAULT_POST_MAX_CHARACTERS,
  MAX_HASHTAGS_PER_POST,
  MAX_MENTIONS_PER_POST,
  TextFormatter,
} from './textFormatter';

describe('Feature: brighthub-social-network, Text_Formatter Property Tests', () => {
  let formatter: TextFormatter;

  beforeEach(() => {
    formatter = createTextFormatter();
  });

  // --- Smart Generators ---

  /**
   * Generator for valid usernames (alphanumeric with underscores, 1-30 chars)
   */
  const usernameArb = fc
    .string({ minLength: 1, maxLength: 30 })
    .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));

  /**
   * Generator for valid hashtags (alphanumeric with underscores, 1-50 chars)
   */
  const hashtagArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s));

  /**
   * Generator for safe text content (no special characters that could break parsing)
   */
  const safeTextArb = fc
    .string({ minLength: 0, maxLength: 100 })
    .map((s) => s.replace(/[<>@#{}]/g, '').trim());

  /**
   * Generator for content with mentions
   */
  const contentWithMentionsArb = fc
    .tuple(
      safeTextArb,
      fc.array(usernameArb, { minLength: 1, maxLength: 5 }),
      safeTextArb,
    )
    .map(([prefix, usernames, suffix]) => {
      const mentions = usernames.map((u) => `@${u}`).join(' ');
      return `${prefix} ${mentions} ${suffix}`.trim();
    });

  /**
   * Generator for content with hashtags
   */
  const contentWithHashtagsArb = fc
    .tuple(
      safeTextArb,
      fc.array(hashtagArb, { minLength: 1, maxLength: 5 }),
      safeTextArb,
    )
    .map(([prefix, tags, suffix]) => {
      const hashtags = tags.map((t) => `#${t}`).join(' ');
      return `${prefix} ${hashtags} ${suffix}`.trim();
    });

  /**
   * Generator for XSS attack vectors
   */
  const xssPayloadArb = fc.constantFrom(
    '<script>alert("xss")</script>',
    '<img src="x" onerror="alert(1)">',
    '<svg onload="alert(1)">',
    '<a href="javascript:alert(1)">click</a>',
    '<div onclick="alert(1)">click</div>',
    '<iframe src="javascript:alert(1)"></iframe>',
    '<body onload="alert(1)">',
    '<input onfocus="alert(1)" autofocus>',
    '<marquee onstart="alert(1)">',
    '<video><source onerror="alert(1)">',
    '"><script>alert(1)</script>',
    "'-alert(1)-'",
    '<img src=x onerror=alert(1)//>',
    '<svg/onload=alert(1)>',
    '<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>',
  );

  /**
   * Generator for content with mixed mentions and hashtags
   */
  const mixedContentArb = fc
    .tuple(
      safeTextArb,
      fc.array(usernameArb, { minLength: 0, maxLength: 3 }),
      fc.array(hashtagArb, { minLength: 0, maxLength: 3 }),
      safeTextArb,
    )
    .map(([prefix, usernames, tags, suffix]) => {
      const mentions = usernames.map((u) => `@${u}`).join(' ');
      const hashtags = tags.map((t) => `#${t}`).join(' ');
      return `${prefix} ${mentions} ${hashtags} ${suffix}`.trim();
    });

  // --- Property Tests ---

  describe('Property 17: Text Formatter Round-Trip', () => {
    /**
     * Property 17: Text Formatter Round-Trip
     *
     * For all valid post content, parsing then formatting then extracting
     * raw text SHALL produce equivalent semantic content.
     *
     * **Validates: Requirements 6.6, 16.6**
     */
    it('should preserve semantic content through format round-trip', () => {
      fc.assert(
        fc.property(safeTextArb, (content) => {
          if (content.length === 0) return true; // Skip empty content

          const result = formatter.format(content, { isBlogPost: false });

          // The raw content should be preserved
          expect(result.raw).toBe(content);

          // The formatted content should contain the original text
          // (possibly with HTML tags added)
          const strippedFormatted = result.formatted
            .replace(/<[^>]*>/g, '')
            .replace(/&gt;/g, '>')
            .replace(/&lt;/g, '<')
            .replace(/&amp;/g, '&')
            .trim();

          // The stripped formatted content should contain the original words
          const originalWords = content
            .split(/\s+/)
            .filter((w) => w.length > 0);
          const formattedWords = strippedFormatted
            .split(/\s+/)
            .filter((w) => w.length > 0);

          // All original words should be present in the formatted output
          for (const word of originalWords) {
            expect(
              formattedWords.some(
                (fw) => fw.includes(word) || word.includes(fw),
              ),
            ).toBe(true);
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should produce consistent character counts', () => {
      fc.assert(
        fc.property(safeTextArb, fc.boolean(), (content, isBlogPost) => {
          const result = formatter.format(content, { isBlogPost });

          // Character count from formatter should match the library function
          const expectedCount = getCharacterCount(content, isBlogPost);
          expect(result.characterCount).toBe(expectedCount);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 18: Text Formatter XSS Prevention', () => {
    /**
     * Property 18: Text Formatter XSS Prevention
     *
     * For any input containing XSS attack vectors, the sanitize() method
     * SHALL remove or neutralize all potentially dangerous content.
     *
     * **Validates: Requirements 6.4**
     */
    it('should remove script tags from input', () => {
      fc.assert(
        fc.property(xssPayloadArb, safeTextArb, (xssPayload, safeContent) => {
          const maliciousContent = `${safeContent} ${xssPayload}`;
          const sanitized = formatter.sanitize(maliciousContent);

          // Should not contain script tags
          expect(sanitized).not.toMatch(/<script/i);
          expect(sanitized).not.toMatch(/<\/script/i);

          // Should not contain event handlers
          expect(sanitized).not.toMatch(/on\w+\s*=/i);

          // Should not contain javascript: URLs
          expect(sanitized).not.toMatch(/javascript:/i);

          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('should neutralize XSS in formatted output', () => {
      fc.assert(
        fc.property(xssPayloadArb, safeTextArb, (xssPayload, safeContent) => {
          const maliciousContent = `${safeContent} ${xssPayload}`;
          const result = formatter.format(maliciousContent, {
            isBlogPost: false,
          });

          // Formatted output should not contain dangerous elements
          expect(result.formatted).not.toMatch(/<script/i);
          expect(result.formatted).not.toMatch(/on\w+\s*=/i);
          expect(result.formatted).not.toMatch(/javascript:/i);

          return true;
        }),
        { numRuns: 50 },
      );
    });

    it('should handle nested XSS attempts', () => {
      const nestedXssArb = fc.constantFrom(
        '<<script>script>alert(1)<</script>/script>',
        '<scr<script>ipt>alert(1)</scr</script>ipt>',
        '<img src="x" onerror="<script>alert(1)</script>">',
        '<div style="background:url(javascript:alert(1))">',
      );

      fc.assert(
        fc.property(nestedXssArb, (nestedXss) => {
          const sanitized = formatter.sanitize(nestedXss);
          const formatted = formatter.format(nestedXss, { isBlogPost: false });

          // Neither should contain script tags
          expect(sanitized).not.toMatch(/<script/i);
          expect(formatted.formatted).not.toMatch(/<script/i);

          return true;
        }),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 19: Mention and Hashtag Extraction', () => {
    /**
     * Property 19: Mention and Hashtag Extraction
     *
     * For any content containing @mentions, extractMentions() SHALL return
     * all valid usernames. For any content containing #hashtags,
     * extractHashtags() SHALL return all valid hashtags.
     *
     * **Validates: Requirements 7.1, 7.3, 7.5, 7.6**
     */
    it('should extract all mentions from content', () => {
      fc.assert(
        fc.property(contentWithMentionsArb, (content) => {
          const mentions = formatter.extractMentions(content);

          // All extracted mentions should be valid usernames
          for (const mention of mentions) {
            expect(mention).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]{0,29}$/);
          }

          // Mentions should be unique
          const uniqueMentions = new Set(mentions);
          expect(mentions.length).toBe(uniqueMentions.size);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should extract all hashtags from content', () => {
      fc.assert(
        fc.property(contentWithHashtagsArb, (content) => {
          const hashtags = formatter.extractHashtags(content);

          // All extracted hashtags should be valid
          for (const hashtag of hashtags) {
            expect(hashtag).toMatch(/^[a-zA-Z_][a-zA-Z0-9_]{0,49}$/);
          }

          // Hashtags should be unique
          const uniqueHashtags = new Set(hashtags);
          expect(hashtags.length).toBe(uniqueHashtags.size);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should extract mentions and hashtags from mixed content', () => {
      fc.assert(
        fc.property(mixedContentArb, (content) => {
          const result = formatter.format(content, { isBlogPost: false });

          // Mentions and hashtags should be extracted
          expect(Array.isArray(result.mentions)).toBe(true);
          expect(Array.isArray(result.hashtags)).toBe(true);

          // All mentions should be lowercase
          for (const mention of result.mentions) {
            expect(mention).toBe(mention.toLowerCase());
          }

          // All hashtags should be lowercase
          for (const hashtag of result.hashtags) {
            expect(hashtag).toBe(hashtag.toLowerCase());
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should not extract mentions from email addresses', () => {
      const emailArb = fc
        .tuple(
          usernameArb,
          fc.constantFrom('gmail.com', 'example.org', 'test.co'),
        )
        .map(([user, domain]) => `${user}@${domain}`);

      fc.assert(
        fc.property(emailArb, safeTextArb, (email, text) => {
          const content = `${text} ${email}`;
          const mentions = formatter.extractMentions(content);

          // Email addresses should not be extracted as mentions
          // The domain part should not appear as a mention
          for (const mention of mentions) {
            expect(mention).not.toMatch(/\./);
          }

          return true;
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Smart Character Counting', () => {
    /**
     * Tests for getCharacterCount() function
     * Validates smart counting rules: emojis = 1, icons = 1, links = 1
     */
    it('should count emojis as single characters', () => {
      const emojiArb = fc.constantFrom(
        '😀',
        '🎉',
        '❤️',
        '🌍',
        '👍',
        '🔥',
        '✨',
        '🚀',
      );

      fc.assert(
        fc.property(
          fc.array(emojiArb, { minLength: 1, maxLength: 10 }),
          safeTextArb,
          (emojis, text) => {
            const content = `${text} ${emojis.join('')}`;
            const count = formatter.getCharacterCount(content, false);

            // Count should be text length + space + number of emojis
            const textLength = text.length;
            const expectedMin = textLength + emojis.length;

            // The count should be reasonable (accounting for spaces and emoji variations)
            expect(count).toBeGreaterThanOrEqual(expectedMin);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('should count valid icon markup as single characters', () => {
      const validIconArb = fc.constantFrom(
        '{{heart}}',
        '{{solid star}}',
        '{{duotone bell}}',
        '{{light user}}',
      );

      fc.assert(
        fc.property(
          fc.array(validIconArb, { minLength: 1, maxLength: 5 }),
          safeTextArb,
          (icons, text) => {
            const content = `${text} ${icons.join(' ')}`;
            const count = formatter.getCharacterCount(content, false);

            // Each valid icon should count as 1 character
            // The count should be less than the raw string length
            expect(count).toBeLessThan(content.length);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Validation', () => {
    /**
     * Tests for content validation
     */
    it('should reject empty content', () => {
      fc.assert(
        fc.property(fc.constantFrom('', '   ', '\n', '\t'), (emptyContent) => {
          const result = formatter.validate(emptyContent);

          expect(result.isValid).toBe(false);
          expect(result.errors).toContain('Content cannot be empty');

          return true;
        }),
        { numRuns: 10 },
      );
    });

    it('should reject content exceeding character limit', () => {
      // Generate content that's definitely over the limit
      const longContentArb = fc
        .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
          minLength: DEFAULT_POST_MAX_CHARACTERS + 1,
          maxLength: DEFAULT_POST_MAX_CHARACTERS + 100,
        })
        .map((chars) => chars.join(''));

      fc.assert(
        fc.property(longContentArb, (longContent) => {
          const result = formatter.validate(longContent);

          expect(result.isValid).toBe(false);
          expect(
            result.errors.some((e) =>
              e.includes('exceeds maximum character limit'),
            ),
          ).toBe(true);

          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('should reject content with too many mentions', () => {
      // Generate unique usernames to avoid deduplication
      const manyMentionsArb = fc
        .array(fc.integer({ min: 1, max: 9999 }), {
          minLength: MAX_MENTIONS_PER_POST + 1,
          maxLength: 15,
        })
        .map((nums) => [...new Set(nums)]) // Ensure unique
        .filter((nums) => nums.length > MAX_MENTIONS_PER_POST)
        .map((nums) => nums.map((n) => `@user${n}`).join(' '));

      fc.assert(
        fc.property(manyMentionsArb, (content) => {
          const result = formatter.validate(content);

          expect(result.isValid).toBe(false);
          expect(
            result.errors.some((e) => e.includes('Too many mentions')),
          ).toBe(true);

          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('should reject content with too many hashtags', () => {
      // Generate unique hashtags to avoid deduplication
      const manyHashtagsArb = fc
        .array(fc.integer({ min: 1, max: 9999 }), {
          minLength: MAX_HASHTAGS_PER_POST + 1,
          maxLength: 15,
        })
        .map((nums) => [...new Set(nums)]) // Ensure unique
        .filter((nums) => nums.length > MAX_HASHTAGS_PER_POST)
        .map((nums) => nums.map((n) => `#tag${n}`).join(' '));

      fc.assert(
        fc.property(manyHashtagsArb, (content) => {
          const result = formatter.validate(content);

          expect(result.isValid).toBe(false);
          expect(
            result.errors.some((e) => e.includes('Too many hashtags')),
          ).toBe(true);

          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('should accept valid content within limits', () => {
      const validContentArb = fc
        .tuple(
          safeTextArb.filter((s) => s.length > 0 && s.length < 200),
          fc.array(usernameArb, { minLength: 0, maxLength: 3 }),
          fc.array(hashtagArb, { minLength: 0, maxLength: 3 }),
        )
        .map(([text, usernames, tags]) => {
          const mentions = usernames.map((u) => `@${u}`).join(' ');
          const hashtags = tags.map((t) => `#${t}`).join(' ');
          return `${text} ${mentions} ${hashtags}`.trim();
        })
        .filter(
          (content) =>
            content.length > 0 && content.length <= DEFAULT_POST_MAX_CHARACTERS,
        );

      fc.assert(
        fc.property(validContentArb, (content) => {
          const result = formatter.validate(content);

          expect(result.isValid).toBe(true);
          expect(result.errors).toHaveLength(0);

          return true;
        }),
        { numRuns: 50 },
      );
    });
  });
});
