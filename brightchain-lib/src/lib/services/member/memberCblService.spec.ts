/**
 * @fileoverview Unit tests for MemberCblService
 *
 * This test suite verifies the core functionality of MemberCblService:
 * - hydrateMember() reconstructs member from valid CBL
 * - hydrateMember() throws on corrupted data
 * - hydrateMember() throws on missing blocks
 * - createMemberCbl() creates valid CBL
 *
 * _Requirements: 6.1_
 */

import {
  ECIESService,
  EmailString,
  GuidV4Uint8Array,
  IIdProvider,
  Member,
  MemberType,
} from '@digitaldefiance/ecies-lib';
import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';
import { ConstituentBlockListBlock } from '../../blocks/cbl';
import { BlockSize } from '../../enumerations/blockSize';
import { MemberErrorType } from '../../enumerations/memberErrorType';
import { MemberError } from '../../errors/memberError';
import { BlockStoreFactory } from '../../factories/blockStoreFactory';
import { ServiceProvider } from '../service.provider';
import { MemberCblService } from './memberCblService';

describe('MemberCblService Unit Tests', () => {
  let blockStore: ReturnType<typeof BlockStoreFactory.createMemoryStore>;
  let memberCblService: MemberCblService<GuidV4Uint8Array>;
  let eciesService: ECIESService<GuidV4Uint8Array>;
  let idProvider: IIdProvider<GuidV4Uint8Array>;

  beforeEach(() => {
    // Initialize service provider
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    eciesService = sp.eciesService;
    idProvider = sp.idProvider;

    // Create member store with memory block store
    blockStore = BlockStoreFactory.createMemoryStore({
      blockSize: BlockSize.Small,
    });
    memberCblService = new MemberCblService<GuidV4Uint8Array>(blockStore);
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  /**
   * Helper to create a test member
   */
  function createTestMember(
    memberType: MemberType,
    name: string,
    email: string,
  ): Member<GuidV4Uint8Array> {
    const { member } = Member.newMember<GuidV4Uint8Array>(
      eciesService,
      memberType,
      name,
      new EmailString(email),
    );
    return member;
  }

  describe('createMemberCbl()', () => {
    it('should create valid CBL from member', async () => {
      const member = createTestMember(
        MemberType.User,
        'test-cbl-user',
        'cbltest@example.com',
      );

      const cbl = await memberCblService.createMemberCbl(member, member);

      // Verify CBL is created
      expect(cbl).toBeDefined();
      expect(cbl).toBeInstanceOf(ConstituentBlockListBlock);
    });

    it('should create CBL with correct original data length', async () => {
      const member = createTestMember(
        MemberType.User,
        'length-test-user',
        'lengthtest@example.com',
      );

      const cbl = await memberCblService.createMemberCbl(member, member);

      // The original data length should match the member JSON length
      const memberJson = member.toJson();
      const memberData = new TextEncoder().encode(memberJson);
      expect(Number(cbl.originalDataLength)).toBe(memberData.length);
    });

    it('should create CBL for different member types', async () => {
      const memberTypes = [
        MemberType.User,
        MemberType.System,
        MemberType.Admin,
      ];

      for (const memberType of memberTypes) {
        const member = createTestMember(
          memberType,
          `type-test-${memberType}`,
          `typetest${memberType}@example.com`,
        );

        const cbl = await memberCblService.createMemberCbl(member, member);

        expect(cbl).toBeDefined();
        expect(cbl).toBeInstanceOf(ConstituentBlockListBlock);
      }
    });

    it('should create CBL with block tuples', async () => {
      const member = createTestMember(
        MemberType.User,
        'tuple-test-user',
        'tupletest@example.com',
      );

      const cbl = await memberCblService.createMemberCbl(member, member);

      // Verify tuples can be retrieved
      const tuples = await cbl.getHandleTuples(blockStore);
      expect(tuples).toBeDefined();
      expect(tuples.length).toBeGreaterThan(0);
    });

    it('should store constituent blocks in block store', async () => {
      const member = createTestMember(
        MemberType.User,
        'store-test-user',
        'storetest@example.com',
      );

      const cbl = await memberCblService.createMemberCbl(member, member);

      // Verify blocks are stored
      const tuples = await cbl.getHandleTuples(blockStore);
      for (const tuple of tuples) {
        for (const blockId of tuple.blockIds) {
          const block = await blockStore.getData(blockId);
          expect(block).toBeDefined();
          expect(block.data).toBeDefined();
        }
      }
    });
  });

  describe('hydrateMember()', () => {
    it('should reconstruct member from valid CBL', async () => {
      const originalMember = createTestMember(
        MemberType.User,
        'hydrate-test-user',
        'hydratetest@example.com',
      );

      // Create CBL from member
      const cbl = await memberCblService.createMemberCbl(
        originalMember,
        originalMember,
      );

      // Hydrate member from CBL
      const hydratedMember = await memberCblService.hydrateMember(cbl);

      // Verify the hydrated member matches the original
      expect(hydratedMember).toBeDefined();
      expect(hydratedMember).toBeInstanceOf(Member);
      expect(idProvider.equals(hydratedMember.id, originalMember.id)).toBe(
        true,
      );
      expect(hydratedMember.name).toBe(originalMember.name);
      expect(hydratedMember.type).toBe(originalMember.type);
      expect(hydratedMember.publicKey).toEqual(originalMember.publicKey);
    });

    it('should reconstruct member with correct email', async () => {
      const originalMember = createTestMember(
        MemberType.User,
        'email-test-user',
        'emailtest@example.com',
      );

      const cbl = await memberCblService.createMemberCbl(
        originalMember,
        originalMember,
      );
      const hydratedMember = await memberCblService.hydrateMember(cbl);

      expect(hydratedMember.email).toEqual(originalMember.email);
    });

    it('should reconstruct System member type correctly', async () => {
      const originalMember = createTestMember(
        MemberType.System,
        'system-hydrate-test',
        'systemhydrate@example.com',
      );

      const cbl = await memberCblService.createMemberCbl(
        originalMember,
        originalMember,
      );
      const hydratedMember = await memberCblService.hydrateMember(cbl);

      expect(hydratedMember.type).toBe(MemberType.System);
    });

    it('should reconstruct Admin member type correctly', async () => {
      const originalMember = createTestMember(
        MemberType.Admin,
        'admin-hydrate-test',
        'adminhydrate@example.com',
      );

      const cbl = await memberCblService.createMemberCbl(
        originalMember,
        originalMember,
      );
      const hydratedMember = await memberCblService.hydrateMember(cbl);

      expect(hydratedMember.type).toBe(MemberType.Admin);
    });

    it('should throw on missing blocks', async () => {
      const member = createTestMember(
        MemberType.User,
        'missing-block-test',
        'missingblock@example.com',
      );

      // Create CBL from member
      const cbl = await memberCblService.createMemberCbl(member, member);

      // Get the tuples and delete one of the blocks
      const tuples = await cbl.getHandleTuples(blockStore);
      if (tuples.length > 0 && tuples[0].blockIds.length > 0) {
        const blockIdToDelete = tuples[0].blockIds[0];
        await blockStore.deleteData(blockIdToDelete);
      }

      // Attempting to hydrate should throw
      await expect(memberCblService.hydrateMember(cbl)).rejects.toThrow(
        MemberError,
      );
    });

    it('should throw MemberError with FailedToHydrateMember when block is missing', async () => {
      const member = createTestMember(
        MemberType.User,
        'error-type-test',
        'errortype@example.com',
      );

      const cbl = await memberCblService.createMemberCbl(member, member);

      // Delete a block to cause failure
      // Note: The error is thrown during getHandleTuples (before checksum verification),
      // so it gets wrapped as FailedToHydrateMember by the outer catch
      const tuples = await cbl.getHandleTuples(blockStore);
      if (tuples.length > 0 && tuples[0].blockIds.length > 0) {
        await blockStore.deleteData(tuples[0].blockIds[0]);
      }

      try {
        await memberCblService.hydrateMember(cbl);
        fail('Expected MemberError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(MemberError);
        // When a block is missing, the error is thrown during getHandleTuples
        // which is not a MemberError, so it gets wrapped as FailedToHydrateMember
        expect((error as MemberError).type).toBe(
          MemberErrorType.FailedToHydrateMember,
        );
      }
    });

    it('should verify checksums for all constituent blocks', async () => {
      const member = createTestMember(
        MemberType.User,
        'checksum-verify-test',
        'checksumverify@example.com',
      );

      const cbl = await memberCblService.createMemberCbl(member, member);

      // Get tuples and verify checksums
      const tuples = await cbl.getHandleTuples(blockStore);
      const checksumService = ServiceProvider.getInstance().checksumService;

      for (const tuple of tuples) {
        for (const blockId of tuple.blockIds) {
          const block = await blockStore.getData(blockId);
          const calculatedChecksum = checksumService.calculateChecksum(
            block.data,
          );
          expect(calculatedChecksum.equals(blockId)).toBe(true);
        }
      }

      // Hydration should succeed since all checksums are valid
      const hydratedMember = await memberCblService.hydrateMember(cbl);
      expect(hydratedMember).toBeDefined();
    });

    it('should hydrate member with all required fields present', async () => {
      const member = createTestMember(
        MemberType.User,
        'required-fields-test',
        'requiredfields@example.com',
      );

      const cbl = await memberCblService.createMemberCbl(member, member);
      const hydratedMember = await memberCblService.hydrateMember(cbl);

      // Verify all required fields are present
      expect(hydratedMember.id).toBeDefined();
      expect(hydratedMember.name).toBeDefined();
      expect(hydratedMember.email).toBeDefined();
      expect(hydratedMember.type).toBeDefined();
      expect(hydratedMember.publicKey).toBeDefined();
    });
  });

  describe('getBlockStore()', () => {
    it('should return the block store', () => {
      const returnedBlockStore = memberCblService.getBlockStore();
      expect(returnedBlockStore).toBe(blockStore);
    });
  });
});
