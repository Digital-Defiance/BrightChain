/**
 * @fileoverview Block Registry Implementation
 *
 * Provides a fast local index of blocks stored on the node.
 * Supports O(1) lookups, Bloom filter export, and manifest generation.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.7
 */

import {
  BlockManifest,
  BloomFilter,
  IBlockRegistry,
  PoolId,
  PoolScopedBloomFilter,
  PoolScopedManifest,
} from '@brightchain/brightchain-lib';
import { BloomFilter as BloomFilterImpl } from 'bloom-filters';
import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { readdir, stat } from 'fs/promises';
import { join } from 'path';

/**
 * Default configuration for the Bloom filter.
 */
export interface BloomFilterConfig {
  /**
   * Target false positive rate (default: 0.01 = 1%)
   */
  falsePositiveRate: number;

  /**
   * Expected number of items (used for initial sizing)
   */
  expectedItems: number;
}

/**
 * Default Bloom filter configuration.
 */
export const DEFAULT_BLOOM_FILTER_CONFIG: BloomFilterConfig = {
  falsePositiveRate: 0.01,
  expectedItems: 10000,
};

/**
 * Wrapper class that implements the BloomFilter interface.
 * Wraps the bloom-filters library implementation.
 */
class BloomFilterWrapper implements BloomFilter {
  private readonly filter: BloomFilterImpl;
  public readonly data: string;
  public readonly hashCount: number;
  public readonly bitCount: number;
  public readonly itemCount: number;

  constructor(filter: BloomFilterImpl, itemCount: number) {
    this.filter = filter;
    this.hashCount = filter['_nbHashes'] as number;
    this.bitCount = filter.size;
    this.itemCount = itemCount;
    // Serialize the filter data to base64
    this.data = this.serializeFilter();
  }

  /**
   * Serialize the Bloom filter to a base64 string.
   */
  private serializeFilter(): string {
    // Export the filter to JSON and encode as base64
    const exported = this.filter.saveAsJSON();
    return Buffer.from(JSON.stringify(exported)).toString('base64');
  }

  /**
   * Check if an item might exist in the filter.
   */
  mightContain(blockId: string): boolean {
    return this.filter.has(blockId);
  }

  /**
   * Create a BloomFilterWrapper from serialized data.
   */
  static fromSerialized(data: string): BloomFilterWrapper {
    const json = JSON.parse(Buffer.from(data, 'base64').toString('utf-8'));
    const filter = BloomFilterImpl.fromJSON(json);
    return new BloomFilterWrapper(filter, json._itemCount || 0);
  }
}

/**
 * Block Registry Implementation
 *
 * Maintains a fast in-memory Set-based index of all locally stored block IDs.
 * Provides O(1) lookups, Bloom filter export for efficient network queries,
 * and manifest export for full synchronization.
 *
 * @see Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.7
 */
export class BlockRegistry implements IBlockRegistry {
  /**
   * In-memory Set of local block IDs for O(1) lookups.
   */
  private readonly localBlocks: Set<string> = new Set();

  /**
   * Mapping of blockId → poolId for pool-scoped tracking.
   * Blocks without a pool association are not present in this map.
   */
  private readonly blockPoolMap: Map<string, PoolId> = new Map();

  /**
   * Cached Bloom filter (regenerated when blocks change).
   */
  private cachedBloomFilter: BloomFilterWrapper | null = null;

  /**
   * Cached pool-scoped Bloom filters (regenerated when blocks change).
   */
  private cachedPoolScopedBloomFilter: PoolScopedBloomFilter | null = null;

  /**
   * Flag indicating if the Bloom filter needs regeneration.
   */
  private bloomFilterDirty = true;

  /**
   * Flag indicating if the pool-scoped Bloom filter needs regeneration.
   */
  private poolScopedBloomDirty = true;

  /**
   * Node ID for manifest generation.
   */
  private readonly nodeId: string;

  /**
   * Store path for rebuilding from disk.
   */
  private readonly storePath: string;

  /**
   * Block size string for directory structure.
   */
  private readonly blockSizeString: string;

  /**
   * Bloom filter configuration.
   */
  private readonly bloomConfig: BloomFilterConfig;

  /**
   * Create a new BlockRegistry.
   *
   * @param nodeId - The unique identifier of the local node
   * @param storePath - The base path for block storage
   * @param blockSizeString - The block size string (e.g., 'small', 'medium')
   * @param bloomConfig - Optional Bloom filter configuration
   */
  constructor(
    nodeId: string,
    storePath: string,
    blockSizeString: string,
    bloomConfig: BloomFilterConfig = DEFAULT_BLOOM_FILTER_CONFIG,
  ) {
    this.nodeId = nodeId;
    this.storePath = storePath;
    this.blockSizeString = blockSizeString;
    this.bloomConfig = bloomConfig;
  }

