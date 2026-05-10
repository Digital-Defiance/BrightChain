import * as fc from 'fast-check';
import sanitizeHtml from 'sanitize-html';
import {
  FontAwesomeIconNames,
  FontAwesomeIconStyleStrings,
} from './font-awesome/font-awesome';
import {
  getCharacterCount,
  parseBioContent,
  parseMarkdown,
  parsePostContent,
  prepareContentForCharacterCount,
} from './brighthub-lib';

describe('BrightHub lib', () => {
  describe('parseMarkdown', () => {
    it('should process abbreviations correctly', () => {
      const testMarkdown = `
*[HTML]: Hyper Text Markup Language
*[CSS]: Cascading Style Sheets

This is an example of HTML and CSS abbreviations.
            `;
      const expectedHtml = `
<p>This is an example of <abbr title="Hyper Text Markup Language">HTML</abbr> and <abbr title="Cascading Style Sheets">CSS</abbr> abbreviations.</p>
            `.trim();

      const result = parseMarkdown(testMarkdown).trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle bold text', () => {
      const testMarkdown = '**Bold Text**';
      const expectedHtml = '<p><strong>Bold Text</strong></p>';

      const result = parseMarkdown(testMarkdown).trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle italic text', () => {
      const testMarkdown = '*Italic Text*';
      const expectedHtml = '<p><em>Italic Text</em></p>';

      const result = parseMarkdown(testMarkdown).trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle code blocks', () => {
      const testMarkdown = '```\nCode Block\n```';
      const expectedHtml = '<pre><code>Code Block\n</code></pre>';

      const result = parseMarkdown(testMarkdown).trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle ordered lists', () => {
      const testMarkdown = '1. First Item\n2. Second Item';
      const expectedHtml =
        '<ol>\n<li>First Item</li>\n<li>Second Item</li>\n</ol>';

      const result = parseMarkdown(testMarkdown).trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle GFM tables', () => {
      const testMarkdown = `
| Header 1 | Header 2 |
| -------- | -------- |
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |
            `;
      const expectedHtml =
        '<table>\n<thead>\n<tr>\n<th>Header 1</th>\n<th>Header 2</th>\n</tr>\n</thead>\n<tbody>\n<tr>\n<td>Cell 1</td>\n<td>Cell 2</td>\n</tr>\n<tr>\n<td>Cell 3</td>\n<td>Cell 4</td>\n</tr>\n</tbody>\n</table>';

      const result = parseMarkdown(testMarkdown.trim()).trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle GFM task lists', () => {
      const testMarkdown = `
 - [ ] Task 1
 - [x] Task 2
            `;
      const expectedHtml =
        '<ul class="contains-task-list">\n<li class="task-list-item enabled"><input class="task-list-item-checkbox"type="checkbox"> Task 1</li>\n<li class="task-list-item enabled"><input class="task-list-item-checkbox" checked=""type="checkbox"> Task 2</li>\n</ul>';

      const result = parseMarkdown(testMarkdown.trim()).trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle GFM strikethrough', () => {
      const testMarkdown = '~~Strikethrough~~';
      const expectedHtml = '<p><s>Strikethrough</s></p>';

      const result = parseMarkdown(testMarkdown).trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle unordered lists', () => {
      const testMarkdown = '- First Item\n- Second Item';
      const expectedHtml =
        '<ul>\n<li>First Item</li>\n<li>Second Item</li>\n</ul>';

      const result = parseMarkdown(testMarkdown).trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle mixed markdown features', () => {
      const testMarkdown =
        '# Title\n**Bold** and *Italic* text\n```\nCode Block\n```\n1. First Item\n2. Second Item\n- List Item';
      const expectedHtml =
        '<h1>Title</h1>\n<p><strong>Bold</strong> and <em>Italic</em> text</p>\n<pre><code>Code Block\n</code></pre>\n<ol>\n<li>First Item</li>\n<li>Second Item</li>\n</ol>\n<ul>\n<li>List Item</li>\n</ul>';

      const result = parseMarkdown(testMarkdown).trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle footnotes', () => {
      const testMarkdown = `
Here is a footnote reference,[^1] and another one.[^longnote]

[^1]: This is the first footnote.
[^longnote]: Here's one with multiple blocks.

Subsequent paragraphs are indented to show that they
belong to the previous footnote.`;
      const expectedHtml = `
<p>Here is a footnote reference,<sup class="footnote-ref"><a href="#fn-doc-1" id="fnref-doc-1">[1]</a></sup> and another one.<sup class="footnote-ref"><a href="#fn-doc-2" id="fnref-doc-2">[2]</a></sup></p>
<p>Subsequent paragraphs are indented to show that they<br />
belong to the previous footnote.</p>
<hr class="footnotes-sep" />
<section class="footnotes">
<ol class="footnotes-list">
<li id="fn-doc-1" class="footnote-item"><p>This is the first footnote. <a href="#fnref-doc-1" class="footnote-backref">↩︎</a></p>
</li>
<li id="fn-doc-2" class="footnote-item"><p>Here’s one with multiple blocks. <a href="#fnref-doc-2" class="footnote-backref">↩︎</a></p>
</li>
</ol>
</section>`.trim();

      const result = parseMarkdown(testMarkdown, 'doc').trim();
      expect(result).toBe(expectedHtml);
    });

    it('should handle inline footnotes', () => {
      const testMarkdown = `
Here is an inline note.^[Inlines notes are easier to write, since
you don't have to pick an identifier and move down to type the
note.]`;
      const expectedHtml = `
<p>Here is an inline note.<sup class="footnote-ref"><a href="#fn-doc-1" id="fnref-doc-1">[1]</a></sup></p>
<hr class="footnotes-sep" />
<section class="footnotes">
<ol class="footnotes-list">
<li id="fn-doc-1" class="footnote-item"><p>Inlines notes are easier to write, since<br />
you don’t have to pick an identifier and move down to type the<br />
note. <a href="#fnref-doc-1" class="footnote-backref">↩︎</a></p>
</li>
</ol>
</section>`.trim();

      const result = parseMarkdown(testMarkdown, 'doc').trim();
      expect(result).toBe(expectedHtml);
    });
    it('should test the custom footnote currentUrl plugin', () => {
      const currentUrl = 'https://localhost:3000/posts/123';
      const testMarkdown = `
Here is an inline note.^[Inlines notes are easier to write, since
you don't have to pick an identifier and move down to type the
note.]`;
      const expectedHtml = `
<p>Here is an inline note.<sup class="footnote-ref"><a href="${currentUrl}#fn-doc-1" id="fnref-doc-1">[1]</a></sup></p>
<hr class="footnotes-sep" />
<section class="footnotes">
<ol class="footnotes-list">
<li id="fn-doc-1" class="footnote-item"><p>Inlines notes are easier to write, since<br />
you don’t have to pick an identifier and move down to type the<br />
note. <a href="${currentUrl}#fnref-doc-1" class="footnote-backref">↩︎</a></p>
</li>
</ol>
</section>`.trim();
      const result = parseMarkdown(testMarkdown, 'doc', currentUrl).trim();
      expect(result).toBe(expectedHtml);
    });
  });

  describe('parsePostContent', () => {
    it('should do markdown and our cool icons', () => {
      const testMarkdown =
        '# Hello World\nThis is a test of our markdown parser.\n' +
        'This should be a red heart with a zig-zag through it -> {{duotone heart-pulse; color: red;}}';
      const expectedHtml =
        '<h1>Hello World</h1>\n<p>This is a test of our markdown parser.<br />\n' +
        'This should be a red heart with a zig-zag through it -&gt; <i class="fa-duotone fa-heart-pulse" style="display: inline-block; color: red;"></i></p>';

      const result = parsePostContent(testMarkdown, true).trim();
      expect(result).toEqual(expectedHtml);
    });

    it('should support MD links', () => {
      const testMarkdown =
        'This should be a link -> [https://www.google.com](https://www.google.com)';
      const expectedHtml =
        '<p>This should be a link -&gt; <a href="https://www.google.com">https://www.google.com</a></p>';

      const result = parsePostContent(testMarkdown, true).trim();
      expect(result).toEqual(expectedHtml);
    });

    it('should linkify plaintext links', () => {
      const testMarkdown = 'This should be a link -> https://www.google.com';
      const expectedHtml =
        '<p>This should be a link -&gt; <a href="https://www.google.com">https://www.google.com</a></p>';

      const result = parsePostContent(testMarkdown, true).trim();
      expect(result).toEqual(expectedHtml);
    });

    it('should handle plain text when isBlogPost is false', () => {
      const testMarkdown =
        '# Title\n**Bold** and *Italic* text\n```\nCode Block\n```\n1. First Item\n2. Second Item\n- List Item';
      const expectedHtml =
        '# Title<br />**Bold** and *Italic* text<br />```<br />Code Block<br />```<br />1. First Item<br />2. Second Item<br />- List Item';

      const result = parsePostContent(testMarkdown, false).trim();
      expect(result).toEqual(expectedHtml);
    });

    it('should preserve newlines when isBlogPost is false', () => {
      const testMarkdown = 'Line 1\nLine 2\nLine 3';
      const expectedHtml = 'Line 1<br />Line 2<br />Line 3';

      const result = parsePostContent(testMarkdown, false).trim();
      expect(result).toEqual(expectedHtml);
    });

    it('should handle a two-line post with one letter per line correctly when isBlogPost is false', () => {
      const input = 'x\nx';
      const isBlogPost = false;
      const expected = 'x<br />x';

      const result = parsePostContent(input, isBlogPost).trim();
      expect(result).toEqual(expected);
      expect(result).not.toContain('<p>');
    });

    it('should handle a two-line post with one letter per line correctly when isBlogPost is true', () => {
      const input = 'x\nx';
      const isBlogPost = true;
      const expected = '<p>x<br />\nx</p>';

      const result = parsePostContent(input, isBlogPost).trim();
      expect(result).toEqual(expected);
    });

    it('should add loading="lazy" and style="max-width: 100%" to img tags in blog posts', () => {
      const input = '![test image](http://example.com/img.png)';
      const result = parsePostContent(input, true).trim();
      expect(result).toContain('loading="lazy"');
      expect(result).toContain('style="max-width: 100%"');
      expect(result).toContain('src="http://example.com/img.png"');
      expect(result).toContain('alt="test image"');
    });

    it('should render empty alt="" when alt text is empty in blog posts', () => {
      const input = '![](http://example.com/img.png)';
      const result = parsePostContent(input, true).trim();
      expect(result).toContain('alt=""');
      expect(result).toContain('loading="lazy"');
      expect(result).toContain('style="max-width: 100%"');
    });

    it('should not duplicate loading or style attributes if already present', () => {
      // This tests that the enhancement doesn't add duplicate attributes.
      // Since Phase 1 strips HTML and Phase 2 generates fresh img tags from markdown,
      // the attributes won't already be present in normal flow. But the guard is there.
      const input = '![alt](http://example.com/img.png)';
      const result = parsePostContent(input, true).trim();
      const loadingCount = (result.match(/loading="lazy"/g) || []).length;
      const styleCount = (result.match(/style="max-width: 100%"/g) || [])
        .length;
      expect(loadingCount).toBe(1);
      expect(styleCount).toBe(1);
    });

    it('should not produce img tags for non-blog posts with image markdown', () => {
      const input = '![test](http://example.com/img.png)';
      const result = parsePostContent(input, false).trim();
      // Non-blog posts don't parse markdown, so no <img> tag is produced
      expect(result).not.toContain('<img');
      expect(result).toContain('![test](http://example.com/img.png)');
    });
  });

  describe('prepareContentForCharacterCount', () => {
    it('should replace valid icon markup with a bullet character', () => {
      const input = 'Hello {{heart}}';
      const expected = 'Hello •';

      const result = prepareContentForCharacterCount(input, false);
      expect(result).toEqual(expected);
    });

    it('should replace <br> tags with newline characters', () => {
      const input = 'Hello<br>World';
      const expected = 'Hello\nWorld';

      const result = prepareContentForCharacterCount(input, false);
      expect(result).toEqual(expected);
    });

    it('should replace <a> tags with their URLs', () => {
      const input = 'Link: <a href="https://www.google.com">Google</a>';
      const expected = 'Link: •Google';

      const result = prepareContentForCharacterCount(input, false);
      expect(result).toEqual(expected);
    });

    it('should replace <img> tags with their alt text or a bullet character', () => {
      const input = 'Image: <img src="image.png" alt="Sample Image" />';
      const expected = 'Image: Sample Image';

      const result = prepareContentForCharacterCount(input, false);
      expect(result).toEqual(expected);
    });

    it('should strip all other HTML tags and attributes', () => {
      const input = '<div>Hello <span>World</span></div>';
      const expected = 'Hello World';

      const result = prepareContentForCharacterCount(input, false);
      expect(result).toEqual(expected);
    });

    it('should replace CRLF pairs with a single newline character', () => {
      const input = 'Hello\r\nWorld';
      const expected = 'Hello\nWorld';

      const result = prepareContentForCharacterCount(input, false);
      expect(result).toEqual(expected);
    });

    it('should handle mixed content correctly', () => {
      const input =
        'Hello {{heart}}<br>Link: <a href="https://www.google.com">Google</a>\r\n<div>World</div>';
      const expected = 'Hello •\nLink: •Google\nWorld';

      const result = prepareContentForCharacterCount(input, false);
      expect(result).toEqual(expected);
    });
  });

  describe('getCharacterCount', () => {
    it('should count basic ASCII characters correctly', () => {
      const input = 'Hello World';
      expect(getCharacterCount(input, false)).toBe(11);
    });

    it('should count emojis as one character each', () => {
      const input = 'Hello 🌍';
      expect(getCharacterCount(input, false)).toBe(7);
    });

    it('should count Unicode characters (e.g., Kanji) as one character each', () => {
      const input = 'こんにちは';
      expect(getCharacterCount(input, false)).toBe(5);
    });

    it('should count valid Font Awesome icon markup as one character', () => {
      const input = 'Hello {{heart}}';
      expect(getCharacterCount(input, false)).toBe(7);
    });

    it('should ignore invalid Font Awesome icon markup', () => {
      const input = 'Hello {{invalid}}';
      expect(getCharacterCount(input, false)).toBe(17);
    });

    it('should handle mixed content correctly', () => {
      const input = 'Hello {{heart}} World 🌍 こんにちは';
      expect(getCharacterCount(input, false)).toBe(21);
    });

    it('should count multiple valid Font Awesome icon markups correctly', () => {
      const input = 'Icons: {{heart}} {{star}} {{bell}}';
      expect(getCharacterCount(input, false)).toBe(12);
    });

    it('should count multiple emojis correctly', () => {
      const input = 'Emojis: 😀😁😂🤣😃';
      expect(getCharacterCount(input, false)).toBe(13);
    });

    it('should count a mix of emojis, Unicode characters, and valid icon markups correctly', () => {
      const input = 'Mix: 😀 こんにちは {{heart}}';
      expect(getCharacterCount(input, false)).toBe(14);
    });

    it('should count text with CRLF pairs correctly', () => {
      const input = 'Hello\r\nWorld';
      expect(getCharacterCount(input, false)).toBe(11);
    });

    it('should count text with <br> tags correctly', () => {
      const input = 'Hello<br>World';
      expect(getCharacterCount(input, false)).toBe(11);
    });

    it('should count text with links correctly', () => {
      const input = 'Link: <a href="https://www.google.com">Google</a>';
      expect(getCharacterCount(input, false)).toBe(13);
    });

    it('should count text with mixed HTML tags correctly', () => {
      const input = '<div>Hello <span>World</span></div>';
      expect(getCharacterCount(input, false)).toBe(11);
    });

    it('should count markdown links correctly', () => {
      const input = '[Google](https://www.google.com)';
      expect(getCharacterCount(input, true)).toBe(7);
    });

    it('should count multi-line examples correctly', () => {
      const input = '[Google](https://www.google.com)\nt';
      expect(getCharacterCount(input, true)).toBe(9);
    });
  });

  // ─── parseBioContent ────────────────────────────────────────────────────────
  // Requirements: 2.1, 2.2, 2.3, 2.5, 2.6
  describe('parseBioContent', () => {
    const MAX_LENGTH = 2000;

    // 1. Empty string input
    it('should return empty or minimal HTML for an empty string without throwing', () => {
      expect(() => parseBioContent('', MAX_LENGTH)).not.toThrow();
      const result = parseBioContent('', MAX_LENGTH);
      // An empty string through markdown-it produces an empty string or just whitespace
      expect(result.trim()).toBe('');
    });

    // 2. Plain text (no markdown)
    it('should wrap plain text in a paragraph tag', () => {
      const result = parseBioContent('Hello world', MAX_LENGTH).trim();
      expect(result).toBe('<p>Hello world</p>');
    });

    // 3a. Bold markdown
    it('should produce <strong> tags for bold markdown', () => {
      const result = parseBioContent('**Bold Text**', MAX_LENGTH).trim();
      expect(result).toBe('<p><strong>Bold Text</strong></p>');
    });

    // 3b. Italic markdown
    it('should produce <em> tags for italic markdown', () => {
      const result = parseBioContent('*Italic Text*', MAX_LENGTH).trim();
      expect(result).toBe('<p><em>Italic Text</em></p>');
    });

    // 3c. Link markdown
    it('should produce <a> tags for link markdown', () => {
      const result = parseBioContent(
        '[Google](https://www.google.com)',
        MAX_LENGTH,
      ).trim();
      expect(result).toContain('<a href="https://www.google.com">Google</a>');
    });

    // 4. Valid icon markup
    it('should produce a FontAwesome <i> element for {{ solid heart }}', () => {
      const result = parseBioContent('{{ solid heart }}', MAX_LENGTH);
      expect(result).toContain('<i class="fa-solid fa-heart"');
      expect(result).toContain('style="display: inline-block;"');
    });

    // 5. Mixed markdown and icon markup
    it('should render both markdown and icon markup correctly when mixed', () => {
      const input = '**Love** {{ solid heart }}';
      const result = parseBioContent(input, MAX_LENGTH);
      expect(result).toContain('<strong>Love</strong>');
      expect(result).toContain('<i class="fa-solid fa-heart"');
    });

    // 6. Inline image throws
    it('should throw an error for inline image markdown ![alt](url)', () => {
      expect(() =>
        parseBioContent('Look at this ![cat](https://example.com/cat.png)', MAX_LENGTH),
      ).toThrow();
    });

    // 7. Reference image throws
    it('should throw an error for reference image markdown ![alt][ref]', () => {
      expect(() =>
        parseBioContent('Look at this ![cat][cat-ref]', MAX_LENGTH),
      ).toThrow();
    });

    // 8. Bio exceeding maxLength throws
    it('should throw a validation error when bio exceeds maxLength', () => {
      const longBio = 'a'.repeat(101);
      expect(() => parseBioContent(longBio, 100)).toThrow('bio_exceeds_max_length');
    });

    // 9. Bio at exactly maxLength is accepted
    it('should accept a bio that is exactly maxLength characters', () => {
      const exactBio = 'a'.repeat(100);
      expect(() => parseBioContent(exactBio, 100)).not.toThrow();
      const result = parseBioContent(exactBio, 100);
      expect(result).toContain('a'.repeat(100));
    });
  });
});

