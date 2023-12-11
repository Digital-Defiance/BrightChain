/**
 * @fileoverview Property-based tests for DiskBlockAsyncStore CBL whitening operations
 *
 * **Feature: cbl-whitening-storage**
 * **Property 2: XOR Round-Trip Reconstruction**
 * **Property 6: Storage Persistence**
 *
 * These tests validate that CBL whitening works correctly with disk-based storage,
 * including round-trip reconstruction and persistence verification.
 */

import {
  BlockSize,
  Checksum,
  initializeBrightChain,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { DiskBlockAsyncStore } from './diskBlockAsyncStore';

// Initialize BrightChain before running tests
beforeAll(async () => {
  await initializeBrightChain();
});

/**
 * Generate valid CBL data for testing.
 * CBL is a JSON structure containing file reconstruction metadata.
 */
function generateCblData(seed: number): Uint8Array {
  const cbl = {
    version: 1,
    fileName: `test-file-${seed}.txt`,
    originalSize: 1000 + seed,
    blockCount: 5 + (seed % 10),
    blocks: Array.from({ length: 5 + (seed % 10) }, (_, i) => ({
      id: `block-${seed}-${i}`.padEnd(128, '0'),
      size: 256,
    })),
    sessionId: `session-${seed}`,
  };

  return new TextEncoder().encode(JSON.stringify(cbl));
}

describe('DiskBlockAsyncStore CBL Whitening Property Tests', () => {
  const blockSize = BlockSize.Small;

  /**
   * Feature: cbl-whitening-storage, Property 2: XOR Round-Trip Reconstruction
   *
   * **Validates: Requirements 1.2, 3.4**
   *
   * For any valid CBL data, storing with whitening and then retrieving using
   * the returned block IDs SHALL produce data equivalent to the original CBL.
   */
  describe('Property 2: XOR Round-Trip Reconstruction', () => {
    it('should reconstruct original CBL after whitening round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          async (seed: number) => {
            // Create unique test directory for this iteration
            const iterTestDir = join(
              '/tmp',
              `brightchain-cbl-test-${Date.now()}-${seed}`,
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              const store = new DiskBlockAsyncStore({
                storePath: iterTestDir,
                blockSize,
              });

              const cblData = generateCblData(seed);

              // Store with whitening
              const result = await store.storeCBLWithWhitening(cblData);

              // Verify result structure
              expect(result.blockId1).toBeDefined();
              expect(result.blockId2).toBeDefined();
              expect(result.blockSize).toBe(blockSize);
              expect(result.magnetUrl).toContain('magnet:?');

              // Retrieve and reconstruct
              const reconstructed = await store.retrieveCBL(
                result.blockId1,
                result.blockId2,
              );

              // Verify round-trip: reconstructed should equal original
              expect(reconstructed).toEqual(cblData);

              // Also verify the CBL content is valid JSON
              const reconstructedCbl = JSON.parse(
                new TextDecoder().decode(reconstructed),
              );
              const originalCbl = JSON.parse(new TextDecoder().decode(cblData));
              expect(reconstructedCbl).toEqual(originalCbl);
            } finally {
              // Clean up test directory
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 20 }, // Reduced runs for disk I/O tests
      );
    });

    it('should work with different CBL sizes', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 10, max: 1000 }),
          async (dataSize: number) => {
            const iterTestDir = join(
              '/tmp',
              `brightchain-cbl-size-test-${Date.now()}-${dataSize}`,
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              const store = new DiskBlockAsyncStore({
                storePath: iterTestDir,
                blockSize,
              });

              // Generate CBL data of specific size
              const cbl = {
                version: 1,
                fileName: 'test.txt',
                originalSize: dataSize,
                blockCount: Math.ceil(dataSize / 256),
                blocks: Array.from(
                  { length: Math.ceil(dataSize / 256) },
                  (_, i) => ({
                    id: `block-${i}`.padEnd(128, '0'),
                    size: Math.min(256, dataSize - i * 256),
                  }),
                ),
              };
              const cblData = new TextEncoder().encode(JSON.stringify(cbl));

              // Store and retrieve
              const result = await store.storeCBLWithWhitening(cblData);
              const reconstructed = await store.retrieveCBL(
                result.blockId1,
                result.blockId2,
              );

              // Verify round-trip
              expect(reconstructed).toEqual(cblData);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  /**
   * Feature: cbl-whitening-storage, Property 6: Storage Persistence
   *
   * **Validates: Requirements 1.3, 1.4, 3.2, 3.3**
   *
   * For any CBL stored with whitening, both blocks SHALL exist in the block store
   * and be retrievable by their IDs.
   */
  describe('Property 6: Storage Persistence', () => {
    it('should persist both whitening blocks to disk', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 100 }),
          async (seed: number) => {
            const iterTestDir = join(
              '/tmp',
              `brightchain-cbl-persist-test-${Date.now()}-${seed}`,
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              const store = new DiskBlockAsyncStore({
                storePath: iterTestDir,
                blockSize,
              });

              const cblData = generateCblData(seed);

              // Store with whitening
              const result = await store.storeCBLWithWhitening(cblData);

              // Verify both blocks exist in the store
              expect(await store.has(result.blockId1)).toBe(true);
              expect(await store.has(result.blockId2)).toBe(true);

              // Verify both blocks can be retrieved individually
              const block1 = await store.getData(
                Checksum.fromHex(result.blockId1),
              );
              const block2 = await store.getData(
                Checksum.fromHex(result.blockId2),
              );

              expect(block1).toBeDefined();
              expect(block2).toBeDefined();
              expect(block1.data.length).toBeGreaterThan(0);
              expect(block2.data.length).toBeGreaterThan(0);

              // Verify blocks are different from each other
              expect(block1.data).not.toEqual(block2.data);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 20 },
      );
    });

    it('should persist blocks across store instances', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: 50 }),
          async (seed: number) => {
            const iterTestDir = join(
              '/tmp',
              `brightchain-cbl-instance-test-${Date.now()}-${seed}`,
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              // Create first store instance and store CBL
              const store1 = new DiskBlockAsyncStore({
                storePath: iterTestDir,
                blockSize,
              });

              const cblData = generateCblData(seed);
              const result = await store1.storeCBLWithWhitening(cblData);

              // Create second store instance pointing to same directory
              const store2 = new DiskBlockAsyncStore({
                storePath: iterTestDir,
                blockSize,
              });

              // Verify blocks exist in second instance
              expect(await store2.has(result.blockId1)).toBe(true);
              expect(await store2.has(result.blockId2)).toBe(true);

              // Retrieve CBL using second instance
              const reconstructed = await store2.retrieveCBL(
                result.blockId1,
                result.blockId2,
              );

              // Verify reconstruction works across instances
              expect(reconstructed).toEqual(cblData);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 15 },
      );
    });
  });

  /**
   * Additional validation tests for error cases and edge conditions
   */
  describe('Error Handling and Edge Cases', () => {
    it('should reject empty CBL data', async () => {
      const iterTestDir = join(
        '/tmp',
        `brightchain-cbl-empty-test-${Date.now()}`,
      );
      mkdirSync(iterTestDir, { recursive: true });

      try {
        const store = new DiskBlockAsyncStore({
          storePath: iterTestDir,
          blockSize,
        });

        await expect(
          store.storeCBLWithWhitening(new Uint8Array(0)),
        ).rejects.toThrow();
      } finally {
        rmSync(iterTestDir, { recursive: true, force: true });
      }
    });

    it('should throw error for non-existent blocks', async () => {
      const iterTestDir = join(
        '/tmp',
        `brightchain-cbl-notfound-test-${Date.now()}`,
      );
      mkdirSync(iterTestDir, { recursive: true });

      try {
        const store = new DiskBlockAsyncStore({
          storePath: iterTestDir,
          blockSize,
        });

        const fakeId = '0'.repeat(128);
        await expect(store.retrieveCBL(fakeId, fakeId)).rejects.toThrow();
      } finally {
        rmSync(iterTestDir, { recursive: true, force: true });
      }
    });

    it('should handle magnet URL parsing correctly', async () => {
      const iterTestDir = join(
        '/tmp',
        `brightchain-cbl-magnet-test-${Date.now()}`,
      );
      mkdirSync(iterTestDir, { recursive: true });

      try {
        const store = new DiskBlockAsyncStore({
          storePath: iterTestDir,
          blockSize,
        });

        const cblData = generateCblData(42);
        const result = await store.storeCBLWithWhitening(cblData);

        // Parse the generated magnet URL
        const parsed = store.parseCBLMagnetUrl(result.magnetUrl);

        expect(parsed.blockId1).toBe(result.blockId1);
        expect(parsed.blockId2).toBe(result.blockId2);
        expect(parsed.blockSize).toBe(blockSize);

        // Use parsed components to retrieve CBL
        const reconstructed = await store.retrieveCBL(
          parsed.blockId1,
          parsed.blockId2,
        );

        expect(reconstructed).toEqual(cblData);
      } finally {
        rmSync(iterTestDir, { recursive: true, force: true });
      }
    });
  });
});
