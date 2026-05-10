/**
 * Unit tests for inline image URL utility edge cases.
 *
 * Feature: brighthub-post-images
 * Requirements: 2.1, 5.1, 11.1
 */
import {
  countInlineImages,
  extractStagingTokens,
  isPermanentUrl,
  isStagingUrl,
} from '../inlineImageUrls';

// A valid UUID v4 for reuse in tests
const VALID_UUID = 'a1b2c3d4-e5f6-4890-abcd-ef1234567890';
const VALID_UUID_2 = 'f9e8d7c6-b5a4-4210-9edc-ba0987654321';

describe('countInlineImages', () => {
  /**
   * Validates: Requirement 2.1 — max 20 inline images per post
   */

  it('returns 0 for an empty string', () => {
    expect(countInlineImages('')).toBe(0);
  });

  it('returns 0 for text with no images', () => {
    expect(countInlineImages('Hello world, no images here.')).toBe(0);
  });

  it('returns 1 for a single image', () => {
    expect(countInlineImages('![alt text](https://example.com/img.png)')).toBe(
      1,
    );
  });

  it('returns 20 for exactly 20 images', () => {
    const images = Array.from(
      { length: 20 },
      (_, i) => `![image ${i}](/api/post-images/${VALID_UUID})`,
    );
    const content = images.join('\n');
    expect(countInlineImages(content)).toBe(20);
  });

  it('returns 21 for 21 images (over the limit)', () => {
    const images = Array.from(
      { length: 21 },
      (_, i) => `![image ${i}](/api/post-images/${VALID_UUID})`,
    );
    const content = images.join('\n');
    expect(countInlineImages(content)).toBe(21);
  });

  it('counts images mixed with regular text', () => {
    const content = [
      'Some intro text.',
      '![first](/api/post-images/' + VALID_UUID + ')',
      'Middle paragraph.',
      '![second](/api/temp-upload/' + VALID_UUID_2 + '/preview)',
      'Closing text.',
    ].join('\n');
    expect(countInlineImages(content)).toBe(2);
  });

  it('does not count malformed image syntax missing the exclamation mark', () => {
    expect(countInlineImages('[alt](url)')).toBe(0);
  });

  it('does not count image syntax with missing closing paren', () => {
    expect(countInlineImages('![alt](url')).toBe(0);
  });
});

describe('isStagingUrl', () => {
  /**
   * Validates: Requirement 11.1 — only accept staging URLs matching exact pattern
   */

  it('returns false for an empty string', () => {
    expect(isStagingUrl('')).toBe(false);
  });

  it('returns true for a valid staging URL', () => {
    expect(isStagingUrl(`/api/temp-upload/${VALID_UUID}/preview`)).toBe(true);
  });

  it('returns false for a partial match missing /preview', () => {
    expect(isStagingUrl(`/api/temp-upload/${VALID_UUID}`)).toBe(false);
  });

  it('returns false for a URL with query params', () => {
    expect(
      isStagingUrl(`/api/temp-upload/${VALID_UUID}/preview?size=large`),
    ).toBe(false);
  });

  it('returns false for a URL with extra path segments', () => {
    expect(isStagingUrl(`/api/temp-upload/${VALID_UUID}/preview/extra`)).toBe(
      false,
    );
  });

  it('returns false for a URL with a prefix', () => {
    expect(
      isStagingUrl(`https://example.com/api/temp-upload/${VALID_UUID}/preview`),
    ).toBe(false);
  });

  it('returns false for a wrong UUID version (version 1 instead of 4)', () => {
    // Version digit is the 13th hex digit — must be '4' for UUID v4
    const v1Uuid = 'a1b2c3d4-e5f6-1890-abcd-ef1234567890';
    expect(isStagingUrl(`/api/temp-upload/${v1Uuid}/preview`)).toBe(false);
  });

  it('returns false for a wrong UUID variant (variant c instead of 8/9/a/b)', () => {
    // Variant digit is the 17th hex digit — must be 8, 9, a, or b
    const wrongVariant = 'a1b2c3d4-e5f6-4890-cbcd-ef1234567890';
    expect(isStagingUrl(`/api/temp-upload/${wrongVariant}/preview`)).toBe(
      false,
    );
  });

  it('returns false for a permanent URL', () => {
    expect(isStagingUrl(`/api/post-images/${VALID_UUID}`)).toBe(false);
  });

  it('returns true for uppercase hex in UUID (case-insensitive)', () => {
    expect(
      isStagingUrl(`/api/temp-upload/${VALID_UUID.toUpperCase()}/preview`),
    ).toBe(true);
  });
});

