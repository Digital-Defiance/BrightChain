/**
 * Unit tests for SyncController block data endpoint (GET /api/sync/blocks/:blockId)
 *
 * Tests the handleGetBlockData handler for:
 * - Successful block retrieval returning base64-encoded raw data
 * - 404 for missing blocks
 * - Pool-scoped retrieval via poolId query parameter
 * - Validation error for missing blockId parameter
 *
 * **Validates: Requirements 1.1, 5.2**
 */

import {
  AvailabilityServiceConfig,
  AvailabilityState,
  AvailabilityStatistics,
  BlockSize,
  Checksum,
  IAvailabilityService,
  IBlockStore,
  ILocationRecord,
  IPooledBlockStore,
  IReconciliationService,
  LocationQueryResult,
  PendingSyncItem,
  RawDataBlock,
  ReconciliationConfig,
  ReconciliationEventHandler,
  ReconciliationResult,
  SyncVectorEntry,
} from '@brightchain/brightchain-lib';
import { ApiErrorResponse } from '@digitaldefiance/node-express-suite';
import { IBrightChainApplication } from '../../interfaces';
import { IBlockDataResponse } from '../../interfaces/responses/block-data-response';
import { SyncController } from './sync';

// ─── Mock Factories ───────────────────────────────────────────────────────────

