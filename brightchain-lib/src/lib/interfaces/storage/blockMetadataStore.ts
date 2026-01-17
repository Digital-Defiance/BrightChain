import { IBlockMetadata } from './blockMetadata';
import { ReplicationStatus } from '../../enumerations/replicationStatus';

/**
 * Interface for block metadata storage operations.
 *
 * This interface provides CRUD operations for block metadata, as well as
 * query methods for finding blocks by expiration status and replication status.
 *
 * Implementations:
 * - MemoryBlockMetadataStore (brightchain-lib): In-memory storage using Map
 * - DiskBlockMetadataStore (brightchain-api-lib): Disk-based storage using JSON files
 *
 * @see IBlockMetadata for the metadata structure
 * @see ReplicationStatus for replication status values
 */
export interface IBlockMetadataStore {
  /**
   * Create and store metadata for a new block.
   * @param metadata - The complete metadata record to store
   * @throws Error if metadata for this blockId already exists
   */
  create(metadata: IBlockMetadata): Promise<void>;

  /**
   * Get metadata for a block by its ID.
   * @param blockId - The unique identifier of the block
   * @returns The block's metadata, or null if not found
   */
  get(blockId: string): Promise<IBlockMetadata | null>;

  /**
   * Update metadata for an existing block.
   * @param blockId - The unique identifier of the block
   * @param updates - Partial metadata updates to apply
   * @throws Error if no metadata exists for this blockId
   */
  update(blockId: string, updates: Partial<IBlockMetadata>): Promise<void>;

  /**
   * Delete metadata for a block.
   * @param blockId - The unique identifier of the block
   * @throws Error if no metadata exists for this blockId
   */
  delete(blockId: string): Promise<void>;

  /**
   * Find all blocks that have expired (expiresAt is in the past).
   * @returns Array of metadata for expired blocks
   */
  findExpired(): Promise<IBlockMetadata[]>;

  /**
   * Find all blocks with a specific replication status.
   * @param status - The replication status to filter by
   * @returns Array of metadata for blocks with the specified status
   */
  findByReplicationStatus(status: ReplicationStatus): Promise<IBlockMetadata[]>;

  /**
   * Record an access to a block, updating accessCount and lastAccessedAt.
   * @param blockId - The unique identifier of the block
   * @throws Error if no metadata exists for this blockId
   */
  recordAccess(blockId: string): Promise<void>;
}
