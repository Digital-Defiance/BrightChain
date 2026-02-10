/**
 * Property-based tests for ExplodingMessageService.
 *
 * Property 5: Exploding Message Time Expiration
 * Property 8: Exploding Message Read Count
 *
 * Validates: Requirements 8.1, 8.2, 8.3, 8.4
 */

import * as fc from 'fast-check';
import { ICommunicationMessage } from '../../interfaces/communication';
import { ExplodingMessageService } from './explodingMessageService';

// ─── Test helpers ───────────────────────────────────────────────────────────

function createMessage(
  overrides: Partial<ICommunicationMessage> = {},
): ICommunicationMessage {
  return {
    id: 'msg-pbt',
    contextType: 'conversation',
    contextId: 'conv-pbt',
    senderId: 'member-pbt',
    encryptedContent: 'encrypted-content',
    createdAt: new Date(),
    editHistory: [],
    deleted: false,
    pinned: false,
    reactions: [],
    ...overrides,
  };
}

// ─── Property tests ─────────────────────────────────────────────────────────

describe('ExplodingMessageService - Property Tests', () => {
  describe('Property 5: Exploding Message Time Expiration', () => {
    it('messages with past expiresAt are always detected as expired', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 1_000_000 }), (msInPast) => {
          const message = createMessage({
            expiresAt: new Date(Date.now() - msInPast),
          });

          const result = ExplodingMessageService.checkExpiration(message);
          return result === 'time_expired';
        }),
        { numRuns: 50 },
      );
    });

    it('messages with future expiresAt are never detected as expired', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10_000_000 }),
          (msInFuture) => {
            const message = createMessage({
              expiresAt: new Date(Date.now() + msInFuture),
            });

            const result = ExplodingMessageService.checkExpiration(message);
            return result === null;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('remaining time is always non-negative', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1_000_000, max: 10_000_000 }),
          (msOffset) => {
            const message = createMessage({
              expiresAt: new Date(Date.now() + msOffset),
            });

            const remaining = ExplodingMessageService.getRemainingTime(message);
            return remaining !== null && remaining >= 0;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('exploded messages always have 0 remaining time', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10_000_000 }),
          (msInFuture) => {
            const message = createMessage({
              expiresAt: new Date(Date.now() + msInFuture),
              exploded: true,
            });

            const remaining = ExplodingMessageService.getRemainingTime(message);
            return remaining === 0;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 8: Exploding Message Read Count', () => {
    it('read count never exceeds number of unique readers', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.uuid(), { minLength: 1, maxLength: 20 }),
          (readerIds) => {
            const message = createMessage();
            ExplodingMessageService.setExpiration(message, {
              maxReads: readerIds.length + 10,
            });

            for (const readerId of readerIds) {
              ExplodingMessageService.markRead(message, readerId);
            }

            return message.readCount === readerIds.length;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('duplicate reads by same member do not increment count', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.integer({ min: 2, max: 20 }),
          (readerId, repeatCount) => {
            const message = createMessage();
            ExplodingMessageService.setExpiration(message, {
              maxReads: 100,
            });

            for (let i = 0; i < repeatCount; i++) {
              ExplodingMessageService.markRead(message, readerId);
            }

            return message.readCount === 1;
          },
        ),
        { numRuns: 50 },
      );
    });

    it('markRead returns true exactly when readCount reaches maxReads', () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 20 }), (maxReads) => {
          const message = createMessage();
          ExplodingMessageService.setExpiration(message, { maxReads });

          let triggeredAt = -1;
          for (let i = 0; i < maxReads + 5; i++) {
            const readerId = `reader-${i}`;
            const shouldExplode = ExplodingMessageService.markRead(
              message,
              readerId,
            );
            if (shouldExplode && triggeredAt === -1) {
              triggeredAt = i;
            }
          }

          // Should trigger exactly at index maxReads - 1
          return triggeredAt === maxReads - 1;
        }),
        { numRuns: 50 },
      );
    });

    it('remaining reads decreases monotonically with unique readers', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 15 }),
          fc.uniqueArray(fc.uuid(), { minLength: 3, maxLength: 15 }),
          (maxReads, readerIds) => {
            const message = createMessage();
            ExplodingMessageService.setExpiration(message, { maxReads });

            let prevRemaining =
              ExplodingMessageService.getRemainingReads(message)!;

            const readersToUse = readerIds.slice(0, maxReads);
            for (const readerId of readersToUse) {
              ExplodingMessageService.markRead(message, readerId);
              const remaining =
                ExplodingMessageService.getRemainingReads(message)!;
              if (remaining > prevRemaining) return false;
              prevRemaining = remaining;
            }

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
