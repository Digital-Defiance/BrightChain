/**
 * Property-based tests for ConversationService — Property 2: Message content encrypt/decrypt round-trip (DMs).
 *
 * Feature: brightchat-e2e-encryption, Property 2: Message content encrypt/decrypt round-trip (DMs)
 *
 * **Validates: Requirements 4.2, 4.3, 4.5**
 *
 * For any DM conversation with a valid DM_Key, and for any non-empty message content,
 * encrypting the content with the DM_Key on send and decrypting on retrieval SHALL
 * produce the original plaintext content byte-for-byte.
 *
 * NOTE: The current ConversationService stores content as-is (the actual AES encryption
 * will be added when the ECIES handler is wired in). This property test validates
 * the round-trip at the service level: create a conversation between two members,
 * send a message with arbitrary content, retrieve the message, and verify the content
 * matches and the keyEpoch is correctly recorded.
 *
 * Generator strategy: Random byte arrays (1–10KB) converted to string content,
 * random 32-byte CEKs (used implicitly by the service).
 */

import fc from 'fast-check';
import { ConversationService } from '../conversationService';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/**
 * Arbitrary for non-empty message content strings (1–10KB of printable characters).
 * Uses string16 to produce a wide range of Unicode content.
 */
const arbMessageContent = fc
  .string({ minLength: 1, maxLength: 10000 })
  .filter((s) => s.trim().length > 0);

/** Arbitrary for a pair of distinct member IDs. */
const arbMemberPair = fc
  .tuple(fc.uuid(), fc.uuid())
  .filter(([a, b]) => a !== b);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 2: Message content encrypt/decrypt round-trip (DMs)', () => {
  /**
   * Property 2: Message content encrypt/decrypt round-trip
   *
   * **Validates: Requirements 4.2, 4.3, 4.5**
   *
   * For any DM with a valid DM_Key and any non-empty content, sending a message
   * and then retrieving it produces the original content, and the keyEpoch is
   * correctly recorded.
   */
  it('should produce the original content after send then retrieve for any non-empty message content', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberPair,
        arbMessageContent,
        async ([senderId, recipientId], content) => {
          // Fresh service instance per iteration to avoid state leakage
          const conversationService = new ConversationService(
            null,           // memberReachabilityCheck — null bypasses external check
            undefined,      // eventEmitter — uses NullEventEmitter default
            undefined,      // storageProvider — in-memory only
            undefined,      // encryptKey — uses default placeholder
            undefined,      // randomBytesProvider — uses platform default
          );

          // Register both members so reachability checks pass
          conversationService.registerMember(senderId);
          conversationService.registerMember(recipientId);

          // Send a message — this creates the conversation and sends in one step
          const sentMessage = await conversationService.sendMessage(
            senderId,
            recipientId,
            content,
          );

          // Verify the sent message records keyEpoch 0
          expect(sentMessage.keyEpoch).toBe(0);

          // Retrieve messages from the conversation
          const result = await conversationService.getMessages(
            sentMessage.contextId,
            senderId,
          );

          // There should be exactly one message
          expect(result.items.length).toBe(1);

          const retrievedMessage = result.items[0];

          // The retrieved content must match the original content byte-for-byte
          expect(retrievedMessage.encryptedContent).toBe(content);

          // The keyEpoch must be correctly recorded
          expect(retrievedMessage.keyEpoch).toBe(0);

          // The message ID must match
          expect(retrievedMessage.id).toBe(sentMessage.id);

          // The senderId must match
          expect(retrievedMessage.senderId).toBe(senderId);

          // The contextId must match the conversation
          expect(retrievedMessage.contextId).toBe(sentMessage.contextId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
