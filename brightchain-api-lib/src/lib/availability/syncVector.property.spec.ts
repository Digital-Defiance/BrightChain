/* eslint-disable @nx/enforce-module-boundaries */
/**
 * @fileoverview Property-based tests for Sync Vector
 *
 * **Feature: block-availability-discovery**
 *
 * This test suite verifies:
 * - Property 21: Sync Vector Persistence Round-Trip
 * - Property 22: Delta Synchronization
 * - Property 23: Sync Vector Update
 *
 * **Validates: Requirements 10.2, 10.3, 10.5, 10.6**
 */

import {
  BlockManifest,
  ReconciliationConfig,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  IManifestProvider,
  ReconciliationService,
} from './reconciliationService';

/**
 * Generate a peer ID
 */
const arbPeerId = fc
  .string({ minLength: 8, maxLength: 16 })
  .map((s) => `peer-${s}`);

/**
 * Generate a valid checksum (hex string)
 */
const arbChecksum = fc
  .array(fc.integer({ min: 0, max: 15 }), { minLength: 64, maxLength: 64 })
  .map((arr) => arr.map((n) => n.toString(16)).join(''));

/**
 * Generate a valid date (not NaN) within a reasonable range
 * Using integer timestamps to avoid fc.date() generating invalid dates
 */
const arbValidDate = fc
  .integer({ min: new Date('2020-01-01').getTime(), max: new Date('2025-12-31').getTime() })
  .map((timestamp) => new Date(timestamp));

/**
 * Generate a sync vector entry
 */
const arbSyncVectorEntry = fc.record({
  peerId: arbPeerId,
  lastSyncTimestamp: arbValidDate,
  lastManifestChecksum: arbChecksum,
});

/**
 * Generate a set of sync vector entries
 */
const arbSyncVectorEntries = fc
  .array(arbSyncVectorEntry, { minLength: 1, maxLength: 10 })
  .map((entries) => {
    // Ensure unique peer IDs
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (seen.has(e.peerId)) return false;
      seen.add(e.peerId);
      return true;
    });
  });

/**
 * Create a minimal mock manifest provider for sync vector tests
 */
function createMinimalMockProvider(localNodeId: string): IManifestProvider {
  return {
    getLocalNodeId: () => localNodeId,
    getLocalManifest: () => ({
      nodeId: localNodeId,
      blockIds: [],
      generatedAt: new Date(),
      checksum: 'empty-checksum',
    }),
    getPeerManifest: async (peerId: string): Promise<BlockManifest> => ({
      nodeId: peerId,
      blockIds: [],
      generatedAt: new Date(),
      checksum: `checksum-${peerId}`,
    }),
    updateBlockLocation: async () => {},
    getBlockAvailabilityState: async () => 'unknown',
    updateBlockAvailabilityState: async () => {},
    getOrphanedBlockIds: async () => [],
    sendSyncItem: async () => {},
    getConnectedPeerIds: () => [],
    getBlockTimestamp: async () => null,
  };
}

