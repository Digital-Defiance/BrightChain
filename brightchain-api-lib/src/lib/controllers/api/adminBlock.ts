import {
  IBlockStore,
  isPooledBlockStore,
  type IBlockMetadata,
  type IPooledBlockStore,
  type ListOptions,
  type PoolId,
  DEFAULT_POOL,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IApiMessageResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type AdminBlockApiResponse = IApiMessageResponse | ApiErrorResponse;

interface AdminBlockHandlers extends TypedHandlers {
  listBlocks: ApiRequestHandler<AdminBlockApiResponse>;
  listPools: ApiRequestHandler<AdminBlockApiResponse>;
  searchBlocks: ApiRequestHandler<AdminBlockApiResponse>;
  networkSearch: ApiRequestHandler<AdminBlockApiResponse>;
  getBlockMetadata: ApiRequestHandler<AdminBlockApiResponse>;
  discoverBlock: ApiRequestHandler<AdminBlockApiResponse>;
  deleteBlock: ApiRequestHandler<AdminBlockApiResponse>;
}

/**
 * Admin-only block management controller.
 *
 * Uses the real IBlockStore / IPooledBlockStore interfaces to enumerate
 * blocks. Pagination is cursor-based — the store's listBlocksInPool()
 * accepts { limit, cursor } so we never load more than one page into
 * memory, regardless of how many blocks exist.
 *
 * ## Endpoints
 *
 * ### GET /api/admin/blocks?pool=default&limit=20&cursor=abc
 * Cursor-paginated block list. When pool is specified, lists only that
 * pool. Without pool, lists the first pool alphabetically (use
 * GET /api/admin/blocks/pools to discover available pools).
 *
 * ### GET /api/admin/blocks/pools
 * List all pools with block counts and byte totals.
 *
 * ### GET /api/admin/blocks/search?q=abc&pool=default&limit=20
 * Search for blocks by hash prefix (local store).
 *
 * ### POST /api/admin/blocks/network-search
 * Search for blocks/CBL metadata across the gossip network via
 * DiscoveryProtocol.searchCBLMetadata().
 *
 * ### GET /api/admin/blocks/:blockId
 * Full block metadata for a specific block.
 *
 * ### POST /api/admin/blocks/:blockId/discover
 * Discover which nodes hold a block.
 *
 * ### DELETE /api/admin/blocks/:blockId
 * Delete block from local store.
 *
 * @requirements 13.1, 13.2, 13.3, 13.4, 13.5
 */
export class AdminBlockController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  AdminBlockApiResponse,
  AdminBlockHandlers,
  CoreLanguageCode
> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'listBlocks',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/pools', {
        handlerKey: 'listPools',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/search', {
        handlerKey: 'searchBlocks',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/network-search', {
        handlerKey: 'networkSearch',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/:blockId', {
        handlerKey: 'getBlockMetadata',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/:blockId/discover', {
        handlerKey: 'discoverBlock',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('delete', '/:blockId', {
        handlerKey: 'deleteBlock',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listBlocks: this.handleListBlocks.bind(this),
      listPools: this.handleListPools.bind(this),
      searchBlocks: this.handleSearchBlocks.bind(this),
      networkSearch: this.handleNetworkSearch.bind(this),
      getBlockMetadata: this.handleGetBlockMetadata.bind(this),
      discoverBlock: this.handleDiscoverBlock.bind(this),
      deleteBlock: this.handleDeleteBlock.bind(this),
    };
  }

  /**
   * Retrieve the registered block store from the service container.
   */
  private getBlockStore(): IBlockStore | undefined {
    return this.application.services.get('blockStore') as
      | IBlockStore
      | undefined;
  }

  /**
   * Stream up to `limit` block hashes from a single pool using cursor-based
   * pagination. Only reads `limit` items from the async iterator — never
   * loads the full pool into memory.
   */
  private async streamBlockPage(
    store: IPooledBlockStore,
    pool: PoolId,
    limit: number,
    cursor?: string,
  ): Promise<{ blocks: Array<{ hash: string; pool: PoolId; metadata: IBlockMetadata | null }>; nextCursor: string | null }> {
    const opts: ListOptions = { limit: limit + 1, cursor }; // +1 to detect hasMore
    const hashes: string[] = [];

    for await (const hash of store.listBlocksInPool(pool, opts)) {
      hashes.push(hash);
      if (hashes.length >= limit + 1) break;
    }

    const hasMore = hashes.length > limit;
    if (hasMore) hashes.pop();

    const nextCursor = hasMore ? hashes[hashes.length - 1] : null;

    // Fetch metadata for the page (parallel, bounded to page size)
    const blocks = await Promise.all(
      hashes.map(async (hash) => {
        const metadata = await store.getMetadata(hash).catch(() => null);
        return { hash, pool, metadata };
      }),
    );

    return { blocks, nextCursor };
  }

  /**
   * GET /api/admin/blocks?pool=default&limit=20&cursor=abc
   *
   * Cursor-based pagination. Requires a pool (defaults to "default").
   * Returns `nextCursor` for the next page, or null when exhausted.
   * Also returns `poolTotal` from getPoolStats so the UI can show
   * "showing N of M" without a full scan.
   */
  private async handleListBlocks(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const request = req as {
        query?: {
          pool?: string;
          limit?: string;
          cursor?: string;
        };
      };
      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20),
      );
      const cursor = request.query?.cursor || undefined;

      const blockStore = this.getBlockStore();
      if (!blockStore) {
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            blocks: [],
            poolTotal: 0,
            nextCursor: null,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      if (isPooledBlockStore(blockStore)) {
        // Default to first available pool if none specified
        const pool = request.query?.pool
          || (await blockStore.listPools())[0]
          || DEFAULT_POOL;

        const result = await this.streamBlockPage(blockStore, pool, limit, cursor);

        // Get pool-level total from stats (O(1), no iteration)
        let poolTotal = 0;
        try {
          const stats = await blockStore.getPoolStats(pool);
          poolTotal = stats.blockCount;
        } catch {
          // Stats not available — leave as 0
        }

        return {
          statusCode: 200,
          response: {
            message: 'OK',
            pool,
            blocks: result.blocks,
            poolTotal,
            nextCursor: result.nextCursor,
            limit,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      // Non-pooled store: enumerate blocks via listBlockIds
      const pool = DEFAULT_POOL;
      if (!blockStore.listBlockIds) {
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            pool,
            blocks: [],
            poolTotal: 0,
            nextCursor: null,
            limit,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      const hashes: string[] = [];
      for await (const hash of blockStore.listBlockIds({ limit: limit + 1, cursor })) {
        hashes.push(hash);
        if (hashes.length >= limit + 1) break;
      }
      const hasMore = hashes.length > limit;
      if (hasMore) hashes.pop();
      const nextCursor = hasMore ? hashes[hashes.length - 1] : null;

      const blocks = await Promise.all(
        hashes.map(async (hash) => {
          const metadata = await blockStore.getMetadata(hash).catch(() => null);
          return { hash, pool, metadata };
        }),
      );

      const poolTotal = blockStore.getBlockCount ? await blockStore.getBlockCount() : 0;

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          pool,
          blocks,
          poolTotal,
          nextCursor,
          limit,
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /api/admin/blocks/pools
   *
   * Returns all pools with their stats (block count, total bytes).
   * Lightweight — calls getPoolStats per pool, no block iteration.
   */
  private async handleListPools(
    _req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const blockStore = this.getBlockStore();
      if (!blockStore) {
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            pools: [],
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      if (isPooledBlockStore(blockStore)) {
        const poolIds = await blockStore.listPools();
        const pools = await Promise.all(
          poolIds.map(async (poolId) => {
            try {
              const stats = await blockStore.getPoolStats(poolId);
              return {
                poolId,
                blockCount: stats.blockCount,
                totalBytes: stats.totalBytes,
                createdAt: stats.createdAt,
                lastAccessedAt: stats.lastAccessedAt,
              };
            } catch {
              return { poolId, blockCount: 0, totalBytes: 0 };
            }
          }),
        );

        return {
          statusCode: 200,
          response: {
            message: 'OK',
            pools,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      // Non-pooled store: present as a single "default" pool
      const blockCount = blockStore.getBlockCount ? await blockStore.getBlockCount() : 0;
      const pools = blockCount > 0 || !blockStore.getBlockCount
        ? [{ poolId: DEFAULT_POOL, blockCount, totalBytes: 0 }]
        : [];
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          pools,
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /api/admin/blocks/search?q=abc123&pool=default&limit=20
   *
   * Search for blocks by hash prefix within a pool (or all pools).
   * Streams through listBlocksInPool and filters by prefix — stops
   * after collecting `limit` matches. For short prefixes on huge pools
   * this may still scan many entries, but it never loads them all into
   * memory simultaneously.
   */
  private async handleSearchBlocks(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const request = req as {
        query?: { q?: string; pool?: string; limit?: string };
      };
      const query = (request.query?.q ?? '').trim().toLowerCase();
      if (!query) {
        return validationError('q (search query) is required');
      }

      const limit = Math.min(
        100,
        Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20),
      );

      const blockStore = this.getBlockStore();
      if (!blockStore) {
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            query,
            blocks: [],
            source: 'local',
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      const matches: Array<{ hash: string; pool: PoolId; metadata: IBlockMetadata | null }> = [];

      if (isPooledBlockStore(blockStore)) {
        const pools: PoolId[] = request.query?.pool
          ? [request.query.pool]
          : await blockStore.listPools();

        for (const pool of pools) {
          if (matches.length >= limit) break;
          for await (const hash of blockStore.listBlocksInPool(pool)) {
            if (hash.toLowerCase().startsWith(query)) {
              const metadata = await blockStore.getMetadata(hash).catch(() => null);
              matches.push({ hash, pool, metadata });
              if (matches.length >= limit) break;
            }
          }
        }
      } else if (blockStore.listBlockIds) {
        // Non-pooled store: search across all blocks
        for await (const hash of blockStore.listBlockIds()) {
          if (hash.toLowerCase().startsWith(query)) {
            const metadata = await blockStore.getMetadata(hash).catch(() => null);
            matches.push({ hash, pool: DEFAULT_POOL, metadata });
            if (matches.length >= limit) break;
          }
        }
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          query,
          blocks: matches,
          source: 'local',
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /api/admin/blocks/network-search
   * Body: { blockId?: string, fileName?: string, mimeType?: string, tags?: string[], poolId?: string }
   *
   * Two modes:
   * 1. If `blockId` is provided, uses DiscoveryProtocol.discoverBlock()
   *    to find which nodes hold a specific block across the gossip network.
   * 2. If metadata fields (fileName, mimeType, tags) are provided, uses
   *    DiscoveryProtocol.searchCBLMetadata() to search for CBL entries
   *    matching those criteria across connected peers.
   */
  private async handleNetworkSearch(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const request = req as {
        body?: {
          blockId?: string;
          fileName?: string;
          mimeType?: string;
          tags?: string[];
          poolId?: string;
        };
      };
      const { blockId, fileName, mimeType, tags, poolId } = request.body ?? {};

      if (!blockId && !fileName && !mimeType && (!tags || tags.length === 0)) {
        return validationError(
          'At least one of blockId, fileName, mimeType, or tags is required',
        );
      }

      const discoveryProtocol = this.application.services.has(
        'discoveryProtocol',
      )
        ? (this.application.services.get('discoveryProtocol') as
            | {
                discoverBlock?: (blockId: string, poolId?: string) => Promise<{
                  found: boolean;
                  locations: Array<{ nodeId: string; latencyMs?: number }>;
                  queriedPeers: number;
                  duration: number;
                }>;
                searchCBLMetadata?: (query: {
                  fileName?: string;
                  mimeType?: string;
                  tags?: string[];
                  poolId?: string;
                }) => Promise<{
                  hits: Array<{ entry: Record<string, unknown>; sourceNodeId: string }>;
                  queriedPeers: number;
                  duration: number;
                }>;
              }
            | undefined)
        : undefined;

      // Mode 1: Locate a specific block by ID across the network
      if (blockId) {
        if (discoveryProtocol?.discoverBlock) {
          const result = await discoveryProtocol.discoverBlock(blockId, poolId);
          return {
            statusCode: 200,
            response: {
              message: 'OK',
              source: 'network',
              blockId,
              ...result,
            } as IApiMessageResponse & Record<string, unknown>,
          };
        }
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            source: 'network',
            blockId,
            found: false,
            locations: [],
            queriedPeers: 0,
            duration: 0,
            warning: 'Discovery protocol not available',
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      // Mode 2: Search CBL metadata across peers
      if (discoveryProtocol?.searchCBLMetadata) {
        const result = await discoveryProtocol.searchCBLMetadata({
          fileName,
          mimeType,
          tags,
          poolId,
        });
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            source: 'network',
            hits: result.hits,
            queriedPeers: result.queriedPeers,
            duration: result.duration,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          source: 'network',
          hits: [],
          queriedPeers: 0,
          duration: 0,
          warning: 'Discovery protocol not available',
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * GET /api/admin/blocks/:blockId
   */
  private async handleGetBlockMetadata(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const request = req as { params?: { blockId?: string } };
      const blockId = request.params?.blockId;

      if (!blockId) {
        return validationError('blockId is required');
      }

      const blockStore = this.getBlockStore();
      if (!blockStore) {
        return notFoundError('Block', blockId);
      }

      const exists = await blockStore.has(blockId);
      if (!exists) {
        return notFoundError('Block', blockId);
      }

      const metadata = await blockStore.getMetadata(blockId);
      return {
        statusCode: 200,
        response: {
          message: 'OK',
          block: {
            blockId,
            exists: true,
            metadata: metadata ?? undefined,
          },
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * POST /api/admin/blocks/:blockId/discover
   */
  private async handleDiscoverBlock(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const request = req as { params?: { blockId?: string } };
      const blockId = request.params?.blockId;

      if (!blockId) {
        return validationError('blockId is required');
      }

      const discoveryProtocol = this.application.services.has(
        'discoveryProtocol',
      )
        ? (this.application.services.get('discoveryProtocol') as
            | {
                discoverBlock?: (blockId: string) => Promise<{
                  found: boolean;
                  locations: Array<{ nodeId: string }>;
                  queriedPeers: number;
                  duration: number;
                }>;
              }
            | undefined)
        : undefined;

      if (discoveryProtocol?.discoverBlock) {
        const result = await discoveryProtocol.discoverBlock(blockId);
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            blockId,
            ...result,
          } as IApiMessageResponse & Record<string, unknown>,
        };
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          blockId,
          found: false,
          locations: [],
          queriedPeers: 0,
          duration: 0,
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * DELETE /api/admin/blocks/:blockId
   */
  private async handleDeleteBlock(
    req: unknown,
  ): Promise<{ statusCode: number; response: AdminBlockApiResponse }> {
    try {
      const request = req as { params?: { blockId?: string } };
      const blockId = request.params?.blockId;

      if (!blockId) {
        return validationError('blockId is required');
      }

      const blockStore = this.getBlockStore();
      if (!blockStore) {
        return notFoundError('Block', blockId);
      }

      const exists = await blockStore.has(blockId);
      if (!exists) {
        return notFoundError('Block', blockId);
      }

      await blockStore.delete(blockId);
      return {
        statusCode: 200,
        response: {
          message: 'Block deleted successfully',
        } as IApiMessageResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
