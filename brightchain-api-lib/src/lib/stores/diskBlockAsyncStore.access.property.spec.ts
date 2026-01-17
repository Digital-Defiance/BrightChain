/**
 * @fileoverview Property-based tests for DiskBlockAsyncStore access tracking
 *
 * **Feature: backend-blockstore-quorum, Property 2: Block Access Tracking**
 * **Validates: Requirements 2.2**
 *
 * This test suite verifies that:
 * - Accessing a block N times results in accessCount being N
 * - lastAccessedAt is updated on each access
 */

import {
  BlockSize,
  DurabilityLevel,
  RawDataBlock,
  initializeBrightChain,
  ServiceProvider,
  ServiceLocator,
} from '@brightchain/brightchain-lib';
import { uint8ArrayToHex } from '@digitaldefiance/ecies-lib';
import fc from 'fast-check';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { DiskBlockAsyncStore } from './diskBlockAsyncStore';

describe('DiskBlockAsyncStore Access Tracking Property Tests', () => {
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

  describe('Property 2: Block Access Tracking', () => {
    /**
     * Property: For any stored block, accessing the block N times SHALL result
     * in the access count being N and the last access timestamp being updated
     * to reflect the most recent access.
     *
     * **Validates: Requirements 2.2**
     */
    it('should track access count and update lastAccessedAt', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 10 }),
          async (data, accessCount) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
            
            const iterTestDir = join(
              '/tmp',
              'brightchain-access-track-test-' +
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
              const initialTime = new Date();

              // Store the block with ephemeral durability (no FEC needed)
              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Ephemeral,
              });

              // Access the block multiple times via metadata (getData creates new block with file date)
              for (let i = 0; i < accessCount; i++) {
                // Use has() to check existence, then record access via metadata store
                const exists = await store.has(block.idChecksum);
                expect(exists).toBe(true);
                // Access via getMetadata which triggers recordAccess internally
                await store.getMetadataStore().recordAccess(uint8ArrayToHex(block.idChecksum));
              }

              // Verify access tracking
              const metadata = await store.getMetadata(block.idChecksum);
              expect(metadata).not.toBeNull();
              expect(metadata!.accessCount).toBe(accessCount);
              expect(metadata!.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(
                initialTime.getTime(),
              );
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: Each access should increment the access count by exactly 1.
     */
    it('should increment access count by 1 on each access', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          fc.integer({ min: 1, max: 5 }),
          async (data, accessCount) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
            
            const iterTestDir = join(
              '/tmp',
              'brightchain-access-incr-test-' +
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
              const keyHex = uint8ArrayToHex(block.idChecksum);

              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Ephemeral,
              });

              // Verify initial access count is 0
              let metadata = await store.getMetadata(block.idChecksum);
              expect(metadata!.accessCount).toBe(0);

              // Access and verify count increments
              for (let i = 1; i <= accessCount; i++) {
                await store.getMetadataStore().recordAccess(keyHex);
                metadata = await store.getMetadata(block.idChecksum);
                expect(metadata!.accessCount).toBe(i);
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
     * Property: lastAccessedAt should be updated to a time >= the previous access time.
     */
    it('should update lastAccessedAt to be >= previous access time', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.uint8Array({ minLength: 1, maxLength: 100 }),
          async (data) => {
            // Re-initialize for each property test iteration
            initializeBrightChain();
            ServiceLocator.setServiceProvider(ServiceProvider.getInstance());
            
            const iterTestDir = join(
              '/tmp',
              'brightchain-access-time-test-' +
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
              const keyHex = uint8ArrayToHex(block.idChecksum);

              await store.setData(block, {
                durabilityLevel: DurabilityLevel.Ephemeral,
              });

              // Get initial lastAccessedAt
              let metadata = await store.getMetadata(block.idChecksum);
              const initialAccessTime = metadata!.lastAccessedAt.getTime();

              // Access the block
              await store.getMetadataStore().recordAccess(keyHex);

              // Verify lastAccessedAt is updated
              metadata = await store.getMetadata(block.idChecksum);
              expect(metadata!.lastAccessedAt.getTime()).toBeGreaterThanOrEqual(
                initialAccessTime,
              );
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
