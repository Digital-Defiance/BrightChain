/**
 * Property-based test for ChannelSidebar encryption icon.
 *
 * Property 1: Every channel row renders a lock icon
 *
 * Feature: brightchat-encryption-indicators, Property 1: Every channel row renders a lock icon
 */

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: {
    ONLINE: 'online',
    OFFLINE: 'offline',
    IDLE: 'idle',
    DO_NOT_DISTURB: 'dnd',
  },
  DefaultRole: {
    OWNER: 'owner',
    ADMIN: 'admin',
    MODERATOR: 'moderator',
    MEMBER: 'member',
  },
}));

// Mock useI18n to avoid requiring I18nProvider in tests
jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

// Async React property tests can exceed 5 s under parallel load — give them room.
jest.retryTimes(2, { logErrorsBeforeRetry: false });
jest.setTimeout(30000);

import { cleanup, render, screen } from '@testing-library/react';
import fc from 'fast-check';
import type { ChannelSidebarProps } from '../ChannelSidebar';
import ChannelSidebar from '../ChannelSidebar';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const visibilityArb = fc.constantFrom(
  'public' as const,
  'private' as const,
  'secret' as const,
  'invisible' as const,
);

/** Generate a channel with a unique id and random name. */
const channelArb = (id: string) =>
  fc.record({
    id: fc.constant(id),
    name: fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => s.trim().length > 0),
    topic: fc.constant(''),
    creatorId: fc.constant('u1'),
    visibility: visibilityArb,
    members: fc.constant([]),
    encryptedSharedKey: fc.constant(new Map()),
    createdAt: fc.constant(new Date()),
    lastMessageAt: fc.constant(new Date()),
    pinnedMessageIds: fc.constant([]),
    historyVisibleToNewMembers: fc.constant(true),
  });

/**
 * Generate a tuple of (channels, categories) where every channel
 * belongs to exactly one category (no collapsed categories by default).
 */
const channelsAndCategoriesArb = fc
  .integer({ min: 1, max: 10 })
  .chain((numChannels) => {
    const channelIds = Array.from({ length: numChannels }, (_, i) => `ch-${i}`);

    // Generate all channels
    const channelsArb = fc.tuple(...channelIds.map((id) => channelArb(id)));

    // Split channel ids into 1–3 categories
    const numCategories = Math.min(3, numChannels);
    const categories = Array.from({ length: numCategories }, (_, i) => ({
      id: `cat-${i}`,
      name: `Category ${i}`,
      position: i,
      channelIds: [] as string[],
    }));

    // Distribute channels round-robin across categories
    channelIds.forEach((chId, idx) => {
      categories[idx % numCategories].channelIds.push(chId);
    });

    return channelsArb.map((channels) => ({
      channels,
      categories,
    }));
  });

// ─── Property 1: Every channel row renders a lock icon ──────────────────────

describe('Feature: brightchat-encryption-indicators, Property 1: Every channel row renders a lock icon', () => {
  afterEach(() => {
    cleanup();
  });

  /**
   * **Validates: Requirements 1.1**
   *
   * For any non-empty array of channels and categories, rendering the
   * ChannelSidebar SHALL produce exactly one element with
   * data-testid="encryption-icon-channel" per visible (non-collapsed) channel.
   */
  it('should render exactly one lock icon per visible channel', () => {
    fc.assert(
      fc.property(channelsAndCategoriesArb, ({ channels, categories }) => {
        cleanup();

        const props: ChannelSidebarProps = {
          serverName: 'Test Server',
          channels: channels as any,
          categories: categories as any,
          activeChannelId: null,
          userRole: 'member' as any,
          onChannelSelect: jest.fn(),
        };

        render(<ChannelSidebar {...props} />);

        const lockIcons = screen.getAllByTestId('encryption-icon-channel');
        expect(lockIcons).toHaveLength(channels.length);
      }),
      { numRuns: 100 },
    );
  });
});
