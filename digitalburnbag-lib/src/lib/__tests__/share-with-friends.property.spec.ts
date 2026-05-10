/**
 * Property test: Share with friends batch covers all friends.
 *
 * **Property 21: Share with friends batch covers all friends**
 * **Validates: Requirements 17.3**
 *
 * For any member with N friends (N ≥ 0), the shareWithFriends operation
 * SHALL invoke shareWithUser exactly N times, once for each friend,
 * and the resulting sharedCount SHALL equal N.
 */

import type {
  IBaseFriendship,
  IFriendsService,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { PermissionLevel } from '../enumerations/permission-level';
import type { IShareRepository } from '../interfaces/services/share-repository';
import { IShareServiceDeps, ShareService } from '../services/share-service';

// ── Helpers ─────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

function makeMockRepository(): jest.Mocked<IShareRepository<string>> {
  return {
    createShareLink: jest.fn(),
    getShareLinkById: jest.fn(),
    getShareLinkByToken: jest.fn(),
    updateShareLink: jest.fn(),
    deleteShareLink: jest.fn(),
    getShareLinksForFile: jest.fn(),
    getSharedItems: jest.fn(),
  };
}

function createMockFriendsService(
  friends: IBaseFriendship<string>[],
): IFriendsService {
  return {
    getFriends: jest.fn().mockResolvedValue({
      items: friends,
      hasMore: false,
      totalCount: friends.length,
    }),
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

function makeMockDeps(
  friendsService?: IFriendsService,
): jest.Mocked<IShareServiceDeps<string>> {
  return {
    checkPermissionFlag: jest.fn().mockResolvedValue(true),
    setACLEntry: jest.fn().mockResolvedValue(undefined),
    wrapKeyForMember: jest.fn().mockResolvedValue({
      id: 'kw-1',
      fileVersionId: 'fv-1',
      recipientType: 'internal_member',
      recipientUserId: 'user-1',
      wrappingPublicKey: new Uint8Array([10, 20, 30]),
      encryptedSymmetricKey: new Uint8Array([99, 99, 99]),
      keyType: 'ecies_secp256k1',
      createdBy: 'requester-1',
      ledgerEntryHash: new Uint8Array([7, 8, 9]),
      createdAt: new Date().toISOString(),
    }),
    wrapKeyForEphemeralShare: jest.fn(),
    wrapKeyForRecipientKey: jest.fn(),
    revokeWrapping: jest.fn(),
    readVaultSymmetricKey: jest.fn().mockResolvedValue({
      symmetricKey: new Uint8Array([42, 43, 44]),
      currentVersionId: 'fv-1',
    }),
    getFileContent: jest.fn(),
    hashPassword: jest.fn(),
    verifyPassword: jest.fn(),
    generateToken: jest.fn().mockReturnValue('token'),
    onAuditLog: jest.fn().mockResolvedValue(undefined),
    friendsService,
  } as jest.Mocked<IShareServiceDeps<string>>;
}

// ── Generators ──────────────────────────────────────────────────────

const userIdArb = fc.uuid();

function friendshipsArb(
  currentUserId: string,
): fc.Arbitrary<IBaseFriendship<string>[]> {
  return fc
    .array(fc.uuid(), { minLength: 0, maxLength: 10 })
    .map((friendIds) => {
      // Deduplicate and exclude self
      const unique = [...new Set(friendIds)].filter(
        (id) => id !== currentUserId,
      );
      return unique.map((friendId, i) => {
        const [a, b] =
          currentUserId < friendId
            ? [currentUserId, friendId]
            : [friendId, currentUserId];
        return {
          _id: `friendship-${i}`,
          memberIdA: a,
          memberIdB: b,
          createdAt: new Date().toISOString(),
        };
      });
    });
}

// ── Property Test ───────────────────────────────────────────────────

describe('Feature: brightchain-friends-system, Property 21: Share with friends batch covers all friends', () => {
  beforeEach(() => {
    idCounter = 0;
  });

  it('shareWithFriends invokes shareWithUser exactly N times for N friends and sharedCount equals N', async () => {
    await fc.assert(
      fc.asyncProperty(
        userIdArb,
        userIdArb.chain((uid) =>
          friendshipsArb(uid).map((f) => [uid, f] as const),
        ),
        async (_unused, [userId, friends]) => {
          const mockFriendsService = createMockFriendsService(friends);
          const mockDeps = makeMockDeps(mockFriendsService);
          const mockRepo = makeMockRepository();
          const service = new ShareService(mockRepo, mockDeps, generateId);

          const result = await service.shareWithFriends(
            {
              fileId: 'file-1',
              targetType: 'file',
              permissionLevel: PermissionLevel.Viewer,
            },
            userId,
          );

          // shareWithUser should be called exactly N times
          expect(mockDeps.setACLEntry).toHaveBeenCalledTimes(friends.length);

          // sharedCount should equal N
          expect(result.sharedCount).toBe(friends.length);
          expect(result.failedCount).toBe(0);

          // Verify each friend was shared with exactly once
          const sharedRecipients = mockDeps.setACLEntry.mock.calls.map(
            (call) => call[2].principalId,
          );
          const expectedFriendIds = friends.map((f) =>
            f.memberIdA === userId ? f.memberIdB : f.memberIdA,
          );
          expect(sharedRecipients.sort()).toEqual(expectedFriendIds.sort());

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});
