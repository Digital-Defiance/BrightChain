/**
 * @fileoverview BlockFetcher Implementation
 *
 * Retrieves block data from remote nodes with:
 * - Checksum verification
 * - Retry logic with exponential backoff
 * - Node health tracking (cooldown)
 * - Pool-scoped storage via putInPool
 * - Pool metadata validation (PoolMismatchError on mismatch)
 *
 * @see cross-node-eventual-consistency design, Section 9
 * @see pool-scoped-whitening requirements 7.1, 7.2, 7.3, 7.4
 */

import {
  AnnouncementHandler,
  BlockFetcherConfig,
  BlockFetchError,
  BlockFetchResult,
  ChecksumService,
  DEFAULT_BLOCK_FETCHER_CONFIG,
  IAvailabilityService,
  IBlockFetcher,
  IBlockFetchTransport,
  IBlockStore,
  IFetchQueue,
  IGossipService,
  isLocallyAccessible,
  isPooledBlockStore,
  PoolId,
  PoolMismatchError,
} from '@brightchain/brightchain-lib';

/**
 * BlockFetcher retrieves blocks from remote nodes, verifies checksums,
 * stores them in the correct pool, and validates pool metadata.
 *
 * Pool-scoped fetch behavior (Requirements 7.1–7.4):
 * - When poolId is provided, fetched blocks are stored via putInPool(poolId, data)
 * - The fetcher verifies that the block's metadata poolId matches the requested poolId
 * - PoolMismatchError is thrown when metadata doesn't match
 * - Tuple reconstruction callers pass the same poolId for all blocks
 */
export class BlockFetcher implements IBlockFetcher {
  private readonly nodeCooldowns: Map<string, number> = new Map();
  private readonly checksumService: ChecksumService = new ChecksumService();
  private running = false;

  /**
   * Bound handler for gossip announcements, stored so we can unsubscribe in stop().
   * Only set when proactiveFetchEnabled is true and gossipService is provided.
   */
  private announcementHandler: AnnouncementHandler | null = null;

  constructor(
    private readonly transport: IBlockFetchTransport,
    private readonly availabilityService: IAvailabilityService,
    private readonly store: IBlockStore,
    private readonly config: BlockFetcherConfig = DEFAULT_BLOCK_FETCHER_CONFIG,
    private readonly gossipService?: IGossipService,
    private readonly fetchQueue?: IFetchQueue,
  ) {}

  /**
   * Fetch a block from remote nodes and store it locally.
   *
   * The entire operation is bounded by `fetchTimeoutMs` (Req 1.6).
   *
   * When poolId is provided:
   * 1. The block is stored in the specified pool via putInPool (Req 7.1)
   * 2. After storage, the block's metadata poolId is verified against the requested poolId (Req 7.2)
   * 3. If metadata doesn't match, the block is rejected with PoolMismatchError (Req 7.3)
   *
   * For tuple reconstruction, callers pass the same poolId for all blocks (Req 7.4).
   */
  public async fetchBlock(
    blockId: string,
    poolId?: PoolId,
  ): Promise<BlockFetchResult> {
    return this.withTimeout(blockId, () => this.doFetchBlock(blockId, poolId));
  }

  /**
   * Core fetch logic: query locations, filter cooldowns, try nodes in order.
   */
  private async doFetchBlock(
    blockId: string,
    poolId?: PoolId,
  ): Promise<BlockFetchResult> {
    const locations = await this.availabilityService.getBlockLocations(blockId);
    const candidateNodes = locations
      .map((loc) => loc.nodeId)
      .filter((nodeId) => this.isNodeAvailable(nodeId));

    if (candidateNodes.length === 0) {
      return {
        success: false,
        error: `No available nodes for block ${blockId}`,
        attemptedNodes: [],
      };
    }

    const attemptedNodes: Array<{ nodeId: string; error?: string }> = [];

    for (const nodeId of candidateNodes) {
      const result = await this.tryFetchFromNode(
        nodeId,
        blockId,
        poolId,
        attemptedNodes,
      );
      if (result) {
        return result;
      }
    }

    return {
      success: false,
      error: `All ${candidateNodes.length} candidate nodes failed for block ${blockId}`,
      attemptedNodes,
    };
  }

  /**
   * Try fetching a block from a single node with retries.
   * Returns a successful BlockFetchResult or null if all retries failed.
   */
  private async tryFetchFromNode(
    nodeId: string,
    blockId: string,
    poolId: PoolId | undefined,
    attemptedNodes: Array<{ nodeId: string; error?: string }>,
  ): Promise<BlockFetchResult | null> {
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.config.retryBaseDelayMs * Math.pow(2, attempt - 1);
          await this.sleep(delay);
        }

        const data = await this.transport.fetchBlockFromNode(
          nodeId,
          blockId,
          poolId,
        );

        // Verify checksum matches blockId
        const computedChecksum = this.checksumService
          .calculateChecksum(data)
          .toHex();
        if (computedChecksum !== blockId) {
          const msg = `Checksum mismatch: expected ${blockId}, got ${computedChecksum}`;
          attemptedNodes.push({ nodeId, error: msg });
          this.markNodeUnavailable(nodeId);
          return null;
        }

        // Store the block in the correct pool
        await this.storeBlock(blockId, data, poolId);

