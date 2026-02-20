/**
 * Property-Based Tests for Nodes Endpoints
 *
 * Feature: api-server-operations
 * Property 6: Node Discovery Returns Valid Locations
 * Property 7: Node Registration Enables Authentication
 *
 * **Validates: Requirements 3.3, 3.4**
 *
 * Property 6: For any blockId that exists on at least one node, POST /api/nodes/discover
 * SHALL return a non-empty locations array where each location contains a valid nodeId
 * that actually has the block.
 *
 * Property 7: For any node that registers via POST /api/nodes/register with valid credentials,
 * subsequent WebSocket connections with that nodeId SHALL successfully authenticate.
 */

import {
  BloomFilter,
  CBLMetadataSearchQuery,
  CBLMetadataSearchResult,
  DiscoveryConfig,
  DiscoveryResult,
  IAvailabilityService,
  IDiscoveryProtocol,
  ILocationRecord,
  NodeStatus,
  PeerQueryResult,
  PoolScopedBloomFilter,
} from '@brightchain/brightchain-lib';
import { ApiErrorResponse } from '@digitaldefiance/node-express-suite';
import * as fc from 'fast-check';
import { IBrightChainApplication } from '../../interfaces';
import {
  IDiscoverBlockApiResponse,
  IGetNodeApiResponse,
  IListNodesApiResponse,
  IRegisterNodeApiResponse,
} from '../../interfaces/responses';
import { NodesController } from './nodes';

