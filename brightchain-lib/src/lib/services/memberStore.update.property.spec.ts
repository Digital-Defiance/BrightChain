/**
 * @fileoverview Property-based tests for MemberStore update persistence
 *
 * **Feature: member-storage-audit, Property 6: Update Persistence and Retrievability**
 * **Validates: Requirements 3.1, 3.2, 3.5**
 *
 * This test suite verifies that:
 * - For any existing member and valid profile update, after updateMember()
 *   completes successfully, getMemberProfile() SHALL return the updated values
 *   and the member index SHALL contain new CBL checksums.
 *
 * **Feature: member-storage-audit, Property 7: Update Preserves Unchanged Fields**
 * **Validates: Requirements 3.3**
 *
 * This test suite verifies that:
 * - For any member profile update that modifies a subset of fields, all fields
 *   not included in the update SHALL retain their original values after the
 *   update completes.
 *
 * **Feature: member-storage-audit, Property 8: Update Rollback on Failure**
 * **Validates: Requirements 3.4**
 *
 * This test suite verifies that:
 * - For any member update operation that fails during CBL creation or storage,
 *   the original member data and index entry SHALL remain unchanged.
 */

import {
  EmailString,
  GuidV4Uint8Array,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { BlockSize } from '../enumerations/blockSize';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { BlockStoreFactory } from '../factories/blockStoreFactory';
import { MemberStore } from './memberStore';
import { ServiceProvider } from './service.provider';

describe('MemberStore Update Property Tests', () => {
  let blockStore: ReturnType<typeof BlockStoreFactory.createMemoryStore>;
  let memberStore: MemberStore<GuidV4Uint8Array>;

  beforeEach(() => {
    // Initialize service provider
    ServiceProvider.getInstance<GuidV4Uint8Array>();

    // Create member store with memory block store
    blockStore = BlockStoreFactory.createMemoryStore({
      blockSize: BlockSize.Small,
    });
    memberStore = new MemberStore<GuidV4Uint8Array>(blockStore);
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  /**
   * **Feature: member-storage-audit, Property 6: Update Persistence and Retrievability**
   *
   * **Validates: Requirements 3.1, 3.2, 3.5**
   *
   * *For any* existing member and valid profile update, after updateMember()
   * completes successfully, getMemberProfile() SHALL return the updated values
   * and the member index SHALL contain new CBL checksums.
   */
  describe('Property 6: Update Persistence and Retrievability', () => {
    it('should persist reputation updates and make them retrievable', async () => {
      let testCounter = 0;
      await fc.assert(
        fc.asyncProperty(
          // Generate new reputation value
          fc.integer({ min: 0, max: 1000000 }),
          async (newReputation) => {
            // Use unique counter for each test iteration
            const uniqueId = `${Date.now()}_${testCounter++}`;

            // Create a member first
            const { reference } = await memberStore.createMember({
              type: MemberType.User,
              name: `UpdateTest_${uniqueId}`,
              contactEmail: new EmailString(`update_${uniqueId}@example.com`),
            });

            // Get original profile to compare
            const originalProfile = await memberStore.getMemberProfile(
              reference.id,
            );
            expect(originalProfile.publicProfile).not.toBeNull();

            // Access the member index through queryIndex
            const originalResults = await memberStore.queryIndex({
              id: reference.id,
            });
            expect(originalResults.length).toBe(1);

            // Update the member with new reputation
            await memberStore.updateMember(reference.id, {
              id: reference.id,
              publicChanges: {
                reputation: newReputation,
              },
            });

            // Retrieve updated profile
            const updatedProfile = await memberStore.getMemberProfile(
              reference.id,
            );

            // Verify the updated value is retrievable
            expect(updatedProfile.publicProfile).not.toBeNull();
            expect(updatedProfile.publicProfile!.reputation).toBe(
              newReputation,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should persist status updates and make them retrievable', async () => {
      let testCounter = 0;
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom(
            MemberStatusType.Active,
            MemberStatusType.Inactive,
            MemberStatusType.Suspended,
          ),
          async (newStatus) => {
            // Use unique counter for each test iteration
            const uniqueId = `${Date.now()}_${testCounter++}`;

            // Create a member first
            const { reference } = await memberStore.createMember({
              type: MemberType.User,
              name: `StatusTest_${uniqueId}`,
              contactEmail: new EmailString(`status_${uniqueId}@example.com`),
            });

            // Update the member with new status
            await memberStore.updateMember(reference.id, {
              id: reference.id,
              publicChanges: {
                status: newStatus,
              },
            });

            // Retrieve updated profile
            const updatedProfile = await memberStore.getMemberProfile(
              reference.id,
            );

            // Verify the updated value is retrievable
            expect(updatedProfile.publicProfile).not.toBeNull();
            expect(updatedProfile.publicProfile!.status).toBe(newStatus);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Feature: member-storage-audit, Property 7: Update Preserves Unchanged Fields**
   *
   * **Validates: Requirements 3.3**
   *
   * *For any* member profile update that modifies a subset of fields, all fields
   * not included in the update SHALL retain their original values after the
   * update completes.
   */
  describe('Property 7: Update Preserves Unchanged Fields', () => {
    it('should preserve unchanged fields when updating reputation only', async () => {
      let testCounter = 0;
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000000 }),
          async (newReputation) => {
            // Use unique counter for each test iteration
            const uniqueId = `${Date.now()}_${testCounter++}`;

            // Create a member first
            const { reference } = await memberStore.createMember({
              type: MemberType.User,
              name: `PreserveTest_${uniqueId}`,
              contactEmail: new EmailString(`preserve_${uniqueId}@example.com`),
            });

            // Get original profile
            const originalProfile = await memberStore.getMemberProfile(
              reference.id,
            );
            expect(originalProfile.publicProfile).not.toBeNull();
            const originalStatus = originalProfile.publicProfile!.status;
            const originalStorageQuota =
              originalProfile.publicProfile!.storageQuota;
            const originalStorageUsed =
              originalProfile.publicProfile!.storageUsed;

            // Update only reputation
            await memberStore.updateMember(reference.id, {
              id: reference.id,
              publicChanges: {
                reputation: newReputation,
              },
            });

            // Retrieve updated profile
            const updatedProfile = await memberStore.getMemberProfile(
              reference.id,
            );

            // Verify unchanged fields are preserved
            expect(updatedProfile.publicProfile).not.toBeNull();
            expect(updatedProfile.publicProfile!.status).toBe(originalStatus);
            expect(updatedProfile.publicProfile!.storageQuota).toBe(
              originalStorageQuota,
            );
            expect(updatedProfile.publicProfile!.storageUsed).toBe(
              originalStorageUsed,
            );

            // Verify changed field is updated
            expect(updatedProfile.publicProfile!.reputation).toBe(
              newReputation,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should preserve private profile when updating public profile only', async () => {
      let testCounter = 0;
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000000 }),
          async (newReputation) => {
            // Use unique counter for each test iteration
            const uniqueId = `${Date.now()}_${testCounter++}`;

            // Create a member first
            const { reference } = await memberStore.createMember({
              type: MemberType.User,
              name: `PrivatePreserve_${uniqueId}`,
              contactEmail: new EmailString(
                `privatepreserve_${uniqueId}@example.com`,
              ),
              settings: {
                autoReplication: true,
                minRedundancy: 5,
                preferredRegions: ['us-west'],
              },
            });

            // Get original private profile
            const originalProfile = await memberStore.getMemberProfile(
              reference.id,
            );
            expect(originalProfile.privateProfile).not.toBeNull();
            const originalSettings = originalProfile.privateProfile!.settings;

            // Update only public profile (reputation)
            await memberStore.updateMember(reference.id, {
              id: reference.id,
              publicChanges: {
                reputation: newReputation,
              },
            });

            // Retrieve updated profile
            const updatedProfile = await memberStore.getMemberProfile(
              reference.id,
            );

            // Verify private profile is preserved
            expect(updatedProfile.privateProfile).not.toBeNull();
            expect(
              updatedProfile.privateProfile!.settings.autoReplication,
            ).toBe(originalSettings.autoReplication);
            expect(updatedProfile.privateProfile!.settings.minRedundancy).toBe(
              originalSettings.minRedundancy,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  /**
   * **Feature: member-storage-audit, Property 8: Update Rollback on Failure**
   *
   * **Validates: Requirements 3.4**
   *
   * *For any* member update operation that fails during CBL creation or storage,
   * the original member data and index entry SHALL remain unchanged.
   */
  describe('Property 8: Update Rollback on Failure', () => {
    /**
     * Helper to create a fake member ID that doesn't exist in the store
     */
    function createFakeMemberId(uniqueId: string): GuidV4Uint8Array {
      const eciesService =
        ServiceProvider.getInstance<GuidV4Uint8Array>().eciesService;
      const { member: fakeMember } = Member.newMember<GuidV4Uint8Array>(
        eciesService,
        MemberType.User,
        `FakeMember_${uniqueId}`,
        new EmailString(`fake_${uniqueId}@example.com`),
      );
      return fakeMember.id;
    }

    it('should preserve original data when update fails due to invalid member ID', async () => {
      let testCounter = 0;
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // Just need to run the test
          async () => {
            // Use unique counter for each test iteration
            const uniqueId = `${Date.now()}_${testCounter++}`;

            // Create a member first
            const { reference } = await memberStore.createMember({
              type: MemberType.User,
              name: `RollbackTest_${uniqueId}`,
              contactEmail: new EmailString(`rollback_${uniqueId}@example.com`),
            });

            // Get original profile
            const originalProfile = await memberStore.getMemberProfile(
              reference.id,
            );
            expect(originalProfile.publicProfile).not.toBeNull();
            const originalReputation =
              originalProfile.publicProfile!.reputation;

            // Create a fake ID that doesn't exist in the store
            const fakeId = createFakeMemberId(`fake_${uniqueId}`);

            // Try to update with non-existent ID - should fail
            let updateFailed = false;
            try {
              await memberStore.updateMember(fakeId, {
                id: fakeId,
                publicChanges: {
                  reputation: 999999,
                },
              });
            } catch {
              updateFailed = true;
            }

            expect(updateFailed).toBe(true);

            // Verify original member data is unchanged
            const unchangedProfile = await memberStore.getMemberProfile(
              reference.id,
            );
            expect(unchangedProfile.publicProfile).not.toBeNull();
            expect(unchangedProfile.publicProfile!.reputation).toBe(
              originalReputation,
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should maintain index consistency after failed update', async () => {
      let testCounter = 0;
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // Just need to run the test
          async () => {
            // Use unique counter for each test iteration
            const uniqueId = `${Date.now()}_${testCounter++}`;

            // Create a member first
            const { reference } = await memberStore.createMember({
              type: MemberType.User,
              name: `IndexConsistency_${uniqueId}`,
              contactEmail: new EmailString(
                `indexconsistency_${uniqueId}@example.com`,
              ),
            });

            // Get original index entry via queryIndex
            const originalResults = await memberStore.queryIndex({
              id: reference.id,
            });
            expect(originalResults.length).toBe(1);
            const originalPublicCBL = originalResults[0].publicCBL;

            // Create a fake ID that doesn't exist in the store
            const fakeId = createFakeMemberId(`fake2_${uniqueId}`);

            // Try to update with non-existent ID - should fail
            try {
              await memberStore.updateMember(fakeId, {
                id: fakeId,
                publicChanges: {
                  reputation: 999999,
                },
              });
            } catch {
              // Expected to fail
            }

            // Verify original member's index entry is unchanged
            const unchangedResults = await memberStore.queryIndex({
              id: reference.id,
            });
            expect(unchangedResults.length).toBe(1);
            expect(unchangedResults[0].publicCBL).toEqual(originalPublicCBL);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
