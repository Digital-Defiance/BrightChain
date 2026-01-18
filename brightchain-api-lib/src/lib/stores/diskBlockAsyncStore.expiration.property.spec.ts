/**
 * @fileoverview Property-based tests for DiskBlockAsyncStore expiration identification
 *
 * **Feature: backend-blockstore-quorum, Property 3: Block Expiration Identification**
 * **Validates: Requirements 3.1, 3.4**
 *
 * This test suite verifies that:
 * - Blocks with expiration times in the past are identified as expired
 * - Blocks with expiration times in the future are not identified as expired
 * - Blocks with no expiration time are never identified as expired
 */

import {
  BlockSize,
  DurabilityLevel,
  initializeBrightChain,
  RawDataBlock,
  ServiceLocator,
  ServiceProvider,
} from '@brightchain/brightchain-lib';
import { uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { DiskBlockAsyncStore } from './diskBlockAsyncStore';

describe('DiskBlockAsyncStore Expiration Property Tests', () => {
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

  describe('Property 3: Block Expiration Identification', () => {
    /**
     * Property: For any set of blocks with various expiration times, the cleanup
     * identification process SHALL return exactly those blocks whose expiration
     * time is in the past.
     *
     * **Validates: Requirements 3.1, 3.4**
     */
    it('should identify only blocks with past expiration times', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              data: fc.uint8Array({ minLength: 1, maxLength: 50 }),
              // -1 = expired (past), 0 = no expiration, 1 = not expired (future)
              expirationState: fc.integer({ min: -1, max: 1 }),
            }),
            { minLength: 1, maxLength: 5 },
          ),
          async (blockSpecs) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-expiration-test-' +
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
              const storedBlocks: {
                blockId: string;
                shouldBeExpired: boolean;
              }[] = [];
              const now = Date.now();

              for (const spec of blockSpecs) {
                const block = new RawDataBlock(blockSize, spec.data);
                const blockId = block.idChecksum.toHex();

                let expiresAt: Date | undefined;
                let shouldBeExpired = false;

                if (spec.expirationState === -1) {
                  // Expired - set expiration in the past
                  expiresAt = new Date(now - 1000 * 60); // 1 minute ago
                  shouldBeExpired = true;
                } else if (spec.expirationState === 1) {
                  // Not expired - set expiration in the future
                  expiresAt = new Date(now + 1000 * 60 * 60); // 1 hour from now
                  shouldBeExpired = false;
                }
                // expirationState === 0 means no expiration (undefined)

                await store.setData(block, {
                  durabilityLevel: DurabilityLevel.Ephemeral,
                  expiresAt,
                });

                storedBlocks.push({ blockId, shouldBeExpired });
              }

              // Find expired blocks
              const expiredBlocks = await store.findExpired();
              const expiredBlockIds = new Set(
                expiredBlocks.map((m) => m.blockId),
              );

              // Verify only blocks with past expiration are returned
              for (const { blockId, shouldBeExpired } of storedBlocks) {
                if (shouldBeExpired) {
                  expect(expiredBlockIds.has(blockId)).toBe(true);
                } else {
                  expect(expiredBlockIds.has(blockId)).toBe(false);
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
     * Property: Blocks with no expiration time should never be identified as expired.
     */
    it('should never identify blocks without expiration as expired', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-no-expiry-test-' +
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

              // Store without expiration
              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Ephemeral,
              });

              // Verify metadata has no expiration
              const metadata = await store.getMetadata(block.idChecksum);
              expect(metadata).not.toBeNull();
              expect(metadata!.expiresAt).toBeNull();

              // Find expired blocks - should not include this block
              const expiredBlocks = await store.findExpired();
              const expiredBlockIds = expiredBlocks.map((m) => m.blockId);
              expect(expiredBlockIds).not.toContain(blockId);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: Blocks with future expiration times should not be identified as expired.
     */
    it('should not identify blocks with future expiration as expired', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 24 }), // hours in the future
          async (data, hoursInFuture) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-future-expiry-test-' +
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
              const expiresAt = new Date(
                Date.now() + hoursInFuture * 60 * 60 * 1000,
              );

              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Ephemeral,
                expiresAt,
              });

              // Find expired blocks - should not include this block
              const expiredBlocks = await store.findExpired();
              const expiredBlockIds = expiredBlocks.map((m) => m.blockId);
              expect(expiredBlockIds).not.toContain(blockId);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 30 },
      );
    });

    /**
     * Property: Blocks with past expiration times should be identified as expired.
     */
    it('should identify blocks with past expiration as expired', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 24 }), // hours in the past
          async (data, hoursInPast) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());

            const iterTestDir = join(
              '/tmp',
              'brightchain-past-expiry-test-' +
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
              const expiresAt = new Date(
                Date.now() - hoursInPast * 60 * 60 * 1000,
              );

              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Ephemeral,
                expiresAt,
              });

              // Find expired blocks - should include this block
              const expiredBlocks = await store.findExpired();
              const expiredBlockIds = expiredBlocks.map((m) => m.blockId);
              expect(expiredBlockIds).toContain(blockId);
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
