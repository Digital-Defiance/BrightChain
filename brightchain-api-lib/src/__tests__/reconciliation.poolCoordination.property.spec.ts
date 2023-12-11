/**
 * @fileoverview Property-based tests for pool-scoped reconciliation
 *
 * **Feature: cross-node-pool-coordination, Property 8: Reconciliation stores blocks in correct pool**
 *
 * For any two nodes with different block sets across multiple pools,
 * after reconciliation using pool-scoped manifests, each synchronized
 * block SHALL be stored in the same pool on the receiving node as it
 * was on the sending node.
 *
 * **Validates: Requirements 3.2, 3.3**
 */

import {
  BlockManifest,
  DEFAULT_RECONCILIATION_CONFIG,
  PendingSyncItem,
  PoolId,
  PoolScopedManifest,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import {
  IManifestProvider,
  ReconciliationService,
} from '../lib/availability/reconciliationService';

// Longer timeout for property tests
jest.setTimeout(60000);

// ── Generators ──

/** Valid pool ID strings matching /^[a-zA-Z0-9_-]{1,64}$/ */
const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

/** Valid hex-encoded block ID (32-64 hex chars) */
const arbBlockId = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 32, maxLength: 64 })
  .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * Generate a pool-to-blocks mapping with 1-4 pools, each with 1-5 unique block IDs.
 * Ensures all pools have distinct names and all block IDs within a pool are unique.
 */
const arbPoolBlockMap = fc
  .array(
    fc.tuple(
      arbPoolId,
      fc
        .array(arbBlockId, { minLength: 1, maxLength: 5 })
        .map((ids) => [...new Set(ids)]),
    ),
    { minLength: 1, maxLength: 4 },
  )
  .map((entries) => {
    // Deduplicate pool IDs, keeping first occurrence
    const seen = new Set<string>();
    const deduped: Array<[string, string[]]> = [];
    for (const [poolId, blockIds] of entries) {
      if (!seen.has(poolId) && blockIds.length > 0) {
        seen.add(poolId);
        deduped.push([poolId, blockIds]);
      }
    }
    return new Map<PoolId, string[]>(deduped);
  })
  .filter((m) => m.size >= 1);

/**
 * Generate a reconciliation scenario with local and peer manifests
 * that have overlapping pools but different block sets.
 *
 * The peer manifest will always have at least one block that the local
 * manifest does not, ensuring reconciliation has work to do.
 */
const arbReconciliationScenario = fc
  .tuple(arbPoolBlockMap, arbPoolBlockMap, arbBlockId)
  .map(([localPools, peerPools, extraBlockId]) => {
    // Ensure the peer has at least one block the local doesn't.
    // Pick the first pool from peerPools and add the extra block.
    const firstPeerPool = peerPools.keys().next().value;
    if (firstPeerPool !== undefined) {
      const existing = peerPools.get(firstPeerPool) ?? [];
      // Only add if not already present
      if (!existing.includes(extraBlockId)) {
        peerPools.set(firstPeerPool, [...existing, extraBlockId]);
      }
    }
    return { localPools, peerPools };
  });

// ── Mock IManifestProvider ──

interface StoreBlockCall {
  poolId: PoolId;
  blockId: string;
  peerId: string;
}

interface UpdateLocationCall {
  blockId: string;
  nodeId: string;
  timestamp: Date;
  poolId: PoolId;
}

/**
 * Creates a mock IManifestProvider that supports pool-scoped manifests.
 * Tracks all calls to storeBlockInPool and updateBlockLocationWithPool
 * for verification.
 */
