/**
 * @fileoverview Property-based tests for DiskBlockMetadataStore serialization
 *
 * **Feature: backend-blockstore-quorum, Property 29: Block Metadata Serialization Round-Trip**
 * **Validates: Requirements 16.2**
 *
 * This test suite verifies that:
 * - Block metadata can be serialized to JSON and deserialized without data loss
 * - All fields are preserved through the serialization round-trip
 * - Date fields are correctly converted to/from ISO strings
 */

import {
  BlockSize,
  DurabilityLevel,
  IBlockMetadata,
  ReplicationStatus,
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
 * Generate a valid replication status
 */
const arbReplicationStatus = fc.constantFrom(
  ReplicationStatus.Pending,
  ReplicationStatus.Replicated,
  ReplicationStatus.UnderReplicated,
  ReplicationStatus.Failed,
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
 * Generate a valid block metadata object
 */
const arbBlockMetadata: fc.Arbitrary<IBlockMetadata> = fc.record({
  blockId: arbBlockId,
  createdAt: arbDate,
  expiresAt: arbOptionalDate,
  durabilityLevel: arbDurabilityLevel,
  parityBlockIds: fc.array(arbBlockId, { maxLength: 5 }),
  accessCount: fc.nat({ max: 10000 }),
  lastAccessedAt: arbDate,
  replicationStatus: arbReplicationStatus,
  targetReplicationFactor: fc.nat({ max: 10 }),
  replicaNodeIds: fc.array(arbHexString(8, 32), { maxLength: 10 }),
  size: fc.nat({ max: 1000000 }),
  checksum: arbHexString(32, 64),
});

describe('DiskBlockMetadataStore Serialization Property Tests', () => {
  const blockSize = BlockSize.Small;

  describe('Property 29: Block Metadata Serialization Round-Trip', () => {
    /**
     * Property: For any valid IBlockMetadata object, serializing to JSON
     * and then deserializing SHALL preserve all fields including blockId,
     * timestamps, durabilityLevel, accessCount, replicationStatus, size, and checksum.
     *
     * **Validates: Requirements 16.2**
     */
    it('should preserve all metadata fields through create/get round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbBlockMetadata, async (metadata) => {
          // Create a unique test directory for this iteration
          const iterTestDir = join(
            '/tmp',
            'brightchain-metadata-iter-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });
          const iterStore = new DiskBlockMetadataStore(iterTestDir, blockSize);

          try {
            // Store the metadata
            await iterStore.create(metadata);

            // Retrieve the metadata
            const retrieved = await iterStore.get(metadata.blockId);

            // Verify all fields are preserved
            expect(retrieved).not.toBeNull();
            expect(retrieved!.blockId).toBe(metadata.blockId);
            expect(retrieved!.createdAt.getTime()).toBe(
              metadata.createdAt.getTime(),
            );

            if (metadata.expiresAt === null) {
              expect(retrieved!.expiresAt).toBeNull();
            } else {
              expect(retrieved!.expiresAt).not.toBeNull();
              expect(retrieved!.expiresAt!.getTime()).toBe(
                metadata.expiresAt.getTime(),
              );
            }

            expect(retrieved!.durabilityLevel).toBe(metadata.durabilityLevel);
            expect(retrieved!.parityBlockIds).toEqual(metadata.parityBlockIds);
            expect(retrieved!.accessCount).toBe(metadata.accessCount);
            expect(retrieved!.lastAccessedAt.getTime()).toBe(
              metadata.lastAccessedAt.getTime(),
            );
            expect(retrieved!.replicationStatus).toBe(
              metadata.replicationStatus,
            );
            expect(retrieved!.targetReplicationFactor).toBe(
              metadata.targetReplicationFactor,
            );
            expect(retrieved!.replicaNodeIds).toEqual(metadata.replicaNodeIds);
            expect(retrieved!.size).toBe(metadata.size);
            expect(retrieved!.checksum).toBe(metadata.checksum);
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property: Date fields should be correctly serialized to ISO strings
     * and deserialized back to Date objects with the same timestamp.
     */
    it('should correctly serialize and deserialize date fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          arbDate,
          fc.boolean(), // Whether to include expiresAt
          arbDate,
          arbDate,
          async (blockId, createdAt, hasExpiry, expiryDate, lastAccessedAt) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-date-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const iterStore = new DiskBlockMetadataStore(
              iterTestDir,
              blockSize,
            );

            try {
              const expiresAt = hasExpiry ? expiryDate : null;
              const metadata: IBlockMetadata = {
                blockId,
                createdAt,
                expiresAt,
                durabilityLevel: DurabilityLevel.Standard,
                parityBlockIds: [],
                accessCount: 0,
                lastAccessedAt,
                replicationStatus: ReplicationStatus.Pending,
                targetReplicationFactor: 0,
                replicaNodeIds: [],
                size: 1024,
                checksum: 'abc123def456abc123def456abc123de',
              };

              await iterStore.create(metadata);
              const retrieved = await iterStore.get(blockId);

              expect(retrieved).not.toBeNull();
              expect(retrieved!.createdAt).toBeInstanceOf(Date);
              expect(retrieved!.lastAccessedAt).toBeInstanceOf(Date);
              expect(retrieved!.createdAt.getTime()).toBe(createdAt.getTime());
              expect(retrieved!.lastAccessedAt.getTime()).toBe(
                lastAccessedAt.getTime(),
              );

              if (expiresAt === null) {
                expect(retrieved!.expiresAt).toBeNull();
              } else {
                expect(retrieved!.expiresAt).toBeInstanceOf(Date);
                expect(retrieved!.expiresAt!.getTime()).toBe(
                  expiresAt.getTime(),
                );
              }
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property: Array fields (parityBlockIds, replicaNodeIds) should be
     * preserved through serialization without modification.
     */
    it('should preserve array fields through serialization', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.array(arbBlockId, { maxLength: 10 }),
          fc.array(arbHexString(8, 32), { maxLength: 10 }),
          async (blockId, parityBlockIds, replicaNodeIds) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-array-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const iterStore = new DiskBlockMetadataStore(
              iterTestDir,
              blockSize,
            );

            try {
              const now = new Date();
              const metadata: IBlockMetadata = {
                blockId,
                createdAt: now,
                expiresAt: null,
                durabilityLevel: DurabilityLevel.Standard,
                parityBlockIds,
                accessCount: 0,
                lastAccessedAt: now,
                replicationStatus: ReplicationStatus.Pending,
                targetReplicationFactor: replicaNodeIds.length,
                replicaNodeIds,
                size: 1024,
                checksum: 'abc123def456abc123def456abc123de',
              };

              await iterStore.create(metadata);
              const retrieved = await iterStore.get(blockId);

              expect(retrieved).not.toBeNull();
              expect(retrieved!.parityBlockIds).toEqual(parityBlockIds);
              expect(retrieved!.replicaNodeIds).toEqual(replicaNodeIds);
              expect(retrieved!.parityBlockIds.length).toBe(
                parityBlockIds.length,
              );
              expect(retrieved!.replicaNodeIds.length).toBe(
                replicaNodeIds.length,
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
     * Property: Numeric fields should be preserved exactly through serialization.
     */
    it('should preserve numeric fields through serialization', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockId,
          fc.nat({ max: 1000000 }),
          fc.nat({ max: 10 }),
          fc.nat({ max: 10000000 }),
          async (blockId, accessCount, targetReplicationFactor, size) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-numeric-test-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });
            const iterStore = new DiskBlockMetadataStore(
              iterTestDir,
              blockSize,
            );

            try {
              const now = new Date();
              const metadata: IBlockMetadata = {
                blockId,
                createdAt: now,
                expiresAt: null,
                durabilityLevel: DurabilityLevel.Standard,
                parityBlockIds: [],
                accessCount,
                lastAccessedAt: now,
                replicationStatus: ReplicationStatus.Pending,
                targetReplicationFactor,
                replicaNodeIds: [],
                size,
                checksum: 'abc123def456abc123def456abc123de',
              };

              await iterStore.create(metadata);
              const retrieved = await iterStore.get(blockId);

              expect(retrieved).not.toBeNull();
              expect(retrieved!.accessCount).toBe(accessCount);
              expect(retrieved!.targetReplicationFactor).toBe(
                targetReplicationFactor,
              );
              expect(retrieved!.size).toBe(size);
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
