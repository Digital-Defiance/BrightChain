/**
 * Unit tests for BrightHubPostController — thread author resolution.
 *
 * Verifies that handleGetThread returns an `authors` map alongside
 * the thread data, resolving user profiles for all post authors.
 *
 * Tests:
 * 1. getThread response includes authors map keyed by user ID
 * 2. getThread resolves authors for both root post and reply authors
 * 3. getThread returns empty authors when UserProfileService is not set
 * 4. getThread skips unresolvable authors without failing
 */

import type {
  IBaseUserProfile,
  IPostService,
  IThreadService,
  IUserProfileService,
} from '@brightchain/brighthub-lib';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { IBrightChainApplication } from '../../../../interfaces/application';
import type { IThreadApiResponse } from '../../../../interfaces/responses/brighthub';
import { BrightHubPostController } from '../postController';

// ─── Mock file-type (required by transitive imports) ─────────────────────────

jest.mock('file-type', () => ({
  fileTypeFromBuffer: async () => null,
  fileTypeStream: async () => null,
}));

// ─── Constants ───────────────────────────────────────────────────────────────

const THREAD_DATA = {
  rootPost: {
    _id: 'post-1',
    authorId: 'user-1',
    content: 'hello',
    formattedContent: '<p>hello</p>',
    postType: 'original',
    mediaAttachments: [],
    mentions: [],
    hashtags: [],
    likeCount: 0,
    repostCount: 0,
    replyCount: 1,
    quoteCount: 0,
    isEdited: false,
    isBlogPost: true,
    isDeleted: false,
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01',
    createdBy: 'user-1',
    updatedBy: 'user-1',
  },
  replies: [
    {
      _id: 'reply-1',
      authorId: 'user-2',
      content: 'reply',
      formattedContent: '<p>reply</p>',
      postType: 'reply',
      parentPostId: 'post-1',
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
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
      createdBy: 'user-2',
      updatedBy: 'user-2',
    },
  ],
  replyCount: 1,
  participantCount: 2,
};

type ProfileMap = Record<string, Partial<IBaseUserProfile<string>>>;

const PROFILES: ProfileMap = {
  'user-1': { _id: 'user-1', username: 'alice', displayName: 'Alice' },
  'user-2': { _id: 'user-2', username: 'bob', displayName: 'Bob' },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createMockApplication() {
  return {
    db: { connection: { readyState: 1 } },
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    services: { get: () => undefined, has: () => false },
    getModel: () => {
      throw new Error('not implemented');
    },
  } as unknown as IBrightChainApplication;
}

function createMockPostService(): IPostService {
  return {
    getPost: jest.fn(),
    createPost: jest.fn(),
    editPost: jest.fn(),
    deletePost: jest.fn(),
    likePost: jest.fn(),
    unlikePost: jest.fn(),
    repostPost: jest.fn(),
    createQuotePost: jest.fn(),
    reportPost: jest.fn(),
    getReports: jest.fn(),
    reviewReport: jest.fn(),
    upvotePost: jest.fn(),
    downvotePost: jest.fn(),
    pinPost: jest.fn(),
    unpinPost: jest.fn(),
  } as unknown as IPostService;
}

function createMockThreadService(threadData = THREAD_DATA): IThreadService {
  return {
    getThread: jest.fn(async () => threadData),
    createReply: jest.fn(),
  } as unknown as IThreadService;
}

function createMockUserProfileService(
  profiles: ProfileMap = PROFILES,
): IUserProfileService {
  return {
    getProfile: jest.fn(async (userId: string) => {
      const profile = profiles[userId];
      if (profile) return profile;
      throw new Error('User not found');
    }),
  } as unknown as IUserProfileService;
}

type ThreadHandler = (
  req: unknown,
) => Promise<{ statusCode: number; response: IThreadApiResponse }>;

/** The controller's handler map, exposed for direct invocation. */
interface IPostControllerHandlers {
  handlers: { getThread: ThreadHandler };
}

function getThreadHandler(ctrl: BrightHubPostController): ThreadHandler {
  return (ctrl as unknown as IPostControllerHandlers).handlers.getThread;
}

// ─── Test Setup ──────────────────────────────────────────────────────────────

let controller: BrightHubPostController;
let getThread: ThreadHandler;

beforeEach(() => {
  const app = createMockApplication();
  controller = new BrightHubPostController(app);
  controller.setPostService(createMockPostService());
  controller.setThreadService(createMockThreadService());
  controller.setUserProfileService(createMockUserProfileService());

  getThread = getThreadHandler(controller);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('BrightHubPostController — getThread author resolution', () => {
  it('response includes authors map keyed by user ID', async () => {
    const result = await getThread({ params: { id: 'post-1' } });

    expect(result.statusCode).toBe(200);
    expect(result.response.data.authors).toBeDefined();
    expect(typeof result.response.data.authors).toBe('object');
    expect(result.response.data.authors?.['user-1']).toBeDefined();
    expect(result.response.data.authors?.['user-2']).toBeDefined();
  });

  it('resolves authors for both root post and reply authors', async () => {
    const result = await getThread({ params: { id: 'post-1' } });

    const authors = result.response.data.authors;
    expect(authors?.['user-1']?.username).toBe('alice');
    expect(authors?.['user-1']?.displayName).toBe('Alice');
    expect(authors?.['user-2']?.username).toBe('bob');
    expect(authors?.['user-2']?.displayName).toBe('Bob');
  });

  it('returns empty authors when UserProfileService is not set', async () => {
    // Create a fresh controller without UserProfileService
    const app = createMockApplication();
    const freshController = new BrightHubPostController(app);
    freshController.setPostService(createMockPostService());
    freshController.setThreadService(createMockThreadService());
    // Deliberately NOT calling setUserProfileService

    const freshGetThread = getThreadHandler(freshController);
    const result = await freshGetThread({ params: { id: 'post-1' } });

    expect(result.statusCode).toBe(200);
    expect(result.response.data.authors).toEqual({});
  });

  it('skips unresolvable authors without failing', async () => {
    // Only user-1 is resolvable; user-2 will throw
    const partialProfiles: ProfileMap = {
      'user-1': { _id: 'user-1', username: 'alice', displayName: 'Alice' },
    };

    const app = createMockApplication();
    const ctrl = new BrightHubPostController(app);
    ctrl.setPostService(createMockPostService());
    ctrl.setThreadService(createMockThreadService());
    ctrl.setUserProfileService(createMockUserProfileService(partialProfiles));

    const handler = getThreadHandler(ctrl);
    const result = await handler({ params: { id: 'post-1' } });

    expect(result.statusCode).toBe(200);
    // user-1 should be resolved
    expect(result.response.data.authors?.['user-1']).toBeDefined();
    expect(result.response.data.authors?.['user-1']?.username).toBe('alice');
    // user-2 should be absent (not an error)
    expect(result.response.data.authors?.['user-2']).toBeUndefined();
  });
});
