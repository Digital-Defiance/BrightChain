/**
 * @fileoverview Unit tests for PooledMemoryBlockStore error conditions
 *
 * Tests error handling for:
 * - getFromPool on missing block (StoreError with KeyNotFound)
 * - getPoolStats on missing pool (descriptive error)
 * - deletePool on non-existent pool (completes without error)
 * - deletePool on default pool (removes all default pool blocks)
 *
 * **Validates: Requirements 2.5, 4.4, 5.3, 5.4**
 */

import { BlockSize } from '../enumerations/blockSize';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { DEFAULT_POOL } from '../interfaces/storage/pooledBlockStore';
import { PooledMemoryBlockStore } from './pooledMemoryBlockStore';

describe('PooledMemoryBlockStore error conditions', () => {
  let store: PooledMemoryBlockStore;

  beforeEach(() => {
    store = new PooledMemoryBlockStore(BlockSize.Small);
  });

  /**
   * Requirement 2.5: IF getFromPool is called with a hash that does not exist
   * in the specified pool, THEN it SHALL throw a descriptive error.
   */
  describe('getFromPool on missing block', () => {
    it('throws StoreError with KeyNotFound for a non-existent hash', async () => {
      const fakeHash = 'deadbeef'.repeat(16);

      await expect(store.getFromPool('test-pool', fakeHash)).rejects.toThrow(
        StoreError,
      );

      try {
        await store.getFromPool('test-pool', fakeHash);
      } catch (err) {
        expect(err).toBeInstanceOf(StoreError);
        expect((err as StoreError).type).toBe(StoreErrorType.KeyNotFound);
      }
    });

    it('throws when the pool exists but the specific hash does not', async () => {
      const data = new Uint8Array([1, 2, 3, 4]);
      await store.putInPool('my-pool', data);

      const missingHash = 'abcdef01'.repeat(16);
      await expect(store.getFromPool('my-pool', missingHash)).rejects.toThrow(
        StoreError,
      );
    });
  });

  /**
   * Requirement 4.4: IF getPoolStats is called for a pool that does not exist,
   * THEN it SHALL throw a descriptive error.
   */
  describe('getPoolStats on missing pool', () => {
    it('throws an error for a pool that has never had blocks stored', async () => {
      await expect(store.getPoolStats('nonexistent-pool')).rejects.toThrow(
        /Pool "nonexistent-pool" not found/,
      );
    });

    it('throws an error even with a valid pool ID format', async () => {
      await expect(store.getPoolStats('valid-but-empty')).rejects.toThrow(
        /not found/,
      );
    });
  });

  /**
   * Requirement 5.4: IF deletePool is called for a pool that does not exist,
   * THEN it SHALL complete without error.
   */
  describe('deletePool on non-existent pool', () => {
    it('completes without error for a pool that never existed', async () => {
      await expect(store.deletePool('never-existed')).resolves.toBeUndefined();
    });
  });

  /**
   * Requirement 5.3: WHEN deletePool is called for the Default_Pool,
   * it SHALL remove all blocks in the Default_Pool.
   */
  describe('deletePool on default pool', () => {
    it('removes all blocks stored via legacy put', async () => {
      const block1 = new Uint8Array([10, 20, 30]);
      const block2 = new Uint8Array([40, 50, 60]);

      const hash1 = await store.putInPool(DEFAULT_POOL, block1);
      const hash2 = await store.putInPool(DEFAULT_POOL, block2);

      // Verify blocks exist before deletion
      expect(await store.hasInPool(DEFAULT_POOL, hash1)).toBe(true);
      expect(await store.hasInPool(DEFAULT_POOL, hash2)).toBe(true);

      await store.deletePool(DEFAULT_POOL);

      // Verify blocks are gone after deletion
      expect(await store.hasInPool(DEFAULT_POOL, hash1)).toBe(false);
      expect(await store.hasInPool(DEFAULT_POOL, hash2)).toBe(false);
    });

    it('does not affect blocks in other pools', async () => {
      const defaultData = new Uint8Array([1, 2, 3]);
      const otherData = new Uint8Array([4, 5, 6]);

      await store.putInPool(DEFAULT_POOL, defaultData);
      const otherHash = await store.putInPool('other-pool', otherData);

      await store.deletePool(DEFAULT_POOL);

      // Other pool's blocks should still be accessible
      expect(await store.hasInPool('other-pool', otherHash)).toBe(true);
      const retrieved = await store.getFromPool('other-pool', otherHash);
      expect(retrieved).toEqual(otherData);
    });

    it('removes default pool from listPools after deletion', async () => {
      const data = new Uint8Array([7, 8, 9]);
      await store.putInPool(DEFAULT_POOL, data);

      const poolsBefore = await store.listPools();
      expect(poolsBefore).toContain(DEFAULT_POOL);

      await store.deletePool(DEFAULT_POOL);

      const poolsAfter = await store.listPools();
      expect(poolsAfter).not.toContain(DEFAULT_POOL);
    });
  });
});
