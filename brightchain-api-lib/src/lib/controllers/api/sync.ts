import {
  Checksum,
  IAvailabilityService,
  IBlockLocationInfo,
  IBlockStore,
  ILocationRecord,
  IReconciliationService,
  IReplicationNodeResult,
  isPooledBlockStore,
} from '@brightchain/brightchain-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import {
  IGetBlockDataRequest,
  IGetBlockLocationsRequest,
  IReplicateBlockRequest,
  ISyncRequestBody,
} from '../../interfaces';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  IBlockDataResponse,
  IBlockLocationsResponse,
  IReconcileApiResponse,
  IReplicateBlockApiResponse,
  ISyncRequestApiResponse,
} from '../../interfaces/responses';
import { EventNotificationSystem } from '../../services/eventNotificationSystem';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type SyncApiResponse =
  | IReplicateBlockApiResponse
  | IBlockLocationsResponse
  | IBlockDataResponse
  | ISyncRequestApiResponse
  | IReconcileApiResponse
  | ApiErrorResponse;

interface SyncHandlers extends TypedHandlers {
  replicateBlock: ApiRequestHandler<
    IReplicateBlockApiResponse | ApiErrorResponse
  >;
  getBlockLocations: ApiRequestHandler<
    IBlockLocationsResponse | ApiErrorResponse
  >;
  getBlockData: ApiRequestHandler<IBlockDataResponse | ApiErrorResponse>;
  syncRequest: ApiRequestHandler<ISyncRequestApiResponse | ApiErrorResponse>;
  reconcile: ApiRequestHandler<IReconcileApiResponse | ApiErrorResponse>;
}

/**
 * Controller for block replication and synchronization operations.
 *
 * Provides REST API endpoints for replicating blocks to other nodes,
 * querying block locations, checking block availability, and triggering
 * reconciliation with peers.
 *
 * ## Endpoints
 *
 * ### POST /api/blocks/:blockId/replicate
 * Replicate a block to specified target nodes.
 *
 * **Parameters:**
 * - `blockId` (string, required): Block ID to replicate
 *
 * **Request Body:**
 * - `targetNodeIds` (string[], required): Array of node IDs to replicate to
 *
 * **Response:**
 * - `blockId` (string): The block ID that was replicated
 * - `replicationResults` (array): Results for each target node
 *
 * ### GET /api/blocks/:blockId/locations
 * Get all known locations for a block.
 *
 * **Parameters:**
 * - `blockId` (string, required): Block ID to query
 *
 * **Response:**
 * - `blockId` (string): The block ID queried
 * - `locations` (array): Array of location records
 *
 * ### GET /api/sync/blocks/:blockId
 * Get raw block data from the local store.
 *
 * **Parameters:**
 * - `blockId` (string, required): Block ID to retrieve
 *
 * **Query Parameters:**
 * - `poolId` (string, optional): Pool ID for pool-scoped retrieval
 *
 * **Response:**
 * - `blockId` (string): The block ID retrieved
 * - `data` (string): Base64-encoded raw block data
 *
 * ### POST /api/sync/request
 * Check which blocks are available locally and which need to be fetched.
 *
 * **Request Body:**
 * - `blockIds` (string[], required): Array of block IDs to check
 *
 * **Response:**
 * - `available` (string[]): Block IDs available locally
 * - `missing` (string[]): Block IDs that need to be fetched
 * - `unknown` (string[]): Block IDs with unknown status
 *
 * ### POST /api/sync/reconcile
 * Initiate reconciliation with connected peers.
 *
 * **Response:**
 * - `result` (object): Reconciliation result with statistics
 *
 * @requirements 4.1, 4.2, 4.3, 4.4
 */
export class SyncController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<TID, SyncApiResponse, SyncHandlers, CoreLanguageCode> {
  private availabilityService: IAvailabilityService | null = null;
  private reconciliationService: IReconciliationService | null = null;
  private eventSystem: EventNotificationSystem | null = null;
  private blockStore: IBlockStore | null = null;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Set the AvailabilityService instance.
   * This allows for dependency injection and testing.
   */
  public setAvailabilityService(service: IAvailabilityService): void {
    this.availabilityService = service;
  }

  /**
   * Set the ReconciliationService instance.
   * This allows for dependency injection and testing.
   */
  public setReconciliationService(service: IReconciliationService): void {
    this.reconciliationService = service;
  }

  /**
   * Set the EventNotificationSystem instance.
   * This allows for dependency injection and testing.
   * @requirements 4.5
   */
  public setEventSystem(eventSystem: EventNotificationSystem): void {
    this.eventSystem = eventSystem;
  }

