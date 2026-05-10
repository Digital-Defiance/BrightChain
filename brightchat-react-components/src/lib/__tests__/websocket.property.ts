/**
 * Property-based tests for WebSocket event state transformations.
 *
 * Tests the pure helper functions exported from useChatWebSocket.ts
 * that implement the state transformations triggered by WebSocket events.
 * These functions are the core logic the hook dispatches to — testing them
 * in isolation avoids needing a real WebSocket or React rendering.
 *
 * Uses fast-check with 100+ iterations per property.
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────

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
} as const;

const PresenceStatusEnum = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  IDLE: 'idle',
  DO_NOT_DISTURB: 'dnd',
} as const;

jest.mock('@brightchain/brightchain-lib', () => ({
  CommunicationEventType: CommunicationEventTypeEnum,
  PresenceStatus: PresenceStatusEnum,
}));

jest.mock('@brightchain/brightchat-lib', () => ({}));

import fc from 'fast-check';
import {
  applyMemberJoined,
  applyMemberLeft,
  applyMessageDeleted,
  applyMessageEdited,
  applyMessageSent,
  applyPresenceChanged,
  applyReactionAdded,
  applyReactionRemoved,
  applyTypingStart,
  applyTypingStop,
} from '../hooks/useChatWebSocket';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Generates a minimal message-like object with id and encryptedContent. */
const messageArb = fc.record({
  id: fc.uuid(),
  encryptedContent: fc.string({ minLength: 1, maxLength: 200 }),
  editedAt: fc.option(fc.date(), { nil: undefined }),
  reactions: fc.constant([]),
});

type TestMessage = {
  id: string;
  encryptedContent: string;
  editedAt?: Date;
  reactions: Array<{
    id: string;
    emoji: string;
    memberId: string;
    createdAt: Date;
  }>;
};

/** Generates a list of messages with unique IDs. */
const uniqueMessageListArb = fc
  .uniqueArray(messageArb, {
    comparator: (a, b) => a.id === b.id,
    minLength: 0,
    maxLength: 20,
  })
  .map((arr) =>
    arr.map((m) => ({ ...m, reactions: [...m.reactions] }) as TestMessage),
  );

/** Generates a reaction object. */
const reactionArb = fc.record({
  id: fc.uuid(),
  emoji: fc.constantFrom('👍', '❤️', '😂', '🎉', '🔥', '👀', '✅'),
  memberId: fc.uuid(),
  createdAt: fc.date(),
});

// ─── Property 14: WebSocket message_sent prepends to message list ───────────

