/**
 * @fileoverview Unit tests for PooledStoreAdapter CBL whitening pool delegation.
 *
 * Verifies that storeCBLWithWhitening and retrieveCBL on the adapter
 * delegate to the pool-scoped variants on the inner store, ensuring
 * XOR components are stored/retrieved within the correct pool namespace.
 *
 * **Validates: Requirements 3.1, 3.2, 3.4, 3.5**
 */

import {
  BlockSize,
  PooledMemoryBlockStore,
  StoreError,
  StoreErrorType,
} from '@brightchain/brightchain-lib';
import { PooledStoreAdapter } from './pooledStoreAdapter';

describe('PooledStoreAdapter CBL Whitening Delegation', () => {
  const blockSize = BlockSize.Message; // 512 bytes
  const poolA = 'pool-alpha';
  const poolB = 'pool-beta';

  let innerStore: PooledMemoryBlockStore;
  let adapterA: PooledStoreAdapter;
  let adapterB: PooledStoreAdapter;

  beforeEach(async () => {
    innerStore = new PooledMemoryBlockStore(blockSize);

    // Seed both pools with random blocks so whitening has material to work with
    for (let i = 0; i < 5; i++) {
      const data = new Uint8Array(blockSize);
      crypto.getRandomValues(data);
      await innerStore.putInPool(poolA, data);
    }
    for (let i = 0; i < 5; i++) {
      const data = new Uint8Array(blockSize);
      crypto.getRandomValues(data);
      await innerStore.putInPool(poolB, data);
    }

    adapterA = new PooledStoreAdapter(innerStore, poolA);
    adapterB = new PooledStoreAdapter(innerStore, poolB);
  });

  it('storeCBLWithWhitening stores both XOR blocks in the adapter pool', async () => {
    const cblData = new Uint8Array([10, 20, 30, 40, 50]);
    const result = await adapterA.storeCBLWithWhitening(cblData);

    // Both block IDs should exist in poolA
    const block1InA = await innerStore.hasInPool(poolA, result.blockId1);
    const block2InA = await innerStore.hasInPool(poolA, result.blockId2);
    expect(block1InA).toBe(true);
    expect(block2InA).toBe(true);

    // Neither should exist in poolB
    const block1InB = await innerStore.hasInPool(poolB, result.blockId1);
    const block2InB = await innerStore.hasInPool(poolB, result.blockId2);
    expect(block1InB).toBe(false);
    expect(block2InB).toBe(false);
  });

  it('retrieveCBL reconstructs original data from pool-scoped blocks', async () => {
    const cblData = new Uint8Array([42, 84, 126, 168, 210]);
    const result = await adapterA.storeCBLWithWhitening(cblData);

    const retrieved = await adapterA.retrieveCBL(
      result.blockId1,
      result.blockId2,
    );

    expect(retrieved).toEqual(cblData);
  });

  it('retrieveCBL fails when block IDs belong to a different pool', async () => {
    const cblData = new Uint8Array([1, 2, 3]);
    const result = await adapterA.storeCBLWithWhitening(cblData);

    // adapterB should not find these blocks in poolB
    await expect(
      adapterB.retrieveCBL(result.blockId1, result.blockId2),
    ).rejects.toThrow();
  });

  it('storeCBLWithWhitening passes options through to inner store', async () => {
    const cblData = new Uint8Array([5, 10, 15]);
    const result = await adapterA.storeCBLWithWhitening(cblData, {
      isEncrypted: true,
    });

    expect(result.blockId1).toBeDefined();
    expect(result.blockId2).toBeDefined();
    expect(result.magnetUrl).toContain('enc=1');
  });

  it('pool isolation: two adapters store CBLs independently', async () => {
    const dataA = new Uint8Array([1, 2, 3]);
    const dataB = new Uint8Array([4, 5, 6]);

    const resultA = await adapterA.storeCBLWithWhitening(dataA);
    const resultB = await adapterB.storeCBLWithWhitening(dataB);

    // Each adapter retrieves its own CBL
    const retrievedA = await adapterA.retrieveCBL(
      resultA.blockId1,
      resultA.blockId2,
    );
    const retrievedB = await adapterB.retrieveCBL(
      resultB.blockId1,
      resultB.blockId2,
    );

    expect(retrievedA).toEqual(dataA);
    expect(retrievedB).toEqual(dataB);

    // Cross-pool retrieval should fail
    await expect(
      adapterA.retrieveCBL(resultB.blockId1, resultB.blockId2),
    ).rejects.toThrow();
  });

  describe('CBL whitening error cases (Requirement 3.5)', () => {
    it('retrieveCBL with non-existent block ID 1 throws StoreError with pool and block ID', async () => {
      const cblData = new Uint8Array([1, 2, 3]);
      const result = await adapterA.storeCBLWithWhitening(cblData);
      const fakeBlockId = 'a'.repeat(128); // SHA3-512 hex length

      try {
        await adapterA.retrieveCBL(fakeBlockId, result.blockId2);
        fail('Expected StoreError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StoreError);
        const storeErr = error as InstanceType<typeof StoreError>;
        expect(storeErr.type).toBe(StoreErrorType.KeyNotFound);
        expect(storeErr.message).toContain(poolA);
        expect(storeErr.message).toContain(fakeBlockId);
      }
    });

    it('retrieveCBL with non-existent block ID 2 throws StoreError with pool and block ID', async () => {
      const cblData = new Uint8Array([4, 5, 6]);
      const result = await adapterA.storeCBLWithWhitening(cblData);
      const fakeBlockId = 'b'.repeat(128);

      try {
        await adapterA.retrieveCBL(result.blockId1, fakeBlockId);
        fail('Expected StoreError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StoreError);
        const storeErr = error as InstanceType<typeof StoreError>;
        expect(storeErr.type).toBe(StoreErrorType.KeyNotFound);
        expect(storeErr.message).toContain(poolA);
        expect(storeErr.message).toContain(fakeBlockId);
      }
    });

    it('retrieveCBL with both non-existent block IDs throws StoreError mentioning pool', async () => {
      const fakeId1 = 'c'.repeat(128);
      const fakeId2 = 'd'.repeat(128);

      try {
        await adapterA.retrieveCBL(fakeId1, fakeId2);
        fail('Expected StoreError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StoreError);
        const storeErr = error as InstanceType<typeof StoreError>;
        expect(storeErr.type).toBe(StoreErrorType.KeyNotFound);
        expect(storeErr.message).toContain(poolA);
        // At minimum the first missing block ID should be in the message
        expect(storeErr.message).toContain(fakeId1);
      }
    });

    it('cross-pool retrieval error contains the correct pool ID', async () => {
      const cblData = new Uint8Array([7, 8, 9]);
      const result = await adapterA.storeCBLWithWhitening(cblData);

      try {
        // Blocks exist in poolA but adapterB looks in poolB
        await adapterB.retrieveCBL(result.blockId1, result.blockId2);
        fail('Expected StoreError to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(StoreError);
        const storeErr = error as InstanceType<typeof StoreError>;
        expect(storeErr.type).toBe(StoreErrorType.KeyNotFound);
        // Error should reference poolB (the adapter's pool), not poolA
        expect(storeErr.message).toContain(poolB);
      }
    });
  });
});
