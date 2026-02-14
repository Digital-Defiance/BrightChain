import fc from 'fast-check';
import { PoolId } from '../storage/pooledBlockStore';
import {
  BlockManifest,
  BloomFilter,
  IBlockRegistry,
  PoolScopedBloomFilter,
  PoolScopedManifest,
} from './blockRegistry';

/**
 * Property tests for IBlockRegistry pool-scoped manifest and Bloom filter export
 *
 * Property 7: Pool-scoped manifest groups blocks by pool
 * **Validates: Requirements 3.1, 3.5**
 *
 * Property 10: Pool-scoped Bloom filter eliminates cross-pool false positives
 * **Validates: Requirements 4.2, 4.5, 4.6**
 */

/**
 * Minimal in-memory IBlockRegistry implementation for testing pool-scoped exports.
 * Tracks block-to-pool associations and generates pool-scoped manifests and Bloom filters.
 */
class InMemoryBlockRegistry implements IBlockRegistry {
  private readonly blocks: Map<string, PoolId | undefined> = new Map();
  private readonly nodeId: string;

  constructor(nodeId = 'test-node') {
    this.nodeId = nodeId;
  }

  addLocal(blockId: string, poolId?: PoolId): void {
    this.blocks.set(blockId, poolId);
  }

  removeLocal(blockId: string, _poolId?: PoolId): void {
    this.blocks.delete(blockId);
  }

  hasLocal(blockId: string): boolean {
    return this.blocks.has(blockId);
  }

  getLocalCount(): number {
    return this.blocks.size;
  }

  getLocalBlockIds(): string[] {
    return Array.from(this.blocks.keys());
  }

  exportBloomFilter(): BloomFilter {
    return {
      data: '',
      hashCount: 3,
      bitCount: 1024,
      itemCount: this.blocks.size,
      mightContain: (blockId: string) => this.blocks.has(blockId),
    };
  }

  exportManifest(): BlockManifest {
    return {
      nodeId: this.nodeId,
      blockIds: this.getLocalBlockIds(),
      generatedAt: new Date(),
      checksum: 'test-checksum',
    };
  }

  async rebuild(): Promise<void> {
    // no-op for in-memory test implementation
  }

  exportPoolScopedBloomFilter(): PoolScopedBloomFilter {
    const filters = new Map<PoolId, BloomFilter>();
    const poolBlocks = this.groupBlocksByPool();

    for (const [poolId, blockIds] of poolBlocks.entries()) {
      const blockSet = new Set(blockIds);
      filters.set(poolId, {
        data: '',
        hashCount: 3,
        bitCount: 1024,
        itemCount: blockIds.length,
        mightContain: (key: string) => {
          const prefix = `${poolId}:`;
          if (key.startsWith(prefix)) {
            return blockSet.has(key.slice(prefix.length));
          }
          return false;
        },
      });
    }

    return {
      filters,
      globalFilter: this.exportBloomFilter(),
    };
  }

  exportPoolScopedManifest(): PoolScopedManifest {
    const pools = this.groupBlocksByPool();
    return {
      nodeId: this.nodeId,
      pools,
      generatedAt: new Date(),
      checksum: 'test-checksum',
    };
  }

  /** Groups blocks by their pool ID. Blocks without a pool use '__default__'. */
  private groupBlocksByPool(): Map<PoolId, string[]> {
    const pools = new Map<PoolId, string[]>();
    for (const [blockId, poolId] of this.blocks.entries()) {
      const key = poolId ?? '__default__';
      const list = pools.get(key);
      if (list) {
        list.push(blockId);
      } else {
        pools.set(key, [blockId]);
      }
    }
    return pools;
  }
}

// ============================================================================
// Shared Generators
// ============================================================================

/** Generates a valid pool ID matching /^[a-zA-Z0-9_-]{1,64}$/ */
const validPoolIdArb = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

/** Generates a valid hex block ID (simulating checksums) */
const blockIdArb = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 8, maxLength: 64 })
  .map((digits) => digits.map((d) => d.toString(16)).join(''));

// ============================================================================
// Property 7: Pool-scoped manifest groups blocks by pool
// ============================================================================

