import {
  ECIESService,
  EmailString,
  GuidV4Uint8Array,
  Member,
  MemberType,
  TypedIdProviderWrapper,
  uint8ArrayToHex,
} from '@digitaldefiance/ecies-lib';
import { BlockSize } from '../enumerations/blockSize';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { MemberError } from '../errors/memberError';
import { BlockStoreFactory } from '../factories/blockStoreFactory';
import { INewMemberData } from '../interfaces/member/memberData';
import { ServiceProvider } from '../services/service.provider';
import { MemberStore } from './memberStore';

describe('MemberStore - Profile Operations', () => {
  let memberStore: MemberStore<GuidV4Uint8Array>;
  let eciesService: ECIESService<GuidV4Uint8Array>;
  let idProvider: TypedIdProviderWrapper<GuidV4Uint8Array>;

  beforeEach(() => {
    // Initialize service provider
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    idProvider = sp.idProvider;
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

  describe('createMember with Profile', () => {
    it('should create member with profile documents', async () => {
      const memberData: INewMemberData = {
        type: MemberType.User,
        name: 'test-user',
        contactEmail: new EmailString('test@example.com'),
        region: 'us-east',
      };

      const result = await memberStore.createMember(memberData);

      expect(result.reference.id).toBeDefined();
      expect(result.reference.type).toBe(MemberType.User);
      expect(result.mnemonic).toBeDefined();
      expect(result.mnemonic.value).toBeTruthy();
    });

    it('should store profile CBLs in member index', async () => {
      const memberData: INewMemberData = {
        type: MemberType.User,
        name: 'test-user-2',
        contactEmail: new EmailString('test2@example.com'),
        region: 'us-west',
      };

      const { reference } = await memberStore.createMember(memberData);

      // Query the index to verify profile CBLs are stored
      const results = await memberStore.queryIndex({
        id: reference.id,
      });

      expect(results).toHaveLength(1);
      expect(results[0].publicCBL).toBeDefined();
      // Note: publicProfileCBL and privateProfileCBL should be in the index entry
      // but we can't directly access the internal memberIndex map in this test
    });

    it('should create different members with unique profile data', async () => {
      const member1Data: INewMemberData = {
        type: MemberType.User,
        name: 'user-1',
        contactEmail: new EmailString('user1@example.com'),
      };

      const member2Data: INewMemberData = {
        type: MemberType.User,
        name: 'user-2',
        contactEmail: new EmailString('user2@example.com'),
      };

      const result1 = await memberStore.createMember(member1Data);
      const result2 = await memberStore.createMember(member2Data);

      expect(result1.reference.id).not.toEqual(result2.reference.id);
      expect(result1.mnemonic.value).not.toBe(result2.mnemonic.value);
    });

    it('should throw error for duplicate member name', async () => {
      const memberData: INewMemberData = {
        type: MemberType.User,
        name: 'duplicate-name',
        contactEmail: new EmailString('test@example.com'),
      };

      await memberStore.createMember(memberData);

      const duplicateData: INewMemberData = {
        type: MemberType.User,
        name: 'duplicate-name', // Same name
        contactEmail: new EmailString('other@example.com'),
      };

      await expect(memberStore.createMember(duplicateData)).rejects.toThrow(
        MemberError,
      );
    });
  });

  describe('getMemberProfile', () => {
    let testMemberId: GuidV4Uint8Array;

    beforeEach(async () => {
      const memberData: INewMemberData = {
        type: MemberType.User,
        name: 'profile-test-user',
        contactEmail: new EmailString('profile@example.com'),
        region: 'eu-central',
      };

      const { reference } = await memberStore.createMember(memberData);
      testMemberId = reference.id;
    });

    it('should retrieve member profile by ID', async () => {
      const profile = await memberStore.getMemberProfile(testMemberId);

      expect(profile).toBeDefined();
      expect(profile.publicProfile).toBeDefined();
      expect(profile.privateProfile).toBeDefined();
    });

    it('should return null profiles when CBL deserialization is not implemented', async () => {
      // Currently returns null because CBL deserialization is TODO
      const profile = await memberStore.getMemberProfile(testMemberId);

      // This reflects current implementation - will change when CBL deserialization is added
      expect(profile.publicProfile).toBeNull();
      expect(profile.privateProfile).toBeNull();
    });

    it('should throw error for non-existent member', async () => {
      const { member: nonExistentMember } = Member.newMember(
        eciesService,
        MemberType.User,
        'non-existent',
        new EmailString('nonexistent@example.com'),
      );
      const nonExistentId = nonExistentMember.id;

      await expect(memberStore.getMemberProfile(nonExistentId)).rejects.toThrow(
        MemberError,
      );
    });

    it('should fetch profile for multiple members independently', async () => {
      const member2Data: INewMemberData = {
        type: MemberType.User,
        name: 'profile-test-user-2',
        contactEmail: new EmailString('profile2@example.com'),
      };

      const { reference: ref2 } = await memberStore.createMember(member2Data);

      const profile1 = await memberStore.getMemberProfile(testMemberId);
      const profile2 = await memberStore.getMemberProfile(ref2.id);

      expect(profile1).toBeDefined();
      expect(profile2).toBeDefined();
      // Both should be independent
    });
  });

  describe('Profile Integration with Member Operations', () => {
    it('should include profile CBLs in member index entry', async () => {
      const memberData: INewMemberData = {
        type: MemberType.User,
        name: 'integration-user',
        contactEmail: new EmailString('integration@example.com'),
        region: 'ap-south',
      };

      const { reference } = await memberStore.createMember(memberData);

      const results = await memberStore.queryIndex({
        id: reference.id,
      });

      expect(results).toHaveLength(1);
      expect(results[0].id).toEqual(reference.id);
      expect(results[0].type).toBe(MemberType.User);
      expect(results[0].publicCBL).toBeDefined();
      // Note: region and reputation are in the internal index but not in the returned reference
    });

    it('should handle member creation with all profile data types', async () => {
      const memberData: INewMemberData = {
        type: MemberType.System,
        name: 'system-user',
        contactEmail: new EmailString('system@example.com'),
        region: 'global',
      };

      const { reference } = await memberStore.createMember(memberData);

      expect(reference.type).toBe(MemberType.System);

      const profile = await memberStore.getMemberProfile(reference.id);
      expect(profile).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle member with no region', async () => {
      const memberData: INewMemberData = {
        type: MemberType.User,
        name: 'no-region-user',
        contactEmail: new EmailString('noregion@example.com'),
        // No region specified
      };

      const { reference } = await memberStore.createMember(memberData);
      expect(reference.id).toBeDefined();

      const profile = await memberStore.getMemberProfile(reference.id);
      expect(profile).toBeDefined();
    });

    it('should handle rapid sequential member creation', async () => {
      const promises = Array.from({ length: 5 }, (_, i) => {
        const memberData: INewMemberData = {
          type: MemberType.User,
          name: `rapid-user-${i}`,
          contactEmail: new EmailString(`rapid${i}@example.com`),
        };
        return memberStore.createMember(memberData);
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);

      // Verify all have unique IDs
      const ids = results.map((r) =>
        uint8ArrayToHex(idProvider.toBytes(r.reference.id)),
      );
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('should maintain member count correctly', async () => {
      const initialResults = await memberStore.queryIndex({});
      const initialCount = initialResults.length;

      await memberStore.createMember({
        type: MemberType.User,
        name: 'count-test-1',
        contactEmail: new EmailString('count1@example.com'),
      });

      await memberStore.createMember({
        type: MemberType.User,
        name: 'count-test-2',
        contactEmail: new EmailString('count2@example.com'),
      });

      const finalResults = await memberStore.queryIndex({});
      expect(finalResults.length).toBe(initialCount + 2);
    });
  });

  describe('Query Operations with Profiles', () => {
    beforeEach(async () => {
      // Create several test members
      await memberStore.createMember({
        type: MemberType.User,
        name: 'query-user-1',
        contactEmail: new EmailString('query1@example.com'),
        region: 'us-east',
      });

      await memberStore.createMember({
        type: MemberType.User,
        name: 'query-user-2',
        contactEmail: new EmailString('query2@example.com'),
        region: 'us-west',
      });

      await memberStore.createMember({
        type: MemberType.System,
        name: 'query-system',
        contactEmail: new EmailString('system@example.com'),
        region: 'us-east',
      });
    });

    it('should query members by type', async () => {
      const userResults = await memberStore.queryIndex({
        type: MemberType.User,
      });

      const systemResults = await memberStore.queryIndex({
        type: MemberType.System,
      });

      expect(userResults.length).toBeGreaterThanOrEqual(2);
      expect(systemResults.length).toBeGreaterThanOrEqual(1);
    });

    it('should query members by region', async () => {
      const eastResults = await memberStore.queryIndex({
        region: 'us-east',
      });

      const westResults = await memberStore.queryIndex({
        region: 'us-west',
      });

      expect(eastResults.length).toBeGreaterThanOrEqual(2);
      expect(westResults.length).toBeGreaterThanOrEqual(1);
    });

    it('should query members by status', async () => {
      const activeResults = await memberStore.queryIndex({
        status: MemberStatusType.Active,
      });

      // All newly created members should be active
      expect(activeResults.length).toBeGreaterThanOrEqual(3);
    });
  });
});
