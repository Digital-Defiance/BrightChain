/* eslint-disable @nx/enforce-module-boundaries */
/**
 * @fileoverview Property-based tests for ReconciliationService
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 18: Reconciliation Manifest Exchange
 * - Property 19: Reconciliation Orphan Resolution
 * - Property 20: Reconciliation Conflict Resolution
 *
 * **Validates: Requirements 9.2, 9.3, 9.5, 9.6**
 */

import {
  BlockManifest,
  PendingSyncItem,
  ReconciliationConfig,
  ReconciliationEvent,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  IManifestProvider,
  ReconciliationService,
} from './reconciliationService';

/**
 * Generate a valid hex string of specified length (block ID format)
 */
const arbHexString = (minLength: number, maxLength: number) =>
  fc
    .array(fc.integer({ min: 0, max: 15 }), {
      minLength,
      maxLength,
    })
    .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * Generate a valid block ID (hex string of at least 32 characters)
 */
const arbBlockId = arbHexString(32, 64);

/**
 * Generate a unique set of block IDs
 */
const arbBlockIdSet = fc
  .array(arbBlockId, { minLength: 0, maxLength: 50 })
  .map((ids) => [...new Set(ids)]);

/**
 * Generate a peer ID
 */
const arbPeerId = fc
  .string({ minLength: 8, maxLength: 16 })
  .map((s) => `peer-${s}`);

/**
 * Generate a set of peer IDs
 */
const arbPeerIdSet = fc
  .array(arbPeerId, { minLength: 1, maxLength: 5 })
  .map((ids) => [...new Set(ids)]);

/**
 * Location update record for testing
 */
interface LocationUpdate {
  blockId: string;
  nodeId: string;
  timestamp: Date;
}

/**
 * State update record for testing
 */
interface StateUpdate {
  blockId: string;
  state: string;
}

/**
 * Sent sync item record for testing
 */
interface SentSyncItem {
  peerId: string;
  item: PendingSyncItem;
}

/**
 * Extended mock provider with test accessors
 */
interface MockManifestProvider extends IManifestProvider {
  _getLocationUpdates: () => LocationUpdate[];
  _getStateUpdates: () => StateUpdate[];
  _getSentSyncItems: () => SentSyncItem[];
}

/**
 * Create a mock manifest provider for testing
 */
function createMockManifestProvider(options: {
  localNodeId: string;
  localBlockIds: string[];
  peerManifests: Map<string, { blockIds: string[]; checksum: string }>;
  orphanedBlockIds?: string[];
  blockTimestamps?: Map<string, Map<string, Date>>;
}): MockManifestProvider {
  const locationUpdates: LocationUpdate[] = [];
  const stateUpdates: StateUpdate[] = [];
  const sentSyncItems: SentSyncItem[] = [];

  return {
    getLocalNodeId: () => options.localNodeId,
    getLocalManifest: () => ({
      nodeId: options.localNodeId,
      blockIds: options.localBlockIds,
      generatedAt: new Date(),
      checksum: `checksum-${options.localBlockIds.length}`,
    }),
    getPeerManifest: async (peerId: string): Promise<BlockManifest> => {
      const peerData = options.peerManifests.get(peerId);
      if (!peerData) {
        throw new Error(`Unknown peer: ${peerId}`);
      }
      return {
        nodeId: peerId,
        blockIds: peerData.blockIds,
        generatedAt: new Date(),
        checksum: peerData.checksum,
      };
    },
    updateBlockLocation: async (
      blockId: string,
      nodeId: string,
      timestamp: Date,
    ) => {
      locationUpdates.push({ blockId, nodeId, timestamp });
    },
    getBlockAvailabilityState: async (blockId: string) => {
      if (options.orphanedBlockIds?.includes(blockId)) {
        return 'orphaned';
      }
      if (options.localBlockIds.includes(blockId)) {
        return 'local';
      }
      return 'unknown';
    },
    updateBlockAvailabilityState: async (blockId: string, state: string) => {
      stateUpdates.push({ blockId, state });
    },
    getOrphanedBlockIds: async () => options.orphanedBlockIds ?? [],
    sendSyncItem: async (peerId: string, item: PendingSyncItem) => {
      sentSyncItems.push({ peerId, item });
    },
    getConnectedPeerIds: () => Array.from(options.peerManifests.keys()),
    getBlockTimestamp: async (blockId: string, nodeId: string) => {
      return options.blockTimestamps?.get(blockId)?.get(nodeId) ?? null;
    },
    // Expose for assertions
    _getLocationUpdates: () => locationUpdates,
    _getStateUpdates: () => stateUpdates,
    _getSentSyncItems: () => sentSyncItems,
  };
}

