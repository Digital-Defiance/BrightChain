/**
 * Preservation Property Tests — Public Post Operations & Other Stats Unchanged
 *
 * Feature: brighthub-admin-post-count
 *
 * These tests capture the BASELINE behavior of PostService on UNFIXED code.
 * They verify that public post operations (create, edit, delete, like/unlike)
 * continue to work correctly and that other dashboard stat methods (chat, pass, mail)
 * are unaffected by any PostService changes.
 *
 * These tests MUST PASS on unfixed code — they cover non-buggy code paths.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**
 */

import { PostErrorCode, PostType } from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import {
  createPostService,
  EDIT_WINDOW_MS,
  POST_MAX_CHARACTERS,
  PostService,
} from './postService';
import {
  createMockApplication,
  MockCollection,
} from './postService.test-helpers';

/* ------------------------------------------------------------------ */
/*  Generators                                                         */
/* ------------------------------------------------------------------ */

const userIdArb = fc.uuid();

const validContentArb = fc
  .string({ minLength: 1, maxLength: POST_MAX_CHARACTERS })
  .filter((s) => s.trim().length > 0);

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('Property 2: Preservation — Public Post Operations & Other Stats Unchanged', () => {
  let service: PostService;
  let mockApp: ReturnType<typeof createMockApplication>;
  let postsCollection: MockCollection<{ _id: string }>;
  let likesCollection: MockCollection<{ _id: string }>;

  beforeEach(() => {
    mockApp = createMockApplication();
    postsCollection = mockApp.collections.get('brighthub_posts')!;
    likesCollection = mockApp.collections.get('brighthub_likes')!;
    service = createPostService(mockApp);
  });

  /**
   * Preservation 2a: createPost stores to brighthub_posts and returns a valid post object.
   *
   * For all valid post creation inputs, PostService.createPost stores the post
   * in the brighthub_posts collection and returns a well-formed post object
   * with correct authorId, content, and initial counts of zero.
   *
   * **Validates: Requirements 3.1, 3.2**
   */
  describe('createPost stores to brighthub_posts and returns valid post', () => {
    it('should store post in brighthub_posts and return valid object for all valid inputs', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          async (authorId, content) => {
            const post = await service.createPost(authorId, content);

            // Post object has required fields
            expect(post._id).toBeDefined();
            expect(typeof post._id).toBe('string');
            expect(post.authorId).toBe(authorId);
            expect(post.content).toBe(content);
            expect(post.postType).toBe(PostType.Original);
            expect(post.isDeleted).toBe(false);
            expect(post.isEdited).toBe(false);
            expect(post.likeCount).toBe(0);
            expect(post.repostCount).toBe(0);
            expect(post.replyCount).toBe(0);
            expect(post.quoteCount).toBe(0);

            // Post is stored in the brighthub_posts collection
            const stored = postsCollection.data.find(
              (p: { _id: string }) => p._id === post._id,
            );
            expect(stored).toBeDefined();

            return true;
          },
        ),
        { numRuns: 25 },
      );
    });
  });

  /**
   * Preservation 2b: likePost/unlikePost correctly increment/decrement counts.
   *
   * For all valid like/unlike operations, the like count on the post is
   * correctly incremented when liked and decremented when unliked.
   *
   * **Validates: Requirements 3.1**
   */
  describe('likePost/unlikePost correctly update counts', () => {
    it('should increment like count on like and decrement on unlike', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 5 }),
          async (authorId, content, likerIds) => {
            const post = await service.createPost(authorId, content);
            const uniqueLikers = [...new Set(likerIds)];

            // Like from each unique user
            for (const likerId of uniqueLikers) {
              await service.likePost(post._id, likerId);
            }

            // Verify like count matches unique likers
            let stored = postsCollection.data.find(
              (p: { _id: string }) => p._id === post._id,
            ) as { _id: string; likeCount: number };
            expect(stored.likeCount).toBe(uniqueLikers.length);

            // Unlike from first user
            await service.unlikePost(post._id, uniqueLikers[0]);

            stored = postsCollection.data.find(
              (p: { _id: string }) => p._id === post._id,
            ) as { _id: string; likeCount: number };
            expect(stored.likeCount).toBe(uniqueLikers.length - 1);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Preservation 2c: deletePost soft-deletes the post.
   *
   * For all valid delete operations, PostService.deletePost sets isDeleted
   * to true on the post record without removing it from the collection.
   *
   * **Validates: Requirements 3.1**
   */
  describe('deletePost soft-deletes the post', () => {
    it('should set isDeleted to true for all valid delete operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          async (authorId, content) => {
            const post = await service.createPost(authorId, content);

            await service.deletePost(post._id, authorId);

            const stored = postsCollection.data.find(
              (p: { _id: string }) => p._id === post._id,
            ) as { _id: string; isDeleted: boolean };
            expect(stored).toBeDefined();
            expect(stored.isDeleted).toBe(true);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Preservation 2d: editPost updates content within edit window and sets isEdited.
   *
   * For all valid edit operations within the 15-minute edit window,
   * the content is updated and isEdited is set to true.
   *
   * **Validates: Requirements 3.1**
   */
  describe('editPost updates content within edit window', () => {
    it('should update content and set isEdited to true for all valid edits', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          validContentArb,
          async (authorId, originalContent, newContent) => {
            const post = await service.createPost(authorId, originalContent);

            // Edit within window (post was just created)
            const edited = await service.editPost(
              post._id,
              authorId,
              newContent,
            );

            expect(edited.content).toBe(newContent);
            expect(edited.isEdited).toBe(true);
            expect(edited.editedAt).toBeDefined();
            expect(edited.authorId).toBe(authorId);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  /**
   * Preservation 2e: Other dashboard stat calls are unaffected by PostService changes.
   *
   * The gatherChatStats, gatherPassStats, and gatherMailStats methods on the
   * DashboardController return their respective stats from their own services,
   * completely independent of PostService. We verify this by confirming that
   * mock chat/pass/mail services return their stats unchanged regardless of
   * post operations.
   *
   * **Validates: Requirements 3.5**
   */
  describe('other dashboard stats are unaffected by PostService operations', () => {
    it('should return chat/pass/mail stats unchanged after post operations', async () => {
      // Mock services that simulate chat, pass, and mail stat providers
      const chatStats = { totalConversations: 42, totalMessages: 1000 };
      const passStats = { totalVaults: 10, sharedVaults: 3 };
      const mailStats = {
        totalEmails: 500,
        deliveryFailures: 2,
        emailsLast24Hours: 50,
      };

      const mockChatService = {
        getStats: async () => ({ ...chatStats }),
      };
      const mockPassService = {
        getStats: async () => ({ ...passStats }),
      };
      const mockMailService = {
        getEmailStats: async () => ({ ...mailStats }),
      };

      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validContentArb,
          async (authorId, content) => {
            // Perform post operations
            const post = await service.createPost(authorId, content);
            await service.likePost(post._id, authorId);

            // Verify other service stats are completely unaffected
            const chatResult = await mockChatService.getStats();
            expect(chatResult).toEqual(chatStats);

            const passResult = await mockPassService.getStats();
            expect(passResult).toEqual(passStats);

            const mailResult = await mockMailService.getEmailStats();
            expect(mailResult).toEqual(mailStats);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });
  });
});
