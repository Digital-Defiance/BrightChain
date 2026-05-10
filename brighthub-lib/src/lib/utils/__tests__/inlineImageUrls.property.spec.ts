/**
 * Property-based tests for inline image URL utilities
 *
 * Feature: brighthub-post-images
 * Property 6: Staging URL extraction correctness
 * Validates: Requirements 5.1
 *
 * Tests that extractStagingTokens() returns exactly the set of UUID v4 tokens
 * from staging URLs and no others (no permanent file IDs, no arbitrary text).
 */
import fc from 'fast-check';
import {
  countInlineImages,
  extractPermanentFileIds,
  extractStagingTokens,
  getHubImageContainerName,
  getUserImageContainerName,
  stripExternalImageUrls,
} from '../inlineImageUrls';

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
 * Generate a staging URL from a UUID v4 token.
 */
const stagingUrlArb = uuidV4Arb.map(
  (uuid) => `/api/temp-upload/${uuid}/preview`,
);

/**
 * Generate a permanent URL from a UUID v4 token.
 */
const permanentUrlArb = uuidV4Arb.map((uuid) => `/api/post-images/${uuid}`);

/**
 * Generate arbitrary text that does NOT accidentally contain a staging URL pattern.
 * We use alphanumeric + common punctuation to avoid false matches.
 */
const safeChars =
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 .,!?\n\t-_=+@#%^&*()[]{}|;:\'"<>'.split(
    '',
  );
const safeTextArb = fc
  .array(fc.constantFrom(...safeChars), { minLength: 0, maxLength: 100 })
  .map((chars) => chars.join(''));

