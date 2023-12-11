/**
 * Property-based test for GroupService — Property 7: Permission registration completeness.
 *
 * Feature: brightchat-persistence-rehydration, Property 7: Permission registration completeness
 *
 * **Validates: Requirements 3.5, 4.7**
 *
 * For any set of persisted groups with members, after rehydration the
 * PermissionService has the correct role assigned for every member in
 * every group — i.e., permissionService.getMemberRole(memberId, groupId)
 * returns the member's role from the persisted entity.
 *
 * Generator strategy: Generate arrays of 0–10 IGroup objects with unique
 * IDs via arbGroup, seed them into a MockChatStorageProvider, construct a
 * GroupService with that provider and a fresh PermissionService, call
 * init(), then verify every member's role is correctly registered.
 */

import fc from 'fast-check';
import { GroupService } from '../groupService';
import { PermissionService } from '../permissionService';
import { MockChatStorageProvider, arbGroup } from './mockChatStorageProvider';

describe('Feature: brightchat-persistence-rehydration, Property 7: Permission registration completeness', () => {
  /**
   * Property 7: Permission registration completeness
   *
   * **Validates: Requirements 3.5, 4.7**
   *
   * For any set of persisted groups with members, after rehydration the
   * PermissionService has the correct role assigned for every member in
   * every group.
   */
  it('should register the correct role for every member in every rehydrated group', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(arbGroup, { minLength: 0, maxLength: 10 })
          .map((groups) => {
            // Ensure unique group IDs by deduplicating on id
            const seen = new Set<string>();
            return groups.filter((g) => {
              if (seen.has(g.id)) return false;
              seen.add(g.id);
              return true;
            });
          }),
        async (groups) => {
          // Seed groups into mock storage
          const storageProvider = new MockChatStorageProvider({ groups });

          // Construct GroupService with a fresh PermissionService
          const permissionService = new PermissionService();
          const service = new GroupService(
            permissionService,
            undefined, // encryptKey
            undefined, // messageOps
            undefined, // eventEmitter
            undefined, // randomBytesProvider
            storageProvider,
          );

          // Rehydrate
          await service.init();

          // Verify every member in every group has the correct role registered.
          // When a group has duplicate memberIds, assignRole is called in
          // iteration order so the last occurrence wins. Build the expected
          // map the same way the init() loop does.
          for (const group of groups) {
            const expectedRoles = new Map<string, typeof group.members[0]['role']>();
            for (const member of group.members) {
              expectedRoles.set(member.memberId, member.role);
            }

            for (const [memberId, expectedRole] of expectedRoles) {
              const registeredRole = permissionService.getMemberRole(
                memberId,
                group.id,
              );
              expect(registeredRole).toBe(expectedRole);
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