describe('ReconciliationService Property Tests', () => {
  const localNodeId = 'local-node-001';

  const testConfig: ReconciliationConfig = {
    manifestExchangeTimeoutMs: 5000,
    maxConcurrentReconciliations: 3,
    syncVectorPath: 'sync-vectors.json',
    pendingSyncQueuePath: 'pending-sync-queue.json',
    maxPendingSyncQueueSize: 100,
  };

  describe('Property 18: Reconciliation Manifest Exchange', () => {
    /**
     * **Feature: block-availability-discovery, Property 18: Reconciliation Manifest Exchange**
     *
     * *For any* reconciliation process, the system SHALL exchange manifests with all
     * reconnected peers and update location metadata for newly discovered blocks.
     *
     * **Validates: Requirements 9.2, 9.3**
     */
    it('should exchange manifests and update location metadata for discovered blocks', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockIdSet,
          arbBlockIdSet,
          arbPeerIdSet,
          async (localBlockIds, peerBlockIds, peerIds) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-reconciliation-manifest-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              // Create peer manifests
              const peerManifests = new Map<
                string,
                { blockIds: string[]; checksum: string }
              >();
              for (const peerId of peerIds) {
                peerManifests.set(peerId, {
                  blockIds: peerBlockIds,
                  checksum: `checksum-${peerId}-${peerBlockIds.length}`,
                });
              }

              const mockProvider = createMockManifestProvider({
                localNodeId,
                localBlockIds,
                peerManifests,
              });

              const service = new ReconciliationService(
                mockProvider,
                iterTestDir,
                testConfig,
              );

              // Perform reconciliation
              const result = await service.reconcile(peerIds);

              // Verify reconciliation completed
              expect(result.peersReconciled).toBe(peerIds.length);

              // Verify location updates were made for discovered blocks
              const locationUpdates = mockProvider._getLocationUpdates();

              // All peer blocks should have location updates
              const localBlockSet = new Set(localBlockIds);
              const newBlocks = peerBlockIds.filter(
                (id) => !localBlockSet.has(id),
              );

              // Each new block should have at least one location update per peer
              for (const blockId of newBlocks) {
                const updatesForBlock = locationUpdates.filter(
                  (u) => u.blockId === blockId,
                );
                expect(updatesForBlock.length).toBeGreaterThanOrEqual(
                  peerIds.length,
                );
              }

              return true;
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 19: Reconciliation Orphan Resolution', () => {
    /**
     * **Feature: block-availability-discovery, Property 19: Reconciliation Orphan Resolution**
     *
     * *For any* block in Orphaned state, during reconciliation, if a source node is found
     * in the exchanged manifests, the block's state SHALL transition from Orphaned to Remote.
     *
     * **Validates: Requirements 9.5**
     */
    it('should resolve orphaned blocks when source is found on reconnected peer', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockIdSet,
          arbPeerIdSet,
          async (orphanedBlockIds, peerIds) => {
            if (orphanedBlockIds.length === 0 || peerIds.length === 0) {
              return true; // Skip trivial cases
            }

            const iterTestDir = join(
              '/tmp',
              'brightchain-reconciliation-orphan-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              // Create peer manifests that contain some orphaned blocks
              const peerManifests = new Map<
                string,
                { blockIds: string[]; checksum: string }
              >();

              // First peer has all orphaned blocks
              peerManifests.set(peerIds[0], {
                blockIds: orphanedBlockIds,
                checksum: `checksum-${peerIds[0]}-${orphanedBlockIds.length}`,
              });

              // Other peers have empty manifests
              for (let i = 1; i < peerIds.length; i++) {
                peerManifests.set(peerIds[i], {
                  blockIds: [],
                  checksum: `checksum-${peerIds[i]}-0`,
                });
              }

              const mockProvider = createMockManifestProvider({
                localNodeId,
                localBlockIds: [],
                peerManifests,
                orphanedBlockIds,
              });

              const service = new ReconciliationService(
                mockProvider,
                iterTestDir,
                testConfig,
              );

              // Perform reconciliation
              const result = await service.reconcile(peerIds);

              // Verify orphans were resolved
              expect(result.orphansResolved).toBe(orphanedBlockIds.length);

              // Verify state updates were made
              const stateUpdates = mockProvider._getStateUpdates();

              // Each orphaned block should have been updated to 'remote'
              for (const blockId of orphanedBlockIds) {
                const update = stateUpdates.find(
                  (u) => u.blockId === blockId && u.state === 'remote',
                );
                expect(update).toBeDefined();
              }

              return true;
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 20: Reconciliation Conflict Resolution', () => {
    /**
     * Generate a valid date (not NaN) within a reasonable range
     */
    const arbValidDate = fc
      .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-01-01').getTime() })
      .map((timestamp) => new Date(timestamp));

    /**
     * **Feature: block-availability-discovery, Property 20: Reconciliation Conflict Resolution**
     *
     * *For any* conflicting block state during reconciliation, the system SHALL resolve
     * using last-write-wins based on vector timestamps.
     *
     * **Validates: Requirements 9.6**
     */
    it('should resolve conflicts using last-write-wins with timestamps', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbBlockIdSet,
          arbPeerId,
          arbValidDate,
          async (sharedBlockIds, peerId, baseDate) => {
            if (sharedBlockIds.length === 0) {
              return true; // Skip trivial cases
            }

            const iterTestDir = join(
              '/tmp',
              'brightchain-reconciliation-conflict-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              // Create timestamps where peer has newer versions
              const blockTimestamps = new Map<string, Map<string, Date>>();
              for (const blockId of sharedBlockIds) {
                const timestamps = new Map<string, Date>();
                // Local has older timestamp
                timestamps.set(localNodeId, baseDate);
                // Peer has newer timestamp (1 hour later)
                timestamps.set(peerId, new Date(baseDate.getTime() + 3600000));
                blockTimestamps.set(blockId, timestamps);
              }

              const peerManifests = new Map<
                string,
                { blockIds: string[]; checksum: string }
              >();
              peerManifests.set(peerId, {
                blockIds: sharedBlockIds,
                checksum: `checksum-${peerId}-${sharedBlockIds.length}`,
              });

              const mockProvider = createMockManifestProvider({
                localNodeId,
                localBlockIds: sharedBlockIds, // Both have the same blocks
                peerManifests,
                blockTimestamps,
              });

              const service = new ReconciliationService(
                mockProvider,
                iterTestDir,
                testConfig,
              );

              // Track conflict resolution events
              const conflictEvents: Array<{
                blockId: string;
                winningNodeId: string;
              }> = [];
              service.onEvent((event: ReconciliationEvent) => {
                if (event.type === 'conflict_resolved') {
                  conflictEvents.push({
                    blockId: event.blockId,
                    winningNodeId: event.winningNodeId,
                  });
                }
              });

              // Perform reconciliation
              const result = await service.reconcile([peerId]);

              // Verify conflicts were resolved
              expect(result.conflictsResolved).toBe(sharedBlockIds.length);

              // Verify peer won all conflicts (has newer timestamps)
              for (const blockId of sharedBlockIds) {
                const event = conflictEvents.find((e) => e.blockId === blockId);
                expect(event).toBeDefined();
                expect(event?.winningNodeId).toBe(peerId);
              }

              return true;
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
