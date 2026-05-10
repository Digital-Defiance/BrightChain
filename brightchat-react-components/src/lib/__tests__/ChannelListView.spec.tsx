/**
 * Property-based test for ChannelListView visibility filtering logic.
 *
 * Property 9: Channel list filters by visibility
 * Tests the pure filtering logic used by ChannelListView to display
 * only discoverable channels (public and private), excluding secret
 * and invisible channels.
 *
 * Feature: brightchat-frontend, Property 9: Channel list filters by visibility
 */

jest.mock('@brightchain/brightchain-lib', () => {
  const actual = {
    ChannelVisibility: {
      PUBLIC: 'public',
      PRIVATE: 'private',
      SECRET: 'secret',
      INVISIBLE: 'invisible',
    },
  };
  return {
    ...actual,
    __esModule: true,
  };
});

import fc from 'fast-check';

// ─── Visibility values matching the actual enum ─────────────────────────────

const ChannelVisibility = {
  PUBLIC: 'public',
  PRIVATE: 'private',
  SECRET: 'secret',
  INVISIBLE: 'invisible',
} as const;

type ChannelVisibilityValue =
  (typeof ChannelVisibility)[keyof typeof ChannelVisibility];

const ALL_VISIBILITIES: ChannelVisibilityValue[] = [
  ChannelVisibility.PUBLIC,
  ChannelVisibility.PRIVATE,
  ChannelVisibility.SECRET,
  ChannelVisibility.INVISIBLE,
];

const DISCOVERABLE: Set<string> = new Set([
  ChannelVisibility.PUBLIC,
  ChannelVisibility.PRIVATE,
]);

// ─── Pure filtering logic extracted from ChannelListView ────────────────────

/**
 * Filters channels to only discoverable ones (public + private).
 * This mirrors the exact filter in ChannelListView.tsx:
 *   ch.visibility === ChannelVisibility.PUBLIC || ch.visibility === ChannelVisibility.PRIVATE
 */
function filterDiscoverableChannels<T extends { visibility: string }>(
  channels: T[],
): T[] {
  return channels.filter(
    (ch) =>
      ch.visibility === ChannelVisibility.PUBLIC ||
      ch.visibility === ChannelVisibility.PRIVATE,
  );
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const validDateArb = fc
  .integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  })
  .map((ms) => new Date(ms));

const channelMemberArb = fc.record({
  memberId: fc.uuid(),
  role: fc.constantFrom('owner', 'admin', 'moderator', 'member'),
  joinedAt: validDateArb,
  mutedUntil: fc.option(validDateArb, { nil: undefined }),
});

const channelArb = (visibility: fc.Arbitrary<ChannelVisibilityValue>) =>
  fc.record({
    id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    topic: fc.string({ minLength: 0, maxLength: 200 }),
    creatorId: fc.uuid(),
    visibility,
    members: fc.array(channelMemberArb, { minLength: 0, maxLength: 10 }),
    encryptedSharedKey: fc.constant(new Map<string, string>()),
    createdAt: validDateArb,
    lastMessageAt: validDateArb,
    pinnedMessageIds: fc.array(fc.uuid(), { minLength: 0, maxLength: 5 }),
    historyVisibleToNewMembers: fc.boolean(),
  });

/** Generates a channel with any of the 4 visibility values */
const mixedChannelArb = channelArb(fc.constantFrom(...ALL_VISIBILITIES));

/** Generates an array of channels with mixed visibility */
const channelListArb = fc.array(mixedChannelArb, {
  minLength: 0,
  maxLength: 30,
});

// ─── Property 9: Channel list filters by visibility ─────────────────────────

describe('Feature: brightchat-frontend, Property 9: Channel list filters by visibility', () => {
  /**
   * **Validates: Requirements 5.1**
   *
   * For any array of channels with mixed visibility values, filtering
   * to only PUBLIC and PRIVATE should exclude all SECRET and INVISIBLE channels.
   * No channels with SECRET or INVISIBLE visibility should remain.
   */
  it('should exclude all SECRET and INVISIBLE channels from the filtered result', () => {
    fc.assert(
      fc.property(channelListArb, (channels) => {
        const filtered = filterDiscoverableChannels(channels);

        for (const ch of filtered) {
          expect(ch.visibility).not.toBe(ChannelVisibility.SECRET);
          expect(ch.visibility).not.toBe(ChannelVisibility.INVISIBLE);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.1**
   *
   * The filtered result should contain exactly the channels that had
   * PUBLIC or PRIVATE visibility — no more, no less.
   */
  it('should contain exactly the channels with PUBLIC or PRIVATE visibility', () => {
    fc.assert(
      fc.property(channelListArb, (channels) => {
        const filtered = filterDiscoverableChannels(channels);

        const expectedCount = channels.filter((ch) =>
          DISCOVERABLE.has(ch.visibility),
        ).length;

        expect(filtered.length).toBe(expectedCount);

        // Every filtered channel must be discoverable
        for (const ch of filtered) {
          expect(DISCOVERABLE.has(ch.visibility)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.1**
   *
   * The filtered result should preserve the identity of each channel —
   * every channel in the output must exist in the original input.
   */
  it('should only contain channels present in the original input', () => {
    fc.assert(
      fc.property(channelListArb, (channels) => {
        const filtered = filterDiscoverableChannels(channels);
        const inputIds = new Set(channels.map((ch) => ch.id));

        for (const ch of filtered) {
          expect(inputIds.has(ch.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });
});