describe('isPermanentUrl', () => {
  /**
   * Validates: Requirement 11.1 — URL pattern validation
   * Accepts both UUID v4 and base64-encoded file IDs from vault storage.
   */

  it('returns false for an empty string', () => {
    expect(isPermanentUrl('')).toBe(false);
  });

  it('returns true for a valid permanent URL with UUID', () => {
    expect(isPermanentUrl(`/api/post-images/${VALID_UUID}`)).toBe(true);
  });

  it('returns true for a base64-encoded file ID', () => {
    expect(isPermanentUrl('/api/post-images/qiQkdhLZSYmw8giMFGK22w==')).toBe(
      true,
    );
  });

  it('returns false for a partial match with extra path', () => {
    expect(isPermanentUrl(`/api/post-images/${VALID_UUID}/extra`)).toBe(false);
  });

  it('returns false for a URL with a prefix', () => {
    expect(
      isPermanentUrl(`https://example.com/api/post-images/${VALID_UUID}`),
    ).toBe(false);
  });

  it('returns true for non-v4 UUID formats (vault may use any ID format)', () => {
    const v5Uuid = 'a1b2c3d4-e5f6-5890-abcd-ef1234567890';
    expect(isPermanentUrl(`/api/post-images/${v5Uuid}`)).toBe(true);
  });

  it('returns false for a staging URL', () => {
    expect(isPermanentUrl(`/api/temp-upload/${VALID_UUID}/preview`)).toBe(
      false,
    );
  });

  it('returns true for uppercase hex in UUID (case-insensitive)', () => {
    expect(isPermanentUrl(`/api/post-images/${VALID_UUID.toUpperCase()}`)).toBe(
      true,
    );
  });

  it('returns false for a URL with query params', () => {
    expect(isPermanentUrl(`/api/post-images/${VALID_UUID}?width=100`)).toBe(
      false,
    );
  });
});

describe('extractStagingTokens', () => {
  /**
   * Validates: Requirement 5.1 — scan content for staging URLs
   */

  it('returns empty array for an empty string', () => {
    expect(extractStagingTokens('')).toEqual([]);
  });

  it('returns empty array when no staging URLs are present', () => {
    const content = `Some text with a permanent URL /api/post-images/${VALID_UUID} and nothing else.`;
    expect(extractStagingTokens(content)).toEqual([]);
  });

  it('extracts a single staging token', () => {
    const content = `![img](/api/temp-upload/${VALID_UUID}/preview)`;
    expect(extractStagingTokens(content)).toEqual([VALID_UUID]);
  });

  it('extracts duplicate staging tokens (same URL used twice)', () => {
    const content = [
      `![img1](/api/temp-upload/${VALID_UUID}/preview)`,
      `![img2](/api/temp-upload/${VALID_UUID}/preview)`,
    ].join('\n');
    const tokens = extractStagingTokens(content);
    expect(tokens).toEqual([VALID_UUID, VALID_UUID]);
  });

  it('extracts only staging tokens from mixed content', () => {
    const content = [
      `![staging](/api/temp-upload/${VALID_UUID}/preview)`,
      `![permanent](/api/post-images/${VALID_UUID_2})`,
      `![external](https://example.com/photo.jpg)`,
      `Some plain text here.`,
      `![staging2](/api/temp-upload/${VALID_UUID_2}/preview)`,
    ].join('\n');
    const tokens = extractStagingTokens(content);
    expect(tokens).toEqual([VALID_UUID, VALID_UUID_2]);
  });

  it('does not extract tokens from permanent URLs', () => {
    const content = `![img](/api/post-images/${VALID_UUID})`;
    expect(extractStagingTokens(content)).toEqual([]);
  });

  it('does not extract tokens from external URLs', () => {
    const content = '![img](https://cdn.example.com/image.png)';
    expect(extractStagingTokens(content)).toEqual([]);
  });

  it('extracts tokens from staging URLs not wrapped in markdown image syntax', () => {
    // The function scans for the URL pattern, not markdown image syntax
    const content = `Check this link: /api/temp-upload/${VALID_UUID}/preview`;
    expect(extractStagingTokens(content)).toEqual([VALID_UUID]);
  });
});
