/**
 * Property-based tests for navigation helpers.
 *
 * Tests the pure computeNextIndex function for keyboard navigation
 * wrapping behavior (Property 10) and server name validation (Property 11).
 *
 * Uses fast-check with 100+ iterations per property.
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

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
  DEFAULT_SERVER_ICON_CONFIG: {
    maxFileSizeBytes: 5 * 1024 * 1024,
    outputSizePx: 256,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/gif', 'image/webp'],
    outputMimeType: 'image/png',
  },
  isAllowedIconFileSize: (size: number) => size <= 5 * 1024 * 1024,
  isAllowedIconMimeType: (mime: string) =>
    ['image/png', 'image/jpeg', 'image/gif', 'image/webp'].includes(mime),
}));

jest.mock('@brightchain/brightchat-lib', () => ({}));

// Mock react-easy-crop to avoid canvas issues in test environment
jest.mock('react-easy-crop', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef(function MockCropper(
      _props: Record<string, unknown>,
      _ref: unknown,
    ) {
      return React.createElement('div', { 'data-testid': 'mock-cropper' });
    }),
  };
});

import fc from 'fast-check';
import { computeNextIndex } from '../ServerRail';

// ─── Property 10: Keyboard navigation index wrapping ────────────────────────

describe('Feature: brightchat-discord-experience, Property 10: Keyboard navigation index wrapping', () => {
  /**
   * **Validates: Requirements 4.7**
   *
   * For any list of N server items (N ≥ 1) and current focused index I,
   * pressing ArrowDown SHALL yield index (I + 1) % N, and pressing
   * ArrowUp SHALL yield (I - 1 + N) % N.
   */
  it('ArrowDown should yield (currentIndex + 1) % listLength', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (currentIndex: number, listLength: number) => {
          // Clamp currentIndex to valid range
          const idx = currentIndex % listLength;
          const result = computeNextIndex(idx, listLength, 'down');
          expect(result).toBe((idx + 1) % listLength);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('ArrowUp should yield (currentIndex - 1 + listLength) % listLength', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        (currentIndex: number, listLength: number) => {
          const idx = currentIndex % listLength;
          const result = computeNextIndex(idx, listLength, 'up');
          expect(result).toBe((idx - 1 + listLength) % listLength);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should wrap from last to first on ArrowDown', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (listLength: number) => {
        const lastIndex = listLength - 1;
        const result = computeNextIndex(lastIndex, listLength, 'down');
        expect(result).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('should wrap from first to last on ArrowUp', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100 }), (listLength: number) => {
        const result = computeNextIndex(0, listLength, 'up');
        expect(result).toBe(listLength - 1);
      }),
      { numRuns: 100 },
    );
  });

  it('should always return a value in [0, listLength)', () => {
    const directionArb = fc.constantFrom('up' as const, 'down' as const);

    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        fc.integer({ min: 1, max: 100 }),
        directionArb,
        (currentIndex: number, listLength: number, direction) => {
          const idx = currentIndex % listLength;
          const result = computeNextIndex(idx, listLength, direction);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThan(listLength);
        },
      ),
      { numRuns: 100 },
    );
  });
});

import {
  groupChannelsByCategory,
  isAdminOrOwner,
} from '../ChannelSidebar.helpers';

// ─── Arbitraries for channel/category tests ─────────────────────────────────

const DefaultRoleEnum = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  MEMBER: 'member',
} as const;

type DefaultRoleValue = (typeof DefaultRoleEnum)[keyof typeof DefaultRoleEnum];

const allRoles: DefaultRoleValue[] = [
  DefaultRoleEnum.OWNER,
  DefaultRoleEnum.ADMIN,
  DefaultRoleEnum.MODERATOR,
  DefaultRoleEnum.MEMBER,
];

const roleArb = fc.constantFrom(...allRoles);

// ─── Property 14: Role-based UI element visibility ──────────────────────────

