/**
 * @fileoverview Block Registry Interface
 *
 * Defines the interface for maintaining a fast local index of blocks,
 * supporting O(1) lookups, Bloom filter export, and manifest generation.
 *
 * @see Requirements 3.1, 3.5, 3.6, 3.7, 4.5
 */

import { PoolId } from '../storage/pooledBlockStore';

/**
 * Bloom filter for efficient block existence queries.
 * A space-efficient probabilistic data structure used to test
 * whether a block might exist on a node.
 *
 * @see Requirements 4.1, 4.6
 */
export interface BloomFilter {
  /**
   * Serialized filter data as a base64 string
   */
  data: string;

  /**
   * Number of hash functions used
   */
  hashCount: number;

  /**
   * Size of the filter in bits
   */
  bitCount: number;

  /**
   * Number of items in the filter
   */
  itemCount: number;

  /**
   * Check if an item might exist in the filter.
   * Returns true if the item might exist (possible false positive),
   * returns false if the item definitely does not exist (no false negatives).
   *
   * @param blockId - The block ID to check
   * @returns true if the block might exist, false if it definitely does not
   */
  mightContain(blockId: string): boolean;
}

/**
 * Complete block manifest for synchronization.
 * Contains a full list of block IDs stored on a node.
 *
 * @see Requirements 3.7
 */
export interface BlockManifest {
  /**
   * Unique identifier of the node that generated this manifest
   */
  nodeId: string;

  /**
   * Array of all block IDs stored on the node
   */
  blockIds: string[];

  /**
   * Timestamp when the manifest was generated
   */
  generatedAt: Date;

  /**
   * Checksum of the manifest for integrity verification.
   * Changes if and only if the block set changes.
   */
  checksum: string;
}

/**
 * Pool-scoped Bloom filter container.
 * Contains per-pool Bloom filters using keys in "poolId:blockId" format,
 * plus a global filter for backward compatibility.
 *
 * @see Requirements 4.5
 */
export interface PoolScopedBloomFilter {
  /** Per-pool Bloom filters using keys in format "poolId:blockId" */
  filters: Map<PoolId, BloomFilter>;
  /** Global filter for backward compatibility */
  globalFilter: BloomFilter;
}

/**
 * Pool-scoped manifest for synchronization.
 * Groups block IDs by their pool, enabling per-pool reconciliation.
 *
 * @see Requirements 3.1, 3.5
 */
export interface PoolScopedManifest {
  /** Unique identifier of the node that generated this manifest */
  nodeId: string;
  /** Block IDs grouped by pool */
  pools: Map<PoolId, string[]>;
  /** Timestamp when the manifest was generated */
  generatedAt: Date;
  /** Checksum of the manifest for integrity verification */
  checksum: string;
}

/**
 * Block Registry Interface
 *
 * Maintains a fast local index of blocks stored on the node.
 * Provides O(1) lookups, Bloom filter export for efficient network queries,
 * and manifest export for full synchronization.
 *
 * @see Requirements 3.1, 3.6, 3.7
 */
export interface IBlockRegistry {
  /**
   * Check if a block exists locally (O(1) lookup)
   *
   * @param blockId - The block ID to check
   * @returns true if the block exists locally
   */
  hasLocal(blockId: string): boolean;

  /**
   * Add a block to the local registry
   *
   * @param blockId - The block ID to add
   * @param poolId - Optional pool the block belongs to
   */
  addLocal(blockId: string, poolId?: PoolId): void;

  /**
   * Remove a block from the local registry
   *
   * @param blockId - The block ID to remove
   * @param poolId - Optional pool the block belonged to
   */
  removeLocal(blockId: string, poolId?: PoolId): void;

  /**
   * Get count of local blocks
   *
   * @returns The number of blocks in the local registry
   */
  getLocalCount(): number;

  /**
   * Get all local block IDs (for full sync)
   *
   * @returns Array of all block IDs in the local registry
   */
  getLocalBlockIds(): string[];

  /**
   * Export a Bloom filter representation of the registry.
   * The Bloom filter allows efficient probabilistic queries
   * with no false negatives and a configurable false positive rate.
   *
   * @returns A Bloom filter representing all local block IDs
   * @see Requirements 3.6, 4.1
   */
  exportBloomFilter(): BloomFilter;

  /**
   * Export a complete manifest of all local blocks.
   * Used for full synchronization with peers.
   *
   * @returns A manifest containing all local block IDs
   * @see Requirements 3.7
   */
  exportManifest(): BlockManifest;

  /**
   * Rebuild the registry from disk storage.
   * Called on node startup to restore the index.
   *
   * @returns Promise that resolves when rebuild is complete
   * @see Requirements 3.5
   */
  rebuild(): Promise<void>;

  /**
   * Export a pool-scoped Bloom filter.
   * Each pool gets its own filter with keys in "poolId:blockId" format.
   * Also includes a global filter for backward compatibility.
   *
   * @returns A pool-scoped Bloom filter container
   * @see Requirements 4.5
   */
  exportPoolScopedBloomFilter(): PoolScopedBloomFilter;

  /**
   * Export a pool-scoped manifest grouping block IDs by pool.
   * Used for pool-aware reconciliation with peers.
   *
   * @returns A manifest with block IDs grouped by pool
   * @see Requirements 3.1, 3.5
   */
  exportPoolScopedManifest(): PoolScopedManifest;
}
