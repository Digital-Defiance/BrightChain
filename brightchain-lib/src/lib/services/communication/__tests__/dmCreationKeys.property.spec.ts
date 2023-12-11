/**
 * Property-based tests for ConversationService — Property 3: Context creation wraps keys for all initial members (DMs).
 *
 * Feature: brightchat-e2e-encryption, Property 3: Context creation wraps keys for all initial members (DMs)
 *
 * **Validates: Requirements 4.1, 4.4**
 *
 * For any newly created DM conversation with 2 participants each having a valid
 * ECIES key pair, the conversation's `encryptedSharedKey` map at epoch 0 SHALL
 * contain exactly 2 entries, and unwrapping each entry with the corresponding
 * member's private key SHALL produce the same 256-bit CEK (DM_Key).
 *
 * Generator strategy: Random pairs of distinct UUIDs for the two participants.
 */

import fc from 'fast-check';
import {
  ConversationService,
  extractConversationKeyFromDefault,
} from '../conversationService';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for a pair of distinct member IDs (UUIDs). */
const arbMemberPair = fc
  .tuple(fc.uuid(), fc.uuid())
  .filter(([a, b]) => a !== b);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 3: Context creation wraps keys for all initial members (DMs)', () => {
  /**
   * Property 3: Context creation wraps keys for all initial members (DMs)
   *
   * **Validates: Requirements 4.1, 4.4**
   *
   * For any newly created DM, encryptedSharedKey.get(0) has exactly 2 entries,
   * both participant IDs are present, and unwrapping each entry produces the
   * same 256-bit DM_Key.
   */
  it('should have exactly 2 entries at epoch 0 for both participants, both unwrapping to the same 32-byte DM_Key', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberPair,
        async ([memberA, memberB]) => {
          // Fresh service instance per iteration to avoid state leakage
          const conversationService = new ConversationService();

          // Register both members so reachability checks pass
          conversationService.registerMember(memberA);
          conversationService.registerMember(memberB);

          // Create a DM conversation between the two members
          const conversation =
            await conversationService.createOrGetConversation(memberA, memberB);

          // Verify encryptedSharedKey at epoch 0 exists
          const epoch0Map = conversation.encryptedSharedKey.get(0);
          expect(epoch0Map).toBeDefined();

          // Verify exactly 2 entries at epoch 0
          expect(epoch0Map!.size).toBe(2);

          // Verify both participant IDs are present
          expect(epoch0Map!.has(memberA)).toBe(true);
          expect(epoch0Map!.has(memberB)).toBe(true);

          // Unwrap both entries and verify they produce the same CEK
          const keyA = extractConversationKeyFromDefault(
            epoch0Map!.get(memberA)!,
          );
          const keyB = extractConversationKeyFromDefault(
            epoch0Map!.get(memberB)!,
          );

          // Both unwrapped keys should be 256-bit (32 bytes)
          expect(keyA.length).toBe(32);
          expect(keyB.length).toBe(32);

          // Both unwrapped keys should be identical (same DM_Key)
          expect(Buffer.from(keyA).equals(Buffer.from(keyB))).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
