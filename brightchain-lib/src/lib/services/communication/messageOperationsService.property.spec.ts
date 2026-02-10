/**
 * Property-based tests for MessageOperationsService
 * Feature: api-lib-to-lib-migration
 *
 * These tests validate universal properties of the message operations service
 * using fast-check for property-based testing.
 *
 * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
 */

import fc from 'fast-check';
import { DefaultRole } from '../../enumerations/communication';
import { ICommunicationMessage } from '../../interfaces/communication';
import {
  IPinnableContext,
  MessageAuthorError,
  MessageNotFoundError,
  MessageOperationsService,
  MessagePermissionError,
  MessageReactionNotFoundError,
} from './messageOperationsService';
import { PermissionService } from './permissionService';

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Arbitrary for non-empty alphanumeric IDs
 */
const idArb = fc.stringMatching(/^[a-zA-Z0-9]{1,36}$/);

/**
 * Arbitrary for non-empty message content strings
 */
const contentArb = fc.string({ minLength: 1, maxLength: 200 });

/**
 * Arbitrary for emoji strings
 */
const emojiArb = fc.constantFrom(
  '👍',
  '❤️',
  '😂',
  '🎉',
  '🔥',
  '👀',
  '✅',
  '🚀',
);

/**
 * Create a fresh ICommunicationMessage with the given id and senderId.
 */
function makeMessage(
  id: string,
  senderId: string,
  content: string,
  contextId: string,
): ICommunicationMessage {
  return {
    id,
    contextType: 'group',
    contextId,
    senderId,
    encryptedContent: content,
    createdAt: new Date(),
    editHistory: [],
    deleted: false,
    pinned: false,
    reactions: [],
  };
}

// ─── Property 18: Message Edit History Preservation ─────────────────────────

