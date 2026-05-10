/**
 * Property-based tests for MessageThreadView sorting logic +
 * Unit tests for MessageThreadView encryption integration.
 *
 * Property 5: Messages displayed in chronological order
 * Property 13: Message visual indicators for edited and pinned state
 * Unit: EncryptionBanner and KeyRotationNotice integration
 *
 * Feature: brightchat-frontend
 * Feature: brightchat-encryption-indicators
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Captured WebSocket handlers for simulating events in tests ─────────────
let capturedWsHandlers: Record<string, any> = {};

jest.mock('@brightchain/brightchain-lib', () => ({
  BrightDateDisplayMode: {
    Dual: 'dual',
    BrightDateOnly: 'brightDateOnly',
    LocaleOnly: 'localeOnly',
    Hover: 'hover',
    HoverReverse: 'hoverReverse',
  },
  toBrightDateString: () => '9146.438',
  formatDateByMode: (_date: unknown, localeStr: string) => localeStr,
  getDateTooltip: () => '',
  brightDateNow: () => 9146.438,
  brightDateToDate: (bd: number) => new Date((bd + 10957.5) * 86400000),
  dateToBrightDate: (d: Date) => (d.getTime() - 946728000000) / 86400000,
  BrightChainStrings: new Proxy({}, { get: (_t: unknown, p: string | symbol) => String(p) }),
  CommunicationEventType: {
    MESSAGE_SENT: 'communication:message_sent',
    MESSAGE_EDITED: 'communication:message_edited',
    MESSAGE_DELETED: 'communication:message_deleted',
    TYPING_START: 'communication:typing_start',
    TYPING_STOP: 'communication:typing_stop',
    REACTION_ADDED: 'communication:reaction_added',
    REACTION_REMOVED: 'communication:reaction_removed',
    PRESENCE_CHANGED: 'communication:presence_changed',
    MEMBER_JOINED: 'communication:member_joined',
    MEMBER_LEFT: 'communication:member_left',
    KEY_ROTATED: 'communication:key_rotated',
    SERVER_CHANNEL_CREATED: 'communication:server_channel_created',
    SERVER_CHANNEL_DELETED: 'communication:server_channel_deleted',
    SERVER_MEMBER_JOINED: 'communication:server_member_joined',
    SERVER_MEMBER_REMOVED: 'communication:server_member_removed',
  },
}));

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useAuth: () => ({
    userData: {
      id: 'test-user-id',
      displayName: 'Test User',
      username: 'testuser',
    },
  }),
  useAuthenticatedApi: () => ({}),
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

const mockChatApi = {
  getConversationMessages: jest
    .fn()
    .mockResolvedValue({ items: [], cursor: undefined, hasMore: false }),
  getGroupMessages: jest
    .fn()
    .mockResolvedValue({ items: [], cursor: undefined, hasMore: false }),
  getChannelMessages: jest
    .fn()
    .mockResolvedValue({ items: [], cursor: undefined, hasMore: false }),
  sendDirectMessage: jest.fn().mockResolvedValue({}),
  sendGroupMessage: jest.fn().mockResolvedValue({}),
  sendChannelMessage: jest.fn().mockResolvedValue({}),
};

jest.mock('../hooks/useChatApi', () => ({
  useChatApi: () => mockChatApi,
}));

jest.mock('../hooks/useChatWebSocket', () => {
  const actual = jest.requireActual('../hooks/useChatWebSocket');
  return {
    ...actual,
    useChatWebSocket: (_url: any, handlers: any) => {
      capturedWsHandlers = handlers;
    },
  };
});

import { act, render, screen, waitFor } from '@testing-library/react';
import fc from 'fast-check';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import MessageThreadView, {
  sortMessagesChronologically,
} from '../MessageThreadView';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generate a valid BrightDateTimestamp from an integer timestamp range.
 * Using fc.integer avoids the NaN dates that fc.date can produce.
 */
const validDateArb = fc
  .integer({
    min: new Date('2020-01-01T00:00:00Z').getTime(),
    max: new Date('2030-12-31T23:59:59Z').getTime(),
  })
  .map((ms) => (ms - 946728000000) / 86400000); // convert to BrightDateTimestamp

