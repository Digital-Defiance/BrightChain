/**
 * Property-based test for ConversationService — Property 1: Entity rehydration completeness (conversation subset).
 *
 * Feature: brightchat-persistence-rehydration, Property 1: Entity rehydration completeness (conversation)
 *
 * **Validates: Requirements 2.1, 9.1**
 *
 * For any set of conversations persisted in storage, after calling init(),
 * the conversations Map contains every conversation keyed by id, and the
 * Map's size equals the number of conversations returned by findMany().
 *
 * Generator strategy: Generate arrays of 0–10 IConversation objects with
 * unique IDs via arbConversation, seed them into a MockChatStorageProvider,
 * construct a ConversationService with that provider, call init(), then
 * verify every conversation is retrievable by ID and the total count matches.
 */

import fc from 'fast-check';
import { ConversationService } from '../conversationService';
import {
  MockChatStorageProvider,
  arbConversation,
} from './mockChatStorageProvider';

describe('Feature: brightchat-persistence-rehydration, Property 1: Entity rehydration completeness (conversation)', () => {
  /**
   * Property 1: Entity rehydration completeness (conversation subset)
   *
   * **Validates: Requirements 2.1, 9.1**
   *
   * For any set of conversations persisted in storage, after calling init(),
   * the conversations Map contains every conversation keyed by id, and the
   * Map's size equals the number of conversations returned by findMany().
   */
  it('should rehydrate every persisted conversation keyed by id with correct count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(arbConversation, { minLength: 0, maxLength: 10 })
          .map((convos) => {
            // Ensure unique IDs by deduplicating on id
            const seen = new Set<string>();
            return convos.filter((c) => {
              if (seen.has(c.id)) return false;
              seen.add(c.id);
              return true;
            });
          }),
        async (conversations) => {
          // Seed conversations into mock storage
          const storageProvider = new MockChatStorageProvider({
            conversations,
          });

          // Construct ConversationService with the mock storage provider
          const service = new ConversationService(
            null, // memberReachabilityCheck
            undefined, // eventEmitter (defaults to NullEventEmitter)
            storageProvider,
          );

          // Rehydrate
          await service.init();

          // Verify every persisted conversation is retrievable by ID
          for (const conversation of conversations) {
            const rehydrated = service.getConversation(conversation.id);
            expect(rehydrated).toBeDefined();
            expect(rehydrated!.id).toBe(conversation.id);
          }

          // Verify the count matches: check that no extra conversations exist
          // by verifying that only the persisted IDs are present.
          // Since conversations map is private, we verify by checking that
          // getConversation returns undefined for a non-existent ID.
          const bogusId = '__nonexistent_id__';
          expect(service.getConversation(bogusId)).toBeUndefined();

          // Verify count by checking each conversation is present and
          // that listing for a member that appears in all conversations
          // returns the expected subset. Instead, we verify completeness
          // by confirming every ID is found (above) and that the total
          // count matches by using a unique member across all conversations.
          // The most direct check: every ID is found, and the service
          // was seeded with exactly `conversations.length` items.
          // We can verify the count indirectly: if we collect all unique
          // participant IDs and list conversations for each, the union
          // of returned conversation IDs should equal the input set.
          const allRehydratedIds = new Set<string>();
          const allParticipantIds = new Set<string>();
          for (const c of conversations) {
            allParticipantIds.add(c.participants[0]);
            allParticipantIds.add(c.participants[1]);
          }
          for (const memberId of allParticipantIds) {
            const memberConvos =
              service.listAllConversationsForMember(memberId);
            for (const mc of memberConvos) {
              allRehydratedIds.add(mc.id);
            }
          }
          expect(allRehydratedIds.size).toBe(conversations.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
