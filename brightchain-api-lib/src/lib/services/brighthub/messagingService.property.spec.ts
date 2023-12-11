/**
 * Property-based tests for Messaging_Service.
 *
 * Tests the following properties:
 * - Property 39: Message Delivery for Followers
 * - Property 40: Message Request for Non-Followers
 * - Property 41: Message Edit Window
 * - Property 42: Message Reaction Limits
 * - Property 43: Group Conversation Participant Limits
 * - Property 44: Group Admin Preservation
 * - Property 45: Conversation Pin Limits
 * - Property 46: Read Receipt Accuracy
 *
 * Validates: Requirements 39-43
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  ConversationType,
  MAX_GROUP_PARTICIPANTS,
  MAX_MESSAGE_LENGTH,
  MAX_PINNED_CONVERSATIONS,
  MAX_REACTIONS_PER_MESSAGE,
  MESSAGE_EDIT_WINDOW_MS,
  MessagingErrorCode,
} from '@brightchain/brighthub-lib';
import fc from 'fast-check';
import { createMessagingService, MessagingService } from './messagingService';
import {
  createMockMessagingApplication,
  setupBlock,
  setupMutualFollow,
  setupOneWayFollow,
} from './messagingService.test-helpers';

describe('Feature: brighthub-social-network, Messaging_Service Property Tests', () => {
  let service: MessagingService;
  let mockApp: ReturnType<typeof createMockMessagingApplication>;

  beforeEach(() => {
    mockApp = createMockMessagingApplication();
    service = createMessagingService(mockApp as any);
  });

  // --- Smart Generators ---

  const userIdArb = fc.uuid();

  const validContentArb = fc
    .string({ minLength: 1, maxLength: MAX_MESSAGE_LENGTH })
    .filter((s) => s.trim().length > 0);

  const tooLongContentArb = fc
    .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
      minLength: MAX_MESSAGE_LENGTH + 1,
      maxLength: MAX_MESSAGE_LENGTH + 100,
    })
    .map((chars) => chars.join(''));

  const emptyContentArb = fc.constantFrom('', '   ', '\n', '\t', '  \n  ');

  const emojiArb = fc.constantFrom(
    '👍',
    '❤️',
    '😂',
    '😮',
    '😢',
    '😡',
    '🎉',
    '🔥',
    '👀',
    '💯',
    '🙏',
    '✅',
  );

  const groupNameArb = fc
    .string({ minLength: 1, maxLength: 50 })
    .filter((s) => s.trim().length > 0);

  // --- Property Tests ---

  describe('Property 39: Message Delivery for Followers', () => {
    /**
     * Property 39: Message Delivery for Followers
     *
     * WHEN two users mutually follow each other,
     * THEY SHALL be able to message each other directly without a message request.
     *
     * **Validates: Requirements 39.1, 42.4**
     */
    it('should allow direct messaging between mutual followers', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          async (userId1, userId2, content) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            await setupMutualFollow(mockApp, userId1, userId2);

            const canMessage = await service.canMessageDirectly(
              userId1,
              userId2,
            );
            expect(canMessage).toBe(true);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );
            expect(conv.type).toBe(ConversationType.Direct);
            expect(conv.participantIds).toContain(userId1);
            expect(conv.participantIds).toContain(userId2);

            const msg = await service.sendMessage(conv._id, userId1, content);
            expect(msg.senderId).toBe(userId1);
            expect(msg.content).toBe(content);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should prevent messaging blocked users', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId1, userId2) => {
          if (userId1 === userId2) return true;

          mockApp = createMockMessagingApplication();
          service = createMessagingService(mockApp as any);

          await setupBlock(mockApp, userId1, userId2);

          await expect(
            service.createDirectConversation(userId1, userId2),
          ).rejects.toMatchObject({
            code: MessagingErrorCode.UserBlocked,
          });

          return true;
        }),
        { numRuns: 10 },
      );
    });
  });

  describe('Property 40: Message Request for Non-Followers', () => {
    /**
     * Property 40: Message Request for Non-Followers
     *
     * WHEN a user who is not mutually followed tries to message another user,
     * THE system SHALL create a message request instead of delivering directly.
     *
     * **Validates: Requirements 42.1-42.3**
     */
    it('should not allow direct messaging for non-mutual followers', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          async (senderId, recipientId) => {
            if (senderId === recipientId) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            // One-way follow only
            await setupOneWayFollow(mockApp, senderId, recipientId);

            const canMessage = await service.canMessageDirectly(
              senderId,
              recipientId,
            );
            expect(canMessage).toBe(false);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should create and accept message requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          async (senderId, recipientId, preview) => {
            if (senderId === recipientId) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const request = await service.createMessageRequest(
              senderId,
              recipientId,
              preview,
            );
            expect(request.senderId).toBe(senderId);
            expect(request.recipientId).toBe(recipientId);

            const conv = await service.acceptMessageRequest(
              request._id,
              recipientId,
            );
            expect(conv.participantIds).toContain(senderId);
            expect(conv.participantIds).toContain(recipientId);

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should prevent duplicate pending message requests', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          validContentArb,
          async (senderId, recipientId, preview1, preview2) => {
            if (senderId === recipientId) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            await service.createMessageRequest(senderId, recipientId, preview1);

            await expect(
              service.createMessageRequest(senderId, recipientId, preview2),
            ).rejects.toMatchObject({
              code: MessagingErrorCode.MessageRequestAlreadyExists,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe('Property 41: Message Edit Window', () => {
    /**
     * Property 41: Message Edit Window
     *
     * WHEN a user edits a message within 15 minutes of creation,
     * THE edit SHALL succeed and mark the message as edited.
     * WHEN a user edits a message after 15 minutes,
     * THE edit SHALL be rejected.
     *
     * **Validates: Requirements 39.3**
     */
    it('should allow edits within 15-minute window', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          validContentArb,
          async (userId1, userId2, original, updated) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );
            const msg = await service.sendMessage(conv._id, userId1, original);

            const edited = await service.editMessage(msg._id, userId1, updated);
            expect(edited.content).toBe(updated);
            expect(edited.isEdited).toBe(true);
            expect(edited.editedAt).toBeDefined();

            return true;
          },
        ),
        { numRuns: 15 },
      );
    });

    it('should reject edits after 15-minute window', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          validContentArb,
          async (userId1, userId2, original, updated) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );

            // Manually insert a message with old timestamp
            const messagesCollection =
              mockApp.collections.get('brighthub_messages')!;
            const oldTimestamp = new Date(
              Date.now() - MESSAGE_EDIT_WINDOW_MS - 1000,
            ).toISOString();
            const msgId = `old-msg-${Date.now()}-${Math.random()}`;
            messagesCollection.data.push({
              _id: msgId,
              conversationId: conv._id,
              senderId: userId1,
              content: original,
              formattedContent: original,
              attachments: [],
              isEdited: false,
              isDeleted: false,
              createdAt: oldTimestamp,
            } as any);

            await expect(
              service.editMessage(msgId, userId1, updated),
            ).rejects.toMatchObject({
              code: MessagingErrorCode.EditWindowExpired,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should reject edits by non-senders', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          validContentArb,
          async (userId1, userId2, original, updated) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );
            const msg = await service.sendMessage(conv._id, userId1, original);

            await expect(
              service.editMessage(msg._id, userId2, updated),
            ).rejects.toMatchObject({
              code: MessagingErrorCode.Unauthorized,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should reject content exceeding 2000 characters', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          tooLongContentArb,
          async (userId1, userId2, longContent) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );

            await expect(
              service.sendMessage(conv._id, userId1, longContent),
            ).rejects.toMatchObject({
              code: MessagingErrorCode.ContentTooLong,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should reject empty content', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          emptyContentArb,
          async (userId1, userId2, emptyContent) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );

            await expect(
              service.sendMessage(conv._id, userId1, emptyContent),
            ).rejects.toMatchObject({
              code: MessagingErrorCode.EmptyContent,
            });

            return true;
          },
        ),
        { numRuns: 5 },
      );
    });
  });

  describe('Property 42: Message Reaction Limits', () => {
    /**
     * Property 42: Message Reaction Limits
     *
     * THE system SHALL enforce a maximum of 10 unique emoji reactions per message.
     * THE system SHALL prevent duplicate reactions (same user, same emoji).
     *
     * **Validates: Requirements 39.8-39.10**
     */
    it('should enforce unique emoji reaction limit per message', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          async (userId1, userId2, content) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );
            const msg = await service.sendMessage(conv._id, userId1, content);

            // Add MAX_REACTIONS_PER_MESSAGE unique emojis
            const emojis = [
              '👍',
              '❤️',
              '😂',
              '😮',
              '😢',
              '😡',
              '🎉',
              '🔥',
              '👀',
              '💯',
            ];
            for (const emoji of emojis.slice(0, MAX_REACTIONS_PER_MESSAGE)) {
              await service.addReaction(msg._id, userId1, emoji);
            }

            // The 11th unique emoji should fail
            await expect(
              service.addReaction(msg._id, userId2, '🙏'),
            ).rejects.toMatchObject({
              code: MessagingErrorCode.ReactionLimitExceeded,
            });

            return true;
          },
        ),
        { numRuns: 5 },
      );
    });

    it('should prevent duplicate reactions from same user', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          emojiArb,
          async (userId1, userId2, content, emoji) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );
            const msg = await service.sendMessage(conv._id, userId1, content);

            await service.addReaction(msg._id, userId2, emoji);

            await expect(
              service.addReaction(msg._id, userId2, emoji),
            ).rejects.toMatchObject({
              code: MessagingErrorCode.ReactionAlreadyExists,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should allow same emoji from different users', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          emojiArb,
          async (userId1, userId2, content, emoji) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );
            const msg = await service.sendMessage(conv._id, userId1, content);

            const r1 = await service.addReaction(msg._id, userId1, emoji);
            const r2 = await service.addReaction(msg._id, userId2, emoji);

            expect(r1.emoji).toBe(emoji);
            expect(r2.emoji).toBe(emoji);
            expect(r1.userId).toBe(userId1);
            expect(r2.userId).toBe(userId2);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe('Property 43: Group Conversation Participant Limits', () => {
    /**
     * Property 43: Group Conversation Participant Limits
     *
     * THE system SHALL enforce a maximum of 50 participants per group conversation.
     *
     * **Validates: Requirements 40.1, 40.12**
     */
    it('should enforce participant limit on group creation', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, groupNameArb, async (creatorId, name) => {
          mockApp = createMockMessagingApplication();
          service = createMessagingService(mockApp as any);

          // Generate too many participants
          const tooMany: string[] = [];
          for (let i = 0; i < MAX_GROUP_PARTICIPANTS + 5; i++) {
            tooMany.push(`user-${i}-${Date.now()}`);
          }

          await expect(
            service.createGroupConversation(creatorId, tooMany, { name }),
          ).rejects.toMatchObject({
            code: MessagingErrorCode.GroupParticipantLimitExceeded,
          });

          return true;
        }),
        { numRuns: 5 },
      );
    });

    it('should enforce participant limit when adding members', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, groupNameArb, async (creatorId, name) => {
          mockApp = createMockMessagingApplication();
          service = createMessagingService(mockApp as any);

          // Create group near limit
          const nearLimit: string[] = [];
          for (let i = 0; i < MAX_GROUP_PARTICIPANTS - 2; i++) {
            nearLimit.push(`user-${i}-${Date.now()}`);
          }

          const group = await service.createGroupConversation(
            creatorId,
            nearLimit,
            { name },
          );

          // Adding 3 more should exceed limit
          const extras = ['extra-1', 'extra-2', 'extra-3'];
          await expect(
            service.addParticipants(group._id, creatorId, extras),
          ).rejects.toMatchObject({
            code: MessagingErrorCode.GroupParticipantLimitExceeded,
          });

          return true;
        }),
        { numRuns: 5 },
      );
    });
  });

  describe('Property 44: Group Admin Preservation', () => {
    /**
     * Property 44: Group Admin Preservation
     *
     * THE system SHALL prevent the last admin from leaving or being demoted.
     * THE system SHALL always maintain at least one admin in a group.
     *
     * **Validates: Requirements 40.8, 40.10**
     */
    it('should prevent last admin from leaving', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          groupNameArb,
          async (creatorId, otherId, name) => {
            if (creatorId === otherId) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const group = await service.createGroupConversation(
              creatorId,
              [otherId],
              { name },
            );

            // Creator is the only admin, should not be able to leave
            await expect(
              service.leaveGroup(group._id, creatorId),
            ).rejects.toMatchObject({
              code: MessagingErrorCode.LastAdminCannotLeave,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should prevent demoting the last admin', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          groupNameArb,
          async (creatorId, otherId, name) => {
            if (creatorId === otherId) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const group = await service.createGroupConversation(
              creatorId,
              [otherId],
              { name },
            );

            await expect(
              service.demoteFromAdmin(group._id, creatorId, creatorId),
            ).rejects.toMatchObject({
              code: MessagingErrorCode.LastAdminCannotLeave,
            });

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should allow admin to leave after promoting another', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          groupNameArb,
          async (creatorId, otherId, name) => {
            if (creatorId === otherId) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const group = await service.createGroupConversation(
              creatorId,
              [otherId],
              { name },
            );

            // Promote other user to admin
            await service.promoteToAdmin(group._id, creatorId, otherId);

            // Now creator can leave
            await service.leaveGroup(group._id, creatorId);

            // Verify creator is no longer a participant
            const updated = await service.getConversation(group._id, otherId);
            expect(updated.participantIds).not.toContain(creatorId);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });

  describe('Property 45: Conversation Pin Limits', () => {
    /**
     * Property 45: Conversation Pin Limits
     *
     * THE system SHALL enforce a maximum of 10 pinned conversations per user.
     * THE system SHALL prevent duplicate pins.
     *
     * **Validates: Requirements 43.3, 43.4**
     */
    it('should enforce pin limit', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, async (userId) => {
          mockApp = createMockMessagingApplication();
          service = createMessagingService(mockApp as any);

          // Create and pin MAX_PINNED_CONVERSATIONS conversations
          for (let i = 0; i < MAX_PINNED_CONVERSATIONS; i++) {
            const otherId = `other-${i}-${Date.now()}`;
            const conv = await service.createDirectConversation(
              userId,
              otherId,
            );
            await service.pinConversation(conv._id, userId);
          }

          // The next pin should fail
          const extraConv = await service.createDirectConversation(
            userId,
            `extra-${Date.now()}`,
          );
          await expect(
            service.pinConversation(extraConv._id, userId),
          ).rejects.toMatchObject({
            code: MessagingErrorCode.PinLimitExceeded,
          });

          return true;
        }),
        { numRuns: 3 },
      );
    });

    it('should prevent duplicate pins', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId1, userId2) => {
          if (userId1 === userId2) return true;

          mockApp = createMockMessagingApplication();
          service = createMessagingService(mockApp as any);

          const conv = await service.createDirectConversation(userId1, userId2);
          await service.pinConversation(conv._id, userId1);

          await expect(
            service.pinConversation(conv._id, userId1),
          ).rejects.toMatchObject({
            code: MessagingErrorCode.AlreadyPinned,
          });

          return true;
        }),
        { numRuns: 10 },
      );
    });

    it('should allow pin and unpin round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(userIdArb, userIdArb, async (userId1, userId2) => {
          if (userId1 === userId2) return true;

          mockApp = createMockMessagingApplication();
          service = createMessagingService(mockApp as any);

          const conv = await service.createDirectConversation(userId1, userId2);

          await service.pinConversation(conv._id, userId1);
          await service.unpinConversation(conv._id, userId1);

          // Should be able to pin again
          await service.pinConversation(conv._id, userId1);

          return true;
        }),
        { numRuns: 10 },
      );
    });
  });

  describe('Property 46: Read Receipt Accuracy', () => {
    /**
     * Property 46: Read Receipt Accuracy
     *
     * WHEN a user marks messages as read,
     * THE read receipt SHALL accurately reflect the last read message.
     * Subsequent markAsRead calls SHALL update the receipt.
     *
     * **Validates: Requirements 39.5, 39.6**
     */
    it('should accurately track read receipts', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          fc.array(validContentArb, { minLength: 2, maxLength: 5 }),
          async (userId1, userId2, messages) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );

            // Send multiple messages
            const sentMessages = [];
            for (const content of messages) {
              const msg = await service.sendMessage(conv._id, userId1, content);
              sentMessages.push(msg);
            }

            // Mark first message as read
            const receipt1 = await service.markAsRead(
              conv._id,
              userId2,
              sentMessages[0]._id,
            );
            expect(receipt1.lastReadMessageId).toBe(sentMessages[0]._id);
            expect(receipt1.userId).toBe(userId2);
            expect(receipt1.conversationId).toBe(conv._id);

            // Mark last message as read (should update)
            const lastMsg = sentMessages[sentMessages.length - 1];
            const receipt2 = await service.markAsRead(
              conv._id,
              userId2,
              lastMsg._id,
            );
            expect(receipt2.lastReadMessageId).toBe(lastMsg._id);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('should maintain separate receipts per user', async () => {
      await fc.assert(
        fc.asyncProperty(
          userIdArb,
          userIdArb,
          validContentArb,
          validContentArb,
          async (userId1, userId2, content1, content2) => {
            if (userId1 === userId2) return true;

            mockApp = createMockMessagingApplication();
            service = createMessagingService(mockApp as any);

            const conv = await service.createDirectConversation(
              userId1,
              userId2,
            );

            const msg1 = await service.sendMessage(conv._id, userId1, content1);
            const msg2 = await service.sendMessage(conv._id, userId2, content2);

            // Each user reads a different message
            const r1 = await service.markAsRead(conv._id, userId1, msg2._id);
            const r2 = await service.markAsRead(conv._id, userId2, msg1._id);

            expect(r1.lastReadMessageId).toBe(msg2._id);
            expect(r2.lastReadMessageId).toBe(msg1._id);
            expect(r1.userId).toBe(userId1);
            expect(r2.userId).toBe(userId2);

            return true;
          },
        ),
        { numRuns: 10 },
      );
    });
  });
});
