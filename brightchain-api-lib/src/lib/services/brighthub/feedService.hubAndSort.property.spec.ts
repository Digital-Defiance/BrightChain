/**
 * Property-based tests for Feed_Service — Hub Feed and Sort Algorithms.
 *
 * Tests:
 * - Property H1: Hub feed only contains posts with matching hubId
 * - Property H2: Hub feed respects blocked user filtering
 * - Property S1: 'new' sort returns posts in reverse chronological order
 * - Property S2: 'hot' sort ranks high-engagement recent posts above old ones
 * - Property S3: 'top' sort ranks posts by total engagement score
 * - Property S4: 'top' with time window excludes posts outside the window
 */

import { PostType } from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import { createFeedService, FeedService } from './feedService';
import {
  createMockApplication,
  MockCollection,
} from './postService.test-helpers';

// --- Record types ---

interface PostRecord {
  _id: string;
  authorId: string;
  content: string;
  formattedContent: string;
  postType: string;
  parentPostId?: string;
  quotedPostId?: string;
  mediaAttachments: never[];
  mentions: string[];
  hashtags: string[];
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
  isEdited: boolean;
  hubIds?: string[];
  isBlogPost: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

interface _BlockRecord {
  _id: string;
  blockerId: string;
  blockedId: string;
  createdAt: string;
}

interface _HubMemberRecord {
  _id: string;
  hubId: string;
  userId: string;
  addedAt: string;
}

// --- Helpers ---

let counter = 0;

function makePost(
  authorId: string,
  opts?: {
    hubIds?: string[];
    likeCount?: number;
    replyCount?: number;
    repostCount?: number;
    timeOffsetMs?: number;
    isDeleted?: boolean;
  },
): PostRecord {
  const now = Date.now();
  const offset = opts?.timeOffsetMs ?? -(counter * 1000);
  const createdAt = new Date(now + offset).toISOString();
  counter++;
  const id = `post-${counter}-${Math.random().toString(36).slice(2, 6)}`;
  return {
    _id: id,
    authorId,
    content: `Content ${id}`,
    formattedContent: `Content ${id}`,
    postType: PostType.Original,
    mediaAttachments: [],
    mentions: [],
    hashtags: [],
    likeCount: opts?.likeCount ?? 0,
    repostCount: opts?.repostCount ?? 0,
    replyCount: opts?.replyCount ?? 0,
    quoteCount: 0,
    isEdited: false,
    hubIds: opts?.hubIds,
    isBlogPost: true,
    isDeleted: opts?.isDeleted ?? false,
    createdAt,
    updatedAt: createdAt,
    createdBy: authorId,
    updatedBy: authorId,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function seed<T>(collection: MockCollection<any>, records: T[]): void {
  for (const r of records) {
    collection.data.push(r);
  }
}

// --- Test Suite ---

describe('Feed_Service — Hub Feed and Sort Property Tests', () => {
  let service: FeedService;
  let mockApp: ReturnType<typeof createMockApplication>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let postsCollection: MockCollection<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let blocksCollection: MockCollection<any>;

  beforeEach(() => {
    mockApp = createMockApplication();
    postsCollection = mockApp.getModel('brighthub_posts');
    blocksCollection = mockApp.getModel('brighthub_blocks');
    service = createFeedService(mockApp);
    counter = 0;
  });

  // =========================================================================
  // Property H1: Hub feed only contains posts with matching hubId
  // =========================================================================

  describe('Property H1: Hub feed content correctness', () => {
    it('should only return posts that belong to the requested hub', async () => {
      const hubId = 'hub-target';
      const otherHubId = 'hub-other';
      const author1 = 'user-a';
      const author2 = 'user-b';

      const hubPosts = [
        makePost(author1, { hubIds: [hubId], timeOffsetMs: -1000 }),
        makePost(author2, { hubIds: [hubId], timeOffsetMs: -2000 }),
        makePost(author1, { hubIds: [hubId, otherHubId], timeOffsetMs: -3000 }),
      ];
      const otherPosts = [
        makePost(author1, { hubIds: [otherHubId], timeOffsetMs: -4000 }),
        makePost(author2, { timeOffsetMs: -5000 }), // no hub
      ];
      seed(postsCollection, [...hubPosts, ...otherPosts]);

      const result = await service.getHubFeed(hubId);

      expect(result.posts).toHaveLength(3);
      for (const post of result.posts) {
        expect(post.hubIds).toBeDefined();
        expect(post.hubIds).toContain(hubId);
      }
    });

    it('should exclude deleted posts from hub feed', async () => {
      const hubId = 'hub-del';
      seed(postsCollection, [
        makePost('u1', { hubIds: [hubId], timeOffsetMs: -1000 }),
        makePost('u1', {
          hubIds: [hubId],
          timeOffsetMs: -2000,
          isDeleted: true,
        }),
      ]);

      const result = await service.getHubFeed(hubId);
      expect(result.posts).toHaveLength(1);
    });
  });

  // =========================================================================
  // Property H2: Hub feed respects blocked user filtering
  // =========================================================================

  describe('Property H2: Hub feed blocked user filtering', () => {
    it('should exclude posts from blocked users when requestingUserId is provided', async () => {
      const hubId = 'hub-block';
      const viewer = 'viewer-1';
      const blockedUser = 'blocked-1';
      const normalUser = 'normal-1';

      seed(postsCollection, [
        makePost(blockedUser, { hubIds: [hubId], timeOffsetMs: -1000 }),
        makePost(normalUser, { hubIds: [hubId], timeOffsetMs: -2000 }),
      ]);
      seed(blocksCollection, [
        {
          _id: 'b1',
          blockerId: viewer,
          blockedId: blockedUser,
          createdAt: new Date().toISOString(),
        },
      ]);

      const result = await service.getHubFeed(hubId, {}, viewer);

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0].authorId).toBe(normalUser);
    });
  });

  // =========================================================================
  // Property S1: 'new' sort returns reverse chronological order
  // =========================================================================

  describe('Property S1: new sort order', () => {
    it('should return posts newest first', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 3, max: 10 }), async (postCount) => {
          // Reset
          postsCollection.data = [];
          counter = 0;

          const hubId = 'hub-new';
          const posts: PostRecord[] = [];
          for (let i = 0; i < postCount; i++) {
            posts.push(
              makePost('author', {
                hubIds: [hubId],
                timeOffsetMs: -(i * 60000), // each 1 min apart
              }),
            );
          }
          seed(postsCollection, posts);

          const result = await service.getHubFeed(hubId, { sort: 'new' });

          // Verify descending chronological order
          for (let i = 1; i < result.posts.length; i++) {
            const prev = new Date(result.posts[i - 1].createdAt).getTime();
            const curr = new Date(result.posts[i].createdAt).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
          }
        }),
        { numRuns: 10 },
      );
    });
  });

  // =========================================================================
  // Property S2: 'hot' sort ranks high-engagement recent posts higher
  // =========================================================================

  describe('Property S2: hot sort algorithm', () => {
    it('should rank a recent high-engagement post above an old low-engagement post', async () => {
      const hubId = 'hub-hot';

      // Recent post with high engagement
      const hotPost = makePost('author', {
        hubIds: [hubId],
        likeCount: 50,
        replyCount: 20,
        repostCount: 10,
        timeOffsetMs: -60000, // 1 min ago
      });

      // Old post with low engagement
      const coldPost = makePost('author', {
        hubIds: [hubId],
        likeCount: 2,
        replyCount: 0,
        repostCount: 0,
        timeOffsetMs: -86400000 * 7, // 7 days ago
      });

      seed(postsCollection, [coldPost, hotPost]); // seed in wrong order

      const result = await service.getHubFeed(hubId, { sort: 'hot' });

      expect(result.posts.length).toBe(2);
      expect(result.posts[0]._id).toBe(hotPost._id);
    });

    it('should rank an older viral post above a brand new zero-engagement post', async () => {
      const hubId = 'hub-hot2';

      const viralPost = makePost('author', {
        hubIds: [hubId],
        likeCount: 500,
        replyCount: 100,
        repostCount: 50,
        timeOffsetMs: -3600000 * 6, // 6 hours ago
      });

      const newPost = makePost('author', {
        hubIds: [hubId],
        likeCount: 0,
        replyCount: 0,
        repostCount: 0,
        timeOffsetMs: -1000, // 1 second ago
      });

      seed(postsCollection, [newPost, viralPost]);

      const result = await service.getHubFeed(hubId, { sort: 'hot' });

      expect(result.posts[0]._id).toBe(viralPost._id);
    });
  });

  // =========================================================================
  // Property S3: 'top' sort ranks by total engagement
  // =========================================================================

  describe('Property S3: top sort by engagement', () => {
    it('should return posts ordered by total engagement score descending', async () => {
      const hubId = 'hub-top';

      const posts = [
        makePost('a', {
          hubIds: [hubId],
          likeCount: 10,
          replyCount: 5,
          repostCount: 2,
          timeOffsetMs: -1000,
        }),
        makePost('b', {
          hubIds: [hubId],
          likeCount: 100,
          replyCount: 50,
          repostCount: 20,
          timeOffsetMs: -2000,
        }),
        makePost('c', {
          hubIds: [hubId],
          likeCount: 1,
          replyCount: 0,
          repostCount: 0,
          timeOffsetMs: -3000,
        }),
        makePost('d', {
          hubIds: [hubId],
          likeCount: 50,
          replyCount: 10,
          repostCount: 5,
          timeOffsetMs: -4000,
        }),
      ];
      seed(postsCollection, posts);

      const result = await service.getHubFeed(hubId, {
        sort: 'top',
        topWindow: 'all',
      });

      // Verify descending engagement order
      for (let i = 1; i < result.posts.length; i++) {
        const prevScore =
          result.posts[i - 1].likeCount +
          result.posts[i - 1].repostCount +
          result.posts[i - 1].replyCount;
        const currScore =
          result.posts[i].likeCount +
          result.posts[i].repostCount +
          result.posts[i].replyCount;
        expect(prevScore).toBeGreaterThanOrEqual(currScore);
      }
    });
  });

  // =========================================================================
  // Property S4: 'top' with time window excludes old posts
  // =========================================================================

  describe('Property S4: top sort time window filtering', () => {
    it('should exclude posts older than the time window', async () => {
      const hubId = 'hub-topwin';

      const recentPost = makePost('a', {
        hubIds: [hubId],
        likeCount: 5,
        timeOffsetMs: -3600000, // 1 hour ago
      });
      const oldPost = makePost('b', {
        hubIds: [hubId],
        likeCount: 100,
        timeOffsetMs: -86400000 * 2, // 2 days ago
      });
      seed(postsCollection, [recentPost, oldPost]);

      const result = await service.getHubFeed(hubId, {
        sort: 'top',
        topWindow: 'day',
      });

      expect(result.posts).toHaveLength(1);
      expect(result.posts[0]._id).toBe(recentPost._id);
    });

    it('should include all posts when topWindow is "all"', async () => {
      const hubId = 'hub-topall';

      seed(postsCollection, [
        makePost('a', {
          hubIds: [hubId],
          likeCount: 5,
          timeOffsetMs: -3600000,
        }),
        makePost('b', {
          hubIds: [hubId],
          likeCount: 100,
          timeOffsetMs: -86400000 * 30,
        }),
      ]);

      const result = await service.getHubFeed(hubId, {
        sort: 'top',
        topWindow: 'all',
      });

      expect(result.posts).toHaveLength(2);
    });
  });
});

