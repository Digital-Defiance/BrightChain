import { AvailabilityState } from '../../enumerations/availabilityState';
import { BrightChainStrings } from '../../enumerations/brightChainStrings';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { ReplicationStatus } from '../../enumerations/replicationStatus';
import { TranslatableBrightChainError } from '../../errors/translatableBrightChainError';
import type { BrightDateTimestamp } from '../../types/brightDateTimestamp';
import { brightDateNow } from '../../utils/brightDateConversions';
import type { BlockId } from '../branded/primitives/blockId';
import { IBlockMetadata } from '../storage/blockMetadata';
import { PoolId, isValidPoolId } from '../storage/pooledBlockStore';

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
  lastSeen: BrightDateTimestamp;

  /**
   * Whether this node holds the authoritative (original) copy
   */
  isAuthoritative: boolean;

  /**
   * Optional latency measurement to this node in milliseconds
   */
  latencyMs?: number;

  /**
   * Pool the block is stored in on this node
   */
  poolId?: PoolId;
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
  locationUpdatedAt: BrightDateTimestamp;
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
        lastSeen: brightDateNow(),
        isAuthoritative: true,
      },
    ],
    locationUpdatedAt: brightDateNow(),
  };
}

/**
 * Serializable representation of ILocationRecord with Date fields as ISO strings
 */
export interface SerializedLocationRecord {
  nodeId: string;
  lastSeen: number;
  isAuthoritative: boolean;
  latencyMs?: number;
  poolId?: string;
}

/**
 * Serializable representation of IBlockMetadataWithLocation
 */
export interface SerializedBlockMetadataWithLocation {
  blockId: BlockId;
  createdAt: number;
  expiresAt: number | null;
  durabilityLevel: string;
  parityBlockIds: string[];
  accessCount: number;
  lastAccessedAt: number;
  replicationStatus: string;
  targetReplicationFactor: number;
  replicaNodeIds: string[];
  size: number;
  checksum: string;
  availabilityState: AvailabilityState;
  locationRecords: SerializedLocationRecord[];
  locationUpdatedAt: number;
}

/**
 * Convert ILocationRecord to JSON-serializable format
 * @param record - The location record to serialize
 * @returns Serialized location record with lastSeen as BrightDateTimestamp number
 */
export function locationRecordToJSON(
  record: ILocationRecord,
): SerializedLocationRecord {
  return {
    nodeId: record.nodeId,
    lastSeen: record.lastSeen,
    isAuthoritative: record.isAuthoritative,
    ...(record.latencyMs !== undefined && { latencyMs: record.latencyMs }),
    ...(record.poolId !== undefined && { poolId: record.poolId }),
  };
}

/**
 * Convert serialized location record back to ILocationRecord
 * @param serialized - The serialized location record
 * @returns Location record with BrightDateTimestamp values
 * @throws Error if validation fails
 */
export function locationRecordFromJSON(
  serialized: SerializedLocationRecord,
): ILocationRecord {
  // Validate required fields
  if (!serialized.nodeId || typeof serialized.nodeId !== 'string') {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_LocationRecord_NodeIdRequired,
    );
  }
  if (typeof serialized.lastSeen !== 'number' || !isFinite(serialized.lastSeen)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_LocationRecord_LastSeenRequired,
    );
  }
  if (typeof serialized.isAuthoritative !== 'boolean') {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_LocationRecord_IsAuthoritativeRequired,
    );
  }

  // Validate optional latencyMs
  if (serialized.latencyMs !== undefined) {
    if (typeof serialized.latencyMs !== 'number' || serialized.latencyMs < 0) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.Error_LocationRecord_InvalidLatencyMs,
      );
    }
  }

  // Validate optional poolId
  if (serialized.poolId !== undefined) {
    if (
      typeof serialized.poolId !== 'string' ||
      !isValidPoolId(serialized.poolId)
    ) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.Error_LocationRecord_InvalidPoolId,
      );
    }
  }

  return {
    nodeId: serialized.nodeId,
    lastSeen: serialized.lastSeen,
    isAuthoritative: serialized.isAuthoritative,
    ...(serialized.latencyMs !== undefined && {
      latencyMs: serialized.latencyMs,
    }),
    ...(serialized.poolId !== undefined && {
      poolId: serialized.poolId,
    }),
  };
}