describe('Sync Vector Property Tests', () => {
  const localNodeId = 'local-node-001';

  const testConfig: ReconciliationConfig = {
    manifestExchangeTimeoutMs: 5000,
    maxConcurrentReconciliations: 3,
    syncVectorPath: 'sync-vectors.json',
    pendingSyncQueuePath: 'pending-sync-queue.json',
    maxPendingSyncQueueSize: 100,
  };

  describe('Property 21: Sync Vector Persistence Round-Trip', () => {
    /**
     * **Feature: block-availability-discovery, Property 21: Sync Vector Persistence Round-Trip**
     *
     * *For any* valid Sync Vector, persisting to disk and then loading SHALL produce
     * an equivalent Sync Vector with all peer timestamps preserved.
     *
     * **Validates: Requirements 10.5, 10.6**
     */
    it('should preserve all sync vector entries through persistence round-trip', async () => {
      await fc.assert(
        fc.asyncProperty(arbSyncVectorEntries, async (entries) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-syncvector-roundtrip-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });

          try {
            const mockProvider = createMinimalMockProvider(localNodeId);
            const service = new ReconciliationService(
              mockProvider,
              iterTestDir,
              testConfig,
            );

            // Add sync vector entries
            for (const entry of entries) {
              service.updateSyncVector(
                entry.peerId,
                entry.lastSyncTimestamp,
                entry.lastManifestChecksum,
              );
            }

            // Persist to disk
            await service.persistSyncVectors();

            // Verify file was created
            const filePath = join(iterTestDir, testConfig.syncVectorPath);
            expect(existsSync(filePath)).toBe(true);

            // Create new service and load
            const service2 = new ReconciliationService(
              mockProvider,
              iterTestDir,
              testConfig,
            );
            await service2.loadSyncVectors();

            // Verify all entries were preserved
            for (const entry of entries) {
              const loaded = service2.getSyncVector(entry.peerId);
              expect(loaded).not.toBeNull();
              expect(loaded?.peerId).toBe(entry.peerId);
              expect(loaded?.lastManifestChecksum).toBe(
                entry.lastManifestChecksum,
              );
              // Compare timestamps (allowing for serialization precision loss)
              expect(loaded?.lastSyncTimestamp.getTime()).toBe(
                entry.lastSyncTimestamp.getTime(),
              );
            }

            // Verify count matches
            const allVectors = service2.getAllSyncVectors();
            expect(allVectors.size).toBe(entries.length);

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Property 22: Delta Synchronization', () => {
    /**
     * **Feature: block-availability-discovery, Property 22: Delta Synchronization**
     *
     * *For any* sync operation with a peer, the system SHALL request only changes
     * since the last sync timestamp recorded in the Sync Vector for that peer.
     *
     * **Validates: Requirements 10.2**
     */
    it('should use sync vector timestamp for delta synchronization', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbPeerId,
          arbValidDate,
          arbChecksum,
          async (peerId, lastSyncTime, checksum) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-syncvector-delta-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              // Track what timestamp was requested
              let requestedSinceTimestamp: Date | undefined;

              const mockProvider: IManifestProvider = {
                getLocalNodeId: () => localNodeId,
                getLocalManifest: () => ({
                  nodeId: localNodeId,
                  blockIds: [],
                  generatedAt: new Date(),
                  checksum: 'local-checksum',
                }),
                getPeerManifest: async (
                  _peerId: string,
                  sinceTimestamp?: Date,
                ): Promise<BlockManifest> => {
                  requestedSinceTimestamp = sinceTimestamp;
                  return {
                    nodeId: _peerId,
                    blockIds: [],
                    generatedAt: new Date(),
                    checksum: `checksum-${_peerId}`,
                  };
                },
                updateBlockLocation: async () => {},
                getBlockAvailabilityState: async () => 'unknown',
                updateBlockAvailabilityState: async () => {},
                getOrphanedBlockIds: async () => [],
                sendSyncItem: async () => {},
                getConnectedPeerIds: () => [peerId],
                getBlockTimestamp: async () => null,
              };

              const service = new ReconciliationService(
                mockProvider,
                iterTestDir,
                testConfig,
              );

              // Set up sync vector with a previous sync time
              service.updateSyncVector(peerId, lastSyncTime, checksum);

              // Perform reconciliation
              await service.reconcile([peerId]);

              // Verify the sync vector timestamp was used
              expect(requestedSinceTimestamp).toBeDefined();
              expect(requestedSinceTimestamp?.getTime()).toBe(
                lastSyncTime.getTime(),
              );

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

  describe('Property 23: Sync Vector Update', () => {
    /**
     * **Feature: block-availability-discovery, Property 23: Sync Vector Update**
     *
     * *For any* successful sync with a peer, the Sync Vector entry for that peer
     * SHALL be updated to the current timestamp.
     *
     * **Validates: Requirements 10.3**
     */
    it('should update sync vector after successful reconciliation', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbPeerId,
          arbChecksum,
          async (peerId, peerChecksum) => {
            const iterTestDir = join(
              '/tmp',
              'brightchain-syncvector-update-' +
                Date.now() +
                '-' +
                Math.random().toString(36).slice(2),
            );
            mkdirSync(iterTestDir, { recursive: true });

            try {
              const mockProvider: IManifestProvider = {
                getLocalNodeId: () => localNodeId,
                getLocalManifest: () => ({
                  nodeId: localNodeId,
                  blockIds: [],
                  generatedAt: new Date(),
                  checksum: 'local-checksum',
                }),
                getPeerManifest: async (
                  _peerId: string,
                ): Promise<BlockManifest> => ({
                  nodeId: _peerId,
                  blockIds: [],
                  generatedAt: new Date(),
                  checksum: peerChecksum,
                }),
                updateBlockLocation: async () => {},
                getBlockAvailabilityState: async () => 'unknown',
                updateBlockAvailabilityState: async () => {},
                getOrphanedBlockIds: async () => [],
                sendSyncItem: async () => {},
                getConnectedPeerIds: () => [peerId],
                getBlockTimestamp: async () => null,
              };

              const service = new ReconciliationService(
                mockProvider,
                iterTestDir,
                testConfig,
              );

              // Initialize with old sync vector
              const oldTime = new Date('2020-01-01');
              service.updateSyncVector(peerId, oldTime, 'old-checksum');

              const beforeReconcile = Date.now();

              // Perform reconciliation
              await service.reconcile([peerId]);

              const afterReconcile = Date.now();

              // Verify sync vector was updated
              const updatedVector = service.getSyncVector(peerId);
              expect(updatedVector).not.toBeNull();

              // Timestamp should be updated to approximately now
              const updatedTime = updatedVector!.lastSyncTimestamp.getTime();
              expect(updatedTime).toBeGreaterThanOrEqual(beforeReconcile);
              expect(updatedTime).toBeLessThanOrEqual(afterReconcile);

              // Checksum should be updated to peer's checksum
              expect(updatedVector!.lastManifestChecksum).toBe(peerChecksum);

              return true;
            } finally {
              rmSync(iterTestDir, { recursive: true, force: true });
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Feature: block-availability-discovery, Property 23: Sync Vector Update**
     *
     * New peers should be initialized with epoch timestamp (zero).
     *
     * **Validates: Requirements 10.4**
     */
    it('should initialize new peer sync vectors with epoch timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(arbPeerId, async (peerId) => {
          const iterTestDir = join(
            '/tmp',
            'brightchain-syncvector-init-' +
              Date.now() +
              '-' +
              Math.random().toString(36).slice(2),
          );
          mkdirSync(iterTestDir, { recursive: true });

          try {
            const mockProvider = createMinimalMockProvider(localNodeId);
            const service = new ReconciliationService(
              mockProvider,
              iterTestDir,
              testConfig,
            );

            // Initialize sync vector for new peer
            service.initializeSyncVector(peerId);

            // Verify it was initialized with epoch
            const vector = service.getSyncVector(peerId);
            expect(vector).not.toBeNull();
            expect(vector!.peerId).toBe(peerId);
            expect(vector!.lastSyncTimestamp.getTime()).toBe(0); // Epoch
            expect(vector!.lastManifestChecksum).toBe('');

            return true;
          } finally {
            rmSync(iterTestDir, { recursive: true, force: true });
          }
        }),
        { numRuns: 100 },
      );
    });
  });
});
