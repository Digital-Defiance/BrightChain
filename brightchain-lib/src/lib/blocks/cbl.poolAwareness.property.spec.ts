/**
 * @fileoverview Property-based tests for CBL pool awareness.
 *
 * Feature: pool-scoped-whitening, Property 13: CBL records pool on pool-scoped creation
 * Feature: pool-scoped-whitening, Property 14: CBL reconstruction verifies pool integrity
 *
 * Validates: Requirements 9.2, 9.3, 9.4
 *
 * Property 13: For any CBL created via pool-scoped tuple creation with PoolId P,
 * the CBL's block metadata SHALL have poolId equal to P.
 *
 * Property 14: For any CBL with a recorded PoolId P, when getHandleTuples is
 * called with a pool-aware store, the reconstruction process SHALL verify that
 * all referenced block addresses exist in pool P. If any address is missing
 * from pool P, the process SHALL report a pool integrity error.
 *
 * We test Property 13 by verifying that InMemoryBlockTuple — the carrier of CBL tuple
 * data returned from TupleService.dataStreamToPlaintextTuplesAndCBL — records
 * the poolId when created with pool-scoped options. The TupleService wraps
 * every emitted tuple (including the final CBL tuple) with the poolId from
 * poolOptions, so verifying InMemoryBlockTuple.poolId propagation is the
 * direct test of this property.
 *
 * We test Property 14 by creating real CBLs with known addresses and calling
 * getHandleTuples with poolVerification objects that simulate pool membership
 * checks. When hasInPool returns false for any address, getHandleTuples SHALL
 * throw CblError(PoolIntegrityError).
 */

import { EmailString, Member, MemberType } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { TUPLE } from '../constants';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize } from '../enumerations/blockSize';
import { CblErrorType } from '../enumerations/cblErrorType';
import { CblError } from '../errors/cblError';
import { initializeBrightChain, resetInitialization } from '../init';
import { ServiceProvider } from '../services/service.provider';
import { ConstituentBlockListBlock } from './cbl';
import { InMemoryBlockTuple } from './memoryTuple';
import { RandomBlock } from './random';
import { RawDataBlock } from './rawData';

jest.setTimeout(30000);

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Valid pool ID strings matching /^[a-zA-Z0-9_-]{1,64}$/ */
const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

