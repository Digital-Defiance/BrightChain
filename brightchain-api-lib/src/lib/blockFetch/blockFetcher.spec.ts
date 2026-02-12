/**
 * @fileoverview BlockFetcher Unit Tests
 *
 * Tests for pool-scoped fetch, pool metadata validation, and PoolMismatchError.
 * Validates Requirements 7.1, 7.2, 7.3, 7.4 from pool-scoped-whitening spec.
 */

import {
  AnnouncementHandler,
  AvailabilityState,
  BlockAnnouncement,
  BlockFetcherConfig,
  BlockFetchResult,
  BlockStoreOptions,
  DEFAULT_BLOCK_FETCHER_CONFIG,
  FetchQueueConfig,
  GossipConfig,
  IAvailabilityService,
  IBlockFetchTransport,
  IBlockMetadata,
  IBlockStore,
  IFetchQueue,
  IGossipService,
  IPooledBlockStore,
  PoolId,
  PoolMismatchError,
} from '@brightchain/brightchain-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import { BlockFetcher } from './blockFetcher';

// ── Helpers ──

/** Compute a block ID (SHA3-512 hex) from data */
function computeBlockId(data: Uint8Array): string {
  return Buffer.from(sha3_512(data)).toString('hex');
}

function makeBlockData(seed: number): Uint8Array {
  const data = new Uint8Array(64);
  for (let i = 0; i < data.length; i++) {
    data[i] = (seed + i) % 256;
  }
  return data;
}

// ── Mock Transport ──

class MockTransport implements IBlockFetchTransport {
  /** Map of blockId -> data to return */
  readonly responses = new Map<string, Uint8Array>();
  /** Track calls for assertions */
  readonly calls: Array<{
    nodeId: string;
    blockId: string;
    poolId?: PoolId;
  }> = [];
  /** Optional: simulate errors for specific blockIds */
  readonly errorBlockIds = new Set<string>();

  async fetchBlockFromNode(
    nodeId: string,
    blockId: string,
    poolId?: PoolId,
  ): Promise<Uint8Array> {
    this.calls.push({ nodeId, blockId, poolId });
    if (this.errorBlockIds.has(blockId)) {
      throw new Error(`Transport error fetching ${blockId} from ${nodeId}`);
    }
    const data = this.responses.get(blockId);
    if (!data) {
      throw new Error(`Block ${blockId} not found on node ${nodeId}`);
    }
    return data;
  }
}

// ── Mock Availability Service (minimal) ──

class MockAvailabilityService {
  readonly locations = new Map<
    string,
    Array<{ nodeId: string; lastSeen: Date; isAuthoritative: boolean }>
  >();

  async getBlockLocations(
    blockId: string,
  ): Promise<
    Array<{ nodeId: string; lastSeen: Date; isAuthoritative: boolean }>
  > {
    return this.locations.get(blockId) ?? [];
  }

