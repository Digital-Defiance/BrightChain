/**
 * Unit tests for isAllowedImageUrl.
 *
 * Validates that the function accepts both permanent post-image URLs
 * and staging preview URLs while rejecting external URLs, empty strings,
 * and data URIs.
 */
import { isAllowedImageUrl } from '../inlineImageUrls';

describe('isAllowedImageUrl', () => {
  it('returns true for a permanent URL with UUID', () => {
    expect(
      isAllowedImageUrl(
        '/api/post-images/a1b2c3d4-e5f6-4a90-abcd-ef1234567890',
      ),
    ).toBe(true);
  });

  it('returns true for a permanent URL with base64 ID', () => {
    expect(
      isAllowedImageUrl('/api/post-images/qiQkdhLZSYmw8giMFGK22w=='),
    ).toBe(true);
  });

  it('returns true for a staging URL', () => {
    expect(
      isAllowedImageUrl(
        '/api/temp-upload/c3d4e5f6-a7b8-4c12-9def-012345678902/preview',
      ),
    ).toBe(true);
  });

  it('returns false for an external URL', () => {
    expect(isAllowedImageUrl('https://evil.com/image.png')).toBe(false);
  });

  it('returns false for an empty string', () => {
    expect(isAllowedImageUrl('')).toBe(false);
  });

  it('returns false for a data URI', () => {
    expect(isAllowedImageUrl('data:image/png;base64,abc')).toBe(false);
  });
});
