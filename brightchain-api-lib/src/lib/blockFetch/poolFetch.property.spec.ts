/**
 * @fileoverview Property-based tests for pool-scoped block fetching
 *
 * Feature: cross-node-eventual-consistency, Property 10: Pool-scoped fetch stores block in correct namespace
 *
 * Property 10: For any block with a pool ID, after a successful remote fetch,
 * the block SHALL be stored under the pool-scoped key (`${poolId}:${blockId}`)
 * and SHALL be retrievable via the PooledStoreAdapter for that pool.
 *
 * **Validates: Requirements 5.1, 5.2**
 */

import {
  BlockFetcherConfig,
  BlockStoreOptions,
  DEFAULT_BLOCK_FETCHER_CONFIG,
  IAvailabilityService,
  IBlockFetchTransport,
  IBlockMetadata,
  IBlockStore,
  IPooledBlockStore,
  PoolId,
  PoolMismatchError,
} from '@brightchain/brightchain-lib';
import { sha3_512 } from '@noble/hashes/sha3';
import fc from 'fast-check';
import { BlockFetcher } from './blockFetcher';

// ── Helpers ──

/** Compute a block ID (SHA3-512 hex) from data */
function computeBlockId(data: Uint8Array): string {
  return Buffer.from(sha3_512(data)).toString('hex');
}

// ── Mock Transport ──

class MockTransport implements IBlockFetchTransport {
  readonly responses = new Map<string, Uint8Array>();

  async fetchBlockFromNode(
    _nodeId: string,
    blockId: string,
    _poolId?: PoolId,
  ): Promise<Uint8Array> {
    const data = this.responses.get(blockId);
    if (!data) {
      throw new Error(`Block ${blockId} not found on remote node`);
    }
    return data;
  }
}

// ── Mock Availability Service ──

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
    return 'remote';
  }
  async queryBlockLocation(): Promise<{
    state: string;
    locations: Array<{
      nodeId: string;
      lastSeen: Date;
      isAuthoritative: boolean;
    }>;
  }> {
    return { state: 'remote', locations: [] };
  }
  async listBlocksByState(): Promise<string[]> {
    return [];
  }
  async getStatistics(): Promise<{
    totalBlocks: number;
    blocksByState: Record<string, number>;
    totalLocations: number;
    uniqueNodes: number;
    averageLocationsPerBlock: number;
    staleLocationCount: number;
  }> {
    return {
      totalBlocks: 0,
      blocksByState: {},
      totalLocations: 0,
      uniqueNodes: 0,
      averageLocationsPerBlock: 0,
      staleLocationCount: 0,
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
    reEvaluatedBlocks: number;
    stateChanges: number;
  }> {
    return { reEvaluatedBlocks: 0, stateChanges: 0 };
  }
  getDisconnectedPeers(): string[] {
    return [];
  }
  onEvent(): void {}
  offEvent(): void {}
  async start(): Promise<void> {}
  async stop(): Promise<void> {}
  isRunning(): boolean {
    return true;
  }
  getConfig(): {
    staleThresholdMs: number;
    partitionThresholdMs: number;
    localNodeId: string;
  } {
    return {
      staleThresholdMs: 60000,
      partitionThresholdMs: 120000,
      localNodeId: 'local-node',
    };
  }
  getLocalNodeId(): string {
    return 'local-node';
  }
}

// ── Mock Pooled Store ──

/**
 * A mock store implementing both IBlockStore and IPooledBlockStore.
 * Tracks pool-scoped storage under `${poolId}:${blockId}` keys.
 */
class MockPooledStore {
  readonly poolBlocks = new Map<string, Uint8Array>();
  readonly metadataMap = new Map<string, Partial<IBlockMetadata>>();
  readonly putInPoolCalls: Array<{ pool: PoolId; dataLength: number }> = [];

