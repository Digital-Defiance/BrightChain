import { RawDataBlock } from '../../blocks/rawData';
import { DurabilityLevel } from '../../enumerations/durabilityLevel';
import { ReplicationStatus } from '../../enumerations/replicationStatus';

import { PoolId } from './pooledBlockStore';

/**
 * Block metadata including durability, parity, and replication information.
 * This metadata is stored alongside block data to track lifecycle, access patterns,
 * and redundancy status.
 */
export interface IBlockMetadata {
  /**
   * Unique identifier for the block (typically the checksum as hex string)
   */
  blockId: string;

  /**
   * Timestamp when the block was created/stored
   */
  createdAt: Date;

  /**
   * Timestamp when the block expires and becomes eligible for cleanup.
   * Null indicates the block never expires.
   */
  expiresAt: Date | null;

  /**
   * The durability level determining parity block generation
   */
  durabilityLevel: DurabilityLevel;

  /**
   * IDs of parity blocks generated for this data block using Reed-Solomon encoding
   */
  parityBlockIds: string[];

  /**
   * Number of times this block has been accessed
   */
  accessCount: number;

  /**
   * Timestamp of the most recent access to this block
   */
  lastAccessedAt: Date;

  /**
   * Current replication status of the block
   */
  replicationStatus: ReplicationStatus;

  /**
   * Target number of replicas for this block
   */
  targetReplicationFactor: number;

  /**
   * IDs of nodes that hold replicas of this block
   */
  replicaNodeIds: string[];

  /**
   * Size of the block data in bytes
   */
  size: number;

  /**
   * Checksum of the block data (hex encoded)
   */
  checksum: string;

  /**
   * Optional pool identifier for pool-scoped blocks.
   * When set, indicates which pool this block belongs to.
   */
  poolId?: PoolId;
}

/**
 * Options for storing a block with durability and replication settings
 */
export interface BlockStoreOptions {
  /**
   * When the block should expire and become eligible for cleanup.
   * Undefined or null means the block never expires.
   */
  expiresAt?: Date;

  /**
   * The durability level for the block, determining parity block generation.
   * Defaults to Standard if not specified.
   */
  durabilityLevel?: DurabilityLevel;

  /**
   * Target number of replicas for the block.
   * Defaults to 0 (no replication) if not specified.
   */
  targetReplicationFactor?: number;
}

/**
 * Result of a block recovery attempt using FEC parity data
 */
export interface RecoveryResult {
  /**
   * Whether the recovery was successful
   */
  success: boolean;

  /**
   * The recovered block data if successful
   */
  recoveredBlock?: RawDataBlock;

  /**
   * Error message if recovery failed
   */
  error?: string;
}

/**
 * Result of a block brightening operation using XOR with random blocks.
 * Brightening is used to implement Owner-Free storage patterns.
 */
export interface BrightenResult {
  /**
   * The checksum/ID of the resulting brightened block
   */
  brightenedBlockId: string;

  /**
   * The checksums/IDs of the random blocks used in the XOR operation
   */
  randomBlockIds: string[];

  /**
   * The checksum/ID of the original source block
   */
  originalBlockId: string;
}

/**
 * Create default block metadata for a new block
 * @param blockId - The block's unique identifier
 * @param size - The size of the block data in bytes
 * @param checksum - The checksum of the block data
 * @param options - Optional storage options
 * @param poolId - Optional pool identifier for pool-scoped blocks
 * @returns Default metadata for the block
 */
export function createDefaultBlockMetadata(
  blockId: string,
  size: number,
  checksum: string,
  options?: BlockStoreOptions,
  poolId?: PoolId,
): IBlockMetadata {
  const now = new Date();
  return {
    blockId,
    createdAt: now,
    expiresAt: options?.expiresAt ?? null,
    durabilityLevel: options?.durabilityLevel ?? DurabilityLevel.Standard,
    parityBlockIds: [],
    accessCount: 0,
    lastAccessedAt: now,
    replicationStatus: ReplicationStatus.Pending,
    targetReplicationFactor: options?.targetReplicationFactor ?? 0,
    replicaNodeIds: [],
    size,
    checksum,
    ...(poolId !== undefined ? { poolId } : {}),
  };
}
