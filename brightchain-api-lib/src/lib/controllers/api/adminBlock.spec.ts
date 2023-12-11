/**
 * Unit tests for AdminBlockController.
 *
 * Tests the handler-level behavior of listBlocks, listPools,
 * getBlockMetadata, discoverBlock, and deleteBlock using mocks that
 * implement the real IPooledBlockStore interface.
 *
 * @requirements 13.1, 13.2, 13.3, 13.4, 13.5
 */

import {
  ApiErrorResponse,
  IApiMessageResponse,
} from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces';
import { AdminBlockController } from './adminBlock';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminBlockControllerHandlers {
  handlers: {
    listBlocks: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse | ApiErrorResponse;
    }>;
    listPools: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse | ApiErrorResponse;
    }>;
    searchBlocks: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse | ApiErrorResponse;
    }>;
    networkSearch: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse | ApiErrorResponse;
    }>;
    getBlockMetadata: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse | ApiErrorResponse;
    }>;
    discoverBlock: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse | ApiErrorResponse;
    }>;
    deleteBlock: (req: unknown) => Promise<{
      statusCode: number;
      response: IApiMessageResponse | ApiErrorResponse;
    }>;
  };
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

interface MockBlock {
  hash: string;
  pool: string;
  size: number;
  createdAt: string;
}

const mockBlocks: MockBlock[] = [
  { hash: 'block-001', pool: 'default', size: 1024, createdAt: '2025-01-01T00:00:00Z' },
  { hash: 'block-002', pool: 'default', size: 2048, createdAt: '2025-01-05T00:00:00Z' },
  { hash: 'block-003', pool: 'pool-2', size: 512, createdAt: '2025-01-10T00:00:00Z' },
];

// ─── Mock Factory ────────────────────────────────────────────────────────────

/**
 * Creates a mock that satisfies isPooledBlockStore() and supports
 * cursor-based pagination via listBlocksInPool({ limit, cursor }).
 */
function createMockPooledBlockStore(blocks: MockBlock[] = mockBlocks) {
  const store = {
    // IPooledBlockStore marker methods (for isPooledBlockStore type guard)
    hasInPool: jest.fn(),
    putInPool: jest.fn(),
    getFromPool: jest.fn(),
    deleteFromPool: jest.fn(),

    // Pool enumeration
    listPools: jest.fn(async () => {
      const pools = new Set(blocks.map((b) => b.pool));
      return Array.from(pools).sort();
    }),

    getPoolStats: jest.fn(async (pool: string) => {
      const poolBlocks = blocks.filter((b) => b.pool === pool);
      return {
        poolId: pool,
        blockCount: poolBlocks.length,
        totalBytes: poolBlocks.reduce((sum, b) => sum + b.size, 0),
        createdAt: new Date('2025-01-01'),
        lastAccessedAt: new Date('2025-01-15'),
      };
    }),

    listBlocksInPool: jest.fn(async function* (
      pool: string,
      options?: { limit?: number; cursor?: string },
    ) {
      const poolBlocks = blocks.filter((b) => b.pool === pool);
      let started = !options?.cursor;
      let yielded = 0;
      const limit = options?.limit ?? Infinity;

      for (const b of poolBlocks) {
        if (!started) {
          if (b.hash === options!.cursor) started = true;
          continue;
        }
        if (yielded >= limit) break;
        yield b.hash;
        yielded++;
      }
    }),

    // IBlockStore methods used by the controller
    has: jest.fn(async (key: string) => blocks.some((b) => b.hash === key)),

    getMetadata: jest.fn(async (key: string) => {
      const block = blocks.find((b) => b.hash === key);
      if (!block) return null;
      return { size: block.size, createdAt: block.createdAt };
    }),

    delete: jest.fn(async (_key: string) => {}),
  };
  return store;
}

function createMockDiscoveryProtocol() {
  return {
    discoverBlock: jest.fn(async (_blockId: string) => ({
      found: true,
      locations: [{ nodeId: 'node-a' }, { nodeId: 'node-b' }],
      queriedPeers: 5,
      duration: 120,
    })),
    searchCBLMetadata: jest.fn(async () => ({
      hits: [{ entry: { magnetUrl: 'magnet:?test' }, sourceNodeId: 'node-c' }],
      queriedPeers: 3,
      duration: 80,
    })),
  };
}

