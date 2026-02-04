/**
 * @fileoverview Property-based tests for MemberStore error handling and validation
 *
 * **Feature: member-storage-audit, Property 4: Corrupted Data Rejection**
 * **Validates: Requirements 1.3, 2.3**
 *
 * **Feature: member-storage-audit, Property 5: Required Field Validation**
 * **Validates: Requirements 1.4**
 *
 * This test suite verifies that:
 * - For any valid CBL data that is subsequently corrupted, attempting to
 *   deserialize SHALL throw a MemberError with an appropriate error type.
 * - For any profile storage data missing required fields, hydration SHALL
 *   throw an error indicating the missing field.
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
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { MemberErrorType } from '../enumerations/memberErrorType';
import { MemberStatusType } from '../enumerations/memberStatusType';
import { MemberError } from '../errors/memberError';
import { BlockStoreFactory } from '../factories/blockStoreFactory';
import { MemberStore } from './memberStore';
import { ServiceProvider } from './service.provider';

describe('MemberStore Error Handling Property Tests', () => {
  let blockStore: ReturnType<typeof BlockStoreFactory.createMemoryStore>;
  let memberStore: MemberStore<GuidV4Uint8Array>;

  beforeEach(() => {
    ServiceProvider.getInstance<GuidV4Uint8Array>();
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
   * **Feature: member-storage-audit, Property 4: Corrupted Data Rejection**
   *
   * **Validates: Requirements 1.3, 2.3**
   *
   * *For any* valid CBL data that is subsequently corrupted (bytes modified,
   * truncated, or blocks removed), attempting to deserialize SHALL throw a
   * MemberError with an appropriate error type.
   */
  describe('Property 4: Corrupted Data Rejection', () => {
    /**
     * Property: Corrupted JSON profile data should be rejected.
     */
    it('should reject corrupted JSON profile data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999999 }),
          fc.integer({ min: 0, max: 100 }), // Position to corrupt
          async (suffix, corruptPosition) => {
            const { member } = createTestMember(
              `corrupt${suffix}`,
              `corrupt${suffix}@example.com`,
            );

            // Create valid JSON profile data
            const idProvider =
              ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
            const idHex = Array.from(idProvider.toBytes(member.id))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');

            const validJson = JSON.stringify({
              id: idHex,
              status: MemberStatusType.Active,
              lastActive: new Date().toISOString(),
              reputation: 100,
              storageQuota: '104857600',
              storageUsed: '0',
              dateCreated: new Date().toISOString(),
              dateUpdated: new Date().toISOString(),
            });

            // Corrupt the JSON by modifying bytes
            const jsonBytes = new TextEncoder().encode(validJson);
            const corruptedBytes = new Uint8Array(jsonBytes);
            const actualPosition = corruptPosition % jsonBytes.length;
            // Flip bits to corrupt the data
            corruptedBytes[actualPosition] ^= 0xff;

            // Pad to block size
            const blockData = new Uint8Array(BlockSize.Small);
            blockData.set(corruptedBytes);

            // Calculate checksum and create block
            const checksumService =
              ServiceProvider.getInstance().checksumService;
            const checksum = checksumService.calculateChecksum(blockData);

            const corruptedBlock = new RawDataBlock(
              BlockSize.Small,
              blockData,
              new Date(),
              checksum,
              BlockType.RawData,
              BlockDataType.PublicMemberData,
            );

            await blockStore.setData(corruptedBlock);

            // Create dummy identity block
            const dummyData = new Uint8Array(BlockSize.Small);
            const dummyChecksum = checksumService.calculateChecksum(dummyData);
            const dummyBlock = new RawDataBlock(
              BlockSize.Small,
              dummyData,
              new Date(),
              dummyChecksum,
              BlockType.RawData,
              BlockDataType.PublicMemberData,
            );
            await blockStore.setData(dummyBlock);

            // Update index with corrupted profile block
            await memberStore.updateIndex({
              id: member.id,
              publicCBL: dummyChecksum,
              privateCBL: dummyChecksum,
              publicProfileCBL: checksum,
              privateProfileCBL: checksum,
              type: MemberType.User,
              status: MemberStatusType.Active,
              lastUpdate: new Date(),
              reputation: 0,
            });

            // Attempt to retrieve profile - should throw MemberError
            await expect(
              memberStore.getMemberProfile(member.id),
            ).rejects.toThrow(MemberError);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });


    /**
     * Property: Truncated profile data should be rejected.
     */
    it('should reject truncated profile data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 999999 }),
          fc.integer({ min: 1, max: 50 }), // Truncation amount
          async (suffix, truncateAmount) => {
            const { member } = createTestMember(
              `truncate${suffix}`,
              `truncate${suffix}@example.com`,
            );

            // Create valid JSON profile data
            const idProvider =
              ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
            const idHex = Array.from(idProvider.toBytes(member.id))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('');

            const validJson = JSON.stringify({
              id: idHex,
              status: MemberStatusType.Active,
              lastActive: new Date().toISOString(),
              reputation: 100,
              storageQuota: '104857600',
              storageUsed: '0',
              dateCreated: new Date().toISOString(),
              dateUpdated: new Date().toISOString(),
            });

            // Truncate the JSON
            const jsonBytes = new TextEncoder().encode(validJson);
            const actualTruncate = Math.min(
              truncateAmount,
              jsonBytes.length - 1,
            );
            const truncatedBytes = jsonBytes.slice(
              0,
              jsonBytes.length - actualTruncate,
            );

            // Pad to block size
            const blockData = new Uint8Array(BlockSize.Small);
            blockData.set(truncatedBytes);

            // Calculate checksum and create block
            const checksumService =
              ServiceProvider.getInstance().checksumService;
            const checksum = checksumService.calculateChecksum(blockData);

            const truncatedBlock = new RawDataBlock(
              BlockSize.Small,
              blockData,
              new Date(),
              checksum,
              BlockType.RawData,
              BlockDataType.PublicMemberData,
            );

            await blockStore.setData(truncatedBlock);

            // Create dummy identity block
            const dummyData = new Uint8Array(BlockSize.Small);
            const dummyChecksum = checksumService.calculateChecksum(dummyData);
            const dummyBlock = new RawDataBlock(
              BlockSize.Small,
              dummyData,
              new Date(),
              dummyChecksum,
              BlockType.RawData,
              BlockDataType.PublicMemberData,
            );
            await blockStore.setData(dummyBlock);

            // Update index with truncated profile block
            await memberStore.updateIndex({
              id: member.id,
              publicCBL: dummyChecksum,
              privateCBL: dummyChecksum,
              publicProfileCBL: checksum,
              privateProfileCBL: checksum,
              type: MemberType.User,
              status: MemberStatusType.Active,
              lastUpdate: new Date(),
              reputation: 0,
            });

            // Attempt to retrieve profile - should throw MemberError
            await expect(
              memberStore.getMemberProfile(member.id),
            ).rejects.toThrow(MemberError);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Empty block data should be rejected.
     */
    it('should reject empty block data', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 999999 }), async (suffix) => {
          const { member } = createTestMember(
            `empty${suffix}`,
            `empty${suffix}@example.com`,
          );

          // Create empty block data
          const blockData = new Uint8Array(BlockSize.Small);

          // Calculate checksum and create block
          const checksumService =
            ServiceProvider.getInstance().checksumService;
          const checksum = checksumService.calculateChecksum(blockData);

          const emptyBlock = new RawDataBlock(
            BlockSize.Small,
            blockData,
            new Date(),
            checksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );

          await blockStore.setData(emptyBlock);

          // Update index with empty profile block
          await memberStore.updateIndex({
            id: member.id,
            publicCBL: checksum,
            privateCBL: checksum,
            publicProfileCBL: checksum,
            privateProfileCBL: checksum,
            type: MemberType.User,
            status: MemberStatusType.Active,
            lastUpdate: new Date(),
            reputation: 0,
          });

          // Attempt to retrieve profile - should throw MemberError
          await expect(memberStore.getMemberProfile(member.id)).rejects.toThrow(
            MemberError,
          );

          return true;
        }),
        { numRuns: 50 },
      );
    });
  });


  /**
   * **Feature: member-storage-audit, Property 5: Required Field Validation**
   *
   * **Validates: Requirements 1.4**
   *
   * *For any* profile storage data missing one or more required fields
   * (id, status, dateCreated, dateUpdated for public; id, trustedPeers,
   * blockedPeers, settings for private), hydration SHALL throw an error
   * indicating the missing field.
   */
  describe('Property 5: Required Field Validation', () => {
    /**
     * Property: Public profile missing 'id' should be rejected.
     */
    it('should reject public profile missing id field', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 999999 }), async (suffix) => {
          const { member } = createTestMember(
            `missingId${suffix}`,
            `missingId${suffix}@example.com`,
          );

          // Create JSON without 'id' field
          const invalidJson = JSON.stringify({
            // id is missing
            status: MemberStatusType.Active,
            lastActive: new Date().toISOString(),
            reputation: 100,
            storageQuota: '104857600',
            storageUsed: '0',
            dateCreated: new Date().toISOString(),
            dateUpdated: new Date().toISOString(),
          });

          const jsonBytes = new TextEncoder().encode(invalidJson);
          const blockData = new Uint8Array(BlockSize.Small);
          blockData.set(jsonBytes);

          const checksumService =
            ServiceProvider.getInstance().checksumService;
          const checksum = checksumService.calculateChecksum(blockData);

          const block = new RawDataBlock(
            BlockSize.Small,
            blockData,
            new Date(),
            checksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );

          await blockStore.setData(block);

          // Create dummy identity block
          const dummyData = new Uint8Array(BlockSize.Small);
          const dummyChecksum = checksumService.calculateChecksum(dummyData);
          const dummyBlock = new RawDataBlock(
            BlockSize.Small,
            dummyData,
            new Date(),
            dummyChecksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );
          await blockStore.setData(dummyBlock);

          await memberStore.updateIndex({
            id: member.id,
            publicCBL: dummyChecksum,
            privateCBL: dummyChecksum,
            publicProfileCBL: checksum,
            privateProfileCBL: undefined,
            type: MemberType.User,
            status: MemberStatusType.Active,
            lastUpdate: new Date(),
            reputation: 0,
          });

          await expect(memberStore.getMemberProfile(member.id)).rejects.toThrow(
            MemberError,
          );

          return true;
        }),
        { numRuns: 50 },
      );
    });


    /**
     * Property: Public profile missing 'status' should be rejected.
     */
    it('should reject public profile missing status field', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 999999 }), async (suffix) => {
          const { member } = createTestMember(
            `missingStatus${suffix}`,
            `missingStatus${suffix}@example.com`,
          );

          const idProvider =
            ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
          const idHex = Array.from(idProvider.toBytes(member.id))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          // Create JSON without 'status' field
          const invalidJson = JSON.stringify({
            id: idHex,
            // status is missing
            lastActive: new Date().toISOString(),
            reputation: 100,
            storageQuota: '104857600',
            storageUsed: '0',
            dateCreated: new Date().toISOString(),
            dateUpdated: new Date().toISOString(),
          });

          const jsonBytes = new TextEncoder().encode(invalidJson);
          const blockData = new Uint8Array(BlockSize.Small);
          blockData.set(jsonBytes);

          const checksumService =
            ServiceProvider.getInstance().checksumService;
          const checksum = checksumService.calculateChecksum(blockData);

          const block = new RawDataBlock(
            BlockSize.Small,
            blockData,
            new Date(),
            checksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );

          await blockStore.setData(block);

          // Create dummy identity block
          const dummyData = new Uint8Array(BlockSize.Small);
          const dummyChecksum = checksumService.calculateChecksum(dummyData);
          const dummyBlock = new RawDataBlock(
            BlockSize.Small,
            dummyData,
            new Date(),
            dummyChecksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );
          await blockStore.setData(dummyBlock);

          await memberStore.updateIndex({
            id: member.id,
            publicCBL: dummyChecksum,
            privateCBL: dummyChecksum,
            publicProfileCBL: checksum,
            privateProfileCBL: undefined,
            type: MemberType.User,
            status: MemberStatusType.Active,
            lastUpdate: new Date(),
            reputation: 0,
          });

          await expect(memberStore.getMemberProfile(member.id)).rejects.toThrow(
            MemberError,
          );

          return true;
        }),
        { numRuns: 50 },
      );
    });


    /**
     * Property: Public profile missing 'dateCreated' should be rejected.
     */
    it('should reject public profile missing dateCreated field', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 999999 }), async (suffix) => {
          const { member } = createTestMember(
            `missingDateCreated${suffix}`,
            `missingDateCreated${suffix}@example.com`,
          );

          const idProvider =
            ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
          const idHex = Array.from(idProvider.toBytes(member.id))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          // Create JSON without 'dateCreated' field
          const invalidJson = JSON.stringify({
            id: idHex,
            status: MemberStatusType.Active,
            lastActive: new Date().toISOString(),
            reputation: 100,
            storageQuota: '104857600',
            storageUsed: '0',
            // dateCreated is missing
            dateUpdated: new Date().toISOString(),
          });

          const jsonBytes = new TextEncoder().encode(invalidJson);
          const blockData = new Uint8Array(BlockSize.Small);
          blockData.set(jsonBytes);

          const checksumService =
            ServiceProvider.getInstance().checksumService;
          const checksum = checksumService.calculateChecksum(blockData);

          const block = new RawDataBlock(
            BlockSize.Small,
            blockData,
            new Date(),
            checksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );

          await blockStore.setData(block);

          // Create dummy identity block
          const dummyData = new Uint8Array(BlockSize.Small);
          const dummyChecksum = checksumService.calculateChecksum(dummyData);
          const dummyBlock = new RawDataBlock(
            BlockSize.Small,
            dummyData,
            new Date(),
            dummyChecksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );
          await blockStore.setData(dummyBlock);

          await memberStore.updateIndex({
            id: member.id,
            publicCBL: dummyChecksum,
            privateCBL: dummyChecksum,
            publicProfileCBL: checksum,
            privateProfileCBL: undefined,
            type: MemberType.User,
            status: MemberStatusType.Active,
            lastUpdate: new Date(),
            reputation: 0,
          });

          await expect(memberStore.getMemberProfile(member.id)).rejects.toThrow(
            MemberError,
          );

          return true;
        }),
        { numRuns: 50 },
      );
    });


    /**
     * Property: Public profile missing 'dateUpdated' should be rejected.
     */
    it('should reject public profile missing dateUpdated field', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 999999 }), async (suffix) => {
          const { member } = createTestMember(
            `missingDateUpdated${suffix}`,
            `missingDateUpdated${suffix}@example.com`,
          );

          const idProvider =
            ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
          const idHex = Array.from(idProvider.toBytes(member.id))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          // Create JSON without 'dateUpdated' field
          const invalidJson = JSON.stringify({
            id: idHex,
            status: MemberStatusType.Active,
            lastActive: new Date().toISOString(),
            reputation: 100,
            storageQuota: '104857600',
            storageUsed: '0',
            dateCreated: new Date().toISOString(),
            // dateUpdated is missing
          });

          const jsonBytes = new TextEncoder().encode(invalidJson);
          const blockData = new Uint8Array(BlockSize.Small);
          blockData.set(jsonBytes);

          const checksumService =
            ServiceProvider.getInstance().checksumService;
          const checksum = checksumService.calculateChecksum(blockData);

          const block = new RawDataBlock(
            BlockSize.Small,
            blockData,
            new Date(),
            checksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );

          await blockStore.setData(block);

          // Create dummy identity block
          const dummyData = new Uint8Array(BlockSize.Small);
          const dummyChecksum = checksumService.calculateChecksum(dummyData);
          const dummyBlock = new RawDataBlock(
            BlockSize.Small,
            dummyData,
            new Date(),
            dummyChecksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );
          await blockStore.setData(dummyBlock);

          await memberStore.updateIndex({
            id: member.id,
            publicCBL: dummyChecksum,
            privateCBL: dummyChecksum,
            publicProfileCBL: checksum,
            privateProfileCBL: undefined,
            type: MemberType.User,
            status: MemberStatusType.Active,
            lastUpdate: new Date(),
            reputation: 0,
          });

          await expect(memberStore.getMemberProfile(member.id)).rejects.toThrow(
            MemberError,
          );

          return true;
        }),
        { numRuns: 50 },
      );
    });


    /**
     * Property: Private profile missing 'trustedPeers' should be rejected.
     */
    it('should reject private profile missing trustedPeers field', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 999999 }), async (suffix) => {
          const { member } = createTestMember(
            `missingTrusted${suffix}`,
            `missingTrusted${suffix}@example.com`,
          );

          const idProvider =
            ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
          const idHex = Array.from(idProvider.toBytes(member.id))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          // Create JSON without 'trustedPeers' field
          const invalidJson = JSON.stringify({
            id: idHex,
            // trustedPeers is missing
            blockedPeers: [],
            settings: { autoReplication: true },
            activityLog: [],
            dateCreated: new Date().toISOString(),
            dateUpdated: new Date().toISOString(),
          });

          const jsonBytes = new TextEncoder().encode(invalidJson);
          const blockData = new Uint8Array(BlockSize.Small);
          blockData.set(jsonBytes);

          const checksumService =
            ServiceProvider.getInstance().checksumService;
          const checksum = checksumService.calculateChecksum(blockData);

          const block = new RawDataBlock(
            BlockSize.Small,
            blockData,
            new Date(),
            checksum,
            BlockType.RawData,
            BlockDataType.PrivateMemberData,
          );

          await blockStore.setData(block);

          // Create dummy identity block
          const dummyData = new Uint8Array(BlockSize.Small);
          const dummyChecksum = checksumService.calculateChecksum(dummyData);
          const dummyBlock = new RawDataBlock(
            BlockSize.Small,
            dummyData,
            new Date(),
            dummyChecksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );
          await blockStore.setData(dummyBlock);

          await memberStore.updateIndex({
            id: member.id,
            publicCBL: dummyChecksum,
            privateCBL: dummyChecksum,
            publicProfileCBL: undefined,
            privateProfileCBL: checksum,
            type: MemberType.User,
            status: MemberStatusType.Active,
            lastUpdate: new Date(),
            reputation: 0,
          });

          await expect(memberStore.getMemberProfile(member.id)).rejects.toThrow(
            MemberError,
          );

          return true;
        }),
        { numRuns: 50 },
      );
    });


    /**
     * Property: Private profile missing 'blockedPeers' should be rejected.
     */
    it('should reject private profile missing blockedPeers field', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 999999 }), async (suffix) => {
          const { member } = createTestMember(
            `missingBlocked${suffix}`,
            `missingBlocked${suffix}@example.com`,
          );

          const idProvider =
            ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
          const idHex = Array.from(idProvider.toBytes(member.id))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          // Create JSON without 'blockedPeers' field
          const invalidJson = JSON.stringify({
            id: idHex,
            trustedPeers: [],
            // blockedPeers is missing
            settings: { autoReplication: true },
            activityLog: [],
            dateCreated: new Date().toISOString(),
            dateUpdated: new Date().toISOString(),
          });

          const jsonBytes = new TextEncoder().encode(invalidJson);
          const blockData = new Uint8Array(BlockSize.Small);
          blockData.set(jsonBytes);

          const checksumService =
            ServiceProvider.getInstance().checksumService;
          const checksum = checksumService.calculateChecksum(blockData);

          const block = new RawDataBlock(
            BlockSize.Small,
            blockData,
            new Date(),
            checksum,
            BlockType.RawData,
            BlockDataType.PrivateMemberData,
          );

          await blockStore.setData(block);

          // Create dummy identity block
          const dummyData = new Uint8Array(BlockSize.Small);
          const dummyChecksum = checksumService.calculateChecksum(dummyData);
          const dummyBlock = new RawDataBlock(
            BlockSize.Small,
            dummyData,
            new Date(),
            dummyChecksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );
          await blockStore.setData(dummyBlock);

          await memberStore.updateIndex({
            id: member.id,
            publicCBL: dummyChecksum,
            privateCBL: dummyChecksum,
            publicProfileCBL: undefined,
            privateProfileCBL: checksum,
            type: MemberType.User,
            status: MemberStatusType.Active,
            lastUpdate: new Date(),
            reputation: 0,
          });

          await expect(memberStore.getMemberProfile(member.id)).rejects.toThrow(
            MemberError,
          );

          return true;
        }),
        { numRuns: 50 },
      );
    });


    /**
     * Property: Private profile missing 'settings' should be rejected.
     */
    it('should reject private profile missing settings field', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 999999 }), async (suffix) => {
          const { member } = createTestMember(
            `missingSettings${suffix}`,
            `missingSettings${suffix}@example.com`,
          );

          const idProvider =
            ServiceProvider.getInstance<GuidV4Uint8Array>().idProvider;
          const idHex = Array.from(idProvider.toBytes(member.id))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          // Create JSON without 'settings' field
          const invalidJson = JSON.stringify({
            id: idHex,
            trustedPeers: [],
            blockedPeers: [],
            // settings is missing
            activityLog: [],
            dateCreated: new Date().toISOString(),
            dateUpdated: new Date().toISOString(),
          });

          const jsonBytes = new TextEncoder().encode(invalidJson);
          const blockData = new Uint8Array(BlockSize.Small);
          blockData.set(jsonBytes);

          const checksumService =
            ServiceProvider.getInstance().checksumService;
          const checksum = checksumService.calculateChecksum(blockData);

          const block = new RawDataBlock(
            BlockSize.Small,
            blockData,
            new Date(),
            checksum,
            BlockType.RawData,
            BlockDataType.PrivateMemberData,
          );

          await blockStore.setData(block);

          // Create dummy identity block
          const dummyData = new Uint8Array(BlockSize.Small);
          const dummyChecksum = checksumService.calculateChecksum(dummyData);
          const dummyBlock = new RawDataBlock(
            BlockSize.Small,
            dummyData,
            new Date(),
            dummyChecksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );
          await blockStore.setData(dummyBlock);

          await memberStore.updateIndex({
            id: member.id,
            publicCBL: dummyChecksum,
            privateCBL: dummyChecksum,
            publicProfileCBL: undefined,
            privateProfileCBL: checksum,
            type: MemberType.User,
            status: MemberStatusType.Active,
            lastUpdate: new Date(),
            reputation: 0,
          });

          await expect(memberStore.getMemberProfile(member.id)).rejects.toThrow(
            MemberError,
          );

          return true;
        }),
        { numRuns: 50 },
      );
    });

    /**
     * Property: Private profile missing 'id' should be rejected.
     */
    it('should reject private profile missing id field', async () => {
      await fc.assert(
        fc.asyncProperty(fc.integer({ min: 1, max: 999999 }), async (suffix) => {
          const { member } = createTestMember(
            `missingPrivateId${suffix}`,
            `missingPrivateId${suffix}@example.com`,
          );

          // Create JSON without 'id' field
          const invalidJson = JSON.stringify({
            // id is missing
            trustedPeers: [],
            blockedPeers: [],
            settings: { autoReplication: true },
            activityLog: [],
            dateCreated: new Date().toISOString(),
            dateUpdated: new Date().toISOString(),
          });

          const jsonBytes = new TextEncoder().encode(invalidJson);
          const blockData = new Uint8Array(BlockSize.Small);
          blockData.set(jsonBytes);

          const checksumService =
            ServiceProvider.getInstance().checksumService;
          const checksum = checksumService.calculateChecksum(blockData);

          const block = new RawDataBlock(
            BlockSize.Small,
            blockData,
            new Date(),
            checksum,
            BlockType.RawData,
            BlockDataType.PrivateMemberData,
          );

          await blockStore.setData(block);

          // Create dummy identity block
          const dummyData = new Uint8Array(BlockSize.Small);
          const dummyChecksum = checksumService.calculateChecksum(dummyData);
          const dummyBlock = new RawDataBlock(
            BlockSize.Small,
            dummyData,
            new Date(),
            dummyChecksum,
            BlockType.RawData,
            BlockDataType.PublicMemberData,
          );
          await blockStore.setData(dummyBlock);

          await memberStore.updateIndex({
            id: member.id,
            publicCBL: dummyChecksum,
            privateCBL: dummyChecksum,
            publicProfileCBL: undefined,
            privateProfileCBL: checksum,
            type: MemberType.User,
            status: MemberStatusType.Active,
            lastUpdate: new Date(),
            reputation: 0,
          });

          await expect(memberStore.getMemberProfile(member.id)).rejects.toThrow(
            MemberError,
          );

          return true;
        }),
        { numRuns: 50 },
      );
    });
  });
});
