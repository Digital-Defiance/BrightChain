/**
 * @fileoverview Property-based tests for BlockHandleTuple pool validation.
 *
 * **Feature: pool-scoped-whitening**
 *
 * Tests Property 5: BlockHandleTuple pool validation rejects mismatched handles
 * Tests Property 6: BlockHandleTuple without poolId skips pool validation
 */

import fc from 'fast-check';
import { TUPLE } from '../constants';
import { BlockSize } from '../enumerations/blockSize';
import { HandleTupleErrorType } from '../enumerations/handleTupleErrorType';
import { HandleTupleError } from '../errors/handleTupleError';
import { ServiceProvider } from '../services/service.provider';
import { BlockHandle, createBlockHandle } from './handle';
import { BlockHandleTuple } from './handleTuple';
import { RawDataBlock } from './rawData';

// Longer timeout for property tests
jest.setTimeout(30000);

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Valid pool ID strings matching /^[a-zA-Z0-9_-]{1,64}$/ */
const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

/** Two distinct valid pool IDs */
const arbDistinctPoolIdPair = fc
  .tuple(arbPoolId, arbPoolId)
  .filter(([a, b]) => a !== b);

/** A small block size suitable for fast property tests */
const arbBlockSize: fc.Arbitrary<BlockSize> = fc.constantFrom(
  BlockSize.Message, // 512 bytes
  BlockSize.Tiny, // 1024 bytes
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a proper BlockHandle for testing with an optional poolId.
 * Uses the real createBlockHandle factory, then sets poolId.
 */
function createMockHandle(
  blockSize: BlockSize,
  poolId: string | undefined,
): BlockHandle<RawDataBlock> {
  const checksumService = ServiceProvider.getInstance().checksumService;
  const data = new Uint8Array(blockSize);
  crypto.getRandomValues(data);
  const checksum = checksumService.calculateChecksum(data);

  const handle = createBlockHandle<RawDataBlock>(
    RawDataBlock,
    blockSize,
    data,
    checksum,
  );
  handle.poolId = poolId;
  return handle;
}

// ---------------------------------------------------------------------------
// Property 5: BlockHandleTuple pool validation rejects mismatched handles
// ---------------------------------------------------------------------------

describe('BlockHandleTuple Pool Validation Property Tests', () => {
  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('Property 5: BlockHandleTuple pool validation rejects mismatched handles', () => {
    /**
     * **Feature: pool-scoped-whitening, Property 5: BlockHandleTuple pool validation rejects mismatched handles**
     *
     * For any set of block handles where at least one handle belongs to a pool
     * different from the specified PoolId P, constructing a
     * `BlockHandleTuple(handles, P)` SHALL throw a HandleTupleError with type
     * PoolMismatch.
     *
     * **Validates: Requirements 4.2, 4.3**
     */
    it('rejects construction when any handle belongs to a different pool than the specified poolId', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbDistinctPoolIdPair,
          arbBlockSize,
          // Which handle index (0..TUPLE.SIZE-1) gets the mismatched pool
          fc.integer({ min: 0, max: TUPLE.SIZE - 1 }),
          async ([targetPool, mismatchedPool], blockSize, mismatchIndex) => {
            // Create TUPLE.SIZE handles, all belonging to targetPool
            // except one at mismatchIndex which belongs to mismatchedPool
            const handles: BlockHandle<RawDataBlock>[] = [];
            for (let i = 0; i < TUPLE.SIZE; i++) {
              const pool = i === mismatchIndex ? mismatchedPool : targetPool;
              handles.push(createMockHandle(blockSize, pool));
            }

            // Constructing with targetPool should throw PoolMismatch
            try {
              new BlockHandleTuple(handles, targetPool);
              // If we get here, the property is violated
              return false;
            } catch (err) {
              expect(err).toBeInstanceOf(HandleTupleError);
              const tupleErr = err as HandleTupleError;
              expect(tupleErr.type).toBe(HandleTupleErrorType.PoolMismatch);
              expect(tupleErr.poolMismatchInfo).toBeDefined();
              expect(tupleErr.poolMismatchInfo?.expectedPool).toBe(targetPool);
              expect(tupleErr.poolMismatchInfo?.actualPool).toBe(
                mismatchedPool,
              );
              return true;
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Variant: multiple handles from different pools all trigger rejection.
     *
     * **Validates: Requirements 4.2, 4.3**
     */
    it('rejects construction when multiple handles belong to different pools', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbDistinctPoolIdPair,
          arbBlockSize,
          async ([targetPool, otherPool], blockSize) => {
            // All handles belong to otherPool, none to targetPool
            const handles: BlockHandle<RawDataBlock>[] = [];
            for (let i = 0; i < TUPLE.SIZE; i++) {
              handles.push(createMockHandle(blockSize, otherPool));
            }

            expect(() => new BlockHandleTuple(handles, targetPool)).toThrow(
              HandleTupleError,
            );

            try {
              new BlockHandleTuple(handles, targetPool);
            } catch (err) {
              const tupleErr = err as HandleTupleError;
              expect(tupleErr.type).toBe(HandleTupleErrorType.PoolMismatch);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // -------------------------------------------------------------------------
  // Property 6: BlockHandleTuple without poolId skips pool validation
  // -------------------------------------------------------------------------

  describe('Property 6: BlockHandleTuple without poolId skips pool validation', () => {
    /**
     * **Feature: pool-scoped-whitening, Property 6: BlockHandleTuple without poolId skips pool validation**
     *
     * For any set of block handles from mixed pools (with matching block sizes),
     * constructing a `BlockHandleTuple(handles)` without a poolId parameter
     * SHALL succeed without error.
     *
     * **Validates: Requirements 4.4, 8.3**
     */
    it('succeeds when handles belong to different pools and no poolId is specified', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbDistinctPoolIdPair,
          arbBlockSize,
          async ([poolA, poolB], blockSize) => {
            // Create TUPLE.SIZE handles with mixed pool assignments
            const handles: BlockHandle<RawDataBlock>[] = [];
            for (let i = 0; i < TUPLE.SIZE; i++) {
              // Alternate between poolA and poolB to ensure mixed pools
              const pool = i % 2 === 0 ? poolA : poolB;
              handles.push(createMockHandle(blockSize, pool));
            }

            // Constructing WITHOUT a poolId should succeed
            const tuple = new BlockHandleTuple(handles);

            expect(tuple).toBeInstanceOf(BlockHandleTuple);
            expect(tuple.handles).toHaveLength(TUPLE.SIZE);
            expect(tuple.poolId).toBeUndefined();
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Variant: handles with undefined poolIds also succeed without poolId parameter.
     *
     * **Validates: Requirements 4.4, 8.3**
     */
    it('succeeds when some handles have undefined poolId and no poolId is specified', async () => {
      await fc.assert(
        fc.asyncProperty(arbPoolId, arbBlockSize, async (pool, blockSize) => {
          // Mix of handles: some with a poolId, some without
          const handles: BlockHandle<RawDataBlock>[] = [];
          for (let i = 0; i < TUPLE.SIZE; i++) {
            const assignedPool = i === 0 ? pool : undefined;
            handles.push(createMockHandle(blockSize, assignedPool));
          }

          // Constructing WITHOUT a poolId should succeed
          const tuple = new BlockHandleTuple(handles);

          expect(tuple).toBeInstanceOf(BlockHandleTuple);
          expect(tuple.handles).toHaveLength(TUPLE.SIZE);
          expect(tuple.poolId).toBeUndefined();
        }),
        { numRuns: 100 },
      );
    });
  });
});