// Mock application for testing
const createMockApplication = () => {
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

// Mock BloomFilter
const createMockBloomFilter = (): BloomFilter => ({
  data: 'mock-data',
  hashCount: 7,
  bitCount: 1000,
  itemCount: 0,
  mightContain: () => true,
});

// Mock DiscoveryProtocol
const createMockDiscoveryProtocol = (
  blockLocations: Map<string, ILocationRecord[]> = new Map(),
): IDiscoveryProtocol => {
  return {
    discoverBlock: async (blockId: string): Promise<DiscoveryResult> => {
      const locations = blockLocations.get(blockId) || [];
      return {
        blockId,
        found: locations.length > 0,
        locations,
        queriedPeers: locations.length > 0 ? 3 : 5,
        duration: Math.floor(Math.random() * 100) + 10,
      };
    },
    queryPeer: async (
      peerId: string,
      blockId: string,
    ): Promise<PeerQueryResult> => {
      const locations = blockLocations.get(blockId) || [];
      const hasBlock = locations.some((loc) => loc.nodeId === peerId);
      return {
        peerId,
        hasBlock,
        latencyMs: Math.floor(Math.random() * 50) + 5,
      };
    },
    getCachedLocations: (blockId: string): ILocationRecord[] | null => {
      return blockLocations.get(blockId) || null;
    },
    clearCache: () => {},
    clearAllCache: () => {},
    getPeerBloomFilter: async (): Promise<BloomFilter> => {
      return createMockBloomFilter();
    },
    getConfig: (): DiscoveryConfig => ({
      queryTimeoutMs: 5000,
      maxConcurrentQueries: 10,
      cacheTtlMs: 60000,
      bloomFilterFalsePositiveRate: 0.01,
      bloomFilterHashCount: 7,
    }),
    getPeerPoolScopedBloomFilter: async (): Promise<PoolScopedBloomFilter> => ({
      filters: new Map(),
      globalFilter: createMockBloomFilter(),
    }),
    searchCBLMetadata: async (
      query: CBLMetadataSearchQuery,
    ): Promise<CBLMetadataSearchResult> => ({
      query,
      hits: [],
      queriedPeers: 0,
      duration: 0,
    }),
  };
};

// Mock AvailabilityService
const createMockAvailabilityService = (
  localNodeId: string = 'local-node-1',
  isPartitioned: boolean = false,
  disconnectedPeers: string[] = [],
): IAvailabilityService => {
  return {
    getLocalNodeId: () => localNodeId,
    isInPartitionMode: () => isPartitioned,
    getDisconnectedPeers: () => disconnectedPeers,
    // Other methods not needed for these tests
    getAvailabilityState: async () => 0 as never,
    getBlockLocations: async () => [],
    queryBlockLocation: async () => ({}) as never,
    listBlocksByState: async () => [],
    getStatistics: async () => ({}) as never,
    updateLocation: async () => {},
    removeLocation: async () => {},
    setAvailabilityState: async () => {},
    enterPartitionMode: () => {},
    exitPartitionMode: async () => ({}) as never,
    onEvent: () => {},
    offEvent: () => {},
    start: async () => {},
    stop: async () => {},
    isRunning: () => true,
    getConfig: () => ({}) as never,
  };
};

// Type for accessing private handlers
interface NodesControllerHandlers {
  handlers: {
    listNodes: () => Promise<{
      statusCode: number;
      response: IListNodesApiResponse | ApiErrorResponse;
    }>;
    getNode: (req: unknown) => Promise<{
      statusCode: number;
      response: IGetNodeApiResponse | ApiErrorResponse;
    }>;
    discoverBlock: (req: unknown) => Promise<{
      statusCode: number;
      response: IDiscoverBlockApiResponse | ApiErrorResponse;
    }>;
    registerNode: (req: unknown) => Promise<{
      statusCode: number;
      response: IRegisterNodeApiResponse | ApiErrorResponse;
    }>;
  };
}

// Helper to create a controller instance with mocked dependencies
const createTestController = (
  discoveryProtocol?: IDiscoveryProtocol,
  availabilityService?: IAvailabilityService,
) => {
  const mockApp = createMockApplication();
  const controller = new NodesController(mockApp as never);

  if (discoveryProtocol) {
    controller.setDiscoveryProtocol(discoveryProtocol);
  }
  if (availabilityService) {
    controller.setAvailabilityService(availabilityService);
  }

  return controller;
};

// Arbitrary generators
const nodeIdArb = fc.uuid();
const publicKeyArb = fc
  .string({ minLength: 64, maxLength: 128 })
  .filter((s) => /^[a-fA-F0-9]+$/.test(s) || s.length >= 64);
const blockIdArb = fc
  .string({ minLength: 64, maxLength: 128 })
  .filter((s) => /^[a-fA-F0-9]+$/.test(s) || s.length >= 64);

describe('Nodes Endpoint Property Tests', () => {
  describe('Property 6: Node Discovery Returns Valid Locations', () => {
    /**
     * Property 6a: Discovery returns locations for existing blocks
     *
     * For any blockId that exists on at least one node, POST /api/nodes/discover
     * SHALL return a non-empty locations array.
     */
    it('Property 6a: Discovery returns non-empty locations for blocks that exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          blockIdArb,
          fc.array(nodeIdArb, { minLength: 1, maxLength: 5 }),
          async (blockId, nodeIds) => {
            // Feature: api-server-operations, Property 6: Node Discovery Returns Valid Locations

            // Create locations for the block
            const locations: ILocationRecord[] = nodeIds.map(
              (nodeId: string) => ({
                nodeId,
                lastSeen: new Date(),
                isAuthoritative: false,
                latencyMs: Math.floor(Math.random() * 100) + 5,
              }),
            );

            const blockLocations = new Map<string, ILocationRecord[]>();
            blockLocations.set(blockId, locations);

            const discoveryProtocol =
              createMockDiscoveryProtocol(blockLocations);
            const controller = createTestController(discoveryProtocol);

            const handlers = (controller as unknown as NodesControllerHandlers)
              .handlers;
            const result = await handlers.discoverBlock({ body: { blockId } });

            // Should return 200 status
            expect(result.statusCode).toBe(200);

            // Response should indicate block was found
            const response = result.response as IDiscoverBlockApiResponse;
            expect(response.found).toBe(true);

            // Locations array should not be empty
            expect(response.locations.length).toBeGreaterThan(0);

            // Each location should have a valid nodeId
            for (const location of response.locations) {
              expect(typeof location.nodeId).toBe('string');
              expect(location.nodeId.length).toBeGreaterThan(0);
              expect(nodeIds).toContain(location.nodeId);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 6b: Discovery returns empty locations for non-existent blocks
     *
     * For any blockId that does not exist on any node, POST /api/nodes/discover
     * SHALL return an empty locations array with found=false.
     */
    it('Property 6b: Discovery returns empty locations for non-existent blocks', async () => {
      await fc.assert(
        fc.asyncProperty(blockIdArb, async (blockId) => {
          // Feature: api-server-operations, Property 6: Node Discovery Returns Valid Locations

          // No blocks exist
          const discoveryProtocol = createMockDiscoveryProtocol(new Map());
          const controller = createTestController(discoveryProtocol);

          const handlers = (controller as unknown as NodesControllerHandlers)
            .handlers;
          const result = await handlers.discoverBlock({ body: { blockId } });

          // Should return 200 status
          expect(result.statusCode).toBe(200);

          // Response should indicate block was not found
          const response = result.response as IDiscoverBlockApiResponse;
          expect(response.found).toBe(false);

          // Locations array should be empty
          expect(response.locations.length).toBe(0);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 6c: Discovery response contains valid metadata
     *
     * For any discovery request, the response SHALL contain valid blockId,
     * queriedPeers (non-negative), and duration (non-negative).
     */
    it('Property 6c: Discovery response contains valid metadata', async () => {
      await fc.assert(
        fc.asyncProperty(
          blockIdArb,
          fc.boolean(), // whether block exists
          async (blockId, blockExists) => {
            // Feature: api-server-operations, Property 6: Node Discovery Returns Valid Locations

            const blockLocations = new Map<string, ILocationRecord[]>();
            if (blockExists) {
              blockLocations.set(blockId, [
                {
                  nodeId: 'test-node',
                  lastSeen: new Date(),
                  isAuthoritative: false,
                },
              ]);
            }

            const discoveryProtocol =
              createMockDiscoveryProtocol(blockLocations);
            const controller = createTestController(discoveryProtocol);

            const handlers = (controller as unknown as NodesControllerHandlers)
              .handlers;
            const result = await handlers.discoverBlock({ body: { blockId } });

            expect(result.statusCode).toBe(200);

            const response = result.response as IDiscoverBlockApiResponse;

            // blockId should match the request
            expect(response.blockId).toBe(blockId);

            // queriedPeers should be non-negative
            expect(typeof response.queriedPeers).toBe('number');
            expect(response.queriedPeers).toBeGreaterThanOrEqual(0);

            // duration should be non-negative
            expect(typeof response.duration).toBe('number');
            expect(response.duration).toBeGreaterThanOrEqual(0);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 6d: Discovery validates blockId parameter
     *
     * For any request without a valid blockId, POST /api/nodes/discover
     * SHALL return a 400 validation error.
     */
    it('Property 6d: Discovery validates blockId parameter', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(fc.constant(undefined), fc.constant(null), fc.constant('')),
          async (invalidBlockId) => {
            // Feature: api-server-operations, Property 6: Node Discovery Returns Valid Locations

            const discoveryProtocol = createMockDiscoveryProtocol(new Map());
            const controller = createTestController(discoveryProtocol);

            const handlers = (controller as unknown as NodesControllerHandlers)
              .handlers;
            const result = await handlers.discoverBlock({
              body: { blockId: invalidBlockId },
            });

            // Should return 400 validation error
            expect(result.statusCode).toBe(400);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  describe('Property 7: Node Registration Enables Authentication', () => {
    /**
     * Property 7a: Registration stores node credentials
     *
     * For any node that registers via POST /api/nodes/register with valid credentials,
     * the node's public key SHALL be stored for authentication.
     */
    it('Property 7a: Registration stores node credentials', async () => {
      await fc.assert(
        fc.asyncProperty(nodeIdArb, publicKeyArb, async (nodeId, publicKey) => {
          // Feature: api-server-operations, Property 7: Node Registration Enables Authentication

          const controller = createTestController();
          controller.clearRegisteredNodes();

          const handlers = (controller as unknown as NodesControllerHandlers)
            .handlers;
          const result = await handlers.registerNode({
            body: { nodeId, publicKey },
          });

          // Should return 201 status
          expect(result.statusCode).toBe(201);

          // Response should indicate success
          const response = result.response as IRegisterNodeApiResponse;
          expect(response.success).toBe(true);
          expect(response.nodeId).toBe(nodeId);

          // Node should be registered
          expect(controller.isNodeRegistered(nodeId)).toBe(true);

          // Public key should be stored
          expect(controller.getNodePublicKey(nodeId)).toBe(publicKey);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7b: Registered nodes appear in node list
     *
     * For any registered node, GET /api/nodes SHALL include that node
     * in the returned list.
     */
    it('Property 7b: Registered nodes appear in node list', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(fc.tuple(nodeIdArb, publicKeyArb), {
            minLength: 1,
            maxLength: 5,
          }),
          async (nodeCredentials) => {
            // Feature: api-server-operations, Property 7: Node Registration Enables Authentication

            const controller = createTestController();
            controller.clearRegisteredNodes();

            const handlers = (controller as unknown as NodesControllerHandlers)
              .handlers;

            // Register all nodes
            for (const [nodeId, publicKey] of nodeCredentials) {
              await handlers.registerNode({
                body: {
                  nodeId: nodeId as string,
                  publicKey: publicKey as string,
                },
              });
            }

            // Get node list
            const listResult = await handlers.listNodes();
            expect(listResult.statusCode).toBe(200);

            const listResponse = listResult.response as IListNodesApiResponse;

            // All registered nodes should appear in the list
            for (const [nodeId] of nodeCredentials) {
              const found = listResponse.nodes.some((n) => n.nodeId === nodeId);
              expect(found).toBe(true);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7c: Registered nodes can be retrieved individually
     *
     * For any registered node, GET /api/nodes/:nodeId SHALL return
     * that node's information.
     */
    it('Property 7c: Registered nodes can be retrieved individually', async () => {
      await fc.assert(
        fc.asyncProperty(nodeIdArb, publicKeyArb, async (nodeId, publicKey) => {
          // Feature: api-server-operations, Property 7: Node Registration Enables Authentication

          const controller = createTestController();
          controller.clearRegisteredNodes();

          const handlers = (controller as unknown as NodesControllerHandlers)
            .handlers;

          // Register the node
          await handlers.registerNode({ body: { nodeId, publicKey } });

          // Get the node
          const getResult = await handlers.getNode({ params: { nodeId } });
          expect(getResult.statusCode).toBe(200);

          const getResponse = getResult.response as IGetNodeApiResponse;
          expect(getResponse.node.nodeId).toBe(nodeId);
          expect(getResponse.node.publicKey).toBe(publicKey);
          expect(getResponse.node.status).toBe(NodeStatus.ONLINE);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7d: Unregistered nodes return 404
     *
     * For any nodeId that is not registered, GET /api/nodes/:nodeId
     * SHALL return a 404 error.
     */
    it('Property 7d: Unregistered nodes return 404', async () => {
      await fc.assert(
        fc.asyncProperty(nodeIdArb, async (nodeId) => {
          // Feature: api-server-operations, Property 7: Node Registration Enables Authentication

          const controller = createTestController();
          controller.clearRegisteredNodes();

          const handlers = (controller as unknown as NodesControllerHandlers)
            .handlers;

          // Try to get an unregistered node
          const getResult = await handlers.getNode({ params: { nodeId } });

          // Should return 404
          expect(getResult.statusCode).toBe(404);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7e: Registration validates required fields
     *
     * For any request without valid nodeId or publicKey,
     * POST /api/nodes/register SHALL return a 400 validation error.
     */
    it('Property 7e: Registration validates required fields', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            fc.record({
              nodeId: fc.constant(undefined),
              publicKey: publicKeyArb,
            }),
            fc.record({ nodeId: fc.constant(''), publicKey: publicKeyArb }),
            fc.record({ nodeId: nodeIdArb, publicKey: fc.constant(undefined) }),
            fc.record({ nodeId: nodeIdArb, publicKey: fc.constant('') }),
          ),
          async (invalidBody) => {
            // Feature: api-server-operations, Property 7: Node Registration Enables Authentication

            const controller = createTestController();
            controller.clearRegisteredNodes();

            const handlers = (controller as unknown as NodesControllerHandlers)
              .handlers;
            const result = await handlers.registerNode({ body: invalidBody });

            // Should return 400 validation error
            expect(result.statusCode).toBe(400);

            return true;
          },
        ),
        { numRuns: 50 },
      );
    });

    /**
     * Property 7f: Re-registration updates public key
     *
     * For any node that registers multiple times, the most recent
     * public key SHALL be stored.
     */
    it('Property 7f: Re-registration updates public key', async () => {
      await fc.assert(
        fc.asyncProperty(
          nodeIdArb,
          publicKeyArb,
          publicKeyArb,
          async (nodeId, publicKey1, publicKey2) => {
            // Feature: api-server-operations, Property 7: Node Registration Enables Authentication

            const controller = createTestController();
            controller.clearRegisteredNodes();

            const handlers = (controller as unknown as NodesControllerHandlers)
              .handlers;

            // Register with first key
            await handlers.registerNode({
              body: { nodeId, publicKey: publicKey1 },
            });
            expect(controller.getNodePublicKey(nodeId)).toBe(publicKey1);

            // Register with second key
            await handlers.registerNode({
              body: { nodeId, publicKey: publicKey2 },
            });
            expect(controller.getNodePublicKey(nodeId)).toBe(publicKey2);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7g: Node list includes local node from availability service
     *
     * When availability service is configured, GET /api/nodes SHALL include
     * the local node with ONLINE status.
     */
    it('Property 7g: Node list includes local node from availability service', async () => {
      await fc.assert(
        fc.asyncProperty(nodeIdArb, async (localNodeId) => {
          // Feature: api-server-operations, Property 7: Node Registration Enables Authentication

          const availabilityService = createMockAvailabilityService(
            localNodeId,
            false,
            [],
          );
          const controller = createTestController(
            undefined,
            availabilityService,
          );
          controller.clearRegisteredNodes();

          const handlers = (controller as unknown as NodesControllerHandlers)
            .handlers;

          const listResult = await handlers.listNodes();
          expect(listResult.statusCode).toBe(200);

          const listResponse = listResult.response as IListNodesApiResponse;

          // Local node should be in the list
          const localNode = listResponse.nodes.find(
            (n) => n.nodeId === localNodeId,
          );
          expect(localNode).toBeDefined();
          expect(localNode?.status).toBe(NodeStatus.ONLINE);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7h: Disconnected peers shown as unreachable in partition mode
     *
     * When availability service is in partition mode, GET /api/nodes SHALL
     * include disconnected peers with UNREACHABLE status.
     */
    it('Property 7h: Disconnected peers shown as unreachable in partition mode', async () => {
      await fc.assert(
        fc.asyncProperty(
          nodeIdArb,
          fc.array(nodeIdArb, { minLength: 1, maxLength: 5 }),
          async (localNodeId, disconnectedPeers) => {
            // Feature: api-server-operations, Property 7: Node Registration Enables Authentication

            // Filter out local node from disconnected peers to avoid duplicates
            const filteredPeers = disconnectedPeers.filter(
              (p) => p !== localNodeId,
            );
            if (filteredPeers.length === 0) {
              return true; // Skip if no valid disconnected peers
            }

            const availabilityService = createMockAvailabilityService(
              localNodeId,
              true, // partition mode enabled
              filteredPeers,
            );
            const controller = createTestController(
              undefined,
              availabilityService,
            );
            controller.clearRegisteredNodes();

            const handlers = (controller as unknown as NodesControllerHandlers)
              .handlers;

            const listResult = await handlers.listNodes();
            expect(listResult.statusCode).toBe(200);

            const listResponse = listResult.response as IListNodesApiResponse;

            // All disconnected peers should be in the list with UNREACHABLE status
            for (const peerId of filteredPeers) {
              const peerNode = listResponse.nodes.find(
                (n) => n.nodeId === peerId,
              );
              expect(peerNode).toBeDefined();
              expect(peerNode?.status).toBe(NodeStatus.UNREACHABLE);
            }

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * Property 7i: Get node returns correct status based on availability
     *
     * GET /api/nodes/:nodeId SHALL return UNREACHABLE status for nodes
     * that are in the disconnected peers list during partition mode.
     */
    it('Property 7i: Get node returns correct status based on availability', async () => {
      await fc.assert(
        fc.asyncProperty(
          nodeIdArb,
          nodeIdArb,
          publicKeyArb,
          async (localNodeId, targetNodeId, publicKey) => {
            // Feature: api-server-operations, Property 7: Node Registration Enables Authentication

            // Skip if target is the local node
            if (targetNodeId === localNodeId) {
              return true;
            }

            const availabilityService = createMockAvailabilityService(
              localNodeId,
              true, // partition mode enabled
              [targetNodeId], // target is disconnected
            );
            const controller = createTestController(
              undefined,
              availabilityService,
            );
            controller.clearRegisteredNodes();

            const handlers = (controller as unknown as NodesControllerHandlers)
              .handlers;

            // Register the target node first
            await handlers.registerNode({
              body: { nodeId: targetNodeId, publicKey },
            });

            // Get the node - should show as unreachable
            const getResult = await handlers.getNode({
              params: { nodeId: targetNodeId },
            });
            expect(getResult.statusCode).toBe(200);

            const getResponse = getResult.response as IGetNodeApiResponse;
            expect(getResponse.node.nodeId).toBe(targetNodeId);
            expect(getResponse.node.status).toBe(NodeStatus.UNREACHABLE);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