        // Validate pool metadata if poolId was specified (Req 7.2, 7.3)
        if (poolId) {
          await this.validatePoolMetadata(blockId, poolId);
        }

        attemptedNodes.push({ nodeId });
        return {
          success: true,
          data,
          attemptedNodes,
        };
      } catch (error) {
        // Re-throw PoolMismatchError immediately — don't retry pool violations
        if (error instanceof PoolMismatchError) {
          attemptedNodes.push({ nodeId, error: error.message });
          throw error;
        }

        if (error instanceof BlockFetchError) {
          attemptedNodes.push({ nodeId, error: error.message });
          throw error;
        }

        const errorMsg = error instanceof Error ? error.message : String(error);

        // Only record the final attempt failure
        if (attempt === this.config.maxRetries) {
          attemptedNodes.push({ nodeId, error: errorMsg });
          this.markNodeUnavailable(nodeId);
        }
      }
    }

    return null;
  }

  /**
   * Store a fetched block. When poolId is provided and the store supports pools,
   * the block is stored in the specified pool via putInPool (Req 7.1).
   * Otherwise falls back to the standard put method.
   */
  private async storeBlock(
    blockId: string,
    data: Uint8Array,
    poolId?: PoolId,
  ): Promise<void> {
    if (poolId && isPooledBlockStore(this.store)) {
      await this.store.putInPool(poolId, data);
    } else {
      await this.store.put(blockId, data);
    }
  }

  /**
   * Validate that the stored block's metadata poolId matches the requested poolId.
   * Throws PoolMismatchError if there's a mismatch (Req 7.2, 7.3).
   */
  private async validatePoolMetadata(
    blockId: string,
    expectedPoolId: PoolId,
  ): Promise<void> {
    const metadata = await this.store.getMetadata(blockId);
    if (metadata?.poolId && metadata.poolId !== expectedPoolId) {
      throw new PoolMismatchError(blockId, expectedPoolId, metadata.poolId);
    }
  }

  /** Check if a node is currently available (not in cooldown) */
  public isNodeAvailable(nodeId: string): boolean {
    const cooldownUntil = this.nodeCooldowns.get(nodeId);
    if (cooldownUntil === undefined) {
      return true;
    }
    if (Date.now() >= cooldownUntil) {
      this.nodeCooldowns.delete(nodeId);
      return true;
    }
    return false;
  }

  /** Mark a node as unavailable for the configured cooldown period */
  public markNodeUnavailable(nodeId: string): void {
    this.nodeCooldowns.set(nodeId, Date.now() + this.config.nodeCooldownMs);
  }

  /** Get the current configuration */
  public getConfig(): BlockFetcherConfig {
    return { ...this.config };
  }

  /** Start the fetcher and subscribe to gossip announcements if proactive fetching is enabled */
  public start(): void {
    this.running = true;

    if (
      this.config.proactiveFetchEnabled &&
      this.gossipService &&
      this.fetchQueue
    ) {
      this.announcementHandler = (announcement) => {
        void this.handleProactiveAnnouncement(announcement);
      };
      this.gossipService.onAnnouncement(this.announcementHandler);
    }
  }

  /** Stop the fetcher, unsubscribe from gossip, and clean up */
  public stop(): void {
    if (this.announcementHandler && this.gossipService) {
      this.gossipService.offAnnouncement(this.announcementHandler);
      this.announcementHandler = null;
    }
    this.running = false;
    this.nodeCooldowns.clear();
  }

  /** Whether the fetcher is currently running */
  public isRunning(): boolean {
    return this.running;
  }

  /**
   * Handle a gossip announcement for proactive fetching.
   * Checks if the block is already local; if not, enqueues a low-priority fetch.
   *
   * @see Requirements 6.1, 6.2
   */
  private async handleProactiveAnnouncement(
    announcement: Parameters<AnnouncementHandler>[0],
  ): Promise<void> {
    // Only proactively fetch for 'add' announcements
    if (announcement.type !== 'add') {
      return;
    }

    const { blockId } = announcement;

    try {
      const state =
        await this.availabilityService.getAvailabilityState(blockId);

      // Block is already locally accessible — no need to fetch
      if (isLocallyAccessible(state)) {
        return;
      }

      // Enqueue a low-priority fetch via the fetch queue
      if (this.fetchQueue) {
        // Fire-and-forget: we don't need to await the result for proactive fetches
        void this.fetchQueue.enqueue(blockId);
      }
    } catch {
      // Proactive fetch is best-effort; swallow errors silently
    }
  }

  /**
   * Race the fetch operation against fetchTimeoutMs (Req 1.6).
   * Returns a FetchTimeoutError result if the timeout fires first.
   */
  private withTimeout(
    blockId: string,
    operation: () => Promise<BlockFetchResult>,
  ): Promise<BlockFetchResult> {
    const { fetchTimeoutMs } = this.config;

    return new Promise<BlockFetchResult>((resolve, reject) => {
      let settled = false;

      const timer = setTimeout(() => {
        if (settled) return;
        settled = true;
        resolve({
          success: false,
          error: `Fetch for block ${blockId} timed out after ${fetchTimeoutMs}ms`,
          attemptedNodes: [],
        });
      }, fetchTimeoutMs);

      operation()
        .then((result) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(result);
        })
        .catch((err: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          reject(err);
        });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
