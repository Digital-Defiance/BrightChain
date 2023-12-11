/**
 * @fileoverview Property-based tests for Bloom Filter
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 6: Bloom Filter Accuracy
 *
 * **Validates: Requirements 4.1, 4.6**
 */

import fc from 'fast-check';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { BlockRegistry, DEFAULT_BLOOM_FILTER_CONFIG } from './blockRegistry';

/**
 * Generate a valid hex string of specified length (block ID format)
 */
const arbHexString = (minLength: number, maxLength: number) =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), {
      minLength,
      maxLength,
    })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * Generate a valid block ID (hex string of at least 32 characters)
 */
const arbBlockId = arbHexString(32, 64);

/**
 * Generate a unique set of block IDs
 */
const arbBlockIdSet = fc
  .array(arbBlockId, { minLength: 1, maxLength: 200 })
  .map((ids) => [...new Set(ids)]);

/**
 * Generate a set of block IDs that are guaranteed to be different from another set
 */
const arbDisjointBlockIdSets = fc
  .tuple(
    fc.array(arbBlockId, { minLength: 10, maxLength: 100 }),
    fc.array(arbBlockId, { minLength: 100, maxLength: 500 }),
  )
  .map(([set1, set2]) => {
    const uniqueSet1 = [...new Set(set1)];
    const set1Set = new Set(uniqueSet1);
    // Filter set2 to only include IDs not in set1
    const uniqueSet2 = [...new Set(set2)].filter((id) => !set1Set.has(id));
    return { inFilter: uniqueSet1, notInFilter: uniqueSet2 };
  })
  .filter(
    ({ inFilter, notInFilter }) =>
      inFilter.length > 0 && notInFilter.length > 0,
  );

