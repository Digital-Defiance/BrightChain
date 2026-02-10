/**
 * Property-based tests for Conversation Service
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the conversation service
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 10.1**
 */

import fc from 'fast-check';
import { ConversationService } from './conversationService';

/**
 * Arbitrary for non-empty alphanumeric IDs (member IDs)
 */
const idArb = fc.stringMatching(/^[a-zA-Z0-9]{1,36}$/);

/**
 * Arbitrary for non-empty message content
 */
const contentArb = fc.string({ minLength: 1, maxLength: 200 });

describe('Feature: api-lib-to-lib-migration, Property 22: Conversation Service Core Operations', () => {
  /**
   * Property 22: Conversation Service Core Operations
   *
   * *For any* two members, creating a conversation SHALL make it listable
   * for both; sending a message SHALL add it to the conversation's messages.
   *
   * **Validates: Requirements 10.1**
   */

  it('creating a conversation makes it listable for both members', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, idArb, async (baseA, baseB) => {
        const memberA = baseA + '_A';
        const memberB = baseB + '_B';

        const service = new ConversationService();
        service.registerMember(memberA);
        service.registerMember(memberB);

        const conversation = await service.createOrGetConversation(
          memberA,
          memberB,
        );

        // Both members should see the conversation in their list
        const listA = await service.listConversations(memberA);
        const listB = await service.listConversations(memberB);

        const idsA = listA.items.map((c) => c.id);
        const idsB = listB.items.map((c) => c.id);

        expect(idsA).toContain(conversation.id);
        expect(idsB).toContain(conversation.id);
      }),
      { numRuns: 100 },
    );
  });

  it('creating a conversation between the same pair returns the same conversation (idempotent)', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, idArb, async (baseA, baseB) => {
        const memberA = baseA + '_A';
        const memberB = baseB + '_B';

        const service = new ConversationService();
        service.registerMember(memberA);
        service.registerMember(memberB);

        const first = await service.createOrGetConversation(memberA, memberB);
        const second = await service.createOrGetConversation(memberA, memberB);
        // Also test reversed order
        const reversed = await service.createOrGetConversation(
          memberB,
          memberA,
        );

        expect(first.id).toBe(second.id);
        expect(first.id).toBe(reversed.id);
      }),
      { numRuns: 100 },
    );
  });

  it('sending a message adds it to the conversation messages', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        contentArb,
        async (baseA, baseB, content) => {
          const memberA = baseA + '_A';
          const memberB = baseB + '_B';

          const service = new ConversationService();
          service.registerMember(memberA);
          service.registerMember(memberB);

          const conversation = await service.createOrGetConversation(
            memberA,
            memberB,
          );
          const message = await service.sendMessage(
            memberA,
            memberB,
            content,
            conversation.id,
          );

          const allMessages = service.getAllMessages(conversation.id);

          expect(allMessages.some((m) => m.id === message.id)).toBe(true);

          const found = allMessages.find((m) => m.id === message.id);
          expect(found).toBeDefined();
          expect(found?.encryptedContent).toBe(content);
          expect(found?.senderId).toBe(memberA);
          expect(found?.contextId).toBe(conversation.id);
          expect(found?.contextType).toBe('conversation');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sent messages are retrievable via getMessages for both participants', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        contentArb,
        async (baseA, baseB, content) => {
          const memberA = baseA + '_A';
          const memberB = baseB + '_B';

          const service = new ConversationService();
          service.registerMember(memberA);
          service.registerMember(memberB);

          const conversation = await service.createOrGetConversation(
            memberA,
            memberB,
          );
          const message = await service.sendMessage(
            memberA,
            memberB,
            content,
            conversation.id,
          );

          // Both participants can retrieve the message
          const msgsA = await service.getMessages(conversation.id, memberA);
          const msgsB = await service.getMessages(conversation.id, memberB);

          expect(msgsA.items.some((m) => m.id === message.id)).toBe(true);
          expect(msgsB.items.some((m) => m.id === message.id)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('multiple messages accumulate in the conversation in order', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        fc.array(contentArb, { minLength: 1, maxLength: 10 }),
        async (baseA, baseB, contents) => {
          const memberA = baseA + '_A';
          const memberB = baseB + '_B';

          const service = new ConversationService();
          service.registerMember(memberA);
          service.registerMember(memberB);

          const conversation = await service.createOrGetConversation(
            memberA,
            memberB,
          );

          const sentIds: string[] = [];
          for (const content of contents) {
            const msg = await service.sendMessage(
              memberA,
              memberB,
              content,
              conversation.id,
            );
            sentIds.push(msg.id);
          }

          const allMessages = service.getAllMessages(conversation.id);

          // All sent messages should be present
          expect(allMessages.length).toBe(contents.length);

          // Messages should be in the order they were sent
          for (let i = 0; i < sentIds.length; i++) {
            expect(allMessages[i].id).toBe(sentIds[i]);
            expect(allMessages[i].encryptedContent).toBe(contents[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sending a message updates the conversation lastMessageAt', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        contentArb,
        async (baseA, baseB, content) => {
          const memberA = baseA + '_A';
          const memberB = baseB + '_B';

          const service = new ConversationService();
          service.registerMember(memberA);
          service.registerMember(memberB);

          const conversation = await service.createOrGetConversation(
            memberA,
            memberB,
          );
          const initialLastMessageAt = conversation.lastMessageAt;

          await service.sendMessage(memberA, memberB, content, conversation.id);

          const updated = service.getConversation(conversation.id);
          expect(updated).toBeDefined();
          expect(updated!.lastMessageAt.getTime()).toBeGreaterThanOrEqual(
            initialLastMessageAt.getTime(),
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  it('listAllConversationsForMember returns all conversations for a member', async () => {
    await fc.assert(
      fc.asyncProperty(idArb, idArb, idArb, async (baseA, baseB, baseC) => {
        const memberA = baseA + '_A';
        const memberB = baseB + '_B';
        const memberC = baseC + '_C';

        const service = new ConversationService();
        service.registerMember(memberA);
        service.registerMember(memberB);
        service.registerMember(memberC);

        const convAB = await service.createOrGetConversation(memberA, memberB);
        const convAC = await service.createOrGetConversation(memberA, memberC);

        const memberAConvs = service.listAllConversationsForMember(memberA);
        const memberBConvs = service.listAllConversationsForMember(memberB);
        const memberCConvs = service.listAllConversationsForMember(memberC);

        // memberA should see both conversations
        const memberAIds = memberAConvs.map((c) => c.id);
        expect(memberAIds).toContain(convAB.id);
        expect(memberAIds).toContain(convAC.id);

        // memberB should only see convAB
        const memberBIds = memberBConvs.map((c) => c.id);
        expect(memberBIds).toContain(convAB.id);
        expect(memberBIds).not.toContain(convAC.id);

        // memberC should only see convAC
        const memberCIds = memberCConvs.map((c) => c.id);
        expect(memberCIds).toContain(convAC.id);
        expect(memberCIds).not.toContain(convAB.id);
      }),
      { numRuns: 100 },
    );
  });

  it('sendMessage without conversationId auto-creates the conversation', async () => {
    await fc.assert(
      fc.asyncProperty(
        idArb,
        idArb,
        contentArb,
        async (baseA, baseB, content) => {
          const memberA = baseA + '_A';
          const memberB = baseB + '_B';

          const service = new ConversationService();
          service.registerMember(memberA);
          service.registerMember(memberB);

          // Send without explicit conversationId — should auto-create
          const message = await service.sendMessage(memberA, memberB, content);

          // The conversation should now exist and be listable
          const listA = await service.listConversations(memberA);
          expect(listA.items.length).toBe(1);
          expect(listA.items[0].id).toBe(message.contextId);

          // The message should be in the auto-created conversation
          const allMessages = service.getAllMessages(message.contextId);
          expect(allMessages.some((m) => m.id === message.id)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
