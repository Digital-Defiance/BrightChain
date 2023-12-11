/**
 * Unit tests for TextFormatter inline image sanitization.
 *
 * Tests:
 * 1. Blog post with permanent URL image → img tag preserved with correct attributes
 * 2. Blog post with external URL image → img tag stripped from output
 * 3. Blog post with staging URL image → img tag preserved (images display while in staging)
 * 4. Blog post with mixed images → permanent and staging preserved, external stripped
 * 5. Preserved img tags have loading="lazy" and style="max-width: 100%"
 * 6. Alt text is preserved on allowed img tags
 *
 * Requirements: 11.3
 */

import { createTextFormatter, TextFormatter } from '../textFormatter';

// ─── Valid UUID v4 tokens ───────────────────────────────────────────────────

const PERMANENT_FILE_ID_1 = 'a1b2c3d4-e5f6-4a90-abcd-ef1234567890';
const PERMANENT_FILE_ID_2 = 'b2c3d4e5-f6a7-4b01-8cde-f12345678901';
const STAGING_TOKEN = 'c3d4e5f6-a7b8-4c12-9def-012345678902';

function permanentUrl(fileId: string): string {
  return `/api/post-images/${fileId}`;
}

function stagingUrl(token: string): string {
  return `/api/temp-upload/${token}/preview`;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TextFormatter inline image sanitization', () => {
  let formatter: TextFormatter;

  beforeEach(() => {
    formatter = createTextFormatter();
  });

  // ── 1. Permanent URL image preserved ────────────────────────────────────

  describe('blog post with permanent URL image', () => {
    it('should preserve img tag with permanent URL in formatted output', () => {
      const url = permanentUrl(PERMANENT_FILE_ID_1);
      const content = `Some text\n\n![my image](${url})\n\nMore text`;

      const result = formatter.format(content, { isBlogPost: true });

      expect(result.formatted).toContain('<img');
      expect(result.formatted).toContain(`src="${url}"`);
      expect(result.formatted).toContain('Some text');
      expect(result.formatted).toContain('More text');
    });
  });

  // ── 2. External URL image stripped ──────────────────────────────────────

  describe('blog post with external URL image', () => {
    it('should strip img tag with external URL from formatted output', () => {
      const content =
        'Some text\n\n![external](https://evil.com/malware.png)\n\nMore text';

      const result = formatter.format(content, { isBlogPost: true });

      expect(result.formatted).not.toContain('evil.com');
      expect(result.formatted).not.toContain('malware.png');
      expect(result.formatted).toContain('Some text');
      expect(result.formatted).toContain('More text');
    });

    it('should strip img tag with http URL', () => {
      const content = '![photo](http://example.com/photo.jpg)';

      const result = formatter.format(content, { isBlogPost: true });

      expect(result.formatted).not.toContain('example.com');
      expect(result.formatted).not.toContain('photo.jpg');
    });

    it('should strip img tag with data URI', () => {
      const content = '![data](data:image/png;base64,iVBORw0KGgo=)';

      const result = formatter.format(content, { isBlogPost: true });

      expect(result.formatted).not.toContain('data:image');
    });
  });

  // ── 3. Staging URL image preserved ──────────────────────────────────────

  describe('blog post with staging URL image', () => {
    it('should preserve img tag with staging URL in formatted output', () => {
      const url = stagingUrl(STAGING_TOKEN);
      const content = `Check this out\n\n![staged](${url})\n\nEnd`;

      const result = formatter.format(content, { isBlogPost: true });

      expect(result.formatted).toContain('<img');
      expect(result.formatted).toContain(`src="${url}"`);
      expect(result.formatted).toContain('Check this out');
      expect(result.formatted).toContain('End');
    });
  });

  // ── 4. Mixed images — permanent and staging preserved, external stripped ─

  describe('blog post with mixed images', () => {
    it('should preserve permanent and staging URL images and strip external', () => {
      const permUrl1 = permanentUrl(PERMANENT_FILE_ID_1);
      const permUrl2 = permanentUrl(PERMANENT_FILE_ID_2);
      const stageUrl = stagingUrl(STAGING_TOKEN);
      const externalUrl = 'https://external.com/image.png';

      const content = [
        'Intro paragraph',
        '',
        `![permanent 1](${permUrl1})`,
        '',
        `![external](${externalUrl})`,
        '',
        `![staged](${stageUrl})`,
        '',
        `![permanent 2](${permUrl2})`,
        '',
        'Conclusion',
      ].join('\n');

      const result = formatter.format(content, { isBlogPost: true });

      // Permanent URLs preserved
      expect(result.formatted).toContain(`src="${permUrl1}"`);
      expect(result.formatted).toContain(`src="${permUrl2}"`);

      // Staging URL preserved (images display while in staging)
      expect(result.formatted).toContain(`src="${stageUrl}"`);

      // External URLs stripped
      expect(result.formatted).not.toContain('external.com');

      // Non-image text preserved
      expect(result.formatted).toContain('Intro paragraph');
      expect(result.formatted).toContain('Conclusion');
    });
  });

  // ── 5. Preserved img tags have correct attributes ──────────────────────

  describe('preserved img tags have loading="lazy" and style="max-width: 100%"', () => {
    it('should set loading="lazy" on allowed img tags', () => {
      const url = permanentUrl(PERMANENT_FILE_ID_1);
      const content = `![test](${url})`;

      const result = formatter.format(content, { isBlogPost: true });

      expect(result.formatted).toContain('loading="lazy"');
    });

    it('should set style="max-width: 100%" on allowed img tags', () => {
      const url = permanentUrl(PERMANENT_FILE_ID_1);
      const content = `![test](${url})`;

      const result = formatter.format(content, { isBlogPost: true });

      // sanitize-html may normalize spacing in style values
      expect(result.formatted).toMatch(/max-width:\s*100%/);
    });

    it('should have both attributes on the same img tag', () => {
      const url = permanentUrl(PERMANENT_FILE_ID_1);
      const content = `![test](${url})`;

      const result = formatter.format(content, { isBlogPost: true });

      // Extract the img tag from the output
      const imgMatch = result.formatted.match(/<img[^>]*>/i);
      expect(imgMatch).not.toBeNull();

      const imgTag = imgMatch![0];
      expect(imgTag).toContain('loading="lazy"');
      // sanitize-html may normalize spacing in style values
      expect(imgTag).toMatch(/max-width:\s*100%/);
      expect(imgTag).toContain(`src="${url}"`);
    });
  });

  // ── 6. Alt text preserved ─────────────────────────────────────────────

  describe('alt text is preserved on allowed img tags', () => {
    it('should preserve alt text on permanent URL images', () => {
      const url = permanentUrl(PERMANENT_FILE_ID_1);
      const content = `![A beautiful sunset over the ocean](${url})`;

      const result = formatter.format(content, { isBlogPost: true });

      const imgMatch = result.formatted.match(/<img[^>]*>/i);
      expect(imgMatch).not.toBeNull();

      const imgTag = imgMatch![0];
      expect(imgTag).toContain('alt="A beautiful sunset over the ocean"');
    });

    it('should preserve empty alt text as alt=""', () => {
      const url = permanentUrl(PERMANENT_FILE_ID_1);
      const content = `![](${url})`;

      const result = formatter.format(content, { isBlogPost: true });

      const imgMatch = result.formatted.match(/<img[^>]*>/i);
      expect(imgMatch).not.toBeNull();

      const imgTag = imgMatch![0];
      expect(imgTag).toContain('alt=""');
    });

    it('should preserve alt text with special characters', () => {
      const url = permanentUrl(PERMANENT_FILE_ID_1);
      const content = `![Photo of Bob's cat & dog](${url})`;

      const result = formatter.format(content, { isBlogPost: true });

      const imgMatch = result.formatted.match(/<img[^>]*>/i);
      expect(imgMatch).not.toBeNull();

      // The alt text should be present (possibly HTML-encoded)
      const imgTag = imgMatch![0];
      expect(imgTag).toContain('alt=');
      expect(imgTag).toContain(`src="${url}"`);
    });
  });
});
