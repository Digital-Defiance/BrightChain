/**
 * Edge case unit tests for FriendsService.
 *
 * Tests:
 * - Non-existent request operations (accept/reject/cancel with bad ID) → REQUEST_NOT_FOUND
 * - Non-pending request operations (accept already-accepted request) → REQUEST_NOT_FOUND
 * - removeFriend when not friends → NOT_FRIENDS
 * - Friendship status priority: when both friendship AND pending request exist, status is 'friends'
 *
 * Validates: Requirements 2.3, 3.2, 4.2, 5.2, 8.2
 */

import {
  FriendRequestStatus,
  FriendshipStatus,
  FriendsErrorCode,
} from '@brightchain/brightchain-lib';
import { FriendsServiceError } from '@brightchain/brightchain-lib';
import { FriendsService, createFriendsService } from '../services/brighthub/friendsService';
import {
  createMockFriendsApplication,
  createMockIsBlocked,
} from '../services/brighthub/friendsService.test-helpers';

describe('Feature: brightchain-friends-system, FriendsService Edge Cases', () => {
  let service: FriendsService;
  let mockApp: ReturnType<typeof createMockFriendsApplication>;

  const userA = '00000000-0000-4000-8000-000000000001';
  const userB = '00000000-0000-4000-8000-000000000002';
  const userC = '00000000-0000-4000-8000-000000000003';
  const nonExistentRequestId = '00000000-0000-4000-8000-ffffffffffff';

  beforeEach(() => {
    mockApp = createMockFriendsApplication();
    service = createFriendsService(mockApp, createMockIsBlocked());
  });

  // --- Non-existent request operations → REQUEST_NOT_FOUND ---
  // Validates: Requirements 2.3, 3.2, 4.2

  describe('Non-existent request operations', () => {
    it('acceptFriendRequest with non-existent ID throws REQUEST_NOT_FOUND', async () => {
      await expect(
        service.acceptFriendRequest(userA, nonExistentRequestId),
      ).rejects.toMatchObject({
        code: FriendsErrorCode.RequestNotFound,
      });
    });

    it('rejectFriendRequest with non-existent ID throws REQUEST_NOT_FOUND', async () => {
      await expect(
        service.rejectFriendRequest(userA, nonExistentRequestId),
      ).rejects.toMatchObject({
        code: FriendsErrorCode.RequestNotFound,
      });
    });

    it('cancelFriendRequest with non-existent ID throws REQUEST_NOT_FOUND', async () => {
      await expect(
        service.cancelFriendRequest(userA, nonExistentRequestId),
      ).rejects.toMatchObject({
        code: FriendsErrorCode.RequestNotFound,
      });
    });
  });

  // --- Non-pending request operations → REQUEST_NOT_FOUND ---
  // Validates: Requirements 2.3, 3.2, 4.2

  describe('Non-pending request operations', () => {
    it('acceptFriendRequest on already-accepted request throws REQUEST_NOT_FOUND', async () => {
      const result = await service.sendFriendRequest(userA, userB);
      const requestId = result.friendRequest!._id;

      // Accept it once
      await service.acceptFriendRequest(userB, requestId);

      // Try to accept again — no longer pending
      await expect(
        service.acceptFriendRequest(userB, requestId),
      ).rejects.toMatchObject({
        code: FriendsErrorCode.RequestNotFound,
      });
    });

    it('rejectFriendRequest on already-rejected request throws REQUEST_NOT_FOUND', async () => {
      const result = await service.sendFriendRequest(userA, userB);
      const requestId = result.friendRequest!._id;

      // Reject it once
      await service.rejectFriendRequest(userB, requestId);

      // Try to reject again — no longer pending
      await expect(
        service.rejectFriendRequest(userB, requestId),
      ).rejects.toMatchObject({
        code: FriendsErrorCode.RequestNotFound,
      });
    });

    it('cancelFriendRequest on already-cancelled request throws REQUEST_NOT_FOUND', async () => {
      const result = await service.sendFriendRequest(userA, userB);
      const requestId = result.friendRequest!._id;

      // Cancel it once
      await service.cancelFriendRequest(userA, requestId);

      // Try to cancel again — no longer pending
      await expect(
        service.cancelFriendRequest(userA, requestId),
      ).rejects.toMatchObject({
        code: FriendsErrorCode.RequestNotFound,
      });
    });
  });

  // --- removeFriend when not friends → NOT_FRIENDS ---
  // Validates: Requirement 5.2

  describe('removeFriend when not friends', () => {
    it('throws NOT_FRIENDS when no friendship exists', async () => {
      await expect(
        service.removeFriend(userA, userB),
      ).rejects.toMatchObject({
        code: FriendsErrorCode.NotFriends,
      });
    });
  });

  // --- Friendship status priority ---
  // Validates: Requirement 8.2

  describe('Friendship status priority', () => {
    it('returns "friends" when both friendship AND pending request exist', async () => {
      // Create friendship between A and B
      const result = await service.sendFriendRequest(userA, userB);
      await service.acceptFriendRequest(userB, result.friendRequest!._id);

      // Manually inject a pending request record between A and C, then
      // create a friendship too. We'll use A↔C to test the priority.
      const friendResult = await service.sendFriendRequest(userA, userC);
      await service.acceptFriendRequest(userC, friendResult.friendRequest!._id);

      // Now manually insert a stale pending request between A and C
      // to simulate the edge case where both exist
      const requestsCollection = mockApp.collections.get(
        'brightchain_friend_requests',
      )!;
      requestsCollection.data.push({
        _id: 'stale-pending-request',
        requesterId: userA,
        recipientId: userC,
        status: FriendRequestStatus.Pending,
        createdAt: new Date().toISOString(),
      } as any);

      // Status should be 'friends' (friendship takes priority over pending request)
      const status = await service.getFriendshipStatus(userA, userC);
      expect(status).toBe(FriendshipStatus.Friends);

      // areFriends should also return true
      expect(await service.areFriends(userA, userC)).toBe(true);
    });
  });
});
