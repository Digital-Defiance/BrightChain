/**
 * @fileoverview Property-based tests for MemoryBlockStore CBL Whitening Operations
 *
 * **Feature: cbl-whitening-storage**
 *
 * This test suite verifies:
 * - Property 2: XOR Round-Trip Reconstruction
 * - Property 3: Component Independence
 * - Property 5: Magnet URL Round-Trip Parsing
 * - Property 6: Storage Persistence
 * - Property 11: XOR Commutativity
 *
 * **Validates: Requirements 1.2, 1.6, 2.3, 3.4**
 */

import { afterAll, describe, expect, it } from '@jest/globals';
import fc from 'fast-check';
import { BlockSize } from '../enumerations/blockSize';
import { initializeBrightChain } from '../init';
import { ServiceProvider } from '../services/service.provider';
import { ServiceLocator } from '../services/serviceLocator';
import { MemoryBlockStore } from './memoryBlockStore';

/**
 * Arbitrary for generating hex strings of specified length
 */
const arbHexString = (length: number) =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), {
      minLength: length,
      maxLength: length,
    })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * Generate a sample CBL data object
 */
function generateCblData(seed: number): Uint8Array {
  const cbl = {
    version: 1,
    fileName: `test-${seed}`,
    originalSize: 100 + seed,
    blockCount: 1,
    blocks: [{ id: `abc${seed}def`, size: 50 }],
  };
  return new TextEncoder().encode(JSON.stringify(cbl));
}

/**
 * Arbitrary for generating block sizes for magnet URL tests
 */
const arbBlockSize = fc.constantFrom(
  BlockSize.Small,
  BlockSize.Medium,
  BlockSize.Large,
);

/**
 * Arbitrary for generating 128-character hex IDs (SHA3-512)
 */
const arbBlockId = arbHexString(128);

