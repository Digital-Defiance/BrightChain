/**
 * @fileoverview Property-based tests for pool-scoped tuple creation enforcement.
 *
 * Feature: pool-scoped-whitening, Property 4: Tuple creation pool enforcement
 *
 * Validates: Requirements 3.1, 3.2, 3.4, 3.5
 */

import fc from 'fast-check';
import { RandomBlock } from '../blocks/random';
import { WhitenedBlock } from '../blocks/whitened';
import { BlockDataType } from '../enumerations/blockDataType';
import { BlockSize } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { TupleErrorType } from '../enumerations/tupleErrorType';
import { TupleError } from '../errors/tupleError';
import { initializeBrightChain, resetInitialization } from '../init';
import { ServiceProvider } from './service.provider';
import { TupleService } from './tuple.service';

jest.setTimeout(60000);

const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);
const arbDistinctPoolPair = fc
  .tuple(arbPoolId, arbPoolId)
  .filter(([a, b]) => a !== b);

interface PoolAwareMetadata {
  size: BlockSize;
  type: BlockType;
  dataType: BlockDataType;
  lengthWithoutPadding: number;
  dateCreated: Date;
  poolId: string;
}

function attachPoolToBlock<T extends RandomBlock | WhitenedBlock>(
  block: T,
  poolId: string,
): T {
  const m = block.metadata;
  const metaWithPool: PoolAwareMetadata = {
    size: m.size,
    type: m.type,
    dataType: m.dataType,
    lengthWithoutPadding: m.lengthWithoutPadding,
    dateCreated: m.dateCreated,
    poolId,
  };
  Object.defineProperty(block, 'metadata', {
    value: metaWithPool,
    writable: false,
    enumerable: true,
    configurable: true,
  });
  return block;
}

function randomBlockWithPool(bs: BlockSize, poolId: string): RandomBlock {
  return attachPoolToBlock(RandomBlock.new(bs), poolId);
}

function whitenedBlockWithPool(bs: BlockSize, poolId: string): WhitenedBlock {
  const data = new Uint8Array(bs);
  crypto.getRandomValues(data);
  return attachPoolToBlock(new WhitenedBlock(bs, data), poolId);
}

/**
 * Access the private wrapWithPoolValidation method on TupleService.
 * This is the core mechanism that enforces pool boundaries on block source
 * callbacks. When poolOptions.poolId is provided to
 * dataStreamToPlaintextTuplesAndCBL, it wraps both whitenedBlockSource and
 * randomBlockSource with this method.
 */
function getWrappedSource<T extends RandomBlock | WhitenedBlock>(
  svc: TupleService,
  source: () => T | undefined,
  poolId: string,
  blockType: string,
): () => T | undefined {
  type WrapFn = (
    s: () => T | undefined,
    p: string,
    b: string,
  ) => () => T | undefined;
  const wrap = (svc as unknown as Record<string, WrapFn>)[
    'wrapWithPoolValidation'
  ];
  return wrap.call(svc, source, poolId, blockType);
}

describe('TupleService Pool-Scoped Tuple Creation Property Tests', () => {
  let tupleService: TupleService;

  beforeAll(() => {
    initializeBrightChain();
    tupleService = ServiceProvider.getInstance().tupleService;
  });

  afterAll(() => {
    resetInitialization();
  });

  describe('Property 4: Tuple creation pool enforcement', () => {
    /**
     * **Feature: pool-scoped-whitening, Property 4: Tuple creation pool enforcement**
     *
     * When a randomBlockSource callback returns a block whose metadata
     * indicates a pool other than the specified poolOptions.poolId,
     * the wrapped callback SHALL throw TupleError(PoolBoundaryViolation).
     *
     * **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
     */
    it('wrapped randomBlockSource rejects blocks from wrong pool', async () => {
      const bs = BlockSize.Small;
      await fc.assert(
        fc.asyncProperty(arbDistinctPoolPair, async ([target, wrong]) => {
          const source = (): RandomBlock | undefined =>
            randomBlockWithPool(bs, wrong);
          const wrapped = getWrappedSource(
            tupleService,
            source,
            target,
            'RandomBlock',
          );
          let caught: TupleError | undefined;
          try {
            wrapped();
          } catch (e) {
            if (e instanceof TupleError) caught = e;
          }
          expect(caught).toBeDefined();
          expect(caught!.type).toBe(TupleErrorType.PoolBoundaryViolation);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 4: Tuple creation pool enforcement**
     *
     * When a whitenedBlockSource callback returns a block whose metadata
     * indicates a pool other than the specified poolOptions.poolId,
     * the wrapped callback SHALL throw TupleError(PoolBoundaryViolation).
     *
     * **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
     */
    it('wrapped whitenedBlockSource rejects blocks from wrong pool', async () => {
      const bs = BlockSize.Small;
      await fc.assert(
        fc.asyncProperty(arbDistinctPoolPair, async ([target, wrong]) => {
          const source = (): WhitenedBlock | undefined =>
            whitenedBlockWithPool(bs, wrong);
          const wrapped = getWrappedSource(
            tupleService,
            source,
            target,
            'WhitenedBlock',
          );
          let caught: TupleError | undefined;
          try {
            wrapped();
          } catch (e) {
            if (e instanceof TupleError) caught = e;
          }
          expect(caught).toBeDefined();
          expect(caught!.type).toBe(TupleErrorType.PoolBoundaryViolation);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 4: Tuple creation pool enforcement**
     *
     * When blocks have matching poolId metadata (same pool as target),
     * the wrapped callback SHALL return the block without error.
     *
     * **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
     */
    it('wrapped callback allows blocks from the correct pool', async () => {
      const bs = BlockSize.Small;
      await fc.assert(
        fc.asyncProperty(arbPoolId, async (pool) => {
          const rSrc = (): RandomBlock | undefined =>
            randomBlockWithPool(bs, pool);
          const rW = getWrappedSource(tupleService, rSrc, pool, 'RandomBlock');
          expect(rW()).toBeInstanceOf(RandomBlock);

          const wSrc = (): WhitenedBlock | undefined =>
            whitenedBlockWithPool(bs, pool);
          const wW = getWrappedSource(
            tupleService,
            wSrc,
            pool,
            'WhitenedBlock',
          );
          expect(wW()).toBeInstanceOf(WhitenedBlock);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 4: Tuple creation pool enforcement**
     *
     * When blocks have no poolId metadata (legacy/unpooled), the wrapped
     * callback SHALL return the block without error (backward compatible).
     *
     * **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
     */
    it('wrapped callback allows blocks without poolId metadata', async () => {
      const bs = BlockSize.Small;
      await fc.assert(
        fc.asyncProperty(arbPoolId, async (pool) => {
          const src = (): RandomBlock | undefined => RandomBlock.new(bs);
          const wrapped = getWrappedSource(
            tupleService,
            src,
            pool,
            'RandomBlock',
          );
          expect(wrapped()).toBeInstanceOf(RandomBlock);
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: pool-scoped-whitening, Property 4: Tuple creation pool enforcement**
     *
     * When the source callback returns undefined, the wrapped callback
     * SHALL return undefined without error.
     *
     * **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
     */
    it('wrapped callback passes through undefined without error', async () => {
      await fc.assert(
        fc.asyncProperty(arbPoolId, async (pool) => {
          const src = (): WhitenedBlock | undefined => undefined;
          const wrapped = getWrappedSource(
            tupleService,
            src,
            pool,
            'WhitenedBlock',
          );
          expect(wrapped()).toBeUndefined();
        }),
        { numRuns: 100 },
      );
    });
  });
});
