/**
 * Property-based tests for GroupService — Property 3: Context creation wraps keys for all initial members (groups).
 *
 * Feature: brightchat-e2e-encryption, Property 3: Context creation wraps keys for all initial members (groups)
 *
 * **Validates: Requirements 5.1**
 *
 * For any newly created context (group) with N initial members each having a valid
 * ECIES key pair, the context's `encryptedSharedKey` map at epoch 0 SHALL contain
 * exactly N entries, and unwrapping each entry with the corresponding member's private
 * key SHALL produce the same 256-bit CEK.
 *
 * NOTE: createGroup() takes a creator and a list of member IDs, so all members are
 * added at creation time. We verify that encryptedSharedKey.get(0) has entries for
 * all members and they all unwrap to the same CEK.
 *
 * Generator strategy: Random member counts (1–20), random UUIDs per member.
 */

import fc from 'fast-check';
import { GroupService, extractKeyFromDefault } from '../groupService';
import { PermissionService } from '../permissionService';

// ─── Arbitraries ────────────────────────────────────────────────────────────

/** Arbitrary for a random member ID (UUID). */
const arbMemberId = fc.uuid();

/** Arbitrary for a random group name (at least one letter, no whitespace). */
const arbGroupName = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter((s) => /[a-zA-Z]/.test(s))
  .map((s) => s.replace(/\s+/g, '-'));

/**
 * Arbitrary for additional member IDs to include at group creation.
 * Generates 0–19 unique UUIDs (so total members = 1 creator + 0..19 others = 1..20).
 */
const arbAdditionalMembers = fc
  .uniqueArray(fc.uuid(), { minLength: 0, maxLength: 19 })
  .filter((arr) => arr.length === new Set(arr).size);

// ─── Property Tests ─────────────────────────────────────────────────────────

describe('Feature: brightchat-e2e-encryption, Property 3: Context creation wraps keys for all initial members (groups)', () => {
  /**
   * Property 3: Context creation wraps keys for all initial members (groups)
   *
   * **Validates: Requirements 5.1**
   *
   * For any group with N members (1 creator + additional members all added at
   * creation time), encryptedSharedKey.get(0) has exactly N entries, and
   * unwrapping each entry produces the same 256-bit CEK.
   */
  it('should have exactly N entries at epoch 0 for all initial members, all unwrapping to the same CEK', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbMemberId,
        arbGroupName,
        arbAdditionalMembers,
        async (creatorId, groupName, additionalMembers) => {
          // Ensure no additional member collides with the creator
          const otherMembers = additionalMembers.filter((id) => id !== creatorId);
          const allMemberIds = [creatorId, ...otherMembers];
          const expectedMemberCount = allMemberIds.length;

          // Fresh service instances per iteration to avoid state leakage
          const permissionService = new PermissionService();
          const groupService = new GroupService(permissionService);

          // Create a group — all members are added at creation time
          const group = await groupService.createGroup(
            groupName,
            creatorId,
            otherMembers,
          );

          // Verify encryptedSharedKey at epoch 0 exists
          const epoch0Map = group.encryptedSharedKey.get(0);
          expect(epoch0Map).toBeDefined();

          // Verify exactly N entries at epoch 0
          expect(epoch0Map!.size).toBe(expectedMemberCount);

          // Verify all expected member IDs are present
          for (const memberId of allMemberIds) {
            expect(epoch0Map!.has(memberId)).toBe(true);
          }

          // Unwrap each entry and verify they all produce the same CEK
          const unwrappedKeys: Uint8Array[] = [];
          for (const [, wrappedKey] of epoch0Map!) {
            const rawKey = extractKeyFromDefault(wrappedKey);
            unwrappedKeys.push(rawKey);
          }

          // All unwrapped keys should be 256-bit (32 bytes)
          for (const key of unwrappedKeys) {
            expect(key.length).toBe(32);
          }

          // All unwrapped keys should be identical (same CEK)
          const firstKey = unwrappedKeys[0];
          for (let i = 1; i < unwrappedKeys.length; i++) {
            expect(
              Buffer.from(unwrappedKeys[i]).equals(Buffer.from(firstKey)),
            ).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
