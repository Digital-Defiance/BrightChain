/**
 * @fileoverview Property-based tests for MemoryBlockStore session isolation
 *
 * **Feature: visual-brightchain-demo, Property 6: Memory Store Session Isolation**
 * **Validates: Requirements 5.1, 5.2**
 *
 * Verifies that separate MemoryBlockStore instances are fully isolated:
 * blocks stored in one instance are invisible to another, and clearing
 * one instance does not affect the other.
 */

import {
  BlockSize,
  MemoryBlockStore,
  RawDataBlock,
} from '@brightchain/brightchain-lib';
import { describe, expect, it } from 'vitest';

/**
 * Helper: create a RawDataBlock with random data of the given BlockSize.
 */
function makeRandomBlock(size: BlockSize): RawDataBlock {
  const data = new Uint8Array(size as number);
  crypto.getRandomValues(data);
  return new RawDataBlock(size, data);
}

describe('MemoryBlockStore Session Isolation Property Tests', () => {
  const BLOCK_SIZE = BlockSize.Small;

  describe('Property 6: Memory Store Session Isolation', () => {
    it('should start empty for each new MemoryBlockStore instance', () => {
      for (let i = 0; i < 5; i++) {
        const store = new MemoryBlockStore(BLOCK_SIZE);
        expect(store.size()).toBe(0);
        expect(store.supportedBlockSizes).toContain(BLOCK_SIZE);
      }
    });

    it('should isolate data between different store instances', async () => {
      const store1 = new MemoryBlockStore(BLOCK_SIZE);
      const store2 = new MemoryBlockStore(BLOCK_SIZE);

      // Store a block in store1
      const block = makeRandomBlock(BLOCK_SIZE);
      await store1.setData(block);
      const checksum = block.idChecksum;

      // store1 has it, store2 does not
      expect(await store1.has(checksum)).toBe(true);
      expect(store1.size()).toBe(1);

      expect(await store2.has(checksum)).toBe(false);
      expect(store2.size()).toBe(0);
    });

    it('should reject retrieval of blocks from another store instance', async () => {
      const store1 = new MemoryBlockStore(BLOCK_SIZE);
      const store2 = new MemoryBlockStore(BLOCK_SIZE);

      const block = makeRandomBlock(BLOCK_SIZE);
      await store1.setData(block);
      const checksum = block.idChecksum;

      // Retrieving from store1 works
      const retrieved = await store1.getData(checksum);
      expect(retrieved.data).toEqual(block.data);

      // Retrieving from store2 throws
      await expect(store2.getData(checksum)).rejects.toThrow();
    });

    it('should handle clearing one store without affecting another', async () => {
      const store1 = new MemoryBlockStore(BLOCK_SIZE);
      const store2 = new MemoryBlockStore(BLOCK_SIZE);

      const block1 = makeRandomBlock(BLOCK_SIZE);
      const block2 = makeRandomBlock(BLOCK_SIZE);

      await store1.setData(block1);
      await store2.setData(block2);

      expect(store1.size()).toBe(1);
      expect(store2.size()).toBe(1);

      // Clear store1
      store1.clear();

      expect(store1.size()).toBe(0);
      expect(store2.size()).toBe(1);
      expect(await store2.has(block2.idChecksum)).toBe(true);
    });

    it('should maintain isolation under concurrent operations', async () => {
      const storeCount = 5;
      const blocksPerStore = 10;
      const stores: MemoryBlockStore[] = [];
      const storeBlocks: RawDataBlock[][] = [];

      // Create stores and populate them concurrently
      for (let s = 0; s < storeCount; s++) {
        const store = new MemoryBlockStore(BLOCK_SIZE);
        stores.push(store);
        const blocks: RawDataBlock[] = [];
        for (let b = 0; b < blocksPerStore; b++) {
          const block = makeRandomBlock(BLOCK_SIZE);
          blocks.push(block);
        }
        storeBlocks.push(blocks);
      }

      // Store all blocks concurrently
      const storePromises = stores.flatMap((store, s) =>
        storeBlocks[s].map((block) => store.setData(block)),
      );
      await Promise.all(storePromises);

      // Verify each store only has its own blocks
      for (let s = 0; s < storeCount; s++) {
        expect(stores[s].size()).toBe(blocksPerStore);

        for (const block of storeBlocks[s]) {
          expect(await stores[s].has(block.idChecksum)).toBe(true);
        }

        // Check other stores don't have this store's blocks
        for (let other = 0; other < storeCount; other++) {
          if (other === s) continue;
          for (const block of storeBlocks[s]) {
            expect(await stores[other].has(block.idChecksum)).toBe(false);
          }
        }
      }
    });
  });
});
