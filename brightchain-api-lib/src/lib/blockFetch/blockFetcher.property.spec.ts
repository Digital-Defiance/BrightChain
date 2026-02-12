/**
 * @fileoverview Property-based tests for BlockFetcher
 *
 * Feature: cross-node-eventual-consistency
 *
 * Property 1: Checksum verification rejects tampered blocks
 * **Validates: Requirements 1.3**
 *
 * Property 2: Failover exhausts all candidate nodes and reports attempts
 * **Validates: Requirements 1.4, 1.5**
 */

import {
  BlockFetcherConfig,
  BlockFetchResult,
  ChecksumService,
  DEFAULT_BLOCK_FETCHER_CONFIG,
  IAvailabilityService,
  IBlockFetchTransport,
  IBlockMetadata,
  IBlockStore,
  IFetchQueue,
  IGossipService,
  PoolId,
} from '@brightchain/brightchain-lib';
import fc from 'fast-check';
import { BlockFetcher } from './blockFetcher';

// ── Helpers ──

const checksumService = new ChecksumService();

/** Compute a block ID (SHA3-512 hex) from data */
function computeBlockId(data: Uint8Array): string {
  return checksumService.calculateChecksum(data).toHex();
}

/**
 * Tamper with block data by flipping a byte at the given index.
 * The flipValue is XOR'd with the byte to guarantee the data changes
 * (flipValue is constrained to 1–255 so XOR always produces a different byte).
 */
function tamperData(
  original: Uint8Array,
  flipIndex: number,
  flipValue: number,
): Uint8Array {
  const tampered = new Uint8Array(original);
  tampered[flipIndex] = tampered[flipIndex] ^ flipValue;
  return tampered;
}

// ── Minimal Mock Transport ──

class MockTransport implements IBlockFetchTransport {
  readonly responses = new Map<string, Uint8Array>();

  async fetchBlockFromNode(
    _nodeId: string,
    blockId: string,
    _poolId?: PoolId,
  ): Promise<Uint8Array> {
    const data = this.responses.get(blockId);
    if (!data) {
      throw new Error(`Block ${blockId} not found`);
    }
    return data;
  }
}

// ── Minimal Mock Availability Service ──

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

// ── Minimal Mock Store ──

class MockStore {
  readonly putCalls: Array<{ key: string; dataLength: number }> = [];

  get blockSize(): number {
    return 0;
  }
  async has(_key: string): Promise<boolean> {
    return false;
  }
  get(_key: string): { fullData: Uint8Array } {
    throw new Error('not implemented');
  }
  async put(key: string, data: Uint8Array): Promise<void> {
    this.putCalls.push({ key, dataLength: data.length });
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
    _key: string | { toHex(): string },
  ): Promise<Partial<IBlockMetadata> | null> {
    return null;
  }
  async updateMetadata(): Promise<void> {}
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
    return { brightenedBlockId: '', randomBlockIds: [], originalBlockId: '' };
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
  store: MockStore;
  fetcher: BlockFetcher;
} {
  const transport = new MockTransport();
  const availability = new MockAvailabilityService();
  const store = new MockStore();
  const config: BlockFetcherConfig = {
    ...DEFAULT_BLOCK_FETCHER_CONFIG,
    maxRetries: 0, // No retries — we want a single attempt per node
    nodeCooldownMs: 1000,
    ...configOverrides,
  };

  const fetcher = new BlockFetcher(
    transport,
    availability as unknown as IAvailabilityService,
    store as unknown as IBlockStore,
    config,
  );

  return { transport, availability, store, fetcher };
}

// ── Arbitraries ──

/** Arbitrary block data: non-empty Uint8Array (1–256 bytes) */
const arbBlockData = fc.uint8Array({ minLength: 1, maxLength: 256 });

/** Arbitrary flip value: 1–255 (never 0, so XOR always changes the byte) */
const arbFlipValue = fc.integer({ min: 1, max: 255 });

/** Arbitrary node ID */
const arbNodeId = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')), {
    minLength: 4,
    maxLength: 16,
  })
  .map((chars) => `node-${chars.join('')}`);

// ── Property Tests ──

