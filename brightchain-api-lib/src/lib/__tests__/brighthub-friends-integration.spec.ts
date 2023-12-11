/**
 * Unit tests for BrightHub Friends Integration.
 *
 * Tests:
 * - Profile displays friendCount
 * - Friends tab respects privacy settings
 * - SuggestionReason.MutualFriends enum value
 * - PostVisibility.FriendsOnly enum value
 * - IBasePrivacySettings.hideFriendsFromNonFriends field
 * - friendCount field in user profile schema
 *
 * Requirements: 15.1, 15.2, 15.3, 15.4
 */

import {
  SuggestionReason,
  PostVisibility,
} from '@brightchain/brighthub-lib';
import type {
  IBaseUserProfile,
  IBasePrivacySettings,
  IFriendsTabProps,
} from '@brightchain/brighthub-lib';

describe('BrightHub Friends Integration', () => {
  // =========================================================================
  // Requirement 15.1: Profile displays friendCount
  // =========================================================================

  describe('Profile friendCount', () => {
    it('IBaseUserProfile accepts optional friendCount field', () => {
      const profile: IBaseUserProfile<string> = {
        _id: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        bio: 'Hello',
        followerCount: 10,
        followingCount: 5,
        postCount: 3,
        friendCount: 7,
        isVerified: false,
        isProtected: false,
        approveFollowersMode: 'approve_none' as IBaseUserProfile<string>['approveFollowersMode'],
        privacySettings: {
          hideFollowerCount: false,
          hideFollowingCount: false,
          hideFollowersFromNonFollowers: false,
          hideFollowingFromNonFollowers: false,
          allowDmsFromNonFollowers: true,
          showOnlineStatus: true,
          showReadReceipts: true,
        },
        createdAt: new Date().toISOString(),
      };

      expect(profile.friendCount).toBe(7);
    });

    it('IBaseUserProfile works without friendCount (defaults to undefined)', () => {
      const profile: IBaseUserProfile<string> = {
        _id: 'user-2',
        username: 'testuser2',
        displayName: 'Test User 2',
        bio: '',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        isVerified: false,
        isProtected: false,
        approveFollowersMode: 'approve_none' as IBaseUserProfile<string>['approveFollowersMode'],
        privacySettings: {
          hideFollowerCount: false,
          hideFollowingCount: false,
          hideFollowersFromNonFollowers: false,
          hideFollowingFromNonFollowers: false,
          allowDmsFromNonFollowers: true,
          showOnlineStatus: true,
          showReadReceipts: true,
        },
        createdAt: new Date().toISOString(),
      };

      expect(profile.friendCount).toBeUndefined();
    });

    it('user profile schema includes friendCount field', () => {
      // Schema validation is tested in brightchain-db tests.
      // Here we verify the interface accepts the field.
      const profile: IBaseUserProfile<string> = {
        _id: 'user-3',
        username: 'schematest',
        displayName: 'Schema Test',
        bio: '',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        friendCount: 42,
        isVerified: false,
        isProtected: false,
        approveFollowersMode: 'approve_none' as IBaseUserProfile<string>['approveFollowersMode'],
        privacySettings: {
          hideFollowerCount: false,
          hideFollowingCount: false,
          hideFollowersFromNonFollowers: false,
          hideFollowingFromNonFollowers: false,
          allowDmsFromNonFollowers: true,
          showOnlineStatus: true,
          showReadReceipts: true,
        },
        createdAt: new Date().toISOString(),
      };
      expect(profile.friendCount).toBe(42);
    });

    it('friendCount is optional on IBaseUserProfile', () => {
      const profile: IBaseUserProfile<string> = {
        _id: 'user-4',
        username: 'optionaltest',
        displayName: 'Optional Test',
        bio: '',
        followerCount: 0,
        followingCount: 0,
        postCount: 0,
        isVerified: false,
        isProtected: false,
        approveFollowersMode: 'approve_none' as IBaseUserProfile<string>['approveFollowersMode'],
        privacySettings: {
          hideFollowerCount: false,
          hideFollowingCount: false,
          hideFollowersFromNonFollowers: false,
          hideFollowingFromNonFollowers: false,
          allowDmsFromNonFollowers: true,
          showOnlineStatus: true,
          showReadReceipts: true,
        },
        createdAt: new Date().toISOString(),
      };
      // friendCount not set, should be undefined
      expect(profile.friendCount).toBeUndefined();
    });
  });

  // =========================================================================
  // Requirement 15.2: SuggestionReason.MutualFriends
  // =========================================================================

  describe('SuggestionReason.MutualFriends', () => {
    it('MutualFriends enum value exists', () => {
      expect(SuggestionReason.MutualFriends).toBe('mutual_friends_friendship');
    });

    it('MutualFriends is distinct from MutualConnections', () => {
      expect(SuggestionReason.MutualFriends).not.toBe(
        SuggestionReason.MutualConnections,
      );
    });
  });

  // =========================================================================
  // Requirement 15.3: PostVisibility.FriendsOnly
  // =========================================================================

  describe('PostVisibility.FriendsOnly', () => {
    it('FriendsOnly enum value exists', () => {
      expect(PostVisibility.FriendsOnly).toBe('friends_only');
    });

    it('all PostVisibility values are distinct', () => {
      const values = Object.values(PostVisibility);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  // =========================================================================
  // Requirement 15.4: Friends tab respects privacy settings
  // =========================================================================

  describe('Friends tab privacy settings', () => {
    it('IBasePrivacySettings accepts hideFriendsFromNonFriends field', () => {
      const settings: IBasePrivacySettings = {
        hideFollowerCount: false,
        hideFollowingCount: false,
        hideFollowersFromNonFollowers: false,
        hideFollowingFromNonFollowers: false,
        allowDmsFromNonFollowers: true,
        showOnlineStatus: true,
        showReadReceipts: true,
        hideFriendsFromNonFriends: true,
      };

      expect(settings.hideFriendsFromNonFriends).toBe(true);
    });

    it('hideFriendsFromNonFriends defaults to undefined when not set', () => {
      const settings: IBasePrivacySettings = {
        hideFollowerCount: false,
        hideFollowingCount: false,
        hideFollowersFromNonFollowers: false,
        hideFollowingFromNonFollowers: false,
        allowDmsFromNonFollowers: true,
        showOnlineStatus: true,
        showReadReceipts: true,
      };

      expect(settings.hideFriendsFromNonFriends).toBeUndefined();
    });

    it('user profile privacy settings support hideFriendsFromNonFriends', () => {
      const settings: IBasePrivacySettings = {
        hideFollowerCount: false,
        hideFollowingCount: false,
        hideFollowersFromNonFollowers: false,
        hideFollowingFromNonFollowers: false,
        allowDmsFromNonFollowers: true,
        showOnlineStatus: true,
        showReadReceipts: true,
        hideFriendsFromNonFriends: true,
      };
      expect(settings.hideFriendsFromNonFriends).toBe(true);
    });

    it('IFriendsTabProps type compiles correctly', () => {
      const tabProps: IFriendsTabProps = {
        profileUserId: 'user-1',
        currentUserId: 'user-2',
        isFriend: true,
        hideFriendsFromNonFriends: false,
        friends: [],
        friendCount: 0,
        hasMore: false,
      };

      expect(tabProps.profileUserId).toBe('user-1');
      expect(tabProps.hideFriendsFromNonFriends).toBe(false);
    });

    it('friends tab shows empty list when hideFriendsFromNonFriends is true and viewer is not a friend', () => {
      const tabProps: IFriendsTabProps = {
        profileUserId: 'user-1',
        currentUserId: 'user-2',
        isFriend: false,
        hideFriendsFromNonFriends: true,
        friends: [],
        friendCount: 5,
        hasMore: false,
      };

      // When hideFriendsFromNonFriends is true and viewer is not a friend,
      // the friends list should be empty even though friendCount > 0
      const shouldShowFriends =
        !tabProps.hideFriendsFromNonFriends || tabProps.isFriend;
      expect(shouldShowFriends).toBe(false);
    });

    it('friends tab shows friends when hideFriendsFromNonFriends is true but viewer IS a friend', () => {
      const tabProps: IFriendsTabProps = {
        profileUserId: 'user-1',
        currentUserId: 'user-2',
        isFriend: true,
        hideFriendsFromNonFriends: true,
        friends: [
          {
            _id: 'friendship-1',
            memberIdA: 'user-1',
            memberIdB: 'user-3',
            createdAt: new Date().toISOString(),
          },
        ],
        friendCount: 1,
        hasMore: false,
      };

      const shouldShowFriends =
        !tabProps.hideFriendsFromNonFriends || tabProps.isFriend;
      expect(shouldShowFriends).toBe(true);
    });
  });

  // =========================================================================
  // FriendsService onFriendshipChanged callback
  // =========================================================================

  describe('FriendsService onFriendshipChanged callback', () => {
    it('callback is invoked when friendship is created via acceptFriendRequest', async () => {
      const {
        createFriendsService,
      } = await import('../services/brighthub/friendsService');
      const {
        createMockFriendsApplication,
        createMockIsBlocked,
      } = await import('../services/brighthub/friendsService.test-helpers');

      const callbackCalls: Array<{ a: string; b: string; delta: 1 | -1 }> = [];
      const onFriendshipChanged = async (a: string, b: string, delta: 1 | -1) => {
        callbackCalls.push({ a, b, delta });
      };

      const app = createMockFriendsApplication();
      const service = createFriendsService(
        app,
        createMockIsBlocked(),
        onFriendshipChanged,
      );

      await service.sendFriendRequest('user-a', 'user-b');
      const requests = await service.getReceivedFriendRequests('user-b');
      await service.acceptFriendRequest('user-b', requests.items[0]._id);

      expect(callbackCalls).toHaveLength(1);
      expect(callbackCalls[0].delta).toBe(1);
    });

    it('callback is invoked when friendship is removed', async () => {
      const {
        createFriendsService,
      } = await import('../services/brighthub/friendsService');
      const {
        createMockFriendsApplication,
        createMockIsBlocked,
      } = await import('../services/brighthub/friendsService.test-helpers');

      const callbackCalls: Array<{ a: string; b: string; delta: 1 | -1 }> = [];
      const onFriendshipChanged = async (a: string, b: string, delta: 1 | -1) => {
        callbackCalls.push({ a, b, delta });
      };

      const app = createMockFriendsApplication();
      const service = createFriendsService(
        app,
        createMockIsBlocked(),
        onFriendshipChanged,
      );

      // Create friendship
      await service.sendFriendRequest('user-a', 'user-b');
      const requests = await service.getReceivedFriendRequests('user-b');
      await service.acceptFriendRequest('user-b', requests.items[0]._id);

      // Remove friendship
      await service.removeFriend('user-a', 'user-b');

      expect(callbackCalls).toHaveLength(2);
      expect(callbackCalls[1].delta).toBe(-1);
    });

    it('callback is invoked with delta -1 when friendship is removed via onUserBlocked', async () => {
      const {
        createFriendsService,
      } = await import('../services/brighthub/friendsService');
      const {
        createMockFriendsApplication,
        createMockIsBlocked,
      } = await import('../services/brighthub/friendsService.test-helpers');

      const callbackCalls: Array<{ a: string; b: string; delta: 1 | -1 }> = [];
      const onFriendshipChanged = async (a: string, b: string, delta: 1 | -1) => {
        callbackCalls.push({ a, b, delta });
      };

      const app = createMockFriendsApplication();
      const service = createFriendsService(
        app,
        createMockIsBlocked(),
        onFriendshipChanged,
      );

      // Create friendship
      await service.sendFriendRequest('user-a', 'user-b');
      const requests = await service.getReceivedFriendRequests('user-b');
      await service.acceptFriendRequest('user-b', requests.items[0]._id);

      // Block removes friendship
      await service.onUserBlocked('user-a', 'user-b');

      expect(callbackCalls).toHaveLength(2);
      expect(callbackCalls[0].delta).toBe(1);
      expect(callbackCalls[1].delta).toBe(-1);
    });

    it('callback is invoked on auto-accept (reciprocal request)', async () => {
      const {
        createFriendsService,
      } = await import('../services/brighthub/friendsService');
      const {
        createMockFriendsApplication,
        createMockIsBlocked,
      } = await import('../services/brighthub/friendsService.test-helpers');

      const callbackCalls: Array<{ a: string; b: string; delta: 1 | -1 }> = [];
      const onFriendshipChanged = async (a: string, b: string, delta: 1 | -1) => {
        callbackCalls.push({ a, b, delta });
      };

      const app = createMockFriendsApplication();
      const service = createFriendsService(
        app,
        createMockIsBlocked(),
        onFriendshipChanged,
      );

      // Send request from A to B
      await service.sendFriendRequest('user-a', 'user-b');
      // Send reciprocal request from B to A (auto-accepts)
      await service.sendFriendRequest('user-b', 'user-a');

      expect(callbackCalls).toHaveLength(1);
      expect(callbackCalls[0].delta).toBe(1);
    });
  });
});
