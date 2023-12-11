/**
 * Property-based test for GroupService — Property 1: Entity rehydration completeness (group subset).
 *
 * Feature: brightchat-persistence-rehydration, Property 1: Entity rehydration completeness (group)
 *
 * **Validates: Requirements 3.1, 9.1**
 *
 * For any set of groups persisted in storage, after calling init(),
 * the groups Map contains every group keyed by id, and the
 * Map's size equals the number of groups returned by findMany().
 *
 * Generator strategy: Generate arrays of 0–10 IGroup objects with
 * unique IDs via arbGroup, seed them into a MockChatStorageProvider,
 * construct a GroupService with that provider, call init(), then
 * verify every group is retrievable by ID and the total count matches.
 */

import fc from 'fast-check';
import { GroupService } from '../groupService';
import { PermissionService } from '../permissionService';
import { MockChatStorageProvider, arbGroup } from './mockChatStorageProvider';

describe('Feature: brightchat-persistence-rehydration, Property 1: Entity rehydration completeness (group)', () => {
  /**
   * Property 1: Entity rehydration completeness (group subset)
   *
   * **Validates: Requirements 3.1, 9.1**
   *
   * For any set of groups persisted in storage, after calling init(),
   * the groups Map contains every group keyed by id, and the
   * Map's size equals the number of groups returned by findMany().
   */
  it('should rehydrate every persisted group keyed by id with correct count', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc
          .array(arbGroup, { minLength: 0, maxLength: 10 })
          .map((groups) => {
            // Ensure unique IDs by deduplicating on id
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

          // Construct GroupService with the mock storage provider
          const permissionService = new PermissionService();
          const service = new GroupService(
            permissionService,
            undefined, // encryptKey (defaults to defaultKeyEncryption)
            undefined, // messageOps
            undefined, // eventEmitter
            undefined, // randomBytesProvider
            storageProvider,
          );

          // Rehydrate
          await service.init();

          // Verify every persisted group is retrievable by ID
          for (const group of groups) {
            const rehydrated = service.getGroupById(group.id);
            expect(rehydrated).toBeDefined();
            expect(rehydrated!.id).toBe(group.id);
          }

          // Verify a non-existent ID returns undefined
          const bogusId = '__nonexistent_id__';
          expect(service.getGroupById(bogusId)).toBeUndefined();

          // Verify count: collect all rehydrated group IDs via member listing
          // and confirm the union equals the input set size
          const allRehydratedIds = new Set<string>();
          const allMemberIds = new Set<string>();
          for (const g of groups) {
            for (const m of g.members) {
              allMemberIds.add(m.memberId);
            }
          }
          for (const memberId of allMemberIds) {
            const memberGroups = service.listGroupsForMember(memberId);
            for (const mg of memberGroups) {
              allRehydratedIds.add(mg.id);
            }
          }
          expect(allRehydratedIds.size).toBe(groups.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
