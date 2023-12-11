/**
 * Unit tests for PostService.createPost — isBlogPost flag.
 *
 * Validates that createPost passes the correct `isBlogPost` option
 * to the text formatter:
 *   - Top-level posts (no parentPostId) → isBlogPost: true
 *   - Reply posts (with parentPostId)   → isBlogPost: false
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockFormat = jest.fn().mockImplementation((content: string) => ({
  raw: content,
  formatted: `<p>${content}</p>`,
  mentions: [],
  hashtags: [],
  characterCount: content.length,
}));

jest.mock('../textFormatter', () => ({
  getTextFormatter: jest.fn().mockReturnValue({
    format: (...args: unknown[]) => mockFormat(...args),
    getCharacterCount: jest.fn().mockImplementation((c: string) => c.length),
  }),
}));

jest.mock('../autoModerationService', () => ({
  moderateContent: jest.fn().mockReturnValue({ decision: 'allow', reasons: [] }),
}));

import { PostService } from '../postService';

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

describe('PostService createPost — isBlogPost flag', () => {
  let service: PostService;
  let mockApp: ReturnType<typeof createMockApplication>;
  let postsCollection: ReturnType<typeof createMockCollection>;

  beforeEach(() => {
    mockApp = createMockApplication();
    postsCollection = mockApp.collections.get('brighthub_posts')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new PostService(mockApp as any);
    mockFormat.mockClear();
  });

  it('calls format with { isBlogPost: true } for a top-level post', async () => {
    await service.createPost('user-1', 'Hello world');

    expect(mockFormat).toHaveBeenCalledTimes(1);
    expect(mockFormat).toHaveBeenCalledWith('Hello world', {
      isBlogPost: true,
    });
  });

  it('calls format with { isBlogPost: false } for a reply', async () => {
    // Seed a parent post so the reply validation passes
    const now = new Date().toISOString();
    postsCollection._store.set('parent-1', {
      _id: 'parent-1',
      authorId: 'user-1',
      content: 'parent post',
      formattedContent: '<p>parent post</p>',
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
    });

    await service.createPost('user-2', 'Nice post!', {
      parentPostId: 'parent-1',
    });

    expect(mockFormat).toHaveBeenCalledTimes(1);
    expect(mockFormat).toHaveBeenCalledWith('Nice post!', {
      isBlogPost: false,
    });
  });
});