function createMockApplication(
  blockStore: ReturnType<typeof createMockPooledBlockStore>,
  discoveryProtocol?: ReturnType<typeof createMockDiscoveryProtocol>,
): IBrightChainApplication {
  const services = new Map<string, unknown>();
  services.set('blockStore', blockStore);
  if (discoveryProtocol) {
    services.set('discoveryProtocol', discoveryProtocol);
  }

  return {
    db: { connection: { readyState: 1 } },
    environment: { mongo: { useTransactions: false }, debug: false },
    constants: {},
    ready: true,
    services: { get: (name: string) => services.get(name) },
    plugins: {},
    getModel: () => { throw new Error('not implemented'); },
    getController: () => { throw new Error('not implemented'); },
    setController: () => {},
    start: async () => {},
  } as unknown as IBrightChainApplication;
}

function createController(blocks?: MockBlock[], withDiscovery = true) {
  const blockStore = createMockPooledBlockStore(blocks);
  const discoveryProtocol = withDiscovery ? createMockDiscoveryProtocol() : undefined;
  const app = createMockApplication(blockStore, discoveryProtocol);
  const controller = new AdminBlockController(app);
  return {
    controller,
    blockStore,
    discoveryProtocol,
    handlers: (controller as unknown as AdminBlockControllerHandlers).handlers,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AdminBlockController', () => {
  describe('listBlocks (cursor-based)', () => {
    it('returns blocks from the first pool when no pool specified', async () => {
      const { handlers } = createController();
      const result = await handlers.listBlocks({ query: {} });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blocks: Array<{ hash: string; pool: string }>;
        poolTotal: number;
        nextCursor: string | null;
      };
      expect(body.message).toBe('OK');
      // First pool alphabetically is "default" which has 2 blocks
      expect(body.blocks).toHaveLength(2);
      expect(body.poolTotal).toBe(2);
      expect(body.blocks[0].hash).toBe('block-001');
    });

    it('returns blocks from a specific pool', async () => {
      const { handlers } = createController();
      const result = await handlers.listBlocks({ query: { pool: 'pool-2' } });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blocks: Array<{ hash: string; pool: string }>;
        poolTotal: number;
      };
      expect(body.poolTotal).toBe(1);
      expect(body.blocks).toHaveLength(1);
      expect(body.blocks[0].hash).toBe('block-003');
      expect(body.blocks[0].pool).toBe('pool-2');
    });

    it('respects limit parameter', async () => {
      const { handlers } = createController();
      const result = await handlers.listBlocks({ query: { pool: 'default', limit: '1' } });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blocks: Array<{ hash: string }>;
        nextCursor: string | null;
        limit: number;
      };
      expect(body.blocks).toHaveLength(1);
      expect(body.limit).toBe(1);
      expect(body.nextCursor).toBe('block-001'); // more blocks available
    });

    it('returns nextCursor=null when no more blocks', async () => {
      const { handlers } = createController();
      const result = await handlers.listBlocks({ query: { pool: 'pool-2', limit: '20' } });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        nextCursor: string | null;
      };
      expect(body.nextCursor).toBeNull();
    });

    it('returns empty list when no blocks exist', async () => {
      const { handlers } = createController([]);
      const result = await handlers.listBlocks({ query: {} });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blocks: Array<Record<string, unknown>>;
      };
      expect(body.blocks).toHaveLength(0);
    });
  });

  describe('listPools', () => {
    it('returns all pools with stats', async () => {
      const { handlers } = createController();
      const result = await handlers.listPools({});

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        pools: Array<{ poolId: string; blockCount: number; totalBytes: number }>;
      };
      expect(body.pools).toHaveLength(2);
      const defaultPool = body.pools.find((p) => p.poolId === 'default');
      expect(defaultPool).toBeDefined();
      expect(defaultPool!.blockCount).toBe(2);
      expect(defaultPool!.totalBytes).toBe(1024 + 2048);
    });

    it('returns empty pools array when no blocks exist', async () => {
      const { handlers } = createController([]);
      const result = await handlers.listPools({});

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        pools: unknown[];
      };
      expect(body.pools).toHaveLength(0);
    });
  });

  describe('getBlockMetadata', () => {
    it('returns metadata for existing block', async () => {
      const { handlers } = createController();
      const result = await handlers.getBlockMetadata({
        params: { blockId: 'block-001' },
      });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        block: Record<string, unknown>;
      };
      expect(body.message).toBe('OK');
      expect(body.block.blockId).toBe('block-001');
      expect(body.block.exists).toBe(true);
    });

    it('returns 404 for non-existent block', async () => {
      const { handlers } = createController();
      const result = await handlers.getBlockMetadata({
        params: { blockId: 'nonexistent-block' },
      });
      expect(result.statusCode).toBe(404);
    });

    it('returns 400 when blockId is missing', async () => {
      const { handlers } = createController();
      const result = await handlers.getBlockMetadata({ params: {} });
      expect(result.statusCode).toBe(400);
    });
  });

  describe('discoverBlock', () => {
    it('delegates to DiscoveryProtocol and returns locations', async () => {
      const { handlers, discoveryProtocol } = createController();
      const result = await handlers.discoverBlock({
        params: { blockId: 'block-001' },
      });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blockId: string;
        found: boolean;
        locations: Array<{ nodeId: string }>;
      };
      expect(body.blockId).toBe('block-001');
      expect(body.found).toBe(true);
      expect(body.locations).toHaveLength(2);
      expect(discoveryProtocol!.discoverBlock).toHaveBeenCalledWith('block-001');
    });

    it('returns empty result when no discovery protocol is available', async () => {
      const { handlers } = createController(undefined, false);
      const result = await handlers.discoverBlock({
        params: { blockId: 'block-001' },
      });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        found: boolean;
        locations: unknown[];
      };
      expect(body.found).toBe(false);
      expect(body.locations).toHaveLength(0);
    });
  });

  describe('deleteBlock', () => {
    it('deletes existing block and returns success', async () => {
      const { handlers, blockStore } = createController();
      const result = await handlers.deleteBlock({
        params: { blockId: 'block-001' },
      });

      expect(result.statusCode).toBe(200);
      expect((result.response as IApiMessageResponse).message).toBe(
        'Block deleted successfully',
      );
      expect(blockStore.delete).toHaveBeenCalledWith('block-001');
    });

    it('returns 404 when block does not exist', async () => {
      const { handlers } = createController();
      const result = await handlers.deleteBlock({
        params: { blockId: 'nonexistent-block' },
      });
      expect(result.statusCode).toBe(404);
    });
  });

  describe('searchBlocks', () => {
    it('returns 400 without query parameter', async () => {
      const { handlers } = createController();
      const result = await handlers.searchBlocks({ query: {} });
      expect(result.statusCode).toBe(400);
    });

    it('returns matching blocks by hash prefix', async () => {
      const { handlers } = createController();
      const result = await handlers.searchBlocks({ query: { q: 'block-00' } });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blocks: Array<{ hash: string }>;
        source: string;
      };
      expect(body.source).toBe('local');
      expect(body.blocks.length).toBe(3); // all match "block-00"
    });

    it('returns empty for non-matching prefix', async () => {
      const { handlers } = createController();
      const result = await handlers.searchBlocks({ query: { q: 'zzz' } });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blocks: Array<{ hash: string }>;
      };
      expect(body.blocks).toHaveLength(0);
    });

    it('scopes search to a specific pool', async () => {
      const { handlers } = createController();
      const result = await handlers.searchBlocks({ query: { q: 'block', pool: 'pool-2' } });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blocks: Array<{ hash: string; pool: string }>;
      };
      expect(body.blocks).toHaveLength(1);
      expect(body.blocks[0].pool).toBe('pool-2');
    });
  });

  describe('networkSearch', () => {
    it('returns 400 without any search criteria', async () => {
      const { handlers } = createController();
      const result = await handlers.networkSearch({ body: {} });
      expect(result.statusCode).toBe(400);
    });

    it('discovers a block by ID across the network', async () => {
      const { handlers, discoveryProtocol } = createController();
      const result = await handlers.networkSearch({ body: { blockId: 'block-001' } });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        source: string;
        found: boolean;
        locations: Array<{ nodeId: string }>;
      };
      expect(body.source).toBe('network');
      expect(body.found).toBe(true);
      expect(body.locations).toHaveLength(2);
      expect(discoveryProtocol!.discoverBlock).toHaveBeenCalledWith('block-001', undefined);
    });

    it('searches CBL metadata by fileName', async () => {
      const { handlers, discoveryProtocol } = createController();
      const result = await handlers.networkSearch({ body: { fileName: 'test.pdf' } });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        source: string;
        hits: Array<{ sourceNodeId: string }>;
      };
      expect(body.source).toBe('network');
      expect(body.hits).toHaveLength(1);
      expect(body.hits[0].sourceNodeId).toBe('node-c');
      expect(discoveryProtocol!.searchCBLMetadata).toHaveBeenCalled();
    });

    it('returns warning when discovery protocol is unavailable', async () => {
      const { handlers } = createController(undefined, false);
      const result = await handlers.networkSearch({ body: { blockId: 'abc' } });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        warning: string;
        found: boolean;
      };
      expect(body.found).toBe(false);
      expect(body.warning).toContain('not available');
    });
  });
});
