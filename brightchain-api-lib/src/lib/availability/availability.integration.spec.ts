/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Integration tests for Block Availability and Discovery Protocol
 *
 * Tests cover:
 * - Multi-node discovery scenario
 * - Partition and reconciliation scenario
 * - Gossip propagation scenario
 *
 * @see Requirements: All
 */

import {
  AvailabilityState,
  BlockAnnouncement,
  BlockManifest,
  BloomFilter,
  ILocationRecord,
} from '@brightchain/brightchain-lib';
import { randomBytes } from 'crypto';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { AvailabilityService } from './availabilityService';
import { BlockRegistry } from './blockRegistry';
import { DiscoveryProtocol, IPeerNetworkProvider } from './discoveryProtocol';
import { GossipService, IPeerProvider } from './gossipService';
import { HeartbeatMonitor, IHeartbeatTransport } from './heartbeatMonitor';
import {
  IManifestProvider,
  ReconciliationService,
} from './reconciliationService';

/**
 * Mock peer provider for gossip testing
 */
class MockPeerProvider extends EventEmitter implements IPeerProvider {
  constructor(private nodeId: string) {
    super();
  }

  private peers: Map<string, { connected: boolean; latency: number }> =
    new Map();
  private messageHandlers: Map<string, (msg: any) => void> = new Map();

  addPeer(peerId: string, latency = 50): void {
    this.peers.set(peerId, { connected: true, latency });
  }

  disconnectPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connected = false;
      this.emit('peer:disconnected', peerId);
    }
  }

  reconnectPeer(peerId: string): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.connected = true;
      this.emit('peer:connected', peerId);
    }
  }

  getLocalNodeId(): string {
    return this.nodeId;
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.peers.entries())
      .filter(([, peer]) => peer.connected)
      .map(([id]) => id);
  }

  async sendAnnouncementBatch(
    peerId: string,
    announcements: BlockAnnouncement[],
  ): Promise<void> {
    const peer = this.peers.get(peerId);
    if (!peer || !peer.connected) {
      throw new Error(`Peer ${peerId} not connected`);
    }
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, peer.latency));

    // Notify handler if registered
    const handler = this.messageHandlers.get(peerId);
    if (handler) {
      handler({ type: 'announcement_batch', announcements });
    }
  }

  registerMessageHandler(peerId: string, handler: (msg: any) => void): void {
    this.messageHandlers.set(peerId, handler);
  }
}

/**
 * Mock network provider for discovery testing
 */
class MockNetworkProvider implements IPeerNetworkProvider {
  private peers: Map<
    string,
    { bloomFilter: BloomFilter; blocks: Set<string> }
  > = new Map();

  addPeer(peerId: string, blocks: string[]): void {
    this.peers.set(peerId, {
      bloomFilter: this.createMockBloomFilter(blocks),
      blocks: new Set(blocks),
    });
  }

  private createMockBloomFilter(blocks: string[]): BloomFilter {
    return {
      data: '',
      hashCount: 7,
      bitCount: 1000,
      itemCount: blocks.length,
      mightContain: (blockId: string) => blocks.includes(blockId),
    };
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  async getPeerBloomFilter(peerId: string): Promise<BloomFilter> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      throw new Error(`Peer ${peerId} not found`);
    }
    return peer.bloomFilter;
  }

  async queryPeerForBlock(
    peerId: string,
    blockId: string,
    timeoutMs: number,
  ): Promise<boolean> {
    const peer = this.peers.get(peerId);
    if (!peer) {
      return false;
    }
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 10));
    return peer.blocks.has(blockId);
  }
}

/**
 * Mock heartbeat transport
 */
class MockHeartbeatTransport implements IHeartbeatTransport {
  private reachablePeers: Set<string> = new Set();

  setPeerReachable(peerId: string, reachable: boolean): void {
    if (reachable) {
      this.reachablePeers.add(peerId);
    } else {
      this.reachablePeers.delete(peerId);
    }
  }

