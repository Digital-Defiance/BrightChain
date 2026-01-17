import { AvailabilityState } from '../../enumerations/availabilityState';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { IBlockMetadata } from '../storage/blockMetadata';

/**
 * Location record for a block, tracking which node holds a copy
 * and metadata about that copy.
 *
 * @see Requirements 2.1, 2.2, 2.3
 */
export interface ILocationRecord {
  /**
   * Unique identifier of the node holding this block
   */
  nodeId: string;

  /**
   * Timestamp when this node was last confirmed to have the block
   */
  lastSeen: Date;

  /**
   * Whether this node holds the authoritative (original) copy
   */
  isAuthoritative: boolean;

  /**
   * Optional latency measurement to this node in milliseconds
   */
  latencyMs?: number;
}

/**
 * Extended block metadata with availability and location information.
 * Extends the base IBlockMetadata to support distributed block discovery.
 *
 * @see Requirements 2.1, 2.2, 2.3
 */
export interface IBlockMetadataWithLocation extends IBlockMetadata {
  /**
   * Current availability state of the block
   */
  availabilityState: AvailabilityState;

  /**
   * Nodes known to hold this block
   */
  locationRecords: ILocationRecord[];

  /**
   * When the location information was last updated
   */
  locationUpdatedAt: Date;
}

/**
 * Create default location metadata for a new local block.
 * Used when storing a block locally as the authoritative copy.
 *
 * @param localNodeId - The ID of the local node storing the block
 * @returns Default location metadata fields for a new local block
 */
export function createDefaultLocationMetadata(
  localNodeId: string,
): Pick<
  IBlockMetadataWithLocation,
  'availabilityState' | 'locationRecords' | 'locationUpdatedAt'
> {
  return {
    availabilityState: AvailabilityState.Local,
    locationRecords: [
      {
        nodeId: localNodeId,
        lastSeen: new Date(),
        isAuthoritative: true,
      },
    ],
    locationUpdatedAt: new Date(),
  };
}

/**
 * Serializable representation of ILocationRecord with Date fields as ISO strings
 */
export interface SerializedLocationRecord {
  nodeId: string;
  lastSeen: string;
  isAuthoritative: boolean;
  latencyMs?: number;
}

/**
 * Serializable representation of IBlockMetadataWithLocation
 */
export interface SerializedBlockMetadataWithLocation {
  blockId: string;
  createdAt: string;
  expiresAt: string | null;
  durabilityLevel: string;
  parityBlockIds: string[];
  accessCount: number;
  lastAccessedAt: string;
  replicationStatus: string;
  targetReplicationFactor: number;
  replicaNodeIds: string[];
  size: number;
  checksum: string;
  availabilityState: AvailabilityState;
  locationRecords: SerializedLocationRecord[];
  locationUpdatedAt: string;
}

/**
 * Convert ILocationRecord to JSON-serializable format
 * @param record - The location record to serialize
 * @returns Serialized location record with Date fields as ISO strings
 */
export function locationRecordToJSON(
  record: ILocationRecord,
): SerializedLocationRecord {
  return {
    nodeId: record.nodeId,
    lastSeen: record.lastSeen.toISOString(),
    isAuthoritative: record.isAuthoritative,
    ...(record.latencyMs !== undefined && { latencyMs: record.latencyMs }),
  };
}

/**
 * Convert serialized location record back to ILocationRecord
 * @param serialized - The serialized location record
 * @returns Location record with Date objects
 * @throws Error if validation fails
 */
export function locationRecordFromJSON(
  serialized: SerializedLocationRecord,
): ILocationRecord {
  // Validate required fields
  if (!serialized.nodeId || typeof serialized.nodeId !== 'string') {
    throw new Error(
      'Invalid location record: nodeId is required and must be a string',
    );
  }
  if (!serialized.lastSeen || typeof serialized.lastSeen !== 'string') {
    throw new Error(
      'Invalid location record: lastSeen is required and must be a string',
    );
  }
  if (typeof serialized.isAuthoritative !== 'boolean') {
    throw new Error(
      'Invalid location record: isAuthoritative is required and must be a boolean',
    );
  }

  // Validate and parse date
  const lastSeen = new Date(serialized.lastSeen);
  if (isNaN(lastSeen.getTime())) {
    throw new Error(
      'Invalid location record: lastSeen is not a valid ISO date string',
    );
  }

  // Validate optional latencyMs
  if (serialized.latencyMs !== undefined) {
    if (typeof serialized.latencyMs !== 'number' || serialized.latencyMs < 0) {
      throw new Error(
        'Invalid location record: latencyMs must be a non-negative number',
      );
    }
  }

  return {
    nodeId: serialized.nodeId,
    lastSeen,
    isAuthoritative: serialized.isAuthoritative,
    ...(serialized.latencyMs !== undefined && {
      latencyMs: serialized.latencyMs,
    }),
  };
}

/**
 * Convert IBlockMetadataWithLocation to JSON-serializable format
 * @param metadata - The block metadata with location to serialize
 * @returns Serialized metadata with Date fields as ISO strings
 */
