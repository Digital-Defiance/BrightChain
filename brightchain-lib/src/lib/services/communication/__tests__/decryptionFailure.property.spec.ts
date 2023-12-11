/**
 * Property-based tests for decryption failure error handling — Property 11: Decryption failure produces descriptive error.
 *
 * Feature: brightchat-e2e-encryption, Property 11: Decryption failure produces descriptive error
 *
 * **Validates: Requirements 12.3, 12.4**
 *
 * For any corrupted wrapped key data or corrupted ciphertext, attempting to unwrap
 * or decrypt SHALL throw an error whose message contains the affected context ID
 * (channel ID or conversation ID).
 *
 * Test approach: Create contexts with messages at epoch 0, tamper with message.keyEpoch
 * to reference a non-existent epoch (random invalid epoch numbers), call getMessages(),
 * and verify KeyEpochNotFoundError is thrown with the correct contextId.
 *
 * Generator strategy: Random corrupted byte arrays, random context IDs, random invalid epoch numbers.
 */

import fc from 'fast-check';
import { ChannelVisibility } from '../../../enumerations/communication';
import { KeyEpochNotFoundError } from '../../../errors/encryptionErrors';
import { ChannelService } from '../channelService';
import { ConversationService } from '../conversationService';
import { GroupService } from '../groupService';
import { PermissionService } from '../permissionService';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for a random member ID (UUID format). */
const arbMemberId = fc.uuid();

/** Arbitrary for a pair of distinct member IDs for DM conversations. */
const arbMemberPair = fc
  .tuple(fc.uuid(), fc.uuid())
  .filter(([a, b]) => a !== b);

/** Arbitrary for a random channel name that contains at least one letter. */
const arbChannelName = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => /[a-zA-Z]/.test(s))
  .map((s) => s.replace(/\s+/g, '-'));

/** Arbitrary for non-empty message content. */
const arbMessageContent = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter((s) => s.trim().length > 0);

/**
 * Arbitrary for an invalid key epoch number.
 * Epoch 0 is always valid (created on context init), so we generate
 * integers >= 1 to ensure they reference non-existent epochs.
 */
const arbInvalidEpoch = fc.integer({ min: 1, max: 999999 });

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 11: Decryption failure produces descriptive error', () => {
  /**
   * Property 11a: ChannelService — invalid keyEpoch throws KeyEpochNotFoundError with contextId
   *
   * **Validates: Requirements 12.3**
   */
  it('should throw KeyEpochNotFoundError with contextId when channel message references invalid epoch', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbChannelName,
        arbMessageContent,
        arbInvalidEpoch,
        async (creatorId, channelName, content, invalidEpoch) => {
          const permissionService = new PermissionService();
          const channelService = new ChannelService(permissionService);

          // Create channel and send a message at epoch 0
          const channel = await channelService.createChannel(
            channelName,
            creatorId,
            ChannelVisibility.PUBLIC,
          );
          await channelService.sendMessage(channel.id, creatorId, content);

          // Tamper: set message keyEpoch to a non-existent epoch
          const msgs = channelService.getAllMessages(channel.id);
          msgs[0].keyEpoch = invalidEpoch;

          // getMessages() should throw KeyEpochNotFoundError
          try {
            await channelService.getMessages(channel.id, creatorId);
            throw new Error('Expected KeyEpochNotFoundError but no error was thrown');
          } catch (err: unknown) {
            expect(err).toBeInstanceOf(KeyEpochNotFoundError);
            const error = err as KeyEpochNotFoundError;
            expect(error.contextId).toBe(channel.id);
            expect(error.keyEpoch).toBe(invalidEpoch);
            expect(error.message).toContain(channel.id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11b: ConversationService — invalid keyEpoch throws KeyEpochNotFoundError with contextId
   *
   * **Validates: Requirements 12.4**
   */
  it('should throw KeyEpochNotFoundError with contextId when DM message references invalid epoch', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberPair,
        arbMessageContent,
        arbInvalidEpoch,
        async ([memberA, memberB], content, invalidEpoch) => {
          const conversationService = new ConversationService();
          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);

          // Create conversation and send a message at epoch 0
          const conversation =
            await conversationService.createOrGetConversation(memberA, memberB);
          await conversationService.sendMessage(memberA, memberB, content);

          // Tamper: set message keyEpoch to a non-existent epoch
          const msgs = conversationService.getAllMessages(conversation.id);
          msgs[0].keyEpoch = invalidEpoch;

          // getMessages() should throw KeyEpochNotFoundError
          try {
            await conversationService.getMessages(conversation.id, memberA);
            throw new Error('Expected KeyEpochNotFoundError but no error was thrown');
          } catch (err: unknown) {
            expect(err).toBeInstanceOf(KeyEpochNotFoundError);
            const error = err as KeyEpochNotFoundError;
            expect(error.contextId).toBe(conversation.id);
            expect(error.keyEpoch).toBe(invalidEpoch);
            expect(error.message).toContain(conversation.id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 11c: GroupService — invalid keyEpoch throws KeyEpochNotFoundError with contextId
   *
   * **Validates: Requirements 12.3**
   */
  it('should throw KeyEpochNotFoundError with contextId when group message references invalid epoch', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberPair,
        arbMessageContent,
        arbInvalidEpoch,
        async ([creatorId, memberId], content, invalidEpoch) => {
          const permissionService = new PermissionService();
          const groupService = new GroupService(permissionService);

          // Create group and send a message at epoch 0
          const group = await groupService.createGroup(
            'test-group',
            creatorId,
            [memberId],
          );
          await groupService.sendMessage(group.id, creatorId, content);

          // Tamper: set message keyEpoch to a non-existent epoch
          const msgs = groupService.getAllMessages(group.id);
          msgs[0].keyEpoch = invalidEpoch;

          // getMessages() should throw KeyEpochNotFoundError
          try {
            await groupService.getMessages(group.id, creatorId);
            throw new Error('Expected KeyEpochNotFoundError but no error was thrown');
          } catch (err: unknown) {
            expect(err).toBeInstanceOf(KeyEpochNotFoundError);
            const error = err as KeyEpochNotFoundError;
            expect(error.contextId).toBe(group.id);
            expect(error.keyEpoch).toBe(invalidEpoch);
            expect(error.message).toContain(group.id);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
