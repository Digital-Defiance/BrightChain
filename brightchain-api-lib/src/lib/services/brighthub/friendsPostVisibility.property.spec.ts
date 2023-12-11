/**
 * Property-based tests for friends-only post visibility.
 *
 * Feature: brightchain-friends-system, Property 20: Friends-only post visibility gate
 *
 * For any post with `friends_only` visibility and any viewer member,
 * the post SHALL be visible to the viewer if and only if
 * IFriendsService.areFriends(postAuthorId, viewerId) returns true.
 *
 * **Validates: Requirements 15.3**
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { PostVisibility } from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import { createFriendsService, FriendsService } from './friendsService';
import {
  createMockFriendsApplication,
  createMockIsBlocked,
} from './friendsService.test-helpers';

// --- Generators ---

const userIdArb = fc.uuid();

// --- Visibility gate function ---

/**
 * Determines whether a post is visible to a viewer based on its visibility setting.
 * This is the logic that feed queries should apply when filtering posts.
 */
async function isPostVisibleToViewer(
  postAuthorId: string,
  viewerId: string,
  visibility: PostVisibility | undefined,
  friendsService: FriendsService,
): Promise<boolean> {
  // Public posts or posts without explicit visibility are always visible
  if (!visibility || visibility === PostVisibility.Public) {
    return true;
  }

  if (visibility === PostVisibility.FriendsOnly) {
    // Author can always see their own posts
    if (postAuthorId === viewerId) {
      return true;
    }
    return friendsService.areFriends(postAuthorId, viewerId);
  }

  // Other visibility types (FollowersOnly, HubOnly) are not tested here
  return true;
}

// --- Test Suite ---

describe('Feature: brightchain-friends-system, Property 20: Friends-only post visibility gate', () => {
  /**
   * For any post with friends_only visibility and any viewer member,
   * the post SHALL be visible to the viewer if and only if
   * IFriendsService.areFriends(postAuthorId, viewerId) returns true.
   *
   * **Validates: Requirements 15.3**
   */

  it('friends-only post is visible to friends', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        async (authorId, viewerId) => {
          if (authorId === viewerId) return;

          const friendsApp = createMockFriendsApplication();
          const friendsService = createFriendsService(
            friendsApp,
            createMockIsBlocked(),
          );

          // Make them friends
          await friendsService.sendFriendRequest(authorId, viewerId);
          const requests = await friendsService.getReceivedFriendRequests(viewerId);
          await friendsService.acceptFriendRequest(viewerId, requests.items[0]._id);

          const visible = await isPostVisibleToViewer(
            authorId,
            viewerId,
            PostVisibility.FriendsOnly,
            friendsService,
          );

          expect(visible).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('friends-only post is NOT visible to non-friends', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        async (authorId, viewerId) => {
          if (authorId === viewerId) return;

          const friendsApp = createMockFriendsApplication();
          const friendsService = createFriendsService(
            friendsApp,
            createMockIsBlocked(),
          );

          // Do NOT make them friends

          const visible = await isPostVisibleToViewer(
            authorId,
            viewerId,
            PostVisibility.FriendsOnly,
            friendsService,
          );

          expect(visible).toBe(false);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('friends-only post is always visible to the author', async () => {
    await fc.assert(
      fc.asyncProperty(userIdArb, async (authorId) => {
        const friendsApp = createMockFriendsApplication();
        const friendsService = createFriendsService(
          friendsApp,
          createMockIsBlocked(),
        );

        const visible = await isPostVisibleToViewer(
          authorId,
          authorId,
          PostVisibility.FriendsOnly,
          friendsService,
        );

        expect(visible).toBe(true);
      }),
      { numRuns: 50 },
    );
  });

  it('public posts are always visible regardless of friendship', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        async (authorId, viewerId) => {
          const friendsApp = createMockFriendsApplication();
          const friendsService = createFriendsService(
            friendsApp,
            createMockIsBlocked(),
          );

          const visible = await isPostVisibleToViewer(
            authorId,
            viewerId,
            PostVisibility.Public,
            friendsService,
          );

          expect(visible).toBe(true);
        },
      ),
      { numRuns: 50 },
    );
  });

  it('visibility gate is symmetric: if A can see B\'s friends-only post, B can see A\'s', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb,
        async (userA, userB) => {
          if (userA === userB) return;

          const friendsApp = createMockFriendsApplication();
          const friendsService = createFriendsService(
            friendsApp,
            createMockIsBlocked(),
          );

          // Make them friends
          await friendsService.sendFriendRequest(userA, userB);
          const requests = await friendsService.getReceivedFriendRequests(userB);
          await friendsService.acceptFriendRequest(userB, requests.items[0]._id);

          const aSeesB = await isPostVisibleToViewer(
            userB,
            userA,
            PostVisibility.FriendsOnly,
            friendsService,
          );
          const bSeesA = await isPostVisibleToViewer(
            userA,
            userB,
            PostVisibility.FriendsOnly,
            friendsService,
          );

          expect(aSeesB).toBe(bSeesA);
        },
      ),
      { numRuns: 50 },
    );
  });
});