  // Stub remaining IAvailabilityService methods
  async getAvailabilityState(): Promise<string> {
    return 'unknown';
  }
  async queryBlockLocation(): Promise<{
    blockId: string;
    state: string;
    locations: never[];
    isStale: boolean;
    lastUpdated: Date;
  }> {
    return {
      blockId: '',
      state: 'unknown',
      locations: [],
      isStale: false,
      lastUpdated: new Date(),
    };
  }
  async listBlocksByState(): Promise<string[]> {
    return [];
  }
  async getStatistics(): Promise<{
    localCount: number;
    remoteCount: number;
    cachedCount: number;
    orphanedCount: number;
    unknownCount: number;
    totalKnownLocations: number;
    averageLocationsPerBlock: number;
  }> {
    return {
      localCount: 0,
      remoteCount: 0,
      cachedCount: 0,
      orphanedCount: 0,
      unknownCount: 0,
      totalKnownLocations: 0,
      averageLocationsPerBlock: 0,
    };
  }
  async updateLocation(): Promise<void> {}
  async removeLocation(): Promise<void> {}
  async setAvailabilityState(): Promise<void> {}
  isInPartitionMode(): boolean {
    return false;
  }
  enterPartitionMode(): void {}
  async exitPartitionMode(): Promise<{
    blocksReconciled: number;
    blocksMissing: number;
    blocksAdded: number;
    peersReconciled: string[];
    errors: never[];
  }> {
    return {
      blocksReconciled: 0,
      blocksMissing: 0,
      blocksAdded: 0,
      peersReconciled: [],
      errors: [],
    };
  }
  getDisconnectedPeers(): string[] {
    return [];
  }
  onEvent(): void {}
  offEvent(): void {}
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  isRunning(): boolean {
    return false;
  }
  getConfig(): {
    localNodeId: string;
    stalenessThresholdMs: number;
    queryTimeoutMs: number;
  } {
    return {
      localNodeId: 'test-node',
      stalenessThresholdMs: 300000,
      queryTimeoutMs: 10000,
    };
  }
  getLocalNodeId(): string {
    return 'test-node';
  }
}

// ── Mock Pooled Block Store ──

class MockPooledStore {
  readonly poolBlocks = new Map<string, Uint8Array>();
  readonly metadataMap = new Map<string, Partial<IBlockMetadata>>();
  readonly putCalls: Array<{ pool: PoolId; dataLength: number }> = [];
  readonly putKeyCalls: Array<{ key: string; dataLength: number }> = [];

  // IPooledBlockStore marker methods
  async hasInPool(pool: PoolId, hash: string): Promise<boolean> {
    return this.poolBlocks.has(`${pool}:${hash}`);
  }

  async putInPool(
    pool: PoolId,
    data: Uint8Array,
    _options?: BlockStoreOptions,
  ): Promise<string> {
    const hash = computeBlockId(data);
    this.poolBlocks.set(`${pool}:${hash}`, new Uint8Array(data));
    this.putCalls.push({ pool, dataLength: data.length });
    // Auto-create metadata with poolId
    this.metadataMap.set(hash, { blockId: hash, poolId: pool });
    return hash;
  }

  async getFromPool(pool: PoolId, hash: string): Promise<Uint8Array> {
    const data = this.poolBlocks.get(`${pool}:${hash}`);
    if (!data) throw new Error(`Block not found in pool "${pool}": ${hash}`);
    return data;
  }

  async deleteFromPool(pool: PoolId, hash: string): Promise<void> {
    this.poolBlocks.delete(`${pool}:${hash}`);
  }

  // IBlockStore methods
  get blockSize(): number {
    return 0;
  }

  async has(key: string): Promise<boolean> {
    return this.poolBlocks.has(key);
  }

  get(_key: string): { fullData: Uint8Array } {
    throw new Error('not implemented');
  }

  async put(key: string, data: Uint8Array): Promise<void> {
    this.putKeyCalls.push({ key, dataLength: data.length });
    const hash = computeBlockId(data);
    this.poolBlocks.set(hash, new Uint8Array(data));
    this.metadataMap.set(hash, { blockId: hash });
  }

  async delete(_key: string): Promise<void> {}

  async getData(): Promise<never> {
    throw new Error('not implemented');
  }
  async setData(): Promise<void> {
    throw new Error('not implemented');
  }
  async deleteData(): Promise<void> {
    throw new Error('not implemented');
  }
  async getRandomBlocks(): Promise<never[]> {
    return [];
  }

  async getMetadata(
    key: string | { toHex(): string },
  ): Promise<Partial<IBlockMetadata> | null> {
    const k = typeof key === 'string' ? key : key.toHex();
    return this.metadataMap.get(k) ?? null;
  }

  async updateMetadata(
    key: string | { toHex(): string },
    updates: Partial<IBlockMetadata>,
  ): Promise<void> {
    const k = typeof key === 'string' ? key : key.toHex();
    const existing = this.metadataMap.get(k) ?? {};
    this.metadataMap.set(k, { ...existing, ...updates });
  }

