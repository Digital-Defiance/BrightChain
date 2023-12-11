/**
 * Property-based tests for Connection_Service.
 *
 * Tests the following properties:
 * - Property 28: Connection List Membership Invariants
 * - Property 29: Connection List Deletion Cascade
 * - Property 30: Connection Category Assignment
 * - Property 31: Connection Note Privacy
 * - Property 32: Connection Export/Import Round-Trip
 * - Property 33: Quiet Mode Notification Suppression
 * - Property 34: Temporary Mute Expiration
 * - Property 36: Mutual Connection Calculation
 * - Property 37: Hub Content Visibility
 * - Property 38: Block Inheritance on Lists
 *
 * Validates: Requirements 19-33
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ApproveFollowersMode,
  ConnectionVisibility,
  MuteDuration,
} from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import {
  ConnectionService,
  createConnectionService,
} from './connectionService';
import { createMockApplication } from './postService.test-helpers';

// --- Generators ---

const userIdArb = fc.uuid();
const listNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,19}$/);
const categoryNameArb = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,14}$/);
const noteArb = fc.stringMatching(/^[A-Za-z0-9][A-Za-z0-9 ]{0,99}$/);

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

function getCollectionData(
  mockApp: ReturnType<typeof createMockApplication>,
  name: string,
): any[] {
  return (mockApp.getModel(name) as any).data;
}

// --- Test Suite ---

describe('Feature: brighthub-social-network, Connection_Service Property Tests', () => {
  let service: ConnectionService;
  let mockApp: ReturnType<typeof createMockApplication>;

  beforeEach(() => {
    mockApp = createMockApplication();
    service = createConnectionService(mockApp as any);
  });

  // =========================================================================
  // Property 28: Connection List Membership Invariants
  // =========================================================================

  describe('Property 28: Connection List Membership Invariants', () => {
    /**
     * For any list, memberCount always equals the actual number of member
     * records. Adding a member increases count by 1, removing decreases by 1.
     * Cannot exceed MAX_MEMBERS_PER_LIST.
     *
     * **Validates: Requirements 19.2, 19.3, 19.4, 19.5, 19.8, 19.9**
     */

    it('memberCount equals actual member records after add/remove', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          listNameArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 5 }),
          async (ownerId, listName, memberIds) => {
            const uniqueMembers = [...new Set(memberIds)].filter(
              (id) => id !== ownerId,
            );
            if (uniqueMembers.length === 0) return;

            seedUserProfile(mockApp, ownerId);
            for (const id of uniqueMembers) {
              seedUserProfile(mockApp, id);
            }

            const list = await service.createList(ownerId, listName);
            await service.addMembersToList(list._id, ownerId, uniqueMembers);

            // Verify memberCount matches actual records
            const listsData = getCollectionData(
              mockApp,
              'brighthub_connection_lists',
            );
            const listRecord = listsData.find((r: any) => r._id === list._id);
            const membersData = getCollectionData(
              mockApp,
              'brighthub_connection_list_members',
            );
            const actualMembers = membersData.filter(
              (r: any) => r.listId === list._id,
            );

            expect(listRecord!.memberCount).toBe(actualMembers.length);
            expect(listRecord!.memberCount).toBe(uniqueMembers.length);

            // Remove one member
            await service.removeMembersFromList(list._id, ownerId, [
              uniqueMembers[0],
            ]);

            const listAfter = listsData.find((r: any) => r._id === list._id);
            const membersAfter = membersData.filter(
              (r: any) => r.listId === list._id,
            );

            expect(listAfter!.memberCount).toBe(membersAfter.length);
            expect(listAfter!.memberCount).toBe(uniqueMembers.length - 1);
          },
        ),
        { numRuns: 15 },
      );
    });

    it('adding duplicate members does not increase count', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          listNameArb,
          userIdArb,
          async (ownerId, listName, memberId) => {
            if (ownerId === memberId) return;

            seedUserProfile(mockApp, ownerId);
            seedUserProfile(mockApp, memberId);

            const list = await service.createList(ownerId, listName);
            await service.addMembersToList(list._id, ownerId, [memberId]);
            await service.addMembersToList(list._id, ownerId, [memberId]);

            const listsData = getCollectionData(
              mockApp,
              'brighthub_connection_lists',
            );
            const listRecord = listsData.find((r: any) => r._id === list._id);
            const membersData = getCollectionData(
              mockApp,
              'brighthub_connection_list_members',
            );
            const actualMembers = membersData.filter(
              (r: any) => r.listId === list._id,
            );

            expect(listRecord!.memberCount).toBe(1);
            expect(actualMembers.length).toBe(1);
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 29: Connection List Deletion Cascade
  // =========================================================================

  describe('Property 29: Connection List Deletion Cascade', () => {
    /**
     * Deleting a list removes all its member records and follower records.
     *
     * **Validates: Requirements 19.10**
     */

    it('deleting a list removes all members and followers', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          listNameArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 4 }),
          async (ownerId, listName, memberIds) => {
            const uniqueMembers = [...new Set(memberIds)].filter(
              (id) => id !== ownerId,
            );
            if (uniqueMembers.length === 0) return;

            seedUserProfile(mockApp, ownerId);
            for (const id of uniqueMembers) {
              seedUserProfile(mockApp, id);
            }

            const list = await service.createList(ownerId, listName, {
              visibility: ConnectionVisibility.Public,
            });
            await service.addMembersToList(list._id, ownerId, uniqueMembers);

            // Seed a list follower directly
            getCollectionData(
              mockApp,
              'brighthub_connection_list_followers',
            ).push({
              _id: `lf-${Math.random().toString(36).slice(2, 8)}`,
              listId: list._id,
              userId: uniqueMembers[0],
              followedAt: new Date().toISOString(),
            });

            // Delete the list
            await service.deleteList(list._id, ownerId);

            // Verify all records are gone
            const listsData = getCollectionData(
              mockApp,
              'brighthub_connection_lists',
            );
            const membersData = getCollectionData(
              mockApp,
              'brighthub_connection_list_members',
            );
            const followersData = getCollectionData(
              mockApp,
              'brighthub_connection_list_followers',
            );

            expect(
              listsData.find((r: any) => r._id === list._id),
            ).toBeUndefined();
            expect(
              membersData.filter((r: any) => r.listId === list._id).length,
            ).toBe(0);
            expect(
              followersData.filter((r: any) => r.listId === list._id).length,
            ).toBe(0);
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 30: Connection Category Assignment
  // =========================================================================

  describe('Property 30: Connection Category Assignment', () => {
    /**
     * Assigning a category to a connection is idempotent (assigning twice
     * throws). Unassigning removes the assignment. Deleting a category
     * removes all its assignments without deleting connections.
     *
     * **Validates: Requirements 20.4, 20.7**
     */

    it('assign then unassign restores original state', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          categoryNameArb,
          userIdArb,
          async (ownerId, catName, connectionId) => {
            if (ownerId === connectionId) return;

            seedUserProfile(mockApp, ownerId);
            seedUserProfile(mockApp, connectionId);

            const category = await service.createCategory(ownerId, catName);
            await service.assignCategory(connectionId, category._id, ownerId);

            const assignData = getCollectionData(
              mockApp,
              'brighthub_connection_category_assignments',
            );
            const before = assignData.filter(
              (r: any) =>
                r.connectionId === connectionId &&
                r.categoryId === category._id,
            );
            expect(before.length).toBe(1);

            await service.unassignCategory(connectionId, category._id, ownerId);

            const after = assignData.filter(
              (r: any) =>
                r.connectionId === connectionId &&
                r.categoryId === category._id,
            );
            expect(after.length).toBe(0);
          },
        ),
        { numRuns: 15 },
      );
    });

    it('deleting a category removes all its assignments', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          categoryNameArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 3 }),
          async (ownerId, catName, connectionIds) => {
            const uniqueConns = [...new Set(connectionIds)].filter(
              (id) => id !== ownerId,
            );
            if (uniqueConns.length === 0) return;

            seedUserProfile(mockApp, ownerId);
            for (const id of uniqueConns) {
              seedUserProfile(mockApp, id);
            }

            const category = await service.createCategory(ownerId, catName);
            for (const connId of uniqueConns) {
              await service.assignCategory(connId, category._id, ownerId);
            }

            const assignData = getCollectionData(
              mockApp,
              'brighthub_connection_category_assignments',
            );
            expect(
              assignData.filter((r: any) => r.categoryId === category._id)
                .length,
            ).toBe(uniqueConns.length);

            await service.deleteCategory(category._id, ownerId);

            expect(
              assignData.filter((r: any) => r.categoryId === category._id)
                .length,
            ).toBe(0);
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 31: Connection Note Privacy
  // =========================================================================

  describe('Property 31: Connection Note Privacy', () => {
    /**
     * Notes are only visible to the user who created them.
     * One note per connection per user (upsert behavior on addNote).
     *
     * **Validates: Requirements 21.1, 21.5**
     */

    it('notes are only visible to the creator', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          noteArb,
          noteArb,
          async (userA, userB, connectionId, noteA, noteB) => {
            if (
              userA === userB ||
              userA === connectionId ||
              userB === connectionId
            ) {
              return;
            }

            seedUserProfile(mockApp, userA);
            seedUserProfile(mockApp, userB);
            seedUserProfile(mockApp, connectionId);

            await service.addNote(userA, connectionId, noteA);
            await service.addNote(userB, connectionId, noteB);

            const notesData = getCollectionData(
              mockApp,
              'brighthub_connection_notes',
            );
            const notesA = notesData.filter(
              (r: any) => r.userId === userA && r.connectionId === connectionId,
            );
            const notesB = notesData.filter(
              (r: any) => r.userId === userB && r.connectionId === connectionId,
            );

            expect(notesA.length).toBe(1);
            expect(notesA[0].note).toBe(noteA.trim());
            expect(notesB.length).toBe(1);
            expect(notesB[0].note).toBe(noteB.trim());
            expect(notesA[0]._id).not.toBe(notesB[0]._id);
          },
        ),
        { numRuns: 15 },
      );
    });

    it('addNote is upsert — calling twice updates instead of duplicating', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          noteArb,
          noteArb,
          async (userId, connectionId, note1, note2) => {
            if (userId === connectionId) return;

            seedUserProfile(mockApp, userId);
            seedUserProfile(mockApp, connectionId);

            await service.addNote(userId, connectionId, note1);
            await service.addNote(userId, connectionId, note2);

            const notesData = getCollectionData(
              mockApp,
              'brighthub_connection_notes',
            );
            const notes = notesData.filter(
              (r: any) =>
                r.userId === userId && r.connectionId === connectionId,
            );

            expect(notes.length).toBe(1);
            expect(notes[0].note).toBe(note2.trim());
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 32: Connection Export/Import Round-Trip
  // =========================================================================

  describe('Property 32: Connection Export/Import Round-Trip', () => {
    /**
     * Exporting connections and importing the result should recreate
     * the same follow relationships (minus any that already exist).
     *
     * **Validates: Requirements 22.1, 22.3, 22.4**
     */

    it('export then import recreates follow relationships', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.array(userIdArb, { minLength: 1, maxLength: 4 }),
          async (userId, followedIds) => {
            // Reset mock app for each property run
            mockApp = createMockApplication();
            service = createConnectionService(mockApp as any);

            const uniqueFollowed = [...new Set(followedIds)].filter(
              (id) => id !== userId,
            );
            if (uniqueFollowed.length === 0) return;

            seedUserProfile(mockApp, userId, {
              username: `exporter_${userId}`,
            });
            for (const fid of uniqueFollowed) {
              seedUserProfile(mockApp, fid, {
                username: `followed_${fid}`,
              });
            }

            for (const fid of uniqueFollowed) {
              seedFollow(mockApp, userId, fid);
            }

            const exported = await service.exportConnections(userId);
            expect(exported.connectionCount).toBe(uniqueFollowed.length);

            // Create a new user to import into
            const importerId = `imp-${Math.random().toString(36).slice(2, 10)}`;
            seedUserProfile(mockApp, importerId, {
              username: `importer_${importerId}`,
            });

            const importResult = await service.importConnections(
              importerId,
              JSON.stringify(exported),
              'json',
            );

            expect(importResult.successCount).toBe(uniqueFollowed.length);

            const followsData = getCollectionData(mockApp, 'brighthub_follows');
            const newFollows = followsData.filter(
              (r: any) => r.followerId === importerId,
            );
            const newFollowedIds = new Set(
              newFollows.map((r: any) => r.followedId),
            );

            for (const fid of uniqueFollowed) {
              expect(newFollowedIds.has(fid)).toBe(true);
            }
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  // =========================================================================
  // Property 33: Quiet Mode Notification Suppression
  // =========================================================================

  describe('Property 33: Quiet Mode Notification Suppression', () => {
    /**
     * Setting quiet mode on a connection is reflected in
     * getQuietConnections(). Toggling off removes from quiet list.
     *
     * **Validates: Requirements 24.1, 24.2, 24.3**
     */

    it('setQuietMode toggles presence in quiet connections list', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId, connectionId) => {
          if (userId === connectionId) return;

          seedUserProfile(mockApp, userId);
          seedUserProfile(mockApp, connectionId);

          await service.setQuietMode(userId, connectionId, true);

          const quietResult = await service.getQuietConnections(userId);
          const quietIds = quietResult.items.map((p) => p._id);
          expect(quietIds).toContain(connectionId);

          await service.setQuietMode(userId, connectionId, false);

          const quietAfter = await service.getQuietConnections(userId);
          const quietIdsAfter = quietAfter.items.map((p) => p._id);
          expect(quietIdsAfter).not.toContain(connectionId);
        }),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 34: Temporary Mute Expiration
  // =========================================================================

  describe('Property 34: Temporary Mute Expiration', () => {
    /**
     * getMutedConnections() only returns non-expired mutes.
     * Setting a mute with a past expiration should not appear in results.
     *
     * **Validates: Requirements 25.1, 25.2, 25.3**
     */

    it('active mutes appear, expired ones do not', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          userIdArb,
          async (userId, activeConnId, expiredConnId) => {
            if (
              userId === activeConnId ||
              userId === expiredConnId ||
              activeConnId === expiredConnId
            ) {
              return;
            }

            seedUserProfile(mockApp, userId);
            seedUserProfile(mockApp, activeConnId);
            seedUserProfile(mockApp, expiredConnId);

            // Set an active mute (1 hour from now)
            await service.setTemporaryMute(
              userId,
              activeConnId,
              MuteDuration.OneHour,
            );

            // Manually seed an expired mute (1 hour ago)
            getCollectionData(mockApp, 'brighthub_temporary_mutes').push({
              _id: `tmute-exp-${Math.random().toString(36).slice(2, 8)}`,
              userId,
              connectionId: expiredConnId,
              duration: '1h',
              expiresAt: new Date(Date.now() - 3600000).toISOString(),
              createdAt: new Date(Date.now() - 7200000).toISOString(),
            });

            const result = await service.getMutedConnections(userId);
            const mutedIds = result.items.map((p) => p._id);

            expect(mutedIds).toContain(activeConnId);
            expect(mutedIds).not.toContain(expiredConnId);
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 36: Mutual Connection Calculation
  // =========================================================================

  describe('Property 36: Mutual Connection Calculation', () => {
    /**
     * Mutual connections between A and B equals the intersection of
     * A's follows and B's follows. The count matches the actual list length.
     *
     * **Validates: Requirements 28.1, 28.2**
     */

    it('mutual connections equal intersection of follows', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          fc.array(userIdArb, { minLength: 0, maxLength: 5 }),
          fc.array(userIdArb, { minLength: 0, maxLength: 5 }),
          fc.array(userIdArb, { minLength: 1, maxLength: 3 }),
          async (userA, userB, onlyAFollows, onlyBFollows, bothFollow) => {
            if (userA === userB) return;

            // Deduplicate ensuring no overlap with userA/userB
            const allIds = new Set([userA, userB]);
            const cleanBoth = [...new Set(bothFollow)].filter(
              (id) => !allIds.has(id),
            );
            cleanBoth.forEach((id) => allIds.add(id));
            const cleanOnlyA = [...new Set(onlyAFollows)].filter(
              (id) => !allIds.has(id),
            );
            cleanOnlyA.forEach((id) => allIds.add(id));
            const cleanOnlyB = [...new Set(onlyBFollows)].filter(
              (id) => !allIds.has(id),
            );

            seedUserProfile(mockApp, userA);
            seedUserProfile(mockApp, userB);
            for (const id of [...cleanBoth, ...cleanOnlyA, ...cleanOnlyB]) {
              seedUserProfile(mockApp, id);
            }

            // A follows: cleanBoth + cleanOnlyA
            for (const id of [...cleanBoth, ...cleanOnlyA]) {
              seedFollow(mockApp, userA, id);
            }
            // B follows: cleanBoth + cleanOnlyB
            for (const id of [...cleanBoth, ...cleanOnlyB]) {
              seedFollow(mockApp, userB, id);
            }

            const mutualResult = await service.getMutualConnections(
              userA,
              userB,
              { limit: 100 },
            );
            const mutualCount = await service.getMutualConnectionCount(
              userA,
              userB,
            );

            const mutualIds = new Set(mutualResult.items.map((p) => p._id));
            expect(mutualIds.size).toBe(cleanBoth.length);
            for (const id of cleanBoth) {
              expect(mutualIds.has(id)).toBe(true);
            }
            expect(mutualCount).toBe(cleanBoth.length);
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 37: Hub Content Visibility
  // =========================================================================

  describe('Property 37: Hub Content Visibility', () => {
    /**
     * Hub members can be added and retrieved. Member count stays
     * consistent with actual members. Cannot exceed MAX_MEMBERS_PER_HUB.
     *
     * **Validates: Requirements 30.3, 30.4, 30.5, 30.7**
     */

    it('hub memberCount matches actual member records', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,14}$/),
          fc.array(userIdArb, { minLength: 1, maxLength: 5 }),
          async (ownerId, hubName, memberIds) => {
            const uniqueMembers = [...new Set(memberIds)].filter(
              (id) => id !== ownerId,
            );
            if (uniqueMembers.length === 0) return;

            seedUserProfile(mockApp, ownerId);
            for (const id of uniqueMembers) {
              seedUserProfile(mockApp, id);
            }

            const hub = await service.createHub(ownerId, hubName);
            await service.addToHub(hub._id, ownerId, uniqueMembers);

            const hubsData = getCollectionData(mockApp, 'brighthub_hubs');
            const hubRecord = hubsData.find((r: any) => r._id === hub._id);
            const hubMembersData = getCollectionData(
              mockApp,
              'brighthub_hub_members',
            );
            const actualMembers = hubMembersData.filter(
              (r: any) => r.hubId === hub._id,
            );

            expect(hubRecord!.memberCount).toBe(actualMembers.length);
            expect(hubRecord!.memberCount).toBe(uniqueMembers.length + 1); // +1 for auto-joined owner

            // Remove one member
            await service.removeFromHub(hub._id, ownerId, [uniqueMembers[0]]);

            const hubAfter = hubsData.find((r: any) => r._id === hub._id);
            const membersAfter = hubMembersData.filter(
              (r: any) => r.hubId === hub._id,
            );

            expect(hubAfter!.memberCount).toBe(membersAfter.length);
            expect(hubAfter!.memberCount).toBe(uniqueMembers.length); // -1 removed + 1 owner
          },
        ),
        { numRuns: 15 },
      );
    });

    it('adding duplicate members to hub does not increase count', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (ownerId, memberId) => {
          if (ownerId === memberId) return;

          seedUserProfile(mockApp, ownerId);
          seedUserProfile(mockApp, memberId);

          const hub = await service.createHub(ownerId, 'TestHub');
          await service.addToHub(hub._id, ownerId, [memberId]);
          await service.addToHub(hub._id, ownerId, [memberId]);

          const hubsData = getCollectionData(mockApp, 'brighthub_hubs');
          const hubRecord = hubsData.find((r: any) => r._id === hub._id);
          const hubMembersData = getCollectionData(
            mockApp,
            'brighthub_hub_members',
          );
          const actualMembers = hubMembersData.filter(
            (r: any) => r.hubId === hub._id,
          );

          expect(hubRecord!.memberCount).toBe(2);
          expect(actualMembers.length).toBe(2);
        }),
        { numRuns: 15 },
      );
    });
  });

  // =========================================================================
  // Property 38: Block Inheritance on Lists
  // =========================================================================

  describe('Property 38: Block Inheritance on Lists', () => {
    /**
     * When removeBlockedUserFromLists() is called, the blocked user is
     * removed from ALL lists owned by the blocker.
     *
     * **Validates: Requirements 32.1, 32.2, 32.3**
     */

    it('blocked user is removed from all lists owned by blocker', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          fc.array(listNameArb, { minLength: 1, maxLength: 3 }),
          async (ownerId, blockedUserId, listNames) => {
            if (ownerId === blockedUserId) return;
            const uniqueNames = [...new Set(listNames)];
            if (uniqueNames.length === 0) return;

            seedUserProfile(mockApp, ownerId);
            seedUserProfile(mockApp, blockedUserId);

            const listIds: string[] = [];
            for (const name of uniqueNames) {
              const list = await service.createList(ownerId, name);
              await service.addMembersToList(list._id, ownerId, [
                blockedUserId,
              ]);
              listIds.push(list._id);
            }

            // Verify blocked user is in all lists
            const membersData = getCollectionData(
              mockApp,
              'brighthub_connection_list_members',
            );
            for (const listId of listIds) {
              const members = membersData.filter(
                (r: any) => r.listId === listId && r.userId === blockedUserId,
              );
              expect(members.length).toBe(1);
            }

            // Remove blocked user from all lists
            await service.removeBlockedUserFromLists(ownerId, blockedUserId);

            // Verify blocked user is removed from ALL lists
            for (const listId of listIds) {
              const membersAfter = membersData.filter(
                (r: any) => r.listId === listId && r.userId === blockedUserId,
              );
              expect(membersAfter.length).toBe(0);
            }

            // Verify member counts were decremented
            const listsData = getCollectionData(
              mockApp,
              'brighthub_connection_lists',
            );
            for (const listId of listIds) {
              const listRecord = listsData.find((r: any) => r._id === listId);
              expect(listRecord!.memberCount).toBe(0);
            }
          },
        ),
        { numRuns: 15 },
      );
    });
  });
});