  /**
   * Check if a block exists locally (O(1) lookup).
   *
   * @param blockId - The block ID to check
   * @returns true if the block exists locally
   */
  hasLocal(blockId: string): boolean {
    return this.localBlocks.has(blockId);
  }

  /**
   * Add a block to the local registry.
   *
   * @param blockId - The block ID to add
   * @param poolId - Optional pool the block belongs to
   */
  addLocal(blockId: string, poolId?: PoolId): void {
    if (!this.localBlocks.has(blockId)) {
      this.localBlocks.add(blockId);
      this.bloomFilterDirty = true;
      this.poolScopedBloomDirty = true;
    }
    // Always update pool association (allows re-association)
    if (poolId !== undefined) {
      this.blockPoolMap.set(blockId, poolId);
      this.poolScopedBloomDirty = true;
    }
  }

  /**
   * Remove a block from the local registry.
   *
   * When poolId is provided, only removes the block if it belongs to that pool.
   * When poolId is omitted, removes the block unconditionally.
   *
   * @param blockId - The block ID to remove
   * @param poolId - Optional pool the block belonged to
   */
  removeLocal(blockId: string, poolId?: PoolId): void {
    if (!this.localBlocks.has(blockId)) {
      return;
    }

    if (poolId !== undefined) {
      // Pool-scoped removal: only remove if the block belongs to this pool
      const currentPool = this.blockPoolMap.get(blockId);
      if (currentPool !== poolId) {
        return;
      }
    }

    this.localBlocks.delete(blockId);
    this.blockPoolMap.delete(blockId);
    this.bloomFilterDirty = true;
    this.poolScopedBloomDirty = true;
  }

  /**
   * Get count of local blocks.
   *
   * @returns The number of blocks in the local registry
   */
  getLocalCount(): number {
    return this.localBlocks.size;
  }

  /**
   * Get all local block IDs (for full sync).
   *
   * @returns Array of all block IDs in the local registry
   */
  getLocalBlockIds(): string[] {
    return Array.from(this.localBlocks);
  }

  /**
   * Export a Bloom filter representation of the registry.
   *
   * @returns A Bloom filter representing all local block IDs
   */
  exportBloomFilter(): BloomFilter {
    if (this.bloomFilterDirty || !this.cachedBloomFilter) {
      this.regenerateBloomFilter();
    }
    return this.cachedBloomFilter!;
  }

  /**
   * Regenerate the Bloom filter from the current block set.
   */
  private regenerateBloomFilter(): void {
    const itemCount = Math.max(
      this.localBlocks.size,
      this.bloomConfig.expectedItems,
    );
    const filter = BloomFilterImpl.create(
      itemCount,
      this.bloomConfig.falsePositiveRate,
    );

    for (const blockId of this.localBlocks) {
      filter.add(blockId);
    }

    this.cachedBloomFilter = new BloomFilterWrapper(
      filter,
      this.localBlocks.size,
    );
    this.bloomFilterDirty = false;
  }

  /**
   * Export a complete manifest of all local blocks.
   *
   * @returns A manifest containing all local block IDs
   */
  exportManifest(): BlockManifest {
    const blockIds = this.getLocalBlockIds().sort();
    const checksum = this.computeManifestChecksum(blockIds);

    return {
      nodeId: this.nodeId,
      blockIds,
      generatedAt: new Date(),
      checksum,
    };
  }

  /**
   * Compute a checksum for the manifest.
   * The checksum changes if and only if the block set changes.
   *
   * @param blockIds - Sorted array of block IDs
   * @returns SHA-256 checksum of the block IDs
   */
  private computeManifestChecksum(blockIds: string[]): string {
    const hash = createHash('sha256');
    // Include the count to detect additions/removals
    hash.update(blockIds.length.toString());
    // Hash all block IDs in sorted order
    for (const blockId of blockIds) {
      hash.update(blockId);
    }
    return hash.digest('hex');
  }