describe('Feature: api-lib-to-lib-migration, Property 18: Message Edit History Preservation', () => {
  /**
   * Property 18: Message Edit History Preservation
   *
   * *For any* message edited with new content, the message SHALL have the
   * new content as encryptedContent, the old content in editHistory, and
   * editedAt set to a recent timestamp.
   *
   * **Validates: Requirements 9.1**
   */
  it('editing a message updates content, preserves old content in editHistory, and sets editedAt', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        contentArb,
        contentArb,
        (messageId, senderId, contextId, originalContent, newContent) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const message = makeMessage(
            messageId,
            senderId,
            originalContent,
            contextId,
          );
          const messages = [message];

          const before = Date.now();
          const result = service.editMessage(
            messages,
            messageId,
            senderId,
            newContent,
            (id) => new MessageNotFoundError(id),
            () => new MessageAuthorError(),
          );
          const after = Date.now();

          // New content is set
          expect(result.encryptedContent).toBe(newContent);

          // Old content is preserved in editHistory
          expect(result.editHistory.length).toBe(1);
          expect(result.editHistory[0].content).toBe(originalContent);

          // editedAt is set to a recent timestamp
          expect(result.editedAt).toBeDefined();
          expect(result.editedAt!.getTime()).toBeGreaterThanOrEqual(before);
          expect(result.editedAt!.getTime()).toBeLessThanOrEqual(after);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('multiple edits accumulate in editHistory in order', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        fc.array(contentArb, { minLength: 2, maxLength: 5 }),
        (messageId, senderId, contextId, contents) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const initialContent = contents[0];
          const message = makeMessage(
            messageId,
            senderId,
            initialContent,
            contextId,
          );
          const messages = [message];

          // Apply edits for contents[1..n]
          for (let i = 1; i < contents.length; i++) {
            service.editMessage(
              messages,
              messageId,
              senderId,
              contents[i],
              (id) => new MessageNotFoundError(id),
              () => new MessageAuthorError(),
            );
          }

          // Final content should be the last in the array
          expect(message.encryptedContent).toBe(contents[contents.length - 1]);

          // editHistory should have (contents.length - 1) entries
          expect(message.editHistory.length).toBe(contents.length - 1);

          // Each history entry should match the content before that edit
          for (let i = 0; i < message.editHistory.length; i++) {
            expect(message.editHistory[i].content).toBe(contents[i]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('editing by a non-author throws an error', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        contentArb,
        contentArb,
        (messageId, contextId, originalContent, newContent, senderId) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          // Use deterministic different IDs for sender vs editor
          const authorId = senderId + '_author';
          const editorId = senderId + '_editor';

          const message = makeMessage(
            messageId,
            authorId,
            originalContent,
            contextId,
          );
          const messages = [message];

          expect(() =>
            service.editMessage(
              messages,
              messageId,
              editorId,
              newContent,
              (id) => new MessageNotFoundError(id),
              () => new MessageAuthorError(),
            ),
          ).toThrow(MessageAuthorError);

          // Content should remain unchanged
          expect(message.encryptedContent).toBe(originalContent);
          expect(message.editHistory.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 19: Message Delete Authorization ──────────────────────────────

describe('Feature: api-lib-to-lib-migration, Property 19: Message Delete Authorization', () => {
  /**
   * Property 19: Message Delete Authorization
   *
   * *For any* message, the author SHALL be able to delete it; non-authors
   * SHALL only delete if they have DELETE_ANY_MESSAGE permission.
   *
   * **Validates: Requirements 9.2**
   */
  it('the author can always delete their own message', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        contentArb,
        (messageId, senderId, contextId, content) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const message = makeMessage(messageId, senderId, content, contextId);
          const messages = [message];

          service.deleteMessage(
            messages,
            contextId,
            messageId,
            senderId,
            (id) => new MessageNotFoundError(id),
            (p) => new MessagePermissionError(p),
          );

          expect(message.deleted).toBe(true);
          expect(message.deletedBy).toBe(senderId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a non-author with DELETE_ANY_MESSAGE permission can delete the message', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        contentArb,
        (messageId, senderId, contextId, content) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const authorId = senderId + '_author';
          const moderatorId = senderId + '_mod';

          // Give the moderator a role that includes DELETE_ANY_MESSAGE
          permService.assignRole(moderatorId, contextId, DefaultRole.MODERATOR);

          const message = makeMessage(messageId, authorId, content, contextId);
          const messages = [message];

          service.deleteMessage(
            messages,
            contextId,
            messageId,
            moderatorId,
            (id) => new MessageNotFoundError(id),
            (p) => new MessagePermissionError(p),
          );

          expect(message.deleted).toBe(true);
          expect(message.deletedBy).toBe(moderatorId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a non-author without DELETE_ANY_MESSAGE permission cannot delete the message', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        contentArb,
        (messageId, senderId, contextId, content) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const authorId = senderId + '_author';
          const memberId = senderId + '_member';

          // MEMBER role does NOT include DELETE_ANY_MESSAGE
          permService.assignRole(memberId, contextId, DefaultRole.MEMBER);

          const message = makeMessage(messageId, authorId, content, contextId);
          const messages = [message];

          expect(() =>
            service.deleteMessage(
              messages,
              contextId,
              messageId,
              memberId,
              (id) => new MessageNotFoundError(id),
              (p) => new MessagePermissionError(p),
            ),
          ).toThrow(MessagePermissionError);

          // Message should remain undeleted
          expect(message.deleted).toBe(false);
          expect(message.deletedBy).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a non-author with no role at all cannot delete the message', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        contentArb,
        (messageId, senderId, contextId, content) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const authorId = senderId + '_author';
          const nobodyId = senderId + '_nobody';

          const message = makeMessage(messageId, authorId, content, contextId);
          const messages = [message];

          expect(() =>
            service.deleteMessage(
              messages,
              contextId,
              messageId,
              nobodyId,
              (id) => new MessageNotFoundError(id),
              (p) => new MessagePermissionError(p),
            ),
          ).toThrow(MessagePermissionError);

          expect(message.deleted).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 20: Message Pin/Unpin State ───────────────────────────────────

describe('Feature: api-lib-to-lib-migration, Property 20: Message Pin/Unpin State', () => {
  /**
   * Property 20: Message Pin/Unpin State
   *
   * *For any* message pinned in a context, the message.pinned SHALL be true
   * and the context.pinnedMessageIds SHALL contain the message ID; after
   * unpinning, both SHALL be false/not contain.
   *
   * **Validates: Requirements 9.3**
   */
  it('pinning a message sets pinned=true and adds ID to context.pinnedMessageIds', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        idArb,
        contentArb,
        (messageId, senderId, contextId, memberId, content) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          // Grant PIN_MESSAGES permission
          permService.assignRole(memberId, contextId, DefaultRole.MODERATOR);

          const message = makeMessage(messageId, senderId, content, contextId);
          const messages = [message];
          const context: IPinnableContext = { pinnedMessageIds: [] };

          service.pinMessage(
            messages,
            contextId,
            messageId,
            memberId,
            context,
            (id) => new MessageNotFoundError(id),
            (p) => new MessagePermissionError(p),
          );

          expect(message.pinned).toBe(true);
          expect(context.pinnedMessageIds).toContain(messageId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('unpinning a message sets pinned=false and removes ID from context.pinnedMessageIds', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        idArb,
        contentArb,
        (messageId, senderId, contextId, memberId, content) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          // Grant PIN_MESSAGES permission
          permService.assignRole(memberId, contextId, DefaultRole.MODERATOR);

          const message = makeMessage(messageId, senderId, content, contextId);
          message.pinned = true;
          const messages = [message];
          const context: IPinnableContext = { pinnedMessageIds: [messageId] };

          service.unpinMessage(
            messages,
            contextId,
            messageId,
            memberId,
            context,
            (id) => new MessageNotFoundError(id),
            (p) => new MessagePermissionError(p),
          );

          expect(message.pinned).toBe(false);
          expect(context.pinnedMessageIds).not.toContain(messageId);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('pin then unpin round-trip restores original state', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        idArb,
        contentArb,
        (messageId, senderId, contextId, memberId, content) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          permService.assignRole(memberId, contextId, DefaultRole.MODERATOR);

          const message = makeMessage(messageId, senderId, content, contextId);
          const messages = [message];
          const context: IPinnableContext = { pinnedMessageIds: [] };

          // Pin
          service.pinMessage(
            messages,
            contextId,
            messageId,
            memberId,
            context,
            (id) => new MessageNotFoundError(id),
            (p) => new MessagePermissionError(p),
          );
          expect(message.pinned).toBe(true);
          expect(context.pinnedMessageIds).toContain(messageId);

          // Unpin
          service.unpinMessage(
            messages,
            contextId,
            messageId,
            memberId,
            context,
            (id) => new MessageNotFoundError(id),
            (p) => new MessagePermissionError(p),
          );
          expect(message.pinned).toBe(false);
          expect(context.pinnedMessageIds).not.toContain(messageId);
          expect(context.pinnedMessageIds.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('pinning without PIN_MESSAGES permission throws an error', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        idArb,
        contentArb,
        (messageId, senderId, contextId, memberId, content) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          // MEMBER role does NOT include PIN_MESSAGES
          permService.assignRole(memberId, contextId, DefaultRole.MEMBER);

          const message = makeMessage(messageId, senderId, content, contextId);
          const messages = [message];
          const context: IPinnableContext = { pinnedMessageIds: [] };

          expect(() =>
            service.pinMessage(
              messages,
              contextId,
              messageId,
              memberId,
              context,
              (id) => new MessageNotFoundError(id),
              (p) => new MessagePermissionError(p),
            ),
          ).toThrow(MessagePermissionError);

          expect(message.pinned).toBe(false);
          expect(context.pinnedMessageIds.length).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 21: Message Reaction Management ───────────────────────────────

describe('Feature: api-lib-to-lib-migration, Property 21: Message Reaction Management', () => {
  /**
   * Property 21: Message Reaction Management
   *
   * *For any* reaction added to a message, the message.reactions SHALL
   * contain an entry with the emoji and member ID; after removal, it
   * SHALL not contain that reaction.
   *
   * **Validates: Requirements 9.4**
   */
  it('adding a reaction places it in message.reactions with correct emoji and memberId', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        contentArb,
        emojiArb,
        (messageId, senderId, memberId, content, emoji) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const message = makeMessage(messageId, senderId, content, 'ctx1');
          const messages = [message];

          const reactionId = service.addReaction(
            messages,
            messageId,
            memberId,
            emoji,
            (id) => new MessageNotFoundError(id),
          );

          // Reaction should exist in the message
          const reaction = message.reactions.find((r) => r.id === reactionId);
          expect(reaction).toBeDefined();
          expect(reaction!.emoji).toBe(emoji);
          expect(reaction!.memberId).toBe(memberId);
          expect(reaction!.createdAt).toBeInstanceOf(Date);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('removing a reaction removes it from message.reactions', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        contentArb,
        emojiArb,
        (messageId, senderId, memberId, content, emoji) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const message = makeMessage(messageId, senderId, content, 'ctx1');
          const messages = [message];

          // Add then remove
          const reactionId = service.addReaction(
            messages,
            messageId,
            memberId,
            emoji,
            (id) => new MessageNotFoundError(id),
          );

          expect(message.reactions.length).toBe(1);

          service.removeReaction(
            messages,
            messageId,
            reactionId,
            (id) => new MessageNotFoundError(id),
            (id) => new MessageReactionNotFoundError(id),
          );

          expect(message.reactions.length).toBe(0);
          expect(
            message.reactions.find((r) => r.id === reactionId),
          ).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('adding multiple reactions accumulates them all', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        contentArb,
        fc.array(fc.tuple(idArb, emojiArb), { minLength: 2, maxLength: 5 }),
        (messageId, senderId, content, memberEmojiPairs) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const message = makeMessage(messageId, senderId, content, 'ctx1');
          const messages = [message];

          const reactionIds: string[] = [];
          for (const [memberId, emoji] of memberEmojiPairs) {
            const rid = service.addReaction(
              messages,
              messageId,
              memberId,
              emoji,
              (id) => new MessageNotFoundError(id),
            );
            reactionIds.push(rid);
          }

          expect(message.reactions.length).toBe(memberEmojiPairs.length);

          // Each reaction should be findable
          for (let i = 0; i < reactionIds.length; i++) {
            const reaction = message.reactions.find(
              (r) => r.id === reactionIds[i],
            );
            expect(reaction).toBeDefined();
            expect(reaction!.emoji).toBe(memberEmojiPairs[i][1]);
            expect(reaction!.memberId).toBe(memberEmojiPairs[i][0]);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('removing one reaction does not affect other reactions on the same message', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        contentArb,
        emojiArb,
        emojiArb,
        (messageId, senderId, content, emoji1, emoji2) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const member1 = senderId + '_m1';
          const member2 = senderId + '_m2';

          const message = makeMessage(messageId, senderId, content, 'ctx1');
          const messages = [message];

          const reactionId1 = service.addReaction(
            messages,
            messageId,
            member1,
            emoji1,
            (id) => new MessageNotFoundError(id),
          );
          const reactionId2 = service.addReaction(
            messages,
            messageId,
            member2,
            emoji2,
            (id) => new MessageNotFoundError(id),
          );

          expect(message.reactions.length).toBe(2);

          // Remove first reaction
          service.removeReaction(
            messages,
            messageId,
            reactionId1,
            (id) => new MessageNotFoundError(id),
            (id) => new MessageReactionNotFoundError(id),
          );

          // Second reaction should still be present
          expect(message.reactions.length).toBe(1);
          expect(message.reactions[0].id).toBe(reactionId2);
          expect(message.reactions[0].emoji).toBe(emoji2);
          expect(message.reactions[0].memberId).toBe(member2);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('removing a non-existent reaction throws ReactionNotFoundError', () => {
    fc.assert(
      fc.property(
        idArb,
        idArb,
        idArb,
        contentArb,
        (messageId, senderId, fakeReactionId, content) => {
          const permService = new PermissionService();
          const service = new MessageOperationsService(permService);

          const message = makeMessage(messageId, senderId, content, 'ctx1');
          const messages = [message];

          expect(() =>
            service.removeReaction(
              messages,
              messageId,
              fakeReactionId,
              (id) => new MessageNotFoundError(id),
              (id) => new MessageReactionNotFoundError(id),
            ),
          ).toThrow(MessageReactionNotFoundError);
        },
      ),
      { numRuns: 100 },
    );
  });
});
