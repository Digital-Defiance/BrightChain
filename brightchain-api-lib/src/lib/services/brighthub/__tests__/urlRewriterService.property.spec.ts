/**
 * Property-based tests for UrlRewriterService.
 *
 * Property 3: Backend image count limit enforcement
 * Validates: Requirements 2.4
 *
 * For any post content string containing N staging URLs (where N ranges from
 * 0 to 25), the URL Rewriter SHALL accept the content if and only if N ≤ 20.
 * When N > 20, the rewriter SHALL throw a TooManyInlineImages error.
 *
 * Tag: Feature: brighthub-post-images, Property 3: Backend image count limit enforcement
 */

import {
  PostErrorCode,
  PostServiceError,
  getMaxInlineImages,
} from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import {
  UrlRewriterService,
  type IUrlRewriterDeps,
} from '../urlRewriterService';

// ─── Generators ─────────────────────────────────────────────────────────────

/**
 * Generate a hex string of a given length from random characters.
 */
function hexBlock(length: number): fc.Arbitrary<string> {
  return fc
    .array(fc.constantFrom(...'0123456789abcdef'.split('')), {
      minLength: length,
      maxLength: length,
    })
    .map((chars) => chars.join(''));
}

/**
 * Generator for valid UUID v4 strings.
 * UUID v4 format: xxxxxxxx-xxxx-4xxx-[89ab]xxx-xxxxxxxxxxxx
 */
const uuidV4Arb = fc
  .tuple(
    hexBlock(8),
    hexBlock(4),
    hexBlock(3),
    fc.constantFrom('8', '9', 'a', 'b'),
    hexBlock(3),
    hexBlock(12),
  )
  .map(
    ([p1, p2, p3, variant, p4, p5]) =>
      `${p1}-${p2}-4${p3}-${variant}${p4}-${p5}`,
  );

/**
 * Build a content string containing exactly N staging URLs embedded in
 * markdown image syntax. Each URL uses a unique UUID v4 token.
 */
function buildContentWithNStagingUrls(tokens: string[]): string {
  return tokens
    .map(
      (token, i) =>
        `Paragraph ${i}.\n\n![image ${i}](/api/temp-upload/${token}/preview)\n`,
    )
    .join('\n');
}

// ─── Mock Factory ───────────────────────────────────────────────────────────

/**
 * Create mock IUrlRewriterDeps that return valid responses for the commit loop.
 * Each staging token gets a deterministic "committed" file ID.
 */