describe('Feature: brightchat-discord-experience, Property 14: Role-based UI element visibility', () => {
  /**
   * **Validates: Requirements 7.4, 7.5, 8.5**
   *
   * For any user with role MEMBER or MODERATOR (not OWNER or ADMIN),
   * the UI visibility function SHALL return false for: Create Channel,
   * Delete Channel, Server Settings entry point. For any user with
   * OWNER or ADMIN role, it SHALL return true.
   */
  it('should return true only for OWNER and ADMIN roles', () => {
    fc.assert(
      fc.property(roleArb, (role) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = isAdminOrOwner(role as any);

        if (role === DefaultRoleEnum.OWNER || role === DefaultRoleEnum.ADMIN) {
          expect(result).toBe(true);
        } else {
          expect(result).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should return false for null role', () => {
    expect(isAdminOrOwner(null)).toBe(false);
  });
});

// ─── Property 9: Channel-to-category grouping ──────────────────────────────

describe('Feature: brightchat-discord-experience, Property 9: Channel-to-category grouping', () => {
  /**
   * **Validates: Requirements 4.3, 7.3**
   *
   * For any server with categories and channels, the grouping function
   * SHALL assign each channel to exactly one category (the category whose
   * channelIds contains that channel's id), and no channel SHALL appear
   * in more than one category.
   */
  it('should assign each channel to exactly one group', () => {
    // Generate channels with unique IDs
    const channelArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 30 }),
    });

    const channelListArb = fc.uniqueArray(channelArb, {
      comparator: (a, b) => a.id === b.id,
      minLength: 1,
      maxLength: 15,
    });

    fc.assert(
      fc.property(channelListArb, (channels) => {
        // Build categories that partition the channels (each channel in exactly one category)
        const half = Math.ceil(channels.length / 2);
        const cat1Channels = channels.slice(0, half);
        const cat2Channels = channels.slice(half);

        const categories = [
          {
            id: 'cat-1',
            name: 'Category 1',
            position: 0,
            channelIds: cat1Channels.map((c) => c.id),
          },
          {
            id: 'cat-2',
            name: 'Category 2',
            position: 1,
            channelIds: cat2Channels.map((c) => c.id),
          },
        ];

        const groups = groupChannelsByCategory(channels, categories);

        // Collect all channel IDs across all groups
        const allGroupedIds: string[] = [];
        for (const group of groups) {
          for (const ch of group.channels) {
            allGroupedIds.push(ch.id);
          }
        }

        // Every channel appears exactly once
        expect(allGroupedIds.length).toBe(channels.length);
        const uniqueIds = new Set(allGroupedIds);
        expect(uniqueIds.size).toBe(channels.length);

        // Every original channel is present
        for (const ch of channels) {
          expect(uniqueIds.has(ch.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should not place a channel in more than one category', () => {
    const channelArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 30 }),
    });

    const channelListArb = fc.uniqueArray(channelArb, {
      comparator: (a, b) => a.id === b.id,
      minLength: 1,
      maxLength: 10,
    });

    fc.assert(
      fc.property(channelListArb, (channels) => {
        // Intentionally put some channels in multiple categories
        const categories = [
          {
            id: 'cat-a',
            name: 'A',
            position: 0,
            channelIds: channels.map((c) => c.id),
          },
          {
            id: 'cat-b',
            name: 'B',
            position: 1,
            channelIds: channels.map((c) => c.id),
          },
        ];

        const groups = groupChannelsByCategory(channels, categories);

        // Each channel should appear in exactly one group (first matching category wins)
        const allGroupedIds: string[] = [];
        for (const group of groups) {
          for (const ch of group.channels) {
            allGroupedIds.push(ch.id);
          }
        }

        // No duplicates
        const uniqueIds = new Set(allGroupedIds);
        expect(allGroupedIds.length).toBe(uniqueIds.size);
      }),
      { numRuns: 100 },
    );
  });

  it('should place channels not in any category into uncategorized group', () => {
    const channelArb = fc.record({
      id: fc.uuid(),
      name: fc.string({ minLength: 1, maxLength: 30 }),
    });

    fc.assert(
      fc.property(
        fc.uniqueArray(channelArb, {
          comparator: (a, b) => a.id === b.id,
          minLength: 1,
          maxLength: 10,
        }),
        (channels) => {
          // Empty categories — all channels should be uncategorized
          const groups = groupChannelsByCategory(channels, []);

          expect(groups.length).toBe(1);
          expect(groups[0].category).toBeNull();
          expect(groups[0].channels.length).toBe(channels.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});

import { validateServerName } from '../CreateServerDialog';

// ─── Property 11: Server name validation ────────────────────────────────────

describe('Feature: brightchat-discord-experience, Property 11: Server name validation', () => {
  /**
   * **Validates: Requirements 5.2**
   *
   * For any string of length 1 to 100 (inclusive), server name validation
   * SHALL accept it. For any empty string or string with length > 100,
   * validation SHALL reject it.
   */
  it('should accept any string of length 1 to 100', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 100 }),
        (name: string) => {
          const result = validateServerName(name);
          expect(result).toBeNull();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should reject empty strings', () => {
    const result = validateServerName('');
    expect(result).not.toBeNull();
    expect(typeof result).toBe('string');
  });

  it('should reject strings longer than 100 characters', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 101, maxLength: 300 }),
        (name: string) => {
          const result = validateServerName(name);
          expect(result).not.toBeNull();
          expect(typeof result).toBe('string');
        },
      ),
      { numRuns: 100 },
    );
  });
});