/**
 * Convert IBlockMetadataWithLocation to JSON-serializable format
 * @param metadata - The block metadata with location to serialize
 * @returns Serialized metadata with BrightDateTimestamp numbers
 */
export function blockMetadataWithLocationToJSON(
  metadata: IBlockMetadataWithLocation,
): SerializedBlockMetadataWithLocation {
  return {
    blockId: metadata.blockId,
    createdAt: metadata.createdAt,
    expiresAt: metadata.expiresAt ?? null,
    durabilityLevel: metadata.durabilityLevel,
    parityBlockIds: [...metadata.parityBlockIds],
    accessCount: metadata.accessCount,
    lastAccessedAt: metadata.lastAccessedAt,
    replicationStatus: metadata.replicationStatus,
    targetReplicationFactor: metadata.targetReplicationFactor,
    replicaNodeIds: [...metadata.replicaNodeIds],
    size: metadata.size,
    checksum: metadata.checksum,
    availabilityState: metadata.availabilityState,
    locationRecords: metadata.locationRecords.map(locationRecordToJSON),
    locationUpdatedAt: metadata.locationUpdatedAt,
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
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_BlockIdRequired,
    );
  }
  if (typeof serialized.createdAt !== 'number' || !isFinite(serialized.createdAt)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_CreatedAtRequired,
    );
  }
  if (typeof serialized.lastAccessedAt !== 'number' || !isFinite(serialized.lastAccessedAt)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_LastAccessedAtRequired,
    );
  }
  if (
    !serialized.locationUpdatedAt ||
    typeof serialized.locationUpdatedAt !== 'number' ||
    !isFinite(serialized.locationUpdatedAt)
  ) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_LocationUpdatedAtRequired,
    );
  }

  // BrightDateTimestamp fields are stored as plain numbers — no conversion needed
  const createdAt: BrightDateTimestamp = serialized.createdAt;
  const lastAccessedAt: BrightDateTimestamp = serialized.lastAccessedAt;
  const locationUpdatedAt: BrightDateTimestamp = serialized.locationUpdatedAt;

  let expiresAt: BrightDateTimestamp | null = null;
  if (serialized.expiresAt !== null && serialized.expiresAt !== undefined) {
    if (typeof serialized.expiresAt !== 'number' || !isFinite(serialized.expiresAt)) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.Error_Metadata_CreatedAtRequired,
      );
    }
    expiresAt = serialized.expiresAt;
  }

  // Validate availability state
  const validStates = Object.values(AvailabilityState);
  if (!validStates.includes(serialized.availabilityState)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_InvalidAvailabilityStateTemplate,
      { VALID_STATES: validStates.join(', ') },
    );
  }

  // Validate and deserialize location records
  if (!Array.isArray(serialized.locationRecords)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_LocationRecordsMustBeArray,
    );
  }

  const locationRecords = serialized.locationRecords.map((record, index) => {
    try {
      return locationRecordFromJSON(record);
    } catch (error) {
      throw new TranslatableBrightChainError(
        BrightChainStrings.Error_Metadata_InvalidLocationRecordTemplate,
        {
          INDEX: index,
          ERROR_MESSAGE: error instanceof Error ? error.message : String(error),
        },
      );
    }
  });

  // Validate numeric fields
  if (
    typeof serialized.accessCount !== 'number' ||
    serialized.accessCount < 0
  ) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_InvalidAccessCount,
    );
  }
  if (
    typeof serialized.targetReplicationFactor !== 'number' ||
    serialized.targetReplicationFactor < 0
  ) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_InvalidTargetReplicationFactor,
    );
  }
  if (typeof serialized.size !== 'number' || serialized.size < 0) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_InvalidSize,
    );
  }

  // Validate arrays
  if (!Array.isArray(serialized.parityBlockIds)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_ParityBlockIdsMustBeArray,
    );
  }
  if (!Array.isArray(serialized.replicaNodeIds)) {
    throw new TranslatableBrightChainError(
      BrightChainStrings.Error_Metadata_ReplicaNodeIdsMustBeArray,
    );
  }

  return {
    blockId: serialized.blockId,
    createdAt,
    expiresAt,
    durabilityLevel: serialized.durabilityLevel as DurabilityLevel,
    parityBlockIds: [...serialized.parityBlockIds] as BlockId[],
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
