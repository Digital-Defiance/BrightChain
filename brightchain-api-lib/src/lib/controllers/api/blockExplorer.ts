/**
 * Public read-only block explorer controller.
 *
 * Provides unauthenticated endpoints for browsing and searching blocks.
 * No write/delete operations — admin-only mutations stay in AdminBlockController.
 *
 * ## Endpoints
 *
 * ### GET /api/explorer/pools
 * List all pools with block counts and byte totals.
 *
 * ### GET /api/explorer/blocks?pool=default&limit=20&cursor=abc
 * Cursor-paginated block listing within a pool.
 *
 * ### GET /api/explorer/blocks/search?q=abc&pool=default&limit=20
 * Search blocks by hash prefix (local store).
 *
 * ### GET /api/explorer/blocks/:blockId
 * Block metadata lookup by ID.
 *
 * ### POST /api/explorer/blocks/:blockId/locate
 * Locate which network nodes hold a specific block via gossip discovery.
 *
 * @requirements 13.1, 13.2, 13.3
 */

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
import { handleError, notFoundError, validationError } from '../../utils/errorResponse';
import { BaseController } from '../base';

type ExplorerApiResponse = IApiMessageResponse | ApiErrorResponse;

interface ExplorerHandlers extends TypedHandlers {
  listPools: ApiRequestHandler<ExplorerApiResponse>;
  listBlocks: ApiRequestHandler<ExplorerApiResponse>;
  searchBlocks: ApiRequestHandler<ExplorerApiResponse>;
  getBlockMetadata: ApiRequestHandler<ExplorerApiResponse>;
  locateBlock: ApiRequestHandler<ExplorerApiResponse>;
}