  // IPooledBlockStore methods
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
    this.putInPoolCalls.push({ pool, dataLength: data.length });
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
  store: MockPooledStore;
  fetcher: BlockFetcher;
} {
  const transport = new MockTransport();
  const availability = new MockAvailabilityService();
  const store = new MockPooledStore();
  const config: BlockFetcherConfig = {
    ...DEFAULT_BLOCK_FETCHER_CONFIG,
    maxRetries: 0,
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

// ── Property Tests ──

describe('Feature: cross-node-eventual-consistency, Property 10: Pool-scoped fetch stores block in correct namespace', () => {
  /**
   * **Validates: Requirements 5.1, 5.2**
   *
   * Property 10: For any block with a pool ID, after a successful remote fetch,
   * the block SHALL be stored under the pool-scoped key (`${poolId}:${blockId}`)
   * and SHALL be retrievable via the PooledStoreAdapter for that pool.
   */

  /** Arbitrary: block data — non-empty byte arrays */
  const arbBlockData = fc.uint8Array({ minLength: 1, maxLength: 256 });

  /** Arbitrary: pool ID — non-empty alphanumeric strings */
  const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,32}$/);

  /** Arbitrary: node ID */
  const arbNodeId = fc
    .stringMatching(/^[a-zA-Z0-9_-]{1,16}$/)
    .map((s) => `node-${s}`);

  it('after a successful pool-scoped fetch, the block is stored under the pool-scoped key and is retrievable via hasInPool/getFromPool', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockData,
        arbPoolId,
        arbNodeId,
        async (data: Uint8Array, poolId: string, nodeId: string) => {
          const setup = createTestSetup();
          const blockId = registerBlock(setup, data, nodeId);

          // Fetch the block with a pool ID
          const result = await setup.fetcher.fetchBlock(blockId, poolId);

          // Fetch must succeed
          expect(result.success).toBe(true);
          expect(result.data).toEqual(data);

          // The block must have been stored via putInPool
          expect(setup.store.putInPoolCalls.length).toBe(1);
          expect(setup.store.putInPoolCalls[0].pool).toBe(poolId);
          expect(setup.store.putInPoolCalls[0].dataLength).toBe(data.length);

          // The block must be stored under the pool-scoped key: `${poolId}:${blockId}`
          const poolScopedKey = `${poolId}:${blockId}`;
          expect(setup.store.poolBlocks.has(poolScopedKey)).toBe(true);

          // The block must be retrievable via hasInPool
          const exists = await setup.store.hasInPool(poolId, blockId);
          expect(exists).toBe(true);

          // The block must be retrievable via getFromPool with correct data
          const retrieved = await setup.store.getFromPool(poolId, blockId);
          expect(retrieved).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  it('pool-scoped fetch does NOT store the block under the unpooled key', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockData,
        arbPoolId,
        arbNodeId,
        async (data: Uint8Array, poolId: string, nodeId: string) => {
          const setup = createTestSetup();
          const blockId = registerBlock(setup, data, nodeId);

          await setup.fetcher.fetchBlock(blockId, poolId);

          // The block should NOT be stored under the bare blockId key
          // (it should only be under the pool-scoped key)
          const poolScopedKey = `${poolId}:${blockId}`;
          expect(setup.store.poolBlocks.has(poolScopedKey)).toBe(true);

          // The bare blockId key should not exist (putInPool stores under pool:hash)
          // unless poolId happens to be empty, which our generator prevents
          const bareKeyExists = setup.store.poolBlocks.has(blockId);
          expect(bareKeyExists).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  it('different pool IDs for the same block data produce distinct pool-scoped keys', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockData,
        fc.tuple(arbPoolId, arbPoolId).filter(([a, b]) => a !== b),
        arbNodeId,
        async (
          data: Uint8Array,
          [poolId1, poolId2]: [string, string],
          nodeId: string,
        ) => {
          // First fetch with poolId1
          const setup1 = createTestSetup();
          const blockId = registerBlock(setup1, data, nodeId);
          await setup1.fetcher.fetchBlock(blockId, poolId1);

          // Second fetch with poolId2
          const setup2 = createTestSetup();
          registerBlock(setup2, data, nodeId);
          await setup2.fetcher.fetchBlock(blockId, poolId2);

          // Each store should have the block under its respective pool-scoped key
          const key1 = `${poolId1}:${blockId}`;
          const key2 = `${poolId2}:${blockId}`;

          expect(setup1.store.poolBlocks.has(key1)).toBe(true);
          expect(setup2.store.poolBlocks.has(key2)).toBe(true);

          // The keys themselves must be different
          expect(key1).not.toBe(key2);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);
});

// ── Property 11: Pool mismatch rejection ──

describe('Feature: cross-node-eventual-consistency, Property 11: Pool mismatch rejection', () => {
  /**
   * **Validates: Requirements 5.3**
   *
   * Property 11: For any fetch where the requested pool ID differs from the
   * pool ID in the fetched block's metadata, the Block_Fetcher SHALL reject
   * the block with a PoolMismatchError.
   */

  /** Arbitrary: block data — non-empty byte arrays */
  const arbBlockData = fc.uint8Array({ minLength: 1, maxLength: 256 });

  /**
   * Arbitrary: two distinct pool IDs (requested vs actual).
   * Both are non-empty alphanumeric strings that differ from each other.
   */
  const arbDistinctPoolIds = fc
    .tuple(
      fc.stringMatching(/^[a-zA-Z0-9_-]{1,32}$/),
      fc.stringMatching(/^[a-zA-Z0-9_-]{1,32}$/),
    )
    .filter(([a, b]) => a !== b);

  /** Arbitrary: node ID */
  const arbNodeId = fc
    .stringMatching(/^[a-zA-Z0-9_-]{1,16}$/)
    .map((s) => `node-${s}`);

  it('rejects with PoolMismatchError when fetched block metadata poolId differs from requested poolId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockData,
        arbDistinctPoolIds,
        arbNodeId,
        async (
          data: Uint8Array,
          [requestedPoolId, actualPoolId]: [string, string],
          nodeId: string,
        ) => {
          const setup = createTestSetup();
          const blockId = registerBlock(setup, data, nodeId);

          // Override putInPool to store metadata with the ACTUAL pool ID
          // (different from the requested one), simulating a remote node
          // returning a block that belongs to a different pool.
          setup.store.putInPool = async (
            _pool: PoolId,
            blockData: Uint8Array,
            _options?: BlockStoreOptions,
          ): Promise<string> => {
            // Store under the requested pool key (so storeBlock succeeds)
            // but set metadata with the ACTUAL (wrong) pool ID
            const hash = computeBlockId(blockData);
            setup.store.poolBlocks.set(
              `${_pool}:${hash}`,
              new Uint8Array(blockData),
            );
            setup.store.putInPoolCalls.push({
              pool: _pool,
              dataLength: blockData.length,
            });
            // Metadata records the ACTUAL pool ID — triggering the mismatch
            setup.store.metadataMap.set(hash, {
              blockId: hash,
              poolId: actualPoolId,
            });
            return hash;
          };

          // fetchBlock should throw PoolMismatchError
          let caughtError: unknown = null;
          try {
            await setup.fetcher.fetchBlock(blockId, requestedPoolId);
          } catch (err) {
            caughtError = err;
          }

          // Must have thrown
          expect(caughtError).not.toBeNull();
          expect(caughtError).toBeInstanceOf(PoolMismatchError);

          // Verify the error carries the correct pool IDs
          const mismatchErr = caughtError as InstanceType<
            typeof PoolMismatchError
          >;
          expect(mismatchErr.expectedPoolId).toBe(requestedPoolId);
          expect(mismatchErr.actualPoolId).toBe(actualPoolId);
          expect(mismatchErr.blockId).toBe(blockId);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);

  it('does NOT reject when fetched block metadata poolId matches the requested poolId', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBlockData,
        fc.stringMatching(/^[a-zA-Z0-9_-]{1,32}$/),
        arbNodeId,
        async (data: Uint8Array, poolId: string, nodeId: string) => {
          const setup = createTestSetup();
          const blockId = registerBlock(setup, data, nodeId);

          // Normal flow — metadata poolId matches requested poolId
          const result = await setup.fetcher.fetchBlock(blockId, poolId);

          expect(result.success).toBe(true);
          expect(result.data).toEqual(data);
        },
      ),
      { numRuns: 100 },
    );
  }, 30000);
});
