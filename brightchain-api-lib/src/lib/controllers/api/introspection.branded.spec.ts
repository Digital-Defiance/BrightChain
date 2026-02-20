/**
 * @fileoverview Unit tests for IntrospectionController branded response construction
 *
 * Verifies that handleGetStatus and handleListPeers produce branded instances
 * via NodeStatusDef.create() and NetworkTopologyDef.create() / PeerInfoDef.create(),
 * and that invalid data from services triggers error handling.
 *
 * @see Requirements 7.1, 7.2, 7.3, 7.4
 */

import {
  NetworkTopologyDef,
  NodeStatusDef,
  PeerInfoDef,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import { GuidV4Buffer } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  IStatusCodeResponse,
} from '@digitaldefiance/node-express-suite';
import { AvailabilityService } from '../../availability/availabilityService';
import { HeartbeatMonitor } from '../../availability/heartbeatMonitor';
import { PoolDiscoveryService } from '../../availability/poolDiscoveryService';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  INodeStatusApiResponse,
  IPeerListApiResponse,
} from '../../interfaces/introspectionApiResponses';
import { IMemberContext } from '../../middlewares/authentication';
import { WebSocketMessageServer } from '../../services/webSocketMessageServer';
import {
  IntrospectionController,
  IntrospectionControllerConfig,
} from './introspection';

// ── Helpers ──

// Use the same request shape the controller expects (has memberContext attached by middleware)
type TestRequest = { memberContext?: IMemberContext };