import {
  filterUsersByQuery,
  findExistingConversation,
} from '../CreateDMDialog.helpers';

// ─── Property 12: User search filtering ─────────────────────────────────────

describe('Feature: brightchat-discord-experience, Property 12: User search filtering', () => {
  const userArb = fc.record({
    id: fc.uuid(),
    displayName: fc.string({ minLength: 1, maxLength: 50 }),
  });

  const userListArb = fc.uniqueArray(userArb, {
    comparator: (a, b) => a.id === b.id,
    minLength: 0,
    maxLength: 20,
  });

  /**
   * **Validates: Requirements 6.2**
   *
   * For any list of users and any non-empty search query, the filtered
   * results SHALL contain only users whose display name contains the query
   * as a case-insensitive substring, and SHALL contain all such users
   * from the original list.
   */
  it('should return only users whose displayName contains the query (case-insensitive)', () => {
    fc.assert(
      fc.property(
        userListArb,
        fc.string({ minLength: 1, maxLength: 10 }),
        (users, query) => {
          const result = filterUsersByQuery(users, query);
          const lowerQuery = query.toLowerCase();

          // All results match the query
          for (const user of result) {
            expect(user.displayName.toLowerCase().includes(lowerQuery)).toBe(
              true,
            );
          }

          // All matching users from original list are included
          for (const user of users) {
            if (user.displayName.toLowerCase().includes(lowerQuery)) {
              expect(result.some((r) => r.id === user.id)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return all users when query is empty', () => {
    fc.assert(
      fc.property(userListArb, (users) => {
        const result = filterUsersByQuery(users, '');
        expect(result.length).toBe(users.length);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 13: Conversation deduplication ────────────────────────────────

describe('Feature: brightchat-discord-experience, Property 13: Conversation deduplication', () => {
  /**
   * **Validates: Requirements 6.4**
   *
   * For any recipient where a conversation already exists in the
   * conversation list, initiating a DM SHALL return the existing
   * conversation's ID rather than creating a new conversation.
   */
  it('should return existing conversation ID when one exists', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (currentUserId, recipientId, conversationId) => {
          const conversations = [
            {
              id: conversationId,
              participantIds: [currentUserId, recipientId],
            },
          ];

          const result = findExistingConversation(
            conversations,
            currentUserId,
            recipientId,
          );
          expect(result).toBe(conversationId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should return null when no existing conversation exists', () => {
    fc.assert(
      fc.property(fc.uuid(), fc.uuid(), (currentUserId, recipientId) => {
        // Empty conversation list
        const result = findExistingConversation([], currentUserId, recipientId);
        expect(result).toBeNull();
      }),
      { numRuns: 100 },
    );
  });

  it('should not match conversations with different participants', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (currentUserId, recipientId, otherUser1, convId) => {
          // Conversation with different participants
          const conversations = [
            {
              id: convId,
              participantIds: [currentUserId, otherUser1],
            },
          ];

          // Only match if otherUser1 happens to equal recipientId
          const result = findExistingConversation(
            conversations,
            currentUserId,
            recipientId,
          );

          if (otherUser1 === recipientId) {
            expect(result).toBe(convId);
          } else {
            expect(result).toBeNull();
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not match group conversations (more than 2 participants)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (currentUserId, recipientId, thirdUser, convId) => {
          const conversations = [
            {
              id: convId,
              participantIds: [currentUserId, recipientId, thirdUser],
            },
          ];

          const result = findExistingConversation(
            conversations,
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
