/**
 * Property-based tests for groupAndSortMessages — Property 3: Message chronological ordering.
 *
 * Feature: brightchat-persistence-rehydration, Property 3: Message chronological ordering
 *
 * **Validates: Requirements 2.5, 3.4, 4.6**
 *
 * For any set of persisted messages, after rehydration and grouping by contextId,
 * each message array is sorted by `createdAt` in ascending order — i.e., for
 * consecutive messages m[i] and m[i+1], m[i].createdAt <= m[i+1].createdAt.
 *
 * Generator strategy: arbMessage from mockChatStorageProvider generates
 * ICommunicationMessage with random createdAt dates. We test with both random
 * contextIds and fixed contextIds to exercise ordering within single and
 * multiple groups.
 */

import fc from 'fast-check';
import { groupAndSortMessages } from '../rehydrationHelpers';
import { arbMessage } from './mockChatStorageProvider';
import { ICommunicationMessage } from '../../../interfaces/communication';

/**
 * Helper: filter out messages with invalid (NaN) createdAt dates.
 * Persisted messages always have valid dates, so this constrains the
 * generator to the realistic input space.
 */
const arbValidMessage = (contextId?: string): fc.Arbitrary<ICommunicationMessage> =>
  arbMessage(contextId).filter((m) => !isNaN(m.createdAt.getTime()));

describe('Feature: brightchat-persistence-rehydration, Property 3: Message chronological ordering', () => {
  /**
   * Property 3: Message chronological ordering
   *
   * **Validates: Requirements 2.5, 3.4, 4.6**
   */

  it('each group is sorted by createdAt in ascending order', () => {
    fc.assert(
      fc.property(
        fc.array(arbValidMessage(), { minLength: 0, maxLength: 50 }),
        (messages) => {
          const result = groupAndSortMessages(messages);

          for (const [, group] of result) {
            for (let i = 0; i < group.length - 1; i++) {
              expect(group[i].createdAt.getTime()).toBeLessThanOrEqual(
                group[i + 1].createdAt.getTime(),
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('consecutive messages within a fixed contextId satisfy m[i].createdAt <= m[i+1].createdAt', () => {
    const fixedContextId = 'ctx-fixed-order';

    fc.assert(
      fc.property(
        fc.array(arbValidMessage(fixedContextId), { minLength: 2, maxLength: 50 }),
        (messages) => {
          const result = groupAndSortMessages(messages);
          const group = result.get(fixedContextId)!;

          expect(group).toBeDefined();
          expect(group.length).toBe(messages.length);

          for (let i = 0; i < group.length - 1; i++) {
            expect(group[i].createdAt.getTime()).toBeLessThanOrEqual(
              group[i + 1].createdAt.getTime(),
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ordering holds independently per contextId when multiple groups exist', () => {
    const contextIds = ['ctx-one', 'ctx-two', 'ctx-three'];

    fc.assert(
      fc.property(
        fc.tuple(
          fc.array(arbValidMessage(contextIds[0]), { minLength: 1, maxLength: 15 }),
          fc.array(arbValidMessage(contextIds[1]), { minLength: 1, maxLength: 15 }),
          fc.array(arbValidMessage(contextIds[2]), { minLength: 1, maxLength: 15 }),
        ),
        ([msgsA, msgsB, msgsC]) => {
          const allMessages = [...msgsA, ...msgsB, ...msgsC];
          const result = groupAndSortMessages(allMessages);

          for (const ctxId of contextIds) {
            const group = result.get(ctxId)!;
            expect(group).toBeDefined();

            for (let i = 0; i < group.length - 1; i++) {
              expect(group[i].createdAt.getTime()).toBeLessThanOrEqual(
                group[i + 1].createdAt.getTime(),
              );
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
