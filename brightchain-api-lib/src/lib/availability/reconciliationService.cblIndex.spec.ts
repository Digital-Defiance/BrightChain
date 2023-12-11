/**
 * ReconciliationService – CBL Index manifest exchange tests.
 *
 * Tests that pool-scoped reconciliation exchanges CBL index manifests
 * alongside block manifests, and merges missing entries from peers.
 *
 * Validates: Requirements 8.4
 */

import type {
  BlockManifest,
  CBLIndexManifest,
  ICBLIndexEntry,
  PoolScopedManifest,
  ReconciliationConfig,
} from '@brightchain/brightchain-lib';
import { CBLVisibility } from '@brightchain/brightchain-lib';
import { mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import {
  IManifestProvider,
  ReconciliationService,
} from './reconciliationService';

const TEST_DIR = join(__dirname, '__test_recon_cbl__');

beforeEach(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

afterEach(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

const testConfig: ReconciliationConfig = {
  manifestExchangeTimeoutMs: 5000,
  maxConcurrentReconciliations: 2,
  syncVectorPath: join(TEST_DIR, 'sync-vectors.json'),
  pendingSyncQueuePath: join(TEST_DIR, 'pending-sync.json'),
  maxPendingSyncQueueSize: 100,
};

/** Build a minimal manifest provider that supports pool-scoped + CBL index reconciliation. */
function createCBLIndexAwareProvider(options: {
  localNodeId: string;
  localBlocksByPool: Map<string, string[]>;
  peerBlocksByPool: Map<string, string[]>;
  localCBLManifests: Map<string, CBLIndexManifest>;
  peerCBLManifests: Map<string, CBLIndexManifest>;
  peerEntries: Map<string, ICBLIndexEntry>;
}): IManifestProvider {
  const mergedEntries: ICBLIndexEntry[] = [];

  return {
    getLocalNodeId: () => options.localNodeId,
    getLocalManifest: () => ({
      nodeId: options.localNodeId,
      blockIds: [],
      generatedAt: new Date(),
      checksum: 'local-checksum',
    }),
    getPeerManifest: async (): Promise<BlockManifest> => ({
      nodeId: 'peer-1',
      blockIds: [],
      generatedAt: new Date(),
      checksum: 'peer-checksum',
    }),
    updateBlockLocation: async () => {},
    getBlockAvailabilityState: async () => 'unknown' as const,
    updateBlockAvailabilityState: async () => {},
    getOrphanedBlockIds: async () => [],
    sendSyncItem: async () => {},
    getConnectedPeerIds: () => ['peer-1'],
    getBlockTimestamp: async () => null,

    // Pool-scoped manifest support
    getLocalPoolScopedManifest: (): PoolScopedManifest => ({
      nodeId: options.localNodeId,
      pools: options.localBlocksByPool,
      generatedAt: new Date(),
      checksum: 'local-pool-checksum',
    }),
    getPeerPoolScopedManifest: async (): Promise<
      PoolScopedManifest | undefined
    > => ({
      nodeId: 'peer-1',
      pools: options.peerBlocksByPool,
      generatedAt: new Date(),
      checksum: 'peer-pool-checksum',
    }),

    // CBL Index manifest support
    getLocalCBLIndexManifest: async (
      poolId: string,
    ): Promise<CBLIndexManifest | undefined> => {
      return options.localCBLManifests.get(poolId);
    },
    getPeerCBLIndexManifest: async (
      _peerId: string,
      poolId: string,
    ): Promise<CBLIndexManifest | undefined> => {
      return options.peerCBLManifests.get(poolId);
    },
    fetchCBLIndexEntry: async (
      _peerId: string,
      magnetUrl: string,
    ): Promise<ICBLIndexEntry | null> => {
      const entry = options.peerEntries.get(magnetUrl) ?? null;
      if (entry) {
        mergedEntries.push(entry);
      }
      return entry;
    },

    // Expose merged entries for assertions (via closure)
    get _mergedEntries() {
      return mergedEntries;
    },
  } as IManifestProvider & { _mergedEntries: ICBLIndexEntry[] };
}

// ══════════════════════════════════════════════════════════════
// Requirement 8.4: CBL Index manifest exchange during reconciliation
// ══════════════════════════════════════════════════════════════

describe('ReconciliationService – CBL Index manifest exchange (Req 8.4)', () => {
  it('should fetch missing CBL index entries during pool-scoped reconciliation', async () => {
    const remoteEntry: ICBLIndexEntry = {
      _id: 'remote-entry-1',
      magnetUrl: 'magnet:remote-only',
      blockId1: 'block-r1',
      blockId2: 'block-r2',
      blockSize: 256,
      poolId: 'pool-a',
      createdAt: new Date('2025-01-15T10:00:00Z'),
      visibility: CBLVisibility.Public,
      sequenceNumber: 5,
    };

    const provider = createCBLIndexAwareProvider({
      localNodeId: 'local-node',
      localBlocksByPool: new Map([['pool-a', ['block-1']]]),
      peerBlocksByPool: new Map([['pool-a', ['block-1']]]),
      localCBLManifests: new Map([
        [
          'pool-a',
          {
            poolId: 'pool-a',
            nodeId: 'local-node',
            entries: [{ magnetUrl: 'magnet:local-entry', sequenceNumber: 1 }],
            generatedAt: new Date(),
          },
        ],
      ]),
      peerCBLManifests: new Map([
        [
          'pool-a',
          {
            poolId: 'pool-a',
            nodeId: 'peer-1',
            entries: [
              { magnetUrl: 'magnet:local-entry', sequenceNumber: 1 },
              { magnetUrl: 'magnet:remote-only', sequenceNumber: 5 },
            ],
            generatedAt: new Date(),
          },
        ],
      ]),
      peerEntries: new Map([['magnet:remote-only', remoteEntry]]),
    });

    const service = new ReconciliationService(provider, TEST_DIR, testConfig);
    const result = await service.reconcile(['peer-1']);

    expect(result.success).toBe(true);
    expect(result.cblIndexEntriesMerged).toBe(1);
  });

  it('should not fetch entries that exist locally', async () => {
    const provider = createCBLIndexAwareProvider({
      localNodeId: 'local-node',
      localBlocksByPool: new Map([['pool-a', []]]),
      peerBlocksByPool: new Map([['pool-a', []]]),
      localCBLManifests: new Map([
        [
          'pool-a',
          {
            poolId: 'pool-a',
            nodeId: 'local-node',
            entries: [{ magnetUrl: 'magnet:shared', sequenceNumber: 1 }],
            generatedAt: new Date(),
          },
        ],
      ]),
      peerCBLManifests: new Map([
        [
          'pool-a',
          {
            poolId: 'pool-a',
            nodeId: 'peer-1',
            entries: [{ magnetUrl: 'magnet:shared', sequenceNumber: 1 }],
            generatedAt: new Date(),
          },
        ],
      ]),
      peerEntries: new Map(),
    });

    const service = new ReconciliationService(provider, TEST_DIR, testConfig);
    const result = await service.reconcile(['peer-1']);

    expect(result.success).toBe(true);
    // No CBL index entries should have been merged
    expect(result.cblIndexEntriesMerged).toBeUndefined();
  });

  it('should handle empty peer CBL manifest gracefully', async () => {
    const provider = createCBLIndexAwareProvider({
      localNodeId: 'local-node',
      localBlocksByPool: new Map([['pool-a', []]]),
      peerBlocksByPool: new Map([['pool-a', []]]),
      localCBLManifests: new Map([
        [
          'pool-a',
          {
            poolId: 'pool-a',
            nodeId: 'local-node',
            entries: [{ magnetUrl: 'magnet:local', sequenceNumber: 1 }],
            generatedAt: new Date(),
          },
        ],
      ]),
      peerCBLManifests: new Map([
        [
          'pool-a',
          {
            poolId: 'pool-a',
            nodeId: 'peer-1',
            entries: [],
            generatedAt: new Date(),
          },
        ],
      ]),
      peerEntries: new Map(),
    });

    const service = new ReconciliationService(provider, TEST_DIR, testConfig);
    const result = await service.reconcile(['peer-1']);

    expect(result.success).toBe(true);
    expect(result.cblIndexEntriesMerged).toBeUndefined();
  });

  it('should work when provider does not support CBL index manifests', async () => {
    // Provider without CBL index methods — should still reconcile blocks normally
    const provider: IManifestProvider = {
      getLocalNodeId: () => 'local-node',
      getLocalManifest: () => ({
        nodeId: 'local-node',
        blockIds: [],
        generatedAt: new Date(),
        checksum: 'c',
      }),
      getPeerManifest: async () => ({
        nodeId: 'peer-1',
        blockIds: [],
        generatedAt: new Date(),
        checksum: 'c',
      }),
      updateBlockLocation: async () => {},
      getBlockAvailabilityState: async () => 'unknown' as const,
      updateBlockAvailabilityState: async () => {},
      getOrphanedBlockIds: async () => [],
      sendSyncItem: async () => {},
      getConnectedPeerIds: () => ['peer-1'],
      getBlockTimestamp: async () => null,
      // Pool-scoped support but NO CBL index support
      getLocalPoolScopedManifest: () => ({
        nodeId: 'local-node',
        pools: new Map([['pool-a', []]]),
        generatedAt: new Date(),
        checksum: 'c',
      }),
      getPeerPoolScopedManifest: async () => ({
        nodeId: 'peer-1',
        pools: new Map([['pool-a', []]]),
        generatedAt: new Date(),
        checksum: 'c',
      }),
    };

    const service = new ReconciliationService(provider, TEST_DIR, testConfig);
    const result = await service.reconcile(['peer-1']);

    expect(result.success).toBe(true);
    // No CBL index entries merged since provider doesn't support it
    expect(result.cblIndexEntriesMerged).toBeUndefined();
  });
});
