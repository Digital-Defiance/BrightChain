/**
 * Unit tests for PostService inline image integration.
 *
 * Tests:
 * 1. createPost with staging URLs → URL Rewriter called, rewritten content saved, mediaAttachments stored
 * 2. createPost without staging URLs → URL Rewriter called but returns content unchanged
 * 3. createPost without URL Rewriter set → works normally (backward compatible)
 * 4. editPost adding new staging URLs → URL Rewriter called for new images, merged with retained
 * 5. editPost removing images → mediaAttachments filtered to only retained permanent URLs
 * 6. editPost with unchanged images → no rewriter call needed, attachments preserved
 *
 * Requirements: 5.1–5.6, 7.1–7.4
 */

import {
  PostType,
  type IBaseMediaAttachment,
} from '@brightchain/brighthub-lib';
import { PostService } from '../postService';
import type { IRewriteResult, UrlRewriterService } from '../urlRewriterService';

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

// ─── Valid UUID v4 tokens ───────────────────────────────────────────────────

const TOKEN_1 = 'a1b2c3d4-e5f6-4a90-abcd-ef1234567890';
const TOKEN_2 = 'b2c3d4e5-f6a7-4b01-8cde-f12345678901';

const FILE_ID_1 = 'f0000001-0000-4000-8000-000000000001';
const FILE_ID_2 = 'f0000002-0000-4000-8000-000000000002';

const AUTHOR_ID = 'user-author-1';
const POST_ID = 'post-0000-0000-0000-000000000001';

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeStagingUrl(token: string): string {
  return `/api/temp-upload/${token}/preview`;
}

function makePermanentUrl(fileId: string): string {
  return `/api/post-images/${fileId}`;
}

function makeMediaAttachment(
  fileId: string,
  overrides?: Partial<IBaseMediaAttachment<string>>,
): IBaseMediaAttachment<string> {
  return {
    _id: fileId,
    url: makePermanentUrl(fileId),
    mimeType: 'image/png',
    size: 1024,
    width: 800,
    height: 600,
    altText: `image ${fileId}`,
    ...overrides,
  };
}

/**
 * Create a mock collection with standard CRUD operations.
 * Stores records in an in-memory map keyed by _id.
 */
function createMockCollection<T extends { _id: string }>() {
  const store = new Map<string, T>();

  return {
    store,
    create: jest.fn().mockImplementation((record: T) => {
      store.set(record._id, { ...record });
      return Promise.resolve({ ...record });
    }),
    findOne: jest.fn().mockImplementation((filter: Partial<T>) => ({
      exec: jest.fn().mockImplementation(() => {
        if ('_id' in filter) {
          const found = store.get(filter._id as string);
          return Promise.resolve(found ? { ...found } : null);
        }
        // Simple filter match for other fields
        for (const [, record] of store) {
          const matches = Object.entries(filter).every(
            ([key, value]) =>
              (record as Record<string, unknown>)[key] === value,
          );
          if (matches) return Promise.resolve({ ...record });
        }
        return Promise.resolve(null);
      }),
    })),
    find: jest.fn().mockImplementation((filter: Partial<T>) => ({
      exec: jest.fn().mockImplementation(() => {
        const results: T[] = [];
        for (const [, record] of store) {
          const matches = Object.entries(filter).every(
            ([key, value]) =>
              (record as Record<string, unknown>)[key] === value,
          );
          if (matches) results.push({ ...record });
        }
        return Promise.resolve(results);
      }),
    })),
    updateOne: jest
      .fn()
      .mockImplementation((filter: Partial<T>, update: Partial<T>) => ({
        exec: jest.fn().mockImplementation(() => {
          if ('_id' in filter) {
            const existing = store.get(filter._id as string);
            if (existing) {
              const updated = { ...existing, ...update };
              store.set(filter._id as string, updated);
              return Promise.resolve({ modifiedCount: 1 });
            }
          }
          return Promise.resolve({ modifiedCount: 0 });
        }),
      })),
    deleteOne: jest.fn().mockImplementation(() => ({
      exec: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    })),
  };
}