const createMockApplication = (): IBrightChainApplication => {
  const mockServices = {
    get: () => undefined,
  };

  return {
    db: {
      connection: {
        readyState: 1,
      },
    },
    environment: {
      mongo: {
        useTransactions: false,
      },
      debug: false,
    },
    constants: {},
    ready: true,
    services: mockServices,
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
};

const createMockAvailabilityService = (
  localNodeId = 'local-node-1',
): IAvailabilityService => ({
  getLocalNodeId: () => localNodeId,
  isInPartitionMode: () => false,
  getDisconnectedPeers: () => [],
  getAvailabilityState: async () => AvailabilityState.Unknown,
  getBlockLocations: async (): Promise<ILocationRecord[]> => [],
  queryBlockLocation: async (
    blockId: string,
  ): Promise<LocationQueryResult> => ({
    blockId,
    state: AvailabilityState.Unknown,
    locations: [],
    isStale: false,
    lastUpdated: new Date(),
  }),
  listBlocksByState: async () => [],
  getStatistics: async (): Promise<AvailabilityStatistics> => ({
    localCount: 0,
    remoteCount: 0,
    cachedCount: 0,
    orphanedCount: 0,
    unknownCount: 0,
    totalKnownLocations: 0,
    averageLocationsPerBlock: 0,
  }),
  updateLocation: async () => {},
  removeLocation: async () => {},
  setAvailabilityState: async () => {},
  enterPartitionMode: () => {},
  exitPartitionMode: async (): Promise<ReconciliationResult> => ({
    success: true,
    peersReconciled: 0,
    blocksDiscovered: 0,
    blocksUpdated: 0,
    orphansResolved: 0,
    conflictsResolved: 0,
    errors: [],
    duration: 0,
  }),
  onEvent: () => {},
  offEvent: () => {},
  start: async () => {},
  stop: async () => {},
  isRunning: () => true,
  getConfig: (): AvailabilityServiceConfig => ({
    localNodeId,
    stalenessThresholdMs: 300000,
    queryTimeoutMs: 10000,
  }),
});

const createMockReconciliationService = (): IReconciliationService => ({
  reconcile: async (peerIds: string[]): Promise<ReconciliationResult> => ({
    success: true,
    peersReconciled: peerIds.length,
    blocksDiscovered: 0,
    blocksUpdated: 0,
    orphansResolved: 0,
    conflictsResolved: 0,
    errors: [],
    duration: 100,
  }),
  getSyncVector: (): SyncVectorEntry | null => null,
  getAllSyncVectors: () => new Map(),
  updateSyncVector: () => {},
  initializeSyncVector: () => {},
  getPendingSyncQueue: (): PendingSyncItem[] => [],
  addToPendingSyncQueue: () => {},
  processPendingSyncQueue: async () => {},
  clearPendingSyncQueue: () => {},
  persistSyncVectors: async () => {},
  loadSyncVectors: async () => {},
  persistPendingSyncQueue: async () => {},
  loadPendingSyncQueue: async () => {},
  onEvent: (_handler: ReconciliationEventHandler) => {},
  offEvent: (_handler: ReconciliationEventHandler) => {},
  getConfig: (): ReconciliationConfig => ({
    manifestExchangeTimeoutMs: 30000,
    maxConcurrentReconciliations: 5,
    syncVectorPath: 'sync-vectors.json',
    pendingSyncQueuePath: 'pending-sync-queue.json',
    maxPendingSyncQueueSize: 1000,
  }),
});

// Type for accessing private handlers on SyncController
interface SyncControllerTestAccess {
  handlers: {
    getBlockData: (req: unknown) => Promise<{
      statusCode: number;
      response: IBlockDataResponse | ApiErrorResponse;
    }>;
  };
}

// ─── Helper: create a controller with a mock block store ──────────────────────

function createControllerWithBlockStore(store: IBlockStore): SyncController {
  const mockApp = createMockApplication();
  const controller = new SyncController(mockApp as never);
  controller.setAvailabilityService(createMockAvailabilityService());
  controller.setReconciliationService(createMockReconciliationService());
  controller.setBlockStore(store);
  return controller;
}

function getBlockDataHandler(controller: SyncController) {
  return (controller as unknown as SyncControllerTestAccess).handlers
    .getBlockData;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SyncController handleGetBlockData', () => {
  const testBlockId = 'a'.repeat(128);
  const testBlockData = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);

  describe('successful block retrieval', () => {
    it('should return 200 with base64-encoded block data when block exists', async () => {
      const mockRawDataBlock = {
        data: testBlockData,
      } as RawDataBlock;

      const mockStore: Partial<IBlockStore> = {
        has: jest.fn().mockResolvedValue(true),
        getData: jest.fn().mockResolvedValue(mockRawDataBlock),
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      const result = await handler({
        params: { blockId: testBlockId },
        query: {},
      });

      expect(result.statusCode).toBe(200);
      const response = result.response as IBlockDataResponse;
      expect(response.message).toBe('OK');
      expect(response.blockId).toBe(testBlockId);
      expect(response.data).toBe(Buffer.from(testBlockData).toString('base64'));
    });

    it('should call store.has with the blockId', async () => {
      const hasFn = jest.fn().mockResolvedValue(true);
      const mockStore: Partial<IBlockStore> = {
        has: hasFn,
        getData: jest
          .fn()
          .mockResolvedValue({ data: testBlockData } as RawDataBlock),
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      await handler({
        params: { blockId: testBlockId },
        query: {},
      });

      expect(hasFn).toHaveBeenCalledWith(testBlockId);
    });

    it('should call store.getData with a Checksum created from the blockId', async () => {
      const getDataFn = jest.fn().mockResolvedValue({
        data: testBlockData,
      } as RawDataBlock);

      const mockStore: Partial<IBlockStore> = {
        has: jest.fn().mockResolvedValue(true),
        getData: getDataFn,
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      await handler({
        params: { blockId: testBlockId },
        query: {},
      });

      expect(getDataFn).toHaveBeenCalledTimes(1);
      const checksumArg = getDataFn.mock.calls[0][0];
      expect(checksumArg).toBeInstanceOf(Checksum);
    });
  });

  describe('404 for missing blocks', () => {
    it('should return 404 when store.has returns false', async () => {
      const mockStore: Partial<IBlockStore> = {
        has: jest.fn().mockResolvedValue(false),
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      const result = await handler({
        params: { blockId: testBlockId },
        query: {},
      });

      expect(result.statusCode).toBe(404);
    });

    it('should not call getData when block is not found', async () => {
      const getDataFn = jest.fn();
      const mockStore: Partial<IBlockStore> = {
        has: jest.fn().mockResolvedValue(false),
        getData: getDataFn,
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      await handler({
        params: { blockId: testBlockId },
        query: {},
      });

      expect(getDataFn).not.toHaveBeenCalled();
    });
  });

  describe('pool-scoped retrieval', () => {
    const testPoolId = 'test-pool-1';

    it('should use pool-scoped methods when poolId is provided and store is pooled', async () => {
      const poolData = new Uint8Array([10, 20, 30, 40]);
      const hasInPoolFn = jest.fn().mockResolvedValue(true);
      const getFromPoolFn = jest.fn().mockResolvedValue(poolData);

      const mockPooledStore: Partial<IPooledBlockStore> = {
        hasInPool: hasInPoolFn,
        getFromPool: getFromPoolFn,
        putInPool: jest.fn(),
        deleteFromPool: jest.fn(),
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockPooledStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      const result = await handler({
        params: { blockId: testBlockId },
        query: { poolId: testPoolId },
      });

      expect(result.statusCode).toBe(200);
      expect(hasInPoolFn).toHaveBeenCalledWith(testPoolId, testBlockId);
      expect(getFromPoolFn).toHaveBeenCalledWith(testPoolId, testBlockId);

      const response = result.response as IBlockDataResponse;
      expect(response.data).toBe(Buffer.from(poolData).toString('base64'));
    });

    it('should return 404 when block is not found in the specified pool', async () => {
      const mockPooledStore: Partial<IPooledBlockStore> = {
        hasInPool: jest.fn().mockResolvedValue(false),
        getFromPool: jest.fn(),
        putInPool: jest.fn(),
        deleteFromPool: jest.fn(),
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockPooledStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      const result = await handler({
        params: { blockId: testBlockId },
        query: { poolId: testPoolId },
      });

      expect(result.statusCode).toBe(404);
    });

    it('should fall back to standard retrieval when poolId is provided but store is not pooled', async () => {
      const mockStore: Partial<IBlockStore> = {
        has: jest.fn().mockResolvedValue(true),
        getData: jest.fn().mockResolvedValue({
          data: testBlockData,
        } as RawDataBlock),
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      const result = await handler({
        params: { blockId: testBlockId },
        query: { poolId: testPoolId },
      });

      // Non-pooled store with poolId falls through to standard retrieval
      expect(result.statusCode).toBe(200);
      expect(mockStore.has).toHaveBeenCalledWith(testBlockId);
    });
  });

  describe('validation errors', () => {
    it('should return 400 when blockId is missing', async () => {
      const mockStore: Partial<IBlockStore> = {
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      const result = await handler({
        params: { blockId: '' },
        query: {},
      });

      expect(result.statusCode).toBe(400);
    });

    it('should return 400 when blockId is undefined', async () => {
      const mockStore: Partial<IBlockStore> = {
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      const result = await handler({
        params: {},
        query: {},
      });

      expect(result.statusCode).toBe(400);
    });
  });

  describe('error handling', () => {
    it('should handle errors thrown by store.getData gracefully', async () => {
      const mockStore: Partial<IBlockStore> = {
        has: jest.fn().mockResolvedValue(true),
        getData: jest.fn().mockRejectedValue(new Error('Store read failure')),
        blockSize: BlockSize.Small,
      };

      const controller = createControllerWithBlockStore(
        mockStore as IBlockStore,
      );
      const handler = getBlockDataHandler(controller);

      const result = await handler({
        params: { blockId: testBlockId },
        query: {},
      });

      // handleError wraps the error into an error response
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
});
