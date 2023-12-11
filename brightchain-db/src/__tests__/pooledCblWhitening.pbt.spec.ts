/**
 * Pool-Scoped CBL Whitening – Property-Based Tests.
 *
 * Feature: architectural-gaps, Property 6: Pool-scoped CBL whitening round-trip
 *
 * Uses fast-check to validate that CBL whitening operations through
 * PooledStoreAdapter correctly round-trip data and store XOR components
 * within the specified pool namespace.
 *
 * **Validates: Requirements 3.1, 3.2, 3.4**
 */

import {
  BlockSize,
  PooledMemoryBlockStore,
} from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { PooledStoreAdapter } from '../lib/pooledStoreAdapter';

/**
 * Arbitrary for valid pool IDs: alphanumeric, underscore, hyphen, 1-64 chars.
 * Matches the PoolId validation regex: /^[a-zA-Z0-9_-]{1,64}$/
 */
const poolIdArb: fc.Arbitrary<string> = fc
  .array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-'.split(
        '',
      ),
    ),
    { minLength: 1, maxLength: 64 },
  )
  .map((chars) => chars.join(''));

/**
 * The length prefix used by padToBlockSize is 4 bytes.
 * Max CBL payload = blockSize - 4.
 */
const LENGTH_PREFIX_SIZE = 4;

/**
 * Arbitrary for CBL data: non-empty Uint8Array that fits within
 * (blockSize - LENGTH_PREFIX_SIZE) so padding doesn't exceed one block.
 */
function cblDataArb(blockSize: number): fc.Arbitrary<Uint8Array> {
  const maxPayload = blockSize - LENGTH_PREFIX_SIZE;
  return fc.uint8Array({ minLength: 1, maxLength: maxPayload });
}

describe('Pool-Scoped CBL Whitening Property-Based Tests', () => {
  // Use BlockSize.Message (512 bytes) — small enough for fast tests
  const blockSize = BlockSize.Message;

  /**
   * Property 6: Pool-scoped CBL whitening round-trip
   *
   * Feature: architectural-gaps, Property 6: Pool-scoped CBL whitening round-trip
   *
   * For any valid pool ID and any CBL data (non-empty Uint8Array of valid
   * block size), storing via PooledStoreAdapter.storeCBLWithWhitening() and
   * then retrieving via PooledStoreAdapter.retrieveCBL() using the returned
   * block IDs should produce data identical to the original CBL data.
   * Additionally, both block IDs in the result should exist within the
   * specified pool (verifiable via hasInPool).
   *
   * **Validates: Requirements 3.1, 3.2, 3.4**
   */
  it('Property 6: round-trip data equality and pool containment', async () => {
    await fc.assert(
      fc.asyncProperty(
        poolIdArb,
        cblDataArb(blockSize),
        async (poolId, cblData) => {
          const innerStore = new PooledMemoryBlockStore(blockSize);
          const adapter = new PooledStoreAdapter(innerStore, poolId);

          // Store CBL through the adapter
          const result = await adapter.storeCBLWithWhitening(cblData);

          // (1) Round-trip: retrieved data must equal original
          const retrieved = await adapter.retrieveCBL(
            result.blockId1,
            result.blockId2,
          );
          expect(retrieved).toEqual(cblData);

          // (2) Pool containment: both block IDs must exist in the specified pool
          const block1InPool = await innerStore.hasInPool(
            poolId,
            result.blockId1,
          );
          const block2InPool = await innerStore.hasInPool(
            poolId,
            result.blockId2,
          );
          expect(block1InPool).toBe(true);
          expect(block2InPool).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});
