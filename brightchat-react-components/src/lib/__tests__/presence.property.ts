/**
 * Property-based tests for presence logic.
 *
 * Tests the pure helper functions for presence color mapping (Property 15),
 * presence change state transform (Property 16), and DND notification
 * suppression (Property 17).
 *
 * Uses fast-check with 100+ iterations per property.
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

const PresenceStatusEnum = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  IDLE: 'idle',
  DO_NOT_DISTURB: 'dnd',
} as const;

const CommunicationEventTypeEnum = {
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
  SERVER_CHANNEL_CREATED: 'communication:server_channel_created',
  SERVER_CHANNEL_DELETED: 'communication:server_channel_deleted',
  SERVER_MEMBER_JOINED: 'communication:server_member_joined',
  SERVER_MEMBER_REMOVED: 'communication:server_member_removed',
  SERVER_UPDATED: 'communication:server_updated',
} as const;

jest.mock('@brightchain/brightchain-lib', () => ({
  PresenceStatus: PresenceStatusEnum,
  CommunicationEventType: CommunicationEventTypeEnum,
}));

jest.mock('@brightchain/brightchat-lib', () => ({
  BrightChatStrings: {
    Presence_Online: 'Presence_Online',
    Presence_Idle: 'Presence_Idle',
    Presence_DoNotDisturb: 'Presence_DoNotDisturb',
    Presence_Offline: 'Presence_Offline',
  },
}));

import fc from 'fast-check';
import { applyPresenceChanged } from '../hooks/useChatWebSocket';
import {
  presenceStatusColor,
  shouldSuppressNotification,
} from '../PresenceIndicator';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const allStatuses = [
  PresenceStatusEnum.ONLINE,
  PresenceStatusEnum.OFFLINE,
  PresenceStatusEnum.IDLE,
  PresenceStatusEnum.DO_NOT_DISTURB,
] as const;

const presenceStatusArb = fc.constantFrom(...allStatuses);

// ─── Property 15: Presence status color mapping ─────────────────────────────

describe('Feature: brightchat-discord-experience, Property 15: Presence status color mapping', () => {
  const expectedColors: Record<string, string> = {
    [PresenceStatusEnum.ONLINE]: '#43b581',
    [PresenceStatusEnum.IDLE]: '#faa61a',
    [PresenceStatusEnum.DO_NOT_DISTURB]: '#f04747',
    [PresenceStatusEnum.OFFLINE]: '#747f8d',
  };

  /**
   * **Validates: Requirements 9.2**
   *
   * For all values of PresenceStatus, the color mapping function SHALL
   * return: green for ONLINE, yellow for IDLE, red for DO_NOT_DISTURB,
   * and gray for OFFLINE. The mapping SHALL be total (no undefined results).
   */
  it('should map every PresenceStatus to its correct color', () => {
    fc.assert(
      fc.property(presenceStatusArb, (status) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const color = presenceStatusColor(status as any);

        // Mapping is total — result is always defined
        expect(color).toBeDefined();
        expect(typeof color).toBe('string');
        expect(color.length).toBeGreaterThan(0);

        // Correct color for each status
        expect(color).toBe(expectedColors[status]);
      }),
      { numRuns: 100 },
    );
  });

  it('should return a color for every possible status value (totality)', () => {
    for (const status of allStatuses) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const color = presenceStatusColor(status as any);
      expect(color).toBeDefined();
      expect(color).not.toBe('');
    }
  });
});

// ─── Property 16: Presence change state transform ───────────────────────────

describe('Feature: brightchat-discord-experience, Property 16: Presence change state transform', () => {
  /**
   * **Validates: Requirements 9.3**
   *
   * For any presence map and a presence-changed event for memberId M with
   * new status S, applyPresenceChanged SHALL update only M's status to S
   * and leave all other members' statuses unchanged.
   */
  it('should update only the target member status and leave others unchanged', () => {
    const presenceEntryArb = fc.tuple(fc.uuid(), presenceStatusArb);
    const presenceMapArb = fc
      .uniqueArray(presenceEntryArb, {
        comparator: (a, b) => a[0] === b[0],
        minLength: 0,
        maxLength: 20,
      })
      .map((entries) => new Map(entries));

    fc.assert(
      fc.property(
        presenceMapArb,
        fc.uuid(),
        presenceStatusArb,
        (presenceMap, memberId, newStatus) => {
          const result = applyPresenceChanged(presenceMap, memberId, newStatus);

          // Target member has the new status
          expect(result.get(memberId)).toBe(newStatus);

          // All other members are unchanged
          for (const [id, status] of presenceMap) {
            if (id !== memberId) {
              expect(result.get(id)).toBe(status);
            }
          }

          // No members were removed
          for (const id of presenceMap.keys()) {
            expect(result.has(id)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should not mutate the original map', () => {
    fc.assert(
      fc.property(fc.uuid(), presenceStatusArb, (memberId, newStatus) => {
        const original = new Map<string, string>([
          ['existing-1', PresenceStatusEnum.ONLINE],
        ]);
        const originalSize = original.size;

        applyPresenceChanged(original, memberId, newStatus);

        expect(original.size).toBe(originalSize);
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 17: DND notification suppression ──────────────────────────────

describe('Feature: brightchat-discord-experience, Property 17: DND notification suppression', () => {
  /**
   * **Validates: Requirements 9.5**
   *
   * For any notification event, if the current user's presence status is
   * DO_NOT_DISTURB, the notification display function SHALL suppress
   * (not show) the notification. If the status is any other value, it
   * SHALL allow the notification.
   */
  it('should suppress notifications only when status is DO_NOT_DISTURB', () => {
    fc.assert(
      fc.property(presenceStatusArb, (status) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const suppressed = shouldSuppressNotification(status as any);

        if (status === PresenceStatusEnum.DO_NOT_DISTURB) {
          expect(suppressed).toBe(true);
        } else {
          expect(suppressed).toBe(false);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('should return a boolean for every status (totality)', () => {
    for (const status of allStatuses) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = shouldSuppressNotification(status as any);
      expect(typeof result).toBe('boolean');
    }
  });
});
