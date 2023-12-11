/**
 * Property-based tests for FriendsSuggestionProvider.
 *
 * Property 18: Friend search filtering returns correct subset
 * - Generate a list of friends with random display names and usernames
 * - Generate a random search query
 * - Verify that getFriendSuggestions returns exactly the friends whose
 *   display name or username contains the query as a case-insensitive substring
 * - No extra or missing entries
 *
 * **Validates: Requirements 14.3**
 *
 * Tag: Feature: brightchain-friends-system, Property 18: Friend search filtering returns correct subset
 */

import fc from 'fast-check';
import {
  FriendsSuggestionProvider,
  UserInfoResolver,
} from './friendsSuggestionProvider';
import type {
  IFriendsService,
  IBaseFriendship,
  IPaginatedResult,
  IPaginationOptions,
} from '@brightchain/brightchain-lib';

// ── Helpers ────────────────────────────────────────────────────────────

/** Build a minimal mock IFriendsService that returns a fixed friends list. */
function createMockFriendsService(
  friendships: IBaseFriendship<string>[],
): IFriendsService {
  return {
    getFriends: async (
      _userId: string,
      _options?: IPaginationOptions,
    ): Promise<IPaginatedResult<IBaseFriendship<string>>> => ({
      items: friendships,
      hasMore: false,
      totalCount: friendships.length,
    }),
    // Unused stubs — only getFriends is called by the provider
    sendFriendRequest: jest.fn(),
    acceptFriendRequest: jest.fn(),
    rejectFriendRequest: jest.fn(),
    cancelFriendRequest: jest.fn(),
    removeFriend: jest.fn(),
    getReceivedFriendRequests: jest.fn(),
    getSentFriendRequests: jest.fn(),
    getFriendshipStatus: jest.fn(),
    areFriends: jest.fn(),
    getMutualFriends: jest.fn(),
    onUserBlocked: jest.fn(),
  } as unknown as IFriendsService;
}

/** Arbitrary for a user info record (displayName + username). */
const userInfoArb = fc.record({
  displayName: fc.string({ minLength: 1, maxLength: 30 }),
  username: fc.string({ minLength: 1, maxLength: 20 }),
});

/** Arbitrary for a friend entry: a UUID friend ID paired with user info. */
const friendEntryArb = fc.tuple(fc.uuid(), userInfoArb);

/** Arbitrary for a non-empty search query (1–10 printable non-whitespace chars). */
const searchQueryArb = fc.string({ minLength: 1, maxLength: 10 }).filter((s) => s.trim().length > 0);

// ── Tests ──────────────────────────────────────────────────────────────

describe('Feature: brightchain-friends-system, Property 18: Friend search filtering returns correct subset', () => {
  const userId = '00000000-0000-4000-8000-000000000001';

  it('should return exactly the friends whose displayName or username contains the query (case-insensitive)', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(friendEntryArb, {
          minLength: 0,
          maxLength: 15,
          selector: ([id]) => id,
        }),
        searchQueryArb,
        async (friendEntries, searchQuery) => {
          // Build friendship records and user info map
          const userInfoMap = new Map<
            string,
            { displayName: string; username: string }
          >();
          const friendships: IBaseFriendship<string>[] = friendEntries.map(
            ([friendId, info], idx) => {
              userInfoMap.set(friendId, info);
              return {
                _id: `friendship-${idx}`,
                memberIdA: userId < friendId ? userId : friendId,
                memberIdB: userId < friendId ? friendId : userId,
                createdAt: new Date(
                  Date.now() - idx * 1000,
                ).toISOString(),
              };
            },
          );

          const mockService = createMockFriendsService(friendships);
          const resolveUserInfo: UserInfoResolver = async (id) =>
            userInfoMap.get(id) ?? null;

          const provider = new FriendsSuggestionProvider(
            mockService,
            resolveUserInfo,
          );

          const result = await provider.getFriendSuggestions(
            userId,
            searchQuery,
          );

          // Compute expected set: friends whose displayName or username
          // contains the query as a case-insensitive substring
          const query = searchQuery.toLowerCase();
          const expectedIds = new Set<string>();
          for (const [friendId, info] of userInfoMap.entries()) {
            if (
              info.displayName.toLowerCase().includes(query) ||
              info.username.toLowerCase().includes(query)
            ) {
              expectedIds.add(friendId);
            }
          }

          // Extract actual friend IDs from result
          const actualIds = new Set(
            result.items.map((f) =>
              f.memberIdA === userId ? f.memberIdB : f.memberIdA,
            ),
          );

          // No extra entries
          for (const id of actualIds) {
            expect(expectedIds.has(id)).toBe(true);
          }
          // No missing entries
          for (const id of expectedIds) {
            expect(actualIds.has(id)).toBe(true);
          }
          // Same size
          expect(result.items.length).toBe(expectedIds.size);
          expect(result.totalCount).toBe(expectedIds.size);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return all friends when no search query is provided', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uniqueArray(friendEntryArb, {
          minLength: 0,
          maxLength: 10,
          selector: ([id]) => id,
        }),
        async (friendEntries) => {
          const userInfoMap = new Map<
            string,
            { displayName: string; username: string }
          >();
          const friendships: IBaseFriendship<string>[] = friendEntries.map(
            ([friendId, info], idx) => {
              userInfoMap.set(friendId, info);
              return {
                _id: `friendship-${idx}`,
                memberIdA: userId < friendId ? userId : friendId,
                memberIdB: userId < friendId ? friendId : userId,
                createdAt: new Date(
                  Date.now() - idx * 1000,
                ).toISOString(),
              };
            },
          );

          const mockService = createMockFriendsService(friendships);
          const resolveUserInfo: UserInfoResolver = async (id) =>
            userInfoMap.get(id) ?? null;

          const provider = new FriendsSuggestionProvider(
            mockService,
            resolveUserInfo,
          );

          // No search query
          const result = await provider.getFriendSuggestions(userId);
          expect(result.items.length).toBe(friendships.length);
          expect(result.totalCount).toBe(friendships.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return empty result when user has no friends', async () => {
    const mockService = createMockFriendsService([]);
    const resolveUserInfo: UserInfoResolver = async () => null;

    const provider = new FriendsSuggestionProvider(
      mockService,
      resolveUserInfo,
    );

    const result = await provider.getFriendSuggestions(userId, 'anything');
    expect(result.items).toEqual([]);
    expect(result.totalCount).toBe(0);
  });
});
