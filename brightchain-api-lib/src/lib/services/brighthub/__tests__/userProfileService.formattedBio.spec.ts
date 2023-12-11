/**
 * Unit tests for UserProfileService.updateProfile – formattedBio generation.
 *
 * When `bio` is updated via `updateProfile`, the service should:
 * 1. Store the raw `bio` text
 * 2. Generate `formattedBio` by running the bio through
 *    `textFormatter.format(bio, { isBlogPost: true })`
 * 3. Return the profile with both `bio` and `formattedBio`
 */

import { UserProfileService } from '../userProfileService';

// ─── Mocks ──────────────────────────────────────────────────────────────────

jest.mock('../textFormatter', () => {
  return {
    getTextFormatter: jest.fn().mockReturnValue({
      format: jest
        .fn()
        .mockImplementation(
          (content: string, options?: { isBlogPost?: boolean }) => ({
            raw: content,
            formatted: options?.isBlogPost
              ? `<h1>${content}</h1>`
              : content,
            mentions: [],
            hashtags: [],
            characterCount: content.length,
          }),
        ),
      getCharacterCount: jest
        .fn()
        .mockImplementation((c: string) => c.length),
    }),
  };
});

// ─── Mock collection helper ─────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
function createMockCollection() {
  const store = new Map<string, any>();
  return {
    create: jest.fn(async (record: any) => {
      store.set(record._id, { ...record });
      return { ...record };
    }),
    findOne: jest.fn((filter: any) => ({
      exec: jest.fn(async () => {
        if ('_id' in filter) {
          const found = store.get(filter._id);
          return found ? { ...found } : null;
        }
        for (const doc of store.values()) {
          const matches = Object.entries(filter).every(
            ([key, val]) => (doc as any)[key] === val,
          );
          if (matches) return { ...doc };
        }
        return null;
      }),
    })),
    find: jest.fn((filter: any) => ({
      exec: jest.fn(async () => {
        const results: any[] = [];
        for (const doc of store.values()) {
          const matches = Object.entries(filter).every(
            ([key, val]) => (doc as any)[key] === val,
          );
          if (matches) results.push({ ...doc });
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
  collections.set('brighthub_user_profiles', createMockCollection());
  collections.set('brighthub_follows', createMockCollection());
  collections.set('brighthub_follow_requests', createMockCollection());

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

// ─── Seed helper ────────────────────────────────────────────────────────────

function seedUserProfile(
  profilesCollection: ReturnType<typeof createMockCollection>,
  overrides: Record<string, unknown> = {},
) {
  const now = new Date().toISOString();
  const profile = {
    _id: 'user-1',
    username: 'testuser',
    displayName: 'Test User',
    bio: '',
    formattedBio: '',
    profilePictureUrl: '',
    headerImageUrl: '',
    location: '',
    websiteUrl: '',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    isVerified: false,
    isProtected: false,
    approveFollowersMode: 'approve_none',
    privacySettings: {
      hideFollowerCount: false,
      hideFollowingCount: false,
      hideFollowersFromNonFollowers: false,
      hideFollowingFromNonFollowers: false,
      allowDmsFromNonFollowers: true,
      showOnlineStatus: true,
      showReadReceipts: true,
    },
    pinnedPostId: undefined,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  profilesCollection._store.set(profile._id as string, profile);
  return profile;
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('UserProfileService updateProfile – formattedBio', () => {
  let service: UserProfileService;
  let mockApp: ReturnType<typeof createMockApplication>;
  let profilesCollection: ReturnType<typeof createMockCollection>;

  beforeEach(() => {
    mockApp = createMockApplication();
    profilesCollection = mockApp.collections.get('brighthub_user_profiles')!;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    service = new UserProfileService(mockApp as any);
  });

  it('generates formattedBio using isBlogPost: true when bio is provided', async () => {
    seedUserProfile(profilesCollection);

    const result = await service.updateProfile('user-1', {
      bio: 'Hello world',
    });

    expect(result.bio).toBe('Hello world');
    expect(result.formattedBio).toBe('<h1>Hello world</h1>');
  });

  it('does not set formattedBio when bio is not included in updates', async () => {
    seedUserProfile(profilesCollection, {
      bio: 'original bio',
      formattedBio: '<h1>original bio</h1>',
    });

    const result = await service.updateProfile('user-1', {
      displayName: 'New Name',
    });

    // bio and formattedBio should remain unchanged
    expect(result.bio).toBe('original bio');
    expect(result.formattedBio).toBe('<h1>original bio</h1>');
  });

  it('sets empty formattedBio when bio is an empty string', async () => {
    seedUserProfile(profilesCollection, {
      bio: 'some existing bio',
      formattedBio: '<h1>some existing bio</h1>',
    });

    const result = await service.updateProfile('user-1', { bio: '' });

    expect(result.bio).toBe('');
    // The formatter is called with '' and isBlogPost: true → '<h1></h1>'
    expect(result.formattedBio).toBe('<h1></h1>');
  });

  it('includes formattedBio in the returned profile object', async () => {
    seedUserProfile(profilesCollection);

    const result = await service.updateProfile('user-1', {
      bio: 'My awesome bio',
    });

    // Verify the returned profile has the expected shape
    expect(result).toMatchObject({
      _id: 'user-1',
      bio: 'My awesome bio',
      formattedBio: '<h1>My awesome bio</h1>',
    });
    // formattedBio should be a defined property on the result
    expect(result).toHaveProperty('formattedBio');
  });
});
