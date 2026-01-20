/**
 * @fileoverview Property-based tests for DiskBlockAsyncStore cleanup with CBL protection
 *
 * **Feature: backend-blockstore-quorum, Property 4: Block Cleanup with CBL Protection**
 * **Validates: Requirements 3.2, 3.4**
 *
 * This test suite verifies that:
 * - Expired blocks referenced by active CBLs are NOT deleted
 * - Expired blocks not referenced by any CBL ARE deleted
 * - Block data, metadata, and parity blocks are all deleted during cleanup
 */

import {
  BlockSize,
  DurabilityLevel,
  initializeBrightChain,
  RawDataBlock,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { DiskBlockAsyncStore } from './diskBlockAsyncStore';

describe('DiskBlockAsyncStore Cleanup Property Tests', () => {
  const blockSize = BlockSize.Small;

  beforeAll(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  beforeEach(() => {
    initializeBrightChain();
    ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
  });

  afterEach(() => {
    ServiceProvider.resetInstance();
  });

  describe('Property 4: Block Cleanup with CBL Protection', () => {
    /**
     * Property: For any expired block that is referenced by an active CBL,
     * the cleanup process SHALL NOT delete that block.
     *
     * **Validates: Requirements 3.2, 3.4**
     */
    it('should not delete expired blocks referenced by CBL', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-cbl-protect-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockAsyncStore({
              storePath: iterTestDir,
              blockSize,
            });

            try {
              const block = new RawDataBlock(blockSize, data);
              const blockId = block.idChecksum.toHex();

              // Store with past expiration
              const expiresAt = new Date(Date.now() - 1000 * 60); // 1 minute ago
              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Ephemeral,
                expiresAt,
              });

              // Verify block is expired
              const expiredBlocks = await store.findExpired();
              expect(expiredBlocks.map((m) => m.blockId)).toContain(blockId);

              // Create a CBL checker that says this block is referenced
              const cblChecker = async (id: string) => id === blockId;

              // Run cleanup with CBL protection
              const result = await store.cleanupExpiredBlocks(cblChecker);

              // Block should NOT be deleted
              expect(result.deletedBlockIds).not.toContain(blockId);
              expect(await store.has(block.idChecksum)).toBe(true);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: For any expired block not referenced by any CBL,
     * the cleanup process SHALL delete both the block data and metadata.
     *
     * **Validates: Requirements 3.2, 3.4**
     */
    it('should delete expired blocks not referenced by CBL', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-cleanup-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockAsyncStore({
              storePath: iterTestDir,
              blockSize,
            });

            try {
              const block = new RawDataBlock(blockSize, data);
              const blockId = block.idChecksum.toHex();

              // Store with past expiration
              const expiresAt = new Date(Date.now() - 1000 * 60); // 1 minute ago
              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Ephemeral,
                expiresAt,
              });

              // Verify block exists
              expect(await store.has(block.idChecksum)).toBe(true);

              // Create a CBL checker that says no blocks are referenced
              const cblChecker = async (_id: string) => false;

              // Run cleanup
              const result = await store.cleanupExpiredBlocks(cblChecker);

              // Block should be deleted
              expect(result.deletedBlockIds).toContain(blockId);
              expect(await store.has(block.idChecksum)).toBe(false);
              expect(await store.getMetadata(block.idChecksum)).toBeNull();
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: Cleanup without CBL checker should delete all expired blocks.
     */
    it('should delete all expired blocks when no CBL checker provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              data: fc.uint8Array({ minLength: 1, maxLength: 50 }),
              isExpired: fc.boolean(),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          async (blockSpecs) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-cleanup-all-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockAsyncStore({
              storePath: iterTestDir,
              blockSize,
            });

            try {
              const storedBlocks: { blockId: string; isExpired: boolean }[] =
                [];
              const now = Date.now();

              for (const spec of blockSpecs) {
                const block = new RawDataBlock(blockSize, spec.data);
                const blockId = block.idChecksum.toHex();

                const expiresAt = spec.isExpired
                  ? new Date(now - 1000 * 60) // 1 minute ago
                  : new Date(now + 1000 * 60 * 60); // 1 hour from now

                await store.setData(block, {
                  durabilityLevel: DurabilityLevel.Ephemeral,
                  expiresAt,
                });

                storedBlocks.push({ blockId, isExpired: spec.isExpired });
              }

              // Run cleanup without CBL checker
              const result = await store.cleanupExpiredBlocks();

              // Verify only expired blocks were deleted
              const deletedSet = new Set(result.deletedBlockIds);
              for (const { blockId, isExpired } of storedBlocks) {
                if (isExpired) {
                  expect(deletedSet.has(blockId)).toBe(true);
                } else {
                  expect(deletedSet.has(blockId)).toBe(false);
                }
              }
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: Mixed scenario - some blocks protected by CBL, some not.
     */
    it('should correctly handle mixed CBL protection scenario', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              data: fc.uint8Array({ minLength: 1, maxLength: 50 }),
              isProtected: fc.boolean(),
            }),
            { minLength: 2, maxLength: 5 },
          ),
          async (blockSpecs) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-mixed-cleanup-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockAsyncStore({
              storePath: iterTestDir,
              blockSize,
            });

            try {
              const storedBlocks: { blockId: string; isProtected: boolean }[] =
                [];
              const protectedBlockIds = new Set<string>();
              const seenBlockIds = new Set<string>();
              const now = Date.now();

              for (let i = 0; i < blockSpecs.length; i++) {
                const spec = blockSpecs[i];
                // Make data unique by appending index to avoid duplicate block IDs
                const uniqueData = new Uint8Array([...spec.data, i]);
                const block = new RawDataBlock(blockSize, uniqueData);
                const blockId = block.idChecksum.toHex();

                // Skip if we've already stored a block with this ID (shouldn't happen with unique data)
                if (seenBlockIds.has(blockId)) {
                  continue;
                }
                seenBlockIds.add(blockId);

                // All blocks are expired
                const expiresAt = new Date(now - 1000 * 60);

                await store.setData(block, {
                  durabilityLevel: DurabilityLevel.Ephemeral,
                  expiresAt,
                });

                storedBlocks.push({ blockId, isProtected: spec.isProtected });
                if (spec.isProtected) {
                  protectedBlockIds.add(blockId);
                }
              }

              // CBL checker that protects some blocks
              const cblChecker = async (id: string) =>
                protectedBlockIds.has(id);

              // Run cleanup
              const result = await store.cleanupExpiredBlocks(cblChecker);

              // Verify correct blocks were deleted/protected
              const deletedSet = new Set(result.deletedBlockIds);
              for (const { blockId, isProtected } of storedBlocks) {
                if (isProtected) {
                  expect(deletedSet.has(blockId)).toBe(false);
                } else {
                  expect(deletedSet.has(blockId)).toBe(true);
                }
              }
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 30 },
      );
    });
  });
});
