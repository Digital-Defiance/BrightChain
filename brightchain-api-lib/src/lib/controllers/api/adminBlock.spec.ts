/**
 * Unit tests for AdminBlockController.
 *
 * Tests the handler-level behavior of listBlocks, getBlockMetadata,
 * discoverBlock, and deleteBlock by mocking blockStore and discoveryProtocol.
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

const mockBlocks = [
  {
    blockId: 'block-001',
    size: 1024,
    durabilityLevel: 'standard',
    createdAt: '2025-01-01T00:00:00Z',
    expiresAt: null,
    accessCount: 5,
    replicationStatus: 'replicated',
    parityBlockIds: ['parity-001a', 'parity-001b'],
    lastAccessedAt: '2025-01-15T00:00:00Z',
    targetReplicationFactor: 3,
    replicaNodeIds: ['node-a', 'node-b'],
    checksum: 'abc123',
    poolId: 'pool-1',
  },
  {
    blockId: 'block-002',
    size: 2048,
    durabilityLevel: 'enhanced',
    createdAt: '2025-01-05T00:00:00Z',
    expiresAt: '2025-12-31T00:00:00Z',
    accessCount: 10,
    replicationStatus: 'pending',
    parityBlockIds: [],
    lastAccessedAt: '2025-01-16T00:00:00Z',
    targetReplicationFactor: 5,
    replicaNodeIds: [],
    checksum: 'def456',
    poolId: null,
  },
  {
    blockId: 'block-003',
    size: 512,
    durabilityLevel: 'standard',
    createdAt: '2025-01-10T00:00:00Z',
    expiresAt: null,
    accessCount: 0,
    replicationStatus: 'local_only',
    parityBlockIds: [],
    lastAccessedAt: null,
    targetReplicationFactor: 1,
    replicaNodeIds: [],
    checksum: 'ghi789',
    poolId: 'pool-2',
  },
];

// ─── Mock Factory ────────────────────────────────────────────────────────────

function createMockBlockStore(blocks: typeof mockBlocks = mockBlocks) {
  return {
    listBlocks: jest.fn(
      async (options: {
        page: number;
        limit: number;
        durabilityLevel?: string;
        sortBy?: string;
      }) => {
        let filtered = [...blocks];
        if (options.durabilityLevel) {
          filtered = filtered.filter(
            (b) => b.durabilityLevel === options.durabilityLevel,
          );
        }
        if (options.sortBy === 'size') {
          filtered.sort((a, b) => a.size - b.size);
        } else {
          // default: createdAt
          filtered.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          );
        }
        const total = filtered.length;
        const skip = (options.page - 1) * options.limit;
        return {
          blocks: filtered.slice(skip, skip + options.limit),
          total,
        };
      },
    ),
    getBlockMetadata: jest.fn(async (blockId: string) => {
      return blocks.find((b) => b.blockId === blockId) ?? null;
    }),
    deleteBlock: jest.fn(async (blockId: string) => {
      return blocks.some((b) => b.blockId === blockId);
    }),
  };
}

function createMockDiscoveryProtocol() {
  return {
    discoverBlock: jest.fn(async (_blockId: string) => ({
      found: true,
      locations: [{ nodeId: 'node-a' }, { nodeId: 'node-b' }],
      queriedPeers: 5,
      duration: 120,
    })),
  };
}

function createMockApplication(
  blockStore: ReturnType<typeof createMockBlockStore>,
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
    getModel: () => {
      throw new Error('not implemented');
    },
    getController: () => {
      throw new Error('not implemented');
    },
    setController: () => {},
    start: async () => {},
  } as unknown as IBrightChainApplication;
}

function createController(blocks?: typeof mockBlocks, withDiscovery = true) {
  const blockStore = createMockBlockStore(blocks);
  const discoveryProtocol = withDiscovery
    ? createMockDiscoveryProtocol()
    : undefined;
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
  describe('listBlocks', () => {
    /**
     * Requirement 13.1: GET /api/admin/blocks returns paginated block list
     */
    it('returns paginated block list with metadata fields', async () => {
      const { handlers } = createController();
      const result = await handlers.listBlocks({ query: {} });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blocks: Array<Record<string, unknown>>;
        total: number;
        page: number;
        limit: number;
      };
      expect(body.message).toBe('OK');
      expect(body.total).toBe(3);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(20);
      expect(body.blocks).toHaveLength(3);

      // Verify block has expected metadata fields
      const block = body.blocks[0];
      expect(block).toHaveProperty('blockId');
      expect(block).toHaveProperty('size');
      expect(block).toHaveProperty('durabilityLevel');
      expect(block).toHaveProperty('createdAt');
    });

    /**
     * Requirement 13.5: Filter by durabilityLevel
     */
    it('filters by durabilityLevel', async () => {
      const { handlers, blockStore } = createController();
      const result = await handlers.listBlocks({
        query: { durabilityLevel: 'standard' },
      });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blocks: Array<Record<string, unknown>>;
        total: number;
      };
      expect(body.total).toBe(2);
      expect(body.blocks).toHaveLength(2);
      expect(blockStore.listBlocks).toHaveBeenCalledWith(
        expect.objectContaining({ durabilityLevel: 'standard' }),
      );
    });

    /**
     * Requirement 13.5: Sort by size
     */
    it('sorts by sortBy parameter', async () => {
      const { handlers, blockStore } = createController();
      const result = await handlers.listBlocks({
        query: { sortBy: 'size' },
      });

      expect(result.statusCode).toBe(200);
      const body = result.response as IApiMessageResponse & {
        blocks: Array<Record<string, unknown>>;
      };
      // Sorted by size ascending: 512, 1024, 2048
      expect((body.blocks[0] as { size: number }).size).toBe(512);
      expect((body.blocks[2] as { size: number }).size).toBe(2048);
      expect(blockStore.listBlocks).toHaveBeenCalledWith(
        expect.objectContaining({ sortBy: 'size' }),
      );
    });
  });

  describe('getBlockMetadata', () => {
    /**
     * Requirement 13.2: GET /api/admin/blocks/:blockId returns full metadata
     */
    it('returns full metadata for existing block', async () => {
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
      expect(body.block.size).toBe(1024);
      expect(body.block.durabilityLevel).toBe('standard');
      expect(body.block.parityBlockIds).toEqual(['parity-001a', 'parity-001b']);
      expect(body.block.checksum).toBe('abc123');
    });

    /**
     * Requirement 13.2: returns 404 for non-existent block
     */
    it('returns 404 for non-existent block', async () => {
      const { handlers } = createController();
      const result = await handlers.getBlockMetadata({
        params: { blockId: 'nonexistent-block' },
      });

      expect(result.statusCode).toBe(404);
    });
  });

  describe('discoverBlock', () => {
    /**
     * Requirement 13.3: POST /api/admin/blocks/:blockId/discover delegates to DiscoveryProtocol
     */
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
        queriedPeers: number;
        duration: number;
      };
      expect(body.blockId).toBe('block-001');
      expect(body.found).toBe(true);
      expect(body.locations).toHaveLength(2);
      expect(body.locations[0].nodeId).toBe('node-a');
      expect(body.queriedPeers).toBe(5);
      expect(body.duration).toBe(120);
      expect(discoveryProtocol!.discoverBlock).toHaveBeenCalledWith(
        'block-001',
      );
    });
  });

  describe('deleteBlock', () => {
    /**
     * Requirement 13.4: DELETE /api/admin/blocks/:blockId removes block and parity blocks
     */
    it('removes block and returns success', async () => {
      const { handlers, blockStore } = createController();
      const result = await handlers.deleteBlock({
        params: { blockId: 'block-001' },
      });

      expect(result.statusCode).toBe(200);
      expect((result.response as IApiMessageResponse).message).toBe(
        'Block deleted successfully',
      );
      expect(blockStore.deleteBlock).toHaveBeenCalledWith('block-001');
    });

    /**
     * Requirement 13.4: returns 404 for non-existent block
     */
    it('returns 404 when block does not exist', async () => {
      const { handlers } = createController();
      const result = await handlers.deleteBlock({
        params: { blockId: 'nonexistent-block' },
      });

      expect(result.statusCode).toBe(404);
    });
  });
});
