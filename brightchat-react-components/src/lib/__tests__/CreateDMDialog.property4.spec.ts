/**
 * Property-based test for CreateDMDialog deduplication logic.
 *
 * Property 4: Existing conversation deduplication
 * Tests the pure `findExistingConversation` helper from CreateDMDialog.helpers.ts
 *
 * Feature: brightchat-navigation-ux, Property 4: Existing conversation deduplication
 */

import fc from 'fast-check';
import { findExistingConversation } from '../CreateDMDialog.helpers';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** A conversation with an id and participantIds. */
interface TestConversation {
  id: string;
  participantIds: string[];
}

/** Generate a conversation with 2+ participants. */
const conversationArb = (
  participantPool: fc.Arbitrary<string>,
): fc.Arbitrary<TestConversation> =>
  fc.record({
    id: fc.uuid(),
    participantIds: fc.array(participantPool, { minLength: 1, maxLength: 6 }),
  });

// ─── Property 4: Existing conversation deduplication ────────────────────────

describe('Feature: brightchat-navigation-ux, Property 4: Existing conversation deduplication', () => {
  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * For any list of existing conversations, any currentUserId, and any recipientId:
   * - If a 2-participant conversation exists containing both currentUserId and recipientId,
   *   findExistingConversation returns that conversation's ID.
   * - If no such conversation exists, it returns null.
   */
  it('should return the matching conversation ID when a 2-participant conversation exists with both users', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // currentUserId
        fc.uuid(), // recipientId
        fc.uuid(), // matchingConversationId
        fc.array(
          fc.record({
            id: fc.uuid(),
            participantIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 6 }),
          }),
          { minLength: 0, maxLength: 10 },
        ), // other conversations (random, unlikely to match)
        (currentUserId, recipientId, matchConvId, otherConversations) => {
          // Build a matching conversation: exactly 2 participants
          const matchingConv: TestConversation = {
            id: matchConvId,
            participantIds: [currentUserId, recipientId],
          };

          // Insert the matching conversation at a random position
          const allConversations = [...otherConversations, matchingConv];

          const result = findExistingConversation(
            allConversations,
            currentUserId,
            recipientId,
          );

          // The function uses Array.find, so it returns the first match.
          // Our matching conversation is appended, but there could be an
          // earlier random conversation that also happens to match.
          // Either way, the result must be non-null and must be the ID of
          // a conversation that contains both users with exactly 2 participants.
          expect(result).not.toBeNull();

          const found = allConversations.find((c) => c.id === result);
          expect(found).toBeDefined();
          expect(found!.participantIds).toContain(currentUserId);
          expect(found!.participantIds).toContain(recipientId);
          expect(found!.participantIds.length).toBe(2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return null when no 2-participant conversation exists with both users', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // currentUserId
        fc.uuid(), // recipientId
        fc.array(
          fc.record({
            id: fc.uuid(),
            participantIds: fc.array(fc.uuid(), { minLength: 1, maxLength: 6 }),
          }),
          { minLength: 0, maxLength: 10 },
        ), // random conversations
        (currentUserId, recipientId, conversations) => {
          // Filter out any conversation that accidentally matches
          // (has exactly 2 participants including both currentUserId and recipientId)
          const nonMatchingConversations = conversations.filter(
            (conv) =>
              !(
                conv.participantIds.length === 2 &&
                conv.participantIds.includes(currentUserId) &&
                conv.participantIds.includes(recipientId)
              ),
          );

          const result = findExistingConversation(
            nonMatchingConversations,
            currentUserId,
            recipientId,
          );

          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });
});
