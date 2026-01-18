/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @fileoverview Property-based tests for Location Metadata Serialization
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 8: Location Metadata Serialization Round-Trip
 *
 * **Validates: Requirements 2.6**
 */

import fc from 'fast-check';
import { AvailabilityState } from '../../enumerations/availabilityState';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import {
  blockMetadataWithLocationFromJSON,
  blockMetadataWithLocationToJSON,
  IBlockMetadataWithLocation,
  ILocationRecord,
  locationRecordFromJSON,
  locationRecordToJSON,
} from './locationRecord';

/**
 * Generate a valid node ID (alphanumeric string)
 */
const arbNodeId = fc.stringMatching(/^[a-zA-Z0-9-]{8,32}$/);

/**
 * Generate a valid Date object (not too far in past or future)
 * Filter out invalid dates (NaN) that can't be serialized
 */
const arbDate = fc
  .date({
    min: new Date('2020-01-01'),
    max: new Date('2030-12-31'),
  })
  .filter((date) => !isNaN(date.getTime()));

/**
 * Generate a valid latency value (0-5000ms)
 */
const arbLatency = fc.integer({ min: 0, max: 5000 });

/**
 * Generate a valid ILocationRecord
 */
const arbLocationRecord: fc.Arbitrary<ILocationRecord> = fc.record({
  nodeId: arbNodeId,
  lastSeen: arbDate,
  isAuthoritative: fc.boolean(),
  latencyMs: fc.option(arbLatency, { nil: undefined }),
});

/**
 * Generate a valid hex string (for block IDs and checksums)
 */
const arbHexString = (minLength: number, maxLength: number) =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), {
      minLength,
      maxLength,
    })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * Generate a valid block ID
 */
const arbBlockId = arbHexString(32, 64);

/**
 * Generate a valid availability state
 */
const arbAvailabilityState = fc.constantFrom(
  AvailabilityState.Local,
  AvailabilityState.Remote,
  AvailabilityState.Cached,
  AvailabilityState.Orphaned,
  AvailabilityState.Unknown,
);

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
 * Generate a valid IBlockMetadataWithLocation
 */
const arbBlockMetadataWithLocation: fc.Arbitrary<IBlockMetadataWithLocation> =
  fc.record({
    blockId: arbBlockId,
    createdAt: arbDate,
    expiresAt: fc.option(arbDate, { nil: null }),
    durabilityLevel: arbDurabilityLevel,
    parityBlockIds: fc.array(arbBlockId, { minLength: 0, maxLength: 5 }),
    accessCount: fc.integer({ min: 0, max: 10000 }),
    lastAccessedAt: arbDate,
    replicationStatus: arbReplicationStatus,
    targetReplicationFactor: fc.integer({ min: 0, max: 10 }),
    replicaNodeIds: fc.array(arbNodeId, { minLength: 0, maxLength: 10 }),
    size: fc.integer({ min: 0, max: 1000000 }),
    checksum: arbHexString(32, 64),
    availabilityState: arbAvailabilityState,
    locationRecords: fc.array(arbLocationRecord, {
      minLength: 0,
      maxLength: 10,
    }),
    locationUpdatedAt: arbDate,
  });

