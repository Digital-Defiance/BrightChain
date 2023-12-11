/**
 * Property-based tests for groupAndSortMessages — Property 2: Message grouping and count preservation.
 *
 * Feature: brightchat-persistence-rehydration, Property 2: Message grouping and count preservation
 *
 * **Validates: Requirements 2.2, 3.2, 4.2, 9.4**
 *
 * For any set of persisted messages with varying contextId values, after grouping:
 * - Each contextId key in the result Map contains exactly the messages with that contextId
 * - The total count of messages across all Map entries equals the total number of input messages
 * - No messages are lost or duplicated during grouping
 *
 * Generator strategy: arbMessage from mockChatStorageProvider generates
 * ICommunicationMessage with random contextIds. We generate arrays of messages
 * with both random and fixed contextIds to exercise grouping across varying keys.
 */

import fc from 'fast-check';
import { groupAndSortMessages } from '../rehydrationHelpers';
import { arbMessage } from './mockChatStorageProvider';

describe('Feature: brightchat-persistence-rehydration, Property 2: Message grouping and count preservation', () => {
  /**
   * Property 2: Message grouping and count preservation
   *
   * **Validates: Requirements 2.2, 3.2, 4.2, 9.4**
   */

  it('each contextId key contains exactly the messages with that contextId', () => {
    fc.assert(
      fc.property(
        fc.array(arbMessage(), { minLength: 0, maxLength: 50 }),
        (messages) => {
          const result = groupAndSortMessages(messages);

          for (const [contextId, group] of result) {
            for (const msg of group) {
              expect(msg.contextId).toBe(contextId);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('total count of messages across all Map entries equals the input count', () => {
    fc.assert(
      fc.property(
        fc.array(arbMessage(), { minLength: 0, maxLength: 50 }),
        (messages) => {
          const result = groupAndSortMessages(messages);

          let totalCount = 0;
          for (const [, group] of result) {
            totalCount += group.length;
          }

          expect(totalCount).toBe(messages.length);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('no messages are lost or duplicated during grouping', () => {
    fc.assert(
      fc.property(
        fc.array(arbMessage(), { minLength: 1, maxLength: 50 }),
        (messages) => {
          const result = groupAndSortMessages(messages);

          // Collect all message ids from the result
          const resultIds: string[] = [];
          for (const [, group] of result) {
            for (const msg of group) {
              resultIds.push(msg.id);
            }
          }

          // Every input message id must appear in the result
          const inputIds = messages.map((m) => m.id);
          expect(resultIds.sort()).toEqual(inputIds.sort());
        },
      ),
      { numRuns: 100 },
    );
  });

  it('groups messages correctly when multiple contextIds are present', () => {
    const contextIds = ['ctx-alpha', 'ctx-beta', 'ctx-gamma'];

    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(arbMessage(contextIds[0]), { minLength: 1, maxLength: 10 }),
          fc.array(arbMessage(contextIds[1]), { minLength: 1, maxLength: 10 }),
          fc.array(arbMessage(contextIds[2]), { minLength: 1, maxLength: 10 }),
        ),
        ([msgsA, msgsB, msgsC]) => {
          const allMessages = [...msgsA, ...msgsB, ...msgsC];
          const result = groupAndSortMessages(allMessages);

          // Each contextId should be a key in the result
          for (const ctxId of contextIds) {
            expect(result.has(ctxId)).toBe(true);
          }

          // Each group should have the correct count
          expect(result.get(contextIds[0])!.length).toBe(msgsA.length);
          expect(result.get(contextIds[1])!.length).toBe(msgsB.length);
          expect(result.get(contextIds[2])!.length).toBe(msgsC.length);

          // Total should match
          let total = 0;
          for (const [, group] of result) {
            total += group.length;
          }
          expect(total).toBe(allMessages.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
