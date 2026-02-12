/**
 * @fileoverview Property-based test for Property 12: Remote fetch stores block in correct pool.
 *
 * **Feature: pool-scoped-whitening, Property 12: Remote fetch stores block in correct pool**
 *
 * For any block fetch with a specified PoolId P, when the transport returns valid
 * block data with matching pool metadata, the block SHALL be stored in pool P
 * (verifiable via hasInPool(P, blockId)). When the transport returns block data
 * with pool metadata Q ≠ P, the fetch SHALL be rejected with a PoolMismatchError.
 *
 * **Validates: Requirements 7.1, 7.2, 7.3**
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
import { BlockFetcher } from '../lib/blockFetch/blockFetcher';

// Longer timeout for property tests
jest.setTimeout(60000);

// ── Helpers ──

/** Compute a block ID (SHA3-512 hex) from data */
function computeBlockId(data: Uint8Array): string {
  return Buffer.from(sha3_512(data)).toString('hex');
}

// ── Generators ──

/** Valid pool ID strings matching /^[a-zA-Z0-9_-]{1,64}$/ */
const arbPoolId = fc.stringMatching(/^[a-zA-Z0-9_-]{1,64}$/);

/** Two distinct valid pool IDs */
const arbDistinctPoolIds = fc
  .tuple(arbPoolId, arbPoolId)
  .filter(([a, b]) => a !== b);

/** Random block data (64 bytes for speed) */
const arbBlockData = fc.uint8Array({ minLength: 64, maxLength: 64 });

// ── Mock Transport ──

class MockTransport implements IBlockFetchTransport {
  readonly responses = new Map<string, Uint8Array>();
  readonly calls: Array<{ nodeId: string; blockId: string; poolId?: PoolId }> =
    [];

  async fetchBlockFromNode(
    nodeId: string,
    blockId: string,
    poolId?: PoolId,
  ): Promise<Uint8Array> {
    this.calls.push({ nodeId, blockId, poolId });
    const data = this.responses.get(blockId);
    if (!data) {
      throw new Error(`Block ${blockId} not found on node ${nodeId}`);
    }
    return data;
  }
}

// ── Mock Availability Service (minimal stubs) ──

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

// ── Mock Pooled Block Store ──

class MockPooledStore {
  readonly poolBlocks = new Map<string, Uint8Array>();
  readonly metadataMap = new Map<string, Partial<IBlockMetadata>>();
  readonly putCalls: Array<{ pool: PoolId; dataLength: number }> = [];
  readonly putKeyCalls: Array<{ key: string; dataLength: number }> = [];

  /**
   * When set, putInPool will record this poolId in metadata instead of the
   * pool argument. This simulates a remote node returning block data whose
   * metadata carries a *different* pool — triggering PoolMismatchError.
   */
  metadataPoolOverride: PoolId | undefined = undefined;

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
    // Use override if set, otherwise record the actual pool
    const metaPool = this.metadataPoolOverride ?? pool;
    this.metadataMap.set(hash, { blockId: hash, poolId: metaPool });
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
    maxRetries: 0, // No retries for faster property tests
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

/** Register block data in the transport and availability service */
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

describe('Property 12: Remote fetch stores block in correct pool', () => {
  /**
   * **Feature: pool-scoped-whitening, Property 12: Remote fetch stores block in correct pool**
   *
   * For any block fetch with a specified PoolId P, when the transport returns
   * valid block data with matching pool metadata, the block SHALL be stored
   * in pool P (verifiable via hasInPool(P, blockId)).
   *
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  it('stores fetched block in the requested pool when metadata matches', async () => {
    await fc.assert(
      fc.asyncProperty(arbPoolId, arbBlockData, async (poolId, blockData) => {
        const setup = createTestSetup();
        const blockId = registerBlock(setup, blockData, 'node-1');

        const result = await setup.fetcher.fetchBlock(blockId, poolId);

        // Block fetch should succeed
        expect(result.success).toBe(true);
        expect(result.data).toEqual(blockData);

        // Req 7.1: Block SHALL be stored in pool P via putInPool
        expect(setup.store.putCalls.length).toBeGreaterThanOrEqual(1);
        const lastPut = setup.store.putCalls[setup.store.putCalls.length - 1];
        expect(lastPut.pool).toBe(poolId);

        // Verifiable via hasInPool(P, blockId)
        const existsInPool = await setup.store.hasInPool(poolId, blockId);
        expect(existsInPool).toBe(true);

        // Req 7.2: Metadata poolId should match the requested pool
        const metadata = await setup.store.getMetadata(blockId);
        expect(metadata?.poolId).toBe(poolId);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Feature: pool-scoped-whitening, Property 12: Remote fetch stores block in correct pool**
   *
   * When the transport returns block data with pool metadata Q ≠ P,
   * the fetch SHALL be rejected with a PoolMismatchError.
   *
   * **Validates: Requirements 7.1, 7.2, 7.3**
   */
  it('rejects with PoolMismatchError when metadata pool differs from requested pool', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbDistinctPoolIds,
        arbBlockData,
        async ([requestedPool, metadataPool], blockData) => {
          const setup = createTestSetup();
          const blockId = registerBlock(setup, blockData, 'node-1');

          // Configure the store to record a different pool in metadata,
          // simulating a block whose metadata carries pool Q ≠ P
          setup.store.metadataPoolOverride = metadataPool;

          let caughtError: PoolMismatchError | undefined;
          try {
            await setup.fetcher.fetchBlock(blockId, requestedPool);
          } catch (error) {
            if (error instanceof PoolMismatchError) {
              caughtError = error;
            } else {
              throw error;
            }
          }

          // Req 7.3: Fetch SHALL be rejected with PoolMismatchError
          expect(caughtError).toBeInstanceOf(PoolMismatchError);
          expect(caughtError?.expectedPoolId).toBe(requestedPool);
          expect(caughtError?.actualPoolId).toBe(metadataPool);
          expect(caughtError?.blockId).toBe(blockId);
        },
      ),
      { numRuns: 100 },
    );
  });
});
