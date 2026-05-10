/**
 * Property-based test for applyKeyRotation helper.
 *
 * Property 4: Key rotation notice is inserted in chronological order
 *
 * Feature: brightchat-encryption-indicators, Property 4: Key rotation notice is inserted in chronological order
 */

import type { ICommunicationMessage } from '@brightchain/brightchain-lib';
import { dateToBrightDate } from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import {
  applyKeyRotation,
  KeyRotationNoticeItem,
  ThreadItem,
} from '../hooks/useChatWebSocket';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract a comparable timestamp string from a ThreadItem. */
function getTimestamp(item: ThreadItem): string {
  if (item.type === 'key_rotation') {
    return item.timestamp;
  }
  const msg = item as ICommunicationMessage;
  // createdAt is BrightDateTimestamp (number) — convert to ISO for string comparison
  const bd = msg.createdAt as unknown as number;
  return new Date(bd * 86400000 + 946728000000).toISOString();
}

/** Check whether an array of ThreadItems is sorted chronologically. */
function isSorted(items: ThreadItem[]): boolean {
  for (let i = 1; i < items.length; i++) {
    if (getTimestamp(items[i - 1]) > getTimestamp(items[i])) {
      return false;
    }
  }
  return true;
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const reasonArb = fc.constantFrom(
  'member_joined' as const,
  'member_left' as const,
  'member_removed' as const,
);

const contextTypeArb = fc.constantFrom(
  'conversation' as const,
  'group' as const,
  'channel' as const,
);

/** Generate an ISO 8601 timestamp within a reasonable range. */
const isoTimestampArb = fc
  .date({
    min: new Date('2020-01-01T00:00:00Z'),
    max: new Date('2030-12-31T23:59:59Z'),
  })
  .filter((d) => !isNaN(d.getTime()))
  .map((d) => d.toISOString());

/** Generate a KeyRotationNoticeItem with a given ISO timestamp. */
const keyRotationNoticeArb = (
  ts: string,
): fc.Arbitrary<KeyRotationNoticeItem> =>
  fc.record({
    type: fc.constant('key_rotation' as const),
    reason: reasonArb,
    timestamp: fc.constant(ts),
    epoch: fc.nat({ max: 1000 }),
  });

/** Generate a minimal ICommunicationMessage stub with a given createdAt as BrightDateTimestamp. */
const messageArb = (createdAt: Date): fc.Arbitrary<ThreadItem> =>
  fc.record({
    id: fc.uuid(),
    contextType: contextTypeArb,
    contextId: fc.uuid(),
    senderId: fc.uuid(),
    encryptedContent: fc.string({ minLength: 0, maxLength: 50 }),
    createdAt: fc.constant(dateToBrightDate(createdAt)),
    editHistory: fc.constant([]),
    deleted: fc.constant(false),
    pinned: fc.constant(false),
    reactions: fc.constant([]),
    keyEpoch: fc.nat({ max: 100 }),
    attachments: fc.constant([]),
  }) as unknown as fc.Arbitrary<ThreadItem>;

/** Generate a single ThreadItem (either a message or a key rotation notice). */
const threadItemArb = (ts: string): fc.Arbitrary<ThreadItem> => {
  const d = new Date(ts);
  return fc.oneof(
    messageArb(d),
    keyRotationNoticeArb(ts) as fc.Arbitrary<ThreadItem>,
  );
};

/**
 * Generate a chronologically sorted array of ThreadItems.
 * First generate sorted timestamps, then create items for each.
 */
const sortedThreadItemsArb: fc.Arbitrary<ThreadItem[]> = fc
  .array(isoTimestampArb, { minLength: 0, maxLength: 20 })
  .chain((timestamps) => {
    // Sort timestamps chronologically (ISO 8601 strings sort lexicographically)
    const sorted = [...timestamps].sort();
    if (sorted.length === 0) return fc.constant([] as ThreadItem[]);
    // Generate a ThreadItem for each sorted timestamp
    return fc.tuple(...sorted.map((ts) => threadItemArb(ts))) as fc.Arbitrary<
      ThreadItem[]
    >;
  });

/** Generate a random KeyRotationNoticeItem with a random timestamp. */
const randomNoticeArb: fc.Arbitrary<KeyRotationNoticeItem> =
  isoTimestampArb.chain((ts) => keyRotationNoticeArb(ts));

// ─── Property 4: Key rotation notice is inserted in chronological order ─────

describe('Feature: brightchat-encryption-indicators, Property 4: Key rotation notice is inserted in chronological order', () => {
  /**
   * **Validates: Requirements 6.1**
   *
   * For any chronologically sorted list of thread items and any key rotation
   * notice with a valid timestamp, calling applyKeyRotation SHALL return a
   * list that is still sorted chronologically and contains the new notice
   * at the correct position.
   */
  it('should return a sorted list that contains the inserted notice', () => {
    fc.assert(
      fc.property(sortedThreadItemsArb, randomNoticeArb, (items, notice) => {
        const result = applyKeyRotation(items, notice);

        // Result length is original + 1
        expect(result).toHaveLength(items.length + 1);

        // Result is still chronologically sorted
        expect(isSorted(result)).toBe(true);

        // Result contains the notice (by reference)
        expect(result).toContain(notice);
      }),
      { numRuns: 100 },
    );
  });
});
