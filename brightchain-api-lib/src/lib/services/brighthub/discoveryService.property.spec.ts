/**
 * Property-based tests for Discovery_Service.
 *
 * Tests the following properties:
 * - Property 35: Connection Suggestion Exclusions
 * - Property 19: Mutual friends boost discovery suggestions
 *
 * Validates: Requirements 26.5, 15.2
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ApproveFollowersMode, SuggestionReason } from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import { createDiscoveryService, DiscoveryService } from './discoveryService';
import { createMockApplication } from './postService.test-helpers';
import { createFriendsService, FriendsService } from './friendsService';
import {
  createMockFriendsApplication,
  createMockIsBlocked,
} from './friendsService.test-helpers';

// --- Generators ---

const userIdArb = fc.uuid();

// --- Seed helpers ---

function seedUserProfile(
  mockApp: ReturnType<typeof createMockApplication>,
  userId: string,
  overrides: Record<string, any> = {},
) {
  const now = new Date().toISOString();
  const profile = {
    _id: userId,
    username: overrides['username'] ?? `user_${userId.slice(0, 8)}`,
    displayName: `User ${userId.slice(0, 8)}`,
    bio: '',
    followerCount: 0,
    followingCount: 0,
    postCount: 0,
    isVerified: false,
    isProtected: false,
    approveFollowersMode: ApproveFollowersMode.ApproveNone,
    privacySettings: {
      hideFollowerCount: false,
      hideFollowingCount: false,
      hideFollowersFromNonFollowers: false,
      hideFollowingFromNonFollowers: false,
      allowDmsFromNonFollowers: true,
      showOnlineStatus: true,
      showReadReceipts: true,
    },
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
  (mockApp.getModel('brighthub_user_profiles') as any).data.push(profile);
  return profile;
}

function seedFollow(
  mockApp: ReturnType<typeof createMockApplication>,
  followerId: string,
  followedId: string,
) {
  (mockApp.getModel('brighthub_follows') as any).data.push({
    _id: `follow-${Math.random().toString(36).slice(2, 8)}`,
    followerId,
    followedId,
    createdAt: new Date().toISOString(),
  });
}

function seedBlock(
  mockApp: ReturnType<typeof createMockApplication>,
  blockerId: string,
  blockedId: string,
) {
  (mockApp.getModel('brighthub_blocks') as any).data.push({
    _id: `block-${Math.random().toString(36).slice(2, 8)}`,
    blockerId,
    blockedId,
    createdAt: new Date().toISOString(),
  });
}

function seedMute(
  mockApp: ReturnType<typeof createMockApplication>,
  muterId: string,
  mutedId: string,
) {
  (mockApp.getModel('brighthub_mutes') as any).data.push({
    _id: `mute-${Math.random().toString(36).slice(2, 8)}`,
    muterId,
    mutedId,
    createdAt: new Date().toISOString(),
  });
}

function seedInteraction(
  mockApp: ReturnType<typeof createMockApplication>,
  userId: string,
  connectionId: string,
  overrides: Record<string, any> = {},
) {
  const now = new Date().toISOString();
  (mockApp.getModel('brighthub_connection_interactions') as any).data.push({
    _id: `interaction-${Math.random().toString(36).slice(2, 8)}`,
    userId,
    connectionId,
    totalLikesGiven: 0,
    totalLikesReceived: 0,
    totalReplies: 0,
    totalMentions: 0,
    lastInteractionAt: undefined,
    strength: 'dormant',
    followedAt: now,
    updatedAt: now,
    ...overrides,
  });
}

// --- Test Suite ---

describe('Feature: brighthub-social-network, Discovery_Service Property Tests', () => {
  let service: DiscoveryService;
  let mockApp: ReturnType<typeof createMockApplication>;

  beforeEach(() => {
    mockApp = createMockApplication();
    service = createDiscoveryService(mockApp as any);
  });

  // =========================================================================
  // Property 35: Connection Suggestion Exclusions
  // =========================================================================

  describe('Property 35: Connection Suggestion Exclusions', () => {
    /**
     * Suggestions must NEVER include:
     * - The requesting user themselves
     * - Users already followed by the requesting user
     * - Users who have blocked the requesting user (or vice versa)
     * - Users muted by the requesting user
     * - Users dismissed within the last 30 days
     *
     * **Validates: Requirements 26.5**
     */

    it('suggestions never include already-followed users', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(userIdArb, { minLength: 2, maxLength: 6 }),
          async (userId, otherIds) => {
            const unique = [...new Set([userId, ...otherIds])];
            if (unique.length < 3) return;

            const [me, followedUser, ...rest] = unique;

            // Seed profiles
            for (const id of unique) {
              seedUserProfile(mockApp, id);
            }

            // I follow followedUser
            seedFollow(mockApp, me, followedUser);

            // followedUser follows rest (so rest would be friends-of-friends)
            for (const id of rest) {
              seedFollow(mockApp, followedUser, id);
            }

            const result = await service.getSuggestions(me);
            const suggestedIds = result.items.map((s) => s.userId);

            // followedUser must NOT appear in suggestions
            expect(suggestedIds).not.toContain(followedUser);
            // self must NOT appear
            expect(suggestedIds).not.toContain(me);
          },
        ),
        { numRuns: 15 },
      );
    });

    it('suggestions never include blocked users', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, friendId, blockedId) => {
            if (
              userId === friendId ||
              userId === blockedId ||
              friendId === blockedId
            )
              return;

            seedUserProfile(mockApp, userId);
            seedUserProfile(mockApp, friendId);
            seedUserProfile(mockApp, blockedId);

            // I follow friend, friend follows blockedUser
            seedFollow(mockApp, userId, friendId);
            seedFollow(mockApp, friendId, blockedId);

            // I block blockedUser
            seedBlock(mockApp, userId, blockedId);

            const result = await service.getSuggestions(userId);
            const suggestedIds = result.items.map((s) => s.userId);

            expect(suggestedIds).not.toContain(blockedId);
          },
        ),
        { numRuns: 15 },
      );
    });

    it('suggestions never include users who blocked the requester', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, friendId, blockerUserId) => {
            if (
              userId === friendId ||
              userId === blockerUserId ||
              friendId === blockerUserId
            )
              return;

            seedUserProfile(mockApp, userId);
            seedUserProfile(mockApp, friendId);
            seedUserProfile(mockApp, blockerUserId);

            seedFollow(mockApp, userId, friendId);
            seedFollow(mockApp, friendId, blockerUserId);

            // blockerUser blocks me
            seedBlock(mockApp, blockerUserId, userId);

            const result = await service.getSuggestions(userId);
            const suggestedIds = result.items.map((s) => s.userId);

            expect(suggestedIds).not.toContain(blockerUserId);
          },
        ),
        { numRuns: 15 },
      );
    });

    it('suggestions never include muted users', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, friendId, mutedId) => {
            if (
              userId === friendId ||
              userId === mutedId ||
              friendId === mutedId
            )
              return;

            seedUserProfile(mockApp, userId);
            seedUserProfile(mockApp, friendId);
            seedUserProfile(mockApp, mutedId);

            seedFollow(mockApp, userId, friendId);
            seedFollow(mockApp, friendId, mutedId);

            // I mute mutedUser
            seedMute(mockApp, userId, mutedId);

            const result = await service.getSuggestions(userId);
            const suggestedIds = result.items.map((s) => s.userId);

            expect(suggestedIds).not.toContain(mutedId);
          },
        ),
        { numRuns: 15 },
      );
    });

    it('suggestions never include dismissed users within 30 days', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, friendId, dismissedId) => {
            if (
              userId === friendId ||
              userId === dismissedId ||
              friendId === dismissedId
            )
              return;

            seedUserProfile(mockApp, userId);
            seedUserProfile(mockApp, friendId);
            seedUserProfile(mockApp, dismissedId);

            seedFollow(mockApp, userId, friendId);
            seedFollow(mockApp, friendId, dismissedId);

            // Dismiss the suggestion
            await service.dismissSuggestion(userId, dismissedId);

            const result = await service.getSuggestions(userId);
            const suggestedIds = result.items.map((s) => s.userId);

            expect(suggestedIds).not.toContain(dismissedId);
          },
        ),
        { numRuns: 15 },
      );
    });

    it('suggestions include valid friends-of-friends candidates', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, friendId, candidateId) => {
            if (
              userId === friendId ||
              userId === candidateId ||
              friendId === candidateId
            )
              return;

            seedUserProfile(mockApp, userId);
            seedUserProfile(mockApp, friendId);
            seedUserProfile(mockApp, candidateId);

            // I follow friend, friend follows candidate
            seedFollow(mockApp, userId, friendId);
            seedFollow(mockApp, friendId, candidateId);

            const result = await service.getSuggestions(userId);
            const suggestedIds = result.items.map((s) => s.userId);

            // candidate SHOULD appear (not excluded)
            expect(suggestedIds).toContain(candidateId);

            // Verify mutual connection count is correct
            const suggestion = result.items.find(
              (s) => s.userId === candidateId,
            );
            expect(suggestion).toBeDefined();
            expect(suggestion!.mutualConnectionCount).toBeGreaterThanOrEqual(1);
          },
        ),
        { numRuns: 15 },
      );
    });

    it('suggestions are sorted by mutual connection count descending', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          const friendA = `friend-a-${userId.slice(0, 8)}`;
          const friendB = `friend-b-${userId.slice(0, 8)}`;
          const candidateX = `candidate-x-${userId.slice(0, 8)}`;
          const candidateY = `candidate-y-${userId.slice(0, 8)}`;

          // Ensure all IDs are unique
          const allIds = [userId, friendA, friendB, candidateX, candidateY];
          if (new Set(allIds).size !== allIds.length) return;

          for (const id of allIds) {
            seedUserProfile(mockApp, id);
          }

          // I follow friendA and friendB
          seedFollow(mockApp, userId, friendA);
          seedFollow(mockApp, userId, friendB);

          // Both friends follow candidateX (2 mutual connections)
          seedFollow(mockApp, friendA, candidateX);
          seedFollow(mockApp, friendB, candidateX);

          // Only friendA follows candidateY (1 mutual connection)
          seedFollow(mockApp, friendA, candidateY);

          const result = await service.getSuggestions(userId);
          const suggestedIds = result.items.map((s) => s.userId);

          expect(suggestedIds.indexOf(candidateX)).toBeLessThan(
            suggestedIds.indexOf(candidateY),
          );
        }),
        { numRuns: 10 },
      );
    });
  });

  // =========================================================================
  // Connection Strength Calculation
  // =========================================================================

  describe('Connection Strength Calculation', () => {
    it('returns Dormant when no interaction record exists', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId, connectionId) => {
          if (userId === connectionId) return;

          const strength = await service.calculateConnectionStrength(
            userId,
            connectionId,
          );
          expect(strength).toBe('dormant');
        }),
        { numRuns: 10 },
      );
    });

    it('returns Strong for high interaction counts with recent activity', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId, connectionId) => {
          if (userId === connectionId) return;

          seedInteraction(mockApp, userId, connectionId, {
            totalLikesGiven: 10,
            totalLikesReceived: 8,
            totalReplies: 5,
            totalMentions: 3,
            lastInteractionAt: new Date().toISOString(),
          });

          const strength = await service.calculateConnectionStrength(
            userId,
            connectionId,
          );
          expect(strength).toBe('strong');
        }),
        { numRuns: 10 },
      );
    });

    it('strength degrades with older last interaction', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId, connectionId) => {
          if (userId === connectionId) return;

          // Same interaction counts but very old last interaction (180 days ago)
          const oldDate = new Date(
            Date.now() - 180 * 24 * 60 * 60 * 1000,
          ).toISOString();

          seedInteraction(mockApp, userId, connectionId, {
            totalLikesGiven: 5,
            totalLikesReceived: 3,
            totalReplies: 2,
            totalMentions: 1,
            lastInteractionAt: oldDate,
          });

          const strength = await service.calculateConnectionStrength(
            userId,
            connectionId,
          );

          // With recency decay, 11 total * very low multiplier should be weak or dormant
          expect(['weak', 'dormant']).toContain(strength);
        }),
        { numRuns: 10 },
      );
    });

    it('updateConnectionStrengths processes all connections', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 4 }),
          async (userId, connectionIds) => {
            const unique = [...new Set(connectionIds)].filter(
              (id) => id !== userId,
            );
            if (unique.length === 0) return;

            for (const connId of unique) {
              seedInteraction(mockApp, userId, connId, {
                totalLikesGiven: 1,
                lastInteractionAt: new Date().toISOString(),
              });
            }

            const updated = await service.updateConnectionStrengths(userId);
            expect(updated).toBe(unique.length);
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  // =========================================================================
  // Connection Insights
  // =========================================================================

  describe('Connection Insights', () => {
    it('returns zeroed insights for connections with no interaction record', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId, connectionId) => {
          if (userId === connectionId) return;

          // Seed a follow relationship (required for getConnectionInsights)
          seedFollow(mockApp, userId, connectionId);

          const insights = await service.getConnectionInsights(
            userId,
            connectionId,
          );

          expect(insights.connectionId).toBe(connectionId);
          expect(insights.totalLikesGiven).toBe(0);
          expect(insights.totalLikesReceived).toBe(0);
          expect(insights.totalReplies).toBe(0);
          expect(insights.totalMentions).toBe(0);
          expect(insights.strength).toBe('dormant');
        }),
        { numRuns: 10 },
      );
    });

    it('throws ConnectionNotFound when no follow relationship exists', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId, connectionId) => {
          if (userId === connectionId) return;

          await expect(
            service.getConnectionInsights(userId, connectionId),
          ).rejects.toThrow('No follow relationship');
        }),
        { numRuns: 5 },
      );
    });

    it('getInactiveConnections returns connections with no recent interactions', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId, connectionId) => {
          if (userId === connectionId) return;

          seedUserProfile(mockApp, connectionId);
          seedFollow(mockApp, userId, connectionId);

          // No interaction record → inactive
          const result = await service.getInactiveConnections(userId);
          const inactiveIds = result.items.map((p) => p._id);

          expect(inactiveIds).toContain(connectionId);
        }),
        { numRuns: 10 },
      );
    });

    it('getInactiveConnections excludes connections with recent interactions', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId, connectionId) => {
          if (userId === connectionId) return;

          seedUserProfile(mockApp, connectionId);
          seedFollow(mockApp, userId, connectionId);

          // Seed a recent interaction
          seedInteraction(mockApp, userId, connectionId, {
            lastInteractionAt: new Date().toISOString(),
          });

          const result = await service.getInactiveConnections(userId);
          const inactiveIds = result.items.map((p) => p._id);

          expect(inactiveIds).not.toContain(connectionId);
        }),
        { numRuns: 10 },
      );
    });
  });

  // =========================================================================
  // Property 19: Mutual friends boost discovery suggestions
  // Feature: brightchain-friends-system, Property 19: Mutual friends boost discovery suggestions
  // =========================================================================

  describe('Property 19: Mutual friends boost discovery suggestions', () => {
    /**
     * For any pair of members with mutual friends, the IDiscoveryService.getSuggestions()
     * SHALL include a suggestion with reason: MutualFriends and mutualConnectionCount
     * equal to the actual number of mutual friends between the two members.
     *
     * **Validates: Requirements 15.2**
     */

    it('suggestions include MutualFriends reason when mutual friends exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, candidateId, mutualFriendId) => {
            // Ensure all IDs are distinct
            if (
              userId === candidateId ||
              userId === mutualFriendId ||
              candidateId === mutualFriendId
            )
              return;

            // Create a fresh mock app and friends service for each iteration
            const discoveryApp = createMockApplication();
            const friendsApp = createMockFriendsApplication();
            const friendsService = createFriendsService(
              friendsApp,
              createMockIsBlocked(),
            );

            // Seed user profiles in the discovery app
            for (const id of [userId, candidateId, mutualFriendId]) {
              seedUserProfile(discoveryApp, id);
            }

            // Create friendships: userId <-> mutualFriendId and candidateId <-> mutualFriendId
            // This makes mutualFriendId a mutual friend of userId and candidateId
            await friendsService.sendFriendRequest(userId, mutualFriendId);
            const userRequests = await friendsService.getReceivedFriendRequests(mutualFriendId);
            await friendsService.acceptFriendRequest(
              mutualFriendId,
              userRequests.items[0]._id,
            );

            await friendsService.sendFriendRequest(candidateId, mutualFriendId);
            const candidateRequests = await friendsService.getReceivedFriendRequests(mutualFriendId);
            await friendsService.acceptFriendRequest(
              mutualFriendId,
              candidateRequests.items[0]._id,
            );

            // Create discovery service with friends service
            const discoveryService = createDiscoveryService(
              discoveryApp as any,
              friendsService,
            );

            const result = await discoveryService.getSuggestions(userId);

            // Find the suggestion for candidateId
            const suggestion = result.items.find(
              (s) => s.userId === candidateId,
            );

            expect(suggestion).toBeDefined();
            expect(suggestion!.reason).toBe(SuggestionReason.MutualFriends);
            expect(suggestion!.mutualConnectionCount).toBeGreaterThanOrEqual(1);
          },
        ),
        { numRuns: 15 },
      );
    });

    it('mutualConnectionCount equals actual number of mutual friends', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 3 }),
          async (userId, candidateId, mutualFriendIds) => {
            const unique = [...new Set([userId, candidateId, ...mutualFriendIds])];
            if (unique.length < 3 || userId === candidateId) return;

            const actualMutualFriends = unique.filter(
              (id) => id !== userId && id !== candidateId,
            );
            if (actualMutualFriends.length === 0) return;

            const discoveryApp = createMockApplication();
            const friendsApp = createMockFriendsApplication();
            const friendsService = createFriendsService(
              friendsApp,
              createMockIsBlocked(),
            );

            // Seed profiles
            for (const id of unique) {
              seedUserProfile(discoveryApp, id);
            }

            // Create friendships for each mutual friend
            for (const mfId of actualMutualFriends) {
              // userId <-> mfId
              await friendsService.sendFriendRequest(userId, mfId);
              const reqs1 = await friendsService.getReceivedFriendRequests(mfId);
              if (reqs1.items.length > 0) {
                await friendsService.acceptFriendRequest(mfId, reqs1.items[0]._id);
              }

              // candidateId <-> mfId
              await friendsService.sendFriendRequest(candidateId, mfId);
              const reqs2 = await friendsService.getReceivedFriendRequests(mfId);
              if (reqs2.items.length > 0) {
                await friendsService.acceptFriendRequest(mfId, reqs2.items[0]._id);
              }
            }

            const discoveryService = createDiscoveryService(
              discoveryApp as any,
              friendsService,
            );

            const result = await discoveryService.getSuggestions(userId);
            const suggestion = result.items.find(
              (s) => s.userId === candidateId,
            );

            expect(suggestion).toBeDefined();
            expect(suggestion!.mutualConnectionCount).toBe(
              actualMutualFriends.length,
            );
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
