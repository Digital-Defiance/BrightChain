/**
 * Property-based tests for FriendsService.
 *
 * Tests the following properties:
 * - Property 1: Send request creates valid pending record
 * - Property 2: Self-requests are always rejected
 * - Property 3: Duplicate friend requests are rejected
 * - Property 4: Already-friends requests are rejected
 * - Property 5: Reciprocal requests auto-accept into friendship
 * - Property 6: Blocked members cannot send friend requests
 * - Property 7: Accepting a request creates a valid friendship
 * - Property 8: Only the authorized party can act on a request
 * - Property 9: Rejecting a request updates status to rejected
 * - Property 10: Cancelling a request updates status to cancelled
 * - Property 11: Remove friendship round-trip
 *
 * Validates: Requirements 1.1–1.6, 2.1, 2.2, 2.4, 3.1, 3.3, 4.1, 4.3, 5.1, 5.3
 */

import {
  FriendRequestStatus,
  FriendshipStatus,
  FriendsErrorCode,
} from '@brightchain/brightchain-lib';
import { FriendsServiceError } from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { FriendsService, createFriendsService } from './friendsService';
import {
  createMockFriendsApplication,
  createMockIsBlocked,
  MockCollection,
} from './friendsService.test-helpers';

describe('Feature: brightchain-friends-system, FriendsService Property Tests', () => {
  let service: FriendsService;
  let mockApp: ReturnType<typeof createMockFriendsApplication>;
  let friendshipsCollection: MockCollection<{
    _id: string;
    [key: string]: unknown;
  }>;
  let friendRequestsCollection: MockCollection<{
    _id: string;
    [key: string]: unknown;
  }>;

  beforeEach(() => {
    mockApp = createMockFriendsApplication();
    friendshipsCollection = mockApp.collections.get(
      'brightchain_friendships',
    )!;
    friendRequestsCollection = mockApp.collections.get(
      'brightchain_friend_requests',
    )!;
    service = createFriendsService(mockApp, createMockIsBlocked());
  });

  // --- Smart Generators ---

  /** Generator for valid user IDs (UUIDs) */
  const userIdArb = fc.uuid();

  /** Generator for optional friend request messages */
  const messageArb = fc.option(
    fc.string({ minLength: 1, maxLength: 280 }),
    { nil: undefined },
  );

  // --- Property 1: Send request creates valid pending record ---
  // **Validates: Requirements 1.1**

  describe('Property 1: Send request creates a valid pending record', () => {
    it('should create a pending friend request with correct fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          messageArb,
          async (requesterId, recipientId, message) => {
            if (requesterId === recipientId) return true;

            // Fresh service per iteration
            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            const result = await svc.sendFriendRequest(
              requesterId,
              recipientId,
              message,
            );

            expect(result.success).toBe(true);
            expect(result.friendRequest).toBeDefined();
            const req = result.friendRequest!;
            expect(req.status).toBe(FriendRequestStatus.Pending);
            expect(req.requesterId).toBe(requesterId);
            expect(req.recipientId).toBe(recipientId);
            expect(req.message).toBe(message);
            expect(req._id).toBeDefined();
            expect(req.createdAt).toBeDefined();
            // Verify ISO timestamp
            expect(new Date(req.createdAt).toISOString()).toBe(req.createdAt);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 2: Self-requests are always rejected ---
  // **Validates: Requirements 1.2**

  describe('Property 2: Self-requests are always rejected', () => {
    it('should reject self-friend-request with SELF_REQUEST_NOT_ALLOWED', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          const app = createMockFriendsApplication();
          const svc = createFriendsService(app, createMockIsBlocked());

          await expect(
            svc.sendFriendRequest(userId, userId),
          ).rejects.toMatchObject({
            code: FriendsErrorCode.SelfRequestNotAllowed,
          });

          // Verify no request was created
          const requests = app.collections.get(
            'brightchain_friend_requests',
          )!;
          expect(requests.data.length).toBe(0);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 3: Duplicate friend requests are rejected ---
  // **Validates: Requirements 1.4**

  describe('Property 3: Duplicate friend requests are rejected', () => {
    it('should reject duplicate pending request with REQUEST_ALREADY_EXISTS', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (requesterId, recipientId) => {
            if (requesterId === recipientId) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            // First request succeeds
            await svc.sendFriendRequest(requesterId, recipientId);

            // Second request should fail
            await expect(
              svc.sendFriendRequest(requesterId, recipientId),
            ).rejects.toMatchObject({
              code: FriendsErrorCode.RequestAlreadyExists,
            });

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 4: Already-friends requests are rejected ---
  // **Validates: Requirements 1.3**

  describe('Property 4: Already-friends requests are rejected', () => {
    it('should reject request when already friends with ALREADY_FRIENDS', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (userA, userB) => {
            if (userA === userB) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            // Establish friendship: A sends, B accepts
            const result = await svc.sendFriendRequest(userA, userB);
            await svc.acceptFriendRequest(userB, result.friendRequest!._id);

            // Now sending in either direction should fail
            await expect(
              svc.sendFriendRequest(userA, userB),
            ).rejects.toMatchObject({
              code: FriendsErrorCode.AlreadyFriends,
            });

            await expect(
              svc.sendFriendRequest(userB, userA),
            ).rejects.toMatchObject({
              code: FriendsErrorCode.AlreadyFriends,
            });

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 5: Reciprocal requests auto-accept into friendship ---
  // **Validates: Requirements 1.5**

  describe('Property 5: Reciprocal requests auto-accept into friendship', () => {
    it('should auto-accept when reciprocal pending request exists', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (userA, userB) => {
            if (userA === userB) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            // B sends request to A
            const firstResult = await svc.sendFriendRequest(userB, userA);
            expect(firstResult.friendRequest!.status).toBe(
              FriendRequestStatus.Pending,
            );

            // A sends request to B → auto-accept
            const secondResult = await svc.sendFriendRequest(userA, userB);
            expect(secondResult.success).toBe(true);
            expect(secondResult.autoAccepted).toBe(true);
            expect(secondResult.friendship).toBeDefined();

            // Both should now be friends
            expect(await svc.areFriends(userA, userB)).toBe(true);

            // Both requests should be accepted
            const requests = app.collections.get(
              'brightchain_friend_requests',
            )!;
            for (const req of requests.data) {
              expect((req as { status: string }).status).toBe(
                FriendRequestStatus.Accepted,
              );
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 6: Blocked members cannot send friend requests ---
  // **Validates: Requirements 1.6, 10.3**

  describe('Property 6: Blocked members cannot send friend requests', () => {
    it('should reject request when block exists in either direction', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (userA, userB) => {
            if (userA === userB) return true;

            // Block A→B
            const app1 = createMockFriendsApplication();
            const svc1 = createFriendsService(
              app1,
              createMockIsBlocked([[userA, userB]]),
            );

            await expect(
              svc1.sendFriendRequest(userA, userB),
            ).rejects.toMatchObject({
              code: FriendsErrorCode.UserBlocked,
            });

            // Block B→A (reverse direction)
            const app2 = createMockFriendsApplication();
            const svc2 = createFriendsService(
              app2,
              createMockIsBlocked([[userB, userA]]),
            );

            await expect(
              svc2.sendFriendRequest(userA, userB),
            ).rejects.toMatchObject({
              code: FriendsErrorCode.UserBlocked,
            });

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 7: Accepting a request creates a valid friendship ---
  // **Validates: Requirements 2.1, 2.2**

  describe('Property 7: Accepting a request creates a valid friendship', () => {
    it('should create friendship with correct fields when request is accepted', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (requesterId, recipientId) => {
            if (requesterId === recipientId) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            // Send request
            const sendResult = await svc.sendFriendRequest(
              requesterId,
              recipientId,
            );
            const requestId = sendResult.friendRequest!._id;

            // Accept
            await svc.acceptFriendRequest(recipientId, requestId);

            // Verify friendship exists
            expect(await svc.areFriends(requesterId, recipientId)).toBe(true);

            // Verify friendship record
            const friendships = app.collections.get(
              'brightchain_friendships',
            )!;
            expect(friendships.data.length).toBe(1);
            const f = friendships.data[0] as {
              _id: string;
              memberIdA: string;
              memberIdB: string;
              createdAt: string;
            };
            expect(f._id).toBeDefined();
            expect(f.createdAt).toBeDefined();
            expect(new Date(f.createdAt).toISOString()).toBe(f.createdAt);

            // Sorted pair
            const [expectedA, expectedB] =
              requesterId < recipientId
                ? [requesterId, recipientId]
                : [recipientId, requesterId];
            expect(f.memberIdA).toBe(expectedA);
            expect(f.memberIdB).toBe(expectedB);

            // Request status should be accepted
            const requests = app.collections.get(
              'brightchain_friend_requests',
            )!;
            const req = requests.data.find(
              (r: { _id: string }) => r._id === requestId,
            ) as { status: string };
            expect(req.status).toBe(FriendRequestStatus.Accepted);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 8: Only the authorized party can act on a request ---
  // **Validates: Requirements 2.4, 3.3, 4.3**

  describe('Property 8: Only the authorized party can act on a request', () => {
    it('should reject accept/reject by non-recipient and cancel by non-requester', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (requesterId, recipientId, intruderId) => {
            if (
              requesterId === recipientId ||
              requesterId === intruderId ||
              recipientId === intruderId
            )
              return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            const sendResult = await svc.sendFriendRequest(
              requesterId,
              recipientId,
            );
            const requestId = sendResult.friendRequest!._id;

            // Intruder tries to accept
            await expect(
              svc.acceptFriendRequest(intruderId, requestId),
            ).rejects.toMatchObject({
              code: FriendsErrorCode.Unauthorized,
            });

            // Intruder tries to reject
            await expect(
              svc.rejectFriendRequest(intruderId, requestId),
            ).rejects.toMatchObject({
              code: FriendsErrorCode.Unauthorized,
            });

            // Intruder tries to cancel (not the requester)
            await expect(
              svc.cancelFriendRequest(intruderId, requestId),
            ).rejects.toMatchObject({
              code: FriendsErrorCode.Unauthorized,
            });

            // Requester tries to accept (only recipient can)
            await expect(
              svc.acceptFriendRequest(requesterId, requestId),
            ).rejects.toMatchObject({
              code: FriendsErrorCode.Unauthorized,
            });

            // Recipient tries to cancel (only requester can)
            await expect(
              svc.cancelFriendRequest(recipientId, requestId),
            ).rejects.toMatchObject({
              code: FriendsErrorCode.Unauthorized,
            });

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 9: Rejecting a request updates status to rejected ---
  // **Validates: Requirements 3.1**

  describe('Property 9: Rejecting a request updates status to rejected', () => {
    it('should update status to rejected and not create friendship', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (requesterId, recipientId) => {
            if (requesterId === recipientId) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            const sendResult = await svc.sendFriendRequest(
              requesterId,
              recipientId,
            );
            const requestId = sendResult.friendRequest!._id;

            // Reject
            await svc.rejectFriendRequest(recipientId, requestId);

            // Verify status
            const requests = app.collections.get(
              'brightchain_friend_requests',
            )!;
            const req = requests.data.find(
              (r: { _id: string }) => r._id === requestId,
            ) as { status: string };
            expect(req.status).toBe(FriendRequestStatus.Rejected);

            // No friendship created
            const friendships = app.collections.get(
              'brightchain_friendships',
            )!;
            expect(friendships.data.length).toBe(0);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 10: Cancelling a request updates status to cancelled ---
  // **Validates: Requirements 4.1**

  describe('Property 10: Cancelling a request updates status to cancelled', () => {
    it('should update status to cancelled', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (requesterId, recipientId) => {
            if (requesterId === recipientId) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            const sendResult = await svc.sendFriendRequest(
              requesterId,
              recipientId,
            );
            const requestId = sendResult.friendRequest!._id;

            // Cancel
            await svc.cancelFriendRequest(requesterId, requestId);

            // Verify status
            const requests = app.collections.get(
              'brightchain_friend_requests',
            )!;
            const req = requests.data.find(
              (r: { _id: string }) => r._id === requestId,
            ) as { status: string };
            expect(req.status).toBe(FriendRequestStatus.Cancelled);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 11: Remove friendship round-trip ---
  // **Validates: Requirements 5.1, 5.3**

  describe('Property 11: Remove friendship round-trip', () => {
    it('should delete friendship and allow re-requesting', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (userA, userB) => {
            if (userA === userB) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            // Establish friendship
            const sendResult = await svc.sendFriendRequest(userA, userB);
            await svc.acceptFriendRequest(userB, sendResult.friendRequest!._id);
            expect(await svc.areFriends(userA, userB)).toBe(true);

            // Remove friendship
            await svc.removeFriend(userA, userB);
            expect(await svc.areFriends(userA, userB)).toBe(false);

            // Should be able to send a new request
            const newResult = await svc.sendFriendRequest(userA, userB);
            expect(newResult.success).toBe(true);
            expect(newResult.friendRequest).toBeDefined();
            expect(newResult.friendRequest!.status).toBe(
              FriendRequestStatus.Pending,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

// ============================================================================
// Properties 12–17: Query, Status, and Block Cleanup
// ============================================================================

describe('Feature: brightchain-friends-system, FriendsService Query & Status Property Tests', () => {
  // --- Smart Generators ---

  const userIdArb = fc.uuid();

  /**
   * Helper: create N friendships for a given member using fresh distinct friend IDs.
   * Returns the friend IDs in creation order.
   */
  async function createNFriendships(
    svc: FriendsService,
    memberId: string,
    friendIds: string[],
  ): Promise<void> {
    for (const fid of friendIds) {
      const result = await svc.sendFriendRequest(memberId, fid);
      await svc.acceptFriendRequest(fid, result.friendRequest!._id);
    }
  }

  // --- Property 12: Friends list is ordered and complete ---
  // **Validates: Requirements 6.1, 6.2**

  describe('Property 12: Friends list is ordered and complete', () => {
    it('should return all N friendships with no duplicates, ordered by createdAt descending', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uniqueArray(userIdArb, { minLength: 1, maxLength: 10 }),
          async (memberId, friendIds) => {
            // Filter out memberId from friendIds and ensure uniqueness
            const validFriendIds = friendIds.filter((id) => id !== memberId);
            if (validFriendIds.length === 0) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            await createNFriendships(svc, memberId, validFriendIds);

            const result = await svc.getFriends(memberId, {
              limit: validFriendIds.length + 10,
            });

            // All N returned
            expect(result.items.length).toBe(validFriendIds.length);
            expect(result.totalCount).toBe(validFriendIds.length);

            // No duplicates
            const ids = result.items.map((f) => f._id);
            expect(new Set(ids).size).toBe(ids.length);

            // Ordered by createdAt descending
            for (let i = 1; i < result.items.length; i++) {
              const prev = new Date(result.items[i - 1].createdAt).getTime();
              const curr = new Date(result.items[i].createdAt).getTime();
              expect(prev).toBeGreaterThanOrEqual(curr);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 13: Paginated results include accurate total count ---
  // **Validates: Requirements 6.3, 9.3**

  describe('Property 13: Paginated results include accurate total count', () => {
    it('should return totalCount equal to actual number of friendships when limit < N', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.uniqueArray(userIdArb, { minLength: 2, maxLength: 8 }),
          async (memberId, friendIds) => {
            const validFriendIds = friendIds.filter((id) => id !== memberId);
            if (validFriendIds.length < 2) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            await createNFriendships(svc, memberId, validFriendIds);

            const N = validFriendIds.length;
            const limit = Math.max(1, Math.floor(N / 2));

            const result = await svc.getFriends(memberId, { limit });

            // totalCount equals actual N
            expect(result.totalCount).toBe(N);
            // items limited to limit
            expect(result.items.length).toBe(limit);
            // hasMore is true since limit < N
            expect(result.hasMore).toBe(true);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 14: Received/sent request queries return only pending requests for the correct party ---
  // **Validates: Requirements 7.1, 7.2**

  describe('Property 14: Received/sent request queries return only pending requests for the correct party', () => {
    it('should return only pending requests where member is the correct party', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(userIdArb, { minLength: 4, maxLength: 6 }),
          async (userIds) => {
            if (userIds.length < 4) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            const [member, senderA, senderB, recipientC] = userIds;

            // senderA → member (pending, will stay pending)
            await svc.sendFriendRequest(senderA, member);

            // senderB → member (pending, then accepted → not pending)
            const acceptResult = await svc.sendFriendRequest(senderB, member);
            await svc.acceptFriendRequest(
              member,
              acceptResult.friendRequest!._id,
            );

            // member → recipientC (pending, will stay pending)
            await svc.sendFriendRequest(member, recipientC);

            // member → senderA already has a pending request from senderA→member
            // Let's also create a rejected request: member sends to senderB (already friends, will fail)
            // Instead, let's create another user for a cancelled request
            if (userIds.length >= 5) {
              const cancelTarget = userIds[4];
              const cancelResult = await svc.sendFriendRequest(
                member,
                cancelTarget,
              );
              await svc.cancelFriendRequest(
                member,
                cancelResult.friendRequest!._id,
              );
            }

            // Received: only pending where member is recipient
            const received = await svc.getReceivedFriendRequests(member);
            for (const req of received.items) {
              expect(req.recipientId).toBe(member);
              expect(req.status).toBe(FriendRequestStatus.Pending);
            }
            // Should contain senderA's request only (senderB's was accepted)
            expect(received.items.length).toBe(1);
            expect(received.items[0].requesterId).toBe(senderA);

            // Sent: only pending where member is requester
            const sent = await svc.getSentFriendRequests(member);
            for (const req of sent.items) {
              expect(req.requesterId).toBe(member);
              expect(req.status).toBe(FriendRequestStatus.Pending);
            }
            // Should contain recipientC's request only (cancelTarget was cancelled)
            expect(sent.items.length).toBe(1);
            expect(sent.items[0].recipientId).toBe(recipientC);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 15: Friendship status reflects actual relationship state ---
  // **Validates: Requirements 8.1, 8.3**

  describe('Property 15: Friendship status reflects actual relationship state', () => {
    it('should return correct status for various relationship states', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(userIdArb, { minLength: 5, maxLength: 5 }),
          async (userIds) => {
            if (userIds.length < 5) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            const [querier, friend, pendingSent, pendingReceived, stranger] =
              userIds;

            // Create friendship: querier ↔ friend
            const friendResult = await svc.sendFriendRequest(querier, friend);
            await svc.acceptFriendRequest(
              friend,
              friendResult.friendRequest!._id,
            );

            // Pending sent: querier → pendingSent
            await svc.sendFriendRequest(querier, pendingSent);

            // Pending received: pendingReceived → querier
            await svc.sendFriendRequest(pendingReceived, querier);

            // No relationship with stranger

            // Verify statuses
            expect(await svc.getFriendshipStatus(querier, friend)).toBe(
              FriendshipStatus.Friends,
            );
            expect(await svc.getFriendshipStatus(querier, pendingSent)).toBe(
              FriendshipStatus.PendingSent,
            );
            expect(
              await svc.getFriendshipStatus(querier, pendingReceived),
            ).toBe(FriendshipStatus.PendingReceived);
            expect(await svc.getFriendshipStatus(querier, stranger)).toBe(
              FriendshipStatus.None,
            );

            // areFriends convenience method
            expect(await svc.areFriends(querier, friend)).toBe(true);
            expect(await svc.areFriends(querier, pendingSent)).toBe(false);
            expect(await svc.areFriends(querier, pendingReceived)).toBe(false);
            expect(await svc.areFriends(querier, stranger)).toBe(false);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 16: Mutual friends equals the intersection of friend sets ---
  // **Validates: Requirements 9.1, 9.2**

  describe('Property 16: Mutual friends equals the intersection of friend sets', () => {
    it('should return exactly the intersection of friend sets', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(userIdArb, { minLength: 4, maxLength: 8 }),
          async (userIds) => {
            if (userIds.length < 4) return true;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            const [userA, userB, ...potentialFriends] = userIds;

            // Randomly assign friends to A and/or B
            const friendsOfA: string[] = [];
            const friendsOfB: string[] = [];

            for (let i = 0; i < potentialFriends.length; i++) {
              const pf = potentialFriends[i];
              // Alternate pattern: some friends of A only, some of B only, some of both
              if (i % 3 === 0 || i % 3 === 2) {
                // Friend of A
                const r = await svc.sendFriendRequest(userA, pf);
                await svc.acceptFriendRequest(pf, r.friendRequest!._id);
                friendsOfA.push(pf);
              }
              if (i % 3 === 1 || i % 3 === 2) {
                // Friend of B (if not already friends with B through A)
                const r = await svc.sendFriendRequest(userB, pf);
                await svc.acceptFriendRequest(pf, r.friendRequest!._id);
                friendsOfB.push(pf);
              }
            }

            // Compute expected mutual friends (intersection)
            const friendsOfASet = new Set(friendsOfA);
            const expectedMutual = friendsOfB.filter((id) =>
              friendsOfASet.has(id),
            );

            const result = await svc.getMutualFriends(userA, userB, {
              limit: 100,
            });

            // Extract mutual friend IDs from result
            const mutualIds = result.items.map((f) =>
              f.memberIdA === userB ? f.memberIdB : f.memberIdA,
            );

            // Same count
            expect(mutualIds.length).toBe(expectedMutual.length);

            // Same set (order may differ)
            expect(new Set(mutualIds)).toEqual(new Set(expectedMutual));

            // totalCount matches
            expect(result.totalCount).toBe(expectedMutual.length);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // --- Property 17: Blocking cleans up all friend data ---
  // **Validates: Requirements 10.1, 10.2**

  describe('Property 17: Blocking cleans up all friend data', () => {
    it('should remove friendship and cancel pending requests on block', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uniqueArray(userIdArb, { minLength: 2, maxLength: 2 }),
          fc.boolean(),
          fc.boolean(),
          async (userIds, hasFriendship, hasPendingRequests) => {
            if (userIds.length < 2) return true;

            const [blocker, blocked] = userIds;

            const app = createMockFriendsApplication();
            const svc = createFriendsService(app, createMockIsBlocked());

            // Optionally create friendship
            if (hasFriendship) {
              const r = await svc.sendFriendRequest(blocker, blocked);
              await svc.acceptFriendRequest(blocked, r.friendRequest!._id);
              expect(await svc.areFriends(blocker, blocked)).toBe(true);
            }

            // Optionally create pending requests (if no friendship, since already-friends blocks new requests)
            if (hasPendingRequests && !hasFriendship) {
              await svc.sendFriendRequest(blocker, blocked);
            }

            // Block
            await svc.onUserBlocked(blocker, blocked);

            // Friendship should be removed
            expect(await svc.areFriends(blocker, blocked)).toBe(false);

            // All pending requests between them should be cancelled
            const allRequests = app.collections.get(
              'brightchain_friend_requests',
            )!;
            for (const req of allRequests.data) {
              const r = req as {
                requesterId: string;
                recipientId: string;
                status: string;
              };
              if (
                (r.requesterId === blocker && r.recipientId === blocked) ||
                (r.requesterId === blocked && r.recipientId === blocker)
              ) {
                // Should not be pending
                expect(r.status).not.toBe(FriendRequestStatus.Pending);
              }
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