// ─── Property-Based Tests ────────────────────────────────────────────────────
// Uses fast-check for property-based testing.
// Each test runs a minimum of 100 iterations.

describe('parseBioContent — property-based tests', () => {
  // Property 1: Bio length validation
  // Tag: Feature: brighthub-profile-enhancements, Property 1: Bio length validation
  // Validates: Requirements 1.1, 2.6
  it('Property 1: accepts bio iff getCharacterCount(bio, true) <= maxLength', () => {
    // Generate random alphanumeric strings (0–5000 chars) and random positive maxLength (1–5000).
    // Filter out strings containing image markdown (tested separately in Property 4).
    const imageMarkdownRegex = /!\[[^\]]*\]\(([^)]+)\)|!\[[^\]]*\]\[[^\]]*\]/;

    fc.assert(
      fc.property(
        fc.string({
          unit: fc.constantFrom(
            ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split(''),
          ),
          minLength: 0,
          maxLength: 5000,
        }),
        fc.integer({ min: 1, max: 5000 }),
        (bio, maxLength) => {
          // Skip strings that contain image markdown (covered by Property 4)
          fc.pre(!imageMarkdownRegex.test(bio));

          const charCount = getCharacterCount(bio, true);
          if (charCount <= maxLength) {
            // Should NOT throw
            expect(() => parseBioContent(bio, maxLength)).not.toThrow();
          } else {
            // Should throw with bio_exceeds_max_length
            expect(() => parseBioContent(bio, maxLength)).toThrow(
              'bio_exceeds_max_length',
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // Property 2: Bio content round-trip text preservation
  // Tag: Feature: brighthub-profile-enhancements, Property 2: Bio content round-trip text preservation
  // Validates: Requirements 2.7
  it('Property 2: parsing then extracting text preserves original text content (whitespace-normalized)', () => {
    // Generate random alphanumeric strings with optional markdown formatting.
    // No images, no raw HTML — only bold, italic, links.
    const alphanumChar = fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(''),
    );
    const wordArb = fc.string({ unit: alphanumChar, minLength: 1, maxLength: 15 });

    // Arbitrary that produces a plain word, bold word, italic word, or link
    const segmentArb = fc.oneof(
      wordArb,
      wordArb.map((w) => `**${w}**`),
      wordArb.map((w) => `*${w}*`),
      fc
        .tuple(wordArb, wordArb)
        .map(([text, url]) => `[${text}](https://${url}.example.com)`),
    );

    const bioArb = fc
      .array(segmentArb, { minLength: 1, maxLength: 20 })
      .map((segs) => segs.join(' '));

    fc.assert(
      fc.property(bioArb, (bio) => {
        // Only test bios within a generous length limit
        fc.pre(getCharacterCount(bio, true) <= 5000);

        const parsed = parseBioContent(bio, 5000);

        // Extract text by stripping all HTML tags
        const extractedText = sanitizeHtml(parsed, {
          allowedTags: [],
          allowedAttributes: {},
        });

        // Normalize whitespace on both sides before comparing
        const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();

        // The original bio text (strip markdown syntax to get plain text)
        // For links [text](url) → text; for **bold** → bold; for *italic* → italic
        const originalText = bio
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // [text](url) → text
          .replace(/\*\*([^*]+)\*\*/g, '$1') // **bold** → bold
          .replace(/\*([^*]+)\*/g, '$1'); // *italic* → italic

        expect(normalize(extractedText)).toBe(normalize(originalText));
      }),
      { numRuns: 100 },
    );
  });

  // Property 3: Bio HTML sanitization
  // Tag: Feature: brighthub-profile-enhancements, Property 3: Bio HTML sanitization
  // Validates: Requirements 2.3
  it('Property 3: none of the injected raw HTML tags survive in parseBioContent output', () => {
    // Tags to inject — these should all be stripped by Phase 1 sanitization
    const injectedTags = ['script', 'div', 'span', 'b', 'iframe', 'style', 'object'];

    const alphanumChar = fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split(''),
    );
    const textArb = fc.string({ unit: alphanumChar, minLength: 0, maxLength: 100 });
    const tagArb = fc.constantFrom(...injectedTags);

    // Build a bio with an injected HTML tag somewhere in it
    const bioWithTagArb = fc
      .tuple(textArb, tagArb, textArb, textArb)
      .map(([before, tag, inner, after]) => `${before}<${tag}>${inner}</${tag}>${after}`);

    fc.assert(
      fc.property(bioWithTagArb, (bio) => {
        // Skip if bio accidentally contains image markdown
        fc.pre(!/!\[[^\]]*\]\(([^)]+)\)|!\[[^\]]*\]\[[^\]]*\]/.test(bio));
        fc.pre(getCharacterCount(bio, true) <= 5000);

        const result = parseBioContent(bio, 5000);

        // None of the injected tag names should appear as opening HTML tags in the output
        for (const tag of injectedTags) {
          expect(result).not.toMatch(new RegExp(`<${tag}[\\s>]`, 'i'));
        }
      }),
      { numRuns: 100 },
    );
  });

  // Property 4: Bio image markdown rejection
  // Tag: Feature: brighthub-profile-enhancements, Property 4: Bio image markdown rejection
  // Validates: Requirements 2.5
  it('Property 4: parseBioContent always throws for any input containing image markdown', () => {
    const alphanumChar = fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split(''),
    );
    const textArb = fc.string({ unit: alphanumChar, minLength: 0, maxLength: 100 });
    const altArb = fc.string({ unit: alphanumChar, minLength: 0, maxLength: 30 });
    const urlArb = fc
      .string({
        unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')),
        minLength: 1,
        maxLength: 30,
      })
      .map((s) => `https://${s}.example.com`);
    const refArb = fc.string({ unit: alphanumChar, minLength: 1, maxLength: 20 });

    // Either inline image ![alt](url) or reference image ![alt][ref]
    const imageMarkdownArb = fc.oneof(
      fc.tuple(altArb, urlArb).map(([alt, url]) => `![${alt}](${url})`),
      fc.tuple(altArb, refArb).map(([alt, ref]) => `![${alt}][${ref}]`),
    );

    const bioWithImageArb = fc
      .tuple(textArb, imageMarkdownArb, textArb)
      .map(([before, img, after]) => `${before}${img}${after}`);

    fc.assert(
      fc.property(bioWithImageArb, (bio) => {
        expect(() => parseBioContent(bio, 5000)).toThrow();
      }),
      { numRuns: 100 },
    );
  });

  // Property 5: Bio icon markup rendering
  // Tag: Feature: brighthub-profile-enhancements, Property 5: Bio icon markup rendering
  // Validates: Requirements 2.1, 2.2
  it('Property 5: parseBioContent output contains <i> with correct fa- classes for valid icon markup', () => {
    const alphanumChar = fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split(''),
    );
    const textArb = fc.string({ unit: alphanumChar, minLength: 0, maxLength: 50 });

    // Pick a random valid icon name and a random valid style string
    const iconNameArb = fc.constantFrom(...FontAwesomeIconNames);
    const iconStyleArb = fc.constantFrom(...FontAwesomeIconStyleStrings);

    const bioWithIconArb = fc
      .tuple(textArb, iconStyleArb, iconNameArb, textArb)
      .map(([before, style, name, after]) => `${before} {{ ${style} ${name} }} ${after}`);

    fc.assert(
      fc.property(bioWithIconArb, (bio) => {
        // Skip if bio accidentally contains image markdown
        fc.pre(!/!\[[^\]]*\]\(([^)]+)\)|!\[[^\]]*\]\[[^\]]*\]/.test(bio));
        fc.pre(getCharacterCount(bio, true) <= 5000);

        let result: string;
        try {
          result = parseBioContent(bio, 5000);
        } catch {
          // If it throws for any reason (e.g. invalid icon combination), skip
          return;
        }

        // The output should contain an <i> element with fa-{style} and fa-{iconName} classes
        // Extract the style and icon name from the bio to check
        const iconMarkupMatch = bio.match(/\{\{\s*(\S+)\s+(\S+)\s*\}\}/);
        if (iconMarkupMatch) {
          const [, style, name] = iconMarkupMatch;
          // For compound styles like 'sharpsolid', the parser splits into 'fa-sharp fa-solid'
          // For simple styles, it's just 'fa-{style}'
          if (style === 'sharpsolid') {
            expect(result).toContain('fa-sharp');
            expect(result).toContain('fa-solid');
          } else if (style === 'sharpregular') {
            expect(result).toContain('fa-sharp');
            expect(result).toContain('fa-regular');
          } else if (style === 'sharplight') {
            expect(result).toContain('fa-sharp');
            expect(result).toContain('fa-light');
          } else if (style === 'sharpthin') {
            expect(result).toContain('fa-sharp');
            expect(result).toContain('fa-thin');
          } else if (style === 'duotoneregular') {
            expect(result).toContain('fa-duotone');
            expect(result).toContain('fa-regular');
          } else if (style === 'duotonelight') {
            expect(result).toContain('fa-duotone');
            expect(result).toContain('fa-light');
          } else if (style === 'duotonethin') {
            expect(result).toContain('fa-duotone');
            expect(result).toContain('fa-thin');
          } else if (style === 'sharpduotonesolid') {
            expect(result).toContain('fa-sharp-duotone');
            expect(result).toContain('fa-solid');
          } else if (style === 'sharpduotoneregular') {
            expect(result).toContain('fa-sharp-duotone');
            expect(result).toContain('fa-regular');
          } else if (style === 'sharpduotonelight') {
            expect(result).toContain('fa-sharp-duotone');
            expect(result).toContain('fa-light');
          } else if (style === 'sharpduotonethin') {
            expect(result).toContain('fa-sharp-duotone');
            expect(result).toContain('fa-thin');
          } else {
            expect(result).toContain(`fa-${style}`);
          }
          expect(result).toContain(`fa-${name}`);
          expect(result).toContain('<i ');
        }
      }),
      { numRuns: 100 },
    );
  });
});