  async sendPing(peerId: string): Promise<number> {
    if (!this.reachablePeers.has(peerId)) {
      throw new Error(`Peer ${peerId} unreachable`);
    }
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 10));
    return 10;
  }
}

/**
 * Mock manifest provider for reconciliation
 */
class MockManifestProvider implements IManifestProvider {
  constructor(private nodeId: string) {}

  private manifests: Map<string, BlockManifest> = new Map();
  private blockStates: Map<
    string,
    'local' | 'remote' | 'cached' | 'orphaned' | 'unknown'
  > = new Map();
  private blockTimestamps: Map<string, Date> = new Map();

  setManifest(peerId: string, manifest: BlockManifest): void {
    this.manifests.set(peerId, manifest);
  }

  getLocalNodeId(): string {
    return this.nodeId;
  }

  getLocalManifest(): BlockManifest {
    return (
      this.manifests.get(this.nodeId) || {
        nodeId: this.nodeId,
        blockIds: [],
        generatedAt: new Date(),
        checksum: '',
      }
    );
  }

  async getPeerManifest(
    peerId: string,
    sinceTimestamp?: Date,
    timeoutMs?: number,
  ): Promise<BlockManifest> {
    const manifest = this.manifests.get(peerId);
    if (!manifest) {
      throw new Error(`No manifest for peer ${peerId}`);
    }
    return manifest;
  }

  async updateBlockLocation(
    blockId: string,
    nodeId: string,
    timestamp: Date,
  ): Promise<void> {
    this.blockTimestamps.set(`${blockId}:${nodeId}`, timestamp);
  }

  async getBlockAvailabilityState(
    blockId: string,
  ): Promise<'local' | 'remote' | 'cached' | 'orphaned' | 'unknown'> {
    return this.blockStates.get(blockId) || 'unknown';
  }

  async updateBlockAvailabilityState(
    blockId: string,
    state: 'local' | 'remote' | 'cached' | 'orphaned' | 'unknown',
  ): Promise<void> {
    this.blockStates.set(blockId, state);
  }

  async getOrphanedBlockIds(): Promise<string[]> {
    const orphaned: string[] = [];
    for (const [blockId, state] of this.blockStates) {
      if (state === 'orphaned') {
        orphaned.push(blockId);
      }
    }
    return orphaned;
  }

  async sendSyncItem(peerId: string, item: any): Promise<void> {
    // Mock implementation
  }

  getConnectedPeerIds(): string[] {
    return Array.from(this.manifests.keys()).filter((id) => id !== this.nodeId);
  }

  async getBlockTimestamp(
    blockId: string,
    nodeId: string,
  ): Promise<Date | null> {
    return this.blockTimestamps.get(`${blockId}:${nodeId}`) || null;
  }
}

/**
 * Create a test node with all availability components
 */
function createTestNode(nodeId: string) {
  const tempDir = path.join(__dirname, `test-${nodeId}-${Date.now()}`);
  fs.mkdirSync(tempDir, { recursive: true });

  const peerProvider = new MockPeerProvider(nodeId);
  const networkProvider = new MockNetworkProvider();
  const heartbeatTransport = new MockHeartbeatTransport();
  const manifestProvider = new MockManifestProvider(nodeId);

  const registry = new BlockRegistry(nodeId, tempDir, 'small');

  const gossipService = new GossipService(peerProvider, {
    fanout: 2,
    defaultTtl: 3,
    batchIntervalMs: 100,
    maxBatchSize: 50,
  });

  const discoveryProtocol = new DiscoveryProtocol(networkProvider, {
    queryTimeoutMs: 1000,
    maxConcurrentQueries: 5,
    cacheTtlMs: 5000,
    bloomFilterFalsePositiveRate: 0.01,
    bloomFilterHashCount: 7,
  });

  const heartbeatMonitor = new HeartbeatMonitor(heartbeatTransport, {
    intervalMs: 100,
    timeoutMs: 50,
    missedThreshold: 2,
  });

  const reconciliationService = new ReconciliationService(
    manifestProvider,
    tempDir,
    {
      manifestExchangeTimeoutMs: 5000,
      maxConcurrentReconciliations: 3,
      syncVectorPath: path.join(tempDir, 'sync-vectors.json'),
      pendingSyncQueuePath: path.join(tempDir, 'pending-sync-queue.json'),
      maxPendingSyncQueueSize: 1000,
    },
  );

  const availabilityService = new AvailabilityService(
    registry,
    discoveryProtocol,
    gossipService,
    reconciliationService,
    heartbeatMonitor,
    {
      localNodeId: nodeId,
      stalenessThresholdMs: 10000,
      queryTimeoutMs: 5000,
    },
  );

  return {
    nodeId,
    tempDir,
    peerProvider,
    networkProvider,
    heartbeatTransport,
    manifestProvider,
    registry,
    gossipService,
    discoveryProtocol,
    heartbeatMonitor,
    reconciliationService,
    availabilityService,
  };
}