function createMockApplication() {
  const postsCollection = createMockCollection();
  const likesCollection = createMockCollection();
  const repostsCollection = createMockCollection();
  const votesCollection = createMockCollection();

  const collections: Record<string, ReturnType<typeof createMockCollection>> = {
    brighthub_posts: postsCollection,
    brighthub_likes: likesCollection,
    brighthub_reposts: repostsCollection,
    brighthub_votes: votesCollection,
  };

  const application = {
    getModel: jest.fn().mockImplementation((name: string) => collections[name]),
  };

  return {
    application,
    postsCollection,
    likesCollection,
    repostsCollection,
    votesCollection,
  };
}

function createMockUrlRewriter(overrides?: {
  rewriteContent?: jest.Mock;
}): UrlRewriterService {
  return {
    rewriteContent:
      overrides?.rewriteContent ??
      jest.fn().mockResolvedValue({
        rewrittenContent: 'no staging urls',
        mediaAttachments: [],
      } as IRewriteResult),
  } as unknown as UrlRewriterService;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('PostService inline image integration', () => {
  // ── 1. createPost with staging URLs ─────────────────────────────────────

  describe('createPost with staging URLs', () => {
    it('should call URL Rewriter, save rewritten content, and store mediaAttachments', async () => {
      const { application, postsCollection } = createMockApplication();
      const service = new PostService(application);

      const contentWithStagingUrls = `Hello ![img1](${makeStagingUrl(TOKEN_1)}) world ![img2](${makeStagingUrl(TOKEN_2)})`;

      const rewrittenContent = `Hello ![img1](${makePermanentUrl(FILE_ID_1)}) world ![img2](${makePermanentUrl(FILE_ID_2)})`;

      const mediaAttachments = [
        makeMediaAttachment(FILE_ID_1),
        makeMediaAttachment(FILE_ID_2),
      ];

      const rewriteContentMock = jest.fn().mockResolvedValue({
        rewrittenContent,
        mediaAttachments,
      } as IRewriteResult);

      const urlRewriter = createMockUrlRewriter({
        rewriteContent: rewriteContentMock,
      });
      service.setUrlRewriter(urlRewriter);

      const result = await service.createPost(
        AUTHOR_ID,
        contentWithStagingUrls,
      );

      // URL Rewriter should have been called with the stripped content, null hubId, and authorId
      expect(rewriteContentMock).toHaveBeenCalledTimes(1);
      expect(rewriteContentMock).toHaveBeenCalledWith(
        expect.any(String), // content after stripExternalImageUrls
        null, // no hubId for top-level post
        AUTHOR_ID,
      );

      // The saved post should have the rewritten content
      expect(result.content).toBe(rewrittenContent);

      // The saved post should have the media attachments from the rewriter
      expect(result.mediaAttachments).toHaveLength(2);
      expect(result.mediaAttachments[0]._id).toBe(FILE_ID_1);
      expect(result.mediaAttachments[1]._id).toBe(FILE_ID_2);

      // Verify the post was persisted in the collection
      const stored = postsCollection.store.values().next().value;
      expect(stored).toBeDefined();
      expect(stored.mediaAttachments).toHaveLength(2);
    });

    it('should pass hubId to URL Rewriter when creating a hub post', async () => {
      const { application } = createMockApplication();
      const service = new PostService(application);

      const rewriteContentMock = jest.fn().mockResolvedValue({
        rewrittenContent: `text ![img](${makePermanentUrl(FILE_ID_1)})`,
        mediaAttachments: [makeMediaAttachment(FILE_ID_1)],
      } as IRewriteResult);

      const urlRewriter = createMockUrlRewriter({
        rewriteContent: rewriteContentMock,
      });
      service.setUrlRewriter(urlRewriter);

      const content = `text ![img](${makeStagingUrl(TOKEN_1)})`;
      await service.createPost(AUTHOR_ID, content, { hubIds: ['hub-42'] });

      // Should pass the first hubId to the rewriter
      expect(rewriteContentMock).toHaveBeenCalledWith(
        expect.any(String),
        'hub-42',
        AUTHOR_ID,
      );
    });
  });

  // ── 2. createPost without staging URLs ──────────────────────────────────

  describe('createPost without staging URLs', () => {
    it('should call URL Rewriter which returns content unchanged', async () => {
      const { application } = createMockApplication();
      const service = new PostService(application);

      const plainContent = 'Hello world, no images here.';

      const rewriteContentMock = jest.fn().mockResolvedValue({
        rewrittenContent: plainContent,
        mediaAttachments: [],
      } as IRewriteResult);

      const urlRewriter = createMockUrlRewriter({
        rewriteContent: rewriteContentMock,
      });
      service.setUrlRewriter(urlRewriter);

      const result = await service.createPost(AUTHOR_ID, plainContent);

      // URL Rewriter should still be called (it handles stripping + extraction internally)
      expect(rewriteContentMock).toHaveBeenCalledTimes(1);

      // Content should be unchanged
      expect(result.content).toBe(plainContent);

      // No media attachments
      expect(result.mediaAttachments).toHaveLength(0);
    });
  });

  // ── 3. createPost without URL Rewriter set ──────────────────────────────

  describe('createPost without URL Rewriter set (backward compatible)', () => {
    it('should create post normally without calling any rewriter', async () => {
      const { application } = createMockApplication();
      const service = new PostService(application);
      // Do NOT call service.setUrlRewriter()

      const content = 'Just a plain text post.';
      const result = await service.createPost(AUTHOR_ID, content);

      expect(result.content).toBe(content);
      expect(result.mediaAttachments).toHaveLength(0);
      expect(result.authorId).toBe(AUTHOR_ID);
      expect(result.postType).toBe(PostType.Original);
    });
  });

  // ── 4. editPost adding new staging URLs ─────────────────────────────────

  describe('editPost adding new staging URLs', () => {
    it('should call URL Rewriter for new images and merge with retained attachments', async () => {
      const { application, postsCollection } = createMockApplication();
      const service = new PostService(application);

      // Seed an existing post with one permanent image
      const existingAttachment = makeMediaAttachment(FILE_ID_1);
      const now = new Date().toISOString();
      postsCollection.store.set(POST_ID, {
        _id: POST_ID,
        authorId: AUTHOR_ID,
        content: `Existing ![img1](${makePermanentUrl(FILE_ID_1)})`,
        formattedContent: `<p>Existing <img src="${makePermanentUrl(FILE_ID_1)}"></p>`,
        postType: PostType.Original,
        mediaAttachments: [existingAttachment],
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
        hubIds: ['hub-1'],
        isBlogPost: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        createdBy: AUTHOR_ID,
        updatedBy: AUTHOR_ID,
      } as never);

      // The new content retains the permanent image and adds a new staging image
      const newContent = `Existing ![img1](${makePermanentUrl(FILE_ID_1)}) and new ![img2](${makeStagingUrl(TOKEN_2)})`;

      // The rewriter will be called because there are staging tokens
      // It should rewrite the staging URL to a permanent URL
      const rewrittenContent = `Existing ![img1](${makePermanentUrl(FILE_ID_1)}) and new ![img2](${makePermanentUrl(FILE_ID_2)})`;

      const newAttachment = makeMediaAttachment(FILE_ID_2);

      const rewriteContentMock = jest.fn().mockResolvedValue({
        rewrittenContent,
        mediaAttachments: [newAttachment],
      } as IRewriteResult);

      const urlRewriter = createMockUrlRewriter({
        rewriteContent: rewriteContentMock,
      });
      service.setUrlRewriter(urlRewriter);

      const result = await service.editPost(POST_ID, AUTHOR_ID, newContent);

      // URL Rewriter should have been called (because there are staging tokens)
      expect(rewriteContentMock).toHaveBeenCalledTimes(1);
      expect(rewriteContentMock).toHaveBeenCalledWith(
        expect.any(String),
        'hub-1', // hubId from the existing post
        AUTHOR_ID,
      );

      // The result should have both retained and new attachments
      expect(result.mediaAttachments).toHaveLength(2);
      expect(result.mediaAttachments.map((a) => a._id)).toContain(FILE_ID_1);
      expect(result.mediaAttachments.map((a) => a._id)).toContain(FILE_ID_2);

      // Post should be marked as edited
      expect(result.isEdited).toBe(true);
    });
  });

  // ── 5. editPost removing images ─────────────────────────────────────────

  describe('editPost removing images', () => {
    it('should filter mediaAttachments to only retained permanent URLs', async () => {
      const { application, postsCollection } = createMockApplication();
      const service = new PostService(application);

      // Seed an existing post with two permanent images
      const attachment1 = makeMediaAttachment(FILE_ID_1);
      const attachment2 = makeMediaAttachment(FILE_ID_2);
      const now = new Date().toISOString();
      postsCollection.store.set(POST_ID, {
        _id: POST_ID,
        authorId: AUTHOR_ID,
        content: `![img1](${makePermanentUrl(FILE_ID_1)}) and ![img2](${makePermanentUrl(FILE_ID_2)})`,
        formattedContent: '<p>formatted</p>',
        postType: PostType.Original,
        mediaAttachments: [attachment1, attachment2],
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
        hubIds: [],
        isBlogPost: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        createdBy: AUTHOR_ID,
        updatedBy: AUTHOR_ID,
      } as never);

      // Edit: remove the second image, keep only the first
      const newContent = `Only first image ![img1](${makePermanentUrl(FILE_ID_1)})`;

      // No staging tokens → rewriter should NOT be called
      const rewriteContentMock = jest.fn();
      const urlRewriter = createMockUrlRewriter({
        rewriteContent: rewriteContentMock,
      });
      service.setUrlRewriter(urlRewriter);

      const result = await service.editPost(POST_ID, AUTHOR_ID, newContent);

      // URL Rewriter should NOT have been called (no staging tokens)
      expect(rewriteContentMock).not.toHaveBeenCalled();

      // Only the retained attachment should remain
      expect(result.mediaAttachments).toHaveLength(1);
      expect(result.mediaAttachments[0]._id).toBe(FILE_ID_1);
    });
  });

  // ── 6. editPost with unchanged images ───────────────────────────────────

  describe('editPost with unchanged images', () => {
    it('should preserve attachments without calling URL Rewriter when no staging URLs present', async () => {
      const { application, postsCollection } = createMockApplication();
      const service = new PostService(application);

      // Seed an existing post with one permanent image
      const attachment = makeMediaAttachment(FILE_ID_1);
      const now = new Date().toISOString();
      postsCollection.store.set(POST_ID, {
        _id: POST_ID,
        authorId: AUTHOR_ID,
        content: `Text ![img1](${makePermanentUrl(FILE_ID_1)})`,
        formattedContent: '<p>formatted</p>',
        postType: PostType.Original,
        mediaAttachments: [attachment],
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
        hubIds: [],
        isBlogPost: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
        createdBy: AUTHOR_ID,
        updatedBy: AUTHOR_ID,
      } as never);

      // Edit: same image, just change the text
      const newContent = `Updated text ![img1](${makePermanentUrl(FILE_ID_1)})`;

      const rewriteContentMock = jest.fn();
      const urlRewriter = createMockUrlRewriter({
        rewriteContent: rewriteContentMock,
      });
      service.setUrlRewriter(urlRewriter);

      const result = await service.editPost(POST_ID, AUTHOR_ID, newContent);

      // URL Rewriter should NOT have been called (no staging tokens)
      expect(rewriteContentMock).not.toHaveBeenCalled();

      // Attachment should be preserved
      expect(result.mediaAttachments).toHaveLength(1);
      expect(result.mediaAttachments[0]._id).toBe(FILE_ID_1);
      expect(result.mediaAttachments[0].url).toBe(makePermanentUrl(FILE_ID_1));

      // Post should be marked as edited
      expect(result.isEdited).toBe(true);
    });
  });
});
