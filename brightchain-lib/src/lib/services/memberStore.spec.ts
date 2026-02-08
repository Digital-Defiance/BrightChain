/**
 * @fileoverview Unit tests for MemberStore
 *
 * This test suite verifies the core functionality of MemberStore:
 * - getMember() retrieves member with correct fields
 * - getMember() throws MemberNotFound for unknown ID
 * - getMemberProfile() retrieves profiles with all fields
 * - getMemberProfile() throws MemberNotFound for unknown ID
 * - updateMember() updates profile data correctly
 * - updateMember() preserves unchanged fields
 *
 * _Requirements: 6.1, 6.2, 6.3_
 */

import {
  ECIESService,
  EmailString,
  GuidV4Uint8Array,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { BlockSize } from '../enumerations/blockSize';
import { MemberErrorType } from '../enumerations/memberErrorType';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { MemberError } from '../errors/memberError';
import { BlockStoreFactory } from '../factories/blockStoreFactory';
import { INewMemberData } from '../interfaces/member/memberData';
import { MemberStore } from './memberStore';
import { ServiceProvider } from './service.provider';

describe('MemberStore Unit Tests', () => {
  let memberStore: MemberStore<GuidV4Uint8Array>;
  let eciesService: ECIESService<GuidV4Uint8Array>;

  beforeEach(() => {
    // Initialize service provider
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    eciesService = sp.eciesService;

    // Create member store with memory block store
    const blockStore = BlockStoreFactory.createMemoryStore({
      blockSize: BlockSize.Small,
    });
    memberStore = new MemberStore<GuidV4Uint8Array>(blockStore);
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('getMember()', () => {
    it('should retrieve member with correct fields', async () => {
      // Create a member first
      const memberData: INewMemberData = {
        type: MemberType.User,
        name: 'test-user-get',
        contactEmail: new EmailString('testget@example.com'),
        region: 'us-east',
      };

      const { reference } = await memberStore.createMember(memberData);

      // Retrieve the member
      const retrievedMember = await memberStore.getMember(reference.id);

      // Verify the member is an instance of Member
      expect(retrievedMember).toBeInstanceOf(Member);

      // Verify the member has the correct fields
      expect(retrievedMember.name).toBe(memberData.name);
      expect(retrievedMember.type).toBe(memberData.type);
      expect(retrievedMember.publicKey).toBeDefined();
    });

    it('should retrieve member with correct type for System member', async () => {
      const memberData: INewMemberData = {
        type: MemberType.System,
        name: 'system-member-get',
        contactEmail: new EmailString('system@example.com'),
      };

      const { reference } = await memberStore.createMember(memberData);
      const retrievedMember = await memberStore.getMember(reference.id);

      expect(retrievedMember.type).toBe(MemberType.System);
      expect(retrievedMember.name).toBe(memberData.name);
    });

    it('should throw MemberNotFound for unknown ID', async () => {
      // Create a fake member ID that doesn't exist in the store
      const { member: fakeMember } = Member.newMember<GuidV4Uint8Array>(
        eciesService,
        MemberType.User,
        'fake-member',
        new EmailString('fake@example.com'),
      );

      await expect(memberStore.getMember(fakeMember.id)).rejects.toThrow(
        MemberError,
      );

      try {
        await memberStore.getMember(fakeMember.id);
      } catch (error) {
        expect(error).toBeInstanceOf(MemberError);
        expect((error as MemberError).type).toBe(
          MemberErrorType.MemberNotFound,
        );
      }
    });

    it('should retrieve member after multiple members are created', async () => {
      // Create multiple members
      const member1Data: INewMemberData = {
        type: MemberType.User,
        name: 'multi-user-1',
        contactEmail: new EmailString('multi1@example.com'),
      };

      const member2Data: INewMemberData = {
        type: MemberType.User,
        name: 'multi-user-2',
        contactEmail: new EmailString('multi2@example.com'),
      };

      const { reference: ref1 } = await memberStore.createMember(member1Data);
      const { reference: ref2 } = await memberStore.createMember(member2Data);

      // Retrieve both members
      const member1 = await memberStore.getMember(ref1.id);
      const member2 = await memberStore.getMember(ref2.id);

      // Verify each member has correct data
      expect(member1.name).toBe(member1Data.name);
      expect(member2.name).toBe(member2Data.name);
    });
  });

  describe('getMemberProfile()', () => {
    let testMemberId: GuidV4Uint8Array;

    beforeEach(async () => {
      const memberData: INewMemberData = {
        type: MemberType.User,
        name: 'profile-test-user',
        contactEmail: new EmailString('profile@example.com'),
        region: 'eu-central',
        settings: {
          autoReplication: true,
          minRedundancy: 3,
          preferredRegions: ['eu-central'],
        },
      };

      const { reference } = await memberStore.createMember(memberData);
      testMemberId = reference.id;
    });

    it('should retrieve public profile with all fields', async () => {
      const profile = await memberStore.getMemberProfile(testMemberId);

      // Verify public profile exists and has all required fields
      expect(profile.publicProfile).not.toBeNull();
      expect(profile.publicProfile).toBeDefined();

      const publicProfile = profile.publicProfile!;
      expect(publicProfile.id).toEqual(testMemberId);
      expect(publicProfile.status).toBe(MemberStatusType.Active);
      expect(publicProfile.reputation).toBeDefined();
      expect(typeof publicProfile.reputation).toBe('number');
      expect(publicProfile.storageQuota).toBeDefined();
      expect(typeof publicProfile.storageQuota).toBe('bigint');
      expect(publicProfile.storageUsed).toBeDefined();
      expect(typeof publicProfile.storageUsed).toBe('bigint');
      expect(publicProfile.lastActive).toBeInstanceOf(Date);
      expect(publicProfile.dateCreated).toBeInstanceOf(Date);
      expect(publicProfile.dateUpdated).toBeInstanceOf(Date);
    });

    it('should retrieve private profile with all fields', async () => {
      const profile = await memberStore.getMemberProfile(testMemberId);

      // Verify private profile exists and has all required fields
      expect(profile.privateProfile).not.toBeNull();
      expect(profile.privateProfile).toBeDefined();

      const privateProfile = profile.privateProfile!;
      expect(privateProfile.id).toEqual(testMemberId);
      expect(privateProfile.trustedPeers).toBeDefined();
      expect(Array.isArray(privateProfile.trustedPeers)).toBe(true);
      expect(privateProfile.blockedPeers).toBeDefined();
      expect(Array.isArray(privateProfile.blockedPeers)).toBe(true);
      expect(privateProfile.settings).toBeDefined();
      expect(privateProfile.settings.autoReplication).toBeDefined();
      expect(privateProfile.settings.minRedundancy).toBeDefined();
      expect(privateProfile.activityLog).toBeDefined();
      expect(Array.isArray(privateProfile.activityLog)).toBe(true);
      expect(privateProfile.dateCreated).toBeInstanceOf(Date);
      expect(privateProfile.dateUpdated).toBeInstanceOf(Date);
    });

    it('should throw MemberNotFound for unknown ID', async () => {
      // Create a fake member ID that doesn't exist in the store
      const { member: fakeMember } = Member.newMember<GuidV4Uint8Array>(
        eciesService,
        MemberType.User,
        'fake-profile-member',
        new EmailString('fakeprofile@example.com'),
      );

      await expect(memberStore.getMemberProfile(fakeMember.id)).rejects.toThrow(
        MemberError,
      );

      try {
        await memberStore.getMemberProfile(fakeMember.id);
      } catch (error) {
        expect(error).toBeInstanceOf(MemberError);
        expect((error as MemberError).type).toBe(
          MemberErrorType.MemberNotFound,
        );
      }
    });

    it('should retrieve profiles for different member types', async () => {
      // Create a system member
      const systemMemberData: INewMemberData = {
        type: MemberType.System,
        name: 'system-profile-test',
        contactEmail: new EmailString('systemprofile@example.com'),
      };

      const { reference: systemRef } =
        await memberStore.createMember(systemMemberData);

      // Retrieve profiles for both members
      const userProfile = await memberStore.getMemberProfile(testMemberId);
      const systemProfile = await memberStore.getMemberProfile(systemRef.id);

      // Both should have valid profiles
      expect(userProfile.publicProfile).toBeDefined();
      expect(userProfile.privateProfile).toBeDefined();
      expect(systemProfile.publicProfile).toBeDefined();
      expect(systemProfile.privateProfile).toBeDefined();

      // IDs should match
      expect(userProfile.publicProfile!.id).toEqual(testMemberId);
      expect(systemProfile.publicProfile!.id).toEqual(systemRef.id);
    });
  });

  describe('updateMember()', () => {
    let testMemberId: GuidV4Uint8Array;

    beforeEach(async () => {
      const memberData: INewMemberData = {
        type: MemberType.User,
        name: 'update-test-user',
        contactEmail: new EmailString('update@example.com'),
        region: 'us-west',
        settings: {
          autoReplication: true,
          minRedundancy: 3,
          preferredRegions: ['us-west'],
        },
      };

      const { reference } = await memberStore.createMember(memberData);
      testMemberId = reference.id;
    });

    it('should update profile data correctly - reputation', async () => {
      const newReputation = 500;

      // Update the member's reputation
      await memberStore.updateMember(testMemberId, {
        id: testMemberId,
        publicChanges: {
          reputation: newReputation,
        },
      });

      // Retrieve and verify the update
      const profile = await memberStore.getMemberProfile(testMemberId);
      expect(profile.publicProfile).toBeDefined();
      expect(profile.publicProfile!.reputation).toBe(newReputation);
    });

    it('should update profile data correctly - status', async () => {
      const newStatus = MemberStatusType.Inactive;

      // Update the member's status
      await memberStore.updateMember(testMemberId, {
        id: testMemberId,
        publicChanges: {
          status: newStatus,
        },
      });

      // Retrieve and verify the update
      const profile = await memberStore.getMemberProfile(testMemberId);
      expect(profile.publicProfile).toBeDefined();
      expect(profile.publicProfile!.status).toBe(newStatus);
    });

    it('should update private profile settings', async () => {
      const newSettings = {
        autoReplication: false,
        minRedundancy: 5,
        preferredRegions: ['eu-west', 'ap-south'],
      };

      // Update the member's private settings
      await memberStore.updateMember(testMemberId, {
        id: testMemberId,
        privateChanges: {
          settings: newSettings,
        },
      });

      // Retrieve and verify the update
      const profile = await memberStore.getMemberProfile(testMemberId);
      expect(profile.privateProfile).toBeDefined();
      expect(profile.privateProfile!.settings.autoReplication).toBe(
        newSettings.autoReplication,
      );
      expect(profile.privateProfile!.settings.minRedundancy).toBe(
        newSettings.minRedundancy,
      );
    });

    it('should preserve unchanged fields when updating reputation only', async () => {
      // Get original profile
      const originalProfile = await memberStore.getMemberProfile(testMemberId);
      const originalStatus = originalProfile.publicProfile!.status;
      const originalStorageQuota = originalProfile.publicProfile!.storageQuota;
      const originalStorageUsed = originalProfile.publicProfile!.storageUsed;

      // Update only reputation
      const newReputation = 1000;
      await memberStore.updateMember(testMemberId, {
        id: testMemberId,
        publicChanges: {
          reputation: newReputation,
        },
      });

      // Retrieve and verify unchanged fields are preserved
      const updatedProfile = await memberStore.getMemberProfile(testMemberId);
      expect(updatedProfile.publicProfile!.reputation).toBe(newReputation);
      expect(updatedProfile.publicProfile!.status).toBe(originalStatus);
      expect(updatedProfile.publicProfile!.storageQuota).toBe(
        originalStorageQuota,
      );
      expect(updatedProfile.publicProfile!.storageUsed).toBe(
        originalStorageUsed,
      );
    });

    it('should preserve private profile when updating public profile only', async () => {
      // Get original private profile
      const originalProfile = await memberStore.getMemberProfile(testMemberId);
      const originalSettings = originalProfile.privateProfile!.settings;
      const originalTrustedPeers = originalProfile.privateProfile!.trustedPeers;
      const originalBlockedPeers = originalProfile.privateProfile!.blockedPeers;

      // Update only public profile
      await memberStore.updateMember(testMemberId, {
        id: testMemberId,
        publicChanges: {
          reputation: 750,
        },
      });

      // Retrieve and verify private profile is preserved
      const updatedProfile = await memberStore.getMemberProfile(testMemberId);
      expect(updatedProfile.privateProfile!.settings.autoReplication).toBe(
        originalSettings.autoReplication,
      );
      expect(updatedProfile.privateProfile!.settings.minRedundancy).toBe(
        originalSettings.minRedundancy,
      );
      expect(updatedProfile.privateProfile!.trustedPeers).toEqual(
        originalTrustedPeers,
      );
      expect(updatedProfile.privateProfile!.blockedPeers).toEqual(
        originalBlockedPeers,
      );
    });

    it('should throw MemberNotFound when updating non-existent member', async () => {
      // Create a fake member ID that doesn't exist in the store
      const { member: fakeMember } = Member.newMember<GuidV4Uint8Array>(
        eciesService,
        MemberType.User,
        'fake-update-member',
        new EmailString('fakeupdate@example.com'),
      );

      await expect(
        memberStore.updateMember(fakeMember.id, {
          id: fakeMember.id,
          publicChanges: {
            reputation: 100,
          },
        }),
      ).rejects.toThrow(MemberError);

      try {
        await memberStore.updateMember(fakeMember.id, {
          id: fakeMember.id,
          publicChanges: {
            reputation: 100,
          },
        });
      } catch (error) {
        expect(error).toBeInstanceOf(MemberError);
        expect((error as MemberError).type).toBe(
          MemberErrorType.MemberNotFound,
        );
      }
    });

    it('should update multiple fields at once', async () => {
      const newReputation = 800;
      const newStatus = MemberStatusType.Suspended;

      // Update multiple fields
      await memberStore.updateMember(testMemberId, {
        id: testMemberId,
        publicChanges: {
          reputation: newReputation,
          status: newStatus,
        },
      });

      // Retrieve and verify all updates
      const profile = await memberStore.getMemberProfile(testMemberId);
      expect(profile.publicProfile!.reputation).toBe(newReputation);
      expect(profile.publicProfile!.status).toBe(newStatus);
    });

    it('should update both public and private profiles simultaneously', async () => {
      const newReputation = 600;
      const newSettings = {
        autoReplication: false,
        minRedundancy: 7,
        preferredRegions: ['global'],
      };

      // Update both public and private profiles
      await memberStore.updateMember(testMemberId, {
        id: testMemberId,
        publicChanges: {
          reputation: newReputation,
        },
        privateChanges: {
          settings: newSettings,
        },
      });

      // Retrieve and verify both updates
      const profile = await memberStore.getMemberProfile(testMemberId);
      expect(profile.publicProfile!.reputation).toBe(newReputation);
      expect(profile.privateProfile!.settings.autoReplication).toBe(
        newSettings.autoReplication,
      );
      expect(profile.privateProfile!.settings.minRedundancy).toBe(
        newSettings.minRedundancy,
      );
    });
  });
});
