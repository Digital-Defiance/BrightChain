/**
 * @fileoverview Property-based tests for DiskBlockMetadataStore persistence
 *
 * **Feature: backend-blockstore-quorum, Property 1: Block Metadata Persistence Round-Trip**
 * **Validates: Requirements 2.1, 2.3**
 *
 * This test suite verifies that:
 * - Block metadata is correctly persisted to disk
 * - Metadata can be retrieved after being stored
 * - Metadata updates are correctly persisted
 * - Access tracking is correctly recorded
 */

import {
  BlockSize,
  DurabilityLevel,
  IBlockMetadata,
  ReplicationStatus,
  StoreError,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { DiskBlockMetadataStore } from './diskBlockMetadataStore';

/**
 * Generate a valid hex string of specified length
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
 * Generate a valid durability level
 */
const arbDurabilityLevel = fc.constantFrom(
  DurabilityLevel.Ephemeral,
  DurabilityLevel.Standard,
  DurabilityLevel.HighDurability,
);

/**
 * Generate a valid date within a reasonable range
 * Uses integer timestamps to avoid any edge cases with Date generation
 */
const arbDate = fc
  .integer({
    min: new Date('2020-01-01').getTime(),
    max: new Date('2030-12-31').getTime(),
  })
  .map((timestamp) => new Date(timestamp));

/**
 * Generate an optional date (either a valid date or null)
 */
const arbOptionalDate = fc.oneof(arbDate, fc.constant(null));

/**
 * Generate block store options
 */
const arbBlockStoreOptions = fc.record({
  expiresAt: arbOptionalDate,
  durabilityLevel: arbDurabilityLevel,
  targetReplicationFactor: fc.nat({ max: 10 }),
});

describe('DiskBlockMetadataStore Persistence Property Tests', () => {
  const blockSize = BlockSize.Small;

  describe('Property 1: Block Metadata Persistence Round-Trip', () => {
    /**
     * Property: For any valid block data, storing the block and then retrieving
     * its metadata SHALL return a metadata record containing the correct block ID,
     * creation timestamp, and all configured options (expiration, durability level).
     *
     * **Validates: Requirements 2.1, 2.3**
     */
    it('should persist and retrieve metadata with correct options', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          arbBlockStoreOptions,
          fc.nat({ max: 1000000 }),
          arbHexString(32, 64),
          async (blockId, options, size, checksum) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-persist-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockMetadataStore(iterTestDir, blockSize);

            try {
              const now = new Date();
              const metadata: IBlockMetadata = {
                blockId,
                createdAt: now,
                expiresAt: options.expiresAt,
                durabilityLevel: options.durabilityLevel,
                parityBlockIds: [],
                accessCount: 0,
                lastAccessedAt: now,
                replicationStatus: ReplicationStatus.Pending,
                targetReplicationFactor: options.targetReplicationFactor,
                replicaNodeIds: [],
                size,
                checksum,
              };

              // Store the metadata
              await store.create(metadata);

              // Verify the file exists on disk
              expect(store.has(blockId)).toBe(true);

              // Retrieve the metadata
              const retrieved = await store.get(blockId);

              // Verify all fields are correct
              expect(retrieved).not.toBeNull();
              expect(retrieved!.blockId).toBe(blockId);
              expect(retrieved!.createdAt.getTime()).toBe(now.getTime());
              expect(retrieved!.durabilityLevel).toBe(options.durabilityLevel);
              expect(retrieved!.targetReplicationFactor).toBe(
                options.targetReplicationFactor,
              );
              expect(retrieved!.size).toBe(size);
              expect(retrieved!.checksum).toBe(checksum);

              if (options.expiresAt === null) {
                expect(retrieved!.expiresAt).toBeNull();
              } else {
                expect(retrieved!.expiresAt).not.toBeNull();
                expect(retrieved!.expiresAt!.getTime()).toBe(
                  options.expiresAt.getTime(),
                );
              }
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Metadata updates should be correctly persisted and retrievable.
     */
    it('should persist metadata updates correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.nat({ max: 1000 }),
          fc.nat({ max: 1000 }),
          async (blockId, initialAccessCount, additionalAccesses) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-update-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockMetadataStore(iterTestDir, blockSize);

            try {
              const now = new Date();
              const metadata: IBlockMetadata = {
                blockId,
                createdAt: now,
                expiresAt: null,
                durabilityLevel: DurabilityLevel.Standard,
                parityBlockIds: [],
                accessCount: initialAccessCount,
                lastAccessedAt: now,
                replicationStatus: ReplicationStatus.Pending,
                targetReplicationFactor: 0,
                replicaNodeIds: [],
                size: 1024,
                checksum: 'abc123def456abc123def456abc123de',
              };

              await store.create(metadata);

              // Update the access count
              const newAccessCount = initialAccessCount + additionalAccesses;
              await store.update(blockId, { accessCount: newAccessCount });

              // Retrieve and verify
              const retrieved = await store.get(blockId);
              expect(retrieved).not.toBeNull();
              expect(retrieved!.accessCount).toBe(newAccessCount);

              // Original fields should be preserved
              expect(retrieved!.blockId).toBe(blockId);
              expect(retrieved!.durabilityLevel).toBe(DurabilityLevel.Standard);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: Recording access should increment accessCount and update lastAccessedAt.
     */
    it('should correctly record block access', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.integer({ min: 1, max: 10 }),
          async (blockId, accessCount) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-access-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const store = new DiskBlockMetadataStore(iterTestDir, blockSize);

            try {
              const initialTime = new Date();
              const metadata: IBlockMetadata = {
                blockId,
                createdAt: initialTime,
                expiresAt: null,
                durabilityLevel: DurabilityLevel.Standard,
                parityBlockIds: [],
                accessCount: 0,
                lastAccessedAt: initialTime,
                replicationStatus: ReplicationStatus.Pending,
                targetReplicationFactor: 0,
                replicaNodeIds: [],
                size: 1024,
                checksum: 'abc123def456abc123def456abc123de',
              };

              await store.create(metadata);

              // Record multiple accesses
              for (let i = 0; i < accessCount; i++) {
                await store.recordAccess(blockId);
              }

              // Retrieve and verify
              const retrieved = await store.get(blockId);
              expect(retrieved).not.toBeNull();
              expect(retrieved!.accessCount).toBe(accessCount);
              expect(
                retrieved!.lastAccessedAt.getTime(),
              ).toBeGreaterThanOrEqual(initialTime.getTime());
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: Deleting metadata should remove it from disk.
     */
    it('should correctly delete metadata from disk', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-delete-test-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });
          const store = new DiskBlockMetadataStore(iterTestDir, blockSize);

          try {
            const now = new Date();
            const metadata: IBlockMetadata = {
              blockId,
              createdAt: now,
              expiresAt: null,
              durabilityLevel: DurabilityLevel.Standard,
              parityBlockIds: [],
              accessCount: 0,
              lastAccessedAt: now,
              replicationStatus: ReplicationStatus.Pending,
              targetReplicationFactor: 0,
              replicaNodeIds: [],
              size: 1024,
              checksum: 'abc123def456abc123def456abc123de',
            };

            await store.create(metadata);
            expect(store.has(blockId)).toBe(true);

            await store.delete(blockId);
            expect(store.has(blockId)).toBe(false);

            const retrieved = await store.get(blockId);
            expect(retrieved).toBeNull();
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 50 },
      );
    });

    /**
     * Property: Creating metadata for an existing blockId should throw an error.
     */
    it('should throw error when creating duplicate metadata', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-dup-test-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });
          const store = new DiskBlockMetadataStore(iterTestDir, blockSize);

          try {
            const now = new Date();
            const metadata: IBlockMetadata = {
              blockId,
              createdAt: now,
              expiresAt: null,
              durabilityLevel: DurabilityLevel.Standard,
              parityBlockIds: [],
              accessCount: 0,
              lastAccessedAt: now,
              replicationStatus: ReplicationStatus.Pending,
              targetReplicationFactor: 0,
              replicaNodeIds: [],
              size: 1024,
              checksum: 'abc123def456abc123def456abc123de',
            };

            await store.create(metadata);

            // Attempting to create again should throw
            await expect(store.create(metadata)).rejects.toThrow(StoreError);
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 30 },
      );
    });

    /**
     * Property: Updating non-existent metadata should throw an error.
     */
    it('should throw error when updating non-existent metadata', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-nonexist-test-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });
          const store = new DiskBlockMetadataStore(iterTestDir, blockSize);

          try {
            await expect(
              store.update(blockId, { accessCount: 1 }),
            ).rejects.toThrow(StoreError);
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 30 },
      );
    });

    /**
     * Property: Deleting non-existent metadata should throw an error.
     */
    it('should throw error when deleting non-existent metadata', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockId, async (blockId) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-delnonexist-test-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });
          const store = new DiskBlockMetadataStore(iterTestDir, blockSize);

          try {
            await expect(store.delete(blockId)).rejects.toThrow(StoreError);
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 30 },
      );
    });
  });
});
