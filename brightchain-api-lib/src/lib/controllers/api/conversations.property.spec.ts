/**
 * Property tests for ConversationService / DirectMessageController.
 *
 * Feature: communication-api-controllers
 *
 * Property 1: Direct message encryption round trip
 * Property 2: Conversation inbox ordering
 * Property 3: Conversation messages chronological ordering
 * Property 4: Non-deliverable recipient error uniformity
 */

import {
  ConversationService,
  RecipientNotReachableError,
} from '@brightchain/brightchain-lib/lib/services/communication/conversationService';
import * as fc from 'fast-check';

// --- arbitraries ---

const arbMemberId = fc.uuid();
const arbContent = fc.string({ minLength: 1, maxLength: 200 });

// --- helpers ---

function createServiceWithMembers(...memberIds: string[]): ConversationService {
  const service = new ConversationService();
  for (const id of memberIds) {
    service.registerMember(id);
  }
  return service;
}

// ─── Property 1: Direct message encryption round trip ───────────────────────

describe('ConversationService – Property 1: Direct message encryption round trip', () => {
  /**
   * **Validates: Requirements 1.1**
   *
   * For any valid sender-recipient pair and any message content,
   * sending a direct message then retrieving it as the recipient
   * SHALL produce the original content.
   */
  it('sent message content is retrievable by recipient', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        arbContent,
        async (senderId, recipientId, content) => {
          fc.pre(senderId !== recipientId);

          const service = createServiceWithMembers(senderId, recipientId);
          const sent = await service.sendMessage(
            senderId,
            recipientId,
            content,
          );

          // Retrieve as recipient
          const conversation = service.getConversation(sent.contextId);
          expect(conversation).toBeDefined();

          const result = await service.getMessages(sent.contextId, recipientId);
          const found = result.items.find((m) => m.id === sent.id);
          expect(found).toBeDefined();
          expect(found!.encryptedContent).toBe(content);
          expect(found!.senderId).toBe(senderId);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 2: Conversation inbox ordering ────────────────────────────────

describe('ConversationService – Property 2: Conversation inbox ordering', () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any Member with multiple Conversations, querying the inbox
   * SHALL return Conversations sorted by lastMessageAt in descending order.
   */
  it('inbox is sorted by lastMessageAt descending', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        fc.array(arbMemberId, { minLength: 2, maxLength: 6 }),
        async (memberId, otherIds) => {
          // Ensure all IDs are unique and different from memberId
          const uniqueOthers = [
            ...new Set(otherIds.filter((id) => id !== memberId)),
          ];
          fc.pre(uniqueOthers.length >= 2);

          const service = createServiceWithMembers(memberId, ...uniqueOthers);

          // Send messages to create conversations with staggered timestamps
          for (const otherId of uniqueOthers) {
            await service.sendMessage(memberId, otherId, 'hello');
          }

          const result = await service.listConversations(memberId);

          // Verify descending order by lastMessageAt
          for (let i = 0; i < result.items.length - 1; i++) {
            expect(
              result.items[i].lastMessageAt.getTime(),
            ).toBeGreaterThanOrEqual(
              result.items[i + 1].lastMessageAt.getTime(),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Conversation messages chronological ordering ────────────────

describe('ConversationService – Property 3: Conversation messages chronological ordering', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * For any Conversation with multiple messages, querying messages
   * SHALL return them in chronological order.
   */
  it('messages are in chronological order', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        fc.array(arbContent, { minLength: 2, maxLength: 10 }),
        async (senderId, recipientId, contents) => {
          fc.pre(senderId !== recipientId);

          const service = createServiceWithMembers(senderId, recipientId);

          // Send multiple messages
          let conversationId: string | undefined;
          for (const content of contents) {
            const msg = await service.sendMessage(
              senderId,
              recipientId,
              content,
              conversationId,
            );
            conversationId = msg.contextId;
          }

          const result = await service.getMessages(conversationId!, senderId);

          // Verify chronological order
          for (let i = 0; i < result.items.length - 1; i++) {
            expect(result.items[i].createdAt.getTime()).toBeLessThanOrEqual(
              result.items[i + 1].createdAt.getTime(),
            );
          }

          // Verify all messages are present
          expect(result.items.length).toBe(contents.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 4: Non-deliverable recipient error uniformity ──────────────────

describe('ConversationService – Property 4: Non-deliverable recipient error uniformity', () => {
  /**
   * **Validates: Requirements 1.5**
   *
   * For any message send attempt to a non-existent Member or a Member
   * who has blocked the sender, the error response SHALL be identical
   * in structure and message.
   */
  it('non-existent and blocked recipients produce identical errors', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbMemberId,
        arbMemberId,
        arbContent,
        async (senderId, nonExistentId, blockerId, content) => {
          fc.pre(senderId !== nonExistentId);
          fc.pre(senderId !== blockerId);
          fc.pre(nonExistentId !== blockerId);

          // Service where nonExistentId is NOT registered
          const service = createServiceWithMembers(senderId, blockerId);
          service.blockMember(blockerId, senderId); // blockerId blocks senderId

          let nonExistentError: Error | null = null;
          let blockedError: Error | null = null;

          try {
            await service.sendMessage(senderId, nonExistentId, content);
          } catch (e) {
            nonExistentError = e as Error;
          }

          try {
            await service.sendMessage(senderId, blockerId, content);
          } catch (e) {
            blockedError = e as Error;
          }

          // Both must throw
          expect(nonExistentError).toBeInstanceOf(RecipientNotReachableError);
          expect(blockedError).toBeInstanceOf(RecipientNotReachableError);

          // Error messages must be identical
          expect(nonExistentError!.message).toBe(blockedError!.message);
          expect(nonExistentError!.name).toBe(blockedError!.name);
        },
      ),
      { numRuns: 100 },
    );
  });
});
