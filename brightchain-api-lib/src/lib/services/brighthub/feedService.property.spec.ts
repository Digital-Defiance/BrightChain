/**
 * Property-based tests for Feed_Service.
 *
 * Tests the following properties:
 * - Property 13: Home Timeline Content Correctness
 * - Property 14: Timeline Pagination Limit
 * - Property 15: Timeline List and Category Filtering
 * - Property 16: Priority Connection Timeline Ordering
 *
 * Validates: Requirements 5.1-5.12
 */

import {
  DEFAULT_TIMELINE_LIMIT,
  MAX_TIMELINE_POSTS,
  PostType,
} from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import { createFeedService, FeedService } from './feedService';
import {
  createMockApplication,
  MockCollection,
} from './postService.test-helpers';

// --- Record types matching FeedService internals ---

interface PostRecord {
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
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

interface FollowRecord {
  _id: string;
  followerId: string;
  followedId: string;
  createdAt: string;
}

interface BlockRecord {
  _id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

interface MuteRecord {
  _id: string;
  muterId: string;
  mutedId: string;
  createdAt: string;
}

interface ConnectionListMemberRecord {
  _id: string;
  listId: string;
  userId: string;
  addedAt: string;
}

interface ConnectionMetadataRecord {
  _id: string;
  userId: string;
  connectionId: string;
  isPriority: boolean;
  isQuiet: boolean;
  categoryIds?: string[];
  createdAt: string;
  updatedAt: string;
}

interface HubMemberRecord {
  _id: string;
  hubId: string;
  userId: string;
  addedAt: string;
}

interface TemporaryMuteRecord {
  _id: string;
  userId: string;
  connectionId: string;
  duration: string;
  expiresAt: string;
  createdAt: string;
}

// --- Smart Generators ---

const userIdArb = fc.uuid();

let postCounter = 0;

/**
 * Generates a PostRecord for a given author at a specific time offset (ms from now).
 * timeOffsetMs should be negative for past posts.
 */
function postRecordArb(
  authorId: string,
  options?: {
    postType?: PostType;
    hashtags?: string[];
    hubIds?: string[];
    isDeleted?: boolean;
    timeOffsetMs?: number;
  },
): PostRecord {
  const now = Date.now();
  const offset = options?.timeOffsetMs ?? -(postCounter * 1000);
  const createdAt = new Date(now + offset).toISOString();
  postCounter++;
  const id = `post-${postCounter}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    _id: id,
    authorId,
    content: `Post content ${id}`,
    formattedContent: `Post content ${id}`,
    postType: options?.postType ?? PostType.Original,
    mediaAttachments: [],
    mentions: [],
    hashtags: options?.hashtags ?? [],
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    quoteCount: 0,
    isEdited: false,
    hubIds: options?.hubIds,
    isDeleted: options?.isDeleted ?? false,
    createdAt,
    updatedAt: createdAt,
    createdBy: authorId,
    updatedBy: authorId,
  };
}

function followRecord(followerId: string, followedId: string): FollowRecord {
  return {
    _id: `follow-${Math.random().toString(36).slice(2, 8)}`,
    followerId,
    followedId,
    createdAt: new Date().toISOString(),
  };
}

function blockRecord(blockerId: string, blockedId: string): BlockRecord {
  return {
    _id: `block-${Math.random().toString(36).slice(2, 8)}`,
    blockerId,
    blockedId,
    createdAt: new Date().toISOString(),
  };
}

function muteRecord(muterId: string, mutedId: string): MuteRecord {
  return {
    _id: `mute-${Math.random().toString(36).slice(2, 8)}`,
    muterId,
    mutedId,
    createdAt: new Date().toISOString(),
  };
}

function connectionListMemberRecord(
  listId: string,
  userId: string,
): ConnectionListMemberRecord {
  return {
    _id: `clm-${Math.random().toString(36).slice(2, 8)}`,
    listId,
    userId,
    addedAt: new Date().toISOString(),
  };
}

function connectionMetadataRecord(
  userId: string,
  connectionId: string,
  options?: { isPriority?: boolean; isQuiet?: boolean; categoryIds?: string[] },
): ConnectionMetadataRecord {
  return {
    _id: `cm-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    connectionId,
    isPriority: options?.isPriority ?? false,
    isQuiet: options?.isQuiet ?? false,
    categoryIds: options?.categoryIds,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function hubMemberRecord(hubId: string, userId: string): HubMemberRecord {
  return {
    _id: `circm-${Math.random().toString(36).slice(2, 8)}`,
    hubId,
    userId,
    addedAt: new Date().toISOString(),
  };
}

function temporaryMuteRecord(
  userId: string,
  connectionId: string,
  expiresInMs = 3600000,
): TemporaryMuteRecord {
  return {
    _id: `tmute-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    connectionId,
    duration: '1h',
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    createdAt: new Date().toISOString(),
  };
}

// --- Seed helpers ---

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function seedRecords<T>(collection: MockCollection<any>, records: T[]): void {
  for (const r of records) {
    collection.data.push(r);
  }
}

// --- Test Suite ---

describe('Feature: brighthub-social-network, Feed_Service Property Tests', () => {
  let service: FeedService;
  let mockApp: ReturnType<typeof createMockApplication>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let postsCollection: MockCollection<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let followsCollection: MockCollection<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let blocksCollection: MockCollection<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mutesCollection: MockCollection<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let connectionListMembersCollection: MockCollection<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let connectionMetadataCollection: MockCollection<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let hubMembersCollection: MockCollection<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let temporaryMutesCollection: MockCollection<any>;

  beforeEach(() => {
    mockApp = createMockApplication();
    postsCollection = mockApp.getModel('brighthub_posts');
    followsCollection = mockApp.getModel('brighthub_follows');
    blocksCollection = mockApp.getModel('brighthub_blocks');
    mutesCollection = mockApp.getModel('brighthub_mutes');
    connectionListMembersCollection = mockApp.getModel(
      'brighthub_connection_list_members',
    );
    connectionMetadataCollection = mockApp.getModel(
      'brighthub_connection_metadata',
    );
    hubMembersCollection = mockApp.getModel('brighthub_hub_members');
    temporaryMutesCollection = mockApp.getModel('brighthub_temporary_mutes');
    service = createFeedService(mockApp);
    postCounter = 0;
  });

  // =========================================================================
  // Property 13: Home Timeline Content Correctness
  // =========================================================================

  describe('Property 13: Home Timeline Content Correctness', () => {
    /**
     * Property 13: Home Timeline Content Correctness
     *
     * Home timeline should only contain posts from followed users and the user's own posts.
     * Posts should be in reverse chronological order (newest first).
     * Blocked users' posts should be excluded.
     * Muted users' posts should be excluded (when excludeMuted is not false).
     * Deleted posts should be excluded.
     * Reposts and quote posts should be included.
     * Hub-restricted posts should only appear if user is a hub member.
     *
     * **Validates: Requirements 5.1, 5.3, 5.4, 5.6, 5.7, 5.11, 5.12**
     */

    it('should only contain posts from followed users and own posts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 4 }),
          fc.array(userIdArb, { minLength: 1, maxLength: 3 }),
          async (userId, followedIds, unfollowedIds) => {
            // Ensure no overlap
            const uniqueFollowed = followedIds.filter(
              (id) => id !== userId && !unfollowedIds.includes(id),
            );
            const uniqueUnfollowed = unfollowedIds.filter(
              (id) => id !== userId && !followedIds.includes(id),
            );
            if (uniqueFollowed.length === 0 || uniqueUnfollowed.length === 0)
              return;

            // Seed follows
            seedRecords(
              followsCollection,
              uniqueFollowed.map((fid) => followRecord(userId, fid)),
            );

            // Seed posts from followed, unfollowed, and self
            const ownPost = postRecordArb(userId, { timeOffsetMs: -1000 });
            const followedPosts = uniqueFollowed.map((fid, i) =>
              postRecordArb(fid, { timeOffsetMs: -(2000 + i * 1000) }),
            );
            const unfollowedPosts = uniqueUnfollowed.map((uid, i) =>
              postRecordArb(uid, { timeOffsetMs: -(10000 + i * 1000) }),
            );
            seedRecords(postsCollection, [
              ownPost,
              ...followedPosts,
              ...unfollowedPosts,
            ]);

            const result = await service.getHomeTimeline(userId);

            // All returned posts should be from followed users or self
            const allowedIds = new Set([userId, ...uniqueFollowed]);
            for (const post of result.posts) {
              expect(allowedIds.has(post.authorId)).toBe(true);
            }

            // No unfollowed user posts should appear
            const unfollowedSet = new Set(uniqueUnfollowed);
            for (const post of result.posts) {
              expect(unfollowedSet.has(post.authorId)).toBe(false);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should return posts in reverse chronological order', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          // Create posts at different times
          const posts = Array.from({ length: 5 }, (_, i) =>
            postRecordArb(userId, { timeOffsetMs: -(i * 2000) }),
          );
          seedRecords(postsCollection, posts);

          const result = await service.getHomeTimeline(userId);

          // Verify reverse chronological order
          for (let i = 1; i < result.posts.length; i++) {
            const prev = new Date(result.posts[i - 1].createdAt).getTime();
            const curr = new Date(result.posts[i].createdAt).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
          }
        }),
        { numRuns: 20 },
      );
    });

    it('should exclude blocked users posts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, followedId, blockedId) => {
            if (
              userId === followedId ||
              userId === blockedId ||
              followedId === blockedId
            )
              return;

            // Follow both
            seedRecords(followsCollection, [
              followRecord(userId, followedId),
              followRecord(userId, blockedId),
            ]);

            // Block one
            seedRecords(blocksCollection, [blockRecord(userId, blockedId)]);

            // Seed posts
            seedRecords(postsCollection, [
              postRecordArb(followedId, { timeOffsetMs: -1000 }),
              postRecordArb(blockedId, { timeOffsetMs: -2000 }),
            ]);

            const result = await service.getHomeTimeline(userId);

            // No blocked user posts
            for (const post of result.posts) {
              expect(post.authorId).not.toBe(blockedId);
            }
            // Followed user posts should be present
            expect(result.posts.some((p) => p.authorId === followedId)).toBe(
              true,
            );
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should exclude muted users posts when excludeMuted is not false', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, followedId, mutedId) => {
            if (
              userId === followedId ||
              userId === mutedId ||
              followedId === mutedId
            )
              return;

            seedRecords(followsCollection, [
              followRecord(userId, followedId),
              followRecord(userId, mutedId),
            ]);
            seedRecords(mutesCollection, [muteRecord(userId, mutedId)]);
            seedRecords(postsCollection, [
              postRecordArb(followedId, { timeOffsetMs: -1000 }),
              postRecordArb(mutedId, { timeOffsetMs: -2000 }),
            ]);

            const result = await service.getHomeTimeline(userId);

            for (const post of result.posts) {
              expect(post.authorId).not.toBe(mutedId);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should exclude deleted posts', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          seedRecords(postsCollection, [
            postRecordArb(userId, { timeOffsetMs: -1000 }),
            postRecordArb(userId, {
              timeOffsetMs: -2000,
              isDeleted: true,
            }),
          ]);

          const result = await service.getHomeTimeline(userId);

          for (const post of result.posts) {
            expect(post.isDeleted).not.toBe(true);
          }
        }),
        { numRuns: 20 },
      );
    });

    it('should include reposts and quote posts', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          const repost = postRecordArb(userId, {
            postType: PostType.Repost,
            timeOffsetMs: -1000,
          });
          const quote = postRecordArb(userId, {
            postType: PostType.Quote,
            timeOffsetMs: -2000,
          });
          seedRecords(postsCollection, [repost, quote]);

          const result = await service.getHomeTimeline(userId);

          const types = result.posts.map((p) => p.postType);
          expect(types).toContain(PostType.Repost);
          expect(types).toContain(PostType.Quote);
        }),
        { numRuns: 20 },
      );
    });

    it('should only show hub-restricted posts if user is a hub member', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          fc.uuid(),
          async (userId, followedId, hubId) => {
            if (userId === followedId) return;

            seedRecords(followsCollection, [followRecord(userId, followedId)]);

            // Post restricted to a hub
            const hubPost = postRecordArb(followedId, {
              hubIds: [hubId],
              timeOffsetMs: -1000,
            });
            // Public post
            const publicPost = postRecordArb(followedId, {
              timeOffsetMs: -2000,
            });
            seedRecords(postsCollection, [hubPost, publicPost]);

            // User is NOT a hub member
            const resultWithout = await service.getHomeTimeline(userId);
            expect(resultWithout.posts.some((p) => p._id === hubPost._id)).toBe(
              false,
            );
            expect(
              resultWithout.posts.some((p) => p._id === publicPost._id),
            ).toBe(true);

            // Now add user to hub
            seedRecords(hubMembersCollection, [hubMemberRecord(hubId, userId)]);

            const resultWith = await service.getHomeTimeline(userId);
            expect(resultWith.posts.some((p) => p._id === hubPost._id)).toBe(
              true,
            );
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 14: Timeline Pagination Limit
  // =========================================================================

  describe('Property 14: Timeline Pagination Limit', () => {
    /**
     * Property 14: Timeline Pagination Limit
     *
     * All timeline methods should return at most MAX_TIMELINE_POSTS (50) posts.
     * Requesting more than 50 should still return at most 50.
     * Cursor-based pagination should return posts older than the cursor.
     * hasMore should be true when there are more posts available.
     * hasMore should be false when all posts have been returned.
     * Cursor should be the createdAt of the last returned post.
     *
     * **Validates: Requirements 5.3, 5.7**
     */

    it('should return at most MAX_TIMELINE_POSTS posts for all timeline methods', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.integer({
            min: MAX_TIMELINE_POSTS + 1,
            max: MAX_TIMELINE_POSTS + 30,
          }),
          async (userId, postCount) => {
            // Create more posts than the limit
            const posts = Array.from({ length: postCount }, (_, i) =>
              postRecordArb(userId, { timeOffsetMs: -(i * 1000) }),
            );
            seedRecords(postsCollection, posts);

            // Test getHomeTimeline
            const homeResult = await service.getHomeTimeline(userId, {
              limit: postCount,
            });
            expect(homeResult.posts.length).toBeLessThanOrEqual(
              MAX_TIMELINE_POSTS,
            );

            // Test getPublicTimeline
            const publicResult = await service.getPublicTimeline({
              limit: postCount,
            });
            expect(publicResult.posts.length).toBeLessThanOrEqual(
              MAX_TIMELINE_POSTS,
            );

            // Test getUserFeed
            const userResult = await service.getUserFeed(userId, {
              limit: postCount,
            });
            expect(userResult.posts.length).toBeLessThanOrEqual(
              MAX_TIMELINE_POSTS,
            );
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should default to DEFAULT_TIMELINE_LIMIT when no limit specified', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          // Create more posts than default limit
          const posts = Array.from(
            { length: DEFAULT_TIMELINE_LIMIT + 10 },
            (_, i) => postRecordArb(userId, { timeOffsetMs: -(i * 1000) }),
          );
          seedRecords(postsCollection, posts);

          const result = await service.getHomeTimeline(userId);
          expect(result.posts.length).toBe(DEFAULT_TIMELINE_LIMIT);
        }),
        { numRuns: 10 },
      );
    });

    it('should return posts older than cursor when cursor is provided', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          // Create posts with known timestamps
          const posts = Array.from({ length: 10 }, (_, i) =>
            postRecordArb(userId, { timeOffsetMs: -(i * 5000) }),
          );
          seedRecords(postsCollection, posts);

          // Get first page
          const firstPage = await service.getHomeTimeline(userId, { limit: 3 });
          expect(firstPage.posts.length).toBe(3);
          expect(firstPage.cursor).toBeDefined();

          // Get second page using cursor
          const secondPage = await service.getHomeTimeline(userId, {
            limit: 3,
            cursor: firstPage.cursor,
          });

          // All second page posts should be older than the cursor
          const cursorTime = new Date(firstPage.cursor!).getTime();
          for (const post of secondPage.posts) {
            expect(new Date(post.createdAt).getTime()).toBeLessThan(cursorTime);
          }
        }),
        { numRuns: 15 },
      );
    });

    it('should set hasMore=true when more posts are available', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          // Create more posts than the requested limit
          const posts = Array.from({ length: 10 }, (_, i) =>
            postRecordArb(userId, { timeOffsetMs: -(i * 1000) }),
          );
          seedRecords(postsCollection, posts);

          const result = await service.getHomeTimeline(userId, { limit: 5 });
          expect(result.hasMore).toBe(true);
        }),
        { numRuns: 15 },
      );
    });

    it('should set hasMore=false when all posts have been returned', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          // Create fewer posts than the limit
          const posts = Array.from({ length: 3 }, (_, i) =>
            postRecordArb(userId, { timeOffsetMs: -(i * 1000) }),
          );
          seedRecords(postsCollection, posts);

          const result = await service.getHomeTimeline(userId, { limit: 10 });
          expect(result.hasMore).toBe(false);
        }),
        { numRuns: 15 },
      );
    });

    it('should set cursor to createdAt of the last returned post', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          const posts = Array.from({ length: 5 }, (_, i) =>
            postRecordArb(userId, { timeOffsetMs: -(i * 2000) }),
          );
          seedRecords(postsCollection, posts);

          const result = await service.getHomeTimeline(userId, { limit: 3 });
          if (result.posts.length > 0) {
            const lastPost = result.posts[result.posts.length - 1];
            expect(result.cursor).toBe(lastPost.createdAt);
          }
        }),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 15: Timeline List and Category Filtering
  // =========================================================================

  describe('Property 15: Timeline List and Category Filtering', () => {
    /**
     * Property 15: Timeline List and Category Filtering
     *
     * getListTimeline should only return posts from list members.
     * getCategoryTimeline should only return posts from connections in the category.
     * Both should exclude blocked and muted users.
     * Both should respect hub visibility.
     * Empty list/category should return empty results.
     *
     * **Validates: Requirements 5.8, 5.9, 5.11, 5.12**
     */

    it('getListTimeline should only return posts from list members', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          fc.array(userIdArb, { minLength: 1, maxLength: 3 }),
          fc.array(userIdArb, { minLength: 1, maxLength: 3 }),
          async (userId, listId, memberIds, nonMemberIds) => {
            const uniqueMembers = memberIds.filter(
              (id) => id !== userId && !nonMemberIds.includes(id),
            );
            const uniqueNonMembers = nonMemberIds.filter(
              (id) => id !== userId && !memberIds.includes(id),
            );
            if (uniqueMembers.length === 0 || uniqueNonMembers.length === 0)
              return;

            // Seed list members
            seedRecords(
              connectionListMembersCollection,
              uniqueMembers.map((mid) =>
                connectionListMemberRecord(listId, mid),
              ),
            );

            // Seed posts from members and non-members
            const memberPosts = uniqueMembers.map((mid, i) =>
              postRecordArb(mid, { timeOffsetMs: -(1000 + i * 1000) }),
            );
            const nonMemberPosts = uniqueNonMembers.map((nid, i) =>
              postRecordArb(nid, { timeOffsetMs: -(10000 + i * 1000) }),
            );
            seedRecords(postsCollection, [...memberPosts, ...nonMemberPosts]);

            const result = await service.getListTimeline(listId, userId);

            const memberSet = new Set(uniqueMembers);
            for (const post of result.posts) {
              expect(memberSet.has(post.authorId)).toBe(true);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('getCategoryTimeline should only return posts from category connections', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          fc.array(userIdArb, { minLength: 1, maxLength: 3 }),
          fc.array(userIdArb, { minLength: 1, maxLength: 3 }),
          async (userId, categoryId, categoryConnIds, nonCategoryConnIds) => {
            const uniqueCategory = categoryConnIds.filter(
              (id) => id !== userId && !nonCategoryConnIds.includes(id),
            );
            const uniqueNonCategory = nonCategoryConnIds.filter(
              (id) => id !== userId && !categoryConnIds.includes(id),
            );
            if (uniqueCategory.length === 0 || uniqueNonCategory.length === 0)
              return;

            // Seed connection metadata with category
            seedRecords(
              connectionMetadataCollection,
              uniqueCategory.map((cid) =>
                connectionMetadataRecord(userId, cid, {
                  categoryIds: [categoryId],
                }),
              ),
            );

            // Seed posts
            const categoryPosts = uniqueCategory.map((cid, i) =>
              postRecordArb(cid, { timeOffsetMs: -(1000 + i * 1000) }),
            );
            const nonCategoryPosts = uniqueNonCategory.map((nid, i) =>
              postRecordArb(nid, { timeOffsetMs: -(10000 + i * 1000) }),
            );
            seedRecords(postsCollection, [
              ...categoryPosts,
              ...nonCategoryPosts,
            ]);

            const result = await service.getCategoryTimeline(
              categoryId,
              userId,
            );

            const categorySet = new Set(uniqueCategory);
            for (const post of result.posts) {
              expect(categorySet.has(post.authorId)).toBe(true);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('getListTimeline should exclude blocked and muted users', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, listId, normalMember, blockedMember, mutedMember) => {
            const ids = [userId, normalMember, blockedMember, mutedMember];
            if (new Set(ids).size !== ids.length) return;

            // All are list members
            seedRecords(connectionListMembersCollection, [
              connectionListMemberRecord(listId, normalMember),
              connectionListMemberRecord(listId, blockedMember),
              connectionListMemberRecord(listId, mutedMember),
            ]);

            // Block and mute
            seedRecords(blocksCollection, [blockRecord(userId, blockedMember)]);
            seedRecords(mutesCollection, [muteRecord(userId, mutedMember)]);

            // Seed posts
            seedRecords(postsCollection, [
              postRecordArb(normalMember, { timeOffsetMs: -1000 }),
              postRecordArb(blockedMember, { timeOffsetMs: -2000 }),
              postRecordArb(mutedMember, { timeOffsetMs: -3000 }),
            ]);

            const result = await service.getListTimeline(listId, userId);

            for (const post of result.posts) {
              expect(post.authorId).not.toBe(blockedMember);
              expect(post.authorId).not.toBe(mutedMember);
            }
            expect(result.posts.some((p) => p.authorId === normalMember)).toBe(
              true,
            );
          },
        ),
        { numRuns: 15 },
      );
    });

    it('getListTimeline should respect hub visibility', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uuid(),
          userIdArb,
          fc.uuid(),
          async (userId, listId, memberId, hubId) => {
            if (userId === memberId) return;

            seedRecords(connectionListMembersCollection, [
              connectionListMemberRecord(listId, memberId),
            ]);

            const hubPost = postRecordArb(memberId, {
              hubIds: [hubId],
              timeOffsetMs: -1000,
            });
            const publicPost = postRecordArb(memberId, {
              timeOffsetMs: -2000,
            });
            seedRecords(postsCollection, [hubPost, publicPost]);

            // Without hub membership
            const resultWithout = await service.getListTimeline(listId, userId);
            expect(resultWithout.posts.some((p) => p._id === hubPost._id)).toBe(
              false,
            );
            expect(
              resultWithout.posts.some((p) => p._id === publicPost._id),
            ).toBe(true);

            // With hub membership
            seedRecords(hubMembersCollection, [hubMemberRecord(hubId, userId)]);
            const resultWith = await service.getListTimeline(listId, userId);
            expect(resultWith.posts.some((p) => p._id === hubPost._id)).toBe(
              true,
            );
          },
        ),
        { numRuns: 15 },
      );
    });

    it('empty list should return empty results', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, fc.uuid(), async (userId, listId) => {
          // No members in the list, but posts exist
          seedRecords(postsCollection, [
            postRecordArb(userId, { timeOffsetMs: -1000 }),
          ]);

          const result = await service.getListTimeline(listId, userId);
          expect(result.posts).toHaveLength(0);
          expect(result.hasMore).toBe(false);
        }),
        { numRuns: 15 },
      );
    });

    it('empty category should return empty results', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, fc.uuid(), async (userId, categoryId) => {
          // No connections in the category, but posts exist
          seedRecords(postsCollection, [
            postRecordArb(userId, { timeOffsetMs: -1000 }),
          ]);

          const result = await service.getCategoryTimeline(categoryId, userId);
          expect(result.posts).toHaveLength(0);
          expect(result.hasMore).toBe(false);
        }),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 16: Priority Connection Timeline Ordering
  // =========================================================================

  describe('Property 16: Priority Connection Timeline Ordering', () => {
    /**
     * Property 16: Priority Connection Timeline Ordering
     *
     * In home timeline, priority connection posts should appear before non-priority posts.
     * Within priority posts, order should be reverse chronological.
     * Within non-priority posts, order should be reverse chronological.
     * Non-priority timelines (public, user feed, hashtag) should not apply priority ordering.
     *
     * **Validates: Requirements 5.10**
     */

    it('priority connection posts should appear before non-priority in home timeline', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, priorityId, normalId) => {
            const ids = [userId, priorityId, normalId];
            if (new Set(ids).size !== ids.length) return;

            // Follow both
            seedRecords(followsCollection, [
              followRecord(userId, priorityId),
              followRecord(userId, normalId),
            ]);

            // Mark one as priority
            seedRecords(connectionMetadataCollection, [
              connectionMetadataRecord(userId, priorityId, {
                isPriority: true,
              }),
            ]);

            // Priority post is OLDER than normal post
            seedRecords(postsCollection, [
              postRecordArb(normalId, { timeOffsetMs: -1000 }),
              postRecordArb(priorityId, { timeOffsetMs: -5000 }),
            ]);

            const result = await service.getHomeTimeline(userId);
            expect(result.posts.length).toBe(2);

            // Priority post should come first even though it's older
            expect(result.posts[0].authorId).toBe(priorityId);
            expect(result.posts[1].authorId).toBe(normalId);
          },
        ),
        { numRuns: 20 },
      );
    });

    it('within priority posts, order should be reverse chronological', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, priority1, priority2) => {
            const ids = [userId, priority1, priority2];
            if (new Set(ids).size !== ids.length) return;

            seedRecords(followsCollection, [
              followRecord(userId, priority1),
              followRecord(userId, priority2),
            ]);
            seedRecords(connectionMetadataCollection, [
              connectionMetadataRecord(userId, priority1, {
                isPriority: true,
              }),
              connectionMetadataRecord(userId, priority2, {
                isPriority: true,
              }),
            ]);

            // priority1 post is newer
            seedRecords(postsCollection, [
              postRecordArb(priority1, { timeOffsetMs: -1000 }),
              postRecordArb(priority2, { timeOffsetMs: -5000 }),
            ]);

            const result = await service.getHomeTimeline(userId);

            // Both should be present, in reverse chronological order
            const priorityPosts = result.posts.filter(
              (p) => p.authorId === priority1 || p.authorId === priority2,
            );
            for (let i = 1; i < priorityPosts.length; i++) {
              const prev = new Date(priorityPosts[i - 1].createdAt).getTime();
              const curr = new Date(priorityPosts[i].createdAt).getTime();
              expect(prev).toBeGreaterThanOrEqual(curr);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('within non-priority posts, order should be reverse chronological', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, priorityId, normal1, normal2) => {
            const ids = [userId, priorityId, normal1, normal2];
            if (new Set(ids).size !== ids.length) return;

            seedRecords(followsCollection, [
              followRecord(userId, priorityId),
              followRecord(userId, normal1),
              followRecord(userId, normal2),
            ]);
            seedRecords(connectionMetadataCollection, [
              connectionMetadataRecord(userId, priorityId, {
                isPriority: true,
              }),
            ]);

            seedRecords(postsCollection, [
              postRecordArb(priorityId, { timeOffsetMs: -10000 }),
              postRecordArb(normal1, { timeOffsetMs: -1000 }),
              postRecordArb(normal2, { timeOffsetMs: -5000 }),
            ]);

            const result = await service.getHomeTimeline(userId);

            // Non-priority posts should be in reverse chronological order
            const nonPriorityPosts = result.posts.filter(
              (p) => p.authorId !== priorityId,
            );
            for (let i = 1; i < nonPriorityPosts.length; i++) {
              const prev = new Date(
                nonPriorityPosts[i - 1].createdAt,
              ).getTime();
              const curr = new Date(nonPriorityPosts[i].createdAt).getTime();
              expect(prev).toBeGreaterThanOrEqual(curr);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('public timeline should not apply priority ordering', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, author1, author2) => {
            const ids = [userId, author1, author2];
            if (new Set(ids).size !== ids.length) return;

            // Mark author1 as priority for userId
            seedRecords(connectionMetadataCollection, [
              connectionMetadataRecord(userId, author1, { isPriority: true }),
            ]);

            // author2 post is newer
            seedRecords(postsCollection, [
              postRecordArb(author2, { timeOffsetMs: -1000 }),
              postRecordArb(author1, { timeOffsetMs: -5000 }),
            ]);

            const result = await service.getPublicTimeline({}, userId);

            // Should be in pure reverse chronological order (no priority)
            for (let i = 1; i < result.posts.length; i++) {
              const prev = new Date(result.posts[i - 1].createdAt).getTime();
              const curr = new Date(result.posts[i].createdAt).getTime();
              expect(prev).toBeGreaterThanOrEqual(curr);
            }

            // author2's newer post should come first
            if (result.posts.length === 2) {
              expect(result.posts[0].authorId).toBe(author2);
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('user feed should not apply priority ordering', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId, targetId) => {
          if (userId === targetId) return;

          seedRecords(connectionMetadataCollection, [
            connectionMetadataRecord(userId, targetId, { isPriority: true }),
          ]);

          seedRecords(postsCollection, [
            postRecordArb(targetId, { timeOffsetMs: -1000 }),
            postRecordArb(targetId, { timeOffsetMs: -5000 }),
          ]);

          const result = await service.getUserFeed(targetId, {}, userId);

          // Should be in pure reverse chronological order
          for (let i = 1; i < result.posts.length; i++) {
            const prev = new Date(result.posts[i - 1].createdAt).getTime();
            const curr = new Date(result.posts[i].createdAt).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
          }
        }),
        { numRuns: 15 },
      );
    });

    it('hashtag feed should not apply priority ordering', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, author1, author2) => {
            const ids = [userId, author1, author2];
            if (new Set(ids).size !== ids.length) return;

            seedRecords(connectionMetadataCollection, [
              connectionMetadataRecord(userId, author1, { isPriority: true }),
            ]);

            const tag = 'testtag';
            // author2 post is newer
            seedRecords(postsCollection, [
              postRecordArb(author2, {
                hashtags: [tag],
                timeOffsetMs: -1000,
              }),
              postRecordArb(author1, {
                hashtags: [tag],
                timeOffsetMs: -5000,
              }),
            ]);

            const result = await service.getHashtagFeed(tag, {}, userId);

            // Should be in pure reverse chronological order
            for (let i = 1; i < result.posts.length; i++) {
              const prev = new Date(result.posts[i - 1].createdAt).getTime();
              const curr = new Date(result.posts[i].createdAt).getTime();
              expect(prev).toBeGreaterThanOrEqual(curr);
            }
          },
        ),
        { numRuns: 15 },
      );
    });
  });
});
