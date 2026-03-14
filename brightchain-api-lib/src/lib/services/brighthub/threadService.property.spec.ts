/**
 * Property-based tests for Thread_Service.
 *
 * Tests the following properties:
 * - Property 4: Thread Hierarchy Preservation
 * - Property 5: Thread Depth Limiting
 *
 * Validates: Requirements 2.1-2.6
 */

import {
  MAX_THREAD_DEPTH,
  PostType,
  ThreadErrorCode,
} from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import {
  createMockApplication,
  MockCollection,
} from './postService.test-helpers';
import {
  createThreadService,
  REPLY_MAX_CHARACTERS,
  ThreadService,
} from './threadService';

describe('Feature: brighthub-social-network, Thread_Service Property Tests', () => {
  let service: ThreadService;
  let mockApp: ReturnType<typeof createMockApplication>;
  let postsCollection: MockCollection<{
    _id: string;
    authorId: string;
    content: string;
    formattedContent: string;
    postType: string;
    parentPostId?: string;
    quotedPostId?: string;
    mediaAttachments: Array<{
      _id: string;
      url: string;
      mimeType: string;
      size: number;
      width?: number;
      height?: number;
      altText?: string;
    }>;
    mentions: string[];
    hashtags: string[];
    likeCount: number;
    repostCount: number;
    replyCount: number;
    quoteCount: number;
    isEdited: boolean;
    editedAt?: string;
    hubIds?: string[];
    isBlogPost: boolean;
    isDeleted: boolean;
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
  }>;

  beforeEach(() => {
    mockApp = createMockApplication();
    postsCollection = mockApp.collections.get('brighthub_posts')!;
    service = createThreadService(mockApp);
  });

  // --- Smart Generators ---

  /**
   * Generator for valid user IDs (UUIDs)
   */
  const userIdArb = fc.uuid();

  /**
   * Generator for valid reply content (1-280 characters)
   */
  const validContentArb = fc
    .string({ minLength: 1, maxLength: REPLY_MAX_CHARACTERS })
    .filter((s) => s.trim().length > 0);

  /**
   * Generator for content that exceeds the character limit
   */
  const tooLongContentArb = fc
    .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: REPLY_MAX_CHARACTERS + 1,
      maxLength: REPLY_MAX_CHARACTERS + 100,
    })
    .map((chars) => chars.join(''));

  /**
   * Generator for empty/whitespace content
   */
  const emptyContentArb = fc.constantFrom('', '   ', '\n', '\t', '  \n  ');

  /**
   * Helper to create a root post directly in the collection
   */
  async function createRootPost(
    authorId: string,
    content: string,
  ): Promise<string> {
    const now = new Date().toISOString();
    const postId = `root-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    await postsCollection.create({
      _id: postId,
      authorId,
      content,
      formattedContent: content,
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
      createdAt: now,
      updatedAt: now,
      createdBy: authorId,
      updatedBy: authorId,
    });

    return postId;
  }

  // --- Property Tests ---

  describe('Property 4: Thread Hierarchy Preservation', () => {
    /**
     * Property 4: Thread Hierarchy Preservation
     *
     * WHEN a user submits a reply to an existing post,
     * THE Thread_Service SHALL create a reply post linked to the parent post.
     * WHEN a user requests a thread view,
     * THE Thread_Service SHALL return the root post and all nested replies in hierarchical order.
     *
     * **Validates: Requirements 2.1, 2.2, 2.5, 2.6**
     */
    it('should create replies linked to parent posts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          validContentArb,
          async (authorId, replierId, rootContent, replyContent) => {
            // Create root post
            const rootPostId = await createRootPost(authorId, rootContent);

            // Create reply
            const reply = await service.createReply(
              rootPostId,
              replierId,
              replyContent,
            );

            // Verify reply structure
            expect(reply._id).toBeDefined();
            expect(reply.authorId).toBe(replierId);
            expect(reply.content).toBe(replyContent);
            expect(reply.postType).toBe(PostType.Reply);
            expect(reply.parentPostId).toBe(rootPostId);

            // Verify parent's reply count increased
            const rootPost = postsCollection.data.find(
              (p) => p._id === rootPostId,
            );
            expect(rootPost?.replyCount).toBe(1);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should return thread with all replies in hierarchical order', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 5 }),
          validContentArb,
          fc.array(validContentArb, { minLength: 1, maxLength: 5 }),
          async (authorId, replierIds, rootContent, replyContents) => {
            // Create root post
            const rootPostId = await createRootPost(authorId, rootContent);

            // Create replies
            const replyCount = Math.min(
              replierIds.length,
              replyContents.length,
            );
            for (let i = 0; i < replyCount; i++) {
              await service.createReply(
                rootPostId,
                replierIds[i],
                replyContents[i],
              );
            }

            // Get thread
            const thread = await service.getThread(rootPostId);

            // Verify thread structure
            expect(thread.rootPost._id).toBe(rootPostId);
            expect(thread.rootPost.content).toBe(rootContent);
            expect(thread.replies).toHaveLength(replyCount);
            expect(thread.replyCount).toBe(replyCount);

            // Verify all replies are linked to root
            for (const reply of thread.replies) {
              expect(reply.parentPostId).toBe(rootPostId);
              expect(reply.postType).toBe(PostType.Reply);
            }

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should track unique participants in thread', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(userIdArb, { minLength: 2, maxLength: 8 }),
          validContentArb,
          fc.array(validContentArb, { minLength: 2, maxLength: 8 }),
          async (authorId, replierIds, rootContent, replyContents) => {
            // Create root post
            const rootPostId = await createRootPost(authorId, rootContent);

            // Create replies
            const replyCount = Math.min(
              replierIds.length,
              replyContents.length,
            );
            for (let i = 0; i < replyCount; i++) {
              await service.createReply(
                rootPostId,
                replierIds[i],
                replyContents[i],
              );
            }

            // Get thread
            const thread = await service.getThread(rootPostId);

            // Calculate expected unique participants
            const uniqueParticipants = new Set([
              authorId,
              ...replierIds.slice(0, replyCount),
            ]);

            expect(thread.participantCount).toBe(uniqueParticipants.size);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should preserve replies when parent is deleted (with indicator)', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          validContentArb,
          async (authorId, replierId, rootContent, replyContent) => {
            // Create root post
            const rootPostId = await createRootPost(authorId, rootContent);

            // Create reply
            await service.createReply(rootPostId, replierId, replyContent);

            // Soft-delete the root post
            const rootPost = postsCollection.data.find(
              (p) => p._id === rootPostId,
            );
            if (rootPost) {
              rootPost.isDeleted = true;
            }

            // Get thread - should still work and include deleted root
            const thread = await service.getThread(rootPostId);

            // Root post should be marked as deleted
            expect(thread.rootPost.isDeleted).toBe(true);

            // Replies should still be present
            expect(thread.replies).toHaveLength(1);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should reject reply to non-existent post', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          validContentArb,
          async (userId, fakePostId, content) => {
            await expect(
              service.createReply(fakePostId, userId, content),
            ).rejects.toMatchObject({
              code: ThreadErrorCode.ParentPostNotFound,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should reject empty reply content', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          emptyContentArb,
          async (authorId, replierId, rootContent, emptyReply) => {
            // Create root post
            const rootPostId = await createRootPost(authorId, rootContent);

            await expect(
              service.createReply(rootPostId, replierId, emptyReply),
            ).rejects.toMatchObject({
              code: ThreadErrorCode.EmptyContent,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should reject reply content exceeding character limit', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          tooLongContentArb,
          async (authorId, replierId, rootContent, longReply) => {
            // Create root post
            const rootPostId = await createRootPost(authorId, rootContent);

            await expect(
              service.createReply(rootPostId, replierId, longReply),
            ).rejects.toMatchObject({
              code: ThreadErrorCode.ContentTooLong,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe('Property 5: Thread Depth Limiting', () => {
    /**
     * Property 5: Thread Depth Limiting
     *
     * THE Thread_Service SHALL support reply nesting up to 10 levels deep.
     * WHEN a reply exceeds the maximum nesting depth,
     * THE Thread_Service SHALL attach the reply to the deepest allowed parent.
     *
     * **Validates: Requirements 2.3, 2.4**
     */
    it('should correctly calculate reply depth', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          fc.integer({ min: 1, max: 5 }),
          async (userId, content, depth) => {
            // Create a chain of posts
            let currentPostId = await createRootPost(userId, content);

            for (let i = 0; i < depth; i++) {
              const reply = await service.createReply(
                currentPostId,
                userId,
                `Reply level ${i + 1}`,
              );
              currentPostId = reply._id;
            }

            // Check depth of the deepest post
            const calculatedDepth = await service.getReplyDepth(currentPostId);
            expect(calculatedDepth).toBe(depth);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should return depth 0 for root posts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          async (userId, content) => {
            const rootPostId = await createRootPost(userId, content);

            const depth = await service.getReplyDepth(rootPostId);
            expect(depth).toBe(0);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should enforce maximum depth limit by reassigning parent', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          async (userId, content) => {
            // Create a chain up to max depth
            let currentPostId = await createRootPost(userId, content);
            const postChain: string[] = [currentPostId];

            // Create replies up to MAX_THREAD_DEPTH - 1 (so we're at the limit)
            for (let i = 0; i < MAX_THREAD_DEPTH - 1; i++) {
              const reply = await service.createReply(
                currentPostId,
                userId,
                `Reply level ${i + 1}`,
              );
              currentPostId = reply._id;
              postChain.push(currentPostId);
            }

            // Verify we're at max depth - 1
            const depthAtLimit = await service.getReplyDepth(currentPostId);
            expect(depthAtLimit).toBe(MAX_THREAD_DEPTH - 1);

            // Try to create a reply that would exceed max depth
            const deepReply = await service.createReply(
              currentPostId,
              userId,
              'Deep reply',
            );

            // The reply should be reassigned to a shallower parent
            // Its depth should not exceed MAX_THREAD_DEPTH - 1 (max allowed is 9 for 10-level limit)
            const deepReplyDepth = await service.getReplyDepth(deepReply._id);
            expect(deepReplyDepth).toBeLessThanOrEqual(MAX_THREAD_DEPTH - 1);

            return true;
          },
        ),
        { numRuns: 5 },
      );
    });

    it('should allow replies up to max depth', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          async (userId, content) => {
            // Create a chain up to max depth - 1
            let currentPostId = await createRootPost(userId, content);

            for (let i = 0; i < MAX_THREAD_DEPTH - 1; i++) {
              const reply = await service.createReply(
                currentPostId,
                userId,
                `Reply level ${i + 1}`,
              );
              currentPostId = reply._id;
            }

            // Verify we can still create a reply at max depth - 1
            const finalReply = await service.createReply(
              currentPostId,
              userId,
              'Final reply',
            );
            expect(finalReply._id).toBeDefined();

            return true;
          },
        ),
        { numRuns: 3 },
      );
    });

    it('should handle nested replies in getThread', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          fc.integer({ min: 2, max: 5 }),
          async (userId, content, depth) => {
            // Create a chain of nested replies
            const rootPostId = await createRootPost(userId, content);
            let currentPostId = rootPostId;

            for (let i = 0; i < depth; i++) {
              const reply = await service.createReply(
                currentPostId,
                userId,
                `Nested reply ${i + 1}`,
              );
              currentPostId = reply._id;
            }

            // Get thread
            const thread = await service.getThread(rootPostId);

            // Should have all nested replies
            expect(thread.replies).toHaveLength(depth);
            expect(thread.replyCount).toBe(depth);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should track reply counts correctly for each post in chain', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          async (userId, content) => {
            // Create root with multiple direct replies
            const rootPostId = await createRootPost(userId, content);

            // Create 3 direct replies to root
            const reply1 = await service.createReply(
              rootPostId,
              userId,
              'Reply 1',
            );
            await service.createReply(rootPostId, userId, 'Reply 2');
            await service.createReply(rootPostId, userId, 'Reply 3');

            // Create nested reply to first reply
            await service.createReply(reply1._id, userId, 'Nested reply');

            // Check reply counts
            const rootPost = postsCollection.data.find(
              (p) => p._id === rootPostId,
            );
            expect(rootPost?.replyCount).toBe(3);

            const firstReply = postsCollection.data.find(
              (p) => p._id === reply1._id,
            );
            expect(firstReply?.replyCount).toBe(1);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe('Thread retrieval edge cases', () => {
    it('should throw error for non-existent root post', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (fakePostId) => {
          await expect(service.getThread(fakePostId)).rejects.toMatchObject({
            code: ThreadErrorCode.PostNotFound,
          });

          return true;
        }),
        { numRuns: 10 },
      );
    });

    it('should throw error for getReplyDepth on non-existent post', async () => {
      await fc.assert(
        fc.asyncProperty(fc.uuid(), async (fakePostId) => {
          await expect(service.getReplyDepth(fakePostId)).rejects.toMatchObject(
            {
              code: ThreadErrorCode.PostNotFound,
            },
          );

          return true;
        }),
        { numRuns: 10 },
      );
    });
  });
});