describe('Feature: cross-node-eventual-consistency, Property 1: Checksum verification rejects tampered blocks', () => {
  /**
   * **Validates: Requirements 1.3**
   *
   * For any block data and any single-byte tampering, when the transport
   * returns tampered data for a block ID computed from the original data,
   * the BlockFetcher SHALL reject the data (success: false) and SHALL NOT
   * store it in the local store.
   */
  it('rejects tampered block data and does not store it locally', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockData,
        arbFlipValue,
        arbNodeId,
        async (originalData: Uint8Array, flipValue: number, nodeId: string) => {
          // Compute the correct block ID from the original data
          const blockId = computeBlockId(originalData);

          // Pick a random index to tamper (derived from data to stay deterministic)
          const flipIndex = flipValue % originalData.length;

          // Tamper the data so its checksum no longer matches blockId
          const tamperedData = tamperData(originalData, flipIndex, flipValue);

          // Verify the tampering actually changed the data
          const tamperedChecksum = computeBlockId(tamperedData);
          if (tamperedChecksum === blockId) {
            // Extremely unlikely with SHA3-512, but skip if collision occurs
            return;
          }

          // Set up: transport returns tampered data for the correct blockId
          const setup = createTestSetup();
          setup.transport.responses.set(blockId, tamperedData);
          setup.availability.locations.set(blockId, [
            { nodeId, lastSeen: new Date(), isAuthoritative: true },
          ]);

          // Act
          const result = await setup.fetcher.fetchBlock(blockId);

          // Assert: fetch must fail
          expect(result.success).toBe(false);

          // Assert: the store must NOT have been called
          expect(setup.store.putCalls).toHaveLength(0);

          // Assert: the attempted node should report a checksum mismatch error
          expect(result.attemptedNodes.length).toBeGreaterThanOrEqual(1);
          const nodeAttempt = result.attemptedNodes.find(
            (n) => n.nodeId === nodeId,
          );
          expect(nodeAttempt).toBeDefined();
          expect(nodeAttempt?.error).toContain('Checksum mismatch');
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);
});

// ── Property 2: Failover exhausts all candidate nodes ──

describe('Feature: cross-node-eventual-consistency, Property 2: Failover exhausts all candidate nodes and reports attempts', () => {
  /**
   * **Validates: Requirements 1.4, 1.5**
   *
   * For any set of 1–5 unique node IDs where every node fails,
   * the BlockFetcher SHALL attempt each non-cooldown node in order,
   * and the resulting BlockFetchResult.attemptedNodes array SHALL
   * contain an entry for every node that was tried, each with an
   * error description.
   */
  it('attempts every candidate node and reports each failure', async () => {
    /** Generate 1–5 unique node IDs */
    const arbUniqueNodeIds = fc
      .uniqueArray(arbNodeId, { minLength: 1, maxLength: 5 })
      .filter((ids) => ids.length >= 1);

    await fc.assert(
      fc.asyncProperty(arbUniqueNodeIds, async (nodeIds: string[]) => {
        // Use a transport that always throws for every node
        const failingTransport: IBlockFetchTransport = {
          async fetchBlockFromNode(
            nodeId: string,
            _blockId: string,
            _poolId?: PoolId,
          ): Promise<Uint8Array> {
            throw new Error(`Connection refused from ${nodeId}`);
          },
        };

        const availability = new MockAvailabilityService();
        const store = new MockStore();

        // Use a fixed blockId — the actual value doesn't matter since all fetches fail
        const blockId = 'deadbeef'.repeat(16); // 128 hex chars (SHA3-512 length)

        // Register all nodes as locations for this block
        availability.locations.set(
          blockId,
          nodeIds.map((nodeId) => ({
            nodeId,
            lastSeen: new Date(),
            isAuthoritative: true,
          })),
        );

        const config: BlockFetcherConfig = {
          ...DEFAULT_BLOCK_FETCHER_CONFIG,
          maxRetries: 0, // Each node gets exactly one attempt
          nodeCooldownMs: 60000,
          fetchTimeoutMs: 30000, // High timeout so it doesn't interfere
        };

        const fetcher = new BlockFetcher(
          failingTransport,
          availability as unknown as IAvailabilityService,
          store as unknown as IBlockStore,
          config,
        );

        // Act
        const result = await fetcher.fetchBlock(blockId);

        // Assert: fetch must fail
        expect(result.success).toBe(false);

        // Assert: attemptedNodes has an entry for every node
        expect(result.attemptedNodes).toHaveLength(nodeIds.length);

        // Assert: each attempted node matches one of the input node IDs
        const attemptedIds = result.attemptedNodes.map((n) => n.nodeId);
        expect(attemptedIds).toEqual(nodeIds);

        // Assert: every entry has an error description
        for (const attempt of result.attemptedNodes) {
          expect(attempt.error).toBeDefined();
          expect(typeof attempt.error).toBe('string');
          expect(attempt.error!.length).toBeGreaterThan(0);
        }

        // Assert: the overall error message mentions the node count
        expect(result.error).toContain(
          `${nodeIds.length} candidate nodes failed`,
        );
      }),
      { numRuns: 100 },
    );
  }, 30000);
});

// ── Property 3: Successful fetch transitions state to Cached ──

describe('Feature: cross-node-eventual-consistency, Property 3: Successful fetch transitions state to Cached', () => {
  /**
   * **Validates: Requirements 1.2**
   *
   * For any block with Remote availability state, if the Block_Fetcher
   * successfully retrieves the block data, the block SHALL be present
   * in the local store (via store.put) with the correct blockId and data.
   *
   * Note: The BlockFetcher stores the block via store.put(). The actual
   * availability state transition to Cached is handled by
   * AvailabilityAwareBlockStore (Task 7). This property verifies the
   * prerequisite: the block IS stored locally after a successful fetch.
   */
  it('stores the fetched block locally with correct blockId and data on successful fetch', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockData,
        arbNodeId,
        async (blockData: Uint8Array, nodeId: string) => {
          // Compute the correct blockId from the generated data
          const blockId = computeBlockId(blockData);

          // Set up: transport returns correct data whose checksum matches blockId
          const setup = createTestSetup();
          setup.transport.responses.set(blockId, blockData);
          setup.availability.locations.set(blockId, [
            { nodeId, lastSeen: new Date(), isAuthoritative: true },
          ]);

          // Act
          const result = await setup.fetcher.fetchBlock(blockId);

          // Assert: fetch must succeed
          expect(result.success).toBe(true);
          expect(result.data).toBeDefined();

          // Assert: the returned data matches the original block data
          expect(result.data).toEqual(blockData);

          // Assert: the store received exactly one put() call
          expect(setup.store.putCalls).toHaveLength(1);

          // Assert: the put() call used the correct blockId
          expect(setup.store.putCalls[0].key).toBe(blockId);

          // Assert: the put() call stored data of the correct length
          expect(setup.store.putCalls[0].dataLength).toBe(blockData.length);

          // Assert: the attempted node is recorded without an error
          expect(result.attemptedNodes).toHaveLength(1);
          expect(result.attemptedNodes[0].nodeId).toBe(nodeId);
          expect(result.attemptedNodes[0].error).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  /**
   * **Validates: Requirements 1.2**
   *
   * For any block with Remote availability state across multiple candidate
   * nodes where the first node fails but a subsequent node succeeds,
   * the block SHALL still be stored locally after the successful failover fetch.
   */
  it('stores the block locally even when fetched via failover to a later node', async () => {
    /** Generate 2–4 unique node IDs for failover scenario */
    const arbFailoverNodeIds = fc
      .uniqueArray(arbNodeId, { minLength: 2, maxLength: 4 })
      .filter((ids) => ids.length >= 2);

    await fc.assert(
      fc.asyncProperty(
        arbBlockData,
        arbFailoverNodeIds,
        async (blockData: Uint8Array, nodeIds: string[]) => {
          const blockId = computeBlockId(blockData);

          // The last node succeeds; all others fail
          const successNodeId = nodeIds[nodeIds.length - 1];
          const failingNodeIds = nodeIds.slice(0, -1);

          // Custom transport: fails for all nodes except the last one
          const transport: IBlockFetchTransport = {
            async fetchBlockFromNode(
              nodeId: string,
              _blockId: string,
              _poolId?: PoolId,
            ): Promise<Uint8Array> {
              if (failingNodeIds.includes(nodeId)) {
                throw new Error(`Connection refused from ${nodeId}`);
              }
              return blockData;
            },
          };

          const availability = new MockAvailabilityService();
          const store = new MockStore();

          availability.locations.set(
            blockId,
            nodeIds.map((nid) => ({
              nodeId: nid,
              lastSeen: new Date(),
              isAuthoritative: true,
            })),
          );

          const config: BlockFetcherConfig = {
            ...DEFAULT_BLOCK_FETCHER_CONFIG,
            maxRetries: 0,
            nodeCooldownMs: 60000,
            fetchTimeoutMs: 30000,
          };

          const fetcher = new BlockFetcher(
            transport,
            availability as unknown as IAvailabilityService,
            store as unknown as IBlockStore,
            config,
          );

          // Act
          const result = await fetcher.fetchBlock(blockId);

          // Assert: fetch must succeed via failover
          expect(result.success).toBe(true);
          expect(result.data).toEqual(blockData);

          // Assert: the store received exactly one put() call with the correct blockId
          expect(store.putCalls).toHaveLength(1);
          expect(store.putCalls[0].key).toBe(blockId);
          expect(store.putCalls[0].dataLength).toBe(blockData.length);

          // Assert: the successful node is recorded
          const successAttempt = result.attemptedNodes.find(
            (n) => n.nodeId === successNodeId,
          );
          expect(successAttempt).toBeDefined();
          expect(successAttempt?.error).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);
});

// ── Property 13: Retry count respects maxRetries configuration ──

describe('Feature: cross-node-eventual-consistency, Property 13: Retry count respects maxRetries configuration', () => {
  /**
   * **Validates: Requirements 7.1**
   *
   * For any block fetch where the transport consistently fails with transient
   * errors, the total number of transport invocations for a single node SHALL
   * be at most maxRetries + 1 (1 initial attempt + maxRetries retries).
   */
  it('invokes transport exactly maxRetries + 1 times per node on persistent failure', async () => {
    /** Arbitrary maxRetries: 0 to 5 */
    const arbMaxRetries = fc.integer({ min: 0, max: 5 });

    await fc.assert(
      fc.asyncProperty(
        arbMaxRetries,
        arbNodeId,
        async (maxRetries: number, nodeId: string) => {
          // Track how many times the transport is called for this node
          let transportCallCount = 0;

          const countingTransport: IBlockFetchTransport = {
            async fetchBlockFromNode(
              _nodeId: string,
              _blockId: string,
              _poolId?: PoolId,
            ): Promise<Uint8Array> {
              transportCallCount++;
              throw new Error('Transient network error');
            },
          };

          const availability = new MockAvailabilityService();
          const store = new MockStore();

          // Use a fixed blockId — the value doesn't matter since all fetches fail
          const blockId = 'deadbeef'.repeat(16); // 128 hex chars (SHA3-512 length)

          // Register a single node as the only location
          availability.locations.set(blockId, [
            { nodeId, lastSeen: new Date(), isAuthoritative: true },
          ]);

          const config: BlockFetcherConfig = {
            ...DEFAULT_BLOCK_FETCHER_CONFIG,
            maxRetries,
            retryBaseDelayMs: 1, // Minimal backoff to keep tests fast
            nodeCooldownMs: 60000,
            fetchTimeoutMs: 60000, // High timeout so it doesn't interfere
          };

          const fetcher = new BlockFetcher(
            countingTransport,
            availability as unknown as IAvailabilityService,
            store as unknown as IBlockStore,
            config,
          );

          // Act
          const result = await fetcher.fetchBlock(blockId);

          // Assert: fetch must fail since the transport always throws
          expect(result.success).toBe(false);

          // Assert: transport was called exactly maxRetries + 1 times
          // (1 initial attempt + maxRetries retries)
          expect(transportCallCount).toBe(maxRetries + 1);
        },
      ),
      { numRuns: 100 },
    );
  }, 60000);
});

// ── Property 14: Node cooldown excludes failed nodes from candidate list ──

describe('Feature: cross-node-eventual-consistency, Property 14: Node cooldown excludes failed nodes from candidate list', () => {
  /**
   * **Validates: Requirements 7.2**
   *
   * For any node that has been marked unavailable, subsequent fetch attempts
   * within the cooldown period SHALL not include that node in the candidate
   * list. After the cooldown period expires, the node SHALL be eligible again.
   */
  it('marks a node unavailable and isNodeAvailable returns false within cooldown, true after expiry', async () => {
    /** Arbitrary cooldown period: 100–5000 ms */
    const arbCooldownMs = fc.integer({ min: 100, max: 5000 });

    await fc.assert(
      fc.asyncProperty(
        arbNodeId,
        arbCooldownMs,
        async (nodeId: string, cooldownMs: number) => {
          const setup = createTestSetup({ nodeCooldownMs: cooldownMs });

          // Before marking: node should be available
          expect(setup.fetcher.isNodeAvailable(nodeId)).toBe(true);

          // Mark the node as unavailable
          setup.fetcher.markNodeUnavailable(nodeId);

          // Immediately after marking: node should NOT be available
          expect(setup.fetcher.isNodeAvailable(nodeId)).toBe(false);

          // Advance time past the cooldown using fake timers
          jest.useFakeTimers();
          jest.setSystemTime(Date.now() + cooldownMs + 1);

          // After cooldown expires: node should be available again
          expect(setup.fetcher.isNodeAvailable(nodeId)).toBe(true);

          jest.useRealTimers();
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  /**
   * **Validates: Requirements 7.2**
   *
   * For any fetch with two candidate nodes where one is marked unavailable,
   * the transport SHALL only be called for the available node, not the
   * cooled-down node.
   */
  it('skips cooled-down nodes during fetch and only calls available nodes', async () => {
    /** Generate exactly 2 unique node IDs */
    const arbTwoNodeIds = fc
      .uniqueArray(arbNodeId, { minLength: 2, maxLength: 2 })
      .filter((ids) => ids.length === 2);

    await fc.assert(
      fc.asyncProperty(
        arbBlockData,
        arbTwoNodeIds,
        async (blockData: Uint8Array, nodeIds: string[]) => {
          const blockId = computeBlockId(blockData);
          const [cooledDownNode, availableNode] = nodeIds;

          // Track which nodes the transport was called with
          const calledNodes: string[] = [];

          const trackingTransport: IBlockFetchTransport = {
            async fetchBlockFromNode(
              nodeId: string,
              _blockId: string,
              _poolId?: PoolId,
            ): Promise<Uint8Array> {
              calledNodes.push(nodeId);
              return blockData;
            },
          };

          const availability = new MockAvailabilityService();
          const store = new MockStore();

          // Register both nodes as locations
          availability.locations.set(blockId, [
            {
              nodeId: cooledDownNode,
              lastSeen: new Date(),
              isAuthoritative: true,
            },
            {
              nodeId: availableNode,
              lastSeen: new Date(),
              isAuthoritative: true,
            },
          ]);

          const config: BlockFetcherConfig = {
            ...DEFAULT_BLOCK_FETCHER_CONFIG,
            maxRetries: 0,
            nodeCooldownMs: 60000, // Long cooldown so it won't expire during test
            fetchTimeoutMs: 30000,
          };

          const fetcher = new BlockFetcher(
            trackingTransport,
            availability as unknown as IAvailabilityService,
            store as unknown as IBlockStore,
            config,
          );

          // Mark the first node as unavailable
          fetcher.markNodeUnavailable(cooledDownNode);

          // Act: fetch the block
          const result = await fetcher.fetchBlock(blockId);

          // Assert: fetch succeeds via the available node
          expect(result.success).toBe(true);

          // Assert: the cooled-down node was NOT called
          expect(calledNodes).not.toContain(cooledDownNode);

          // Assert: only the available node was called
          expect(calledNodes).toEqual([availableNode]);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  /**
   * **Validates: Requirements 7.2**
   *
   * When ALL candidate nodes are in cooldown, the fetch SHALL return
   * failure with no attempted nodes (since none are eligible).
   */
  it('returns failure with no attempted nodes when all candidates are in cooldown', async () => {
    /** Generate 1–4 unique node IDs */
    const arbNodeIds = fc
      .uniqueArray(arbNodeId, { minLength: 1, maxLength: 4 })
      .filter((ids) => ids.length >= 1);

    await fc.assert(
      fc.asyncProperty(arbNodeIds, async (nodeIds: string[]) => {
        const blockId = 'deadbeef'.repeat(16);

        let transportCallCount = 0;
        const transport: IBlockFetchTransport = {
          async fetchBlockFromNode(): Promise<Uint8Array> {
            transportCallCount++;
            return new Uint8Array(0);
          },
        };

        const availability = new MockAvailabilityService();
        const store = new MockStore();

        availability.locations.set(
          blockId,
          nodeIds.map((nodeId) => ({
            nodeId,
            lastSeen: new Date(),
            isAuthoritative: true,
          })),
        );

        const config: BlockFetcherConfig = {
          ...DEFAULT_BLOCK_FETCHER_CONFIG,
          maxRetries: 0,
          nodeCooldownMs: 60000,
          fetchTimeoutMs: 30000,
        };

        const fetcher = new BlockFetcher(
          transport,
          availability as unknown as IAvailabilityService,
          store as unknown as IBlockStore,
          config,
        );

        // Mark ALL nodes as unavailable
        for (const nodeId of nodeIds) {
          fetcher.markNodeUnavailable(nodeId);
        }

        // Act
        const result = await fetcher.fetchBlock(blockId);

        // Assert: fetch must fail
        expect(result.success).toBe(false);

        // Assert: no nodes were attempted (all filtered out by cooldown)
        expect(result.attemptedNodes).toHaveLength(0);

        // Assert: transport was never called
        expect(transportCallCount).toBe(0);

        // Assert: error mentions no available nodes
        expect(result.error).toContain('No available nodes');
      }),
      { numRuns: 100 },
    );
  }, 30000);
});

// ── Property 12: Proactive fetch disabled means no data transfers on announcements ──

describe('Feature: cross-node-eventual-consistency, Property 12: Proactive fetch disabled means no data transfers on announcements', () => {
  /**
   * **Validates: Requirements 6.3**
   *
   * For any block announcement received when `proactiveFetchEnabled` is false,
   * the FetchQueue SHALL not receive any new enqueue calls as a result of
   * that announcement.
   */

  /** Arbitrary block ID: 128 hex chars (SHA3-512 length) */
  const arbBlockId = fc
    .array(fc.constantFrom(...'0123456789abcdef'.split('')), {
      minLength: 128,
      maxLength: 128,
    })
    .map((chars) => chars.join(''));

  /** Arbitrary announcement type */
  const arbAnnouncementType = fc.constantFrom(
    'add' as const,
    'remove' as const,
  );

  /** Arbitrary TTL: 1–10 */
  const arbTtl = fc.integer({ min: 1, max: 10 });

  /**
   * Mock IGossipService that captures onAnnouncement/offAnnouncement calls
   * and allows simulating announcements by calling registered handlers.
   */
  class MockGossipService {
    private handlers: Array<
      (announcement: {
        type: 'add' | 'remove' | 'ack';
        blockId: string;
        nodeId: string;
        timestamp: Date;
        ttl: number;
      }) => void
    > = [];

    readonly onAnnouncementCalls: number[] = [];
    readonly offAnnouncementCalls: number[] = [];

    onAnnouncement(
      handler: (announcement: {
        type: 'add' | 'remove' | 'ack';
        blockId: string;
        nodeId: string;
        timestamp: Date;
        ttl: number;
      }) => void,
    ): void {
      this.onAnnouncementCalls.push(Date.now());
      this.handlers.push(handler);
    }

    offAnnouncement(
      handler: (announcement: {
        type: 'add' | 'remove' | 'ack';
        blockId: string;
        nodeId: string;
        timestamp: Date;
        ttl: number;
      }) => void,
    ): void {
      this.offAnnouncementCalls.push(Date.now());
      this.handlers = this.handlers.filter((h) => h !== handler);
    }

    /** Simulate an announcement being received from a peer */
    simulateAnnouncement(announcement: {
      type: 'add' | 'remove' | 'ack';
      blockId: string;
      nodeId: string;
      timestamp: Date;
      ttl: number;
    }): void {
      for (const handler of this.handlers) {
        handler(announcement);
      }
    }

    get handlerCount(): number {
      return this.handlers.length;
    }

    // Stub remaining IGossipService methods
    async announceBlock(): Promise<void> {}
    async announceRemoval(): Promise<void> {}
    async handleAnnouncement(): Promise<void> {}
    getPendingAnnouncements(): never[] {
      return [];
    }
    async flushAnnouncements(): Promise<void> {}
    start(): void {}
    async stop(): Promise<void> {}
    getConfig(): {
      fanout: number;
      defaultTtl: number;
      batchIntervalMs: number;
      maxBatchSize: number;
      messagePriority: {
        normal: { fanout: number; ttl: number };
        high: { fanout: number; ttl: number };
      };
    } {
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
  }

  /**
   * Mock IFetchQueue that tracks all enqueue calls.
   */
  class MockFetchQueue {
    readonly enqueueCalls: Array<{ blockId: string; poolId?: PoolId }> = [];

    async enqueue(blockId: string, poolId?: PoolId): Promise<BlockFetchResult> {
      this.enqueueCalls.push({ blockId, poolId });
      return { success: true, data: new Uint8Array(0), attemptedNodes: [] };
    }

    getPendingCount(): number {
      return 0;
    }
    getActiveCount(): number {
      return 0;
    }
    cancelAll(): void {}
    getConfig(): { maxConcurrency: number; fetchTimeoutMs: number } {
      return { maxConcurrency: 5, fetchTimeoutMs: 10000 };
    }
  }

  it('does not subscribe to gossip and fetchQueue receives no enqueue calls when proactiveFetchEnabled is false', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockId,
        arbAnnouncementType,
        arbTtl,
        arbNodeId,
        async (
          blockId: string,
          announcementType: 'add' | 'remove',
          ttl: number,
          sourceNodeId: string,
        ) => {
          const transport = new MockTransport();
          const availability = new MockAvailabilityService();
          const store = new MockStore();
          const gossipService = new MockGossipService();
          const fetchQueue = new MockFetchQueue();

          const config: BlockFetcherConfig = {
            ...DEFAULT_BLOCK_FETCHER_CONFIG,
            proactiveFetchEnabled: false, // Key: proactive fetch is DISABLED
          };

          const fetcher = new BlockFetcher(
            transport,
            availability as unknown as IAvailabilityService,
            store as unknown as IBlockStore,
            config,
            gossipService as unknown as IGossipService,
            fetchQueue as unknown as IFetchQueue,
          );

          // Start the fetcher — with proactiveFetchEnabled=false, it should NOT subscribe
          fetcher.start();

          // Verify: no announcement handler was registered
          expect(gossipService.onAnnouncementCalls).toHaveLength(0);
          expect(gossipService.handlerCount).toBe(0);

          // Simulate an announcement anyway (directly on the gossip service)
          gossipService.simulateAnnouncement({
            type: announcementType,
            blockId,
            nodeId: sourceNodeId,
            timestamp: new Date(),
            ttl,
          });

          // Allow any async handlers to settle
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 50);
          });

          // Assert: fetchQueue.enqueue was NEVER called
          expect(fetchQueue.enqueueCalls).toHaveLength(0);

          // Clean up
          fetcher.stop();
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  it('does not enqueue fetches even when gossipService and fetchQueue are provided but proactiveFetchEnabled is false', async () => {
    /**
     * Generate multiple announcements to verify the property holds across
     * multiple announcements, not just a single one.
     */

    await fc.assert(
      fc.asyncProperty(
        fc.array(arbBlockId, { minLength: 1, maxLength: 5 }),
        arbNodeId,
        async (blockIds: string[], sourceNodeId: string) => {
          const transport = new MockTransport();
          const availability = new MockAvailabilityService();
          const store = new MockStore();
          const gossipService = new MockGossipService();
          const fetchQueue = new MockFetchQueue();

          const config: BlockFetcherConfig = {
            ...DEFAULT_BLOCK_FETCHER_CONFIG,
            proactiveFetchEnabled: false,
          };

          const fetcher = new BlockFetcher(
            transport,
            availability as unknown as IAvailabilityService,
            store as unknown as IBlockStore,
            config,
            gossipService as unknown as IGossipService,
            fetchQueue as unknown as IFetchQueue,
          );

          fetcher.start();

          // Simulate multiple 'add' announcements
          for (const blockId of blockIds) {
            gossipService.simulateAnnouncement({
              type: 'add',
              blockId,
              nodeId: sourceNodeId,
              timestamp: new Date(),
              ttl: 3,
            });
          }

          // Allow any async handlers to settle
          await new Promise<void>((resolve) => {
            setTimeout(resolve, 50);
          });

          // Assert: fetchQueue.enqueue was NEVER called for any announcement
          expect(fetchQueue.enqueueCalls).toHaveLength(0);

          fetcher.stop();
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);
});
