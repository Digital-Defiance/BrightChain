/**
 * Property tests for conversation promotion to group.
 *
 * Feature: communication-api-controllers
 *
 * Property 5: Conversation promotion preserves participants
 * Property 6: Conversation promotion preserves message history
 * Property 7: Promotion re-encrypts keys for all members
 */

import { ConversationService } from '@brightchain/brightchain-lib/lib/services/communication/conversationService';
import {
  GroupService,
  extractKeyFromDefault,
} from '@brightchain/brightchain-lib/lib/services/communication/groupService';
import { PermissionService } from '@brightchain/brightchain-lib/lib/services/communication/permissionService';
import * as fc from 'fast-check';
import { wireConversationPromotion } from '../../services/wireConversationPromotion';

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

// --- helpers ---

function createWiredServices(): {
  conversationService: ConversationService;
  groupService: GroupService;
  permissionService: PermissionService;
} {
  const permissionService = new PermissionService();
  const groupService = new GroupService(permissionService);
  const conversationService = new ConversationService();
  wireConversationPromotion(conversationService, groupService);
  return { conversationService, groupService, permissionService };
}

// ─── Property 5: Conversation promotion preserves participants ──────────────

describe('ConversationPromotion – Property 5: Conversation promotion preserves participants', () => {
  /**
   * **Validates: Requirements 2.1**
   *
   * For any Conversation between Members A and B, and any set of new Members
   * to add, promoting the Conversation to a Group SHALL produce a Group whose
   * member list is exactly the union of {A, B} and the new Members.
   */
  it('promoted group contains exactly the union of original participants and new members', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        fc.array(arbMemberId, { minLength: 1, maxLength: 5 }),
        async (memberA, memberB, newMemberIds) => {
          fc.pre(memberA !== memberB);
          const uniqueNew = [
            ...new Set(
              newMemberIds.filter((id) => id !== memberA && id !== memberB),
            ),
          ];
          fc.pre(uniqueNew.length >= 1);

          const { conversationService } = createWiredServices();
          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);
          for (const id of uniqueNew) {
            conversationService.registerMember(id);
          }

          // Create a conversation by sending a message
          const msg = await conversationService.sendMessage(
            memberA,
            memberB,
            'hello',
          );

          // Promote to group
          const group = await conversationService.promoteToGroup(
            msg.contextId,
            uniqueNew,
            memberA,
          );

          // Expected members: union of {A, B} and uniqueNew
          const expectedMembers = new Set([memberA, memberB, ...uniqueNew]);
          const actualMembers = new Set(group.members.map((m) => m.memberId));

          expect(actualMembers.size).toBe(expectedMembers.size);
          for (const id of expectedMembers) {
            expect(actualMembers.has(id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: Conversation promotion preserves message history ───────────

describe('ConversationPromotion – Property 6: Conversation promotion preserves message history', () => {
  /**
   * **Validates: Requirements 2.2**
   *
   * For any Conversation with N messages, promoting it to a Group SHALL
   * result in the Group containing at least N messages, and the content
   * of each original message SHALL be retrievable from the Group.
   */
  it('promoted group contains all original conversation messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        fc.array(arbMemberId, { minLength: 1, maxLength: 3 }),
        fc.array(fc.string({ minLength: 1, maxLength: 100 }), {
          minLength: 1,
          maxLength: 5,
        }),
        async (memberA, memberB, newMemberIds, contents) => {
          fc.pre(memberA !== memberB);
          const uniqueNew = [
            ...new Set(
              newMemberIds.filter((id) => id !== memberA && id !== memberB),
            ),
          ];
          fc.pre(uniqueNew.length >= 1);

          const { conversationService, groupService } = createWiredServices();
          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);
          for (const id of uniqueNew) {
            conversationService.registerMember(id);
          }

          // Send messages in the conversation
          let conversationId: string | undefined;
          for (const content of contents) {
            const msg = await conversationService.sendMessage(
              memberA,
              memberB,
              content,
              conversationId,
            );
            conversationId = msg.contextId;
          }

          // Promote to group
          const group = await conversationService.promoteToGroup(
            conversationId!,
            uniqueNew,
            memberA,
          );

          // Retrieve messages from the group
          const groupMessages = groupService.getAllMessages(group.id);

          // Group must contain at least N messages
          expect(groupMessages.length).toBeGreaterThanOrEqual(contents.length);

          // Every original message content must be present in the group
          const groupContents = groupMessages.map((m) => m.encryptedContent);
          for (const content of contents) {
            expect(groupContents).toContain(content);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: Promotion re-encrypts keys for all members ────────────────

describe('ConversationPromotion – Property 7: Promotion re-encrypts keys for all members', () => {
  /**
   * **Validates: Requirements 2.3**
   *
   * For any Conversation promotion adding K new members, the resulting
   * Group's encryptedSharedKey map SHALL contain an entry for every member
   * (original + new), and each entry SHALL be decryptable by the
   * corresponding member's private key (simulated via extractKeyFromDefault).
   */
  it('promoted group has encrypted key entries for all members that decrypt to the same key', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        fc.array(arbMemberId, { minLength: 1, maxLength: 5 }),
        async (memberA, memberB, newMemberIds) => {
          fc.pre(memberA !== memberB);
          const uniqueNew = [
            ...new Set(
              newMemberIds.filter((id) => id !== memberA && id !== memberB),
            ),
          ];
          fc.pre(uniqueNew.length >= 1);

          const { conversationService } = createWiredServices();
          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);
          for (const id of uniqueNew) {
            conversationService.registerMember(id);
          }

          // Create a conversation
          const msg = await conversationService.sendMessage(
            memberA,
            memberB,
            'hello',
          );

          // Promote to group
          const group = await conversationService.promoteToGroup(
            msg.contextId,
            uniqueNew,
            memberA,
          );

          const allMemberIds = [memberA, memberB, ...uniqueNew];

          // encryptedSharedKey has an entry for every member
          expect(group.encryptedSharedKey.size).toBe(allMemberIds.length);
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
        },
      ),
      { numRuns: 100 },
    );
  });
});