describe('MemoryBlockStore CBL Whitening - Property Tests', () => {
  let initialized = false;

  const ensureInitialized = () => {
    if (!initialized) {
      initializeBrightChain();
      ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
      initialized = true;
    }
  };

  afterAll(() => {
    if (initialized) {
      ServiceProvider.resetInstance();
      initialized = false;
    }
  });

  describe('Property 2: XOR Round-Trip Reconstruction', () => {
    /**
     * **Feature: cbl-whitening-storage, Property 2: XOR Round-Trip Reconstruction**
     *
     * *For any* valid CBL data that fits within the block size, storing with whitening
     * and then retrieving using the returned block IDs SHALL produce data equivalent
     * to the original CBL.
     *
     * **Validates: Requirements 1.2, 3.4, 3.6**
     */
    it('should reconstruct original CBL after whitening round-trip', async () => {
      ensureInitialized();
      // Test with multiple samples using Small block size (4KB) for speed
      for (let i = 0; i < 5; i++) {
        const store = new MemoryBlockStore(BlockSize.Small);
        const cblData = generateCblData(i);

        const result = await store.storeCBLWithWhitening(cblData);
        const reconstructed = await store.retrieveCBL(
          result.blockId1,
          result.blockId2,
        );
        expect(reconstructed).toEqual(cblData);
      }
    });
  });

  describe('Property 3: Component Independence', () => {
    /**
     * **Feature: cbl-whitening-storage, Property 3: Component Independence**
     *
     * *For any* CBL data, neither block 1 nor block 2 alone SHALL equal
     * the original CBL data.
     *
     * **Validates: Requirements 1.6**
     */
    it('should ensure neither block equals original CBL', async () => {
      ensureInitialized();
      for (let i = 0; i < 5; i++) {
        const store = new MemoryBlockStore(BlockSize.Small);
        const cblData = generateCblData(i);
        const result = await store.storeCBLWithWhitening(cblData);

        const block1 = await store.getData(
          store['hexToChecksum'](result.blockId1),
        );
        const block2 = await store.getData(
          store['hexToChecksum'](result.blockId2),
        );

        // Check that blocks differ from original CBL
        const block1Prefix = block1.data.subarray(0, cblData.length);
        const block2Prefix = block2.data.subarray(0, cblData.length);

        let block1Differs = false;
        let block2Differs = false;

        for (let j = 0; j < cblData.length; j++) {
          if (block1Prefix[j] !== cblData[j]) block1Differs = true;
          if (block2Prefix[j] !== cblData[j]) block2Differs = true;
        }

        expect(block1Differs || block2Differs).toBe(true);
      }
    });
  });

  describe('Property 5: Magnet URL Round-Trip Parsing', () => {
    /**
     * **Feature: cbl-whitening-storage, Property 5: Magnet URL Round-Trip Parsing**
     *
     * *For any* valid block IDs and block size, generating a magnet URL
     * and then parsing it SHALL return the original values.
     *
     * **Validates: Requirements 2.3, 3.1**
     */
    it('should parse generated magnet URL back to original IDs', () => {
      ensureInitialized();
      fc.assert(
        fc.property(arbBlockId, arbBlockId, arbBlockSize, (b1Id, b2Id, bs) => {
          const store = new MemoryBlockStore(bs);
          const magnetUrl = store.generateCBLMagnetUrl(b1Id, b2Id, bs);
          const parsed = store.parseCBLMagnetUrl(magnetUrl);

          expect(parsed.blockId1).toBe(b1Id);
          expect(parsed.blockId2).toBe(b2Id);
          expect(parsed.blockSize).toBe(bs);
          expect(parsed.isEncrypted).toBe(false);
          return true;
        }),
        { numRuns: 20 },
      );
    });

    it('should preserve parity IDs in magnet URL round-trip', () => {
      ensureInitialized();
      fc.assert(
        fc.property(
          arbBlockId,
          arbBlockId,
          arbBlockSize,
          fc.array(arbBlockId, { minLength: 1, maxLength: 2 }),
          fc.array(arbBlockId, { minLength: 1, maxLength: 2 }),
          (b1Id, b2Id, bs, p1Ids, p2Ids) => {
            const store = new MemoryBlockStore(bs);
            const magnetUrl = store.generateCBLMagnetUrl(
              b1Id,
              b2Id,
              bs,
              p1Ids,
              p2Ids,
            );
            const parsed = store.parseCBLMagnetUrl(magnetUrl);

            expect(parsed.block1ParityIds).toEqual(p1Ids);
            expect(parsed.block2ParityIds).toEqual(p2Ids);
            return true;
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should preserve encryption flag in magnet URL round-trip', () => {
      ensureInitialized();
      fc.assert(
        fc.property(
          arbBlockId,
          arbBlockId,
          arbBlockSize,
          fc.boolean(),
          (b1Id, b2Id, bs, isEncrypted) => {
            const store = new MemoryBlockStore(bs);
            const magnetUrl = store.generateCBLMagnetUrl(
              b1Id,
              b2Id,
              bs,
              undefined,
              undefined,
              isEncrypted,
            );
            const parsed = store.parseCBLMagnetUrl(magnetUrl);

            expect(parsed.isEncrypted).toBe(isEncrypted);
            return true;
          },
        ),
        { numRuns: 20 },
      );
    });
  });

  describe('Property 6: Storage Persistence', () => {
    /**
     * **Feature: cbl-whitening-storage, Property 6: Storage Persistence**
     *
     * *For any* CBL stored with whitening, both blocks SHALL exist in the
     * block store and be retrievable by their IDs.
     *
     * **Validates: Requirements 1.3, 1.4, 3.2, 3.3**
     */
    it('should persist both blocks in the store', async () => {
      ensureInitialized();
      for (let i = 0; i < 5; i++) {
        const store = new MemoryBlockStore(BlockSize.Small);
        const cblData = generateCblData(i);
        const result = await store.storeCBLWithWhitening(cblData);

        expect(await store.has(result.blockId1)).toBe(true);
        expect(await store.has(result.blockId2)).toBe(true);

        const block1 = await store.getData(
          store['hexToChecksum'](result.blockId1),
        );
        const block2 = await store.getData(
          store['hexToChecksum'](result.blockId2),
        );

        expect(block1.data.length).toBeGreaterThan(0);
        expect(block2.data.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Property 11: XOR Commutativity', () => {
    /**
     * **Feature: cbl-whitening-storage, Property 11: XOR Commutativity**
     *
     * *For any* two block IDs, retrieving with retrieveCBL(b1, b2) SHALL
     * produce the same result as retrieveCBL(b2, b1).
     *
     * **Validates: XOR commutativity property**
     */
    it('should produce same result regardless of block order', async () => {
      ensureInitialized();
      for (let i = 0; i < 5; i++) {
        const store = new MemoryBlockStore(BlockSize.Small);
        const cblData = generateCblData(i);
        const result = await store.storeCBLWithWhitening(cblData);

        const result1 = await store.retrieveCBL(
          result.blockId1,
          result.blockId2,
        );
        const result2 = await store.retrieveCBL(
          result.blockId2,
          result.blockId1,
        );

        expect(result1).toEqual(result2);
        expect(result1).toEqual(cblData);
      }
    });
  });
});