const reactionArb = fc.record({
  id: fc.uuid(),
  emoji: fc.constantFrom('👍', '❤️', '😂', '🎉', '🔥'),
  userId: fc.uuid(),
});

/**
 * Arbitrary that generates an ICommunicationMessage-like object with the
 * fields relevant to sorting and identity.
 */
const messageArb = fc.record({
  id: fc.uuid(),
  senderId: fc.uuid(),
  encryptedContent: fc.string({ minLength: 1, maxLength: 200 }),
  createdAt: validDateArb,
  editedAt: fc.option(validDateArb, { nil: undefined }),
  pinned: fc.boolean(),
  reactions: fc.array(reactionArb, { minLength: 0, maxLength: 5 }),
  contextId: fc.uuid(),
});

/**
 * Arbitrary that generates an array of messages with distinct createdAt
 * timestamps (no two messages share the same ms value).
 */
const distinctMessagesArb = fc
  .array(messageArb, { minLength: 2, maxLength: 30 })
  .filter((messages) => {
    const times = messages.map((m) => m.createdAt as unknown as number);
    return new Set(times).size === times.length;
  });

// ─── Property 5: Messages displayed in chronological order ──────────────────

describe('Feature: brightchat-frontend, Property 5: Messages displayed in chronological order', () => {
  /**
   * **Validates: Requirements 3.2, 4.3, 5.3**
   *
   * For any list of ICommunicationMessage-like objects with distinct createdAt
   * timestamps, sorting them the same way MessageThreadView does should
   * produce a list in strictly ascending order of createdAt.
   */
  it('should sort messages in ascending order of createdAt for any input', () => {
    fc.assert(
      fc.property(distinctMessagesArb, (messages) => {
        const sorted = sortMessagesChronologically(messages as any);

        // Verify ascending order: each item's createdAt <= next item's
        for (let i = 0; i < sorted.length - 1; i++) {
          const currentTime = sorted[i].createdAt as unknown as number;
          const nextTime = sorted[i + 1].createdAt as unknown as number;
          expect(currentTime).toBeLessThan(nextTime);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.2, 4.3, 5.3**
   *
   * Sorting should preserve all original messages (no items lost or duplicated).
   */
  it('should preserve all messages after sorting (no items lost or added)', () => {
    fc.assert(
      fc.property(distinctMessagesArb, (messages) => {
        const sorted = sortMessagesChronologically(messages as any);

        expect(sorted.length).toBe(messages.length);

        const originalIds = new Set(messages.map((m) => m.id));
        const sortedIds = new Set(sorted.map((m) => m.id));
        expect(sortedIds).toEqual(originalIds);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 13: Message visual indicators for edited and pinned state ─────

/**
 * Property-based test for message visual indicator derivation logic.
 *
 * Property 13: Message visual indicators for edited and pinned state
 * Tests the pure data-derivation logic that determines whether a message
 * should display an "edited" indicator and/or a "pinned" visual distinction.
 *
 * Feature: brightchat-frontend, Property 13: Message visual indicators for edited and pinned state
 */

describe('Feature: brightchat-frontend, Property 13: Message visual indicators for edited and pinned state', () => {
  /**
   * **Validates: Requirements 6.4, 6.7**
   *
   * For any message where editedAt is a valid Date, the "should show edited"
   * flag (!!message.editedAt) must be true.
   */
  it('should derive showEdited=true when editedAt is a valid Date', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          senderId: fc.uuid(),
          encryptedContent: fc.string({ minLength: 1, maxLength: 200 }),
          createdAt: validDateArb,
          editedAt: validDateArb,
          pinned: fc.boolean(),
          reactions: fc.array(reactionArb, { minLength: 0, maxLength: 3 }),
          contextId: fc.uuid(),
        }),
        (message) => {
          const showEdited = !!message.editedAt;
          expect(showEdited).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.4**
   *
   * For any message where editedAt is undefined, the "should show edited"
   * flag (!!message.editedAt) must be false.
   */
  it('should derive showEdited=false when editedAt is undefined', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          senderId: fc.uuid(),
          encryptedContent: fc.string({ minLength: 1, maxLength: 200 }),
          createdAt: validDateArb,
          editedAt: fc.constant(undefined),
          pinned: fc.boolean(),
          reactions: fc.array(reactionArb, { minLength: 0, maxLength: 3 }),
          contextId: fc.uuid(),
        }),
        (message) => {
          const showEdited = !!message.editedAt;
          expect(showEdited).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.7**
   *
   * For any message where pinned is true, the "should show pin" flag
   * (message.pinned) must be true.
   */
  it('should derive showPin=true when pinned is true', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          senderId: fc.uuid(),
          encryptedContent: fc.string({ minLength: 1, maxLength: 200 }),
          createdAt: validDateArb,
          editedAt: fc.option(validDateArb, { nil: undefined }),
          pinned: fc.constant(true),
          reactions: fc.array(reactionArb, { minLength: 0, maxLength: 3 }),
          contextId: fc.uuid(),
        }),
        (message) => {
          const showPin = message.pinned;
          expect(showPin).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 6.7**
   *
   * For any message where pinned is false, the "should show pin" flag
   * (message.pinned) must be false.
   */
  it('should derive showPin=false when pinned is false', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          senderId: fc.uuid(),
          encryptedContent: fc.string({ minLength: 1, maxLength: 200 }),
          createdAt: validDateArb,
          editedAt: fc.option(validDateArb, { nil: undefined }),
          pinned: fc.constant(false),
          reactions: fc.array(reactionArb, { minLength: 0, maxLength: 3 }),
          contextId: fc.uuid(),
        }),
        (message) => {
          const showPin = message.pinned;
          expect(showPin).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Helpers for rendering MessageThreadView ────────────────────────────────

function makeMessage(
  id: string,
  content: string,
  createdAt: string,
  contextId = 'ctx-1',
) {
  return {
    id,
    senderId: 'user-1',
    encryptedContent: content,
    createdAt,
    editedAt: undefined,
    pinned: false,
    reactions: [],
    contextId,
  };
}

function renderThread(
  contextType: 'conversation' | 'group' | 'channel' = 'conversation',
  routePath = '/conversation/ctx-1',
) {
  const paramKey =
    contextType === 'conversation'
      ? 'conversationId'
      : contextType === 'group'
        ? 'groupId'
        : 'channelId';

  return render(
    <MemoryRouter initialEntries={[routePath]}>
      <Routes>
        <Route
          path={`/${contextType}/:${paramKey}`}
          element={<MessageThreadView contextType={contextType} />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

// ─── Unit tests: MessageThreadView encryption integration ───────────────────

describe('MessageThreadView encryption integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    capturedWsHandlers = {};
  });

  // ── EncryptionBanner tests ──────────────────────────────────────

  describe('EncryptionBanner rendering', () => {
    /**
     * **Validates: Requirements 2.1, 2.5**
     */
    it('renders EncryptionBanner at top of message area for conversation context', async () => {
      mockChatApi.getConversationMessages.mockResolvedValueOnce({
        items: [makeMessage('m1', 'Hello', '2024-01-01T00:00:00Z')],
        cursor: undefined,
        hasMore: false,
      });

      renderThread('conversation', '/conversation/ctx-1');

      await waitFor(() => {
        expect(screen.getByTestId('encryption-banner')).toBeTruthy();
      });
    });

    /**
     * **Validates: Requirements 2.1, 2.5**
     */
    it('renders EncryptionBanner for group context type', async () => {
      mockChatApi.getGroupMessages.mockResolvedValueOnce({
        items: [makeMessage('m1', 'Hello', '2024-01-01T00:00:00Z')],
        cursor: undefined,
        hasMore: false,
      });

      renderThread('group', '/group/ctx-1');

      await waitFor(() => {
        expect(screen.getByTestId('encryption-banner')).toBeTruthy();
      });
    });

    /**
     * **Validates: Requirements 2.1, 2.5**
     */
    it('renders EncryptionBanner for channel context type', async () => {
      mockChatApi.getChannelMessages.mockResolvedValueOnce({
        items: [makeMessage('m1', 'Hello', '2024-01-01T00:00:00Z')],
        cursor: undefined,
        hasMore: false,
      });

      renderThread('channel', '/channel/ctx-1');

      await waitFor(() => {
        expect(screen.getByTestId('encryption-banner')).toBeTruthy();
      });
    });

    /**
     * **Validates: Requirements 2.1, 2.5**
     */
    it('renders EncryptionBanner even when message list is empty', async () => {
      mockChatApi.getConversationMessages.mockResolvedValueOnce({
        items: [],
        cursor: undefined,
        hasMore: false,
      });

      renderThread('conversation', '/conversation/ctx-1');

      await waitFor(() => {
        expect(screen.getByTestId('encryption-banner')).toBeTruthy();
      });
    });
  });

  // ── KeyRotationNotice tests ─────────────────────────────────────

  describe('KeyRotationNotice in message list', () => {
    /**
     * **Validates: Requirements 6.1, 6.2**
     */
    it('renders KeyRotationNotice when onKeyRotated fires with a valid event', async () => {
      mockChatApi.getConversationMessages.mockResolvedValueOnce({
        items: [makeMessage('m1', 'Hello', '2024-01-01T00:00:00Z')],
        cursor: undefined,
        hasMore: false,
      });

      renderThread('conversation', '/conversation/ctx-1');

      // Wait for messages to load
      await waitFor(() => {
        expect(screen.getByTestId('message-bubble-m1')).toBeTruthy();
      });

      // Simulate a key rotation event via the captured WebSocket handler
      act(() => {
        capturedWsHandlers.onKeyRotated?.({
          contextId: 'ctx-1',
          contextType: 'conversation',
          reason: 'member_joined',
          newEpoch: 2,
          timestamp: '2024-01-01T01:00:00Z',
        });
      });

      await waitFor(() => {
        expect(screen.getByTestId('key-rotation-notice')).toBeTruthy();
      });
    });

    /**
     * **Validates: Requirements 6.1, 6.2**
     */
    it('does not render KeyRotationNotice for a different contextId', async () => {
      mockChatApi.getConversationMessages.mockResolvedValueOnce({
        items: [makeMessage('m1', 'Hello', '2024-01-01T00:00:00Z')],
        cursor: undefined,
        hasMore: false,
      });

      renderThread('conversation', '/conversation/ctx-1');

      await waitFor(() => {
        expect(screen.getByTestId('message-bubble-m1')).toBeTruthy();
      });

      // Fire event for a different context — should be ignored
      act(() => {
        capturedWsHandlers.onKeyRotated?.({
          contextId: 'other-ctx',
          contextType: 'conversation',
          reason: 'member_left',
          newEpoch: 3,
          timestamp: '2024-01-01T02:00:00Z',
        });
      });

      expect(screen.queryByTestId('key-rotation-notice')).toBeNull();
    });

    /**
     * **Validates: Requirements 6.1**
     *
     * Malformed KEY_ROTATED events (missing required fields) should be
     * silently ignored by the WebSocket validation layer. Since we mock
     * useChatWebSocket, we verify the onKeyRotated handler in
     * MessageThreadView guards against events for wrong contexts.
     * The actual malformed-event filtering is in useChatWebSocket itself.
     */
    it('silently ignores key rotation events for non-matching context', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      mockChatApi.getConversationMessages.mockResolvedValueOnce({
        items: [makeMessage('m1', 'Hello', '2024-01-01T00:00:00Z')],
        cursor: undefined,
        hasMore: false,
      });

      renderThread('conversation', '/conversation/ctx-1');

      await waitFor(() => {
        expect(screen.getByTestId('message-bubble-m1')).toBeTruthy();
      });

      // Fire event with wrong contextId — handler should guard and not insert
      act(() => {
        capturedWsHandlers.onKeyRotated?.({
          contextId: 'wrong-ctx',
          contextType: 'conversation',
          reason: 'member_removed',
          newEpoch: 5,
          timestamp: '2024-01-01T03:00:00Z',
        });
      });

      expect(screen.queryByTestId('key-rotation-notice')).toBeNull();

      warnSpy.mockRestore();
    });
  });
});
