/**
 * @fileoverview Unit tests for CBL pool awareness (Task 10.1).
 *
 * Tests:
 * 1. InMemoryBlockTuple carries poolId when created with pool-scoped tuple creation
 * 2. CBLBase.getHandleTuples verifies pool integrity when poolVerification is provided
 * 3. CBLBase.getHandleTuples skips pool verification when poolVerification is omitted (backward compat)
 * 4. CBLBase.getHandleTuples throws CblError(PoolIntegrityError) when addresses are missing from pool
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
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
import { CblErrorType } from '../enumerations/cblErrorType';
import { CblError } from '../errors/cblError';
import { BlockStoreFactory } from '../factories/blockStoreFactory';
import { MemberCblService } from '../services/member/memberCblService';
import { ServiceProvider } from '../services/service.provider';

jest.setTimeout(60000);

describe('CBL Pool Awareness (Task 10.1)', () => {
  let blockStore: ReturnType<typeof BlockStoreFactory.createMemoryStore>;
  let memberCblService: MemberCblService<GuidV4Uint8Array>;
  let eciesService: ECIESService<GuidV4Uint8Array>;

  beforeEach(() => {
    const sp = ServiceProvider.getInstance<GuidV4Uint8Array>();
    eciesService = sp.eciesService;
    blockStore = BlockStoreFactory.createMemoryStore({
      blockSize: BlockSize.Small,
    });
    memberCblService = new MemberCblService<GuidV4Uint8Array>(blockStore);
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  function createTestMember(): Member<GuidV4Uint8Array> {
    const { member } = Member.newMember<GuidV4Uint8Array>(
      eciesService,
      MemberType.User,
      'pool-test-user',
      new EmailString('pooltest@example.com'),
    );
    return member;
  }

  describe('InMemoryBlockTuple poolId', () => {
    it('should carry poolId when constructed with one', async () => {
      const member = createTestMember();
      const cbl = await memberCblService.createMemberCbl(member, member);
      const tuples = await cbl.getHandleTuples(blockStore);
      expect(tuples.length).toBeGreaterThan(0);

      // Tuples created without pool context should not have a poolId
      // Now verify that getHandleTuples with poolVerification sets poolId
      const poolVerification = {
        poolId: 'carry-test-pool',
        hasInPool: async (_pool: string, _hash: string) => true,
      };
      const pooledTuples = await cbl.getHandleTuples(
        blockStore,
        poolVerification,
      );
      expect(pooledTuples.length).toBeGreaterThan(0);
      for (const tuple of pooledTuples) {
        expect(tuple.poolId).toBe('carry-test-pool');
      }
    });

    it('should have undefined poolId when constructed without one', async () => {
      const member = createTestMember();
      const cbl = await memberCblService.createMemberCbl(member, member);
      const tuples = await cbl.getHandleTuples(blockStore);
      expect(tuples.length).toBeGreaterThan(0);
      // Tuples created without pool options should have no poolId
      for (const tuple of tuples) {
        expect(tuple.poolId).toBeUndefined();
      }
    });
  });

  describe('getHandleTuples pool verification', () => {
    it('should succeed without poolVerification (backward compatible)', async () => {
      const member = createTestMember();
      const cbl = await memberCblService.createMemberCbl(member, member);

      // Call without poolVerification — should work as before
      const tuples = await cbl.getHandleTuples(blockStore);
      expect(tuples).toBeDefined();
      expect(tuples.length).toBeGreaterThan(0);
    });

    it('should succeed when all addresses exist in the specified pool', async () => {
      const member = createTestMember();
      const cbl = await memberCblService.createMemberCbl(member, member);

      // Create a hasInPool that always returns true (all blocks exist in pool)
      const poolVerification = {
        poolId: 'test-pool',
        hasInPool: async (_pool: string, _hash: string) => true,
      };

      const tuples = await cbl.getHandleTuples(blockStore, poolVerification);
      expect(tuples).toBeDefined();
      expect(tuples.length).toBeGreaterThan(0);

      // All tuples should have the poolId set
      for (const tuple of tuples) {
        expect(tuple.poolId).toBe('test-pool');
      }
    });

    it('should throw PoolIntegrityError when addresses are missing from pool', async () => {
      const member = createTestMember();
      const cbl = await memberCblService.createMemberCbl(member, member);

      // Create a hasInPool that always returns false (no blocks in pool)
      const poolVerification = {
        poolId: 'missing-pool',
        hasInPool: async (_pool: string, _hash: string) => false,
      };

      await expect(
        cbl.getHandleTuples(blockStore, poolVerification),
      ).rejects.toThrow(CblError);

      try {
        await cbl.getHandleTuples(blockStore, poolVerification);
      } catch (error) {
        expect(error).toBeInstanceOf(CblError);
        expect((error as CblError).type).toBe(CblErrorType.PoolIntegrityError);
      }
    });

    it('should throw PoolIntegrityError when some addresses are missing from pool', async () => {
      const member = createTestMember();
      const cbl = await memberCblService.createMemberCbl(member, member);

      // Get the addresses to know which ones exist
      const addresses = cbl.addresses;
      expect(addresses.length).toBeGreaterThan(0);

      // Only the first address is "in the pool", rest are missing
      const firstAddressHex = addresses[0].toHex();
      const poolVerification = {
        poolId: 'partial-pool',
        hasInPool: async (_pool: string, hash: string) =>
          hash === firstAddressHex,
      };

      await expect(
        cbl.getHandleTuples(blockStore, poolVerification),
      ).rejects.toThrow(CblError);

      try {
        await cbl.getHandleTuples(blockStore, poolVerification);
      } catch (error) {
        expect(error).toBeInstanceOf(CblError);
        expect((error as CblError).type).toBe(CblErrorType.PoolIntegrityError);
      }
    });

    it('should pass the correct poolId to hasInPool', async () => {
      const member = createTestMember();
      const cbl = await memberCblService.createMemberCbl(member, member);

      const calledWithPools: string[] = [];
      const poolVerification = {
        poolId: 'verify-pool-id',
        hasInPool: async (pool: string, _hash: string) => {
          calledWithPools.push(pool);
          return true;
        },
      };

      await cbl.getHandleTuples(blockStore, poolVerification);

      // Every call should have used the correct poolId
      expect(calledWithPools.length).toBe(cbl.addresses.length);
      for (const pool of calledWithPools) {
        expect(pool).toBe('verify-pool-id');
      }
    });
  });
});