export class BlockExplorerController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<TID, ExplorerApiResponse, ExplorerHandlers, CoreLanguageCode> {
  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/pools', {
        handlerKey: 'listPools',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/blocks', {
        handlerKey: 'listBlocks',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/blocks/search', {
        handlerKey: 'searchBlocks',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/blocks/:blockId', {
        handlerKey: 'getBlockMetadata',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/blocks/:blockId/locate', {
        handlerKey: 'locateBlock',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listPools: this.handleListPools.bind(this),
      listBlocks: this.handleListBlocks.bind(this),
      searchBlocks: this.handleSearchBlocks.bind(this),
      getBlockMetadata: this.handleGetBlockMetadata.bind(this),
      locateBlock: this.handleLocateBlock.bind(this),
    };
  }

  private getBlockStore(): IBlockStore | undefined {
    return this.application.services.get('blockStore') as IBlockStore | undefined;
  }

  /** GET /api/explorer/pools */
  private async handleListPools(
    _req: unknown,
  ): Promise<{ statusCode: number; response: ExplorerApiResponse }> {
    try {
      const store = this.getBlockStore();
      if (!store) {
        return { statusCode: 200, response: { message: 'OK', pools: [] } as IApiMessageResponse & Record<string, unknown> };
      }

      if (isPooledBlockStore(store)) {
        const poolIds = await store.listPools();
        const pools = await Promise.all(
          poolIds.map(async (poolId) => {
            try {
              const stats = await store.getPoolStats(poolId);
              return { poolId, blockCount: stats.blockCount, totalBytes: stats.totalBytes };
            } catch {
              return { poolId, blockCount: 0, totalBytes: 0 };
            }
          }),
        );
        return { statusCode: 200, response: { message: 'OK', pools } as IApiMessageResponse & Record<string, unknown> };
      }

      // Non-pooled store: present as a single "default" pool
      const blockCount = store.getBlockCount ? await store.getBlockCount() : 0;
      const pools = blockCount > 0 || !store.getBlockCount
        ? [{ poolId: DEFAULT_POOL, blockCount, totalBytes: 0 }]
        : [];
      return { statusCode: 200, response: { message: 'OK', pools } as IApiMessageResponse & Record<string, unknown> };
    } catch (error) {
      return handleError(error);
    }
  }

  /** GET /api/explorer/blocks?pool=default&limit=20&cursor=abc */
  private async handleListBlocks(
    req: unknown,
  ): Promise<{ statusCode: number; response: ExplorerApiResponse }> {
    try {
      const request = req as { query?: { pool?: string; limit?: string; cursor?: string } };
      const limit = Math.min(100, Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20));
      const cursor = request.query?.cursor || undefined;

      const store = this.getBlockStore();
      if (!store) {
        return { statusCode: 200, response: { message: 'OK', blocks: [], poolTotal: 0, nextCursor: null, limit } as IApiMessageResponse & Record<string, unknown> };
      }

      if (isPooledBlockStore(store)) {
        return this.listBlocksFromPooledStore(store, request.query?.pool, limit, cursor);
      }

      // Non-pooled store: enumerate blocks via listBlockIds
      return this.listBlocksFromFlatStore(store, limit, cursor);
    } catch (error) {
      return handleError(error);
    }
  }

  /** List blocks from a pooled store */
  private async listBlocksFromPooledStore(
    store: IPooledBlockStore & IBlockStore,
    requestedPool: string | undefined,
    limit: number,
    cursor: string | undefined,
  ): Promise<{ statusCode: number; response: ExplorerApiResponse }> {
    const pool = requestedPool || (await store.listPools())[0] || DEFAULT_POOL;
    const opts: ListOptions = { limit: limit + 1, cursor };
    const hashes: string[] = [];
    for await (const hash of store.listBlocksInPool(pool, opts)) {
      hashes.push(hash);
      if (hashes.length >= limit + 1) break;
    }
    const hasMore = hashes.length > limit;
    if (hasMore) hashes.pop();
    const nextCursor = hasMore ? hashes[hashes.length - 1] : null;

    const blocks = await Promise.all(
      hashes.map(async (hash) => {
        const metadata = await store.getMetadata(hash).catch(() => null);
        return { hash, pool, metadata };
      }),
    );

    let poolTotal = 0;
    try { poolTotal = (await store.getPoolStats(pool)).blockCount; } catch { /* */ }

    return { statusCode: 200, response: { message: 'OK', pool, blocks, poolTotal, nextCursor, limit } as IApiMessageResponse & Record<string, unknown> };
  }

  /** List blocks from a non-pooled (flat) store using listBlockIds */
  private async listBlocksFromFlatStore(
    store: IBlockStore,
    limit: number,
    cursor: string | undefined,
  ): Promise<{ statusCode: number; response: ExplorerApiResponse }> {
    const pool = DEFAULT_POOL;

    if (!store.listBlockIds) {
      return { statusCode: 200, response: { message: 'OK', pool, blocks: [], poolTotal: 0, nextCursor: null, limit } as IApiMessageResponse & Record<string, unknown> };
    }

    const hashes: string[] = [];
    for await (const hash of store.listBlockIds({ limit: limit + 1, cursor })) {
      hashes.push(hash);
      if (hashes.length >= limit + 1) break;
    }
    const hasMore = hashes.length > limit;
    if (hasMore) hashes.pop();
    const nextCursor = hasMore ? hashes[hashes.length - 1] : null;

    const blocks = await Promise.all(
      hashes.map(async (hash) => {
        const metadata = await store.getMetadata(hash).catch(() => null);
        return { hash, pool, metadata };
      }),
    );

    const poolTotal = store.getBlockCount ? await store.getBlockCount() : 0;

    return { statusCode: 200, response: { message: 'OK', pool, blocks, poolTotal, nextCursor, limit } as IApiMessageResponse & Record<string, unknown> };
  }

  /** GET /api/explorer/blocks/search?q=abc&pool=default&limit=20 */
  private async handleSearchBlocks(
    req: unknown,
  ): Promise<{ statusCode: number; response: ExplorerApiResponse }> {
    try {
      const request = req as { query?: { q?: string; pool?: string; limit?: string } };
      const query = (request.query?.q ?? '').trim().toLowerCase();
      if (!query) return validationError('q (search query) is required');

      const limit = Math.min(100, Math.max(1, parseInt(request.query?.limit ?? '20', 10) || 20));
      const store = this.getBlockStore();
      if (!store) {
        return { statusCode: 200, response: { message: 'OK', query, blocks: [] } as IApiMessageResponse & Record<string, unknown> };
      }

      const matches: Array<{ hash: string; pool: PoolId; metadata: IBlockMetadata | null }> = [];

      if (isPooledBlockStore(store)) {
        const pools: PoolId[] = request.query?.pool ? [request.query.pool] : await store.listPools();
        for (const pool of pools) {
          if (matches.length >= limit) break;
          for await (const hash of store.listBlocksInPool(pool)) {
            if (hash.toLowerCase().startsWith(query)) {
              const metadata = await store.getMetadata(hash).catch(() => null);
              matches.push({ hash, pool, metadata });
              if (matches.length >= limit) break;
            }
          }
        }
      } else if (store.listBlockIds) {
        // Non-pooled store: search across all blocks
        for await (const hash of store.listBlockIds()) {
          if (hash.toLowerCase().startsWith(query)) {
            const metadata = await store.getMetadata(hash).catch(() => null);
            matches.push({ hash, pool: DEFAULT_POOL, metadata });
            if (matches.length >= limit) break;
          }
        }
      }

      return { statusCode: 200, response: { message: 'OK', query, blocks: matches } as IApiMessageResponse & Record<string, unknown> };
    } catch (error) {
      return handleError(error);
    }
  }

  /** GET /api/explorer/blocks/:blockId */
  private async handleGetBlockMetadata(
    req: unknown,
  ): Promise<{ statusCode: number; response: ExplorerApiResponse }> {
    try {
      const request = req as { params?: { blockId?: string } };
      const blockId = request.params?.blockId;
      if (!blockId) return validationError('blockId is required');

      const store = this.getBlockStore();
      if (!store) return notFoundError('Block', blockId);

      const exists = await store.has(blockId);
      if (!exists) return notFoundError('Block', blockId);

      const metadata = await store.getMetadata(blockId);
      return { statusCode: 200, response: { message: 'OK', block: { blockId, exists: true, metadata: metadata ?? undefined } } as IApiMessageResponse & Record<string, unknown> };
    } catch (error) {
      return handleError(error);
    }
  }

  /** POST /api/explorer/blocks/:blockId/locate */
  private async handleLocateBlock(
    req: unknown,
  ): Promise<{ statusCode: number; response: ExplorerApiResponse }> {
    try {
      const request = req as { params?: { blockId?: string } };
      const blockId = request.params?.blockId;
      if (!blockId) return validationError('blockId is required');

      const discoveryProtocol = this.application.services.get('discoveryProtocol') as
        | { discoverBlock?: (id: string) => Promise<{ found: boolean; locations: Array<{ nodeId: string; latencyMs?: number }>; queriedPeers: number; duration: number }> }
        | undefined;

      if (discoveryProtocol?.discoverBlock) {
        const result = await discoveryProtocol.discoverBlock(blockId);
        return { statusCode: 200, response: { message: 'OK', blockId, ...result } as IApiMessageResponse & Record<string, unknown> };
      }

      // Also check local store
      const store = this.getBlockStore();
      const existsLocally = store ? await store.has(blockId) : false;

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          blockId,
          found: existsLocally,
          locations: existsLocally ? [{ nodeId: 'local', latencyMs: 0 }] : [],
          queriedPeers: 0,
          duration: 0,
        } as IApiMessageResponse & Record<string, unknown>,
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