function createMockManifestProvider(
  localNodeId: string,
  localPools: Map<PoolId, string[]>,
  peerPools: Map<PoolId, string[]>,
  peerId: string,
): {
  provider: IManifestProvider;
  storeBlockCalls: StoreBlockCall[];
  updateLocationCalls: UpdateLocationCall[];
} {
  const storeBlockCalls: StoreBlockCall[] = [];
  const updateLocationCalls: UpdateLocationCall[] = [];

  // Build flat block list for the local manifest
  const allLocalBlockIds: string[] = [];
  for (const blockIds of localPools.values()) {
    allLocalBlockIds.push(...blockIds);
  }

  const provider: IManifestProvider = {
    getLocalNodeId(): string {
      return localNodeId;
    },

    getLocalManifest(): BlockManifest {
      return {
        nodeId: localNodeId,
        blockIds: allLocalBlockIds,
        generatedAt: new Date(),
        checksum: 'local-checksum',
      };
    },

    async getPeerManifest(
      _peerId: string,
      _sinceTimestamp?: Date,
      _timeoutMs?: number,
    ): Promise<BlockManifest> {
      const allPeerBlockIds: string[] = [];
      for (const blockIds of peerPools.values()) {
        allPeerBlockIds.push(...blockIds);
      }
      return {
        nodeId: peerId,
        blockIds: allPeerBlockIds,
        generatedAt: new Date(),
        checksum: 'peer-checksum',
      };
    },

    async updateBlockLocation(
      _blockId: string,
      _nodeId: string,
      _timestamp: Date,
    ): Promise<void> {
      // no-op for flat updates
    },

    async getBlockAvailabilityState(
      _blockId: string,
    ): Promise<'local' | 'remote' | 'cached' | 'orphaned' | 'unknown'> {
      return 'unknown';
    },

    async updateBlockAvailabilityState(
      _blockId: string,
      _state: 'local' | 'remote' | 'cached' | 'orphaned' | 'unknown',
    ): Promise<void> {
      // no-op
    },

    async getOrphanedBlockIds(): Promise<string[]> {
      return [];
    },

    async sendSyncItem(_peerId: string, _item: PendingSyncItem): Promise<void> {
      // no-op
    },

    getConnectedPeerIds(): string[] {
      return [peerId];
    },

    async getBlockTimestamp(
      _blockId: string,
      _nodeId: string,
    ): Promise<Date | null> {
      return null;
    },

    // Pool-scoped methods
    getLocalPoolScopedManifest(): PoolScopedManifest {
      return {
        nodeId: localNodeId,
        pools: new Map(localPools),
        generatedAt: new Date(),
        checksum: 'local-pool-checksum',
      };
    },

    async getPeerPoolScopedManifest(
      _peerId: string,
      _sinceTimestamp?: Date,
      _timeoutMs?: number,
    ): Promise<PoolScopedManifest | undefined> {
      return {
        nodeId: peerId,
        pools: new Map(peerPools),
        generatedAt: new Date(),
        checksum: 'peer-pool-checksum',
      };
    },

    hasTombstone(_poolId: PoolId): boolean {
      return false;
    },

    async storeBlockInPool(
      poolId: PoolId,
      blockId: string,
      fromPeerId: string,
    ): Promise<void> {
      storeBlockCalls.push({ poolId, blockId, peerId: fromPeerId });
    },

    async updateBlockLocationWithPool(
      blockId: string,
      nodeId: string,
      timestamp: Date,
      poolId: PoolId,
    ): Promise<void> {
      updateLocationCalls.push({ blockId, nodeId, timestamp, poolId });
    },
  };

  return { provider, storeBlockCalls, updateLocationCalls };
}

// ── Tests ──