describe('Feed_Service — Controversial Sort', () => {
  let service: ReturnType<typeof createFeedService>;
  let mockApp: ReturnType<typeof createMockApplication>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let postsCollection: MockCollection<any>;

  beforeEach(() => {
    mockApp = createMockApplication();
    postsCollection = mockApp.getModel('brighthub_posts');
    service = createFeedService(mockApp);
  });

  it('should rank posts with balanced votes above one-sided posts', async () => {
    const hubId = 'hub-controversial';

    // Controversial: 50 upvotes, 48 downvotes → total 98, score 2
    const controversialPost = {
      _id: 'controversial-1',
      authorId: 'a',
      content: 'Controversial',
      formattedContent: 'Controversial',
      postType: 'original',
      mediaAttachments: [],
      mentions: [],
      hashtags: [],
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      quoteCount: 0,
      upvoteCount: 50,
      downvoteCount: 48,
      score: 2,
      isEdited: false,
      hubIds: [hubId],
      isBlogPost: true,
      isDeleted: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      createdBy: 'a',
      updatedBy: 'a',
    };

    // One-sided: 50 upvotes, 0 downvotes → total 50, score 50
    const oneSidedPost = {
      _id: 'onesided-1',
      authorId: 'b',
      content: 'One-sided',
      formattedContent: 'One-sided',
      postType: 'original',
      mediaAttachments: [],
      mentions: [],
      hashtags: [],
      likeCount: 0,
      repostCount: 0,
      replyCount: 0,
      quoteCount: 0,
      upvoteCount: 50,
      downvoteCount: 0,
      score: 50,
      isEdited: false,
      hubIds: [hubId],
      isBlogPost: true,
      isDeleted: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      createdBy: 'b',
      updatedBy: 'b',
    };

    postsCollection.data.push(oneSidedPost, controversialPost);

    const result = await service.getHubFeed(hubId, { sort: 'controversial' });

    expect(result.posts).toHaveLength(2);
    // Controversial post should rank first: 98/(1+2)=32.67 vs 50/(1+50)=0.98
    expect(result.posts[0]._id).toBe('controversial-1');
  });
});