describe('Feature: cross-node-pool-coordination, Property 7: Pool-scoped manifest groups blocks by pool', () => {
  /**
   * Generates a mapping of block IDs to pool IDs.
   * Each block belongs to exactly one pool. Block IDs are unique.
   */
  const blockPoolAssignmentsArb: fc.Arbitrary<Map<string, PoolId>> = fc
    .array(fc.tuple(blockIdArb, validPoolIdArb), {
      minLength: 1,
      maxLength: 50,
    })
    .map((pairs: [string, string][]) => {
      // Deduplicate by blockId — each block belongs to exactly one pool
      const seen = new Map<string, PoolId>();
      for (const [blockId, poolId] of pairs) {
        if (!seen.has(blockId)) {
          seen.set(blockId, poolId);
        }
      }
      return seen;
    })
    .filter((m) => m.size > 0);

  /**
   * Generates assignments across exactly N distinct pools (N >= 2)
   * to ensure multi-pool scenarios are well-covered.
   */
  const multiPoolAssignmentsArb: fc.Arbitrary<Map<string, PoolId>> = fc
    .tuple(
      fc.array(validPoolIdArb, { minLength: 2, maxLength: 5 }),
      fc.array(blockIdArb, { minLength: 2, maxLength: 30 }),
    )
    .map(([poolIds, blockIds]: [string[], string[]]) => {
      const uniquePools = [...new Set(poolIds)];
      if (uniquePools.length < 2) return null;
      const uniqueBlocks = [...new Set(blockIds)];
      if (uniqueBlocks.length < 2) return null;

      const assignments = new Map<string, PoolId>();
      for (let i = 0; i < uniqueBlocks.length; i++) {
        assignments.set(uniqueBlocks[i], uniquePools[i % uniquePools.length]);
      }
      return assignments;
    })
    .filter((m): m is Map<string, PoolId> => m !== null && m.size >= 2);

  /** Populates a registry from a block→pool map and returns it */
  function buildRegistry(
    assignments: Map<string, PoolId>,
  ): InMemoryBlockRegistry {
    const registry = new InMemoryBlockRegistry();
    for (const [blockId, poolId] of assignments.entries()) {
      registry.addLocal(blockId, poolId);
    }
    return registry;
  }

  /**
   * Property 7a: The union of all block IDs across all pools in the manifest
   * equals the set of all block IDs in the registry.
   *
   * **Validates: Requirements 3.1, 3.5**
   */
  it('Property 7a: union of manifest block IDs equals registry block IDs', () => {
    fc.assert(
      fc.property(blockPoolAssignmentsArb, (assignments) => {
        const registry = buildRegistry(assignments);
        const manifest = registry.exportPoolScopedManifest();

        const manifestBlockIds = new Set<string>();
        for (const blockIds of manifest.pools.values()) {
          for (const id of blockIds) {
            manifestBlockIds.add(id);
          }
        }

        const registryBlockIds = new Set(registry.getLocalBlockIds());
        expect(manifestBlockIds).toEqual(registryBlockIds);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7b: Each block ID appears only under its correct pool
   * in the manifest.
   *
   * **Validates: Requirements 3.1, 3.5**
   */
  it('Property 7b: each block ID appears only under its correct pool', () => {
    fc.assert(
      fc.property(blockPoolAssignmentsArb, (assignments) => {
        const registry = buildRegistry(assignments);
        const manifest = registry.exportPoolScopedManifest();

        for (const [poolId, blockIds] of manifest.pools.entries()) {
          for (const blockId of blockIds) {
            expect(assignments.get(blockId)).toBe(poolId);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7c: No block ID appears in more than one pool in the manifest.
   *
   * **Validates: Requirements 3.1, 3.5**
   */
  it('Property 7c: no block ID appears in more than one pool', () => {
    fc.assert(
      fc.property(blockPoolAssignmentsArb, (assignments) => {
        const registry = buildRegistry(assignments);
        const manifest = registry.exportPoolScopedManifest();

        const seen = new Map<string, PoolId>();
        for (const [poolId, blockIds] of manifest.pools.entries()) {
          for (const blockId of blockIds) {
            const previousPool = seen.get(blockId);
            if (previousPool !== undefined) {
              expect(previousPool).toBe(poolId);
            }
            seen.set(blockId, poolId);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7d: Multi-pool scenarios produce the correct number of pool
   * entries in the manifest.
   *
   * **Validates: Requirements 3.1, 3.5**
   */
  it('Property 7d: manifest has correct number of pool entries for multi-pool registries', () => {
    fc.assert(
      fc.property(multiPoolAssignmentsArb, (assignments) => {
        const registry = buildRegistry(assignments);
        const manifest = registry.exportPoolScopedManifest();

        const expectedPools = new Set(assignments.values());
        expect(manifest.pools.size).toBe(expectedPools.size);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7e: The total count of block IDs across all manifest pools
   * equals the registry's local count.
   *
   * **Validates: Requirements 3.1, 3.5**
   */
  it('Property 7e: total block count in manifest equals registry local count', () => {
    fc.assert(
      fc.property(blockPoolAssignmentsArb, (assignments) => {
        const registry = buildRegistry(assignments);
        const manifest = registry.exportPoolScopedManifest();

        let totalManifestBlocks = 0;
        for (const blockIds of manifest.pools.values()) {
          totalManifestBlocks += blockIds.length;
        }

        expect(totalManifestBlocks).toBe(registry.getLocalCount());
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7f: An empty registry produces a manifest with no pool entries.
   *
   * **Validates: Requirements 3.1, 3.5**
   */
  it('Property 7f: empty registry produces manifest with no pool entries', () => {
    const registry = new InMemoryBlockRegistry();
    const manifest = registry.exportPoolScopedManifest();

    expect(manifest.pools.size).toBe(0);
    expect(manifest.nodeId).toBe('test-node');
  });
});

// ============================================================================
// Property 10: Pool-scoped Bloom filter eliminates cross-pool false positives
// ============================================================================

describe('Feature: cross-node-pool-coordination, Property 10: Pool-scoped Bloom filter eliminates cross-pool false positives', () => {
  /**
   * Generates assignments across exactly N distinct pools (N >= 2)
   * with unique block IDs per pool, ensuring cross-pool scenarios.
   * Returns a Map<PoolId, string[]> where each pool has its own set of block IDs.
   */
  const multiPoolBlocksArb: fc.Arbitrary<Map<PoolId, string[]>> = fc
    .tuple(
      fc.array(validPoolIdArb, { minLength: 2, maxLength: 5 }),
      fc.array(blockIdArb, { minLength: 4, maxLength: 30 }),
    )
    .map(([poolIds, blockIds]) => {
      const uniquePools = [...new Set(poolIds)];
      if (uniquePools.length < 2) return null;
      const uniqueBlocks = [...new Set(blockIds)];
      if (uniqueBlocks.length < 2) return null;

      // Distribute blocks across pools — each block goes to exactly one pool
      const poolBlockMap = new Map<PoolId, string[]>();
      for (const pid of uniquePools) {
        poolBlockMap.set(pid, []);
      }
      for (let i = 0; i < uniqueBlocks.length; i++) {
        const pool = uniquePools[i % uniquePools.length];
        const list = poolBlockMap.get(pool);
        if (list) {
          list.push(uniqueBlocks[i]);
        }
      }
      // Remove empty pools
      for (const [pid, blocks] of poolBlockMap.entries()) {
        if (blocks.length === 0) {
          poolBlockMap.delete(pid);
        }
      }
      if (poolBlockMap.size < 2) return null;
      return poolBlockMap;
    })
    .filter((m): m is Map<PoolId, string[]> => m !== null);

  /** Populates a registry from a pool→blockIds map and returns it */
  function buildRegistryFromPoolMap(
    poolBlocks: Map<PoolId, string[]>,
  ): InMemoryBlockRegistry {
    const registry = new InMemoryBlockRegistry();
    for (const [poolId, blockIds] of poolBlocks.entries()) {
      for (const blockId of blockIds) {
        registry.addLocal(blockId, poolId);
      }
    }
    return registry;
  }

  /**
   * Property 10a: For any block B stored in pool P, the pool-scoped Bloom filter
   * for pool P returns mightContain("P:B") === true.
   *
   * **Validates: Requirements 4.2, 4.5, 4.6**
   */
  it('Property 10a: pool filter returns true for blocks stored in that pool', () => {
    fc.assert(
      fc.property(multiPoolBlocksArb, (poolBlocks) => {
        const registry = buildRegistryFromPoolMap(poolBlocks);
        const scopedFilter = registry.exportPoolScopedBloomFilter();

        for (const [poolId, blockIds] of poolBlocks.entries()) {
          const poolFilter = scopedFilter.filters.get(poolId);
          expect(poolFilter).toBeDefined();

          for (const blockId of blockIds) {
            const key = `${poolId}:${blockId}`;
            expect(poolFilter!.mightContain(key)).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10b: For any block B stored in pool P and a different pool Q
   * where B is NOT stored, the pool Q filter returns mightContain("Q:B") === false.
   * Cross-pool entries do not cause false positives.
   *
   * **Validates: Requirements 4.2, 4.5, 4.6**
   */
  it('Property 10b: pool filter returns false for blocks not stored in that pool', () => {
    fc.assert(
      fc.property(multiPoolBlocksArb, (poolBlocks) => {
        const registry = buildRegistryFromPoolMap(poolBlocks);
        const scopedFilter = registry.exportPoolScopedBloomFilter();

        // Build a set of blockIds per pool for quick lookup
        const poolBlockSets = new Map<PoolId, Set<string>>();
        for (const [poolId, blockIds] of poolBlocks.entries()) {
          poolBlockSets.set(poolId, new Set(blockIds));
        }

        // For each block in pool P, check all other pools Q
        for (const [poolP, blockIds] of poolBlocks.entries()) {
          for (const blockId of blockIds) {
            for (const [poolQ] of poolBlocks.entries()) {
              if (poolQ === poolP) continue;

              const qBlockSet = poolBlockSets.get(poolQ);
              // Only test if block B is NOT in pool Q
              if (qBlockSet && !qBlockSet.has(blockId)) {
                const qFilter = scopedFilter.filters.get(poolQ);
                expect(qFilter).toBeDefined();

                const crossKey = `${poolQ}:${blockId}`;
                expect(qFilter!.mightContain(crossKey)).toBe(false);
              }
            }
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10c: The global filter contains all blocks regardless of pool.
   * For any block B stored in any pool, globalFilter.mightContain(B) === true.
   *
   * **Validates: Requirements 4.2, 4.5, 4.6**
   */
  it('Property 10c: global filter contains all blocks regardless of pool', () => {
    fc.assert(
      fc.property(multiPoolBlocksArb, (poolBlocks) => {
        const registry = buildRegistryFromPoolMap(poolBlocks);
        const scopedFilter = registry.exportPoolScopedBloomFilter();

        for (const blockIds of poolBlocks.values()) {
          for (const blockId of blockIds) {
            expect(scopedFilter.globalFilter.mightContain(blockId)).toBe(true);
          }
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10d: Each pool in the registry has a corresponding filter entry.
   * The number of per-pool filters matches the number of distinct pools.
   *
   * **Validates: Requirements 4.2, 4.5, 4.6**
   */
  it('Property 10d: each pool has a corresponding filter entry', () => {
    fc.assert(
      fc.property(multiPoolBlocksArb, (poolBlocks) => {
        const registry = buildRegistryFromPoolMap(poolBlocks);
        const scopedFilter = registry.exportPoolScopedBloomFilter();

        const expectedPools = new Set(poolBlocks.keys());
        const actualPools = new Set(scopedFilter.filters.keys());

        expect(actualPools).toEqual(expectedPools);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 10e: A pool filter does not respond to keys without the pool prefix.
   * Querying a pool filter with a bare blockId (no "poolId:" prefix) returns false.
   *
   * **Validates: Requirements 4.2, 4.5, 4.6**
   */
  it('Property 10e: pool filter rejects bare block IDs without pool prefix', () => {
    fc.assert(
      fc.property(multiPoolBlocksArb, (poolBlocks) => {
        const registry = buildRegistryFromPoolMap(poolBlocks);
        const scopedFilter = registry.exportPoolScopedBloomFilter();

        for (const [poolId, blockIds] of poolBlocks.entries()) {
          const poolFilter = scopedFilter.filters.get(poolId);
          expect(poolFilter).toBeDefined();

          for (const blockId of blockIds) {
            // Bare blockId without prefix should not match
            expect(poolFilter!.mightContain(blockId)).toBe(false);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