describe('Feature: brightchat-frontend, Property 14: WebSocket message_sent prepends to message list', () => {
  /**
   * **Validates: Requirements 7.1**
   *
   * For any existing message list and any new message_sent event,
   * the message list should grow by exactly one and the new message
   * should appear in the list.
   */
  it('should grow the list by exactly one and include the new message', () => {
    fc.assert(
      fc.property(
        uniqueMessageListArb,
        messageArb.map((m) => ({ ...m, reactions: [] }) as TestMessage),
        (messages, newMsg) => {
          // Ensure newMsg has a unique ID not in the existing list
          fc.pre(!messages.some((m) => m.id === newMsg.id));

          const result = applyMessageSent(messages, newMsg);

          // List grows by exactly one
          expect(result.length).toBe(messages.length + 1);

          // New message is in the result
          expect(result.some((m) => m.id === newMsg.id)).toBe(true);

          // New message is at the front (prepended)
          expect(result[0].id).toBe(newMsg.id);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 15: WebSocket message_edited updates in place ─────────────────

describe('Feature: brightchat-frontend, Property 15: WebSocket message_edited updates in place', () => {
  /**
   * **Validates: Requirements 7.2**
   *
   * For any message list containing a message with ID X, and any
   * message_edited event for message X, the message at that position
   * should have its encryptedContent and editedAt updated, and the
   * list length should remain unchanged.
   */
  it('should update content in place without changing list length', () => {
    fc.assert(
      fc.property(
        uniqueMessageListArb.filter((msgs) => msgs.length > 0),
        fc.string({ minLength: 1, maxLength: 200 }),
        fc.date(),
        (messages, newContent, editedAt) => {
          // Pick a random message from the list to edit
          const targetIndex = Math.floor(Math.random() * messages.length);
          const targetId = messages[targetIndex].id;

          const editedMsg: TestMessage = {
            ...messages[targetIndex],
            encryptedContent: newContent,
            editedAt,
          };

          const result = applyMessageEdited(messages, editedMsg);

          // List length unchanged
          expect(result.length).toBe(messages.length);

          // The edited message has updated content
          const updated = result.find((m) => m.id === targetId);
          expect(updated).toBeDefined();
          expect(updated!.encryptedContent).toBe(newContent);
          expect(updated!.editedAt).toBe(editedAt);

          // All other messages are unchanged
          for (const m of result) {
            if (m.id !== targetId) {
              const original = messages.find((o) => o.id === m.id);
              expect(m.encryptedContent).toBe(original!.encryptedContent);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 16: WebSocket message_deleted removes from list ───────────────

describe('Feature: brightchat-frontend, Property 16: WebSocket message_deleted removes from list', () => {
  /**
   * **Validates: Requirements 7.3**
   *
   * For any message list containing a message with ID X, and any
   * message_deleted event for message X, the resulting list should
   * have length reduced by one and should not contain message X.
   */
  it('should shrink the list by one and remove the target message', () => {
    fc.assert(
      fc.property(
        uniqueMessageListArb.filter((msgs) => msgs.length > 0),
        (messages) => {
          // Pick a random message to delete
          const targetIndex = Math.floor(Math.random() * messages.length);
          const targetId = messages[targetIndex].id;

          const result = applyMessageDeleted(messages, targetId);

          // List shrinks by exactly one
          expect(result.length).toBe(messages.length - 1);

          // Deleted message is not in the result
          expect(result.some((m) => m.id === targetId)).toBe(false);

          // All other messages are still present
          for (const m of messages) {
            if (m.id !== targetId) {
              expect(result.some((r) => r.id === m.id)).toBe(true);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 17: Typing indicator round-trip ───────────────────────────────

describe('Feature: brightchat-frontend, Property 17: Typing indicator round-trip', () => {
  /**
   * **Validates: Requirements 7.4, 7.5**
   *
   * For any member ID, receiving a typing_start event should add that
   * member to the typing indicators set, and subsequently receiving a
   * typing_stop event for the same member should remove them, restoring
   * the typing indicators to their original state.
   */
  it('should add on typing_start and remove on typing_stop, restoring original state', () => {
    const memberIdArb = fc.uuid();
    const existingMembersArb = fc.uniqueArray(fc.uuid(), {
      minLength: 0,
      maxLength: 10,
    });

    fc.assert(
      fc.property(
        existingMembersArb,
        memberIdArb,
        (existingMembers, memberId) => {
          // Ensure the new member is not already in the set
          fc.pre(!existingMembers.includes(memberId));

          const original = new Set(existingMembers);

          // typing_start adds the member
          const afterStart = applyTypingStart(original, memberId);
          expect(afterStart.size).toBe(original.size + 1);
          expect(afterStart.has(memberId)).toBe(true);

          // typing_stop removes the member, restoring original state
          const afterStop = applyTypingStop(afterStart, memberId);
          expect(afterStop.size).toBe(original.size);
          expect(afterStop.has(memberId)).toBe(false);

          // All original members are still present
          for (const m of existingMembers) {
            expect(afterStop.has(m)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 18: WebSocket reaction events update message reactions ────────

describe('Feature: brightchat-frontend, Property 18: WebSocket reaction events update message reactions', () => {
  /**
   * **Validates: Requirements 7.6**
   *
   * For any message in the list and any reaction_added event, the
   * message's reaction list should grow by one. For any reaction_removed
   * event referencing an existing reaction, the reaction list should
   * shrink by one.
   */
  it('should grow reactions by one on add and shrink by one on remove', () => {
    fc.assert(
      fc.property(
        uniqueMessageListArb.filter((msgs) => msgs.length > 0),
        reactionArb,
        (messages, newReaction) => {
          // Pick a random message to add a reaction to
          const targetIndex = Math.floor(Math.random() * messages.length);
          const targetId = messages[targetIndex].id;
          const originalReactionCount = messages[targetIndex].reactions.length;

          // reaction_added grows the reaction list by one
          const afterAdd = applyReactionAdded(messages, targetId, newReaction);
          const targetAfterAdd = afterAdd.find((m) => m.id === targetId)!;
          expect(targetAfterAdd.reactions.length).toBe(
            originalReactionCount + 1,
          );
          expect(
            targetAfterAdd.reactions.some((r) => r.id === newReaction.id),
          ).toBe(true);

          // List length unchanged
          expect(afterAdd.length).toBe(messages.length);

          // reaction_removed shrinks the reaction list by one
          const afterRemove = applyReactionRemoved(
            afterAdd,
            targetId,
            newReaction.id,
          );
          const targetAfterRemove = afterRemove.find((m) => m.id === targetId)!;
          expect(targetAfterRemove.reactions.length).toBe(
            originalReactionCount,
          );
          expect(
            targetAfterRemove.reactions.some((r) => r.id === newReaction.id),
          ).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 19: WebSocket presence_changed updates member status ──────────

describe('Feature: brightchat-frontend, Property 19: WebSocket presence_changed updates member status', () => {
  /**
   * **Validates: Requirements 7.7**
   *
   * For any presence_changed event with a valid PresenceStatus, the
   * displayed presence for that member should match the new status value.
   */
  it('should update the presence map to reflect the new status', () => {
    const memberIdArb = fc.uuid();
    const statusArb = fc.constantFrom(
      PresenceStatusEnum.ONLINE,
      PresenceStatusEnum.OFFLINE,
      PresenceStatusEnum.IDLE,
      PresenceStatusEnum.DO_NOT_DISTURB,
    );
    const existingEntriesArb = fc.array(
      fc.tuple(fc.uuid(), fc.constantFrom('online', 'offline', 'idle', 'dnd')),
      { minLength: 0, maxLength: 10 },
    );

    fc.assert(
      fc.property(
        existingEntriesArb,
        memberIdArb,
        statusArb,
        (existingEntries, memberId, status) => {
          const presenceMap = new Map<string, string>(existingEntries);

          const result = applyPresenceChanged(presenceMap, memberId, status);

          // The member's status matches the event
          expect(result.get(memberId)).toBe(status);

          // All other entries are preserved
          for (const [key, value] of presenceMap) {
            if (key !== memberId) {
              expect(result.get(key)).toBe(value);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 20: WebSocket member events update member list ────────────────

describe('Feature: brightchat-frontend, Property 20: WebSocket member events update member list', () => {
  /**
   * **Validates: Requirements 7.8**
   *
   * For any member_joined event, the member list should grow by one.
   * For any member_left event, the member list should shrink by one.
   */
  it('should grow on member_joined and shrink on member_left', () => {
    const existingMembersArb = fc.uniqueArray(fc.uuid(), {
      minLength: 0,
      maxLength: 15,
    });
    const newMemberArb = fc.uuid();

    fc.assert(
      fc.property(
        existingMembersArb,
        newMemberArb,
        (existingMembers, newMember) => {
          // Ensure the new member is not already in the list
          fc.pre(!existingMembers.includes(newMember));

          // member_joined grows the list by one
          const afterJoin = applyMemberJoined(existingMembers, newMember);
          expect(afterJoin.length).toBe(existingMembers.length + 1);
          expect(afterJoin.includes(newMember)).toBe(true);

          // member_left shrinks the list by one
          const afterLeave = applyMemberLeft(afterJoin, newMember);
          expect(afterLeave.length).toBe(existingMembers.length);
          expect(afterLeave.includes(newMember)).toBe(false);

          // All original members are still present after join+leave
          for (const m of existingMembers) {
            expect(afterLeave.includes(m)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