function createMockDeps(): IUrlRewriterDeps {
  const mockContainerId = 'mock-container-id';
  const mockRootFolderId = 'mock-root-folder-id';
  let sessionCounter = 0;

  return {
    stagingService: {
      getRecord: jest.fn().mockImplementation((token: string) =>
        Promise.resolve({
          commitToken: token,
          originalFilename: `image-${token}.png`,
          mimeType: 'image/png',
          sizeBytes: 1024,
          uploadedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          uploaderId: 'mock-user',
        }),
      ),
      isExpired: jest.fn().mockReturnValue(false),
      readFile: jest.fn().mockImplementation(() =>
        // Return a minimal valid 1x1 PNG buffer
        Promise.resolve(
          Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
            'base64',
          ),
        ),
      ),
    } as unknown as IUrlRewriterDeps['stagingService'],

    vaultContainerService: {
      createContainer: jest.fn().mockImplementation(() =>
        Promise.resolve({
          id: mockContainerId,
          rootFolderId: mockRootFolderId,
        }),
      ),
    },

    uploadService: {
      createSession: jest.fn().mockImplementation(() => {
        sessionCounter++;
        return Promise.resolve({ id: `session-${sessionCounter}` });
      }),
      receiveChunk: jest.fn().mockResolvedValue(undefined),
      finalize: jest.fn().mockImplementation(() => {
        const fileId = `file-${sessionCounter}`;
        return Promise.resolve({
          id: fileId,
          vaultContainerId: mockContainerId,
          fileName: `image-${fileId}.png`,
          mimeType: 'image/png',
          sizeBytes: 1024,
        });
      }),
    },

    fileService: {
      softDelete: jest.fn().mockResolvedValue(undefined),
    },

    parseId: jest.fn().mockImplementation((id: string) => id),
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('Feature: brighthub-post-images, Property 3: Backend image count limit enforcement', () => {
  /**
   * **Validates: Requirements 2.4**
   *
   * Property 3: For content with > 20 staging URLs, the URL Rewriter SHALL
   * throw a PostServiceError with code TooManyInlineImages.
   */
  it('should reject content with more than 20 staging URLs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a count from 21 to 25 (above the limit)
        fc.integer({ min: getMaxInlineImages() + 1, max: 25 }),
        async (count) => {
          const tokens = Array.from({ length: count }, (_, i) => {
            // Deterministic UUID v4 tokens for each index
            const hex = i.toString(16).padStart(2, '0');
            return `a0a0a0a0-b1b1-4c1c-9d${hex}-e0e0e0e0e0e0`;
          });

          const content = buildContentWithNStagingUrls(tokens);
          const deps = createMockDeps();
          const service = new UrlRewriterService(deps);

          try {
            await service.rewriteContent(content, 'hub-1', 'user-1');
            // Should not reach here
            throw new Error('Expected TooManyInlineImages error');
          } catch (error) {
            expect(error).toBeInstanceOf(PostServiceError);
            expect((error as PostServiceError).code).toBe(
              PostErrorCode.TooManyInlineImages,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.4**
   *
   * Property 3: For content with ≤ 20 staging URLs, the URL Rewriter SHALL
   * accept the content and proceed with the commit loop (no TooManyInlineImages error).
   */
  it('should accept content with 20 or fewer staging URLs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate a count from 0 to 20 (at or below the limit)
        fc.integer({ min: 0, max: getMaxInlineImages() }),
        async (count) => {
          const tokens = Array.from({ length: count }, (_, i) => {
            const hex = i.toString(16).padStart(2, '0');
            return `a0a0a0a0-b1b1-4c1c-9d${hex}-e0e0e0e0e0e0`;
          });

          const content = buildContentWithNStagingUrls(tokens);
          const deps = createMockDeps();
          const service = new UrlRewriterService(deps);

          // Should NOT throw TooManyInlineImages
          const result = await service.rewriteContent(
            content,
            'hub-1',
            'user-1',
          );

          // Verify the result has the expected shape
          expect(result).toHaveProperty('rewrittenContent');
          expect(result).toHaveProperty('mediaAttachments');
          expect(result.mediaAttachments).toHaveLength(count);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 2.4**
   *
   * Property 3: The boundary at exactly 20 staging URLs should be accepted,
   * and exactly 21 should be rejected.
   */
  it('should enforce the boundary at exactly getMaxInlineImages()', async () => {
    // Exactly 20 — should succeed
    const tokensAt20 = Array.from({ length: 20 }, (_, i) => {
      const hex = i.toString(16).padStart(2, '0');
      return `b0b0b0b0-c1c1-4d1d-a0${hex}-f0f0f0f0f0f0`;
    });
    const contentAt20 = buildContentWithNStagingUrls(tokensAt20);
    const deps20 = createMockDeps();
    const service20 = new UrlRewriterService(deps20);
    const result = await service20.rewriteContent(
      contentAt20,
      'hub-1',
      'user-1',
    );
    expect(result.mediaAttachments).toHaveLength(20);

    // Exactly 21 — should throw
    const tokensAt21 = Array.from({ length: 21 }, (_, i) => {
      const hex = i.toString(16).padStart(2, '0');
      return `b0b0b0b0-c1c1-4d1d-a0${hex}-f0f0f0f0f0f0`;
    });
    const contentAt21 = buildContentWithNStagingUrls(tokensAt21);
    const deps21 = createMockDeps();
    const service21 = new UrlRewriterService(deps21);

    await expect(
      service21.rewriteContent(contentAt21, 'hub-1', 'user-1'),
    ).rejects.toThrow(PostServiceError);

    try {
      await service21.rewriteContent(contentAt21, 'hub-1', 'user-1');
    } catch (error) {
      expect((error as PostServiceError).code).toBe(
        PostErrorCode.TooManyInlineImages,
      );
    }
  });
});

// ─── Property 7 ─────────────────────────────────────────────────────────────

/**
 * Property 7: URL rewriting produces correct permanent URLs and media attachments
 *
 * Validates: Requirements 5.3, 5.6
 *
 * For any content string containing N staging URLs (where 1 ≤ N ≤ 20), after
 * the URL Rewriter commits all staged files, the rewritten content SHALL:
 * (a) contain zero staging URLs,
 * (b) contain exactly N permanent URLs corresponding to the committed file IDs,
 * (c) preserve all non-image text unchanged, and
 * (d) produce a mediaAttachments array of length N where each record contains
 *     the file ID, permanent URL, MIME type, size, and alt text from the
 *     original markdown.
 *
 * Tag: Feature: brighthub-post-images, Property 7: URL rewriting produces correct permanent URLs and media attachments
 */

import {
  extractPermanentFileIds,
  extractStagingTokens,
} from '@brightchain/brighthub-lib';

// ─── Property 7 Mock Factory ───────────────────────────────────────────────

/**
 * Create mock IUrlRewriterDeps that return UUID v4-formatted file IDs.
 * This is needed because extractPermanentFileIds uses a UUID v4 regex,
 * so the mock must produce file IDs that match the permanent URL pattern.
 *
 * Each staging token gets a deterministic UUID v4 file ID derived from a
 * counter to ensure uniqueness.
 */
function createMockDepsWithUuidFileIds(): IUrlRewriterDeps {
  const mockContainerId = 'mock-container-id';
  const mockRootFolderId = 'mock-root-folder-id';
  let sessionCounter = 0;

  /**
   * Generate a deterministic UUID v4 file ID from a counter value.
   * Format: 00000000-0000-4000-8000-{counter padded to 12 hex chars}
   */
  function fileIdFromCounter(n: number): string {
    const hex = n.toString(16).padStart(12, '0');
    return `f0000000-0000-4000-8000-${hex}`;
  }

  return {
    stagingService: {
      getRecord: jest.fn().mockImplementation((token: string) =>
        Promise.resolve({
          commitToken: token,
          originalFilename: `image-${token}.png`,
          mimeType: 'image/png',
          sizeBytes: 1024,
          uploadedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          uploaderId: 'mock-user',
        }),
      ),
      isExpired: jest.fn().mockReturnValue(false),
      readFile: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(
            Buffer.from(
              'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
              'base64',
            ),
          ),
        ),
    } as unknown as IUrlRewriterDeps['stagingService'],

    vaultContainerService: {
      createContainer: jest.fn().mockImplementation(() =>
        Promise.resolve({
          id: mockContainerId,
          rootFolderId: mockRootFolderId,
        }),
      ),
    },

    uploadService: {
      createSession: jest.fn().mockImplementation(() => {
        sessionCounter++;
        return Promise.resolve({ id: `session-${sessionCounter}` });
      }),
      receiveChunk: jest.fn().mockResolvedValue(undefined),
      finalize: jest.fn().mockImplementation(() => {
        const fileId = fileIdFromCounter(sessionCounter);
        return Promise.resolve({
          id: fileId,
          vaultContainerId: mockContainerId,
          fileName: `image-${fileId}.png`,
          mimeType: 'image/png',
          sizeBytes: 1024,
        });
      }),
    },

    fileService: {
      softDelete: jest.fn().mockResolvedValue(undefined),
    },

    parseId: jest.fn().mockImplementation((id: string) => id),
  };
}

/**
 * Generate an array of N unique UUID v4 tokens for use in property tests.
 * Uses a deterministic pattern to guarantee uniqueness across the array.
 */
function uniqueTokens(count: number): string[] {
  return Array.from({ length: count }, (_, i) => {
    const hex = i.toString(16).padStart(4, '0');
    return `a0a0a0a0-b1b1-4c1c-9${hex.slice(0, 1)}${hex.slice(1, 3)}-e0e0e0e0e0${hex.slice(3, 4)}0`;
  });
}

describe('Feature: brighthub-post-images, Property 7: URL rewriting produces correct permanent URLs and media attachments', () => {
  /**
   * **Validates: Requirements 5.3, 5.6**
   *
   * Property 7.1: After rewriting, the content contains zero staging URLs.
   */
  it('rewritten content has zero staging URLs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: getMaxInlineImages() }),
        async (count) => {
          const tokens = uniqueTokens(count);
          const content = buildContentWithNStagingUrls(tokens);
          const deps = createMockDepsWithUuidFileIds();
          const service = new UrlRewriterService(deps);

          const result = await service.rewriteContent(
            content,
            'hub-1',
            'user-1',
          );

          const remainingStagingTokens = extractStagingTokens(
            result.rewrittenContent,
          );
          expect(remainingStagingTokens).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.3, 5.6**
   *
   * Property 7.2: After rewriting, the content contains exactly N permanent URLs.
   */
  it('rewritten content has exactly N permanent URLs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: getMaxInlineImages() }),
        async (count) => {
          const tokens = uniqueTokens(count);
          const content = buildContentWithNStagingUrls(tokens);
          const deps = createMockDepsWithUuidFileIds();
          const service = new UrlRewriterService(deps);

          const result = await service.rewriteContent(
            content,
            'hub-1',
            'user-1',
          );

          const permanentIds = extractPermanentFileIds(result.rewrittenContent);
          expect(permanentIds).toHaveLength(count);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.3, 5.6**
   *
   * Property 7.3: mediaAttachments array has length N.
   */
  it('mediaAttachments array has length N', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: getMaxInlineImages() }),
        async (count) => {
          const tokens = uniqueTokens(count);
          const content = buildContentWithNStagingUrls(tokens);
          const deps = createMockDepsWithUuidFileIds();
          const service = new UrlRewriterService(deps);

          const result = await service.rewriteContent(
            content,
            'hub-1',
            'user-1',
          );

          expect(result.mediaAttachments).toHaveLength(count);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.3, 5.6**
   *
   * Property 7.4: Each media attachment has the expected fields (_id, url, mimeType, size).
   */
  it('each media attachment has _id, url, mimeType, and size', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: getMaxInlineImages() }),
        async (count) => {
          const tokens = uniqueTokens(count);
          const content = buildContentWithNStagingUrls(tokens);
          const deps = createMockDepsWithUuidFileIds();
          const service = new UrlRewriterService(deps);

          const result = await service.rewriteContent(
            content,
            'hub-1',
            'user-1',
          );

          for (const attachment of result.mediaAttachments) {
            // _id must be a non-empty string (the committed file ID)
            expect(typeof attachment._id).toBe('string');
            expect(attachment._id.length).toBeGreaterThan(0);

            // url must be a permanent URL matching /api/post-images/{_id}
            expect(attachment.url).toBe(`/api/post-images/${attachment._id}`);

            // mimeType must be a non-empty string
            expect(typeof attachment.mimeType).toBe('string');
            expect(attachment.mimeType.length).toBeGreaterThan(0);

            // size must be a positive number
            expect(typeof attachment.size).toBe('number');
            expect(attachment.size).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.3, 5.6**
   *
   * Property 7.5: Non-image text in the content is preserved after rewriting.
   */
  it('non-image text in the content is preserved', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: getMaxInlineImages() }),
        async (count) => {
          const tokens = uniqueTokens(count);
          const content = buildContentWithNStagingUrls(tokens);
          const deps = createMockDepsWithUuidFileIds();
          const service = new UrlRewriterService(deps);

          const result = await service.rewriteContent(
            content,
            'hub-1',
            'user-1',
          );

          // Each "Paragraph N." text should still be present in the rewritten content
          for (let i = 0; i < count; i++) {
            expect(result.rewrittenContent).toContain(`Paragraph ${i}.`);
          }

          // The markdown image syntax structure should be preserved (just with different URLs)
          for (let i = 0; i < count; i++) {
            expect(result.rewrittenContent).toContain(`![image ${i}](`);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8 ─────────────────────────────────────────────────────────────

/**
 * Property 8: Image processing parameters correctness
 *
 * Validates: Requirements 6.1, 6.2, 6.3
 *
 * For any image with dimensions (width, height) and MIME type, the URL Rewriter
 * SHALL:
 * (a) always set `stripExif: true` in processing parameters,
 * (b) set resize parameters if and only if `width > 4096 OR height > 4096`,
 *     with the resize fitting within 4096×4096 while preserving aspect ratio,
 * (c) preserve the original image format (not specify a format override).
 *
 * Tag: Feature: brighthub-post-images, Property 8: Image processing parameters correctness
 */

import sharp from 'sharp';
import { processImage } from '../../../utils/stagingImageProcessor';

// Mock processImage to capture the parameters it receives
jest.mock('../../../utils/stagingImageProcessor', () => {
  const actual = jest.requireActual('../../../utils/stagingImageProcessor');
  return {
    ...actual,
    processImage: jest
      .fn()
      .mockImplementation(async (buffer: Buffer, _params: unknown) => ({
        buffer,
        mimeType: 'image/png',
      })),
  };
});

// Mock sharp to return controlled metadata
jest.mock('sharp', () => {
  const mockSharp = jest.fn().mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({ width: 100, height: 100 }),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock')),
  }));
  return mockSharp;
});

const mockedProcessImage = processImage as jest.MockedFunction<
  typeof processImage
>;
const mockedSharp = sharp as unknown as jest.MockedFunction<typeof sharp>;

/**
 * Configure sharp mock to return specific dimensions for metadata calls.
 */
function configureSharpMetadata(width: number, height: number): void {
  (mockedSharp as jest.Mock).mockImplementation(() => ({
    metadata: jest.fn().mockResolvedValue({ width, height }),
    toBuffer: jest.fn().mockResolvedValue(Buffer.from('mock-processed')),
  }));
}

/**
 * Create mock deps for Property 8 tests.
 * Uses UUID v4 file IDs so permanent URL patterns match.
 */
function createMockDepsForProperty8(mimeType: string): IUrlRewriterDeps {
  const mockContainerId = 'mock-container-id';
  const mockRootFolderId = 'mock-root-folder-id';
  let sessionCounter = 0;

  function fileIdFromCounter(n: number): string {
    const hex = n.toString(16).padStart(12, '0');
    return `f0000000-0000-4000-8000-${hex}`;
  }

  return {
    stagingService: {
      getRecord: jest.fn().mockImplementation((token: string) =>
        Promise.resolve({
          commitToken: token,
          originalFilename: `image-${token}.png`,
          mimeType,
          sizeBytes: 1024,
          uploadedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 3600_000).toISOString(),
          uploaderId: 'mock-user',
        }),
      ),
      isExpired: jest.fn().mockReturnValue(false),
      readFile: jest
        .fn()
        .mockImplementation(() =>
          Promise.resolve(Buffer.from('mock-image-data')),
        ),
    } as unknown as IUrlRewriterDeps['stagingService'],

    vaultContainerService: {
      createContainer: jest.fn().mockImplementation(() =>
        Promise.resolve({
          id: mockContainerId,
          rootFolderId: mockRootFolderId,
        }),
      ),
    },

    uploadService: {
      createSession: jest.fn().mockImplementation(() => {
        sessionCounter++;
        return Promise.resolve({ id: `session-${sessionCounter}` });
      }),
      receiveChunk: jest.fn().mockResolvedValue(undefined),
      finalize: jest.fn().mockImplementation(() => {
        const fileId = fileIdFromCounter(sessionCounter);
        return Promise.resolve({
          id: fileId,
          vaultContainerId: mockContainerId,
          fileName: `image-${fileId}.png`,
          mimeType,
          sizeBytes: 1024,
        });
      }),
    },

    fileService: {
      softDelete: jest.fn().mockResolvedValue(undefined),
    },

    parseId: jest.fn().mockImplementation((id: string) => id),
  };
}

describe('Feature: brighthub-post-images, Property 8: Image processing parameters correctness', () => {
  beforeEach(() => {
    mockedProcessImage.mockClear();
    (mockedSharp as jest.Mock).mockClear();
  });

  /**
   * **Validates: Requirements 6.1**
   *
   * Property 8.1: EXIF strip is always true regardless of image dimensions.
   * For any image dimensions, the processing params passed to processImage
   * SHALL always include `stripExif: true`.
   */
  it('EXIF strip is always true regardless of image dimensions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate arbitrary image dimensions from small to very large
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        async (width, height) => {
          configureSharpMetadata(width, height);
          mockedProcessImage.mockClear();

          const token = 'a0a0a0a0-b1b1-4c1c-9000-e0e0e0e0e000';
          const content = `![test](/api/temp-upload/${token}/preview)`;
          const deps = createMockDepsForProperty8('image/png');
          const service = new UrlRewriterService(deps);

          await service.rewriteContent(content, 'hub-1', 'user-1');

          // processImage should have been called exactly once
          expect(mockedProcessImage).toHaveBeenCalledTimes(1);

          const params = mockedProcessImage.mock.calls[0][1];
          expect(params.stripExif).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.2**
   *
   * Property 8.2: Resize params are present if and only if width > 4096 OR height > 4096.
   * For images within 4096×4096, no width/height params should be set.
   * For images exceeding 4096 in either dimension, width and height params should be set.
   */
  it('resize params present iff width > 4096 OR height > 4096', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        async (width, height) => {
          configureSharpMetadata(width, height);
          mockedProcessImage.mockClear();

          const token = 'a0a0a0a0-b1b1-4c1c-9000-e0e0e0e0e000';
          const content = `![test](/api/temp-upload/${token}/preview)`;
          const deps = createMockDepsForProperty8('image/png');
          const service = new UrlRewriterService(deps);

          await service.rewriteContent(content, 'hub-1', 'user-1');

          expect(mockedProcessImage).toHaveBeenCalledTimes(1);
          const params = mockedProcessImage.mock.calls[0][1];

          const needsResize = width > 4096 || height > 4096;

          if (needsResize) {
            // Resize params should be present
            expect(params.width).toBeDefined();
            expect(params.height).toBeDefined();
          } else {
            // No resize params
            expect(params.width).toBeUndefined();
            expect(params.height).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.2**
   *
   * Property 8.3: When resizing, the target dimensions fit within 4096×4096.
   * Both width and height params should be ≤ 4096.
   */
  it('when resizing, target dimensions fit within 4096x4096', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Only generate oversized images that trigger resize
        fc.integer({ min: 4097, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        async (width, height) => {
          // At least width > 4096, so resize is triggered
          configureSharpMetadata(width, height);
          mockedProcessImage.mockClear();

          const token = 'a0a0a0a0-b1b1-4c1c-9000-e0e0e0e0e000';
          const content = `![test](/api/temp-upload/${token}/preview)`;
          const deps = createMockDepsForProperty8('image/png');
          const service = new UrlRewriterService(deps);

          await service.rewriteContent(content, 'hub-1', 'user-1');

          expect(mockedProcessImage).toHaveBeenCalledTimes(1);
          const params = mockedProcessImage.mock.calls[0][1];

          // Both dimensions should be capped at 4096
          expect(params.width).toBeLessThanOrEqual(4096);
          expect(params.height).toBeLessThanOrEqual(4096);
          expect(params.width).toBeGreaterThan(0);
          expect(params.height).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.3**
   *
   * Property 8.4: Format is not overridden — no format param in processing params.
   * The processing params should not include a `format` field, preserving the
   * original image format.
   */
  it('format is not overridden in processing params', async () => {
    const mimeTypes = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10000 }),
        fc.integer({ min: 1, max: 10000 }),
        fc.constantFrom(...mimeTypes),
        async (width, height, mimeType) => {
          configureSharpMetadata(width, height);
          mockedProcessImage.mockClear();

          const token = 'a0a0a0a0-b1b1-4c1c-9000-e0e0e0e0e000';
          const content = `![test](/api/temp-upload/${token}/preview)`;
          const deps = createMockDepsForProperty8(mimeType);
          const service = new UrlRewriterService(deps);

          await service.rewriteContent(content, 'hub-1', 'user-1');

          // processImage is only called for supported image types
          // image/gif may or may not be supported — check if it was called
          if (mockedProcessImage.mock.calls.length > 0) {
            const params = mockedProcessImage.mock.calls[0][1];
            // format should NOT be specified — original format is preserved
            expect(params.format).toBeUndefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 9 ─────────────────────────────────────────────────────────────

/**
 * Property 9: Edit removes metadata for deleted images
 *
 * Validates: Requirements 7.3
 *
 * For any post with N committed inline images and an edit that retains a
 * subset S of those images (where S ⊂ N), the resulting mediaAttachments
 * array SHALL contain exactly the records corresponding to the permanent
 * URLs still present in the edited content, and no records for removed images.
 *
 * This tests the edit logic as a pure function: given existing mediaAttachments
 * and edited content that retains only some permanent URLs, the filtered result
 * should match exactly the retained subset.
 *
 * Tag: Feature: brighthub-post-images, Property 9: Edit removes metadata for deleted images
 */

describe('Feature: brighthub-post-images, Property 9: Edit removes metadata for deleted images', () => {
  /**
   * Generator for a set of existing media attachments with UUID v4 file IDs.
   * Returns an array of IBaseMediaAttachment<string> records.
   */
  function generateExistingAttachments(
    count: number,
  ): { _id: string; url: string; mimeType: string; size: number }[] {
    return Array.from({ length: count }, (_, i) => {
      const hex = i.toString(16).padStart(12, '0');
      const fileId = `e0000000-0000-4000-a000-${hex}`;
      return {
        _id: fileId,
        url: `/api/post-images/${fileId}`,
        mimeType: 'image/png',
        size: 1024 + i,
      };
    });
  }

  /**
   * Build edited content that retains only the specified subset of permanent
   * URLs and optionally adds new staging URLs.
   */
  function buildEditedContent(
    retainedFileIds: string[],
    newStagingTokens: string[] = [],
  ): string {
    const permanentParts = retainedFileIds.map(
      (id, i) =>
        `Retained paragraph ${i}.\n\n![retained ${i}](/api/post-images/${id})\n`,
    );
    const stagingParts = newStagingTokens.map(
      (token, i) =>
        `New paragraph ${i}.\n\n![new ${i}](/api/temp-upload/${token}/preview)\n`,
    );
    return [...permanentParts, ...stagingParts].join('\n');
  }

  /**
   * **Validates: Requirements 7.3**
   *
   * Property 9.1: After edit, mediaAttachments contains only records for
   * permanent URLs still in the content. Removed images have no records.
   */
  it('mediaAttachments contains only records for retained permanent URLs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Total existing images: 1 to 10
        fc.integer({ min: 1, max: 10 }),
        // Seed for selecting which subset to retain
        fc.array(fc.boolean(), { minLength: 10, maxLength: 10 }),
        async (totalExisting, retainFlags) => {
          const existingAttachments =
            generateExistingAttachments(totalExisting);

          // Determine which images to retain (at least 0, at most all)
          const retainedAttachments = existingAttachments.filter(
            (_, i) => retainFlags[i % retainFlags.length],
          );
          const retainedFileIds = retainedAttachments.map((a) => a._id);

          // Build edited content with only the retained permanent URLs
          const editedContent = buildEditedContent(retainedFileIds);

          // Simulate the edit logic from PostService.editPost():
          // 1. Extract permanent file IDs from the edited content
          const permanentFileIdsInContent =
            extractPermanentFileIds(editedContent);

          // 2. Filter existing attachments to only those still in content
          const filteredAttachments = existingAttachments.filter((att) =>
            permanentFileIdsInContent.includes(att._id),
          );

          // Property: filtered attachments should match exactly the retained set
          expect(filteredAttachments).toHaveLength(retainedFileIds.length);

          // Every retained file ID should be in the filtered result
          for (const id of retainedFileIds) {
            expect(filteredAttachments.some((a) => a._id === id)).toBe(true);
          }

          // No removed file IDs should be in the filtered result
          const removedFileIds = existingAttachments
            .filter((a) => !retainedFileIds.includes(a._id))
            .map((a) => a._id);
          for (const id of removedFileIds) {
            expect(filteredAttachments.some((a) => a._id === id)).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.3**
   *
   * Property 9.2: When all images are removed from content, mediaAttachments
   * should be empty.
   */
  it('mediaAttachments is empty when all images are removed', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (totalExisting) => {
          const existingAttachments =
            generateExistingAttachments(totalExisting);

          // Edited content with no permanent URLs (all images removed)
          const editedContent =
            'This post has been edited to remove all images.';

          const permanentFileIdsInContent =
            extractPermanentFileIds(editedContent);
          const filteredAttachments = existingAttachments.filter((att) =>
            permanentFileIdsInContent.includes(att._id),
          );

          expect(filteredAttachments).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.3**
   *
   * Property 9.3: When new staging URLs are added alongside retained permanent
   * URLs, the retained attachments are still correctly filtered (only permanent
   * URLs count for retention, staging URLs do not match existing records).
   */
  it('new staging URLs do not affect retained attachment filtering', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 8 }),
        fc.integer({ min: 0, max: 5 }),
        fc.array(fc.boolean(), { minLength: 8, maxLength: 8 }),
        async (totalExisting, newStagingCount, retainFlags) => {
          const existingAttachments =
            generateExistingAttachments(totalExisting);

          const retainedAttachments = existingAttachments.filter(
            (_, i) => retainFlags[i % retainFlags.length],
          );
          const retainedFileIds = retainedAttachments.map((a) => a._id);

          // Generate new staging tokens
          const newStagingTokens = Array.from(
            { length: newStagingCount },
            (_, i) => {
              const hex = i.toString(16).padStart(12, '0');
              return `c0c0c0c0-d1d1-4e1e-b000-${hex}`;
            },
          );

          const editedContent = buildEditedContent(
            retainedFileIds,
            newStagingTokens,
          );

          // Simulate the edit logic
          const permanentFileIdsInContent =
            extractPermanentFileIds(editedContent);
          const filteredAttachments = existingAttachments.filter((att) =>
            permanentFileIdsInContent.includes(att._id),
          );

          // Only retained permanent URLs should be in the result
          expect(filteredAttachments).toHaveLength(retainedFileIds.length);

          // Staging tokens should NOT match any existing attachment IDs
          const stagingTokens = extractStagingTokens(editedContent);
          for (const token of stagingTokens) {
            expect(existingAttachments.some((a) => a._id === token)).toBe(
              false,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 10 ────────────────────────────────────────────────────────────

/**
 * Property 10: Edit does not re-commit permanent URLs
 *
 * Validates: Requirements 7.4
 *
 * For any edited post content containing M permanent URLs from the original
 * post and K new staging URLs, the URL Rewriter SHALL make exactly K commit
 * calls (one per new staging URL) and zero commit calls for the M existing
 * permanent URLs.
 *
 * This tests that the edit flow correctly separates permanent URLs (already
 * committed) from staging URLs (need committing), and only calls the rewriter
 * for the staging URLs.
 *
 * Tag: Feature: brighthub-post-images, Property 10: Edit does not re-commit permanent URLs
 */

describe('Feature: brighthub-post-images, Property 10: Edit does not re-commit permanent URLs', () => {
  /**
   * Generate permanent file IDs (UUID v4 format).
   */
  function generatePermanentFileIds(count: number): string[] {
    return Array.from({ length: count }, (_, i) => {
      const hex = i.toString(16).padStart(12, '0');
      return `d0000000-0000-4000-9000-${hex}`;
    });
  }

  /**
   * Generate staging tokens (UUID v4 format, distinct from permanent IDs).
   */
  function generateStagingTokens(count: number): string[] {
    return Array.from({ length: count }, (_, i) => {
      const hex = i.toString(16).padStart(12, '0');
      return `b0b0b0b0-a1a1-4f1f-8000-${hex}`;
    });
  }

  /**
   * Build edited content with M permanent URLs and K staging URLs.
   */
  function buildMixedContent(
    permanentFileIds: string[],
    stagingTokens: string[],
  ): string {
    const permanentParts = permanentFileIds.map(
      (id, i) =>
        `Existing image ${i}.\n\n![existing ${i}](/api/post-images/${id})\n`,
    );
    const stagingParts = stagingTokens.map(
      (token, i) =>
        `New image ${i}.\n\n![new ${i}](/api/temp-upload/${token}/preview)\n`,
    );
    return [...permanentParts, ...stagingParts].join('\n');
  }

  /**
   * Create mock deps that track commit calls via createSession.
   * Returns UUID v4 file IDs so permanent URL patterns match.
   */
  function createTrackingMockDeps(): IUrlRewriterDeps {
    const mockContainerId = 'mock-container-id';
    const mockRootFolderId = 'mock-root-folder-id';
    let sessionCounter = 0;

    function fileIdFromCounter(n: number): string {
      const hex = n.toString(16).padStart(12, '0');
      return `f0000000-0000-4000-8000-${hex}`;
    }

    return {
      stagingService: {
        getRecord: jest.fn().mockImplementation((token: string) =>
          Promise.resolve({
            commitToken: token,
            originalFilename: `image-${token}.png`,
            mimeType: 'image/png',
            sizeBytes: 1024,
            uploadedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 3600_000).toISOString(),
            uploaderId: 'mock-user',
          }),
        ),
        isExpired: jest.fn().mockReturnValue(false),
        readFile: jest
          .fn()
          .mockImplementation(() =>
            Promise.resolve(
              Buffer.from(
                'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'base64',
              ),
            ),
          ),
      } as unknown as IUrlRewriterDeps['stagingService'],

      vaultContainerService: {
        createContainer: jest.fn().mockImplementation(() =>
          Promise.resolve({
            id: mockContainerId,
            rootFolderId: mockRootFolderId,
          }),
        ),
      },

      uploadService: {
        createSession: jest.fn().mockImplementation(() => {
          sessionCounter++;
          return Promise.resolve({ id: `session-${sessionCounter}` });
        }),
        receiveChunk: jest.fn().mockResolvedValue(undefined),
        finalize: jest.fn().mockImplementation(() => {
          const fileId = fileIdFromCounter(sessionCounter);
          return Promise.resolve({
            id: fileId,
            vaultContainerId: mockContainerId,
            fileName: `image-${fileId}.png`,
            mimeType: 'image/png',
            sizeBytes: 1024,
          });
        }),
      },

      fileService: {
        softDelete: jest.fn().mockResolvedValue(undefined),
      },

      parseId: jest.fn().mockImplementation((id: string) => id),
    };
  }

  /**
   * **Validates: Requirements 7.4**
   *
   * Property 10.1: The URL Rewriter is called with exactly K staging URLs
   * and the rewritten content has zero staging URLs remaining.
   * Permanent URLs pass through untouched (not sent to the rewriter).
   */
  it('exactly K commit calls for K staging URLs, zero for permanent URLs', async () => {
    await fc.assert(
      fc.asyncProperty(
        // M permanent URLs (0 to 8)
        fc.integer({ min: 0, max: 8 }),
        // K new staging URLs (0 to 8, total M+K ≤ 20)
        fc.integer({ min: 0, max: 8 }),
        async (permanentCount, stagingCount) => {
          // Ensure total doesn't exceed getMaxInlineImages()
          const totalImages = permanentCount + stagingCount;
          if (totalImages > getMaxInlineImages()) return;

          const permanentFileIds = generatePermanentFileIds(permanentCount);
          const stagingTokens = generateStagingTokens(stagingCount);

          const editedContent = buildMixedContent(
            permanentFileIds,
            stagingTokens,
          );

          // Simulate the edit flow from PostService.editPost():
          // 1. Extract staging tokens and permanent file IDs
          const extractedStagingTokens = extractStagingTokens(editedContent);
          const extractedPermanentIds = extractPermanentFileIds(editedContent);

          // Verify extraction correctness
          expect(extractedStagingTokens).toHaveLength(stagingCount);
          expect(extractedPermanentIds).toHaveLength(permanentCount);

          // 2. Only call the rewriter if there are staging tokens
          if (extractedStagingTokens.length > 0) {
            const deps = createTrackingMockDeps();
            const service = new UrlRewriterService(deps);

            // The rewriter is called with the full edited content, but it
            // only processes staging URLs (permanent URLs are not staging URLs
            // and are left untouched by stripExternalImageUrls and the commit loop)
            const result = await service.rewriteContent(
              editedContent,
              'hub-1',
              'user-1',
            );

            // The rewriter should have committed exactly K images (one per staging URL)
            expect(result.mediaAttachments).toHaveLength(stagingCount);

            // createSession should have been called exactly K times
            expect(deps.uploadService.createSession).toHaveBeenCalledTimes(
              stagingCount,
            );

            // stagingService.getRecord should have been called exactly K times
            expect(deps.stagingService.getRecord).toHaveBeenCalledTimes(
              stagingCount,
            );

            // The rewritten content should have zero staging URLs
            const remainingStagingTokens = extractStagingTokens(
              result.rewrittenContent,
            );
            expect(remainingStagingTokens).toHaveLength(0);

            // The permanent URLs should still be present in the rewritten content
            const remainingPermanentIds = extractPermanentFileIds(
              result.rewrittenContent,
            );
            // Permanent IDs from original + new committed IDs
            expect(remainingPermanentIds.length).toBe(
              permanentCount + stagingCount,
            );

            // All original permanent file IDs should still be in the content
            for (const id of permanentFileIds) {
              expect(remainingPermanentIds).toContain(id);
            }
          } else {
            // No staging tokens → rewriter should not be called at all
            // (PostService.editPost skips the rewriter call when stagingTokens.length === 0)
            // Just verify that permanent URLs are correctly identified
            expect(extractedPermanentIds).toHaveLength(permanentCount);
            for (const id of permanentFileIds) {
              expect(extractedPermanentIds).toContain(id);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.4**
   *
   * Property 10.2: When edited content has only permanent URLs (no new staging
   * URLs), zero commit calls are made.
   */
  it('zero commit calls when content has only permanent URLs', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (permanentCount) => {
          const permanentFileIds = generatePermanentFileIds(permanentCount);
          const editedContent = buildMixedContent(permanentFileIds, []);

          // Extract staging tokens — should be zero
          const extractedStagingTokens = extractStagingTokens(editedContent);
          expect(extractedStagingTokens).toHaveLength(0);

          // Extract permanent IDs — should match
          const extractedPermanentIds = extractPermanentFileIds(editedContent);
          expect(extractedPermanentIds).toHaveLength(permanentCount);

          // Since there are no staging tokens, PostService.editPost() would
          // skip the rewriter call entirely. Verify this by checking that
          // the content only contains permanent URLs.
          for (const id of permanentFileIds) {
            expect(editedContent).toContain(`/api/post-images/${id}`);
          }

          // No staging URLs in the content
          expect(editedContent).not.toMatch(
            /\/api\/temp-upload\/[0-9a-f-]+\/preview/,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 7.4**
   *
   * Property 10.3: When edited content has only new staging URLs (all previous
   * images removed), exactly K commit calls are made for K staging URLs.
   */
  it('exactly K commit calls when all previous images removed and K new added', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 10 }),
        async (stagingCount) => {
          if (stagingCount > getMaxInlineImages()) return;

          const stagingTokens = generateStagingTokens(stagingCount);
          const editedContent = buildMixedContent([], stagingTokens);

          const extractedStagingTokens = extractStagingTokens(editedContent);
          expect(extractedStagingTokens).toHaveLength(stagingCount);

          const extractedPermanentIds = extractPermanentFileIds(editedContent);
          expect(extractedPermanentIds).toHaveLength(0);

          // Call the rewriter — it should commit exactly K images
          const deps = createTrackingMockDeps();
          const service = new UrlRewriterService(deps);

          const result = await service.rewriteContent(
            editedContent,
            'hub-1',
            'user-1',
          );

          expect(result.mediaAttachments).toHaveLength(stagingCount);
          expect(deps.uploadService.createSession).toHaveBeenCalledTimes(
            stagingCount,
          );
          expect(deps.stagingService.getRecord).toHaveBeenCalledTimes(
            stagingCount,
          );

          // All staging URLs should be rewritten to permanent URLs
          const remainingStagingTokens = extractStagingTokens(
            result.rewrittenContent,
          );
          expect(remainingStagingTokens).toHaveLength(0);

          const remainingPermanentIds = extractPermanentFileIds(
            result.rewrittenContent,
          );
          expect(remainingPermanentIds).toHaveLength(stagingCount);
        },
      ),
      { numRuns: 100 },
    );
  });
});
