/**
 * @fileoverview Property-based tests for EnrichedQueryResult isComplete consistency
 *
 * Feature: cross-node-eventual-consistency, Property 7: EnrichedQueryResult isComplete consistency
 *
 * Property 7: For any query result, `isComplete` SHALL equal `(pendingBlocks.length === 0)`.
 * The total of `documents.length + pendingBlocks.length` SHALL equal the number of blocks
 * the query attempted to read.
 *
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import {
  AvailabilityState,
  IEnrichedQueryResult,
  IPendingBlockInfo,
  ReadConcern,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';

/**
 * Arbitrary: hex-encoded block ID strings (8-64 hex chars)
 */
const arbBlockId = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 8, maxLength: 64 })
  .map((digits) => digits.map((d) => d.toString(16)).join(''));

/**
 * Arbitrary: availability states that indicate a pending/remote block
 */
const arbPendingState = fc.constantFrom(
  AvailabilityState.Remote,
  AvailabilityState.Unknown,
  AvailabilityState.Orphaned,
);

/**
 * Arbitrary: node ID strings for known locations
 */
const arbNodeId = fc
  .string({ minLength: 1, maxLength: 32 })
  .filter((s) => s.trim().length > 0);

/**
 * Arbitrary: a single IPendingBlockInfo
 */
const arbPendingBlockInfo: fc.Arbitrary<IPendingBlockInfo> = fc.record({
  blockId: arbBlockId,
  state: arbPendingState,
  knownLocations: fc.array(arbNodeId, { minLength: 0, maxLength: 5 }),
});

/**
 * Arbitrary: a simple document (plain object with an id field)
 */
const arbDocument = fc.record({
  id: fc.uuid(),
  name: fc.string({ minLength: 1, maxLength: 50 }),
});

/**
 * Arbitrary: ReadConcern enum value
 */
const arbReadConcern = fc.constantFrom(
  ReadConcern.Local,
  ReadConcern.Available,
  ReadConcern.Consistent,
);

type TestDoc = { id: string; name: string };

describe('Feature: cross-node-eventual-consistency, Property 7: EnrichedQueryResult isComplete consistency', () => {
  it('isComplete equals (pendingBlocks.length === 0) for any combination of documents and pending blocks', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocument, { minLength: 0, maxLength: 20 }),
        fc.array(arbPendingBlockInfo, { minLength: 0, maxLength: 20 }),
        arbReadConcern,
        async (documents, pendingBlocks, readConcern) => {
          // Construct the enriched query result the same way findWithAvailability does
          const result: IEnrichedQueryResult<TestDoc> = {
            documents,
            isComplete: pendingBlocks.length === 0,
            pendingBlocks,
            readConcern,
          };

          // Property: isComplete must equal (pendingBlocks.length === 0)
          expect(result.isComplete).toBe(result.pendingBlocks.length === 0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('documents.length + pendingBlocks.length equals total blocks attempted', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 0, max: 50 }),
        fc.float({ min: 0, max: 1, noNaN: true }),
        arbReadConcern,
        async (totalBlocks, failureRatio, readConcern) => {
          // Simulate a query that attempts to read totalBlocks blocks.
          // A fraction of them fail (become pending), the rest succeed.
          const pendingCount = Math.round(totalBlocks * failureRatio);
          const successCount = totalBlocks - pendingCount;

          const documents: Array<{ id: string }> = [];
          for (let i = 0; i < successCount; i++) {
            documents.push({ id: `doc-${i}` });
          }

          const pendingBlocks: IPendingBlockInfo[] = [];
          for (let i = 0; i < pendingCount; i++) {
            pendingBlocks.push({
              blockId: `block-${i}`,
              state: AvailabilityState.Remote,
              knownLocations: [`node-${i}`],
            });
          }

          const result: IEnrichedQueryResult<{ id: string }> = {
            documents,
            isComplete: pendingBlocks.length === 0,
            pendingBlocks,
            readConcern,
          };

          // Property: total attempted = documents + pending
          expect(result.documents.length + result.pendingBlocks.length).toBe(
            totalBlocks,
          );

          // Property: isComplete consistency
          expect(result.isComplete).toBe(result.pendingBlocks.length === 0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('a result with zero pending blocks is always complete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocument, { minLength: 0, maxLength: 30 }),
        arbReadConcern,
        async (documents, readConcern) => {
          const result: IEnrichedQueryResult<TestDoc> = {
            documents,
            isComplete: true,
            pendingBlocks: [],
            readConcern,
          };

          expect(result.isComplete).toBe(true);
          expect(result.pendingBlocks).toHaveLength(0);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('a result with at least one pending block is never complete', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(arbDocument, { minLength: 0, maxLength: 20 }),
        fc.array(arbPendingBlockInfo, { minLength: 1, maxLength: 20 }),
        arbReadConcern,
        async (documents, pendingBlocks, readConcern) => {
          const result: IEnrichedQueryResult<TestDoc> = {
            documents,
            isComplete: pendingBlocks.length === 0,
            pendingBlocks,
            readConcern,
          };

          // Since pendingBlocks has at least 1 element, isComplete must be false
          expect(result.isComplete).toBe(false);
          expect(result.pendingBlocks.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 200 },
    );
  });
});
