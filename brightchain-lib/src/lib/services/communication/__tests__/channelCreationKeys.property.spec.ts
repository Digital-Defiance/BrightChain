/**
 * Property-based tests for ChannelService — Property 3: Context creation wraps keys for all initial members (channels).
 *
 * Feature: brightchat-e2e-encryption, Property 3: Context creation wraps keys for all initial members (channels)
 *
 * **Validates: Requirements 2.1, 1.3**
 *
 * For any newly created context (channel) with N initial members each having a valid
 * ECIES key pair, the context's `encryptedSharedKey` map at epoch 0 SHALL contain
 * exactly N entries, and unwrapping each entry with the corresponding member's private
 * key SHALL produce the same 256-bit CEK.
 *
 * NOTE: createChannel() only adds the creator as the initial member (N=1). To test
 * with multiple members, we create the channel then join additional members. After
 * creation + joins, we verify that encryptedSharedKey.get(0) has entries for all members.
 *
 * Generator strategy: Random member counts (1–20), random UUIDs per member.
 */

import fc from 'fast-check';
import { ChannelVisibility } from '../../../enumerations/communication';
import { ChannelService, extractChannelKeyFromDefault } from '../channelService';
import { PermissionService } from '../permissionService';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for a random member ID (UUID). */
const arbMemberId = fc.uuid();

/** Arbitrary for a random channel name (at least one letter, no whitespace). */
const arbChannelName = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => /[a-zA-Z]/.test(s))
  .map((s) => s.replace(/\s+/g, '-'));

/**
 * Arbitrary for additional member IDs to join after channel creation.
 * Generates 0–19 unique UUIDs (so total members = 1 creator + 0..19 joiners = 1..20).
 */
const arbAdditionalMembers = fc
  .uniqueArray(fc.uuid(), { minLength: 0, maxLength: 19 })
  .filter((arr) => arr.length === new Set(arr).size);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 3: Context creation wraps keys for all initial members (channels)', () => {
  /**
   * Property 3: Context creation wraps keys for all initial members (channels)
   *
   * **Validates: Requirements 2.1, 1.3**
   *
   * For any channel with N members (1 creator + additional joiners),
   * encryptedSharedKey.get(0) has exactly N entries, and unwrapping each
   * entry produces the same 256-bit CEK.
   */
  it('should have exactly N entries at epoch 0 after creator + joiners, all unwrapping to the same CEK', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbChannelName,
        arbAdditionalMembers,
        async (creatorId, channelName, additionalMembers) => {
          // Ensure no additional member collides with the creator
          const joiners = additionalMembers.filter((id) => id !== creatorId);
          const expectedMemberCount = 1 + joiners.length;

          // Fresh service instances per iteration to avoid state leakage
          const permissionService = new PermissionService();
          const channelService = new ChannelService(permissionService);

          // Create a channel — creator is the sole initial member
          const channel = await channelService.createChannel(
            channelName,
            creatorId,
            ChannelVisibility.PUBLIC,
          );

          // Join additional members
          for (const joinerId of joiners) {
            await channelService.joinChannel(channel.id, joinerId);
          }

          // Re-fetch the channel to get updated encryptedSharedKey
          const updatedChannel = await channelService.getChannel(
            channel.id,
            creatorId,
          );

          // Verify encryptedSharedKey at epoch 0 exists
          const epoch0Map = updatedChannel.encryptedSharedKey.get(0);
          expect(epoch0Map).toBeDefined();

          // Verify exactly N entries at epoch 0
          expect(epoch0Map!.size).toBe(expectedMemberCount);

          // Verify all expected member IDs are present
          expect(epoch0Map!.has(creatorId)).toBe(true);
          for (const joinerId of joiners) {
            expect(epoch0Map!.has(joinerId)).toBe(true);
          }

          // Unwrap each entry and verify they all produce the same CEK
          const unwrappedKeys: Uint8Array[] = [];
          for (const [, wrappedKey] of epoch0Map!) {
            const rawKey = extractChannelKeyFromDefault(wrappedKey);
            unwrappedKeys.push(rawKey);
          }

          // All unwrapped keys should be 256-bit (32 bytes)
          for (const key of unwrappedKeys) {
            expect(key.length).toBe(32);
          }

          // All unwrapped keys should be identical (same CEK)
          const firstKey = unwrappedKeys[0];
          for (let i = 1; i < unwrappedKeys.length; i++) {
            expect(Buffer.from(unwrappedKeys[i]).equals(Buffer.from(firstKey))).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