  async generateParityBlocks(): Promise<never[]> {
    return [];
  }
  async getParityBlocks(): Promise<never[]> {
    return [];
  }
  async recoverBlock(): Promise<{ success: boolean }> {
    return { success: false };
  }
  async verifyBlockIntegrity(): Promise<boolean> {
    return true;
  }
  async getBlocksPendingReplication(): Promise<never[]> {
    return [];
  }
  async getUnderReplicatedBlocks(): Promise<never[]> {
    return [];
  }
  async recordReplication(): Promise<void> {}
  async recordReplicaLoss(): Promise<void> {}
  async brightenBlock(): Promise<{
    brightenedBlockId: string;
    randomBlockIds: never[];
    originalBlockId: string;
  }> {
    return {
      brightenedBlockId: '',
      randomBlockIds: [],
      originalBlockId: '',
    };
  }
  async storeCBLWithWhitening(): Promise<{
    blockId1: string;
    blockId2: string;
  }> {
    return { blockId1: '', blockId2: '' };
  }
  async retrieveCBL(): Promise<Uint8Array> {
    return new Uint8Array(0);
  }
  parseCBLMagnetUrl(): {
    blockId1: string;
    blockId2: string;
    blockSize: number;
  } {
    return { blockId1: '', blockId2: '', blockSize: 0 };
  }
  generateCBLMagnetUrl(): string {
    return '';
  }
}

// ── Test Setup ──

function createTestSetup(configOverrides?: Partial<BlockFetcherConfig>): {
  transport: MockTransport;
  availability: MockAvailabilityService;
  store: MockPooledStore;
  fetcher: BlockFetcher;
} {
  const transport = new MockTransport();
  const availability = new MockAvailabilityService();
  const store = new MockPooledStore();
  const config: BlockFetcherConfig = {
    ...DEFAULT_BLOCK_FETCHER_CONFIG,
    maxRetries: 0, // No retries by default for faster tests
    nodeCooldownMs: 1000,
    ...configOverrides,
  };

  const fetcher = new BlockFetcher(
    transport,
    availability as unknown as IAvailabilityService,
    store as unknown as IBlockStore & IPooledBlockStore,
    config,
  );

  return { transport, availability, store, fetcher };
}

function registerBlock(
  setup: ReturnType<typeof createTestSetup>,
  data: Uint8Array,
  nodeId: string,
): string {
  const blockId = computeBlockId(data);
  setup.transport.responses.set(blockId, data);
  setup.availability.locations.set(blockId, [
    { nodeId, lastSeen: new Date(), isAuthoritative: true },
  ]);
  return blockId;
}

// ── Tests ──

