import { FeedService } from '../feedService';

/**
 * Mock collection factory — mirrors the Collection<T> interface used by FeedService.
 */
function createMockCollection() {
  const store = new Map();
  return {
    create: jest.fn(async (record: any) => {
      store.set(record._id, record);
      return record;
    }),
    findOne: jest.fn((filter: any) => ({
      exec: jest.fn(async () => store.get(filter._id) ?? null),
    })),
    find: jest.fn((filter: any) => ({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      exec: jest.fn(async () => {
        const results: any[] = [];
        for (const doc of store.values()) {
          let match = true;
          for (const [key, val] of Object.entries(filter || {})) {
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
    updateOne: jest.fn((_filter: any, _update: any) => ({
      exec: jest.fn(async () => ({ modifiedCount: 1 })),
    })),
    deleteOne: jest.fn((_filter: any) => ({
      exec: jest.fn(async () => ({ deletedCount: 1 })),
    })),
    _store: store,
  };
}

function makePost(overrides: Record<string, unknown> = {}) {
  const now = new Date().toISOString();
  return {
    _id: `post-${Math.random().toString(36).slice(2, 10)}`,
    authorId: 'author-1',
    content: 'Hello world',
    formattedContent: '<p>Hello world</p>',
    postType: 'original',
    mediaAttachments: [],
    mentions: [],
    hashtags: [],
    likeCount: 0,
    repostCount: 0,
    replyCount: 0,
    quoteCount: 0,
    isEdited: false,
    isBlogPost: false,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
    createdBy: 'author-1',
    updatedBy: 'author-1',
    ...overrides,
  };
}

function createMockApplication() {
  const collections: Record<string, ReturnType<typeof createMockCollection>> = {
    brighthub_posts: createMockCollection(),
    brighthub_follows: createMockCollection(),
    brighthub_blocks: createMockCollection(),
    brighthub_mutes: createMockCollection(),
    brighthub_connection_list_members: createMockCollection(),
    brighthub_connection_metadata: createMockCollection(),
    brighthub_hub_members: createMockCollection(),
    brighthub_temporary_mutes: createMockCollection(),
  };

  return {
    getModel: jest.fn((name: string) => {
      if (!collections[name]) {
        collections[name] = createMockCollection();
      }
      return collections[name];
    }),
    _collections: collections,
  };
}

describe('FeedService — isPinned field', () => {
  let app: ReturnType<typeof createMockApplication>;
  let feedService: FeedService;

  beforeEach(() => {
    app = createMockApplication();
    feedService = new FeedService(app as any);
  });

  it('getUserFeed returns posts with isPinned field preserved', async () => {
    const pinnedPost = makePost({ _id: 'post-pinned', isPinned: true });
    app._collections['brighthub_posts']._store.set(pinnedPost._id, pinnedPost);

    const result = await feedService.getUserFeed('author-1');

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0]).toHaveProperty('isPinned');
  });

  it('isPinned: true is correctly returned for pinned posts', async () => {
    const pinnedPost = makePost({ _id: 'post-pinned', isPinned: true });
    app._collections['brighthub_posts']._store.set(pinnedPost._id, pinnedPost);

    const result = await feedService.getUserFeed('author-1');

    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].isPinned).toBe(true);
  });

  it('isPinned is false/undefined for non-pinned posts', async () => {
    const regularPost = makePost({ _id: 'post-regular', isPinned: false });
    const noFlagPost = makePost({ _id: 'post-noflag' });
    // noFlagPost has no isPinned set (undefined via makePost default)
    delete (noFlagPost as any).isPinned;

    app._collections['brighthub_posts']._store.set(
      regularPost._id,
      regularPost,
    );
    app._collections['brighthub_posts']._store.set(
      noFlagPost._id,
      noFlagPost,
    );

    const result = await feedService.getUserFeed('author-1');

    expect(result.posts).toHaveLength(2);

    const regular = result.posts.find((p) => p._id === 'post-regular');
    const noFlag = result.posts.find((p) => p._id === 'post-noflag');

    expect(regular).toBeDefined();
    expect(regular!.isPinned).toBe(false);

    expect(noFlag).toBeDefined();
    // When the source record has no isPinned, recordToPost maps it as undefined
    expect(noFlag!.isPinned).toBeUndefined();
  });
});
