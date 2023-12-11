/**
 * Property-Based Tests for Dashboard Controller
 *
 * Feature: admin-server-dashboard, Property 1: Node data completeness
 *
 * **Validates: Requirements 2.1, 2.2, 8.1, 8.3**
 *
 * For any set of registered nodes and availability service state, the dashboard
 * response SHALL contain every registered node with its nodeId, status, and
 * capabilities, and SHALL include the correct localNodeId and hostname.
 */

import {
  IAvailabilityService,
  NodeIdSource,
  NodeStatus,
} from '@brightchain/brightchain-lib';
import { ApiErrorResponse } from '@digitaldefiance/node-express-suite';
import * as fc from 'fast-check';
import { IBrightChainApplication } from '../../interfaces';
import { IAdminDashboardApiResponse } from '../../interfaces/responses';
import { DashboardController } from './dashboard';

// ─── Mock Factories ──────────────────────────────────────────────────────────

const createMockApplication = (services: Map<string, unknown> = new Map()) => {
  const mockServices = {
    get: (name: string) => services.get(name),
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
  localNodeId: string | null,
  isPartitioned: boolean,
  disconnectedPeers: string[],
): IAvailabilityService => {
  return {
    getLocalNodeId: () => localNodeId,
    isInPartitionMode: () => isPartitioned,
    getDisconnectedPeers: () => disconnectedPeers,
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

// ─── Type for accessing private handlers ─────────────────────────────────────

interface DashboardControllerHandlers {
  handlers: {
    getDashboard: () => Promise<{
      statusCode: number;
      response: IAdminDashboardApiResponse | ApiErrorResponse;
    }>;
  };
}

// ─── Helper ──────────────────────────────────────────────────────────────────

const createTestController = (
  availabilityService?: IAvailabilityService,
  services?: Map<string, unknown>,
) => {
  const mockApp = createMockApplication(services ?? new Map());
  const controller = new DashboardController(mockApp as never);
  if (availabilityService) {
    controller.setAvailabilityService(availabilityService);
  }
  return controller;
};

// ─── Arbitraries ─────────────────────────────────────────────────────────────

const arbNodeId = fc.uuid();

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Feature: admin-server-dashboard, Property 1: Node data completeness', () => {
  /**
   * Property 1a: Local node appears in response with ONLINE status
   *
   * When an availability service is configured with a local node ID,
   * the dashboard response SHALL include that node with ONLINE status,
   * block_storage and message_routing capabilities, and the localNodeId
   * field SHALL match.
   *
   * **Validates: Requirements 2.1, 2.2, 8.3**
   */
  it('Property 1a: Local node is present with correct nodeId, ONLINE status, and capabilities', async () => {
    await fc.assert(
      fc.asyncProperty(arbNodeId, async (localNodeId) => {
        // Feature: admin-server-dashboard, Property 1: Node data completeness
        const availabilityService = createMockAvailabilityService(
          localNodeId,
          false,
          [],
        );
        const controller = createTestController(availabilityService);

        const handlers = (controller as unknown as DashboardControllerHandlers)
          .handlers;
        const result = await handlers.getDashboard();

        expect(result.statusCode).toBe(200);
        const response = result.response as IAdminDashboardApiResponse;

        // localNodeId must match
        expect(response.localNodeId).toBe(localNodeId);

        // The local node must appear in the nodes array
        const localNode = response.nodes.find((n) => n.nodeId === localNodeId);
        expect(localNode).toBeDefined();
        expect(localNode!.status).toBe(NodeStatus.ONLINE);

        // Capabilities must be present and non-empty
        expect(Array.isArray(localNode!.capabilities)).toBe(true);
        expect(localNode!.capabilities.length).toBeGreaterThan(0);
        expect(localNode!.capabilities).toContain('block_storage');
        expect(localNode!.capabilities).toContain('message_routing');

        // nodeId must be a non-empty string
        expect(typeof localNode!.nodeId).toBe('string');
        expect(localNode!.nodeId.length).toBeGreaterThan(0);

        // nodeIdSource must indicate availability_service
        expect(response.nodeIdSource).toBe(NodeIdSource.AVAILABILITY_SERVICE);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1b: Disconnected peers appear as UNREACHABLE in partition mode
   *
   * When the availability service is in partition mode with disconnected peers,
   * every disconnected peer SHALL appear in the nodes array with UNREACHABLE
   * status and valid capabilities.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it('Property 1b: All disconnected peers present with UNREACHABLE status and capabilities', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbNodeId,
        fc.array(arbNodeId, { minLength: 1, maxLength: 8 }),
        async (localNodeId, disconnectedPeers) => {
          // Feature: admin-server-dashboard, Property 1: Node data completeness

          // Filter out local node from disconnected peers to avoid duplicates
          const filteredPeers = disconnectedPeers.filter(
            (p) => p !== localNodeId,
          );
          if (filteredPeers.length === 0) {
            return true; // Skip if no valid disconnected peers
          }

          const availabilityService = createMockAvailabilityService(
            localNodeId,
            true,
            filteredPeers,
          );
          const controller = createTestController(availabilityService);

          const handlers = (
            controller as unknown as DashboardControllerHandlers
          ).handlers;
          const result = await handlers.getDashboard();

          expect(result.statusCode).toBe(200);
          const response = result.response as IAdminDashboardApiResponse;

          // Every disconnected peer must be in the nodes array
          for (const peerId of filteredPeers) {
            const peerNode = response.nodes.find((n) => n.nodeId === peerId);
            expect(peerNode).toBeDefined();
            expect(peerNode!.status).toBe(NodeStatus.UNREACHABLE);

            // Each node must have nodeId, status, and capabilities
            expect(typeof peerNode!.nodeId).toBe('string');
            expect(peerNode!.nodeId.length).toBeGreaterThan(0);
            expect(Array.isArray(peerNode!.capabilities)).toBe(true);
            expect(peerNode!.capabilities.length).toBeGreaterThan(0);
          }

          // The local node should also still be present
          const localNode = response.nodes.find(
            (n) => n.nodeId === localNodeId,
          );
          expect(localNode).toBeDefined();
          expect(localNode!.status).toBe(NodeStatus.ONLINE);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1c: Total node count equals local node + disconnected peers
   *
   * The nodes array length SHALL equal 1 (local node) plus the number of
   * unique disconnected peers when in partition mode.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it('Property 1c: Node count equals local node plus disconnected peers', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbNodeId,
        fc.boolean(),
        fc.array(arbNodeId, { minLength: 0, maxLength: 8 }),
        async (localNodeId, isPartitioned, disconnectedPeers) => {
          // Feature: admin-server-dashboard, Property 1: Node data completeness

          // Filter out local node and deduplicate
          const filteredPeers = [
            ...new Set(disconnectedPeers.filter((p) => p !== localNodeId)),
          ];

          const availabilityService = createMockAvailabilityService(
            localNodeId,
            isPartitioned,
            filteredPeers,
          );
          const controller = createTestController(availabilityService);

          const handlers = (
            controller as unknown as DashboardControllerHandlers
          ).handlers;
          const result = await handlers.getDashboard();

          expect(result.statusCode).toBe(200);
          const response = result.response as IAdminDashboardApiResponse;

          // Expected count: 1 (local) + disconnected peers (only if partitioned)
          const expectedCount = isPartitioned ? 1 + filteredPeers.length : 1;
          expect(response.nodes.length).toBe(expectedCount);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1d: Hostname is always present and non-empty
   *
   * The dashboard response SHALL always include a non-empty hostname string.
   *
   * **Validates: Requirements 8.1**
   */
  it('Property 1d: Hostname is always a non-empty string', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.option(arbNodeId, { nil: null }),
        async (localNodeId) => {
          // Feature: admin-server-dashboard, Property 1: Node data completeness

          const availabilityService = localNodeId
            ? createMockAvailabilityService(localNodeId, false, [])
            : undefined;
          const controller = createTestController(availabilityService);

          const handlers = (
            controller as unknown as DashboardControllerHandlers
          ).handlers;
          const result = await handlers.getDashboard();

          expect(result.statusCode).toBe(200);
          const response = result.response as IAdminDashboardApiResponse;

          expect(typeof response.hostname).toBe('string');
          expect(response.hostname.length).toBeGreaterThan(0);

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1e: No availability service falls back to environment node ID
   *
   * When no availability service is configured but a local node ID has been
   * set (from the NODE_ID env var or auto-generated GuidV4), the dashboard
   * response SHALL report that node with ONLINE status and empty disconnectedPeers.
   *
   * **Validates: Requirements 2.1, 8.3**
   */
  it('Property 1e: No availability service falls back to environment node ID', async () => {
    await fc.assert(
      fc.asyncProperty(arbNodeId, async (nodeId) => {
        // Feature: admin-server-dashboard, Property 1: Node data completeness
        const controller = createTestController(undefined);
        controller.setLocalNodeId(nodeId, NodeIdSource.ENVIRONMENT);

        const handlers = (controller as unknown as DashboardControllerHandlers)
          .handlers;
        const result = await handlers.getDashboard();

        expect(result.statusCode).toBe(200);
        const response = result.response as IAdminDashboardApiResponse;

        expect(response.localNodeId).toBe(nodeId);
        expect(response.nodes).toHaveLength(1);
        expect(response.nodes[0].nodeId).toBe(nodeId);
        expect(response.nodes[0].status).toBe(NodeStatus.ONLINE);
        expect(response.nodeIdSource).toBe(NodeIdSource.ENVIRONMENT);
        expect(response.disconnectedPeers).toEqual([]);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1e2: No availability service and no local node ID yields empty response
   *
   * When neither the availability service nor a local node ID override is
   * configured, the dashboard SHALL return empty nodes and null localNodeId.
   *
   * **Validates: Requirements 2.1, 8.3**
   */
  it('Property 1e2: No availability service and no local node ID yields empty response', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        const controller = createTestController(undefined);

        const handlers = (controller as unknown as DashboardControllerHandlers)
          .handlers;
        const result = await handlers.getDashboard();

        expect(result.statusCode).toBe(200);
        const response = result.response as IAdminDashboardApiResponse;

        expect(response.localNodeId).toBeNull();
        expect(response.nodes).toEqual([]);
        expect(response.nodeIdSource).toBe(NodeIdSource.GENERATED);
        expect(response.disconnectedPeers).toEqual([]);

        return true;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 1f: Every node has required fields (nodeId, status, capabilities)
   *
   * For any combination of availability service state, every node in the
   * response SHALL have a non-empty nodeId string, a valid NodeStatus value,
   * and a non-empty capabilities array.
   *
   * **Validates: Requirements 2.1, 2.2**
   */
  it('Property 1f: Every node has nodeId, status, and capabilities', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbNodeId,
        fc.array(arbNodeId, { minLength: 0, maxLength: 8 }),
        async (localNodeId, disconnectedPeers) => {
          // Feature: admin-server-dashboard, Property 1: Node data completeness

          const filteredPeers = [
            ...new Set(disconnectedPeers.filter((p) => p !== localNodeId)),
          ];

          const availabilityService = createMockAvailabilityService(
            localNodeId,
            filteredPeers.length > 0,
            filteredPeers,
          );
          const controller = createTestController(availabilityService);

          const handlers = (
            controller as unknown as DashboardControllerHandlers
          ).handlers;
          const result = await handlers.getDashboard();

          expect(result.statusCode).toBe(200);
          const response = result.response as IAdminDashboardApiResponse;

          const validStatuses = Object.values(NodeStatus);

          for (const node of response.nodes) {
            // nodeId must be a non-empty string
            expect(typeof node.nodeId).toBe('string');
            expect(node.nodeId.length).toBeGreaterThan(0);

            // status must be a valid NodeStatus
            expect(validStatuses).toContain(node.status);

            // capabilities must be a non-empty array of strings
            expect(Array.isArray(node.capabilities)).toBe(true);
            expect(node.capabilities.length).toBeGreaterThan(0);
            for (const cap of node.capabilities) {
              expect(typeof cap).toBe('string');
              expect(cap.length).toBeGreaterThan(0);
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 2–8 Tests ─────────────────────────────────────────────────────

import { HealthStatus } from '@brightchain/brightchain-lib';

// ─── Extended Mock Application Factory ───────────────────────────────────────

/**
 * Creates a mock application with getClientWebSocketServer and getWebSocketServer
 * methods, plus configurable services map.
 */
const createMockApplicationExtended = (
  options: {
    services?: Map<string, unknown>;
    clientWebSocketServer?: {
      getConnectedClientCount: () => number;
      getSessions: () => ReadonlyMap<
        unknown,
        Readonly<{
          memberContext: {
            memberId: string;
            username: string;
            type: string;
          };
          rooms: Set<string>;
        }>
      >;
    } | null;
    webSocketServer?: {
      getConnectedNodes: () => string[];
    } | null;
  } = {},
) => {
  const mockServices = {
    get: (name: string) => (options.services ?? new Map()).get(name),
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
    getClientWebSocketServer: () => options.clientWebSocketServer ?? null,
    getWebSocketServer: () => options.webSocketServer ?? null,
  } as unknown as IBrightChainApplication;
};

const createTestControllerExtended = (
  options: {
    availabilityService?: IAvailabilityService;
    services?: Map<string, unknown>;
    clientWebSocketServer?: {
      getConnectedClientCount: () => number;
      getSessions: () => ReadonlyMap<
        unknown,
        Readonly<{
          memberContext: {
            memberId: string;
            username: string;
            type: string;
          };
          rooms: Set<string>;
        }>
      >;
    } | null;
    webSocketServer?: {
      getConnectedNodes: () => string[];
    } | null;
  } = {},
) => {
  const mockApp = createMockApplicationExtended({
    services: options.services,
    clientWebSocketServer: options.clientWebSocketServer,
    webSocketServer: options.webSocketServer,
  });
  const controller = new DashboardController(mockApp as never);
  if (options.availabilityService) {
    controller.setAvailabilityService(options.availabilityService);
  }
  return controller;
};

// ─── Property 2: Lumen client session accuracy ──────────────────────────────

describe('Feature: admin-server-dashboard, Property 2: Lumen client session accuracy', () => {
  /**
   * **Validates: Requirements 3.1, 3.2**
   *
   * For any set of authenticated Lumen client WebSocket sessions, the dashboard
   * response SHALL include every session with its memberId, username, memberType,
   * and rooms, and the lumenClientCount SHALL equal the number of sessions.
   */

  const arbSession = fc.record({
    memberId: fc.uuid(),
    username: fc
      .string({ minLength: 1, maxLength: 20 })
      .filter((s) => s.trim().length > 0),
    type: fc.constantFrom('User', 'Admin', 'System'),
    rooms: fc.array(
      fc
        .string({ minLength: 1, maxLength: 30 })
        .filter((s) => s.trim().length > 0),
      { minLength: 0, maxLength: 5 },
    ),
  });

  const arbSessions = fc.array(arbSession, { minLength: 0, maxLength: 10 });

  it('Property 2a: All sessions present with correct fields and lumenClientCount equals session count', async () => {
    await fc.assert(
      fc.asyncProperty(arbSessions, async (sessions) => {
        const sessionsMap = new Map<
          string,
          Readonly<{
            memberContext: { memberId: string; username: string; type: string };
            rooms: Set<string>;
          }>
        >();

        for (const s of sessions) {
          sessionsMap.set(s.memberId, {
            memberContext: {
              memberId: s.memberId,
              username: s.username,
              type: s.type,
            },
            rooms: new Set(s.rooms),
          });
        }

        const clientWsServer = {
          getConnectedClientCount: () => sessionsMap.size,
          getSessions: () =>
            sessionsMap as ReadonlyMap<
              unknown,
              Readonly<{
                memberContext: {
                  memberId: string;
                  username: string;
                  type: string;
                };
                rooms: Set<string>;
              }>
            >,
        };

        const controller = createTestControllerExtended({
          clientWebSocketServer: clientWsServer,
        });

        const handlers = (controller as unknown as DashboardControllerHandlers)
          .handlers;
        const result = await handlers.getDashboard();

        expect(result.statusCode).toBe(200);
        const response = result.response as IAdminDashboardApiResponse;

        // lumenClientCount must equal the number of unique sessions
        expect(response.lumenClientCount).toBe(sessionsMap.size);

        // Every session must be present
        for (const [, session] of sessionsMap) {
          const found = response.lumenClientSessions.find(
            (ls) => ls.memberId === session.memberContext.memberId,
          );
          expect(found).toBeDefined();
          expect(found!.username).toBe(session.memberContext.username);
          expect(found!.memberType).toBe(String(session.memberContext.type));
          expect(found!.rooms.sort()).toEqual(Array.from(session.rooms).sort());
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 3: Node-to-node connection accuracy ───────────────────────────

describe('Feature: admin-server-dashboard, Property 3: Node-to-node connection accuracy', () => {
  /**
   * **Validates: Requirements 4.1, 4.2**
   *
   * For any set of active gossip WebSocket connections, the dashboard response
   * connectedNodeIds SHALL match the WebSocketMessageServer's connected node set,
   * and nodeConnectionCount SHALL equal the length of that set.
   */

  const arbConnectedNodeIds = fc.array(fc.uuid(), {
    minLength: 0,
    maxLength: 10,
  });

  it('Property 3a: connectedNodeIds matches and nodeConnectionCount is correct', async () => {
    await fc.assert(
      fc.asyncProperty(arbConnectedNodeIds, async (nodeIds) => {
        // Deduplicate
        const uniqueNodeIds = [...new Set(nodeIds)];

        const wsServer = {
          getConnectedNodes: () => uniqueNodeIds,
        };

        const controller = createTestControllerExtended({
          webSocketServer: wsServer,
        });

        const handlers = (controller as unknown as DashboardControllerHandlers)
          .handlers;
        const result = await handlers.getDashboard();

        expect(result.statusCode).toBe(200);
        const response = result.response as IAdminDashboardApiResponse;

        expect(response.nodeConnectionCount).toBe(uniqueNodeIds.length);
        expect(response.connectedNodeIds.sort()).toEqual(uniqueNodeIds.sort());

        return true;
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 4: System metrics completeness ────────────────────────────────

describe('Feature: admin-server-dashboard, Property 4: System metrics completeness', () => {
  /**
   * **Validates: Requirements 5.1, 5.2, 5.3**
   *
   * For any valid dashboard response, the system object SHALL contain
   * heapUsedBytes, heapTotalBytes, rssBytes, and externalBytes as non-negative
   * numbers, uptimeSeconds as a non-negative number, and nodeVersion and
   * appVersion as non-empty strings.
   */

  it('Property 4a: System metrics have correct types and non-negative values', async () => {
    await fc.assert(
      fc.asyncProperty(fc.constant(true), async () => {
        const controller = createTestControllerExtended();

        const handlers = (controller as unknown as DashboardControllerHandlers)
          .handlers;
        const result = await handlers.getDashboard();

        expect(result.statusCode).toBe(200);
        const response = result.response as IAdminDashboardApiResponse;
        const sys = response.system;

        // All byte metrics must be non-negative numbers
        expect(typeof sys.heapUsedBytes).toBe('number');
        expect(sys.heapUsedBytes).toBeGreaterThanOrEqual(0);

        expect(typeof sys.heapTotalBytes).toBe('number');
        expect(sys.heapTotalBytes).toBeGreaterThanOrEqual(0);

        expect(typeof sys.rssBytes).toBe('number');
        expect(sys.rssBytes).toBeGreaterThanOrEqual(0);

        expect(typeof sys.externalBytes).toBe('number');
        expect(sys.externalBytes).toBeGreaterThanOrEqual(0);

        // Uptime must be non-negative
        expect(typeof sys.uptimeSeconds).toBe('number');
        expect(sys.uptimeSeconds).toBeGreaterThanOrEqual(0);

        // Versions must be non-empty strings
        expect(typeof sys.nodeVersion).toBe('string');
        expect(sys.nodeVersion.length).toBeGreaterThan(0);

        expect(typeof sys.appVersion).toBe('string');
        expect(sys.appVersion.length).toBeGreaterThan(0);

        return true;
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 5: Database count accuracy ────────────────────────────────────

describe('Feature: admin-server-dashboard, Property 5: Database count accuracy', () => {
  /**
   * **Validates: Requirements 6.1, 6.2**
   *
   * For any database state where the database is reachable, the dashboard
   * response db.users SHALL equal the actual users collection document count,
   * and db.roles SHALL equal the actual roles collection document count.
   */

  const arbCounts = fc.record({
    users: fc.nat({ max: 100000 }),
    roles: fc.nat({ max: 1000 }),
  });

  it('Property 5a: db.users and db.roles match actual collection counts', async () => {
    await fc.assert(
      fc.asyncProperty(arbCounts, async ({ users, roles }) => {
        const mockDb = {
          collection: (name: string) => {
            if (name === 'users') {
              return {
                countDocuments: async (filter?: Record<string, unknown>) => {
                  // If filter is provided (for usersByStatus), return 0
                  if (filter) return 0;
                  return users;
                },
              };
            }
            if (name === 'roles') {
              return {
                countDocuments: async () => roles,
              };
            }
            return { countDocuments: async () => 0 };
          },
        };

        const services = new Map<string, unknown>();
        services.set('db', mockDb);

        const controller = createTestControllerExtended({ services });

        const handlers = (controller as unknown as DashboardControllerHandlers)
          .handlers;
        const result = await handlers.getDashboard();

        expect(result.statusCode).toBe(200);
        const response = result.response as IAdminDashboardApiResponse;

        expect(response.db.users).toBe(users);
        expect(response.db.roles).toBe(roles);

        return true;
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: BrightTrust status accuracy ─────────────────────────────────────

describe('Feature: admin-server-dashboard, Property 6: BrightTrust status accuracy', () => {
  /**
   * **Validates: Requirements 7.1, 7.2**
   *
   * For any BrightTrust configuration with active members and a threshold, the
   * dashboard response brightTrust.active SHALL reflect whether a BrightTrust is
   * initialized, brightTrust.memberCount SHALL equal the number of active members,
   * brightTrust.threshold SHALL equal the configured threshold, and brightTrust.members
   * SHALL contain every active member's name and role.
   */

  const arbMember = fc.record({
    name: fc
      .string({ minLength: 1, maxLength: 30 })
      .filter((s) => s.trim().length > 0),
    role: fc.option(fc.constantFrom('admin', 'member', 'observer'), {
      nil: undefined,
    }),
  });

  const arbBrightTrustConfig = fc.record({
    active: fc.boolean(),
    threshold: fc.nat({ max: 20 }),
    members: fc.array(arbMember, { minLength: 0, maxLength: 10 }),
  });

  it('Property 6a: BrightTrust fields match configuration', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbBrightTrustConfig,
        async ({ active, threshold, members }) => {
          const mode = active ? 'active' : 'uninitialized';

          const mockQsm = {
            getMode: async () => mode,
            getCurrentEpoch: async () => ({
              memberIds: members.map((_, i) => `member-${i}`),
              threshold,
            }),
            getConfiguredThreshold: () => threshold,
          };

          const mockBrightTrustDb = {
            listActiveMembers: async () =>
              members.map((m) => ({
                metadata: { name: m.name, role: m.role },
                isActive: true,
              })),
          };

          const services = new Map<string, unknown>();
          services.set('brightTrustStateMachine', mockQsm);
          services.set('brightTrustDbAdapter', mockBrightTrustDb);

          const controller = createTestControllerExtended({ services });

          const handlers = (
            controller as unknown as DashboardControllerHandlers
          ).handlers;
          const result = await handlers.getDashboard();

          expect(result.statusCode).toBe(200);
          const response = result.response as IAdminDashboardApiResponse;

          expect(response.brightTrust.active).toBe(active);

          if (active) {
            expect(response.brightTrust.threshold).toBe(threshold);
            expect(response.brightTrust.memberCount).toBe(members.length);

            // Every member must be present.
            // Use a consumed-index approach so duplicate names are matched
            // one-to-one rather than always hitting the first occurrence.
            const consumed = new Set<number>();
            for (const member of members) {
              const idx = response.brightTrust.members.findIndex(
                (m, i) => !consumed.has(i) && m.name === member.name,
              );
              expect(idx).not.toBe(-1);
              consumed.add(idx);
              if (member.role !== undefined) {
                expect(response.brightTrust.members[idx].role).toBe(
                  member.role,
                );
              }
            }
          } else {
            // Inactive BrightTrust returns defaults
            expect(response.brightTrust.memberCount).toBe(0);
            expect(response.brightTrust.threshold).toBe(0);
            expect(response.brightTrust.members).toEqual([]);
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 7: Pool data inclusion ────────────────────────────────────────

describe('Feature: admin-server-dashboard, Property 7: Pool data inclusion', () => {
  /**
   * **Validates: Requirements 8.2**
   *
   * For any set of pools the local node participates in, the dashboard
   * response pools array SHALL contain every pool ID.
   */

  const arbPoolEntry = fc.record({
    poolId: fc.uuid(),
    blockCount: fc.option(fc.nat({ max: 10000 }), { nil: undefined }),
    totalSize: fc.option(fc.nat({ max: 1000000 }), { nil: undefined }),
  });

  const arbPools = fc.array(arbPoolEntry, { minLength: 0, maxLength: 10 });

  it('Property 7a: All pools present in response', async () => {
    await fc.assert(
      fc.asyncProperty(arbPools, async (pools) => {
        // Deduplicate by poolId
        const uniquePools = new Map(pools.map((p) => [p.poolId, p]));

        const mockPoolDiscoveryService = {
          getRemotePoolCache: () => {
            const cache = new Map<
              string,
              { poolId: string; blockCount?: number; totalSize?: number }
            >();
            for (const [id, entry] of uniquePools) {
              cache.set(id, {
                poolId: entry.poolId,
                blockCount: entry.blockCount,
                totalSize: entry.totalSize,
              });
            }
            return cache;
          },
        };

        const services = new Map<string, unknown>();
        services.set('poolDiscoveryService', mockPoolDiscoveryService);

        const controller = createTestControllerExtended({ services });

        const handlers = (controller as unknown as DashboardControllerHandlers)
          .handlers;
        const result = await handlers.getDashboard();

        expect(result.statusCode).toBe(200);
        const response = result.response as IAdminDashboardApiResponse;

        // Every pool from the cache must be present in the response
        for (const [poolId] of uniquePools) {
          const found = response.pools.find((p) => p.poolId === poolId);
          expect(found).toBeDefined();
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });
});

// ─── Property 8: Dependency health completeness ─────────────────────────────

describe('Feature: admin-server-dashboard, Property 8: Dependency health completeness', () => {
  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * For any combination of dependency health states, the dashboard response
   * dependencies SHALL include blockStore, messageService, and webSocketServer,
   * each with a valid HealthStatus value and a non-negative latencyMs.
   */

  const validHealthStatuses = Object.values(HealthStatus);

  const arbDependencyPresence = fc.record({
    blockStore: fc.boolean(),
    messageService: fc.boolean(),
    webSocketServer: fc.boolean(),
  });

  it('Property 8a: All three dependencies present with valid HealthStatus and non-negative latencyMs', async () => {
    await fc.assert(
      fc.asyncProperty(arbDependencyPresence, async (presence) => {
        const services = new Map<string, unknown>();

        // When a service is present, the health check returns healthy;
        // when absent, it returns unhealthy. Either way, the dependency
        // must appear in the response with valid fields.
        if (presence.blockStore) {
          services.set('blockStore', {});
        }
        if (presence.messageService) {
          services.set('messageService', {});
        }
        if (presence.webSocketServer) {
          services.set('webSocketServer', {});
        }

        const controller = createTestControllerExtended({ services });

        const handlers = (controller as unknown as DashboardControllerHandlers)
          .handlers;
        const result = await handlers.getDashboard();

        expect(result.statusCode).toBe(200);
        const response = result.response as IAdminDashboardApiResponse;

        const deps = response.dependencies;

        // blockStore
        expect(deps.blockStore).toBeDefined();
        expect(typeof deps.blockStore.name).toBe('string');
        expect(validHealthStatuses).toContain(deps.blockStore.status);
        expect(typeof deps.blockStore.latencyMs).toBe('number');
        expect(deps.blockStore.latencyMs!).toBeGreaterThanOrEqual(0);

        // messageService
        expect(deps.messageService).toBeDefined();
        expect(typeof deps.messageService.name).toBe('string');
        expect(validHealthStatuses).toContain(deps.messageService.status);
        expect(typeof deps.messageService.latencyMs).toBe('number');
        expect(deps.messageService.latencyMs!).toBeGreaterThanOrEqual(0);

        // webSocketServer
        expect(deps.webSocketServer).toBeDefined();
        expect(typeof deps.webSocketServer.name).toBe('string');
        expect(validHealthStatuses).toContain(deps.webSocketServer.status);
        expect(typeof deps.webSocketServer.latencyMs).toBe('number');
        expect(deps.webSocketServer.latencyMs!).toBeGreaterThanOrEqual(0);

        // Verify correct health status based on presence
        if (presence.blockStore) {
          expect(deps.blockStore.status).toBe(HealthStatus.HEALTHY);
        } else {
          expect(deps.blockStore.status).toBe(HealthStatus.UNHEALTHY);
        }
        if (presence.messageService) {
          expect(deps.messageService.status).toBe(HealthStatus.HEALTHY);
        } else {
          expect(deps.messageService.status).toBe(HealthStatus.UNHEALTHY);
        }
        if (presence.webSocketServer) {
          expect(deps.webSocketServer.status).toBe(HealthStatus.HEALTHY);
        } else {
          expect(deps.webSocketServer.status).toBe(HealthStatus.UNHEALTHY);
        }

        return true;
      }),
      { numRuns: 100 },
    );
  });
});
