/**
 * Property-based tests for ChannelService — Property 7: Ciphertext preservation after key rotation.
 *
 * Feature: brightchat-e2e-encryption, Property 7: Ciphertext preservation after key rotation
 *
 * **Validates: Requirements 3.6, 11.5**
 *
 * For any context containing stored messages and/or attachment CBL assets, after a key
 * rotation event, all previously stored `encryptedContent` bytes and attachment CBL asset
 * bytes SHALL be byte-identical to their pre-rotation values.
 *
 * Generator strategy: Random messages stored, then rotation triggered.
 *
 * Test approach:
 * 1. Create a channel with 2+ members
 * 2. Send several messages with random content
 * 3. Record the `encryptedContent` of each message
 * 4. Trigger key rotation (by having a member leave)
 * 5. Retrieve messages again
 * 6. Verify all `encryptedContent` values are byte-identical to pre-rotation values
 */

import fc from 'fast-check';
import { ChannelVisibility } from '../../../enumerations/communication';
import { ChannelService } from '../channelService';
import { PermissionService } from '../permissionService';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for non-empty message content strings. */
const arbMessageContent = fc
  .string({ minLength: 1, maxLength: 5000 })
  .filter((s) => s.trim().length > 0);

/** Arbitrary for a list of message contents to send (1–10 messages). */
const arbMessageList = fc.array(arbMessageContent, { minLength: 1, maxLength: 10 });

/** Arbitrary for a random member ID (UUID). */
const arbMemberId = fc.uuid();

/** Arbitrary for a random channel name. */
const arbChannelName = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => /[a-zA-Z]/.test(s))
  .map((s) => s.replace(/\s+/g, '-'));

/**
 * Arbitrary for additional member IDs to join the channel (1–5 extra members).
 * At least 1 additional member is needed so one can leave to trigger rotation.
 */
const arbAdditionalMembers = fc
  .uniqueArray(fc.uuid(), { minLength: 1, maxLength: 5 })
  .filter((arr) => arr.length >= 1);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 7: Ciphertext preservation after key rotation', () => {
  /**
   * Property 7: Ciphertext preservation after key rotation
   *
   * **Validates: Requirements 3.6, 11.5**
   *
   * After rotation, all stored `encryptedContent` bytes are byte-identical
   * to pre-rotation values.
   */
  it('should preserve all encryptedContent byte-identical after key rotation', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbChannelName,
        arbAdditionalMembers,
        arbMessageList,
        async (creatorId, channelName, additionalMembers, messageContents) => {
          // Ensure no additional member collides with the creator
          const joiners = additionalMembers.filter((id) => id !== creatorId);
          if (joiners.length === 0) return; // need at least one joiner to leave

          // Fresh service instances per iteration
          const permissionService = new PermissionService();
          const channelService = new ChannelService(permissionService);

          // 1. Create a channel with the creator
          const channel = await channelService.createChannel(
            channelName,
            creatorId,
            ChannelVisibility.PUBLIC,
          );

          // Join additional members
          for (const joinerId of joiners) {
            await channelService.joinChannel(channel.id, joinerId);
          }

          // 2. Send several messages
          for (const content of messageContents) {
            await channelService.sendMessage(channel.id, creatorId, content);
          }

          // 3. Record the encryptedContent of each message before rotation
          const preRotationResult = await channelService.getMessages(
            channel.id,
            creatorId,
          );
          const preRotationMessages = preRotationResult.items;

          // Snapshot: map messageId → encryptedContent
          const preRotationSnapshot = new Map<string, string>(
            preRotationMessages.map((m) => [m.id, m.encryptedContent]),
          );

          expect(preRotationSnapshot.size).toBe(messageContents.length);

          // 4. Trigger key rotation by having the first joiner leave
          const leavingMember = joiners[0];
          await channelService.leaveChannel(channel.id, leavingMember);

          // 5. Retrieve messages again after rotation
          const postRotationResult = await channelService.getMessages(
            channel.id,
            creatorId,
          );
          const postRotationMessages = postRotationResult.items;

          // 6. Verify all encryptedContent values are byte-identical
          expect(postRotationMessages.length).toBe(preRotationSnapshot.size);

          for (const msg of postRotationMessages) {
            const preContent = preRotationSnapshot.get(msg.id);
            expect(preContent).toBeDefined();
            // Byte-identical comparison
            expect(msg.encryptedContent).toBe(preContent);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
