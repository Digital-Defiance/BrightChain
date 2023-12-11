/**
 * Property-based tests for User_Profile_Service.
 *
 * Tests the following properties:
 * - Property 10: Follow Relationship Round-Trip
 * - Property 11: Self-Follow Prevention
 * - Property 12: Protected Account Follow Request Flow
 * - Property 21: Profile Bio Length Validation
 * - Property 26: Block Effect on Content Visibility
 * - Property 27: Mute Effect on Timeline
 *
 * Validates: Requirements 4.1-4.11, 8.2, 18.1-18.6
 */

import {
  ApproveFollowersMode,
  FollowRequestStatus,
  MAX_BIO_LENGTH,
  UserProfileErrorCode,
} from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import {
  createUserProfileService,
  UserProfileService,
} from './userProfileService';
import {
  createMockApplication,
  createMockUserProfile,
  MockCollection,
} from './userProfileService.test-helpers';

describe('Feature: brighthub-social-network, User_Profile_Service Property Tests', () => {
  let service: UserProfileService;
  let mockApp: ReturnType<typeof createMockApplication>;
  let userProfilesCollection: MockCollection<{
    _id: string;
    [key: string]: unknown;
  }>;
  let followsCollection: MockCollection<{
    _id: string;
    [key: string]: unknown;
  }>;
  let followRequestsCollection: MockCollection<{
    _id: string;
    [key: string]: unknown;
  }>;
  let blocksCollection: MockCollection<{ _id: string; [key: string]: unknown }>;
  let mutesCollection: MockCollection<{ _id: string; [key: string]: unknown }>;

  beforeEach(() => {
    mockApp = createMockApplication();
    userProfilesCollection = mockApp.collections.get(
      'brighthub_user_profiles',
    )!;
    followsCollection = mockApp.collections.get('brighthub_follows')!;
    followRequestsCollection = mockApp.collections.get(
      'brighthub_follow_requests',
    )!;
    blocksCollection = mockApp.collections.get('brighthub_blocks')!;
    mutesCollection = mockApp.collections.get('brighthub_mutes')!;
    service = createUserProfileService(mockApp);
  });

  // --- Smart Generators ---

  /** Generator for valid user IDs (UUIDs) */
  const userIdArb = fc.uuid();

  /** Generator for valid display names */
  const validDisplayNameArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0);

  /** Generator for valid bios (within limit) */
  const validBioArb = fc.string({ minLength: 0, maxLength: MAX_BIO_LENGTH });

  /** Generator for bios that exceed the limit */
  const tooLongBioArb = fc
    .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz '.split('')), {
      minLength: MAX_BIO_LENGTH + 1,
      maxLength: MAX_BIO_LENGTH + 100,
    })
    .map((chars) => chars.join(''));

  /** Generator for optional follow request messages */
  const followMessageArb = fc.option(
    fc.string({ minLength: 1, maxLength: 280 }),
    { nil: undefined },
  );

  // --- Helper Functions ---

  /**
   * Set up a user in the mock database
   */
  async function setupUser(
    userId: string,
    overrides: Record<string, unknown> = {},
  ): Promise<void> {
    const profile = createMockUserProfile(userId, overrides);
    userProfilesCollection.data.push(profile);
  }

  /**
   * Set up multiple users
   */
  async function setupUsers(userIds: string[]): Promise<void> {
    for (const userId of userIds) {
      await setupUser(userId);
    }
  }

  // --- Property Tests ---

  describe('Property 10: Follow Relationship Round-Trip', () => {
    /**
     * Property 10: Follow Relationship Round-Trip
     *
     * WHEN a user follows another user,
     * THE User_Profile_Service SHALL create a follow relationship and update counts.
     * WHEN a user unfollows another user,
     * THE User_Profile_Service SHALL remove the follow relationship and update counts.
     *
     * **Validates: Requirements 4.1, 4.2**
     */
    it('should create and remove follow relationships correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (followerId, followedId) => {
            // Skip if same user
            if (followerId === followedId) return true;

            // Setup users
            await setupUsers([followerId, followedId]);

            // Follow
            const result = await service.follow(followerId, followedId);
            expect(result.success).toBe(true);

            // Verify follow exists
            expect(await service.isFollowing(followerId, followedId)).toBe(
              true,
            );

            // Verify counts updated
            const followerProfile = userProfilesCollection.data.find(
              (p: {
                _id: string;
                followingCount?: number;
                followerCount?: number;
                bio?: string;
                displayName?: string;
              }) => p._id === followerId,
            );
            const followedProfile = userProfilesCollection.data.find(
              (p: {
                _id: string;
                followingCount?: number;
                followerCount?: number;
                bio?: string;
                displayName?: string;
              }) => p._id === followedId,
            );
            expect(followerProfile?.followingCount).toBe(1);
            expect(followedProfile?.followerCount).toBe(1);

            // Unfollow
            await service.unfollow(followerId, followedId);

            // Verify follow removed
            expect(await service.isFollowing(followerId, followedId)).toBe(
              false,
            );

            // Verify counts updated
            const updatedFollowerProfile = userProfilesCollection.data.find(
              (p: {
                _id: string;
                followingCount?: number;
                followerCount?: number;
                bio?: string;
                displayName?: string;
              }) => p._id === followerId,
            );
            const updatedFollowedProfile = userProfilesCollection.data.find(
              (p: {
                _id: string;
                followingCount?: number;
                followerCount?: number;
                bio?: string;
                displayName?: string;
              }) => p._id === followedId,
            );
            expect(updatedFollowerProfile?.followingCount).toBe(0);
            expect(updatedFollowedProfile?.followerCount).toBe(0);

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should be idempotent when following the same user multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          fc.integer({ min: 2, max: 5 }),
          async (followerId, followedId, followCount) => {
            // Skip if same user
            if (followerId === followedId) return true;

            // Setup users
            await setupUsers([followerId, followedId]);

            // Follow multiple times
            for (let i = 0; i < followCount; i++) {
              const result = await service.follow(followerId, followedId);
              expect(result.success).toBe(true);
            }

            // Should only have one follow record
            const follows = followsCollection.data.filter(
              (f: { _id: string; followerId?: string; followedId?: string }) =>
                f.followerId === followerId && f.followedId === followedId,
            );
            expect(follows.length).toBe(1);

            // Counts should be 1, not followCount
            const followerProfile = userProfilesCollection.data.find(
              (p: {
                _id: string;
                followingCount?: number;
                followerCount?: number;
                bio?: string;
                displayName?: string;
              }) => p._id === followerId,
            );
            expect(followerProfile?.followingCount).toBe(1);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  describe('Property 11: Self-Follow Prevention', () => {
    /**
     * Property 11: Self-Follow Prevention
     *
     * THE User_Profile_Service SHALL prevent users from following themselves.
     *
     * **Validates: Requirements 4.3**
     */
    it('should reject self-follow attempts', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          // Setup user
          await setupUser(userId);

          // Try to self-follow
          await expect(service.follow(userId, userId)).rejects.toMatchObject({
            code: UserProfileErrorCode.SelfFollowNotAllowed,
          });

          // Verify no follow record created
          const follows = followsCollection.data.filter(
            (f: { _id: string; followerId?: string; followedId?: string }) =>
              f.followerId === userId && f.followedId === userId,
          );
          expect(follows.length).toBe(0);

          return true;
        }),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 12: Protected Account Follow Request Flow', () => {
    /**
     * Property 12: Protected Account Follow Request Flow
     *
     * WHEN a user enables approve followers mode,
     * THE User_Profile_Service SHALL require approval for new follow requests.
     * WHEN a follow request is received for a protected account,
     * THE User_Profile_Service SHALL create a pending request.
     * WHEN a user approves a follow request,
     * THE User_Profile_Service SHALL create the follow relationship.
     *
     * **Validates: Requirements 4.7-4.11**
     */
    it('should create follow request for protected accounts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          followMessageArb,
          async (requesterId, targetId, message) => {
            // Skip if same user
            if (requesterId === targetId) return true;

            // Setup users - target is protected
            await setupUser(requesterId);
            await setupUser(targetId, {
              isProtected: true,
              approveFollowersMode: ApproveFollowersMode.ApproveAll,
            });

            // Try to follow
            const result = await service.follow(requesterId, targetId, {
              message,
            });

            // Should create a request, not a direct follow
            expect(result.success).toBe(true);
            expect(result.requestCreated).toBe(true);
            expect(result.followRequest).toBeDefined();
            expect(result.followRequest?.status).toBe(
              FollowRequestStatus.Pending,
            );
            if (message) {
              expect(result.followRequest?.message).toBe(message);
            }

            // Should NOT be following yet
            expect(await service.isFollowing(requesterId, targetId)).toBe(
              false,
            );

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should create follow relationship when request is approved', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (requesterId, targetId) => {
            // Skip if same user
            if (requesterId === targetId) return true;

            // Setup users - target is protected
            await setupUser(requesterId);
            await setupUser(targetId, {
              isProtected: true,
              approveFollowersMode: ApproveFollowersMode.ApproveAll,
            });

            // Create follow request
            const result = await service.follow(requesterId, targetId);
            expect(result.requestCreated).toBe(true);
            const requestId = result.followRequest!._id;

            // Approve the request
            await service.approveFollowRequest(targetId, requestId);

            // Should now be following
            expect(await service.isFollowing(requesterId, targetId)).toBe(true);

            // Request should be approved
            const request = followRequestsCollection.data.find(
              (r: { _id: string; status?: string; message?: string }) =>
                r._id === requestId,
            );
            expect(request?.status).toBe(FollowRequestStatus.Approved);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should not create follow relationship when request is rejected', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (requesterId, targetId) => {
            // Skip if same user
            if (requesterId === targetId) return true;

            // Setup users - target is protected
            await setupUser(requesterId);
            await setupUser(targetId, {
              isProtected: true,
              approveFollowersMode: ApproveFollowersMode.ApproveAll,
            });

            // Create follow request
            const result = await service.follow(requesterId, targetId);
            expect(result.requestCreated).toBe(true);
            const requestId = result.followRequest!._id;

            // Reject the request
            await service.rejectFollowRequest(targetId, requestId);

            // Should NOT be following
            expect(await service.isFollowing(requesterId, targetId)).toBe(
              false,
            );

            // Request should be rejected
            const request = followRequestsCollection.data.find(
              (r: { _id: string; status?: string; message?: string }) =>
                r._id === requestId,
            );
            expect(request?.status).toBe(FollowRequestStatus.Rejected);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should auto-approve mutuals when mode is ApproveNonMutuals', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (user1Id, user2Id) => {
          // Skip if same user
          if (user1Id === user2Id) return true;

          // Setup users - user2 is protected with ApproveNonMutuals
          await setupUser(user1Id);
          await setupUser(user2Id, {
            isProtected: true,
            approveFollowersMode: ApproveFollowersMode.ApproveNonMutuals,
          });

          // User2 follows User1 first (making them a mutual when User1 follows back)
          await service.follow(user2Id, user1Id);

          // Now User1 tries to follow User2 - should auto-approve since User2 follows User1
          const result = await service.follow(user1Id, user2Id);

          // Should be a direct follow, not a request
          expect(result.success).toBe(true);
          expect(result.requestCreated).toBeFalsy();
          expect(await service.isFollowing(user1Id, user2Id)).toBe(true);

          return true;
        }),
        { numRuns: 15 },
      );
    });
  });

  describe('Property 21: Profile Bio Length Validation', () => {
    /**
     * Property 21: Profile Bio Length Validation
     *
     * WHEN a user updates their bio,
     * THE User_Profile_Service SHALL validate the bio does not exceed 160 characters.
     *
     * **Validates: Requirements 8.2**
     */
    it('should accept valid bios within limit', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, validBioArb, async (userId, bio) => {
          // Setup user
          await setupUser(userId);

          // Update bio
          await service.updateBio(userId, bio);

          // Verify bio updated
          const profile = userProfilesCollection.data.find(
            (p: {
              _id: string;
              followingCount?: number;
              followerCount?: number;
              bio?: string;
              displayName?: string;
            }) => p._id === userId,
          );
          expect(profile?.bio).toBe(bio);

          return true;
        }),
        { numRuns: 30 },
      );
    });

    it('should reject bios exceeding 160 characters', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, tooLongBioArb, async (userId, bio) => {
          // Setup user
          await setupUser(userId);

          // Try to update with too long bio
          await expect(service.updateBio(userId, bio)).rejects.toMatchObject({
            code: UserProfileErrorCode.BioTooLong,
          });

          return true;
        }),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 26: Block Effect on Content Visibility', () => {
    /**
     * Property 26: Block Effect on Content Visibility
     *
     * WHEN a user blocks another user,
     * THE User_Profile_Service SHALL prevent the blocked user from viewing the blocker's content.
     * WHEN a user blocks another user,
     * THE User_Profile_Service SHALL remove any existing follow relationship.
     *
     * **Validates: Requirements 18.1, 18.2**
     */
    it('should remove follow relationships when blocking', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (blockerId, blockedId) => {
          // Skip if same user
          if (blockerId === blockedId) return true;

          // Setup users
          await setupUsers([blockerId, blockedId]);

          // Create mutual follow relationship
          await service.follow(blockerId, blockedId);
          await service.follow(blockedId, blockerId);

          // Verify follows exist
          expect(await service.isFollowing(blockerId, blockedId)).toBe(true);
          expect(await service.isFollowing(blockedId, blockerId)).toBe(true);

          // Block
          await service.blockUser(blockerId, blockedId);

          // Verify block exists
          expect(await service.isBlocked(blockerId, blockedId)).toBe(true);

          // Verify follows removed (both directions)
          expect(await service.isFollowing(blockerId, blockedId)).toBe(false);
          expect(await service.isFollowing(blockedId, blockerId)).toBe(false);

          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('should prevent blocked user from following', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (blockerId, blockedId) => {
          // Skip if same user
          if (blockerId === blockedId) return true;

          // Setup users
          await setupUsers([blockerId, blockedId]);

          // Block first
          await service.blockUser(blockerId, blockedId);

          // Blocked user tries to follow blocker
          await expect(
            service.follow(blockedId, blockerId),
          ).rejects.toMatchObject({
            code: UserProfileErrorCode.UserBlocked,
          });

          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('should be idempotent when blocking the same user multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          fc.integer({ min: 2, max: 5 }),
          async (blockerId, blockedId, blockCount) => {
            // Skip if same user
            if (blockerId === blockedId) return true;

            // Setup users
            await setupUsers([blockerId, blockedId]);

            // Block multiple times
            for (let i = 0; i < blockCount; i++) {
              await service.blockUser(blockerId, blockedId);
            }

            // Should only have one block record
            const blocks = blocksCollection.data.filter(
              (b: { _id: string; blockerId?: string; blockedId?: string }) =>
                b.blockerId === blockerId && b.blockedId === blockedId,
            );
            expect(blocks.length).toBe(1);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should prevent self-blocking', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          // Setup user
          await setupUser(userId);

          // Try to self-block
          await expect(service.blockUser(userId, userId)).rejects.toMatchObject(
            {
              code: UserProfileErrorCode.SelfBlockNotAllowed,
            },
          );

          return true;
        }),
        { numRuns: 15 },
      );
    });
  });

  describe('Property 27: Mute Effect on Timeline', () => {
    /**
     * Property 27: Mute Effect on Timeline
     *
     * WHEN a user mutes another user,
     * THE Feed_Service SHALL exclude the muted user's posts from the muting user's timeline.
     * (This test verifies the mute relationship is correctly created/removed)
     *
     * **Validates: Requirements 18.3, 18.4**
     */
    it('should create and remove mute relationships correctly', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (muterId, mutedId) => {
          // Skip if same user
          if (muterId === mutedId) return true;

          // Setup users
          await setupUsers([muterId, mutedId]);

          // Mute
          await service.muteUser(muterId, mutedId);

          // Verify mute exists
          expect(await service.isMuted(muterId, mutedId)).toBe(true);

          // Unmute
          await service.unmuteUser(muterId, mutedId);

          // Verify mute removed
          expect(await service.isMuted(muterId, mutedId)).toBe(false);

          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('should be idempotent when muting the same user multiple times', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          fc.integer({ min: 2, max: 5 }),
          async (muterId, mutedId, muteCount) => {
            // Skip if same user
            if (muterId === mutedId) return true;

            // Setup users
            await setupUsers([muterId, mutedId]);

            // Mute multiple times
            for (let i = 0; i < muteCount; i++) {
              await service.muteUser(muterId, mutedId);
            }

            // Should only have one mute record
            const mutes = mutesCollection.data.filter(
              (m: { _id: string; muterId?: string; mutedId?: string }) =>
                m.muterId === muterId && m.mutedId === mutedId,
            );
            expect(mutes.length).toBe(1);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should prevent self-muting', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          // Setup user
          await setupUser(userId);

          // Try to self-mute
          await expect(service.muteUser(userId, userId)).rejects.toMatchObject({
            code: UserProfileErrorCode.SelfMuteNotAllowed,
          });

          return true;
        }),
        { numRuns: 15 },
      );
    });

    it('should allow muting without affecting follow relationship', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (muterId, mutedId) => {
          // Skip if same user
          if (muterId === mutedId) return true;

          // Setup users
          await setupUsers([muterId, mutedId]);

          // Create follow relationship
          await service.follow(muterId, mutedId);
          expect(await service.isFollowing(muterId, mutedId)).toBe(true);

          // Mute
          await service.muteUser(muterId, mutedId);

          // Verify mute exists
          expect(await service.isMuted(muterId, mutedId)).toBe(true);

          // Verify follow still exists (mute doesn't remove follow)
          expect(await service.isFollowing(muterId, mutedId)).toBe(true);

          return true;
        }),
        { numRuns: 15 },
      );
    });
  });

  describe('Additional Property Tests', () => {
    it('should correctly list blocked users with pagination', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(userIdArb, { minLength: 3, maxLength: 10 }),
          async (blockerId, blockedIds) => {
            // Setup blocker
            await setupUser(blockerId);

            // Setup and block unique users
            const uniqueBlockedIds = [...new Set(blockedIds)].filter(
              (id) => id !== blockerId,
            );
            for (const blockedId of uniqueBlockedIds) {
              await setupUser(blockedId);
              await service.blockUser(blockerId, blockedId);
            }

            // Get blocked users
            const result = await service.getBlockedUsers(blockerId, {
              limit: 5,
            });

            // Verify results
            expect(result.items.length).toBeLessThanOrEqual(5);
            expect(result.items.length).toBeLessThanOrEqual(
              uniqueBlockedIds.length,
            );

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should correctly list muted users with pagination', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(userIdArb, { minLength: 3, maxLength: 10 }),
          async (muterId, mutedIds) => {
            // Setup muter
            await setupUser(muterId);

            // Setup and mute unique users
            const uniqueMutedIds = [...new Set(mutedIds)].filter(
              (id) => id !== muterId,
            );
            for (const mutedId of uniqueMutedIds) {
              await setupUser(mutedId);
              await service.muteUser(muterId, mutedId);
            }

            // Get muted users
            const result = await service.getMutedUsers(muterId, { limit: 5 });

            // Verify results
            expect(result.items.length).toBeLessThanOrEqual(5);
            expect(result.items.length).toBeLessThanOrEqual(
              uniqueMutedIds.length,
            );

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should update display name correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          validDisplayNameArb,
          async (userId, displayName) => {
            // Setup user
            await setupUser(userId);

            // Update display name
            await service.updateDisplayName(userId, displayName);

            // Verify update
            const profile = userProfilesCollection.data.find(
              (p: {
                _id: string;
                followingCount?: number;
                followerCount?: number;
                bio?: string;
                displayName?: string;
              }) => p._id === userId,
            );
            expect(profile?.displayName).toBe(displayName.trim());

            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should reject empty display names', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.constantFrom('', '   ', '\n', '\t'),
          async (userId, emptyName) => {
            // Setup user
            await setupUser(userId);

            // Try to update with empty name
            await expect(
              service.updateDisplayName(userId, emptyName),
            ).rejects.toMatchObject({
              code: UserProfileErrorCode.InvalidDisplayName,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
