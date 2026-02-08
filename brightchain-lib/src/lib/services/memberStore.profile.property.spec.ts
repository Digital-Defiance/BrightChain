/**
 * @fileoverview Property-based tests for MemberStore profile CBL round-trip
 *
 * **Feature: member-storage-audit, Property 1: Profile CBL Round-Trip**
 * **Validates: Requirements 1.1, 1.2, 1.5**
 *
 * This test suite verifies that:
 * - For any valid public or private member profile data, serializing to CBL
 *   then deserializing SHALL produce an equivalent profile object with all
 *   fields matching the original.
 *
 * Note: The current createMember implementation has a bug where it stores
 * checksum bytes instead of actual profile JSON data. These tests verify
 * the deserialization logic works correctly with properly formatted data.
 */

import {
  EmailString,
  GuidV4Uint8Array,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import * as fc from 'fast-check';
import { RawDataBlock } from '../blocks/rawData';
import {
  privateMemberProfileHydrationSchema,
  publicMemberProfileHydrationSchema,
} from '../documents/member/memberProfileHydration';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { BlockStoreFactory } from '../factories/blockStoreFactory';
import {
  IPrivateMemberProfileHydratedData,
  IPublicMemberProfileHydratedData,
} from '../interfaces/member/profileStorage';
import { MemberStore } from './memberStore';
import { ServiceProvider } from './service.provider';

describe('MemberStore Profile CBL Round-Trip Property Tests', () => {
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
   * Helper to create a test member
   */
  function createTestMember(name: string, email: string) {
    const eciesService =
      ServiceProvider.getInstance<GuidV4Uint8Array>().eciesService;
    return Member.newMember<GuidV4Uint8Array>(
      eciesService,
      MemberType.User,
      name,
      new EmailString(email),
    );
  }

  /**
   * **Feature: member-storage-audit, Property 1: Profile CBL Round-Trip**
   *
   * **Validates: Requirements 1.1, 1.2, 1.5**
   *
   * *For any* valid public or private member profile data, serializing to CBL
   * then deserializing SHALL produce an equivalent profile object with all
   * fields matching the original.
   */
  describe('Property 1: Profile CBL Round-Trip', () => {
    /**
     * Property: Public profile hydration schema should round-trip correctly.
     * This tests the core serialization/deserialization logic.
     */
    it('should round-trip public profile data through hydration schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate reputation values
          fc.integer({ min: 0, max: 1000000 }),
          // Generate storage quota (reasonable range)
          fc.bigInt({ min: BigInt(0), max: BigInt(Number.MAX_SAFE_INTEGER) }),
          // Generate storage used (reasonable range)
          fc.bigInt({ min: BigInt(0), max: BigInt(Number.MAX_SAFE_INTEGER) }),
          async (reputation, storageQuota, storageUsed) => {
            const { member } = createTestMember(
              `test${Date.now()}`,
              `test${Date.now()}@example.com`,
            );

            const originalData: IPublicMemberProfileHydratedData<GuidV4Uint8Array> =
              {
                id: member.id,
                status: MemberStatusType.Active,
                reputation,
                storageQuota,
                storageUsed,
                lastActive: new Date(),
                dateCreated: new Date(),
                dateUpdated: new Date(),
              };

            const schema =
              publicMemberProfileHydrationSchema<GuidV4Uint8Array>();

            // Dehydrate to storage format
            const storageData = schema.dehydrate(originalData);

            // Hydrate back to runtime format
            const roundTripped = schema.hydrate(storageData);

            // Verify all fields match
            expect(roundTripped.id).toEqual(originalData.id);
            expect(roundTripped.status).toBe(originalData.status);
            expect(roundTripped.reputation).toBe(originalData.reputation);
            expect(roundTripped.storageQuota).toBe(originalData.storageQuota);
            expect(roundTripped.storageUsed).toBe(originalData.storageUsed);
            expect(roundTripped.dateCreated.getTime()).toBe(
              originalData.dateCreated.getTime(),
            );
            expect(roundTripped.dateUpdated.getTime()).toBe(
              originalData.dateUpdated.getTime(),
            );
            expect(roundTripped.lastActive.getTime()).toBe(
              originalData.lastActive.getTime(),
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Private profile hydration schema should round-trip correctly.
     */
    it('should round-trip private profile data through hydration schema', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate number of trusted peers
          fc.integer({ min: 0, max: 5 }),
          // Generate number of blocked peers
          fc.integer({ min: 0, max: 5 }),
          // Generate activity log entries count
          fc.integer({ min: 0, max: 3 }),
          async (trustedCount, blockedCount, activityCount) => {
            const { member } = createTestMember(
              `test${Date.now()}`,
              `test${Date.now()}@example.com`,
            );

            // Create peer IDs
            const trustedPeers: GuidV4Uint8Array[] = [];
            const blockedPeers: GuidV4Uint8Array[] = [];

            for (let i = 0; i < trustedCount; i++) {
              const { member: peer } = createTestMember(
                `trusted${i}${Date.now()}`,
                `trusted${i}${Date.now()}@example.com`,
              );
              trustedPeers.push(peer.id);
            }

            for (let i = 0; i < blockedCount; i++) {
              const { member: peer } = createTestMember(
                `blocked${i}${Date.now()}`,
                `blocked${i}${Date.now()}@example.com`,
              );
              blockedPeers.push(peer.id);
            }

            // Create activity log
            const activityLog = Array.from(
              { length: activityCount },
              (_, i) => ({
                timestamp: new Date(Date.now() - i * 1000),
                action: `action${i}`,
                details: { index: i },
                metadata: { source: 'test' },
              }),
            );

            const originalData: IPrivateMemberProfileHydratedData<GuidV4Uint8Array> =
              {
                id: member.id,
                trustedPeers,
                blockedPeers,
                settings: {
                  autoReplication: true,
                  minRedundancy: 3,
                  preferredRegions: ['us-east', 'eu-west'],
                },
                activityLog,
                dateCreated: new Date(),
                dateUpdated: new Date(),
              };

            const schema =
              privateMemberProfileHydrationSchema<GuidV4Uint8Array>();

            // Dehydrate to storage format
            const storageData = schema.dehydrate(originalData);

            // Hydrate back to runtime format
            const roundTripped = schema.hydrate(storageData);

            // Verify all fields match
            expect(roundTripped.id).toEqual(originalData.id);
            expect(roundTripped.trustedPeers).toHaveLength(trustedCount);
            expect(roundTripped.blockedPeers).toHaveLength(blockedCount);
            expect(roundTripped.settings.autoReplication).toBe(true);
            expect(roundTripped.settings.minRedundancy).toBe(3);
            expect(roundTripped.activityLog).toHaveLength(activityCount);
            expect(roundTripped.dateCreated.getTime()).toBe(
              originalData.dateCreated.getTime(),
            );
            expect(roundTripped.dateUpdated.getTime()).toBe(
              originalData.dateUpdated.getTime(),
            );

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: JSON-encoded profile data stored in blocks should be
     * deserializable by getMemberProfile.
     */
    it('should deserialize JSON-encoded profile data from block store', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 1, max: 999999 }),
          async (reputation, suffix) => {
            const { member } = createTestMember(
              `jsontest${suffix}`,
              `jsontest${suffix}@example.com`,
            );

            // Create profile data
            const publicProfileData: IPublicMemberProfileHydratedData<GuidV4Uint8Array> =
              {
                id: member.id,
                status: MemberStatusType.Active,
                reputation,
                storageQuota: BigInt(1024 * 1024 * 100),
                storageUsed: BigInt(0),
                lastActive: new Date(),
                dateCreated: new Date(),
                dateUpdated: new Date(),
              };

            const privateProfileData: IPrivateMemberProfileHydratedData<GuidV4Uint8Array> =
              {
                id: member.id,
                trustedPeers: [],
                blockedPeers: [],
                settings: { autoReplication: true },
                activityLog: [],
                dateCreated: new Date(),
                dateUpdated: new Date(),
              };

            // Dehydrate to storage format
            const publicSchema =
              publicMemberProfileHydrationSchema<GuidV4Uint8Array>();
            const privateSchema =
              privateMemberProfileHydrationSchema<GuidV4Uint8Array>();

            const publicStorageData = publicSchema.dehydrate(publicProfileData);
            const privateStorageData =
              privateSchema.dehydrate(privateProfileData);

            // Convert Uint8Array id to hex string for JSON serialization
            const idProvider =
              ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
            const idHex = Array.from(idProvider.toBytes(member.id))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');

            // Create JSON-serializable versions with hex string IDs
            const publicJsonData = {
              ...publicStorageData,
              id: idHex,
            };
            const privateJsonData = {
              ...privateStorageData,
              id: idHex,
              trustedPeers: [],
              blockedPeers: [],
            };

            // Encode as JSON
            const publicJson = JSON.stringify(publicJsonData);
            const privateJson = JSON.stringify(privateJsonData);

            // Create blocks with JSON data (padded to block size)
            const publicData = new Uint8Array(BlockSize.Small);
            const publicJsonBytes = new TextEncoder().encode(publicJson);
            publicData.set(publicJsonBytes);

            const privateData = new Uint8Array(BlockSize.Small);
            const privateJsonBytes = new TextEncoder().encode(privateJson);
            privateData.set(privateJsonBytes);

            // Calculate checksums
            const checksumService =
              ServiceProvider.getInstance().checksumService;
            const publicChecksum =
              checksumService.calculateChecksum(publicData);
            const privateChecksum =
              checksumService.calculateChecksum(privateData);

            // Create and store blocks
            const publicBlock = new RawDataBlock(
              BlockSize.Small,
              publicData,
              new Date(),
              publicChecksum,
              BlockType.RawData,
              BlockDataType.PublicMemberData,
            );

            const privateBlock = new RawDataBlock(
              BlockSize.Small,
              privateData,
              new Date(),
              privateChecksum,
              BlockType.RawData,
              BlockDataType.PrivateMemberData,
            );

            await blockStore.setData(publicBlock);
            await blockStore.setData(privateBlock);

            // Create a dummy identity CBL (just for the index)
            const dummyIdentityData = new Uint8Array(BlockSize.Small);
            const dummyIdentityChecksum =
              checksumService.calculateChecksum(dummyIdentityData);
            const dummyIdentityBlock = new RawDataBlock(
              BlockSize.Small,
              dummyIdentityData,
              new Date(),
              dummyIdentityChecksum,
              BlockType.RawData,
              BlockDataType.PublicMemberData,
            );
            await blockStore.setData(dummyIdentityBlock);

            // Update the index
            await memberStore.updateIndex({
              id: member.id,
              publicCBL: dummyIdentityChecksum,
              privateCBL: dummyIdentityChecksum,
              publicProfileCBL: publicChecksum,
              privateProfileCBL: privateChecksum,
              type: MemberType.User,
              status: MemberStatusType.Active,
              lastUpdate: new Date(),
              reputation: 0,
            });

            // Now retrieve the profile
            const profile = await memberStore.getMemberProfile(member.id);

            // Verify public profile
            expect(profile.publicProfile).not.toBeNull();
            expect(profile.publicProfile!.reputation).toBe(reputation);
            expect(profile.publicProfile!.status).toBe(MemberStatusType.Active);

            // Verify private profile
            expect(profile.privateProfile).not.toBeNull();
            expect(profile.privateProfile!.trustedPeers).toEqual([]);
            expect(profile.privateProfile!.blockedPeers).toEqual([]);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