export function blockMetadataWithLocationToJSON(
  metadata: IBlockMetadataWithLocation,
): SerializedBlockMetadataWithLocation {
  return {
    blockId: metadata.blockId,
    createdAt: metadata.createdAt.toISOString(),
    expiresAt: metadata.expiresAt ? metadata.expiresAt.toISOString() : null,
    durabilityLevel: metadata.durabilityLevel,
    parityBlockIds: [...metadata.parityBlockIds],
    accessCount: metadata.accessCount,
    lastAccessedAt: metadata.lastAccessedAt.toISOString(),
    replicationStatus: metadata.replicationStatus,
    targetReplicationFactor: metadata.targetReplicationFactor,
    replicaNodeIds: [...metadata.replicaNodeIds],
    size: metadata.size,
    checksum: metadata.checksum,
    availabilityState: metadata.availabilityState,
    locationRecords: metadata.locationRecords.map(locationRecordToJSON),
    locationUpdatedAt: metadata.locationUpdatedAt.toISOString(),
  };
}

/**
 * Convert serialized block metadata back to IBlockMetadataWithLocation
 * @param serialized - The serialized block metadata
 * @returns Block metadata with Date objects
 * @throws Error if validation fails
 */
export function blockMetadataWithLocationFromJSON(
  serialized: SerializedBlockMetadataWithLocation,
): IBlockMetadataWithLocation {
  // Validate required fields from base IBlockMetadata
  if (!serialized.blockId || typeof serialized.blockId !== 'string') {
    throw new Error(
      'Invalid metadata: blockId is required and must be a string',
    );
  }
  if (!serialized.createdAt || typeof serialized.createdAt !== 'string') {
    throw new Error(
      'Invalid metadata: createdAt is required and must be a string',
    );
  }
  if (
    !serialized.lastAccessedAt ||
    typeof serialized.lastAccessedAt !== 'string'
  ) {
    throw new Error(
      'Invalid metadata: lastAccessedAt is required and must be a string',
    );
  }
  if (
    !serialized.locationUpdatedAt ||
    typeof serialized.locationUpdatedAt !== 'string'
  ) {
    throw new Error(
      'Invalid metadata: locationUpdatedAt is required and must be a string',
    );
  }

  // Validate and parse dates
  const createdAt = new Date(serialized.createdAt);
  if (isNaN(createdAt.getTime())) {
    throw new Error(
      'Invalid metadata: createdAt is not a valid ISO date string',
    );
  }

  const lastAccessedAt = new Date(serialized.lastAccessedAt);
  if (isNaN(lastAccessedAt.getTime())) {
    throw new Error(
      'Invalid metadata: lastAccessedAt is not a valid ISO date string',
    );
  }

  const locationUpdatedAt = new Date(serialized.locationUpdatedAt);
  if (isNaN(locationUpdatedAt.getTime())) {
    throw new Error(
      'Invalid metadata: locationUpdatedAt is not a valid ISO date string',
    );
  }

  let expiresAt: Date | null = null;
  if (serialized.expiresAt !== null) {
    expiresAt = new Date(serialized.expiresAt);
    if (isNaN(expiresAt.getTime())) {
      throw new Error(
        'Invalid metadata: expiresAt is not a valid ISO date string',
      );
    }
  }

  // Validate availability state
  const validStates = Object.values(AvailabilityState);
  if (!validStates.includes(serialized.availabilityState)) {
    throw new Error(
      `Invalid metadata: availabilityState must be one of ${validStates.join(', ')}`,
    );
  }

  // Validate and deserialize location records
  if (!Array.isArray(serialized.locationRecords)) {
    throw new Error('Invalid metadata: locationRecords must be an array');
  }

  const locationRecords = serialized.locationRecords.map((record, index) => {
    try {
      return locationRecordFromJSON(record);
    } catch (error) {
      throw new Error(
        `Invalid metadata: locationRecords[${index}] - ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });

  // Validate numeric fields
  if (
    typeof serialized.accessCount !== 'number' ||
    serialized.accessCount < 0
  ) {
    throw new Error(
      'Invalid metadata: accessCount must be a non-negative number',
    );
  }
  if (
    typeof serialized.targetReplicationFactor !== 'number' ||
    serialized.targetReplicationFactor < 0
  ) {
    throw new Error(
      'Invalid metadata: targetReplicationFactor must be a non-negative number',
    );
  }
  if (typeof serialized.size !== 'number' || serialized.size < 0) {
    throw new Error('Invalid metadata: size must be a non-negative number');
  }

  // Validate arrays
  if (!Array.isArray(serialized.parityBlockIds)) {
    throw new Error('Invalid metadata: parityBlockIds must be an array');
  }
  if (!Array.isArray(serialized.replicaNodeIds)) {
    throw new Error('Invalid metadata: replicaNodeIds must be an array');
  }

  return {
    blockId: serialized.blockId,
    createdAt,
    expiresAt,
    durabilityLevel: serialized.durabilityLevel as DurabilityLevel,
    parityBlockIds: [...serialized.parityBlockIds],
    accessCount: serialized.accessCount,
    lastAccessedAt,
    replicationStatus: serialized.replicationStatus as ReplicationStatus,
    targetReplicationFactor: serialized.targetReplicationFactor,
    replicaNodeIds: [...serialized.replicaNodeIds],
    size: serialized.size,
    checksum: serialized.checksum,
    availabilityState: serialized.availabilityState,
    locationRecords,
    locationUpdatedAt,
  };
}
