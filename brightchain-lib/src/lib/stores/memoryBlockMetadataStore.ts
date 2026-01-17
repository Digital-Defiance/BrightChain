import { ReplicationStatus } from '../enumerations/replicationStatus';
import { StoreErrorType } from '../enumerations/storeErrorType';
import { StoreError } from '../errors/storeError';
import { IBlockMetadata } from '../interfaces/storage/blockMetadata';
import { IBlockMetadataStore } from '../interfaces/storage/blockMetadataStore';

/**
 * In-memory implementation of IBlockMetadataStore.
 *
 * This implementation stores block metadata in a Map for fast access.
 * It is suitable for testing, development, and browser environments.
 *
 * Note: Data is not persisted and will be lost when the store is destroyed.
 *
 * @see IBlockMetadataStore for the interface definition
 * @see DiskBlockMetadataStore for a persistent implementation
 */
export class MemoryBlockMetadataStore implements IBlockMetadataStore {
  private readonly metadata = new Map<string, IBlockMetadata>();

  /**
   * Create and store metadata for a new block.
   * @param metadata - The complete metadata record to store
   * @throws StoreError if metadata for this blockId already exists
   */
  public async create(metadata: IBlockMetadata): Promise<void> {
    if (this.metadata.has(metadata.blockId)) {
      throw new StoreError(StoreErrorType.BlockAlreadyExists, undefined, {
        KEY: metadata.blockId,
      });
    }
    // Store a deep copy to prevent external mutations
    this.metadata.set(metadata.blockId, this.cloneMetadata(metadata));
  }

  /**
   * Get metadata for a block by its ID.
   * @param blockId - The unique identifier of the block
   * @returns The block's metadata, or null if not found
   */
  public async get(blockId: string): Promise<IBlockMetadata | null> {
    const meta = this.metadata.get(blockId);
    if (!meta) {
      return null;
    }
    // Return a deep copy to prevent external mutations
    return this.cloneMetadata(meta);
  }

  /**
   * Update metadata for an existing block.
   * @param blockId - The unique identifier of the block
   * @param updates - Partial metadata updates to apply
   * @throws StoreError if no metadata exists for this blockId
   */
  public async update(
    blockId: string,
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    const existing = this.metadata.get(blockId);
    if (!existing) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: blockId,
      });
    }

    // Apply updates while preserving the blockId
    const updated: IBlockMetadata = {
      ...existing,
      ...updates,
      blockId: existing.blockId, // Prevent blockId from being changed
    };

    this.metadata.set(blockId, updated);
  }

  /**
   * Delete metadata for a block.
   * @param blockId - The unique identifier of the block
   * @throws StoreError if no metadata exists for this blockId
   */
  public async delete(blockId: string): Promise<void> {
    if (!this.metadata.has(blockId)) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: blockId,
      });
    }
    this.metadata.delete(blockId);
  }

  /**
   * Find all blocks that have expired (expiresAt is in the past).
   * @returns Array of metadata for expired blocks
   */
  public async findExpired(): Promise<IBlockMetadata[]> {
    const now = new Date();
    const expired: IBlockMetadata[] = [];

    for (const meta of this.metadata.values()) {
      if (meta.expiresAt !== null && meta.expiresAt < now) {
        expired.push(this.cloneMetadata(meta));
      }
    }

    return expired;
  }

  /**
   * Find all blocks with a specific replication status.
   * @param status - The replication status to filter by
   * @returns Array of metadata for blocks with the specified status
   */
  public async findByReplicationStatus(
    status: ReplicationStatus,
  ): Promise<IBlockMetadata[]> {
    const matching: IBlockMetadata[] = [];

    for (const meta of this.metadata.values()) {
      if (meta.replicationStatus === status) {
        matching.push(this.cloneMetadata(meta));
      }
    }

    return matching;
  }

  /**
   * Record an access to a block, updating accessCount and lastAccessedAt.
   * @param blockId - The unique identifier of the block
   * @throws StoreError if no metadata exists for this blockId
   */
  public async recordAccess(blockId: string): Promise<void> {
    const existing = this.metadata.get(blockId);
    if (!existing) {
      throw new StoreError(StoreErrorType.KeyNotFound, undefined, {
        KEY: blockId,
      });
    }

    existing.accessCount += 1;
    existing.lastAccessedAt = new Date();
  }

  // === Utility Methods ===

  /**
   * Clear all metadata from the store.
   * Useful for testing.
   */
  public clear(): void {
    this.metadata.clear();
  }

  /**
   * Get the number of metadata records in the store.
   * @returns The number of metadata records
   */
  public size(): number {
    return this.metadata.size;
  }

  /**
   * Check if metadata exists for a block.
   * @param blockId - The unique identifier of the block
   * @returns True if metadata exists
   */
  public has(blockId: string): boolean {
    return this.metadata.has(blockId);
  }

  /**
   * Create a deep copy of metadata to prevent external mutations.
   * @param meta - The metadata to clone
   * @returns A deep copy of the metadata
   */
  private cloneMetadata(meta: IBlockMetadata): IBlockMetadata {
    return {
      ...meta,
      createdAt: new Date(meta.createdAt.getTime()),
      expiresAt: meta.expiresAt ? new Date(meta.expiresAt.getTime()) : null,
      lastAccessedAt: new Date(meta.lastAccessedAt.getTime()),
      parityBlockIds: [...meta.parityBlockIds],
      replicaNodeIds: [...meta.replicaNodeIds],
    };
  }
}