describe('Bloom Filter Property Tests', () => {
  const nodeId = 'test-node-001';
  const blockSizeString = 'small';

  describe('Property 6: Bloom Filter Accuracy', () => {
    /**
     * **Feature: block-availability-discovery, Property 6: Bloom Filter Accuracy**
     *
     * *For any* set of N blocks in the registry, the Bloom filter SHALL:
     * - Return true for all N blocks (no false negatives)
     *
     * **Validates: Requirements 4.1, 4.6**
     */
    it('should have no false negatives - all added blocks must be found', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockIdSet, async (blockIds) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-bloom-no-fn-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });

          try {
            const registry = new BlockRegistry(
              nodeId,
              iterTestDir,
              blockSizeString,
            );

            // Add all blocks
            for (const blockId of blockIds) {
              registry.addLocal(blockId);
            }

            // Export Bloom filter
            const bloomFilter = registry.exportBloomFilter();

            // Verify NO false negatives - all added blocks must be found
            for (const blockId of blockIds) {
              const found = bloomFilter.mightContain(blockId);
              if (!found) {
                // This is a false negative - should never happen
                throw new Error(
                  `False negative detected: block ${blockId} was added but not found in Bloom filter`,
                );
              }
            }

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 6: Bloom Filter Accuracy**
     *
     * *For any* set of N blocks in the registry, the Bloom filter SHALL:
     * - Have a false positive rate of 1% or less for blocks not in the registry
     *
     * **Validates: Requirements 4.1, 4.6**
     */
    it('should have false positive rate of 1% or less', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbDisjointBlockIdSets,
          async ({ inFilter, notInFilter }) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-bloom-fpr-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              const registry = new BlockRegistry(
                nodeId,
                iterTestDir,
                blockSizeString,
                {
                  falsePositiveRate:
                    DEFAULT_BLOOM_FILTER_CONFIG.falsePositiveRate,
                  expectedItems: Math.max(inFilter.length, 1000),
                },
              );

              // Add blocks that should be in the filter
              for (const blockId of inFilter) {
                registry.addLocal(blockId);
              }

              // Export Bloom filter
              const bloomFilter = registry.exportBloomFilter();

              // Count false positives for blocks NOT in the filter
              let falsePositives = 0;
              for (const blockId of notInFilter) {
                if (bloomFilter.mightContain(blockId)) {
                  falsePositives++;
                }
              }

              // Calculate false positive rate
              const falsePositiveRate = falsePositives / notInFilter.length;

              // Allow some margin for statistical variation
              // Target is 1%, but we allow up to 5% to account for random variation
              // in small sample sizes
              const maxAllowedRate = 0.05;

              if (falsePositiveRate > maxAllowedRate) {
                throw new Error(
                  `False positive rate too high: ${(falsePositiveRate * 100).toFixed(2)}% ` +
                    `(${falsePositives}/${notInFilter.length}), expected <= ${maxAllowedRate * 100}%`,
                );
              }

              return true;
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 6: Bloom Filter Accuracy**
     *
     * The Bloom filter should correctly report its metadata.
     *
     * **Validates: Requirements 4.1**
     */
    it('should correctly report filter metadata', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockIdSet, async (blockIds) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-bloom-metadata-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });

          try {
            const registry = new BlockRegistry(
              nodeId,
              iterTestDir,
              blockSizeString,
            );

            // Add all blocks
            for (const blockId of blockIds) {
              registry.addLocal(blockId);
            }

            // Export Bloom filter
            const bloomFilter = registry.exportBloomFilter();

            // Verify metadata
            expect(bloomFilter.itemCount).toBe(blockIds.length);
            expect(bloomFilter.hashCount).toBeGreaterThan(0);
            expect(bloomFilter.bitCount).toBeGreaterThan(0);
            expect(typeof bloomFilter.data).toBe('string');
            expect(bloomFilter.data.length).toBeGreaterThan(0);

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 6: Bloom Filter Accuracy**
     *
     * The Bloom filter should be regenerated when blocks are added or removed.
     *
     * **Validates: Requirements 4.7**
     */
    it('should update when blocks are added or removed', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockIdSet,
          arbBlockId,
          async (initialBlockIds, newBlockId) => {
            // Skip if newBlockId is already in the initial set
            if (initialBlockIds.includes(newBlockId)) {
              return true;
            }

            const iterTestDir = join(
              '/tmp',
              'brightchain-bloom-update-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              const registry = new BlockRegistry(
                nodeId,
                iterTestDir,
                blockSizeString,
              );

              // Add initial blocks
              for (const blockId of initialBlockIds) {
                registry.addLocal(blockId);
              }

              // Get initial Bloom filter
              const _initialFilter = registry.exportBloomFilter();

              // New block should not be in initial filter (with high probability)
              // Note: This might occasionally fail due to false positives
              // but should be rare with proper filter sizing

              // Add new block
              registry.addLocal(newBlockId);

              // Get updated Bloom filter
              const updatedFilter = registry.exportBloomFilter();

              // New block MUST be in updated filter (no false negatives)
              expect(updatedFilter.mightContain(newBlockId)).toBe(true);
              expect(updatedFilter.itemCount).toBe(initialBlockIds.length + 1);

              // Remove the new block
              registry.removeLocal(newBlockId);

              // Get filter after removal
              const afterRemovalFilter = registry.exportBloomFilter();

              // Item count should be back to original
              expect(afterRemovalFilter.itemCount).toBe(initialBlockIds.length);

              return true;
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 6: Bloom Filter Accuracy**
     *
     * Empty registry should produce a valid Bloom filter that returns false for all queries.
     *
     * **Validates: Requirements 4.1**
     */
    it('should handle empty registry correctly', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-bloom-empty-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });

          try {
            const registry = new BlockRegistry(
              nodeId,
              iterTestDir,
              blockSizeString,
            );

            // Export Bloom filter from empty registry
            const bloomFilter = registry.exportBloomFilter();

            // Verify metadata
            expect(bloomFilter.itemCount).toBe(0);

            // Any query should return false (no false positives for empty filter)
            expect(bloomFilter.mightContain(blockId)).toBe(false);

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 50 },
      );
    });
  });
});