  /**
   * Rebuild the registry from disk storage.
   * Scans the block storage directory to find all stored blocks.
   *
   * @returns Promise that resolves when rebuild is complete
   */
  async rebuild(): Promise<void> {
    // Clear existing registry
    this.localBlocks.clear();
    this.blockPoolMap.clear();
    this.bloomFilterDirty = true;
    this.poolScopedBloomDirty = true;

    const basePath = join(this.storePath, this.blockSizeString);

    if (!existsSync(basePath)) {
      return;
    }

    try {
      // Scan first level directories (first character of checksum)
      const firstLevelDirs = await readdir(basePath);

      for (const firstDir of firstLevelDirs) {
        const firstLevelPath = join(basePath, firstDir);
        const firstStats = await stat(firstLevelPath);

        if (!firstStats.isDirectory()) {
          continue;
        }

        // Scan second level directories (second character of checksum)
        const secondLevelDirs = await readdir(firstLevelPath);

        for (const secondDir of secondLevelDirs) {
          const secondLevelPath = join(firstLevelPath, secondDir);
          const secondStats = await stat(secondLevelPath);

          if (!secondStats.isDirectory()) {
            continue;
          }

          // Scan block files (exclude metadata and parity files)
          const files = await readdir(secondLevelPath);
          for (const file of files) {
            // Skip metadata files (.m.json) and parity files (.p0, .p1, etc.)
            if (file.endsWith('.m.json') || file.includes('.p')) {
              continue;
            }

            // The filename is the block ID (hex string)
            this.localBlocks.add(file);
          }
        }
      }
    } catch {
      // If we can't read the directory structure, just return with empty registry
      // This handles cases where the store is empty or corrupted
    }
  }

  /**
   * Group blocks by their pool ID.
   * Blocks without a pool association are grouped under '__default__'.
   *
   * @returns Map of poolId to array of block IDs
   */
  private groupBlocksByPool(): Map<PoolId, string[]> {
    const pools = new Map<PoolId, string[]>();
    for (const blockId of this.localBlocks) {
      const poolId = this.blockPoolMap.get(blockId) ?? '__default__';
      const list = pools.get(poolId);
      if (list) {
        list.push(blockId);
      } else {
        pools.set(poolId, [blockId]);
      }
    }
    return pools;
  }

  /**
   * Export a pool-scoped Bloom filter.
   * Each pool gets its own filter with keys in "poolId:blockId" format.
   * Also includes a global filter for backward compatibility.
   *
   * @returns A pool-scoped Bloom filter container
   * @see Requirements 4.5
   */
  exportPoolScopedBloomFilter(): PoolScopedBloomFilter {
    if (!this.poolScopedBloomDirty && this.cachedPoolScopedBloomFilter) {
      return this.cachedPoolScopedBloomFilter;
    }

    const poolBlocks = this.groupBlocksByPool();
    const filters = new Map<PoolId, BloomFilter>();

    for (const [poolId, blockIds] of poolBlocks.entries()) {
      const itemCount = Math.max(
        blockIds.length,
        this.bloomConfig.expectedItems,
      );
      const filter = BloomFilterImpl.create(
        itemCount,
        this.bloomConfig.falsePositiveRate,
      );

      for (const blockId of blockIds) {
        filter.add(`${poolId}:${blockId}`);
      }

      filters.set(poolId, new BloomFilterWrapper(filter, blockIds.length));
    }

    const globalFilter = this.exportBloomFilter();

    this.cachedPoolScopedBloomFilter = { filters, globalFilter };
    this.poolScopedBloomDirty = false;

    return this.cachedPoolScopedBloomFilter;
  }

  /**
   * Export a pool-scoped manifest grouping block IDs by pool.
   * Used for pool-aware reconciliation with peers.
   *
   * @returns A manifest with block IDs grouped by pool
   * @see Requirements 3.1, 3.5
   */
  exportPoolScopedManifest(): PoolScopedManifest {
    const pools = this.groupBlocksByPool();

    // Sort block IDs within each pool for deterministic checksums
    for (const blockIds of pools.values()) {
      blockIds.sort();
    }

    // Compute checksum over all pool:blockId pairs in sorted order
    const allKeys: string[] = [];
    const sortedPoolIds = Array.from(pools.keys()).sort();
    for (const poolId of sortedPoolIds) {
      const blockIds = pools.get(poolId);
      if (blockIds) {
        for (const blockId of blockIds) {
          allKeys.push(`${poolId}:${blockId}`);
        }
      }
    }
    const checksum = this.computeManifestChecksum(allKeys);

    return {
      nodeId: this.nodeId,
      pools,
      generatedAt: new Date(),
      checksum,
    };
  }

  /**
   * Clear the registry (for testing purposes).
   */
  clear(): void {
    this.localBlocks.clear();
    this.blockPoolMap.clear();
    this.cachedBloomFilter = null;
    this.cachedPoolScopedBloomFilter = null;
    this.bloomFilterDirty = true;
    this.poolScopedBloomDirty = true;
  }
}
