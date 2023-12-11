/**
 * Property-based tests for Post_Service.
 *
 * Tests the following properties:
 * - Property 1: Post Content Validation
 * - Property 2: Post Edit Window Enforcement
 * - Property 3: Post Deletion Cascade
 * - Property 6: Like Idempotence
 * - Property 7: Repost Idempotence
 * - Property 8: Quote Post Structure
 * - Property 9: Interaction Status Consistency
 * - Property 25: Media Attachment Validation
 *
 * Validates: Requirements 1.2-1.7, 3.1-3.7, 17.1-17.5
 */

import { PostErrorCode, PostType } from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import {
  ALLOWED_MEDIA_TYPES,
  createPostService,
  EDIT_WINDOW_MS,
  MAX_MEDIA_ATTACHMENTS,
  MAX_TOTAL_ATTACHMENT_SIZE,
  POST_MAX_CHARACTERS,
  PostService,
} from './postService';
import {
  createMockApplication,
  MockCollection,
} from './postService.test-helpers';

describe('Feature: brighthub-social-network, Post_Service Property Tests', () => {
  let service: PostService;
  let mockApp: ReturnType<typeof createMockApplication>;
  let postsCollection: MockCollection;
  let likesCollection: MockCollection;
  let _repostsCollection: MockCollection;

  beforeEach(() => {
    mockApp = createMockApplication();
    postsCollection = mockApp.collections.get('brighthub_posts')!;
    likesCollection = mockApp.collections.get('brighthub_likes')!;
    _repostsCollection = mockApp.collections.get('brighthub_reposts')!;
    service = createPostService(mockApp);
  });

  // --- Smart Generators ---

  /**
   * Generator for valid user IDs (UUIDs)
   */
  const userIdArb = fc.uuid();

  /**
   * Generator for valid post content (1-280 characters)
   */
  const validContentArb = fc
    .string({ minLength: 1, maxLength: POST_MAX_CHARACTERS })
    .filter((s) => s.trim().length > 0);

  /**
   * Generator for content that exceeds the character limit
   */
  const tooLongContentArb = fc
    .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: POST_MAX_CHARACTERS + 1,
      maxLength: POST_MAX_CHARACTERS + 100,
    })
    .map((chars) => chars.join(''));

  /**
   * Generator for empty/whitespace content
   */
  const emptyContentArb = fc.constantFrom('', '   ', '\n', '\t', '  \n  ');

  /**
   * Generator for valid media MIME types
   */
  const validMimeTypeArb = fc.constantFrom(...ALLOWED_MEDIA_TYPES);

  /**
   * Generator for invalid media MIME types
   */
  const invalidMimeTypeArb = fc.constantFrom(
    'video/mp4',
    'audio/mp3',
    'application/pdf',
    'text/plain',
    'image/bmp',
    'image/tiff',
  );

  /**
   * Generator for valid media attachments
   */
  const validAttachmentArb = fc.record({
    _id: fc.uuid(),
    url: fc.webUrl(),
    mimeType: validMimeTypeArb,
    size: fc.integer({ min: 1, max: 5 * 1024 * 1024 }), // 1 byte to 5MB
    width: fc.integer({ min: 1, max: 4096 }),
    height: fc.integer({ min: 1, max: 4096 }),
  });

  /**
   * Generator for attachment with invalid MIME type
   */
  const invalidMimeAttachmentArb = fc.record({
    _id: fc.uuid(),
    url: fc.webUrl(),
    mimeType: invalidMimeTypeArb,
    size: fc.integer({ min: 1, max: 1024 * 1024 }),
    width: fc.integer({ min: 1, max: 4096 }),
    height: fc.integer({ min: 1, max: 4096 }),
  });

  // --- Property Tests ---

  describe('Property 1: Post Content Validation', () => {
    /**
     * Property 1: Post Content Validation
     *
     * WHEN a user submits post content exceeding 280 characters,
     * THE Post_Service SHALL reject the request with a validation error.
     * WHEN a user submits empty post content,
     * THE Post_Service SHALL reject the request with a validation error.
     *
     * **Validates: Requirements 1.2, 1.3**
     */
    it('should reject content exceeding 280 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          tooLongContentArb,
          async (userId, content) => {
            await expect(
              service.createPost(userId, content),
            ).rejects.toMatchObject({
              code: PostErrorCode.ContentTooLong,
            });
            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should reject empty content', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          emptyContentArb,
          async (userId, content) => {
            await expect(
              service.createPost(userId, content),
            ).rejects.toMatchObject({
              code: PostErrorCode.EmptyContent,
            });
            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should accept valid content within limits', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          async (userId, content) => {
            const post = await service.createPost(userId, content);

            expect(post._id).toBeDefined();
            expect(post.authorId).toBe(userId);
            expect(post.content).toBe(content);
            expect(post.postType).toBe(PostType.Original);

            return true;
          },
        ),
        { numRuns: 30 },
      );
    });
  });

  describe('Property 1b: Hub Post Character Limit', () => {
    /**
     * Hub posts (with hubIds) should allow up to 10,000 characters.
     * Timeline posts (without hubIds) should still be limited to 280.
     *
     * **Validates: Hub long-form discussion support**
     */
    it('should accept hub posts exceeding 280 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.integer({ min: 281, max: 500 }),
          async (userId, length) => {
            const longContent = 'a'.repeat(length);
            const post = await service.createPost(userId, longContent, {
              hubIds: ['hub-1'],
            });

            expect(post._id).toBeDefined();
            expect(post.content).toBe(longContent);
            expect(post.hubIds).toContain('hub-1');

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should reject hub posts exceeding 10000 characters', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          const tooLong = 'a'.repeat(10001);
          await expect(
            service.createPost(userId, tooLong, { hubIds: ['hub-1'] }),
          ).rejects.toMatchObject({
            code: PostErrorCode.ContentTooLong,
          });

          return true;
        }),
        { numRuns: 5 },
      );
    });

    it('should still reject timeline posts exceeding 280 characters', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          const tooLong = 'a'.repeat(281);
          await expect(
            service.createPost(userId, tooLong),
          ).rejects.toMatchObject({
            code: PostErrorCode.ContentTooLong,
          });

          return true;
        }),
        { numRuns: 5 },
      );
    });
  });

  describe('Property 2: Post Edit Window Enforcement', () => {
    /**
     * Property 2: Post Edit Window Enforcement
     *
     * WHEN a user requests to edit their own post within 15 minutes of creation,
     * THE Post_Service SHALL update the post content and mark it as edited.
     * WHEN a user requests to edit a post older than 15 minutes,
     * THE Post_Service SHALL reject the request with a time limit error.
     *
     * **Validates: Requirements 1.4, 1.5**
     */
    it('should allow edits within 15-minute window', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          validContentArb,
          async (userId, originalContent, newContent) => {
            // Create a post
            const post = await service.createPost(userId, originalContent);

            // Edit within window (post was just created)
            const edited = await service.editPost(post._id, userId, newContent);

            expect(edited.content).toBe(newContent);
            expect(edited.isEdited).toBe(true);
            expect(edited.editedAt).toBeDefined();

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should reject edits after 15-minute window expires', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          validContentArb,
          async (userId, originalContent, newContent) => {
            // Create a post with old timestamp
            const oldTimestamp = new Date(
              Date.now() - EDIT_WINDOW_MS - 1000,
            ).toISOString();

            // Use a unique post ID for each test run
            const postId = `old-post-${Date.now()}-${Math.random()}`;
            postsCollection.data.push({
              _id: postId,
              authorId: userId,
              content: originalContent,
              formattedContent: originalContent,
              postType: PostType.Original,
              mediaAttachments: [],
              mentions: [],
              hashtags: [],
              likeCount: 0,
              repostCount: 0,
              replyCount: 0,
              quoteCount: 0,
              isEdited: false,
              isBlogPost: true,
              isDeleted: false,
              createdAt: oldTimestamp,
              updatedAt: oldTimestamp,
              createdBy: userId,
              updatedBy: userId,
            });

            // Try to edit after window
            await expect(
              service.editPost(postId, userId, newContent),
            ).rejects.toMatchObject({
              code: PostErrorCode.EditWindowExpired,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should reject edits by non-authors', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          validContentArb,
          async (authorId, otherUserId, originalContent, newContent) => {
            // Skip if same user
            if (authorId === otherUserId) return true;

            // Create a post
            const post = await service.createPost(authorId, originalContent);

            // Try to edit as different user
            await expect(
              service.editPost(post._id, otherUserId, newContent),
            ).rejects.toMatchObject({
              code: PostErrorCode.Unauthorized,
            });

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 3: Post Deletion Cascade', () => {
    /**
     * Property 3: Post Deletion Cascade
     *
     * WHEN a user requests to delete their own post,
     * THE Post_Service SHALL soft-delete the post and cascade to associated interactions.
     *
     * **Validates: Requirements 1.6, 1.7**
     */
    it('should soft-delete post and cascade to likes and reposts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 5 }),
          async (authorId, content, likerIds) => {
            // Create a post
            const post = await service.createPost(authorId, content);

            // Add some likes
            for (const likerId of likerIds) {
              await service.likePost(post._id, likerId);
            }

            // Verify likes exist
            const likesBeforeDelete = likesCollection.data.filter(
              (l) => l.postId === post._id,
            );
            expect(likesBeforeDelete.length).toBe(likerIds.length);

            // Delete the post
            await service.deletePost(post._id, authorId);

            // Verify post is soft-deleted
            const deletedPost = postsCollection.data.find(
              (p) => p._id === post._id,
            );
            expect(deletedPost?.isDeleted).toBe(true);

            // Verify likes are cascaded (deleted)
            const likesAfterDelete = likesCollection.data.filter(
              (l) => l.postId === post._id,
            );
            expect(likesAfterDelete.length).toBe(0);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should reject deletion by non-authors', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          async (authorId, otherUserId, content) => {
            // Skip if same user
            if (authorId === otherUserId) return true;

            // Create a post
            const post = await service.createPost(authorId, content);

            // Try to delete as different user
            await expect(
              service.deletePost(post._id, otherUserId),
            ).rejects.toMatchObject({
              code: PostErrorCode.Unauthorized,
            });

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 6: Like Idempotence', () => {
    /**
     * Property 6: Like Idempotence
     *
     * THE Post_Service SHALL prevent duplicate likes from the same user on the same post.
     * Liking an already-liked post should be idempotent (no error, no duplicate).
     *
     * **Validates: Requirements 3.1, 3.5**
     */
    it('should be idempotent when liking the same post multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          fc.integer({ min: 2, max: 5 }),
          async (authorId, likerId, content, likeCount) => {
            // Create a post
            const post = await service.createPost(authorId, content);

            // Like multiple times
            for (let i = 0; i < likeCount; i++) {
              await service.likePost(post._id, likerId);
            }

            // Should only have one like record
            const likes = likesCollection.data.filter(
              (l) => l.postId === post._id && l.userId === likerId,
            );
            expect(likes.length).toBe(1);

            // Post should have likeCount of 1
            const updatedPost = postsCollection.data.find(
              (p) => p._id === post._id,
            );
            expect(updatedPost?.likeCount).toBe(1);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should correctly increment/decrement like count', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 10 }),
          async (authorId, content, likerIds) => {
            // Create a post
            const post = await service.createPost(authorId, content);

            // Unique likers
            const uniqueLikers = [...new Set(likerIds)];

            // Like from each unique user
            for (const likerId of uniqueLikers) {
              await service.likePost(post._id, likerId);
            }

            // Check like count
            let updatedPost = postsCollection.data.find(
              (p) => p._id === post._id,
            );
            expect(updatedPost?.likeCount).toBe(uniqueLikers.length);

            // Unlike from first user
            await service.unlikePost(post._id, uniqueLikers[0]);

            // Check like count decreased
            updatedPost = postsCollection.data.find((p) => p._id === post._id);
            expect(updatedPost?.likeCount).toBe(uniqueLikers.length - 1);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  describe('Property 7: Repost Idempotence', () => {
    /**
     * Property 7: Repost Idempotence
     *
     * THE Post_Service SHALL prevent duplicate reposts from the same user of the same post.
     *
     * **Validates: Requirements 3.3, 3.6**
     */
    it('should prevent duplicate reposts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          async (authorId, reposterId, content) => {
            // Create a post
            const post = await service.createPost(authorId, content);

            // First repost should succeed
            const repost = await service.repostPost(post._id, reposterId);
            expect(repost.postType).toBe(PostType.Repost);
            expect(repost.quotedPostId).toBe(post._id);

            // Second repost should fail
            await expect(
              service.repostPost(post._id, reposterId),
            ).rejects.toMatchObject({
              code: PostErrorCode.AlreadyReposted,
            });

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should allow different users to repost the same post', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(userIdArb, { minLength: 2, maxLength: 5 }),
          validContentArb,
          async (authorId, reposterIds, content) => {
            // Create a post
            const post = await service.createPost(authorId, content);

            // Unique reposters (excluding author)
            const uniqueReposters = [...new Set(reposterIds)].filter(
              (id) => id !== authorId,
            );

            // Each unique user should be able to repost
            for (const reposterId of uniqueReposters) {
              const repost = await service.repostPost(post._id, reposterId);
              expect(repost.postType).toBe(PostType.Repost);
            }

            // Check repost count
            const updatedPost = postsCollection.data.find(
              (p) => p._id === post._id,
            );
            expect(updatedPost?.repostCount).toBe(uniqueReposters.length);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  describe('Property 8: Quote Post Structure', () => {
    /**
     * Property 8: Quote Post Structure
     *
     * WHEN a user creates a quote post, THE Post_Service SHALL create a new post
     * containing the quoted post reference and user commentary.
     *
     * **Validates: Requirements 3.4**
     */
    it('should create quote posts with correct structure', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          validContentArb,
          async (authorId, quoterId, originalContent, commentary) => {
            // Create original post
            const original = await service.createPost(
              authorId,
              originalContent,
            );

            // Create quote post
            const quote = await service.createQuotePost(
              original._id,
              quoterId,
              commentary,
            );

            // Verify quote structure
            expect(quote.postType).toBe(PostType.Quote);
            expect(quote.quotedPostId).toBe(original._id);
            expect(quote.content).toBe(commentary);
            expect(quote.authorId).toBe(quoterId);

            // Verify original post's quote count increased
            const updatedOriginal = postsCollection.data.find(
              (p) => p._id === original._id,
            );
            expect(updatedOriginal?.quoteCount).toBe(1);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should reject quote of non-existent post', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          validContentArb,
          async (userId, fakePostId, commentary) => {
            await expect(
              service.createQuotePost(fakePostId, userId, commentary),
            ).rejects.toMatchObject({
              code: PostErrorCode.QuotedPostNotFound,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe('Property 9: Interaction Status Consistency', () => {
    /**
     * Property 9: Interaction Status Consistency
     *
     * WHEN a user requests their interaction status on a post,
     * THE Post_Service SHALL return whether the user has liked and/or reposted the post.
     *
     * **Validates: Requirements 3.7**
     */
    it('should return correct interaction status', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          fc.boolean(),
          fc.boolean(),
          async (authorId, userId, content, shouldLike, shouldRepost) => {
            // Create a post
            const post = await service.createPost(authorId, content);

            // Perform interactions based on flags
            if (shouldLike) {
              await service.likePost(post._id, userId);
            }
            if (shouldRepost) {
              await service.repostPost(post._id, userId);
            }

            // Get interaction status
            const status = await service.getInteractionStatus(post._id, userId);

            // Verify status matches actions
            expect(status.hasLiked).toBe(shouldLike);
            expect(status.hasReposted).toBe(shouldRepost);

            return true;
          },
        ),
        { numRuns: 30 },
      );
    });

    it('should update status after unlike', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          async (authorId, userId, content) => {
            // Create a post
            const post = await service.createPost(authorId, content);

            // Like the post
            await service.likePost(post._id, userId);

            // Verify liked
            let status = await service.getInteractionStatus(post._id, userId);
            expect(status.hasLiked).toBe(true);

            // Unlike the post
            await service.unlikePost(post._id, userId);

            // Verify not liked
            status = await service.getInteractionStatus(post._id, userId);
            expect(status.hasLiked).toBe(false);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  describe('Property 25: Media Attachment Validation', () => {
    /**
     * Property 25: Media Attachment Validation
     *
     * WHEN a user attaches images to a post, THE Post_Service SHALL validate
     * image formats (JPEG, PNG, GIF, WebP), support up to 4 attachments,
     * and validate total size does not exceed 20MB.
     *
     * **Validates: Requirements 17.1-17.5**
     */
    it('should accept valid media attachments', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          fc.array(validAttachmentArb, {
            minLength: 1,
            maxLength: MAX_MEDIA_ATTACHMENTS,
          }),
          async (userId, content, attachments) => {
            const post = await service.createPost(userId, content, {
              mediaAttachments: attachments,
            });

            expect(post.mediaAttachments).toHaveLength(attachments.length);
            expect(post.mediaAttachments).toEqual(attachments);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should reject too many attachments', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          fc.array(validAttachmentArb, {
            minLength: MAX_MEDIA_ATTACHMENTS + 1,
            maxLength: MAX_MEDIA_ATTACHMENTS + 3,
          }),
          async (userId, content, attachments) => {
            await expect(
              service.createPost(userId, content, {
                mediaAttachments: attachments,
              }),
            ).rejects.toMatchObject({
              code: PostErrorCode.TooManyAttachments,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should reject invalid media formats', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          invalidMimeAttachmentArb,
          async (userId, content, invalidAttachment) => {
            await expect(
              service.createPost(userId, content, {
                mediaAttachments: [invalidAttachment],
              }),
            ).rejects.toMatchObject({
              code: PostErrorCode.InvalidMediaFormat,
            });

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should reject attachments exceeding total size limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          async (userId, content) => {
            // Create attachments that exceed the limit
            const largeAttachment = {
              _id: 'large-1',
              url: 'https://example.com/large.jpg',
              mimeType: 'image/jpeg' as const,
              size: MAX_TOTAL_ATTACHMENT_SIZE / 2 + 1024 * 1024, // Just over half + 1MB
              width: 1920,
              height: 1080,
            };

            const attachments = [
              largeAttachment,
              { ...largeAttachment, _id: 'large-2' },
            ];

            await expect(
              service.createPost(userId, content, {
                mediaAttachments: attachments,
              }),
            ).rejects.toMatchObject({
              code: PostErrorCode.AttachmentSizeTooLarge,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