describe('Feature: brighthub-post-images, Property 6: Staging URL extraction correctness', () => {
  /**
   * Property: extractStagingTokens returns exactly the staging UUID tokens
   * embedded in the content, in order.
   *
   * **Validates: Requirements 5.1**
   */
  it('extracts all staging tokens from content containing only staging URLs', () => {
    fc.assert(
      fc.property(
        fc.array(uuidV4Arb, { minLength: 1, maxLength: 10 }),
        safeTextArb,
        (uuids, filler) => {
          // Build content with staging URLs interspersed with filler text
          const content = uuids
            .map(
              (uuid) => `${filler} /api/temp-upload/${uuid}/preview ${filler}`,
            )
            .join('\n');

          const tokens = extractStagingTokens(content);

          // Should return exactly the UUIDs we embedded (lowercased, since regex is case-insensitive)
          expect(tokens).toHaveLength(uuids.length);
          tokens.forEach((token, i) => {
            expect(token.toLowerCase()).toBe(uuids[i].toLowerCase());
          });
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: extractStagingTokens returns an empty array when content
   * contains no staging URLs.
   *
   * **Validates: Requirements 5.1**
   */
  it('returns empty array when content has no staging URLs', () => {
    fc.assert(
      fc.property(safeTextArb, (text) => {
        const tokens = extractStagingTokens(text);
        expect(tokens).toEqual([]);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: extractStagingTokens does NOT return permanent file IDs.
   * Content with only permanent URLs should yield zero staging tokens.
   *
   * **Validates: Requirements 5.1**
   */
  it('does not extract permanent URL file IDs as staging tokens', () => {
    fc.assert(
      fc.property(
        fc.array(permanentUrlArb, { minLength: 1, maxLength: 10 }),
        safeTextArb,
        (permanentUrls, filler) => {
          const content = permanentUrls
            .map((url) => `${filler} ${url} ${filler}`)
            .join('\n');

          const stagingTokens = extractStagingTokens(content);
          expect(stagingTokens).toEqual([]);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: When content contains a mix of staging URLs, permanent URLs,
   * and arbitrary text, extractStagingTokens returns ONLY the staging tokens
   * and extractPermanentFileIds returns ONLY the permanent file IDs.
   * The two sets are disjoint.
   *
   * **Validates: Requirements 5.1**
   */
  it('extracts only staging tokens from mixed content (staging + permanent + text)', () => {
    fc.assert(
      fc.property(
        fc.array(uuidV4Arb, { minLength: 1, maxLength: 5 }),
        fc.array(uuidV4Arb, { minLength: 1, maxLength: 5 }),
        safeTextArb,
        (stagingUuids, permanentUuids, filler) => {
          // Build mixed content
          const stagingParts = stagingUuids.map(
            (uuid) => `![img](/api/temp-upload/${uuid}/preview)`,
          );
          const permanentParts = permanentUuids.map(
            (uuid) => `![img](/api/post-images/${uuid})`,
          );
          const allParts = [...stagingParts, ...permanentParts, filler];
          const content = allParts.join('\n');

          const stagingTokens = extractStagingTokens(content);
          const permanentIds = extractPermanentFileIds(content);

          // Staging tokens should match exactly the staging UUIDs
          expect(stagingTokens).toHaveLength(stagingUuids.length);
          stagingTokens.forEach((token, i) => {
            expect(token.toLowerCase()).toBe(stagingUuids[i].toLowerCase());
          });

          // Permanent IDs should match exactly the permanent UUIDs
          expect(permanentIds).toHaveLength(permanentUuids.length);
          permanentIds.forEach((id, i) => {
            expect(id.toLowerCase()).toBe(permanentUuids[i].toLowerCase());
          });

          // The two sets should be disjoint (no overlap)
          const stagingSet = new Set(stagingTokens.map((t) => t.toLowerCase()));
          const permanentSet = new Set(
            permanentIds.map((id) => id.toLowerCase()),
          );
          for (const token of stagingSet) {
            expect(permanentSet.has(token)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: extractStagingTokens returns tokens in the order they appear
   * in the content string.
   *
   * **Validates: Requirements 5.1**
   */
  it('returns staging tokens in order of appearance', () => {
    fc.assert(
      fc.property(
        fc.array(uuidV4Arb, { minLength: 2, maxLength: 8 }),
        (uuids) => {
          const content = uuids
            .map((uuid) => `/api/temp-upload/${uuid}/preview`)
            .join(' some text ');

          const tokens = extractStagingTokens(content);

          expect(tokens).toHaveLength(uuids.length);
          for (let i = 0; i < tokens.length; i++) {
            expect(tokens[i].toLowerCase()).toBe(uuids[i].toLowerCase());
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 12: Staging URL validation
 *
 * Feature: brighthub-post-images
 * Validates: Requirements 11.1
 *
 * Tests that isStagingUrl() returns true if and only if the string exactly
 * matches `/api/temp-upload/{uuid-v4}/preview` where {uuid} is a valid UUID v4.
 * All near-misses (wrong UUID format, extra path segments, query parameters,
 * missing /preview suffix, wrong version digit, wrong variant digit) return false.
 */
import { isStagingUrl } from '../inlineImageUrls';

describe('Feature: brighthub-post-images, Property 12: Staging URL validation', () => {
  /**
   * Property: isStagingUrl returns true for any valid staging URL
   * constructed from a valid UUID v4.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns true for all valid staging URLs with UUID v4 tokens', () => {
    fc.assert(
      fc.property(uuidV4Arb, (uuid) => {
        const url = `/api/temp-upload/${uuid}/preview`;
        expect(isStagingUrl(url)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns true for uppercase hex in UUID
   * since the regex is case-insensitive.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns true for staging URLs with uppercase hex (case-insensitive)', () => {
    fc.assert(
      fc.property(uuidV4Arb, (uuid) => {
        const url = `/api/temp-upload/${uuid.toUpperCase()}/preview`;
        expect(isStagingUrl(url)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns true for mixed-case hex in UUID.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns true for staging URLs with mixed-case hex', () => {
    fc.assert(
      fc.property(uuidV4Arb, (uuid) => {
        // Randomly uppercase some characters
        const mixedCase = uuid
          .split('')
          .map((ch, i) => (i % 2 === 0 ? ch.toUpperCase() : ch))
          .join('');
        const url = `/api/temp-upload/${mixedCase}/preview`;
        expect(isStagingUrl(url)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns false for permanent URLs.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns false for permanent URLs', () => {
    fc.assert(
      fc.property(permanentUrlArb, (url) => {
        expect(isStagingUrl(url)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns false for arbitrary safe text
   * that does not match the staging URL pattern.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns false for arbitrary non-URL strings', () => {
    fc.assert(
      fc.property(safeTextArb, (text) => {
        expect(isStagingUrl(text)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns false when the staging URL has
   * extra path segments appended after /preview.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns false for staging URLs with extra path segments after /preview', () => {
    fc.assert(
      fc.property(
        uuidV4Arb,
        fc
          .array(
            fc.constantFrom(
              ...'abcdefghijklmnopqrstuvwxyz0123456789'.split(''),
            ),
            { minLength: 1, maxLength: 20 },
          )
          .map((chars) => chars.join('')),
        (uuid, extra) => {
          const url = `/api/temp-upload/${uuid}/preview/${extra}`;
          expect(isStagingUrl(url)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns false when the staging URL has
   * query parameters appended.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns false for staging URLs with query parameters', () => {
    fc.assert(
      fc.property(
        uuidV4Arb,
        fc
          .array(
            fc.constantFrom(
              ...'abcdefghijklmnopqrstuvwxyz0123456789=&'.split(''),
            ),
            { minLength: 1, maxLength: 30 },
          )
          .map((chars) => chars.join('')),
        (uuid, queryString) => {
          const url = `/api/temp-upload/${uuid}/preview?${queryString}`;
          expect(isStagingUrl(url)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns false when the /preview suffix is missing.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns false for staging URLs missing the /preview suffix', () => {
    fc.assert(
      fc.property(uuidV4Arb, (uuid) => {
        const url = `/api/temp-upload/${uuid}`;
        expect(isStagingUrl(url)).toBe(false);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns false when the UUID has the wrong
   * version digit (not 4). UUID v4 requires the 13th hex digit to be '4'.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns false for staging URLs with wrong UUID version digit', () => {
    fc.assert(
      fc.property(
        hexStringArb(8),
        hexStringArb(4),
        fc.constantFrom(
          '0',
          '1',
          '2',
          '3',
          '5',
          '6',
          '7',
          '8',
          '9',
          'a',
          'b',
          'c',
          'd',
          'e',
          'f',
        ),
        hexStringArb(3),
        fc.constantFrom('8', '9', 'a', 'b'),
        hexStringArb(3),
        hexStringArb(12),
        (p1, p2, wrongVersion, p3, variant, p4, p5) => {
          const uuid = `${p1}-${p2}-${wrongVersion}${p3}-${variant}${p4}-${p5}`;
          const url = `/api/temp-upload/${uuid}/preview`;
          expect(isStagingUrl(url)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns false when the UUID has the wrong
   * variant digit (not 8, 9, a, or b). UUID v4 requires the 17th hex
   * digit to be one of [89ab].
   *
   * **Validates: Requirements 11.1**
   */
  it('returns false for staging URLs with wrong UUID variant digit', () => {
    fc.assert(
      fc.property(
        hexStringArb(8),
        hexStringArb(4),
        hexStringArb(3),
        fc.constantFrom(
          '0',
          '1',
          '2',
          '3',
          '4',
          '5',
          '6',
          '7',
          'c',
          'd',
          'e',
          'f',
        ),
        hexStringArb(3),
        hexStringArb(12),
        (p1, p2, p3, wrongVariant, p4, p5) => {
          const uuid = `${p1}-${p2}-4${p3}-${wrongVariant}${p4}-${p5}`;
          const url = `/api/temp-upload/${uuid}/preview`;
          expect(isStagingUrl(url)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns false when there is a prefix
   * before the staging URL path.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns false for staging URLs with a prefix before the path', () => {
    fc.assert(
      fc.property(
        uuidV4Arb,
        fc
          .array(
            fc.constantFrom(
              ...'abcdefghijklmnopqrstuvwxyz0123456789/'.split(''),
            ),
            { minLength: 1, maxLength: 20 },
          )
          .map((chars) => chars.join('')),
        (uuid, prefix) => {
          const url = `${prefix}/api/temp-upload/${uuid}/preview`;
          expect(isStagingUrl(url)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: isStagingUrl returns false for UUIDs with wrong segment lengths.
   * A valid UUID v4 has the format 8-4-4-4-12 hex characters.
   *
   * **Validates: Requirements 11.1**
   */
  it('returns false for staging URLs with wrong UUID segment lengths', () => {
    fc.assert(
      fc.property(
        // Generate segments with at least one wrong length
        fc.oneof(
          // First segment too short or too long
          fc
            .tuple(
              hexStringArb(7),
              hexStringArb(4),
              hexStringArb(3),
              fc.constantFrom('8', '9', 'a', 'b'),
              hexStringArb(3),
              hexStringArb(12),
            )
            .map(
              ([p1, p2, p3, v, p4, p5]) => `${p1}-${p2}-4${p3}-${v}${p4}-${p5}`,
            ),
          fc
            .tuple(
              hexStringArb(9),
              hexStringArb(4),
              hexStringArb(3),
              fc.constantFrom('8', '9', 'a', 'b'),
              hexStringArb(3),
              hexStringArb(12),
            )
            .map(
              ([p1, p2, p3, v, p4, p5]) => `${p1}-${p2}-4${p3}-${v}${p4}-${p5}`,
            ),
          // Last segment too short or too long
          fc
            .tuple(
              hexStringArb(8),
              hexStringArb(4),
              hexStringArb(3),
              fc.constantFrom('8', '9', 'a', 'b'),
              hexStringArb(3),
              hexStringArb(11),
            )
            .map(
              ([p1, p2, p3, v, p4, p5]) => `${p1}-${p2}-4${p3}-${v}${p4}-${p5}`,
            ),
          fc
            .tuple(
              hexStringArb(8),
              hexStringArb(4),
              hexStringArb(3),
              fc.constantFrom('8', '9', 'a', 'b'),
              hexStringArb(3),
              hexStringArb(13),
            )
            .map(
              ([p1, p2, p3, v, p4, p5]) => `${p1}-${p2}-4${p3}-${v}${p4}-${p5}`,
            ),
        ),
        (malformedUuid) => {
          const url = `/api/temp-upload/${malformedUuid}/preview`;
          expect(isStagingUrl(url)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 13: External URL stripping
 *
 * Feature: brighthub-post-images
 * Validates: Requirements 11.2, 11.4
 *
 * Tests that stripExternalImageUrls() preserves staging and permanent image
 * markdown, strips external image markdown, and leaves non-image text unchanged.
 */

/**
 * Generate an external URL (http, https, or data scheme) that is NOT
 * a staging or permanent URL.
 */
const externalUrlArb = fc.oneof(
  fc
    .tuple(
      fc.constantFrom('http', 'https'),
      fc
        .array(
          fc.constantFrom(
            ...'abcdefghijklmnopqrstuvwxyz0123456789-.'.split(''),
          ),
          { minLength: 3, maxLength: 30 },
        )
        .map((chars) => chars.join('')),
      fc
        .array(
          fc.constantFrom(
            ...'abcdefghijklmnopqrstuvwxyz0123456789/._-'.split(''),
          ),
          { minLength: 1, maxLength: 40 },
        )
        .map((chars) => chars.join('')),
    )
    .map(([scheme, domain, path]) => `${scheme}://${domain}.com/${path}`),
  fc
    .array(
      fc.constantFrom(
        ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.split(
          '',
        ),
      ),
      { minLength: 10, maxLength: 50 },
    )
    .map((chars) => `data:image/png;base64,${chars.join('')}`),
);

/**
 * Generate markdown image syntax with a given URL arbitrary.
 */
function markdownImageArb(urlArb: fc.Arbitrary<string>) {
  const altTextArb = fc
    .array(
      fc.constantFrom(
        ...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(
          '',
        ),
      ),
      { minLength: 0, maxLength: 20 },
    )
    .map((chars) => chars.join(''));

  return fc.tuple(altTextArb, urlArb).map(([alt, url]) => `![${alt}](${url})`);
}

const stagingImageMdArb = markdownImageArb(stagingUrlArb);
const permanentImageMdArb = markdownImageArb(permanentUrlArb);
const externalImageMdArb = markdownImageArb(externalUrlArb);

/**
 * Generate non-image text that won't accidentally contain markdown image syntax.
 * Avoids `![` sequences.
 */
const nonImageTextArb = fc
  .array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,;:\n\t-_=+@#%^&*'.split(
        '',
      ),
    ),
    { minLength: 1, maxLength: 60 },
  )
  .map((chars) => chars.join(''))
  .filter((text) => !text.includes('!['));

describe('Feature: brighthub-post-images, Property 13: External URL stripping', () => {
  /**
   * Property: Content with only staging image markdown is preserved unchanged.
   *
   * **Validates: Requirements 11.2, 11.4**
   */
  it('preserves content containing only staging image markdown', () => {
    fc.assert(
      fc.property(
        fc.array(stagingImageMdArb, { minLength: 1, maxLength: 5 }),
        nonImageTextArb,
        (images, filler) => {
          const content = images.join(`\n${filler}\n`);
          const result = stripExternalImageUrls(content);
          expect(result).toBe(content);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Content with only permanent image markdown is preserved unchanged.
   *
   * **Validates: Requirements 11.2, 11.4**
   */
  it('preserves content containing only permanent image markdown', () => {
    fc.assert(
      fc.property(
        fc.array(permanentImageMdArb, { minLength: 1, maxLength: 5 }),
        nonImageTextArb,
        (images, filler) => {
          const content = images.join(`\n${filler}\n`);
          const result = stripExternalImageUrls(content);
          expect(result).toBe(content);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Content with only external image markdown has all images stripped.
   * The result should contain zero markdown image entries.
   *
   * **Validates: Requirements 11.2, 11.4**
   */
  it('strips all external image markdown from content', () => {
    fc.assert(
      fc.property(
        fc.array(externalImageMdArb, { minLength: 1, maxLength: 5 }),
        (images) => {
          const content = images.join('\nsome text\n');
          const result = stripExternalImageUrls(content);
          // No markdown images should remain
          expect(countInlineImages(result)).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Mixed content preserves staging and permanent images,
   * strips external images, and leaves non-image text unchanged.
   *
   * **Validates: Requirements 11.2, 11.4**
   */
  it('preserves staging/permanent images, strips external, keeps non-image text', () => {
    fc.assert(
      fc.property(
        fc.array(stagingImageMdArb, { minLength: 1, maxLength: 3 }),
        fc.array(permanentImageMdArb, { minLength: 1, maxLength: 3 }),
        fc.array(externalImageMdArb, { minLength: 1, maxLength: 3 }),
        nonImageTextArb,
        (stagingImages, permanentImages, externalImages, filler) => {
          // Build content with all three types interleaved with filler
          const parts = [
            filler,
            ...stagingImages,
            filler,
            ...permanentImages,
            filler,
            ...externalImages,
            filler,
          ];
          const content = parts.join('\n');
          const result = stripExternalImageUrls(content);

          // All staging images should be present in result
          for (const img of stagingImages) {
            expect(result).toContain(img);
          }

          // All permanent images should be present in result
          for (const img of permanentImages) {
            expect(result).toContain(img);
          }

          // No external images should be present in result
          for (const img of externalImages) {
            expect(result).not.toContain(img);
          }

          // Non-image filler text should be preserved
          expect(result).toContain(filler);

          // Total image count should equal staging + permanent only
          expect(countInlineImages(result)).toBe(
            stagingImages.length + permanentImages.length,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Content with no image markdown is returned unchanged.
   *
   * **Validates: Requirements 11.2, 11.4**
   */
  it('returns content unchanged when there are no image markdown entries', () => {
    fc.assert(
      fc.property(nonImageTextArb, (text) => {
        const result = stripExternalImageUrls(text);
        expect(result).toBe(text);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 11: Vault container naming convention
 *
 * Feature: brighthub-post-images
 * Validates: Requirements 10.3, 10.4
 *
 * Tests that getHubImageContainerName(hubId) returns `hub-{hubId}-images`
 * and getUserImageContainerName(userId) returns `user-{userId}-post-images`,
 * and that the naming is deterministic (same input always produces same output).
 */

/**
 * Generate an alphanumeric ID string (simulating various ID formats).
 */
const alphanumericIdArb = fc
  .array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split(
        '',
      ),
    ),
    { minLength: 1, maxLength: 40 },
  )
  .map((chars) => chars.join(''));

/**
 * Generate a UUID v4 string for use as an ID.
 */
const idUuidV4Arb = fc
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
 * Arbitrary that produces various ID formats (UUIDs and alphanumeric strings).
 */
const anyIdArb = fc.oneof(idUuidV4Arb, alphanumericIdArb);

describe('Feature: brighthub-post-images, Property 11: Vault container naming convention', () => {
  /**
   * Property: Hub container name always equals `hub-{hubId}-images` for any hubId.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('hub container name equals hub-{hubId}-images for any hubId', () => {
    fc.assert(
      fc.property(anyIdArb, (hubId) => {
        const result = getHubImageContainerName(hubId);
        expect(result).toBe(`hub-${hubId}-images`);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: User container name always equals `user-{userId}-post-images` for any userId.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('user container name equals user-{userId}-post-images for any userId', () => {
    fc.assert(
      fc.property(anyIdArb, (userId) => {
        const result = getUserImageContainerName(userId);
        expect(result).toBe(`user-${userId}-post-images`);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Deterministic — calling getHubImageContainerName twice with the
   * same input produces the same output.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('getHubImageContainerName is deterministic (same input → same output)', () => {
    fc.assert(
      fc.property(anyIdArb, (hubId) => {
        const result1 = getHubImageContainerName(hubId);
        const result2 = getHubImageContainerName(hubId);
        expect(result1).toBe(result2);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Deterministic — calling getUserImageContainerName twice with the
   * same input produces the same output.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('getUserImageContainerName is deterministic (same input → same output)', () => {
    fc.assert(
      fc.property(anyIdArb, (userId) => {
        const result1 = getUserImageContainerName(userId);
        const result2 = getUserImageContainerName(userId);
        expect(result1).toBe(result2);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Different hub IDs produce different container names.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('different hub IDs produce different hub container names', () => {
    fc.assert(
      fc.property(
        anyIdArb,
        anyIdArb.filter((id) => id.length > 0),
        (id1, id2) => {
          fc.pre(id1 !== id2);
          const name1 = getHubImageContainerName(id1);
          const name2 = getHubImageContainerName(id2);
          expect(name1).not.toBe(name2);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property: Different user IDs produce different user container names.
   *
   * **Validates: Requirements 10.3, 10.4**
   */
  it('different user IDs produce different user container names', () => {
    fc.assert(
      fc.property(
        anyIdArb,
        anyIdArb.filter((id) => id.length > 0),
        (id1, id2) => {
          fc.pre(id1 !== id2);
          const name1 = getUserImageContainerName(id1);
          const name2 = getUserImageContainerName(id2);
          expect(name1).not.toBe(name2);
        },
      ),
      { numRuns: 100 },
    );
  });
});