  /**
   * Set the block store for serving block data to remote nodes.
   * This should be the local inner store (not AvailabilityAwareBlockStore).
   * @requirements 1.1
   */
  public setBlockStore(store: IBlockStore): void {
    this.blockStore = store;
  }

  /**
   * Get the AvailabilityService instance.
   * Throws if the service has not been set.
   */
  private getAvailabilityService(): IAvailabilityService {
    if (!this.availabilityService) {
      throw new Error('AvailabilityService not initialized');
    }
    return this.availabilityService;
  }

  /**
   * Get the ReconciliationService instance.
   * Throws if the service has not been set.
   */
  private getReconciliationService(): IReconciliationService {
    if (!this.reconciliationService) {
      throw new Error('ReconciliationService not initialized');
    }
    return this.reconciliationService;
  }

  /**
   * Get the block store instance.
   * Throws if the store has not been set.
   */
  private getBlockStore(): IBlockStore {
    if (!this.blockStore) {
      throw new Error('BlockStore not initialized');
    }
    return this.blockStore;
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('post', '/blocks/:blockId/replicate', {
        handlerKey: 'replicateBlock',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/blocks/:blockId/locations', {
        handlerKey: 'getBlockLocations',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/blocks/:blockId', {
        handlerKey: 'getBlockData',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/request', {
        handlerKey: 'syncRequest',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/reconcile', {
        handlerKey: 'reconcile',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      replicateBlock: this.handleReplicateBlock.bind(this),
      getBlockLocations: this.handleGetBlockLocations.bind(this),
      getBlockData: this.handleGetBlockData.bind(this),
      syncRequest: this.handleSyncRequest.bind(this),
      reconcile: this.handleReconcile.bind(this),
    };
  }

  /**
   * Convert ILocationRecord to response format
   */
  private locationToInfo(location: ILocationRecord): IBlockLocationInfo {
    return {
      nodeId: location.nodeId,
      lastSeen: location.lastSeen.toISOString(),
      latencyMs: location.latencyMs,
      isAuthoritative: location.isAuthoritative,
    };
  }

  /**
   * POST /api/sync/blocks/:blockId/replicate
   * Replicate a block to specified target nodes.
   *
   * @param req - Request containing block ID and target node IDs
   * @returns Replication results for each target node
   * @requirements 4.1, 4.5
   */
  private async handleReplicateBlock(req: unknown): Promise<{
    statusCode: number;
    response: IReplicateBlockApiResponse | ApiErrorResponse;
  }> {
    try {
      const typedReq = req as unknown as IReplicateBlockRequest;
      const { blockId } = typedReq.params;
      const { targetNodeIds } = typedReq.body;

      if (!blockId) {
        return validationError('Missing required parameter: blockId');
      }

      if (!targetNodeIds || !Array.isArray(targetNodeIds)) {
        return validationError(
          'Missing required field: targetNodeIds (must be an array)',
        );
      }

      if (targetNodeIds.length === 0) {
        return validationError('targetNodeIds array cannot be empty');
      }

      // Validate all node IDs are strings
      for (const nodeId of targetNodeIds) {
        if (typeof nodeId !== 'string') {
          return validationError('All targetNodeIds must be strings');
        }
      }

      const availabilityService = this.getAvailabilityService();

      // Check if block exists locally
      const locations = await availabilityService.getBlockLocations(blockId);
      const localNodeId = availabilityService.getLocalNodeId();
      const hasLocalCopy = locations.some((loc) => loc.nodeId === localNodeId);

      if (!hasLocalCopy && locations.length === 0) {
        return notFoundError('Block', blockId);
      }

      // Simulate replication to each target node
      // In a real implementation, this would send the block data to each node
      const replicationResults: IReplicationNodeResult[] = [];

      for (const nodeId of targetNodeIds) {
        try {
          // Update location metadata to indicate the block is now at this node
          await availabilityService.updateLocation(blockId, {
            nodeId,
            lastSeen: new Date(),
            isAuthoritative: false,
          });

          replicationResults.push({
            nodeId,
            success: true,
          });

          // Emit block:replicated event for successful replication
          if (this.eventSystem) {
            this.eventSystem.emitBlockReplicated(blockId, nodeId, true);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : 'Unknown error';
          replicationResults.push({
            nodeId,
            success: false,
            error: errorMessage,
          });

          // Emit block:replicated event for failed replication
          if (this.eventSystem) {
            this.eventSystem.emitBlockReplicated(
              blockId,
              nodeId,
              false,
              errorMessage,
            );
          }
        }
      }

      return {
        statusCode: 200,
        response: {
          message: 'Replication initiated',
          blockId,
          replicationResults,
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * GET /api/sync/blocks/:blockId/locations
   * Get all known locations for a block.
   *
   * @param req - Request containing the block ID parameter
   * @returns Array of location records
   * @requirements 4.2
   */
  private async handleGetBlockLocations(req: unknown): Promise<{
    statusCode: number;
    response: IBlockLocationsResponse | ApiErrorResponse;
  }> {
    try {
      const { blockId } = (req as unknown as IGetBlockLocationsRequest).params;

      if (!blockId) {
        return validationError('Missing required parameter: blockId');
      }

      const availabilityService = this.getAvailabilityService();
      const locations = await availabilityService.getBlockLocations(blockId);

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          blockId,
          locations: locations.map((loc) => this.locationToInfo(loc)),
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * GET /api/sync/blocks/:blockId
   * Get raw block data from the local store.
   * Supports optional poolId query parameter for pool-scoped retrieval.
   *
   * @param req - Request containing the block ID parameter and optional poolId query
   * @returns Block data as base64-encoded string, or 404 if not found
   * @requirements 1.1
   */
  private async handleGetBlockData(req: unknown): Promise<{
    statusCode: number;
    response: IBlockDataResponse | ApiErrorResponse;
  }> {
    try {
      const typedReq = req as IGetBlockDataRequest;
      const { blockId } = typedReq.params;

      if (!blockId) {
        return validationError('Missing required parameter: blockId');
      }

      const store = this.getBlockStore();
      const poolId = typedReq.query?.poolId;

      let data: Uint8Array;

      if (poolId && isPooledBlockStore(store)) {
        // Pool-scoped retrieval
        const hasBlock = await store.hasInPool(poolId, blockId);
        if (!hasBlock) {
          return notFoundError('Block', blockId);
        }
        data = await store.getFromPool(poolId, blockId);
      } else {
        // Standard retrieval from the local store
        const hasBlock = await store.has(blockId);
        if (!hasBlock) {
          return notFoundError('Block', blockId);
        }
        const checksum = Checksum.fromHex(blockId);
        const block = await store.getData(checksum);
        data = block.data;
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          blockId,
          data: Buffer.from(data).toString('base64'),
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * POST /api/sync/request
   * Check which blocks are available locally and which need to be fetched.
   *
   * @param req - Request containing array of block IDs to check
   * @returns Partitioned lists of available, missing, and unknown blocks
   * @requirements 4.3
   */
  private async handleSyncRequest(req: unknown): Promise<{
    statusCode: number;
    response: ISyncRequestApiResponse | ApiErrorResponse;
  }> {
    try {
      const { blockIds } = (req as unknown as ISyncRequestBody).body;

      if (!blockIds || !Array.isArray(blockIds)) {
        return validationError(
          'Missing required field: blockIds (must be an array)',
        );
      }

      // Validate all block IDs are strings
      for (const blockId of blockIds) {
        if (typeof blockId !== 'string') {
          return validationError('All blockIds must be strings');
        }
      }

      const availabilityService = this.getAvailabilityService();
      const localNodeId = availabilityService.getLocalNodeId();

      const available: string[] = [];
      const missing: string[] = [];
      const unknown: string[] = [];

      for (const blockId of blockIds) {
        try {
          const locations =
            await availabilityService.getBlockLocations(blockId);

          if (locations.length === 0) {
            // No known locations - unknown status
            unknown.push(blockId);
          } else if (locations.some((loc) => loc.nodeId === localNodeId)) {
            // Block is available locally
            available.push(blockId);
          } else {
            // Block exists but not locally - needs to be fetched
            missing.push(blockId);
          }
        } catch {
          // Error querying - treat as unknown
          unknown.push(blockId);
        }
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          available,
          missing,
          unknown,
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * POST /api/sync/reconcile
   * Initiate reconciliation with connected peers.
   *
   * @returns Reconciliation result with statistics
   * @requirements 4.4
   */
  private async handleReconcile(): Promise<{
    statusCode: number;
    response: IReconcileApiResponse | ApiErrorResponse;
  }> {
    try {
      const reconciliationService = this.getReconciliationService();
      const availabilityService = this.getAvailabilityService();

      // Get list of connected peers (not in partition mode)
      let peerIds: string[] = [];

      if (!availabilityService.isInPartitionMode()) {
        // In a real implementation, we would get the list of connected peers
        // For now, we'll use an empty list which will result in a no-op reconciliation
        peerIds = [];
      }

      const result = await reconciliationService.reconcile(peerIds);

      return {
        statusCode: 200,
        response: {
          message: 'Reconciliation completed',
          result,
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }
}
