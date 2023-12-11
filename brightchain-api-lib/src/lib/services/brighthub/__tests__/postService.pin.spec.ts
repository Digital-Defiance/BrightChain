/**
 * Unit tests for PostService pinPost / unpinPost.
 *
 * Validates pin and unpin behaviour including ownership checks,
 * automatic unpin of previously pinned posts, and error handling
 * for missing or deleted posts.
 */

import { PostErrorCode, PostServiceError } from '@brightchain/brighthub-lib';
import { PostService } from '../postService';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock autoModerationService to always allow content
jest.mock('../autoModerationService', () => ({
  moderateContent: jest
    .fn()
    .mockReturnValue({ decision: 'allow', reasons: [] }),
}));

// Mock textFormatter to return a simple formatted result
jest.mock('../textFormatter', () => {
  const mockFormat = jest.fn().mockImplementation((content: string) => ({
    raw: content,
    formatted: `<p>${content}</p>`,
    mentions: [],
    hashtags: [],
    characterCount: content.length,
  }));

  return {
    getTextFormatter: jest.fn().mockReturnValue({
      format: mockFormat,
      getCharacterCount: jest.fn().mockImplementation((c: string) => c.length),
    }),
    TextFormatter: jest.fn(),
  };
});

// ─── Mock collection helper ─────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function createMockCollection() {
  const store = new Map<string, any>();
  return {
    create: jest.fn(async (record: any) => {
      store.set(record._id, record);
      return record;
    }),
    findOne: jest.fn((filter: any) => ({
      exec: jest.fn(async () => store.get(filter._id) ?? null),
    })),
    find: jest.fn((filter: any) => ({
      exec: jest.fn(async () => {
        const results: any[] = [];
        for (const doc of store.values()) {
          let match = true;
          for (const [key, val] of Object.entries(filter)) {
            if ((doc as any)[key] !== val) {
              match = false;
              break;
            }
          }
          if (match) results.push(doc);
        }
        return results;
      }),
    })),
    updateOne: jest.fn((filter: any, update: any) => ({
      exec: jest.fn(async () => {
        const doc = store.get(filter._id);
        if (doc) {
          Object.assign(doc, update);
          return { modifiedCount: 1 };
        }
        return { modifiedCount: 0 };
      }),
    })),
    deleteOne: jest.fn((filter: any) => ({
      exec: jest.fn(async () => {
        const deleted = store.delete(filter._id);
        return { deletedCount: deleted ? 1 : 0 };
      }),
    })),
    /* expose the backing store for test setup */
    _store: store,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

// ─── Mock post record helper ────────────────────────────────────────────────

function buildMockPost(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    _id: 'post-1',
    authorId: 'user-1',
    content: 'hello world',
    formattedContent: '<p>hello world</p>',
    postType: 'original',
    mediaAttachments: [],
    mentions: [],
    hashtags: [],
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    quoteCount: 0,
    upvoteCount: 0,
    downvoteCount: 0,
    score: 0,
    isEdited: false,
    isBlogPost: true,
    isPinned: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'user-1',
    updatedBy: 'user-1',
    ...overrides,
  };
}

// ─── Mock application factory ───────────────────────────────────────────────

function createMockApplication() {
  const collections = new Map<string, ReturnType<typeof createMockCollection>>();
  collections.set('brighthub_posts', createMockCollection());
  collections.set('brighthub_likes', createMockCollection());
  collections.set('brighthub_reposts', createMockCollection());
  collections.set('brighthub_votes', createMockCollection());

  return {
    collections,
    getModel(name: string) {
      if (!collections.has(name)) {
        collections.set(name, createMockCollection());
      }
      return collections.get(name)!;
    },
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PostService pin / unpin', () => {
  let service: PostService;
  let mockApp: ReturnType<typeof createMockApplication>;
  let postsCollection: ReturnType<typeof createMockCollection>;

  beforeEach(() => {
    mockApp = createMockApplication();
    postsCollection = mockApp.collections.get('brighthub_posts')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new PostService(mockApp as any);
  });

  // ── pinPost ─────────────────────────────────────────────────────────────

  describe('pinPost', () => {
    it('successfully pins a post owned by the user', async () => {
      const post = buildMockPost({ _id: 'p1', authorId: 'u1', isPinned: false });
      postsCollection._store.set(post._id, post);

      await service.pinPost('p1', 'u1');

      expect(post.isPinned).toBe(true);
    });

    it('unpins any previously pinned post by the same author before pinning the new one', async () => {
      const oldPinned = buildMockPost({
        _id: 'p-old',
        authorId: 'u1',
        isPinned: true,
      });
      const newPost = buildMockPost({
        _id: 'p-new',
        authorId: 'u1',
        isPinned: false,
      });
      postsCollection._store.set(oldPinned._id, oldPinned);
      postsCollection._store.set(newPost._id, newPost);

      await service.pinPost('p-new', 'u1');

      expect(oldPinned.isPinned).toBe(false);
      expect(newPost.isPinned).toBe(true);
    });

    it('throws PostServiceError with Unauthorized code when userId does not match authorId', async () => {
      const post = buildMockPost({ _id: 'p1', authorId: 'u1' });
      postsCollection._store.set(post._id, post);

      await expect(service.pinPost('p1', 'u-other')).rejects.toThrow(
        PostServiceError,
      );
      await expect(service.pinPost('p1', 'u-other')).rejects.toMatchObject({
        code: PostErrorCode.Unauthorized,
      });
    });

    it('throws PostServiceError with PostNotFound when post does not exist', async () => {
      await expect(
        service.pinPost('nonexistent', 'u1'),
      ).rejects.toThrow(PostServiceError);
      await expect(
        service.pinPost('nonexistent', 'u1'),
      ).rejects.toMatchObject({
        code: PostErrorCode.PostNotFound,
      });
    });

    it('throws PostServiceError with PostNotFound when post is deleted', async () => {
      const post = buildMockPost({
        _id: 'p-del',
        authorId: 'u1',
        isDeleted: true,
      });
      postsCollection._store.set(post._id, post);

      await expect(service.pinPost('p-del', 'u1')).rejects.toThrow(
        PostServiceError,
      );
      await expect(service.pinPost('p-del', 'u1')).rejects.toMatchObject({
        code: PostErrorCode.PostNotFound,
      });
    });
  });

  // ── unpinPost ───────────────────────────────────────────────────────────

  describe('unpinPost', () => {
    it('successfully unpins a post owned by the user', async () => {
      const post = buildMockPost({ _id: 'p1', authorId: 'u1', isPinned: true });
      postsCollection._store.set(post._id, post);

      await service.unpinPost('p1', 'u1');

      expect(post.isPinned).toBe(false);
    });

    it('throws PostServiceError with Unauthorized when userId does not match authorId', async () => {
      const post = buildMockPost({ _id: 'p1', authorId: 'u1', isPinned: true });
      postsCollection._store.set(post._id, post);

      await expect(service.unpinPost('p1', 'u-other')).rejects.toThrow(
        PostServiceError,
      );
      await expect(service.unpinPost('p1', 'u-other')).rejects.toMatchObject({
        code: PostErrorCode.Unauthorized,
      });
    });

    it('throws PostServiceError with PostNotFound when post does not exist', async () => {
      await expect(
        service.unpinPost('nonexistent', 'u1'),
      ).rejects.toThrow(PostServiceError);
      await expect(
        service.unpinPost('nonexistent', 'u1'),
      ).rejects.toMatchObject({
        code: PostErrorCode.PostNotFound,
      });
    });
  });
});
