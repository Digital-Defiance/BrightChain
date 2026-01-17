/**
 * @fileoverview Property-based tests for BlockRegistry
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 9: Registry Consistency with Storage
 * - Property 10: Manifest Export Correctness
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.7**
 */

import fc from 'fast-check';
import { mkdirSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { BlockRegistry } from './blockRegistry';

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
  .array(arbBlockId, { minLength: 0, maxLength: 100 })
  .map((ids) => [...new Set(ids)]);

/**
 * Generate a sequence of add/remove operations
 */
type Operation = { type: 'add'; blockId: string } | { type: 'remove'; blockId: string };

const arbOperation = (blockIds: string[]): fc.Arbitrary<Operation> =>
  fc.oneof(
    fc.constantFrom(...blockIds).map((blockId) => ({ type: 'add' as const, blockId })),
    fc.constantFrom(...blockIds).map((blockId) => ({ type: 'remove' as const, blockId })),
  );

const arbOperationSequence = (blockIds: string[]): fc.Arbitrary<Operation[]> =>
  blockIds.length === 0
    ? fc.constant([])
    : fc.array(arbOperation(blockIds), { minLength: 1, maxLength: 50 });

describe('BlockRegistry Property Tests', () => {
  const nodeId = 'test-node-001';
  const blockSizeString = 'small';

  describe('Property 9: Registry Consistency with Storage', () => {
    /**
     * **Feature: block-availability-discovery, Property 9: Registry Consistency with Storage**
     *
     * *For any* sequence of store and delete operations, the registry SHALL contain
     * exactly the set of block IDs currently stored locally.
     *
     * **Validates: Requirements 3.1, 3.2, 3.3**
     */
    it('should maintain consistency between registry and expected block set after any sequence of operations', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockIdSet, async (blockIds) => {
          if (blockIds.length === 0) return true;

          const iterTestDir = join(
            '/tmp',
            'brightchain-registry-consistency-' +
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

            // Track expected state
            const expectedBlocks = new Set<string>();

            // Generate and apply random operations
            const operations = await fc.sample(
              arbOperationSequence(blockIds),
              1,
            )[0];

            for (const op of operations) {
              if (op.type === 'add') {
                registry.addLocal(op.blockId);
                expectedBlocks.add(op.blockId);
              } else {
                registry.removeLocal(op.blockId);
                expectedBlocks.delete(op.blockId);
              }

              // Verify consistency after each operation
              expect(registry.getLocalCount()).toBe(expectedBlocks.size);

              for (const blockId of expectedBlocks) {
                expect(registry.hasLocal(blockId)).toBe(true);
              }
            }

            // Final verification
            const registryBlocks = new Set(registry.getLocalBlockIds());
            expect(registryBlocks).toEqual(expectedBlocks);

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 9: Registry Consistency with Storage**
     *
     * Adding a block that already exists should not change the registry state.
     *
     * **Validates: Requirements 3.1, 3.2**
     */
    it('should be idempotent for add operations', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-registry-idempotent-' +
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

            // Add block twice
            registry.addLocal(blockId);
            const countAfterFirst = registry.getLocalCount();

            registry.addLocal(blockId);
            const countAfterSecond = registry.getLocalCount();

            // Count should remain the same
            expect(countAfterSecond).toBe(countAfterFirst);
            expect(countAfterSecond).toBe(1);

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 9: Registry Consistency with Storage**
     *
     * Removing a block that doesn't exist should not change the registry state.
     *
     * **Validates: Requirements 3.3**
     */
    it('should be idempotent for remove operations', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-registry-remove-idempotent-' +
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

            // Remove non-existent block
            registry.removeLocal(blockId);
            expect(registry.getLocalCount()).toBe(0);

            // Add and remove
            registry.addLocal(blockId);
            expect(registry.getLocalCount()).toBe(1);

            registry.removeLocal(blockId);
            expect(registry.getLocalCount()).toBe(0);

            // Remove again
            registry.removeLocal(blockId);
            expect(registry.getLocalCount()).toBe(0);

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 9: Registry Consistency with Storage**
     *
     * After rebuild from disk, the registry should contain exactly the blocks on disk.
     *
     * **Validates: Requirements 3.1, 3.5**
     */
    it('should rebuild correctly from disk storage', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockIdSet, async (blockIds) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-registry-rebuild-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });

          try {
            // Create directory structure and block files
            const basePath = join(iterTestDir, blockSizeString);
            mkdirSync(basePath, { recursive: true });

            for (const blockId of blockIds) {
              if (blockId.length >= 2) {
                const dir = join(basePath, blockId[0], blockId[1]);
                mkdirSync(dir, { recursive: true });
                writeFileSync(join(dir, blockId), 'test data');
              }
            }

            // Create registry and rebuild
            const registry = new BlockRegistry(
              nodeId,
              iterTestDir,
              blockSizeString,
            );
            await registry.rebuild();

            // Verify registry matches disk
            const expectedBlocks = new Set(
              blockIds.filter((id) => id.length >= 2),
            );
            const registryBlocks = new Set(registry.getLocalBlockIds());

            expect(registryBlocks).toEqual(expectedBlocks);
            expect(registry.getLocalCount()).toBe(expectedBlocks.size);

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 10: Manifest Export Correctness', () => {
    /**
     * **Feature: block-availability-discovery, Property 10: Manifest Export Correctness**
     *
     * *For any* registry state, the exported manifest SHALL contain exactly all
     * block IDs in the registry.
     *
     * **Validates: Requirements 3.7**
     */
    it('should export manifest containing exactly all block IDs', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockIdSet, async (blockIds) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-manifest-export-' +
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

            // Export manifest
            const manifest = registry.exportManifest();

            // Verify manifest contains exactly the blocks
            const manifestBlockSet = new Set(manifest.blockIds);
            const expectedBlockSet = new Set(blockIds);

            expect(manifestBlockSet).toEqual(expectedBlockSet);
            expect(manifest.nodeId).toBe(nodeId);
            expect(manifest.generatedAt).toBeInstanceOf(Date);
            expect(typeof manifest.checksum).toBe('string');
            expect(manifest.checksum.length).toBe(64); // SHA-256 hex

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 10: Manifest Export Correctness**
     *
     * The manifest checksum SHALL change if and only if the block set changes.
     *
     * **Validates: Requirements 3.7**
     */
    it('should produce different checksums for different block sets', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockIdSet,
          arbBlockIdSet,
          async (blockIds1, blockIds2) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-manifest-checksum-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              const registry1 = new BlockRegistry(
                nodeId,
                iterTestDir,
                blockSizeString,
              );
              const registry2 = new BlockRegistry(
                nodeId,
                iterTestDir,
                blockSizeString,
              );

              // Add blocks to each registry
              for (const blockId of blockIds1) {
                registry1.addLocal(blockId);
              }
              for (const blockId of blockIds2) {
                registry2.addLocal(blockId);
              }

              const manifest1 = registry1.exportManifest();
              const manifest2 = registry2.exportManifest();

              // Check if block sets are equal
              const set1 = new Set(blockIds1);
              const set2 = new Set(blockIds2);
              const setsEqual =
                set1.size === set2.size &&
                [...set1].every((id) => set2.has(id));

              if (setsEqual) {
                // Same block set should produce same checksum
                expect(manifest1.checksum).toBe(manifest2.checksum);
              } else {
                // Different block sets should produce different checksums
                expect(manifest1.checksum).not.toBe(manifest2.checksum);
              }

              return true;
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 10: Manifest Export Correctness**
     *
     * The manifest checksum should be deterministic for the same block set.
     *
     * **Validates: Requirements 3.7**
     */
    it('should produce same checksum for same block set regardless of insertion order', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockIdSet, async (blockIds) => {
          if (blockIds.length < 2) return true;

          const iterTestDir = join(
            '/tmp',
            'brightchain-manifest-deterministic-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });

          try {
            const registry1 = new BlockRegistry(
              nodeId,
              iterTestDir,
              blockSizeString,
            );
            const registry2 = new BlockRegistry(
              nodeId,
              iterTestDir,
              blockSizeString,
            );

            // Add blocks in original order
            for (const blockId of blockIds) {
              registry1.addLocal(blockId);
            }

            // Add blocks in reverse order
            const reversedIds = [...blockIds].reverse();
            for (const blockId of reversedIds) {
              registry2.addLocal(blockId);
            }

            const manifest1 = registry1.exportManifest();
            const manifest2 = registry2.exportManifest();

            // Same block set should produce same checksum
            expect(manifest1.checksum).toBe(manifest2.checksum);

            // Block IDs should be sorted in manifest
            const sortedIds = [...blockIds].sort();
            expect(manifest1.blockIds).toEqual(sortedIds);
            expect(manifest2.blockIds).toEqual(sortedIds);

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
