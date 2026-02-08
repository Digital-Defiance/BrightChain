import {
  DiscoveryResult,
  IAvailabilityService,
  IDiscoverBlockResponse,
  IDiscoveryProtocol,
  IGetNodeResponse,
  IListNodesResponse,
  ILocationRecord,
  INodeInfo,
  IRegisterNodeResponse,
  NodeStatus,
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
  IDiscoverBlockRequest,
  IGetNodeRequest,
  IRegisterNodeRequest,
} from '../../interfaces';
import { IBrightChainApplication } from '../../interfaces/application';
import { DefaultBackendIdType } from '../../shared-types';
import {
  handleError,
  notFoundError,
  validationError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type NodesApiResponse =
  | IListNodesResponse
  | IGetNodeResponse
  | IDiscoverBlockResponse
  | IRegisterNodeResponse
  | ApiErrorResponse;

interface NodesHandlers extends TypedHandlers {
  listNodes: ApiRequestHandler<IListNodesResponse | ApiErrorResponse>;
  getNode: ApiRequestHandler<IGetNodeResponse | ApiErrorResponse>;
  discoverBlock: ApiRequestHandler<IDiscoverBlockResponse | ApiErrorResponse>;
  registerNode: ApiRequestHandler<IRegisterNodeResponse | ApiErrorResponse>;
}

/**
 * Controller for node discovery and network management operations.
 *
 * Provides REST API endpoints for listing connected nodes, getting node details,
 * discovering blocks across the network, and registering nodes for WebSocket authentication.
 *
 * ## Endpoints
 *
 * ### GET /api/nodes
 * List all connected peer nodes with their status and capabilities.
 *
 * **Response:**
 * - `nodes` (array): Array of node information objects
 * - `total` (number): Total number of connected nodes
 *
 * ### GET /api/nodes/:nodeId
 * Get detailed information about a specific node.
 *
 * **Parameters:**
 * - `nodeId` (string, required): Node ID to retrieve
 *
 * **Response:**
 * - `node` (object): Node information including latency and last seen timestamp
 *
 * ### POST /api/nodes/discover
 * Discover nodes that have a specific block.
 *
 * **Request Body:**
 * - `blockId` (string, required): Block ID to discover
 *
 * **Response:**
 * - `blockId` (string): The block ID that was searched for
 * - `found` (boolean): Whether the block was found
 * - `locations` (array): Nodes where the block was found
 * - `queriedPeers` (number): Number of peers queried
 * - `duration` (number): Discovery duration in milliseconds
 *
 * ### POST /api/nodes/register
 * Register a node's public key for WebSocket authentication.
 *
 * **Request Body:**
 * - `nodeId` (string, required): Node ID to register
 * - `publicKey` (string, required): Public key for authentication
 *
 * **Response:**
 * - `success` (boolean): Whether registration succeeded
 * - `nodeId` (string): The registered node ID
 * - `message` (string): Status message
 *
 * @requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class NodesController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  NodesApiResponse,
  NodesHandlers,
  CoreLanguageCode
> {
  private discoveryProtocol: IDiscoveryProtocol | null = null;
  private availabilityService: IAvailabilityService | null = null;

  /**
   * Store for registered node public keys (nodeId -> publicKey)
   */
  private registeredNodes: Map<string, string> = new Map();

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Set the DiscoveryProtocol instance.
   * This allows for dependency injection and testing.
   */
  public setDiscoveryProtocol(protocol: IDiscoveryProtocol): void {
    this.discoveryProtocol = protocol;
  }

  /**
   * Set the AvailabilityService instance.
   * This allows for dependency injection and testing.
   */
  public setAvailabilityService(service: IAvailabilityService): void {
    this.availabilityService = service;
  }

  /**
   * Get the DiscoveryProtocol instance.
   * Throws if the protocol has not been set.
   */
  private getDiscoveryProtocol(): IDiscoveryProtocol {
    if (!this.discoveryProtocol) {
      throw new Error('DiscoveryProtocol not initialized');
    }
    return this.discoveryProtocol;
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
   * Check if a node is registered.
   * @param nodeId - The node ID to check
   * @returns True if the node is registered
   */
  public isNodeRegistered(nodeId: string): boolean {
    return this.registeredNodes.has(nodeId);
  }

  /**
   * Get the public key for a registered node.
   * @param nodeId - The node ID to get the public key for
   * @returns The public key or undefined if not registered
   */
  public getNodePublicKey(nodeId: string): string | undefined {
    return this.registeredNodes.get(nodeId);
  }

  /**
   * Clear all registered nodes (for testing).
   */
  public clearRegisteredNodes(): void {
    this.registeredNodes.clear();
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'listNodes',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/:nodeId', {
        handlerKey: 'getNode',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/discover', {
        handlerKey: 'discoverBlock',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
      routeConfig('post', '/register', {
        handlerKey: 'registerNode',
        useAuthentication: false,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      listNodes: this.handleListNodes.bind(this),
      getNode: this.handleGetNode.bind(this),
      discoverBlock: this.handleDiscoverBlock.bind(this),
      registerNode: this.handleRegisterNode.bind(this),
    };
  }

  /**
   * Convert ILocationRecord to node info format
   */
  private locationToNodeInfo(location: ILocationRecord): INodeInfo {
    return {
      nodeId: location.nodeId,
      status: NodeStatus.ONLINE,
      capabilities: ['block_storage'],
      lastSeen: location.lastSeen.toISOString(),
      latencyMs: location.latencyMs,
    };
  }

  /**
   * GET /api/nodes
   * List all connected peer nodes with their status and capabilities.
   *
   * @returns List of connected nodes
   * @requirements 3.1
   */
  private async handleListNodes(): Promise<{
    statusCode: number;
    response: IListNodesResponse | ApiErrorResponse;
  }> {
    try {
      // Get nodes from availability service if available
      const availabilityService = this.availabilityService;
      const nodes: INodeInfo[] = [];

      if (availabilityService) {
        // Get the local node ID
        const localNodeId = availabilityService.getLocalNodeId();

        // Add local node
        if (localNodeId) {
          nodes.push({
            nodeId: localNodeId,
            status: NodeStatus.ONLINE,
            capabilities: ['block_storage', 'message_routing'],
            lastSeen: new Date().toISOString(),
          });
        }

        // Get disconnected peers if in partition mode
        if (availabilityService.isInPartitionMode()) {
          const disconnectedPeers = availabilityService.getDisconnectedPeers();
          for (const peerId of disconnectedPeers) {
            nodes.push({
              nodeId: peerId,
              status: NodeStatus.UNREACHABLE,
              capabilities: ['block_storage'],
              lastSeen: new Date().toISOString(),
            });
          }
        }
      }

      // Add registered nodes that aren't already in the list
      for (const [nodeId, publicKey] of this.registeredNodes) {
        if (!nodes.some((n) => n.nodeId === nodeId)) {
          nodes.push({
            nodeId,
            publicKey,
            status: NodeStatus.ONLINE,
            capabilities: ['block_storage'],
            lastSeen: new Date().toISOString(),
          });
        }
      }

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          nodes,
          total: nodes.length,
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * GET /api/nodes/:nodeId
   * Get detailed information about a specific node.
   *
   * @param req - Request containing the node ID parameter
   * @returns Node information on success, or 404 if not found
   * @requirements 3.2, 3.5
   */
  private async handleGetNode(req: unknown): Promise<{
    statusCode: number;
    response: IGetNodeResponse | ApiErrorResponse;
  }> {
    try {
      const { nodeId } = (req as unknown as IGetNodeRequest).params;

      if (!nodeId) {
        return validationError('Missing required parameter: nodeId');
      }

      // Check if node is registered
      const publicKey = this.registeredNodes.get(nodeId);

      // Check availability service for node info
      const availabilityService = this.availabilityService;
      let status = NodeStatus.ONLINE;

      if (availabilityService) {
        const localNodeId = availabilityService.getLocalNodeId();

        if (nodeId === localNodeId) {
          return {
            statusCode: 200,
            response: {
              message: 'OK',
              node: {
                nodeId,
                publicKey,
                status: NodeStatus.ONLINE,
                capabilities: ['block_storage', 'message_routing'],
                lastSeen: new Date().toISOString(),
              },
            },
          };
        }

        // Check if node is in disconnected peers
        if (availabilityService.isInPartitionMode()) {
          const disconnectedPeers = availabilityService.getDisconnectedPeers();
          if (disconnectedPeers.includes(nodeId)) {
            status = NodeStatus.UNREACHABLE;
          }
        }
      }

      // If node is registered, return its info
      if (publicKey !== undefined) {
        return {
          statusCode: 200,
          response: {
            message: 'OK',
            node: {
              nodeId,
              publicKey,
              status,
              capabilities: ['block_storage'],
              lastSeen: new Date().toISOString(),
            },
          },
        };
      }

      // Node not found
      return notFoundError('Node', nodeId);
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * POST /api/nodes/discover
   * Discover nodes that have a specific block.
   *
   * @param req - Request containing the block ID to discover
   * @returns Discovery result with locations
   * @requirements 3.3
   */
  private async handleDiscoverBlock(req: unknown): Promise<{
    statusCode: number;
    response: IDiscoverBlockResponse | ApiErrorResponse;
  }> {
    try {
      const { blockId } = (req as unknown as IDiscoverBlockRequest).body;

      if (!blockId) {
        return validationError('Missing required field: blockId');
      }

      if (typeof blockId !== 'string') {
        return validationError('Invalid field type: blockId must be a string');
      }

      const discoveryProtocol = this.getDiscoveryProtocol();
      const result: DiscoveryResult =
        await discoveryProtocol.discoverBlock(blockId);

      // Convert locations to response format
      const locations = result.locations.map((loc: ILocationRecord) => ({
        nodeId: loc.nodeId,
        latencyMs: loc.latencyMs,
        lastSeen: loc.lastSeen.toISOString(),
      }));

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          blockId: result.blockId,
          found: result.found,
          locations,
          queriedPeers: result.queriedPeers,
          duration: result.duration,
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * POST /api/nodes/register
   * Register a node's public key for WebSocket authentication.
   *
   * @param req - Request containing node ID and public key
   * @returns Registration result
   * @requirements 3.4, 3.5
   */
  private async handleRegisterNode(req: unknown): Promise<{
    statusCode: number;
    response: IRegisterNodeResponse | ApiErrorResponse;
  }> {
    try {
      const { nodeId, publicKey } = (req as unknown as IRegisterNodeRequest)
        .body;

      if (!nodeId) {
        return validationError('Missing required field: nodeId');
      }

      if (!publicKey) {
        return validationError('Missing required field: publicKey');
      }

      if (typeof nodeId !== 'string') {
        return validationError('Invalid field type: nodeId must be a string');
      }

      if (typeof publicKey !== 'string') {
        return validationError(
          'Invalid field type: publicKey must be a string',
        );
      }

      // Store the public key for WebSocket authentication
      this.registeredNodes.set(nodeId, publicKey);

      return {
        statusCode: 201,
        response: {
          message: 'Node registered successfully',
          success: true,
          nodeId,
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }
}