describe('Feature: cross-node-pool-coordination, Property 8: Reconciliation stores blocks in correct pool', () => {
  const localNodeId = 'local-node-001';
  const peerId = 'peer-node-002';
  const basePath = '/tmp/reconciliation-property-test';

  it('should store each synchronized block in the same pool as on the sending node', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbReconciliationScenario,
        async ({ localPools, peerPools }) => {
          const { provider, storeBlockCalls } = createMockManifestProvider(
            localNodeId,
            localPools,
            peerPools,
            peerId,
          );

          const service = new ReconciliationService(
            provider,
            basePath,
            DEFAULT_RECONCILIATION_CONFIG,
          );

          await service.reconcile([peerId]);

          // Build the set of blocks the local node already has per pool
          const localBlocksByPool = new Map<PoolId, Set<string>>();
          for (const [poolId, blockIds] of localPools) {
            localBlocksByPool.set(poolId, new Set(blockIds));
          }

          // Compute expected missing blocks per pool:
          // For each pool in the peer manifest, blocks the local doesn't have in that pool
          const expectedMissing = new Map<string, Set<string>>();
          for (const [poolId, peerBlockIds] of peerPools) {
            const localSet = localBlocksByPool.get(poolId) ?? new Set<string>();
            const missing = peerBlockIds.filter((id) => !localSet.has(id));
            if (missing.length > 0) {
              expectedMissing.set(poolId, new Set(missing));
            }
          }

          // Verify: every storeBlockInPool call used the correct poolId
          for (const call of storeBlockCalls) {
            const expectedSet = expectedMissing.get(call.poolId);
            expect(expectedSet).toBeDefined();
            expect(expectedSet?.has(call.blockId)).toBe(true);
          }

          // Verify: every expected missing block was stored
          const storedByPool = new Map<string, Set<string>>();
          for (const call of storeBlockCalls) {
            if (!storedByPool.has(call.poolId)) {
              storedByPool.set(call.poolId, new Set());
            }
            storedByPool.get(call.poolId)?.add(call.blockId);
          }

          for (const [poolId, missingSet] of expectedMissing) {
            const storedSet = storedByPool.get(poolId) ?? new Set<string>();
            for (const blockId of missingSet) {
              expect(storedSet.has(blockId)).toBe(true);
            }
          }

          // Verify: no block was stored in a wrong pool
          for (const call of storeBlockCalls) {
            // The block must exist in the peer's manifest under this pool
            const peerBlocksInPool = peerPools.get(call.poolId);
            expect(peerBlocksInPool).toBeDefined();
            expect(peerBlocksInPool).toContain(call.blockId);
          }

          // Verify: storeBlockInPool was called with the correct peerId
          for (const call of storeBlockCalls) {
            expect(call.peerId).toBe(peerId);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('should update block locations with pool context for all synchronized blocks', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbReconciliationScenario,
        async ({ localPools, peerPools }) => {
          const { provider, updateLocationCalls } = createMockManifestProvider(
            localNodeId,
            localPools,
            peerPools,
            peerId,
          );

          const service = new ReconciliationService(
            provider,
            basePath,
            DEFAULT_RECONCILIATION_CONFIG,
          );

          await service.reconcile([peerId]);

          // Every updateBlockLocationWithPool call should reference a valid pool
          // from the peer manifest and a block that exists in that pool
          for (const call of updateLocationCalls) {
            const peerBlocksInPool = peerPools.get(call.poolId);
            expect(peerBlocksInPool).toBeDefined();
            expect(peerBlocksInPool).toContain(call.blockId);
            expect(call.nodeId).toBe(peerId);
          }

          // All blocks from the peer manifest (both missing and shared) should
          // have location updates with pool context
          let expectedLocationUpdates = 0;
          for (const [, peerBlockIds] of peerPools) {
            expectedLocationUpdates += peerBlockIds.length;
          }
          expect(updateLocationCalls.length).toBe(expectedLocationUpdates);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ── Property 9: Reconciliation skips tombstoned pools ──

/**
 * Generate a tombstone reconciliation scenario.
 *
 * Produces a peer manifest with 2-5 pools (each with 1-5 blocks),
 * an empty local manifest (so every peer block is "missing"),
 * and a non-empty subset of the peer pools marked as tombstoned.
 */
const arbTombstoneScenario = fc
  .tuple(
    // Peer pools: 2-5 pools with 1-5 blocks each
    fc
      .array(
        fc.tuple(
          arbPoolId,
          fc
            .array(arbBlockId, { minLength: 1, maxLength: 5 })
            .map((ids) => [...new Set(ids)]),
        ),
        { minLength: 2, maxLength: 5 },
      )
      .map((entries) => {
        const seen = new Set<string>();
        const deduped: Array<[string, string[]]> = [];
        for (const [poolId, blockIds] of entries) {
          if (!seen.has(poolId) && blockIds.length > 0) {
            seen.add(poolId);
            deduped.push([poolId, blockIds]);
          }
        }
        return new Map<PoolId, string[]>(deduped);
      })
      .filter((m) => m.size >= 2),
    // Random seed to pick which pools are tombstoned
    fc.infiniteStream(fc.boolean()),
  )
  .map(([peerPools, tombstoneFlags]) => {
    const poolIds = Array.from(peerPools.keys());
    const tombstonedPools = new Set<PoolId>();
    const flagIter = tombstoneFlags[Symbol.iterator]();

    for (const poolId of poolIds) {
      const flag = flagIter.next();
      if (!flag.done && flag.value) {
        tombstonedPools.add(poolId);
      }
    }

    // Ensure at least one pool IS tombstoned and at least one is NOT,
    // so we can verify both behaviors.
    if (tombstonedPools.size === 0) {
      tombstonedPools.add(poolIds[0]);
    }
    if (tombstonedPools.size === poolIds.length) {
      tombstonedPools.delete(poolIds[poolIds.length - 1]);
    }

    return { peerPools, tombstonedPools };
  });

/**
 * Creates a mock IManifestProvider with tombstone support.
 *
 * - Local manifest is empty (no pools/blocks) so every peer block is "missing".
 * - `hasTombstone(poolId)` returns true for pools in `tombstonedPools`.
 * - Tracks `storeBlockInPool` and `updateBlockLocationWithPool` calls.
 */
function createTombstoneMockProvider(
  localNodeId: string,
  peerPools: Map<PoolId, string[]>,
  tombstonedPools: Set<PoolId>,
  peerId: string,
): {
  provider: IManifestProvider;
  storeBlockCalls: StoreBlockCall[];
  updateLocationCalls: UpdateLocationCall[];
} {
  const storeBlockCalls: StoreBlockCall[] = [];
  const updateLocationCalls: UpdateLocationCall[] = [];

  const provider: IManifestProvider = {
    getLocalNodeId(): string {
      return localNodeId;
    },

    getLocalManifest(): BlockManifest {
      return {
        nodeId: localNodeId,
        blockIds: [],
        generatedAt: new Date(),
        checksum: 'empty-local-checksum',
      };
    },

    async getPeerManifest(
      _peerId: string,
      _sinceTimestamp?: Date,
      _timeoutMs?: number,
    ): Promise<BlockManifest> {
      const allPeerBlockIds: string[] = [];
      for (const blockIds of peerPools.values()) {
        allPeerBlockIds.push(...blockIds);
      }
      return {
        nodeId: peerId,
        blockIds: allPeerBlockIds,
        generatedAt: new Date(),
        checksum: 'peer-checksum',
      };
    },

    async updateBlockLocation(
      _blockId: string,
      _nodeId: string,
      _timestamp: Date,
    ): Promise<void> {
      // no-op
    },

    async getBlockAvailabilityState(
      _blockId: string,
    ): Promise<'local' | 'remote' | 'cached' | 'orphaned' | 'unknown'> {
      return 'unknown';
    },

    async updateBlockAvailabilityState(
      _blockId: string,
      _state: 'local' | 'remote' | 'cached' | 'orphaned' | 'unknown',
    ): Promise<void> {
      // no-op
    },

    async getOrphanedBlockIds(): Promise<string[]> {
      return [];
    },

    async sendSyncItem(_peerId: string, _item: PendingSyncItem): Promise<void> {
      // no-op
    },

    getConnectedPeerIds(): string[] {
      return [peerId];
    },

    async getBlockTimestamp(
      _blockId: string,
      _nodeId: string,
    ): Promise<Date | null> {
      return null;
    },

    // Pool-scoped methods
    getLocalPoolScopedManifest(): PoolScopedManifest {
      return {
        nodeId: localNodeId,
        pools: new Map<PoolId, string[]>(),
        generatedAt: new Date(),
        checksum: 'empty-local-pool-checksum',
      };
    },

    async getPeerPoolScopedManifest(
      _peerId: string,
      _sinceTimestamp?: Date,
      _timeoutMs?: number,
    ): Promise<PoolScopedManifest | undefined> {
      return {
        nodeId: peerId,
        pools: new Map(peerPools),
        generatedAt: new Date(),
        checksum: 'peer-pool-checksum',
      };
    },

    hasTombstone(poolId: PoolId): boolean {
      return tombstonedPools.has(poolId);
    },

    async storeBlockInPool(
      poolId: PoolId,
      blockId: string,
      fromPeerId: string,
    ): Promise<void> {
      storeBlockCalls.push({ poolId, blockId, peerId: fromPeerId });
    },

    async updateBlockLocationWithPool(
      blockId: string,
      nodeId: string,
      timestamp: Date,
      poolId: PoolId,
    ): Promise<void> {
      updateLocationCalls.push({ blockId, nodeId, timestamp, poolId });
    },
  };

  return { provider, storeBlockCalls, updateLocationCalls };
}

// ── Tests ──

describe('Feature: cross-node-pool-coordination, Property 9: Reconciliation skips tombstoned pools', () => {
  const localNodeId = 'local-node-001';
  const peerId = 'peer-node-002';
  const basePath = '/tmp/reconciliation-tombstone-property-test';

  it('should skip all blocks in tombstoned pools and include them in skippedPools', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbTombstoneScenario,
        async ({ peerPools, tombstonedPools }) => {
          const { provider, storeBlockCalls } = createTombstoneMockProvider(
            localNodeId,
            peerPools,
            tombstonedPools,
            peerId,
          );

          const service = new ReconciliationService(
            provider,
            basePath,
            DEFAULT_RECONCILIATION_CONFIG,
          );

          const result = await service.reconcile([peerId]);

          // 1. storeBlockInPool must NOT be called for any tombstoned pool
          for (const call of storeBlockCalls) {
            expect(tombstonedPools.has(call.poolId)).toBe(false);
          }

          // 2. skippedPools must contain exactly the tombstoned pools
          //    that appeared in the peer manifest
          const tombstonedInPeerManifest = new Set<PoolId>();
          for (const poolId of peerPools.keys()) {
            if (tombstonedPools.has(poolId)) {
              tombstonedInPeerManifest.add(poolId);
            }
          }

          const skippedSet = new Set(result.skippedPools ?? []);
          expect(skippedSet.size).toBe(tombstonedInPeerManifest.size);
          for (const poolId of tombstonedInPeerManifest) {
            expect(skippedSet.has(poolId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * Verify that non-tombstoned pools are still reconciled normally:
   * every missing block in a non-tombstoned pool should be stored.
   */
  it('should still reconcile non-tombstoned pools normally', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbTombstoneScenario,
        async ({ peerPools, tombstonedPools }) => {
          const { provider, storeBlockCalls } = createTombstoneMockProvider(
            localNodeId,
            peerPools,
            tombstonedPools,
            peerId,
          );

          const service = new ReconciliationService(
            provider,
            basePath,
            DEFAULT_RECONCILIATION_CONFIG,
          );

          await service.reconcile([peerId]);

          // Build expected: all blocks from non-tombstoned pools
          // (local is empty, so every peer block is missing)
          const expectedStored = new Map<PoolId, Set<string>>();
          for (const [poolId, blockIds] of peerPools) {
            if (!tombstonedPools.has(poolId)) {
              expectedStored.set(poolId, new Set(blockIds));
            }
          }

          // Group actual store calls by pool
          const actualStored = new Map<PoolId, Set<string>>();
          for (const call of storeBlockCalls) {
            if (!actualStored.has(call.poolId)) {
              actualStored.set(call.poolId, new Set());
            }
            actualStored.get(call.poolId)?.add(call.blockId);
          }

          // Every expected block should have been stored
          for (const [poolId, expectedBlocks] of expectedStored) {
            const storedBlocks = actualStored.get(poolId) ?? new Set<string>();
            for (const blockId of expectedBlocks) {
              expect(storedBlocks.has(blockId)).toBe(true);
            }
          }

          // No extra pools should have been stored into
          for (const call of storeBlockCalls) {
            expect(expectedStored.has(call.poolId)).toBe(true);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 3.4**
   *
   * Verify that updateBlockLocationWithPool is NOT called for
   * tombstoned pools — no location tracking for skipped pools.
   */
  it('should not update location records for tombstoned pools', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbTombstoneScenario,
        async ({ peerPools, tombstonedPools }) => {
          const { provider, updateLocationCalls } = createTombstoneMockProvider(
            localNodeId,
            peerPools,
            tombstonedPools,
            peerId,
          );

          const service = new ReconciliationService(
            provider,
            basePath,
            DEFAULT_RECONCILIATION_CONFIG,
          );

          await service.reconcile([peerId]);

          // No location updates for tombstoned pools
          for (const call of updateLocationCalls) {
            expect(tombstonedPools.has(call.poolId)).toBe(false);
          }

          // Location updates should exist for all blocks in
          // non-tombstoned pools (missing + shared, but local is empty
          // so all peer blocks are missing → all get location updates)
          let expectedLocationUpdates = 0;
          for (const [poolId, blockIds] of peerPools) {
            if (!tombstonedPools.has(poolId)) {
              expectedLocationUpdates += blockIds.length;
            }
          }
          expect(updateLocationCalls.length).toBe(expectedLocationUpdates);
        },
      ),
      { numRuns: 100 },
    );
  });
});
