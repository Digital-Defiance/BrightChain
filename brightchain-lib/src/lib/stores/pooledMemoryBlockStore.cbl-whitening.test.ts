import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from '@jest/globals';
import { BlockSize } from '../enumerations/blockSize';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { initializeBrightChain } from '../init';
import { CBLWhiteningOptions } from '../interfaces/storage/cblWhitening';
import { ServiceProvider } from '../services/service.provider';
import { ServiceLocator } from '../services/serviceLocator';
import { PooledMemoryBlockStore } from './pooledMemoryBlockStore';

describe('PooledMemoryBlockStore - Pool-Scoped CBL Whitening', () => {
  let store: PooledMemoryBlockStore;
  const poolId = 'test-pool';
  const otherPoolId = 'other-pool';

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  afterAll(() => {
    ServiceProvider.resetInstance();
  });

  beforeEach(() => {
    store = new PooledMemoryBlockStore(BlockSize.Small);
  });

  describe('storeCBLWithWhiteningInPool', () => {
    it('should store CBL data and return a valid result with both block IDs', async () => {
      const cblData = new Uint8Array([10, 20, 30, 40, 50]);
      const result = await store.storeCBLWithWhiteningInPool(poolId, cblData);

      expect(result.blockId1).toBeDefined();
      expect(result.blockId2).toBeDefined();
      expect(result.blockId1).not.toBe(result.blockId2);
      expect(result.blockSize).toBe(BlockSize.Small);
      expect(result.magnetUrl).toContain('magnet:?');
      expect(result.magnetUrl).toContain(result.blockId1);
      expect(result.magnetUrl).toContain(result.blockId2);
    });

    it('should store both XOR component blocks within the specified pool', async () => {
      const cblData = new Uint8Array([1, 2, 3, 4, 5]);
      const result = await store.storeCBLWithWhiteningInPool(poolId, cblData);

      // Both blocks should exist in the pool
      const hasBlock1 = await store.hasInPool(poolId, result.blockId1);
      const hasBlock2 = await store.hasInPool(poolId, result.blockId2);
      expect(hasBlock1).toBe(true);
      expect(hasBlock2).toBe(true);

      // Blocks should NOT exist in a different pool
      const hasBlock1Other = await store.hasInPool(
        otherPoolId,
        result.blockId1,
      );
      const hasBlock2Other = await store.hasInPool(
        otherPoolId,
        result.blockId2,
      );
      expect(hasBlock1Other).toBe(false);
      expect(hasBlock2Other).toBe(false);
    });

    it('should throw on empty CBL data', async () => {
      const emptyCblData = new Uint8Array(0);
      await expect(
        store.storeCBLWithWhiteningInPool(poolId, emptyCblData),
      ).rejects.toThrow(StoreError);
    });

    it('should throw on CBL data too large for block size', async () => {
      // BlockSize.Small is 256 bytes; create data larger than that minus length prefix
      const largeCblData = new Uint8Array(BlockSize.Small + 1);
      largeCblData.fill(0xab);
      await expect(
        store.storeCBLWithWhiteningInPool(poolId, largeCblData),
      ).rejects.toThrow(StoreError);
    });

    it('should preserve encryption flag in result', async () => {
      const cblData = new Uint8Array([5, 10, 15]);
      const options: CBLWhiteningOptions = { isEncrypted: true };
      const result = await store.storeCBLWithWhiteningInPool(
        poolId,
        cblData,
        options,
      );

      expect(result.isEncrypted).toBe(true);
      expect(result.magnetUrl).toContain('enc=1');
    });

    it('should throw on invalid pool ID', async () => {
      const cblData = new Uint8Array([1, 2, 3]);
      await expect(
        store.storeCBLWithWhiteningInPool('', cblData),
      ).rejects.toThrow();
    });
  });

  describe('retrieveCBLFromPool', () => {
    it('should reconstruct original CBL data from stored XOR components', async () => {
      const cblData = new Uint8Array([42, 84, 126, 168, 210]);
      const result = await store.storeCBLWithWhiteningInPool(poolId, cblData);

      const retrieved = await store.retrieveCBLFromPool(
        poolId,
        result.blockId1,
        result.blockId2,
      );

      expect(retrieved).toEqual(cblData);
    });

    it('should throw with descriptive error when block 1 is missing from pool', async () => {
      const fakeBlockId = 'a'.repeat(128); // SHA3-512 hex length
      const cblData = new Uint8Array([1, 2, 3]);
      const result = await store.storeCBLWithWhiteningInPool(poolId, cblData);

      try {
        await store.retrieveCBLFromPool(poolId, fakeBlockId, result.blockId2);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(StoreError);
        const storeErr = error as StoreError;
        expect(storeErr.type).toBe(StoreErrorType.KeyNotFound);
        // Error should mention the pool ID and the missing block ID (Req 3.5)
        expect(storeErr.message).toContain(poolId);
        expect(storeErr.message).toContain(fakeBlockId);
      }
    });

    it('should throw with descriptive error when block 2 is missing from pool', async () => {
      const fakeBlockId = 'b'.repeat(128);
      const cblData = new Uint8Array([1, 2, 3]);
      const result = await store.storeCBLWithWhiteningInPool(poolId, cblData);

      try {
        await store.retrieveCBLFromPool(poolId, result.blockId1, fakeBlockId);
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(StoreError);
        const storeErr = error as StoreError;
        expect(storeErr.type).toBe(StoreErrorType.KeyNotFound);
        expect(storeErr.message).toContain(poolId);
        expect(storeErr.message).toContain(fakeBlockId);
      }
    });

    it('should fail when retrieving from wrong pool', async () => {
      const cblData = new Uint8Array([7, 14, 21]);
      const result = await store.storeCBLWithWhiteningInPool(poolId, cblData);

      // Blocks are in poolId, not otherPoolId
      await expect(
        store.retrieveCBLFromPool(
          otherPoolId,
          result.blockId1,
          result.blockId2,
        ),
      ).rejects.toThrow(StoreError);
    });

    it('should throw on invalid pool ID', async () => {
      await expect(
        store.retrieveCBLFromPool('', 'abc', 'def'),
      ).rejects.toThrow();
    });
  });

  describe('round-trip with various data sizes', () => {
    it('should round-trip a single byte', async () => {
      const cblData = new Uint8Array([0xff]);
      const result = await store.storeCBLWithWhiteningInPool(poolId, cblData);
      const retrieved = await store.retrieveCBLFromPool(
        poolId,
        result.blockId1,
        result.blockId2,
      );
      expect(retrieved).toEqual(cblData);
    });

    it('should round-trip data near block size limit', async () => {
      // BlockSize.Small is 256; length prefix is 4 bytes, so max payload is 252
      const cblData = new Uint8Array(252);
      cblData.fill(0xcd);
      const result = await store.storeCBLWithWhiteningInPool(poolId, cblData);
      const retrieved = await store.retrieveCBLFromPool(
        poolId,
        result.blockId1,
        result.blockId2,
      );
      expect(retrieved).toEqual(cblData);
    });

    it('should round-trip with Checksum objects as block IDs', async () => {
      const cblData = new Uint8Array([99, 100, 101]);
      const result = await store.storeCBLWithWhiteningInPool(poolId, cblData);

      // Parse the magnet URL to get block IDs, then use them as strings
      const parsed = store.parseCBLMagnetUrl(result.magnetUrl);
      const retrieved = await store.retrieveCBLFromPool(
        poolId,
        parsed.blockId1,
        parsed.blockId2,
      );
      expect(retrieved).toEqual(cblData);
    });
  });
});