describe('Availability Integration Tests', () => {
  const testNodes: ReturnType<typeof createTestNode>[] = [];

  afterEach(() => {
    // Clean up test directories
    for (const node of testNodes) {
      if (fs.existsSync(node.tempDir)) {
        fs.rmSync(node.tempDir, { recursive: true, force: true });
      }
      node.heartbeatMonitor.stop();
    }
    testNodes.length = 0;
  });

  describe('Multi-Node Discovery Scenario', () => {
    it('should discover blocks across multiple nodes using Bloom filters', async () => {
      // Create two nodes
      const node1 = createTestNode('node1');
      const node2 = createTestNode('node2');
      testNodes.push(node1, node2);

      // Node2 has some blocks
      const block1Id = randomBytes(32).toString('hex');
      const block2Id = randomBytes(32).toString('hex');

      node2.registry.addLocal(block1Id);
      node2.registry.addLocal(block2Id);

      // Set up network provider for node1 to know about node2's blocks
      node1.networkProvider.addPeer('node2', [block1Id, block2Id]);

      // Discover block from node1
      const result = await node1.discoveryProtocol.discoverBlock(block1Id);

      expect(result.found).toBe(true);
      expect(result.locations.length).toBeGreaterThan(0);
    });

    it('should track block locations after discovery', async () => {
      const node1 = createTestNode('node1');
      testNodes.push(node1);

      const blockId = randomBytes(32).toString('hex');
      const location: ILocationRecord = {
        nodeId: 'node2',
        lastSeen: new Date(),
        isAuthoritative: true,
        latencyMs: 50,
      };

      // Update location
      await node1.availabilityService.updateLocation(blockId, location);

      // Query locations
      const locations =
        await node1.availabilityService.getBlockLocations(blockId);

      expect(locations.length).toBe(1);
      expect(locations[0].nodeId).toBe('node2');
    });
  });

  describe('Partition and Reconciliation Scenario', () => {
    it('should detect partition when all peers become unreachable', async () => {
      const node1 = createTestNode('node1');
      testNodes.push(node1);

      // Add a peer to the provider and monitor
      node1.peerProvider.addPeer('node2', 50);
      node1.heartbeatTransport.setPeerReachable('node2', true);
      node1.heartbeatMonitor.addPeer('node2'); // Add peer to monitor

      // Start heartbeat monitoring
      node1.heartbeatMonitor.start();

      // Wait for initial heartbeat
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Verify peer is initially reachable
      expect(node1.heartbeatMonitor.isPeerReachable('node2')).toBe(true);

      // Make peer unreachable
      node1.heartbeatTransport.setPeerReachable('node2', false);

      // Wait for partition detection (need enough time for missed threshold)
      // With intervalMs=100 and missedThreshold=2, need at least 200ms
      await new Promise((resolve) => setTimeout(resolve, 350));

      // Verify peer is now unreachable
      expect(node1.heartbeatMonitor.isPeerReachable('node2')).toBe(false);

      // Verify partition mode
      expect(node1.availabilityService.isInPartitionMode()).toBe(true);
    });

    it('should mark remote blocks as orphaned during partition', async () => {
      const node1 = createTestNode('node1');
      testNodes.push(node1);

      const blockId = randomBytes(32).toString('hex');

      // Add remote block location
      await node1.availabilityService.updateLocation(blockId, {
        nodeId: 'node2',
        lastSeen: new Date(),
        isAuthoritative: true,
      });

      // Verify it's remote
      let state = await node1.availabilityService.getAvailabilityState(blockId);
      expect(state).toBe(AvailabilityState.Remote);

      // Enter partition mode
      node1.availabilityService.enterPartitionMode();

      // Verify it's now orphaned
      state = await node1.availabilityService.getAvailabilityState(blockId);
      expect(state).toBe(AvailabilityState.Orphaned);
    });
  });

  describe('Gossip Propagation Scenario', () => {
    it('should announce blocks via gossip', async () => {
      const node1 = createTestNode('node1');
      const node2 = createTestNode('node2');
      testNodes.push(node1, node2);

      // Connect nodes
      node1.peerProvider.addPeer('node2', 50);

      // Track announcements on node2
      const announcements: BlockAnnouncement[] = [];
      node2.gossipService.onAnnouncement((announcement) => {
        announcements.push(announcement);
      });

      // Set up message handler to forward announcements
      node1.peerProvider.registerMessageHandler('node2', async (msg) => {
        if (msg.type === 'announcement_batch') {
          for (const announcement of msg.announcements) {
            await node2.gossipService.handleAnnouncement(announcement);
          }
        }
      });

      // Announce a block from node1
      const blockId = randomBytes(32).toString('hex');
      node1.registry.addLocal(blockId);
      await node1.gossipService.announceBlock(blockId);

      // Manually flush announcements to trigger sending
      await node1.gossipService.flushAnnouncements();

      // Wait a bit for async processing
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Verify node2 received the announcement
      expect(announcements.some((a) => a.blockId === blockId)).toBe(true);
    });

    it('should batch multiple announcements', async () => {
      const node1 = createTestNode('node1');
      testNodes.push(node1);

      node1.peerProvider.addPeer('node2', 50);

      // Announce multiple blocks quickly
      const blockIds = Array.from({ length: 5 }, () =>
        randomBytes(32).toString('hex'),
      );

      for (const blockId of blockIds) {
        node1.registry.addLocal(blockId);
        await node1.gossipService.announceBlock(blockId);
      }

      // Get pending announcements before flush
      const pending = node1.gossipService.getPendingAnnouncements();

      // Should have batched the announcements
      expect(pending.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics and State Tracking', () => {
    it('should track block counts by state', async () => {
      const node = createTestNode('node1');
      testNodes.push(node);

      // Add a local block
      const localBlock = randomBytes(32).toString('hex');
      node.registry.addLocal(localBlock);

      // Add a remote block location
      const remoteBlock = randomBytes(32).toString('hex');
      await node.availabilityService.updateLocation(remoteBlock, {
        nodeId: 'node2',
        lastSeen: new Date(),
        isAuthoritative: true,
      });

      // Get statistics
      const stats = await node.availabilityService.getStatistics();

      expect(stats.localCount).toBe(1);
      expect(stats.remoteCount).toBeGreaterThanOrEqual(1);
    });

    it('should list blocks by availability state', async () => {
      const node = createTestNode('node1');
      testNodes.push(node);

      // Add local blocks
      const block1 = randomBytes(32).toString('hex');
      const block2 = randomBytes(32).toString('hex');
      node.registry.addLocal(block1);
      node.registry.addLocal(block2);

      // List local blocks
      const localBlocks = await node.availabilityService.listBlocksByState(
        AvailabilityState.Local,
      );

      expect(localBlocks).toContain(block1);
      expect(localBlocks).toContain(block2);
    });
  });
});
