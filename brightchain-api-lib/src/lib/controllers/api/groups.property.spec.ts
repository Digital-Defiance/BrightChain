/**
 * Property tests for GroupService / GroupController.
 *
 * Feature: communication-api-controllers
 *
 * Property 8: Group creation generates per-member encrypted keys
 * Property 9: Group message delivery to all members
 * Property 10: Key rotation on member departure
 * Property 11: Group metadata completeness
 */

import { DefaultRole } from '@brightchain/brightchain-lib';
import {
  GroupService,
  extractKeyFromDefault,
} from '@brightchain/brightchain-lib/lib/services/communication/groupService';
import { PermissionService } from '@brightchain/brightchain-lib/lib/services/communication/permissionService';
import * as fc from 'fast-check';

/** Compare two Uint8Arrays for equality (Uint8Array has no .equals method). */
function uint8ArrayEquals(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// --- arbitraries ---

const arbMemberId = fc.uuid();
const arbGroupName = fc.string({ minLength: 1, maxLength: 50 });
const arbContent = fc.string({ minLength: 1, maxLength: 200 });

// --- helpers ---

function createServices(): {
  groupService: GroupService;
  permissionService: PermissionService;
} {
  const permissionService = new PermissionService();
  const groupService = new GroupService(permissionService);
  return { groupService, permissionService };
}

// ─── Property 8: Group creation generates per-member encrypted keys ─────────

describe('GroupService – Property 8: Group creation generates per-member encrypted keys', () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * For any Group created with N members, the Group's encryptedSharedKey
   * map SHALL contain exactly N entries, one per member, and all entries
   * SHALL decrypt to the same symmetric key.
   */
  it('group has one encrypted key entry per member, all decrypting to the same key', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        fc.array(arbMemberId, { minLength: 1, maxLength: 5 }),
        arbGroupName,
        async (creatorId, otherIds, name) => {
          const uniqueOthers = [
            ...new Set(otherIds.filter((id) => id !== creatorId)),
          ];
          fc.pre(uniqueOthers.length >= 1);

          const { groupService } = createServices();
          const group = await groupService.createGroup(
            name,
            creatorId,
            uniqueOthers,
          );

          const allMemberIds = [creatorId, ...uniqueOthers];

          // encryptedSharedKey has exactly N entries
          expect(group.encryptedSharedKey.size).toBe(allMemberIds.length);

          // Every member has an entry
          for (const id of allMemberIds) {
            expect(group.encryptedSharedKey.has(id)).toBe(true);
          }

          // All entries decrypt to the same symmetric key
          const keys = allMemberIds.map((id) =>
            extractKeyFromDefault(group.encryptedSharedKey.get(id)!),
          );
          for (let i = 1; i < keys.length; i++) {
            expect(uint8ArrayEquals(keys[i], keys[0])).toBe(true);
          }

          // Creator has OWNER role
          const creator = group.members.find((m) => m.memberId === creatorId);
          expect(creator?.role).toBe(DefaultRole.OWNER);

          // Others have MEMBER role
          for (const id of uniqueOthers) {
            const member = group.members.find((m) => m.memberId === id);
            expect(member?.role).toBe(DefaultRole.MEMBER);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 9: Group message delivery to all members ──────────────────────

describe('GroupService – Property 9: Group message delivery to all members', () => {
  /**
   * **Validates: Requirements 3.2**
   *
   * For any Group with N members and any message sent to the Group,
   * every member SHALL be able to retrieve and decrypt the message.
   */
  it('every member can retrieve a sent message', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        fc.array(arbMemberId, { minLength: 1, maxLength: 5 }),
        arbGroupName,
        arbContent,
        async (creatorId, otherIds, name, content) => {
          const uniqueOthers = [
            ...new Set(otherIds.filter((id) => id !== creatorId)),
          ];
          fc.pre(uniqueOthers.length >= 1);

          const { groupService } = createServices();
          const group = await groupService.createGroup(
            name,
            creatorId,
            uniqueOthers,
          );

          // Creator sends a message
          const sent = await groupService.sendMessage(
            group.id,
            creatorId,
            content,
          );

          // Every member can retrieve the message
          const allMemberIds = [creatorId, ...uniqueOthers];
          for (const memberId of allMemberIds) {
            const result = await groupService.getMessages(group.id, memberId);
            const found = result.items.find((m) => m.id === sent.id);
            expect(found).toBeDefined();
            expect(found!.encryptedContent).toBe(content);
            expect(found!.senderId).toBe(creatorId);
            expect(found!.contextType).toBe('group');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 10: Key rotation on member departure ──────────────────────────

describe('GroupService – Property 10: Key rotation on member departure', () => {
  /**
   * **Validates: Requirements 3.4, 3.5, 6.5**
   *
   * For any Group, when a member is removed (by admin or voluntarily),
   * the shared key SHALL be rotated — the new key SHALL differ from the
   * previous key, and all remaining members SHALL have a valid encrypted
   * copy of the new key.
   */
  it('key rotates on member removal and all remaining members get the new key', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        fc.array(arbMemberId, { minLength: 2, maxLength: 5 }),
        arbGroupName,
        async (creatorId, otherIds, name) => {
          const uniqueOthers = [
            ...new Set(otherIds.filter((id) => id !== creatorId)),
          ];
          fc.pre(uniqueOthers.length >= 2);

          const { groupService } = createServices();
          const group = await groupService.createGroup(
            name,
            creatorId,
            uniqueOthers,
          );

          const keyBefore = groupService.getSymmetricKey(group.id)!;
          const targetId = uniqueOthers[0];

          // Owner removes a member
          await groupService.removeMember(group.id, creatorId, targetId);
          const keyAfter = groupService.getSymmetricKey(group.id)!;
          const updatedGroup = groupService.getGroupById(group.id)!;

          // Key must have rotated
          expect(uint8ArrayEquals(keyAfter, keyBefore)).toBe(false);

          // Removed member has no key entry
          expect(updatedGroup.encryptedSharedKey.has(targetId)).toBe(false);

          // All remaining members have a valid key entry
          const remainingIds = [
            creatorId,
            ...uniqueOthers.filter((id) => id !== targetId),
          ];
          expect(updatedGroup.encryptedSharedKey.size).toBe(
            remainingIds.length,
          );
          for (const id of remainingIds) {
            expect(updatedGroup.encryptedSharedKey.has(id)).toBe(true);
            const decrypted = extractKeyFromDefault(
              updatedGroup.encryptedSharedKey.get(id)!,
            );
            expect(uint8ArrayEquals(decrypted, keyAfter)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('key rotates on voluntary leave', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        fc.array(arbMemberId, { minLength: 2, maxLength: 5 }),
        arbGroupName,
        async (creatorId, otherIds, name) => {
          const uniqueOthers = [
            ...new Set(otherIds.filter((id) => id !== creatorId)),
          ];
          fc.pre(uniqueOthers.length >= 2);

          const { groupService } = createServices();
          const group = await groupService.createGroup(
            name,
            creatorId,
            uniqueOthers,
          );

          const keyBefore = groupService.getSymmetricKey(group.id)!;
          const leaverId = uniqueOthers[0];
          // Member leaves voluntarily
          await groupService.leaveGroup(group.id, leaverId);

          const keyAfter = groupService.getSymmetricKey(group.id)!;
          const updatedGroup = groupService.getGroupById(group.id)!;

          // Key must have rotated
          expect(uint8ArrayEquals(keyAfter, keyBefore)).toBe(false);

          // Leaver has no key entry
          expect(updatedGroup.encryptedSharedKey.has(leaverId)).toBe(false);

          // Remaining members have valid key entries
          const remainingIds = [
            creatorId,
            ...uniqueOthers.filter((id) => id !== leaverId),
          ];
          for (const id of remainingIds) {
            const decrypted = extractKeyFromDefault(
              updatedGroup.encryptedSharedKey.get(id)!,
            );
            expect(uint8ArrayEquals(decrypted, keyAfter)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 11: Group metadata completeness ───────────────────────────────

describe('GroupService – Property 11: Group metadata completeness', () => {
  /**
   * **Validates: Requirements 3.6**
   *
   * For any Group and any member of that Group, querying metadata SHALL
   * return a response containing the Group name, the full member list,
   * and the requesting member's Role.
   */
  it('metadata contains name, member list, and requester role', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        fc.array(arbMemberId, { minLength: 1, maxLength: 5 }),
        arbGroupName,
        async (creatorId, otherIds, name) => {
          const uniqueOthers = [
            ...new Set(otherIds.filter((id) => id !== creatorId)),
          ];
          fc.pre(uniqueOthers.length >= 1);

          const { groupService } = createServices();
          const group = await groupService.createGroup(
            name,
            creatorId,
            uniqueOthers,
          );

          const allMemberIds = [creatorId, ...uniqueOthers];

          // Every member can query metadata and see complete info
          for (const memberId of allMemberIds) {
            const metadata = await groupService.getGroup(group.id, memberId);

            // Name is present
            expect(metadata.name).toBe(name);

            // Full member list is present
            expect(metadata.members.length).toBe(allMemberIds.length);
            for (const id of allMemberIds) {
              expect(metadata.members.some((m) => m.memberId === id)).toBe(
                true,
              );
            }

            // Requesting member's role is present
            const self = metadata.members.find((m) => m.memberId === memberId);
            expect(self).toBeDefined();
            expect(self!.role).toBeDefined();
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