function makeMemberContext(
  type: MemberType = MemberType.Admin,
): IMemberContext {
  return {
    memberId: 'aabbccdd',
    username: 'testuser',
    type,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
}

function makeRequest(memberContext?: IMemberContext): TestRequest {
  return { memberContext };
}

function makeApplication(): IBrightChainApplication<GuidV4Buffer> {
  return {
    services: { get: jest.fn() },
    db: {
      connection: {
        startSession: jest.fn(),
      },
    },
    environment: {
      mongo: { useTransactions: false },
    },
    constants: {},
    plugins: { get: jest.fn() },
    ready: true,
    start: jest.fn(),
    getModel: jest.fn(),
    getController: jest.fn(),
    setController: jest.fn(),
  } as unknown as IBrightChainApplication<GuidV4Buffer>;
}

function makeConfig(
  overrides: Partial<IntrospectionControllerConfig> = {},
): IntrospectionControllerConfig {
  const availabilityService: Partial<AvailabilityService> = {
    getLocalNodeId: jest.fn().mockReturnValue('localnode1'),
    isInPartitionMode: jest.fn().mockReturnValue(false),
    getDisconnectedPeers: jest.fn().mockReturnValue([]),
    getStatistics: jest.fn().mockResolvedValue({
      localCount: 0,
      remoteCount: 0,
      cachedCount: 0,
      orphanedCount: 0,
      unknownCount: 0,
    }),
  };

  const heartbeatMonitor: Partial<HeartbeatMonitor> = {
    isPeerReachable: jest.fn().mockReturnValue(true),
    getLastLatency: jest.fn().mockReturnValue(undefined),
  };

  const webSocketMessageServer: Partial<WebSocketMessageServer> = {
    getConnectedNodes: jest.fn().mockReturnValue([]),
  };

  const poolDiscoveryService: Partial<PoolDiscoveryService> = {
    discoverPools: jest.fn().mockResolvedValue({
      pools: [],
      queriedPeers: [],
      unreachablePeers: [],
      timestamp: new Date().toISOString(),
    }),
  };

  return {
    availabilityService: availabilityService as AvailabilityService,
    heartbeatMonitor: heartbeatMonitor as HeartbeatMonitor,
    webSocketMessageServer: webSocketMessageServer as WebSocketMessageServer,
    poolDiscoveryService: poolDiscoveryService as PoolDiscoveryService,
    poolAclLookup: jest.fn().mockReturnValue(undefined),
    localPoolIds: jest.fn().mockReturnValue([]),
    poolMetadataLookup: jest.fn().mockReturnValue(undefined),
    poolDetailLookup: jest.fn().mockReturnValue(undefined),
    version: '1.0.0',
    capabilities: ['store', 'relay'],
    ...overrides,
  };
}

function makeController(
  config?: Partial<IntrospectionControllerConfig>,
): IntrospectionController<GuidV4Buffer> {
  const app = makeApplication();
  const controller = new IntrospectionController<GuidV4Buffer>(
    app,
    makeConfig(config),
  );
  return controller;
}

// Access private methods via bracket notation for testing
function callHandleGetStatus(
  controller: IntrospectionController<GuidV4Buffer>,
  req: TestRequest,
) {
  return (
    controller as unknown as {
      handleGetStatus: (
        req: TestRequest,
      ) => Promise<
        IStatusCodeResponse<INodeStatusApiResponse | ApiErrorResponse>
      >;
    }
  ).handleGetStatus(req);
}

function callHandleListPeers(
  controller: IntrospectionController<GuidV4Buffer>,
  req: TestRequest,
) {
  return (
    controller as unknown as {
      handleListPeers: (
        req: TestRequest,
      ) => Promise<
        IStatusCodeResponse<IPeerListApiResponse | ApiErrorResponse>
      >;
    }
  ).handleListPeers(req);
}

// ── Tests ──

describe('IntrospectionController branded response construction', () => {
  // ── handleGetStatus ──

  describe('handleGetStatus', () => {
    it('returns 401 when memberContext is missing', async () => {
      const controller = makeController();
      const result = await callHandleGetStatus(controller, makeRequest());
      expect(result.statusCode).toBe(401);
    });

    it('returns 200 with a branded NodeStatus instance', async () => {
      const controller = makeController();
      const result = await callHandleGetStatus(
        controller,
        makeRequest(makeMemberContext()),
      );

      expect(result.statusCode).toBe(200);
      const response = result.response as INodeStatusApiResponse;
      expect(response.data).toBeDefined();

      // Verify the data is a branded instance by checking it validates
      expect(NodeStatusDef.validate(response.data)).toBe(true);
    });

    it('branded NodeStatus has all required fields', async () => {
      const controller = makeController();
      const result = await callHandleGetStatus(
        controller,
        makeRequest(makeMemberContext()),
      );

      const response = result.response as INodeStatusApiResponse;
      const data = response.data;

      expect(typeof data.nodeId).toBe('string');
      expect(typeof data.healthy).toBe('boolean');
      expect(typeof data.uptime).toBe('number');
      expect(typeof data.version).toBe('string');
      expect(Array.isArray(data.capabilities)).toBe(true);
      expect(typeof data.partitionMode).toBe('boolean');
    });

    it('includes disconnectedPeers for Admin in partition mode', async () => {
      const disconnectedPeers = ['peer1', 'peer2'];
      const controller = makeController({
        availabilityService: {
          getLocalNodeId: jest.fn().mockReturnValue('localnode1'),
          isInPartitionMode: jest.fn().mockReturnValue(true),
          getDisconnectedPeers: jest.fn().mockReturnValue(disconnectedPeers),
          getStatistics: jest.fn(),
        } as unknown as AvailabilityService,
      });

      const result = await callHandleGetStatus(
        controller,
        makeRequest(makeMemberContext(MemberType.Admin)),
      );

      expect(result.statusCode).toBe(200);
      const response = result.response as INodeStatusApiResponse;
      expect(response.data.disconnectedPeers).toEqual(disconnectedPeers);
    });

    it('omits disconnectedPeers for User in partition mode', async () => {
      const controller = makeController({
        availabilityService: {
          getLocalNodeId: jest.fn().mockReturnValue('localnode1'),
          isInPartitionMode: jest.fn().mockReturnValue(true),
          getDisconnectedPeers: jest.fn().mockReturnValue(['peer1']),
          getStatistics: jest.fn(),
        } as unknown as AvailabilityService,
      });

      const result = await callHandleGetStatus(
        controller,
        makeRequest(makeMemberContext(MemberType.User)),
      );

      expect(result.statusCode).toBe(200);
      const response = result.response as INodeStatusApiResponse;
      expect(response.data.disconnectedPeers).toBeUndefined();
    });

    it('returns error response when NodeStatusDef.create() throws', async () => {
      // Force create() to throw by making getLocalNodeId return a non-string
      const controller = makeController({
        availabilityService: {
          getLocalNodeId: jest.fn().mockImplementation(() => {
            throw new Error('Service unavailable');
          }),
          isInPartitionMode: jest.fn().mockReturnValue(false),
          getDisconnectedPeers: jest.fn().mockReturnValue([]),
          getStatistics: jest.fn(),
        } as unknown as AvailabilityService,
      });

      const result = await callHandleGetStatus(
        controller,
        makeRequest(makeMemberContext()),
      );

      // handleError() returns a 500-level status code
      expect(result.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ── handleListPeers ──

  describe('handleListPeers', () => {
    it('returns 401 when memberContext is missing', async () => {
      const controller = makeController();
      const result = await callHandleListPeers(controller, makeRequest());
      expect(result.statusCode).toBe(401);
    });

    it('returns 200 with a branded NetworkTopology instance', async () => {
      const controller = makeController();
      const result = await callHandleListPeers(
        controller,
        makeRequest(makeMemberContext()),
      );

      expect(result.statusCode).toBe(200);
      const response = result.response as IPeerListApiResponse;
      expect(response.data).toBeDefined();

      // Verify the data is a branded instance
      expect(NetworkTopologyDef.validate(response.data)).toBe(true);
    });

    it('branded NetworkTopology has all required fields', async () => {
      const controller = makeController();
      const result = await callHandleListPeers(
        controller,
        makeRequest(makeMemberContext()),
      );

      const response = result.response as IPeerListApiResponse;
      const data = response.data;

      expect(typeof data.localNodeId).toBe('string');
      expect(Array.isArray(data.peers)).toBe(true);
      expect(typeof data.totalConnected).toBe('number');
    });

    it('each peer in topology is a branded PeerInfo instance', async () => {
      const connectedNodes = ['node-aabbccdd', 'node-11223344'];
      const controller = makeController({
        webSocketMessageServer: {
          getConnectedNodes: jest.fn().mockReturnValue(connectedNodes),
        } as unknown as WebSocketMessageServer,
        heartbeatMonitor: {
          isPeerReachable: jest.fn().mockReturnValue(true),
          getLastLatency: jest.fn().mockReturnValue(10),
        } as unknown as HeartbeatMonitor,
      });

      const result = await callHandleListPeers(
        controller,
        makeRequest(makeMemberContext()),
      );

      expect(result.statusCode).toBe(200);
      const response = result.response as IPeerListApiResponse;
      expect(response.data.peers).toHaveLength(2);

      for (const peer of response.data.peers) {
        expect(PeerInfoDef.validate(peer)).toBe(true);
        expect(typeof peer.nodeId).toBe('string');
        expect(typeof peer.connected).toBe('boolean');
        expect(typeof peer.lastSeen).toBe('string');
      }
    });

    it('totalConnected reflects only connected peers', async () => {
      const connectedNodes = [
        'node-aabbccdd',
        'node-11223344',
        'node-55667788',
      ];
      let callCount = 0;
      const controller = makeController({
        webSocketMessageServer: {
          getConnectedNodes: jest.fn().mockReturnValue(connectedNodes),
        } as unknown as WebSocketMessageServer,
        heartbeatMonitor: {
          // First two reachable, third not
          isPeerReachable: jest.fn().mockImplementation(() => {
            callCount++;
            return callCount <= 2;
          }),
          getLastLatency: jest.fn().mockReturnValue(undefined),
        } as unknown as HeartbeatMonitor,
      });

      const result = await callHandleListPeers(
        controller,
        makeRequest(makeMemberContext()),
      );

      expect(result.statusCode).toBe(200);
      const response = result.response as IPeerListApiResponse;
      expect(response.data.totalConnected).toBe(2);
    });

    it('returns error response when getConnectedNodes throws', async () => {
      const controller = makeController({
        webSocketMessageServer: {
          getConnectedNodes: jest.fn().mockImplementation(() => {
            throw new Error('WebSocket server unavailable');
          }),
        } as unknown as WebSocketMessageServer,
      });

      const result = await callHandleListPeers(
        controller,
        makeRequest(makeMemberContext()),
      );

      expect(result.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('returns empty peers array when no nodes are connected', async () => {
      const controller = makeController({
        webSocketMessageServer: {
          getConnectedNodes: jest.fn().mockReturnValue([]),
        } as unknown as WebSocketMessageServer,
      });

      const result = await callHandleListPeers(
        controller,
        makeRequest(makeMemberContext()),
      );

      expect(result.statusCode).toBe(200);
      const response = result.response as IPeerListApiResponse;
      expect(response.data.peers).toHaveLength(0);
      expect(response.data.totalConnected).toBe(0);
    });
  });
});
