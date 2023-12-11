/**
 * Property-based tests for server icon validation helpers.
 *
 * Feature: brightchat-server-icon-upload
 * Properties: 2, 3
 *
 * Validates: Requirements 2.2, 2.3
 */

import { describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import {
  DEFAULT_SERVER_ICON_CONFIG,
  isAllowedIconFileSize,
  isAllowedIconMimeType,
} from '../serverIconConfig';

describe('Feature: brightchat-server-icon-upload, Property 2: Icon MIME type validation', () => {
  /**
   * **Property 2: Icon MIME type validation**
   *
   * For any MIME type string M, `isAllowedIconMimeType(M)` returns true
   * if and only if M is one of the four allowed types:
   * ['image/png', 'image/jpeg', 'image/gif', 'image/webp']
   *
   * **Validates: Requirements 2.2**
   */
  it('accepts exactly the four allowed MIME types', () => {
    const allowedTypes = DEFAULT_SERVER_ICON_CONFIG.allowedMimeTypes;

    fc.assert(
      fc.property(fc.string(), (mimeType) => {
        const result = isAllowedIconMimeType(mimeType);
        const expected = allowedTypes.includes(mimeType);

        // The function should return true if and only if the MIME type
        // is in the allowed list
        expect(result).toBe(expected);
      }),
    );
  });

  it('accepts all four allowed MIME types explicitly', () => {
    expect(isAllowedIconMimeType('image/png')).toBe(true);
    expect(isAllowedIconMimeType('image/jpeg')).toBe(true);
    expect(isAllowedIconMimeType('image/gif')).toBe(true);
    expect(isAllowedIconMimeType('image/webp')).toBe(true);
  });

  it('rejects common non-allowed MIME types', () => {
    expect(isAllowedIconMimeType('image/svg+xml')).toBe(false);
    expect(isAllowedIconMimeType('image/bmp')).toBe(false);
    expect(isAllowedIconMimeType('image/tiff')).toBe(false);
    expect(isAllowedIconMimeType('application/pdf')).toBe(false);
    expect(isAllowedIconMimeType('text/plain')).toBe(false);
    expect(isAllowedIconMimeType('')).toBe(false);
  });
});

describe('Feature: brightchat-server-icon-upload, Property 3: Icon file size validation', () => {
  /**
   * **Property 3: Icon file size validation**
   *
   * For any file size S bytes, `isAllowedIconFileSize(S)` returns true
   * if and only if S ≤ 5,242,880 (5MB). Files exceeding this limit are rejected.
   *
   * **Validates: Requirements 2.3**
   */
  it('accepts sizes ≤ 5MB and rejects larger sizes', () => {
    const maxSize = DEFAULT_SERVER_ICON_CONFIG.maxFileSizeBytes; // 5MB

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 10 * 1024 * 1024 }),
        (sizeBytes) => {
          const result = isAllowedIconFileSize(sizeBytes);
          const expected = sizeBytes <= maxSize;

          // The function should return true if and only if the size
          // is within the allowed limit
          expect(result).toBe(expected);
        },
      ),
    );
  });

  it('accepts file sizes at boundary conditions', () => {
    const maxSize = DEFAULT_SERVER_ICON_CONFIG.maxFileSizeBytes;

    // Zero bytes (empty file)
    expect(isAllowedIconFileSize(0)).toBe(true);

    // Exactly at the limit
    expect(isAllowedIconFileSize(maxSize)).toBe(true);

    // One byte over the limit
    expect(isAllowedIconFileSize(maxSize + 1)).toBe(false);

    // Well under the limit (1MB)
    expect(isAllowedIconFileSize(1024 * 1024)).toBe(true);

    // Well over the limit (10MB)
    expect(isAllowedIconFileSize(10 * 1024 * 1024)).toBe(false);
  });
});