/** A small block size suitable for fast property tests */
const arbBlockSize: fc.Arbitrary<BlockSize> = fc.constantFrom(
  BlockSize.Message,
  BlockSize.Tiny,
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create TUPLE.SIZE random blocks of the given size for use in a tuple.
 */
function createRandomBlocks(blockSize: BlockSize): RandomBlock[] {
  const blocks: RandomBlock[] = [];
  for (let i = 0; i < TUPLE.SIZE; i++) {
    blocks.push(RandomBlock.new(blockSize));
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Property 13: CBL records pool on pool-scoped creation
// ---------------------------------------------------------------------------

describe('CBL Pool Awareness Property Tests', () => {
  beforeAll(() => {
    initializeBrightChain();
  });

  afterAll(() => {
    resetInitialization();
  });

  describe('Property 13: CBL records pool on pool-scoped creation', () => {
    /**
     * **Feature: pool-scoped-whitening, Property 13: CBL records pool on pool-scoped creation**
     *
     * For any valid PoolId P and any set of blocks forming a tuple,
     * when InMemoryBlockTuple is constructed with poolId P (as done by
     * TupleService during pool-scoped tuple creation), the tuple's poolId
     * SHALL equal P.
     *
     * **Validates: Requirements 9.2**
     */
    it('InMemoryBlockTuple constructed with poolId carries that poolId', async () => {
      await fc.assert(
        fc.asyncProperty(arbPoolId, arbBlockSize, async (poolId, blockSize) => {
          const blocks = createRandomBlocks(blockSize);
          const tuple = new InMemoryBlockTuple(blocks, poolId);

          expect(tuple.poolId).toBe(poolId);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 13: CBL records pool on pool-scoped creation**
     *
     * For any valid PoolId P, InMemoryBlockTuple.fromBlocks with poolId P
     * SHALL produce a tuple whose poolId equals P. This is the static
     * factory path used by TupleService when re-wrapping tuples with a
     * pool context.
     *
     * **Validates: Requirements 9.2**
     */
    it('InMemoryBlockTuple.fromBlocks with poolId carries that poolId', async () => {
      await fc.assert(
        fc.asyncProperty(arbPoolId, arbBlockSize, async (poolId, blockSize) => {
          const blocks = createRandomBlocks(blockSize);
          const tuple = InMemoryBlockTuple.fromBlocks(blocks, poolId);

          expect(tuple.poolId).toBe(poolId);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 13: CBL records pool on pool-scoped creation**
     *
     * For any set of blocks forming a tuple, when InMemoryBlockTuple is
     * constructed WITHOUT a poolId (legacy/unpooled path), the tuple's
     * poolId SHALL be undefined. This confirms the pool recording is
     * opt-in and backward compatible.
     *
     * **Validates: Requirements 9.2**
     */
    it('InMemoryBlockTuple without poolId has undefined poolId', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockSize, async (blockSize) => {
          const blocks = createRandomBlocks(blockSize);
          const tuple = new InMemoryBlockTuple(blocks);

          expect(tuple.poolId).toBeUndefined();
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 13: CBL records pool on pool-scoped creation**
     *
     * For any two distinct pool IDs P1 and P2, two tuples created from
     * the same blocks but with different poolIds SHALL report their
     * respective poolIds correctly. This ensures poolId is not shared
     * or leaked between tuple instances.
     *
     * **Validates: Requirements 9.2**
     */
    it('distinct poolIds produce tuples with distinct poolId values', async () => {
      const arbDistinctPoolPair = fc
        .tuple(arbPoolId, arbPoolId)
        .filter(([a, b]) => a !== b);

      await fc.assert(
        fc.asyncProperty(
          arbDistinctPoolPair,
          arbBlockSize,
          async ([poolA, poolB], blockSize) => {
            const blocksA = createRandomBlocks(blockSize);
            const blocksB = createRandomBlocks(blockSize);

            const tupleA = new InMemoryBlockTuple(blocksA, poolA);
            const tupleB = new InMemoryBlockTuple(blocksB, poolB);

            expect(tupleA.poolId).toBe(poolA);
            expect(tupleB.poolId).toBe(poolB);
            expect(tupleA.poolId).not.toBe(tupleB.poolId);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // Property 14: CBL reconstruction verifies pool integrity
  // -------------------------------------------------------------------------

  describe('Property 14: CBL reconstruction verifies pool integrity', () => {
    /**
     * Helper: create a real CBL with known addresses.
     *
     * Uses cblService.makeCblHeader to produce a properly structured CBL
     * whose addresses are the checksums of the provided RawDataBlocks.
     * The CBL is constructed with a real Member so signature validation
     * passes (or is skipped when no public key is available).
     */
    function createCblWithAddresses(
      creator: Member,
      blockSize: BlockSize,
      blocks: RawDataBlock[],
    ): ConstituentBlockListBlock {
      const sp = ServiceProvider.getInstance();
      const cblService = sp.cblService;

      // Collect checksums from the blocks
      const checksums = blocks.map((b) => b.idChecksum);

      // Build the address byte array
      const addressBytes = new Uint8Array(
        checksums.reduce((acc, c) => acc + c.toUint8Array().length, 0),
      );
      let offset = 0;
      for (const c of checksums) {
        addressBytes.set(c.toUint8Array(), offset);
        offset += c.toUint8Array().length;
      }

      const { headerData } = cblService.makeCblHeader(
        creator,
        new Date(),
        checksums.length,
        1024, // arbitrary original data length
        addressBytes,
        blockSize,
        BlockEncryptionType.None,
      );

      // Assemble and pad to block size
      const combined = new Uint8Array(headerData.length + addressBytes.length);
      combined.set(new Uint8Array(headerData), 0);
      combined.set(addressBytes, headerData.length);

      const padded = new Uint8Array(blockSize);
      padded.set(combined.subarray(0, Math.min(combined.length, blockSize)));

      return new ConstituentBlockListBlock(padded, creator, blockSize);
    }

    /**
     * Helper: create N random RawDataBlocks of the given size.
     * The count must be a multiple of TUPLE.SIZE for valid CBL structure.
     */
    function createRawBlocks(
      blockSize: BlockSize,
      count: number,
    ): RawDataBlock[] {
      const sp = ServiceProvider.getInstance();
      const result: RawDataBlock[] = [];
      for (let i = 0; i < count; i++) {
        const data = new Uint8Array(blockSize);
        crypto.getRandomValues(data);
        const checksum = sp.checksumService.calculateChecksum(data);
        result.push(new RawDataBlock(blockSize, data, new Date(), checksum));
      }
      return result;
    }

    let creator: Member;

    beforeAll(() => {
      creator = Member.newMember(
        ServiceProvider.getInstance().eciesService,
        MemberType.User,
        'Property14TestUser',
        new EmailString('prop14@test.com'),
      ).member;
    });

    /**
     * **Feature: pool-scoped-whitening, Property 14: CBL reconstruction verifies pool integrity**
     *
     * For any CBL with a recorded PoolId P, when getHandleTuples is called
     * with poolVerification where hasInPool returns true for ALL addresses,
     * the reconstruction SHALL succeed without throwing a pool integrity error.
     *
     * **Validates: Requirements 9.3**
     */
    it('getHandleTuples succeeds when all addresses exist in the pool', async () => {
      await fc.assert(
        fc.asyncProperty(arbPoolId, arbBlockSize, async (poolId, blockSize) => {
          const blocks = createRawBlocks(blockSize, TUPLE.SIZE);
          const cbl = createCblWithAddresses(creator, blockSize, blocks);

          // Build a mock store that returns the blocks by checksum
          const blockMap = new Map<string, RawDataBlock>();
          for (const b of blocks) {
            blockMap.set(b.idChecksum.toHex(), b);
          }
          const mockStore = {
            getData: async (key: { toHex(): string }) => {
              const block = blockMap.get(key.toHex());
              if (!block) throw new Error(`Block not found: ${key.toHex()}`);
              return block;
            },
          };

          // All addresses exist in pool → should succeed
          const poolVerification = {
            poolId,
            hasInPool: async (_pool: string, _hash: string) => true,
          };

          const tuples = await cbl.getHandleTuples(mockStore, poolVerification);
          expect(tuples).toBeDefined();
          expect(tuples.length).toBeGreaterThan(0);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 14: CBL reconstruction verifies pool integrity**
     *
     * For any CBL with a recorded PoolId P, when getHandleTuples is called
     * with poolVerification where hasInPool returns false for ALL addresses,
     * the reconstruction SHALL throw CblError with PoolIntegrityError type.
     *
     * **Validates: Requirements 9.3, 9.4**
     */
    it('getHandleTuples throws PoolIntegrityError when all addresses are missing from pool', async () => {
      await fc.assert(
        fc.asyncProperty(arbPoolId, arbBlockSize, async (poolId, blockSize) => {
          const blocks = createRawBlocks(blockSize, TUPLE.SIZE);
          const cbl = createCblWithAddresses(creator, blockSize, blocks);

          // No addresses exist in pool → should throw before getData is called
          const poolVerification = {
            poolId,
            hasInPool: async (_pool: string, _hash: string) => false,
          };

          // A dummy store — getData should never be reached
          const mockStore = {
            getData: async () => {
              throw new Error(
                'getData should not be called when pool verification fails',
              );
            },
          };

          try {
            await cbl.getHandleTuples(mockStore, poolVerification);
            // Should not reach here
            expect(true).toBe(false);
          } catch (error) {
            expect(error).toBeInstanceOf(CblError);
            expect((error as CblError).type).toBe(
              CblErrorType.PoolIntegrityError,
            );
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 14: CBL reconstruction verifies pool integrity**
     *
     * For any CBL with a recorded PoolId P and at least one address missing
     * from pool P, getHandleTuples SHALL throw CblError with PoolIntegrityError.
     * This tests the partial-missing case: some addresses exist, some don't.
     *
     * **Validates: Requirements 9.3, 9.4**
     */
    it('getHandleTuples throws PoolIntegrityError when some addresses are missing from pool', async () => {
      await fc.assert(
        fc.asyncProperty(arbPoolId, arbBlockSize, async (poolId, blockSize) => {
          const blocks = createRawBlocks(blockSize, TUPLE.SIZE);
          const cbl = createCblWithAddresses(creator, blockSize, blocks);

          const addresses = cbl.addresses;
          // Only the first address is "in the pool"; the rest are missing
          const firstHex = addresses[0].toHex();

          const poolVerification = {
            poolId,
            hasInPool: async (_pool: string, hash: string) => hash === firstHex,
          };

          const mockStore = {
            getData: async () => {
              throw new Error(
                'getData should not be called when pool verification fails',
              );
            },
          };

          try {
            await cbl.getHandleTuples(mockStore, poolVerification);
            expect(true).toBe(false);
          } catch (error) {
            expect(error).toBeInstanceOf(CblError);
            expect((error as CblError).type).toBe(
              CblErrorType.PoolIntegrityError,
            );
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 14: CBL reconstruction verifies pool integrity**
     *
     * For any CBL with a recorded PoolId P, the poolVerification.poolId
     * SHALL be passed to every hasInPool call. This ensures the correct
     * pool is checked for every address during reconstruction.
     *
     * **Validates: Requirements 9.3**
     */
    it('getHandleTuples passes the correct poolId to hasInPool for every address', async () => {
      await fc.assert(
        fc.asyncProperty(arbPoolId, arbBlockSize, async (poolId, blockSize) => {
          const blocks = createRawBlocks(blockSize, TUPLE.SIZE);
          const cbl = createCblWithAddresses(creator, blockSize, blocks);

          const calledPools: string[] = [];

          // Build a mock store that returns the blocks by checksum
          const blockMap = new Map<string, RawDataBlock>();
          for (const b of blocks) {
            blockMap.set(b.idChecksum.toHex(), b);
          }
          const mockStore = {
            getData: async (key: { toHex(): string }) => {
              const block = blockMap.get(key.toHex());
              if (!block) throw new Error(`Block not found: ${key.toHex()}`);
              return block;
            },
          };

          const poolVerification = {
            poolId,
            hasInPool: async (pool: string, _hash: string) => {
              calledPools.push(pool);
              return true;
            },
          };

          await cbl.getHandleTuples(mockStore, poolVerification);

          // Every hasInPool call should have received the correct poolId
          expect(calledPools.length).toBe(cbl.addresses.length);
          for (const p of calledPools) {
            expect(p).toBe(poolId);
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