describe('BlockFetcher', () => {
  describe('basic fetch behavior', () => {
    it('should fetch a block from a remote node and verify checksum', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(42);
      const blockId = registerBlock(setup, data, 'node-1');

      const result = await setup.fetcher.fetchBlock(blockId);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.attemptedNodes).toHaveLength(1);
      expect(result.attemptedNodes[0].nodeId).toBe('node-1');
      expect(result.attemptedNodes[0].error).toBeUndefined();
    });

    it('should return failure when no nodes are available', async () => {
      const setup = createTestSetup();
      const blockId = 'a'.repeat(128);

      const result = await setup.fetcher.fetchBlock(blockId);

      expect(result.success).toBe(false);
      expect(result.attemptedNodes).toHaveLength(0);
    });

    it('should reject blocks with checksum mismatch', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(42);
      const blockId = computeBlockId(data);

      // Register a different data under the same blockId
      const wrongData = makeBlockData(99);
      setup.transport.responses.set(blockId, wrongData);
      setup.availability.locations.set(blockId, [
        { nodeId: 'node-1', lastSeen: new Date(), isAuthoritative: true },
      ]);

      const result = await setup.fetcher.fetchBlock(blockId);

      expect(result.success).toBe(false);
      expect(result.attemptedNodes[0].error).toContain('Checksum mismatch');
    });
  });

  describe('Req 7.1: pool-scoped storage via putInPool', () => {
    it('should store fetched block in the specified pool via putInPool', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(1);
      const blockId = registerBlock(setup, data, 'node-1');
      const poolId = 'test-pool';

      const result = await setup.fetcher.fetchBlock(blockId, poolId);

      expect(result.success).toBe(true);
      // Verify putInPool was called with the correct pool
      expect(setup.store.putCalls).toHaveLength(1);
      expect(setup.store.putCalls[0].pool).toBe(poolId);
      expect(setup.store.putCalls[0].dataLength).toBe(data.length);
      // Verify block exists in the pool
      const exists = await setup.store.hasInPool(poolId, blockId);
      expect(exists).toBe(true);
    });

    it('should use regular put when no poolId is specified', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(2);
      const blockId = registerBlock(setup, data, 'node-1');

      const result = await setup.fetcher.fetchBlock(blockId);

      expect(result.success).toBe(true);
      // putInPool should NOT have been called
      expect(setup.store.putCalls).toHaveLength(0);
      // Regular put should have been called
      expect(setup.store.putKeyCalls).toHaveLength(1);
    });

    it('should pass poolId to transport for pool-scoped fetch', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(3);
      const blockId = registerBlock(setup, data, 'node-1');
      const poolId = 'my-pool';

      await setup.fetcher.fetchBlock(blockId, poolId);

      expect(setup.transport.calls).toHaveLength(1);
      expect(setup.transport.calls[0].poolId).toBe(poolId);
    });
  });

  describe('Req 7.2: pool metadata validation', () => {
    it('should validate that stored block metadata poolId matches requested poolId', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(10);
      const blockId = registerBlock(setup, data, 'node-1');
      const poolId = 'correct-pool';

      const result = await setup.fetcher.fetchBlock(blockId, poolId);

      expect(result.success).toBe(true);
      // Metadata should have been set with the correct poolId by putInPool
      const metadata = await setup.store.getMetadata(blockId);
      expect(metadata?.poolId).toBe(poolId);
    });
  });

  describe('Req 7.3: PoolMismatchError on metadata mismatch', () => {
    it('should throw PoolMismatchError when block metadata pool differs from requested pool', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(20);
      const blockId = registerBlock(setup, data, 'node-1');
      const requestedPool = 'pool-a';

      // Pre-set metadata with a different poolId to simulate mismatch
      setup.store.metadataMap.set(blockId, {
        blockId,
        poolId: 'pool-b',
      });

      // Override putInPool to NOT update metadata (simulating pre-existing wrong metadata)
      const _originalPutInPool = setup.store.putInPool.bind(setup.store);
      setup.store.putInPool = async (
        pool: PoolId,
        blockData: Uint8Array,
      ): Promise<string> => {
        const hash = computeBlockId(blockData);
        setup.store.poolBlocks.set(
          `${pool}:${hash}`,
          new Uint8Array(blockData),
        );
        setup.store.putCalls.push({ pool, dataLength: blockData.length });
        // Don't update metadata — leave the pre-existing wrong poolId
        return hash;
      };

      await expect(
        setup.fetcher.fetchBlock(blockId, requestedPool),
      ).rejects.toThrow(PoolMismatchError);

      try {
        await setup.fetcher.fetchBlock(blockId, requestedPool);
      } catch (error) {
        expect(error).toBeInstanceOf(PoolMismatchError);
        if (error instanceof PoolMismatchError) {
          expect(error.expectedPoolId).toBe(requestedPool);
          expect(error.actualPoolId).toBe('pool-b');
          expect(error.blockId).toBe(blockId);
        }
      }
    });

    it('should succeed when block metadata pool matches requested pool', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(21);
      const blockId = registerBlock(setup, data, 'node-1');
      const poolId = 'matching-pool';

      const result = await setup.fetcher.fetchBlock(blockId, poolId);

      expect(result.success).toBe(true);
    });

    it('should succeed when block has no pool metadata (legacy block)', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(22);
      const blockId = registerBlock(setup, data, 'node-1');
      const poolId = 'some-pool';

      // Override putInPool to set metadata without poolId
      setup.store.putInPool = async (
        pool: PoolId,
        blockData: Uint8Array,
      ): Promise<string> => {
        const hash = computeBlockId(blockData);
        setup.store.poolBlocks.set(
          `${pool}:${hash}`,
          new Uint8Array(blockData),
        );
        setup.store.putCalls.push({ pool, dataLength: blockData.length });
        // Set metadata without poolId (legacy)
        setup.store.metadataMap.set(hash, { blockId: hash });
        return hash;
      };

      const result = await setup.fetcher.fetchBlock(blockId, poolId);

      // Should succeed — no poolId in metadata means no mismatch
      expect(result.success).toBe(true);
    });
  });

  describe('Req 7.4: tuple reconstruction fetches all blocks into same pool', () => {
    it('should fetch multiple blocks into the same pool for tuple reconstruction', async () => {
      const setup = createTestSetup();
      const poolId = 'tuple-pool';

      // Simulate 3 blocks in a tuple
      const blocks = [
        makeBlockData(100),
        makeBlockData(200),
        makeBlockData(44),
      ];
      const blockIds = blocks.map((data) =>
        registerBlock(setup, data, 'node-1'),
      );

      // Fetch all blocks into the same pool (as tuple reconstruction would)
      for (const blockId of blockIds) {
        const result = await setup.fetcher.fetchBlock(blockId, poolId);
        expect(result.success).toBe(true);
      }

      // All 3 blocks should be stored in the same pool
      expect(setup.store.putCalls).toHaveLength(3);
      for (const call of setup.store.putCalls) {
        expect(call.pool).toBe(poolId);
      }

      // All blocks should exist in the pool
      for (const blockId of blockIds) {
        const exists = await setup.store.hasInPool(poolId, blockId);
        expect(exists).toBe(true);
      }
    });
  });

  describe('node health tracking', () => {
    it('should mark nodes as unavailable after fetch failure', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(50);
      const blockId = computeBlockId(data);

      // Return wrong data to trigger checksum mismatch
      setup.transport.responses.set(blockId, makeBlockData(99));
      setup.availability.locations.set(blockId, [
        { nodeId: 'bad-node', lastSeen: new Date(), isAuthoritative: true },
      ]);

      await setup.fetcher.fetchBlock(blockId);

      expect(setup.fetcher.isNodeAvailable('bad-node')).toBe(false);
    });

    it('should skip nodes in cooldown', async () => {
      const setup = createTestSetup();
      const data = makeBlockData(60);
      const blockId = registerBlock(setup, data, 'node-1');

      // Also add a second node
      setup.availability.locations.get(blockId)?.push({
        nodeId: 'node-2',
        lastSeen: new Date(),
        isAuthoritative: false,
      });

      // Mark node-1 as unavailable
      setup.fetcher.markNodeUnavailable('node-1');

      const result = await setup.fetcher.fetchBlock(blockId);

      expect(result.success).toBe(true);
      // Should have only tried node-2
      expect(setup.transport.calls).toHaveLength(1);
      expect(setup.transport.calls[0].nodeId).toBe('node-2');
    });
  });

  describe('retry behavior', () => {
    it('should retry on transient errors up to maxRetries', async () => {
      const setup = createTestSetup({ maxRetries: 2 });
      const data = makeBlockData(70);
      const blockId = registerBlock(setup, data, 'node-1');

      let callCount = 0;
      const originalFetch = setup.transport.fetchBlockFromNode.bind(
        setup.transport,
      );
      setup.transport.fetchBlockFromNode = async (
        nodeId: string,
        bid: string,
        poolId?: PoolId,
      ): Promise<Uint8Array> => {
        callCount++;
        if (callCount <= 2) {
          throw new Error('Transient error');
        }
        return originalFetch(nodeId, bid, poolId);
      };

      const result = await setup.fetcher.fetchBlock(blockId);

      expect(result.success).toBe(true);
      expect(callCount).toBe(3); // 1 initial + 2 retries
    });
  });

  describe('lifecycle', () => {
    it('should track running state', () => {
      const setup = createTestSetup();

      expect(setup.fetcher.isRunning()).toBe(false);

      setup.fetcher.start();
      expect(setup.fetcher.isRunning()).toBe(true);

      setup.fetcher.stop();
      expect(setup.fetcher.isRunning()).toBe(false);
    });

    it('should clear cooldowns on stop', () => {
      const setup = createTestSetup();

      setup.fetcher.markNodeUnavailable('node-1');
      expect(setup.fetcher.isNodeAvailable('node-1')).toBe(false);

      setup.fetcher.stop();
      expect(setup.fetcher.isNodeAvailable('node-1')).toBe(true);
    });

    it('should return config copy', () => {
      const setup = createTestSetup({ maxRetries: 5 });
      const config = setup.fetcher.getConfig();

      expect(config.maxRetries).toBe(5);
    });
  });

  describe('Req 6.1, 6.3: gossip-triggered proactive fetch', () => {
    // ── Mock GossipService that captures announcement handlers ──

    class MockGossipService implements IGossipService {
      private handlers: Set<AnnouncementHandler> = new Set();

      async announceBlock(): Promise<void> {}
      async announceRemoval(): Promise<void> {}
      async handleAnnouncement(): Promise<void> {}

      onAnnouncement(handler: AnnouncementHandler): void {
        this.handlers.add(handler);
      }

      offAnnouncement(handler: AnnouncementHandler): void {
        this.handlers.delete(handler);
      }

      getPendingAnnouncements(): BlockAnnouncement[] {
        return [];
      }
      async flushAnnouncements(): Promise<void> {}
      start(): void {}
      async stop(): Promise<void> {}
      getConfig(): GossipConfig {
        return {
          fanout: 3,
          defaultTtl: 3,
          batchIntervalMs: 1000,
          maxBatchSize: 100,
          messagePriority: {
            normal: { fanout: 5, ttl: 5 },
            high: { fanout: 7, ttl: 7 },
          },
        };
      }
      async announceMessage(): Promise<void> {}
      async sendDeliveryAck(): Promise<void> {}
      onMessageDelivery(): void {}
      offMessageDelivery(): void {}
      onDeliveryAck(): void {}
      offDeliveryAck(): void {}

      /** Simulate an announcement arriving from the network */
      emitAnnouncement(announcement: BlockAnnouncement): void {
        for (const handler of this.handlers) {
          handler(announcement);
        }
      }

      get handlerCount(): number {
        return this.handlers.size;
      }
    }

    // ── Mock FetchQueue that tracks enqueue calls ──

    class MockFetchQueue implements IFetchQueue {
      readonly enqueuedBlockIds: string[] = [];

      async enqueue(blockId: string): Promise<BlockFetchResult> {
        this.enqueuedBlockIds.push(blockId);
        return {
          success: true,
          data: new Uint8Array(0),
          attemptedNodes: [],
        };
      }

      getPendingCount(): number {
        return 0;
      }
      getActiveCount(): number {
        return 0;
      }
      cancelAll(): void {}
      getConfig(): FetchQueueConfig {
        return { maxConcurrency: 5, fetchTimeoutMs: 10000 };
      }
    }

    function makeAnnouncement(
      type: 'add' | 'remove' | 'ack',
      blockId: string,
    ): BlockAnnouncement {
      return {
        type,
        blockId,
        nodeId: 'remote-node-1',
        timestamp: new Date(),
        ttl: 3,
      };
    }

    function createGossipTestSetup(proactiveFetchEnabled: boolean): {
      transport: MockTransport;
      availability: MockAvailabilityService;
      store: MockPooledStore;
      gossip: MockGossipService;
      fetchQueue: MockFetchQueue;
      fetcher: BlockFetcher;
    } {
      const transport = new MockTransport();
      const availability = new MockAvailabilityService();
      const store = new MockPooledStore();
      const gossip = new MockGossipService();
      const fetchQueue = new MockFetchQueue();
      const config: BlockFetcherConfig = {
        ...DEFAULT_BLOCK_FETCHER_CONFIG,
        maxRetries: 0,
        proactiveFetchEnabled,
      };

      const fetcher = new BlockFetcher(
        transport,
        availability as unknown as IAvailabilityService,
        store as unknown as IBlockStore & IPooledBlockStore,
        config,
        gossip,
        fetchQueue,
      );

      return { transport, availability, store, gossip, fetchQueue, fetcher };
    }

    it('should enqueue fetch when proactive fetch enabled and add announcement for remote block', async () => {
      const { availability, gossip, fetchQueue, fetcher } =
        createGossipTestSetup(true);
      const blockId = 'a'.repeat(128);

      // Block is remote — not locally accessible
      availability.getAvailabilityState = async (): Promise<string> =>
        AvailabilityState.Remote;

      fetcher.start();
      gossip.emitAnnouncement(makeAnnouncement('add', blockId));

      // handleProactiveAnnouncement is async fire-and-forget; give it a tick
      await new Promise((r) => setTimeout(r, 10));

      expect(fetchQueue.enqueuedBlockIds).toContain(blockId);

      fetcher.stop();
    });

    it('should NOT enqueue fetch when block is already locally accessible', async () => {
      const { availability, gossip, fetchQueue, fetcher } =
        createGossipTestSetup(true);
      const blockId = 'b'.repeat(128);

      // Block is local — already accessible
      availability.getAvailabilityState = async (): Promise<string> =>
        AvailabilityState.Local;

      fetcher.start();
      gossip.emitAnnouncement(makeAnnouncement('add', blockId));

      await new Promise((r) => setTimeout(r, 10));

      expect(fetchQueue.enqueuedBlockIds).toHaveLength(0);

      fetcher.stop();
    });

    it('should NOT enqueue fetch for remove announcements', async () => {
      const { availability, gossip, fetchQueue, fetcher } =
        createGossipTestSetup(true);
      const blockId = 'c'.repeat(128);

      availability.getAvailabilityState = async (): Promise<string> =>
        AvailabilityState.Remote;

      fetcher.start();
      gossip.emitAnnouncement(makeAnnouncement('remove', blockId));

      await new Promise((r) => setTimeout(r, 10));

      expect(fetchQueue.enqueuedBlockIds).toHaveLength(0);

      fetcher.stop();
    });

    it('should NOT subscribe to announcements when proactive fetch is disabled', () => {
      const { gossip, fetcher } = createGossipTestSetup(false);

      fetcher.start();

      // No handlers should have been registered
      expect(gossip.handlerCount).toBe(0);

      fetcher.stop();
    });

    it('should stop processing announcements after stop() is called', async () => {
      const { availability, gossip, fetchQueue, fetcher } =
        createGossipTestSetup(true);
      const blockId = 'd'.repeat(128);

      availability.getAvailabilityState = async (): Promise<string> =>
        AvailabilityState.Remote;

      fetcher.start();
      expect(gossip.handlerCount).toBe(1);

      fetcher.stop();
      expect(gossip.handlerCount).toBe(0);

      // Emit after stop — should not trigger enqueue
      gossip.emitAnnouncement(makeAnnouncement('add', blockId));

      await new Promise((r) => setTimeout(r, 10));

      expect(fetchQueue.enqueuedBlockIds).toHaveLength(0);
    });
  });
});