describe('Location Metadata Serialization Property Tests', () => {
  describe('Property 8: Location Metadata Serialization Round-Trip', () => {
    /**
     * **Feature: block-availability-discovery, Property 8: Location Metadata Serialization Round-Trip**
     *
     * *For any* valid IBlockMetadataWithLocation object, serializing to JSON and then
     * deserializing SHALL produce an equivalent object with all location records preserved.
     *
     * **Validates: Requirements 2.6**
     */
    it('should preserve ILocationRecord through JSON serialization round-trip', () => {
      fc.assert(
        fc.property(arbLocationRecord, (record) => {
          // Serialize
          const serialized = locationRecordToJSON(record);

          // Deserialize
          const deserialized = locationRecordFromJSON(serialized);

          // Verify all fields are preserved
          expect(deserialized.nodeId).toBe(record.nodeId);
          expect(deserialized.lastSeen.getTime()).toBe(
            record.lastSeen.getTime(),
          );
          expect(deserialized.isAuthoritative).toBe(record.isAuthoritative);

          // Check optional latencyMs
          if (record.latencyMs !== undefined) {
            expect(deserialized.latencyMs).toBe(record.latencyMs);
          } else {
            expect(deserialized.latencyMs).toBeUndefined();
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve IBlockMetadataWithLocation through JSON serialization round-trip', () => {
      fc.assert(
        fc.property(arbBlockMetadataWithLocation, (metadata) => {
          // Serialize
          const serialized = blockMetadataWithLocationToJSON(metadata);

          // Deserialize
          const deserialized = blockMetadataWithLocationFromJSON(serialized);

          // Verify base IBlockMetadata fields
          expect(deserialized.blockId).toBe(metadata.blockId);
          expect(deserialized.createdAt.getTime()).toBe(
            metadata.createdAt.getTime(),
          );
          expect(deserialized.lastAccessedAt.getTime()).toBe(
            metadata.lastAccessedAt.getTime(),
          );
          expect(deserialized.durabilityLevel).toBe(metadata.durabilityLevel);
          expect(deserialized.accessCount).toBe(metadata.accessCount);
          expect(deserialized.replicationStatus).toBe(
            metadata.replicationStatus,
          );
          expect(deserialized.targetReplicationFactor).toBe(
            metadata.targetReplicationFactor,
          );
          expect(deserialized.size).toBe(metadata.size);
          expect(deserialized.checksum).toBe(metadata.checksum);

          // Verify expiresAt (can be null)
          if (metadata.expiresAt === null) {
            expect(deserialized.expiresAt).toBeNull();
          } else {
            expect(deserialized.expiresAt?.getTime()).toBe(
              metadata.expiresAt.getTime(),
            );
          }

          // Verify arrays
          expect(deserialized.parityBlockIds).toEqual(metadata.parityBlockIds);
          expect(deserialized.replicaNodeIds).toEqual(metadata.replicaNodeIds);

          // Verify availability fields
          expect(deserialized.availabilityState).toBe(
            metadata.availabilityState,
          );
          expect(deserialized.locationUpdatedAt.getTime()).toBe(
            metadata.locationUpdatedAt.getTime(),
          );

          // Verify location records
          expect(deserialized.locationRecords.length).toBe(
            metadata.locationRecords.length,
          );

          for (let i = 0; i < metadata.locationRecords.length; i++) {
            const originalRecord = metadata.locationRecords[i];
            const deserializedRecord = deserialized.locationRecords[i];

            expect(deserializedRecord.nodeId).toBe(originalRecord.nodeId);
            expect(deserializedRecord.lastSeen.getTime()).toBe(
              originalRecord.lastSeen.getTime(),
            );
            expect(deserializedRecord.isAuthoritative).toBe(
              originalRecord.isAuthoritative,
            );

            if (originalRecord.latencyMs !== undefined) {
              expect(deserializedRecord.latencyMs).toBe(
                originalRecord.latencyMs,
              );
            } else {
              expect(deserializedRecord.latencyMs).toBeUndefined();
            }
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });

    it('should handle edge cases in serialization', () => {
      // Test with empty location records
      const metadataWithEmptyRecords: IBlockMetadataWithLocation = {
        blockId: 'abc123',
        createdAt: new Date('2024-01-01'),
        expiresAt: null,
        durabilityLevel: DurabilityLevel.Standard,
        parityBlockIds: [],
        accessCount: 0,
        lastAccessedAt: new Date('2024-01-01'),
        replicationStatus: ReplicationStatus.Pending,
        targetReplicationFactor: 0,
        replicaNodeIds: [],
        size: 1024,
        checksum: 'def456',
        availabilityState: AvailabilityState.Local,
        locationRecords: [],
        locationUpdatedAt: new Date('2024-01-01'),
      };

      const serialized = blockMetadataWithLocationToJSON(
        metadataWithEmptyRecords,
      );
      const deserialized = blockMetadataWithLocationFromJSON(serialized);

      expect(deserialized.locationRecords).toEqual([]);
      expect(deserialized.blockId).toBe('abc123');
    });

    it('should reject invalid serialized data', () => {
      // Missing required field
      expect(() => {
        locationRecordFromJSON({
          nodeId: 'node-1',
          lastSeen: '2024-01-01T00:00:00.000Z',
          // Missing isAuthoritative
        } as unknown as any);
      }).toThrow('isAuthoritative is required');

      // Invalid date format
      expect(() => {
        locationRecordFromJSON({
          nodeId: 'node-1',
          lastSeen: 'not-a-date',
          isAuthoritative: true,
        });
      }).toThrow('not a valid ISO date string');

      // Negative latency
      expect(() => {
        locationRecordFromJSON({
          nodeId: 'node-1',
          lastSeen: '2024-01-01T00:00:00.000Z',
          isAuthoritative: true,
          latencyMs: -100,
        });
      }).toThrow('must be a non-negative number');

      // Invalid availability state
      expect(() => {
        blockMetadataWithLocationFromJSON({
          blockId: 'abc123',
          createdAt: '2024-01-01T00:00:00.000Z',
          expiresAt: null,
          durabilityLevel: DurabilityLevel.Standard,
          parityBlockIds: [],
          accessCount: 0,
          lastAccessedAt: '2024-01-01T00:00:00.000Z',
          replicationStatus: ReplicationStatus.Pending,
          targetReplicationFactor: 0,
          replicaNodeIds: [],
          size: 1024,
          checksum: 'def456',
          availabilityState: 'invalid-state' as unknown as AvailabilityState,
          locationRecords: [],
          locationUpdatedAt: '2024-01-01T00:00:00.000Z',
        });
      }).toThrow('availabilityState must be one of');
    });
  });
});
