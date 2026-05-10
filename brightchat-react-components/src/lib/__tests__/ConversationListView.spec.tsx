/**
 * Property-based test for ConversationListView sorting logic.
 *
 * Property 4: Conversations sorted by most recent activity
 * Tests the pure sorting logic used by ConversationListView to order
 * conversations by lastMessageAt descending.
 *
 * Feature: brightchat-frontend, Property 4: Conversations sorted by most recent activity
 */

jest.mock('@brightchain/brightchain-lib', () => ({}));

import fc from 'fast-check';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * The exact sorting logic extracted from ConversationListView.
 * Sorts conversations by lastMessageAt descending (most recent first).
 */
function sortConversationsByLastMessageAt<
  T extends { lastMessageAt: Date | string },
>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.lastMessageAt).getTime();
    const bTime = new Date(b.lastMessageAt).getTime();
    return bTime - aTime;
  });
}

/**
 * Arbitrary that generates a conversation-like object with the fields
 * relevant to sorting: id, participants, lastMessageAt, createdAt,
 * and an optional lastMessagePreview.
 */
/**
 * Generate a valid (non-NaN) Date from an integer timestamp range.
 * Using fc.integer avoids the NaN dates that fc.date can produce.
 */
const validDateArb = fc
  .integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  })
  .map((ms) => new Date(ms));

const conversationArb = fc.record({
  id: fc.uuid(),
  participants: fc.tuple(fc.uuid(), fc.uuid()) as fc.Arbitrary<
    [string, string]
  >,
  lastMessageAt: validDateArb,
  lastMessagePreview: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
    nil: undefined,
  }),
  createdAt: validDateArb,
});

/**
 * Arbitrary that generates an array of conversations with distinct
 * lastMessageAt timestamps (no two conversations share the same ms value).
 */
const distinctConversationsArb = fc
  .array(conversationArb, { minLength: 2, maxLength: 30 })
  .filter((conversations) => {
    const times = conversations.map((c) => c.lastMessageAt.getTime());
    return new Set(times).size === times.length;
  });

// ─── Property 4: Conversations sorted by most recent activity ───────────────

describe('Feature: brightchat-frontend, Property 4: Conversations sorted by most recent activity', () => {
  /**
   * **Validates: Requirements 3.1**
   *
   * For any list of IConversation-like objects with distinct lastMessageAt
   * timestamps, sorting them the same way ConversationListView does should
   * produce a list in strictly descending order of lastMessageAt.
   */
  it('should sort conversations in descending order of lastMessageAt for any input', () => {
    fc.assert(
      fc.property(distinctConversationsArb, (conversations) => {
        const sorted = sortConversationsByLastMessageAt(conversations);

        // Verify descending order: each item's lastMessageAt >= next item's
        for (let i = 0; i < sorted.length - 1; i++) {
          const currentTime = new Date(sorted[i].lastMessageAt).getTime();
          const nextTime = new Date(sorted[i + 1].lastMessageAt).getTime();
          expect(currentTime).toBeGreaterThan(nextTime);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.1**
   *
   * Sorting should preserve all original conversations (no items lost or duplicated).
   */
  it('should preserve all conversations after sorting (no items lost or added)', () => {
    fc.assert(
      fc.property(distinctConversationsArb, (conversations) => {
        const sorted = sortConversationsByLastMessageAt(conversations);

        expect(sorted.length).toBe(conversations.length);

        const originalIds = new Set(conversations.map((c) => c.id));
        const sortedIds = new Set(sorted.map((c) => c.id));
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 100 },
    );
  });
});
