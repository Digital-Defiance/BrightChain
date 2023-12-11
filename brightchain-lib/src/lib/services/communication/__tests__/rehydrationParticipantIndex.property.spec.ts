/**
 * Property-based test for ConversationService — Property 5: Participant index completeness.
 *
 * Feature: brightchat-persistence-rehydration, Property 5: Participant index completeness
 *
 * **Validates: Requirements 2.3, 9.2**
 *
 * For any set of persisted conversations, after rehydration the participant index
 * contains an entry for each conversation mapping the sorted participant pair key
 * to the conversation ID, and the index size equals the number of loaded conversations.
 *
 * Generator strategy: Generate arrays of 0–10 IConversation objects with unique IDs
 * and unique participant pairs via arbConversation, seed them into a
 * MockChatStorageProvider, construct a ConversationService with that provider,
 * call init(), then verify the participant index is complete by checking that
 * createOrGetConversation returns the existing conversation for each participant
 * pair (proving the index entry exists) and that no new conversations are created
 * (proving the index size equals the conversation count).
 */

import fc from 'fast-check';
import { ConversationService } from '../conversationService';
import {
  MockChatStorageProvider,
  arbConversation,
} from './mockChatStorageProvider';

describe('Feature: brightchat-persistence-rehydration, Property 5: Participant index completeness', () => {
  /**
   * Property 5: Participant index completeness
   *
   * **Validates: Requirements 2.3, 9.2**
   */
  it('should rebuild participant index with an entry for each conversation after rehydration', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(arbConversation, { minLength: 0, maxLength: 10 })
          .map((convos) => {
            // Ensure unique IDs
            const seenIds = new Set<string>();
            // Ensure unique participant pairs (sorted key)
            const seenPairs = new Set<string>();
            return convos.filter((c) => {
              if (seenIds.has(c.id)) return false;
              const pairKey =
                c.participants[0] < c.participants[1]
                  ? `${c.participants[0]}:${c.participants[1]}`
                  : `${c.participants[1]}:${c.participants[0]}`;
              if (seenPairs.has(pairKey)) return false;
              seenIds.add(c.id);
              seenPairs.add(pairKey);
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

          // Verify participant index completeness:
          // For each conversation, createOrGetConversation should return the
          // SAME conversation (by ID), proving the participant index has the entry.
          for (const conversation of conversations) {
            const [memberA, memberB] = conversation.participants;
            const result = await service.createOrGetConversation(
              memberA,
              memberB,
            );
            expect(result.id).toBe(conversation.id);

            // Also verify with reversed participant order
            const resultReversed = await service.createOrGetConversation(
              memberB,
              memberA,
            );
            expect(resultReversed.id).toBe(conversation.id);
          }

          // Verify index size equals conversation count:
          // If the index were incomplete, createOrGetConversation would have
          // created new conversations, increasing the total count.
          // Collect all conversation IDs via listAllConversationsForMember.
          const allParticipantIds = new Set<string>();
          for (const c of conversations) {
            allParticipantIds.add(c.participants[0]);
            allParticipantIds.add(c.participants[1]);
          }
          const allRehydratedIds = new Set<string>();
          for (const memberId of allParticipantIds) {
            const memberConvos =
              service.listAllConversationsForMember(memberId);
            for (const mc of memberConvos) {
              allRehydratedIds.add(mc.id);
            }
          }
          // The total number of unique conversations should equal the input count
          // (no extra conversations were created by createOrGetConversation)
          expect(allRehydratedIds.size).toBe(conversations.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
