/**
 * @fileoverview End-to-End Integration Test: Lumen–BrightChain Client Protocol
 *
 * Proves that an external client can:
 * 1. Register/login and receive a JWT
 * 2. Authenticate REST requests with the JWT
 * 3. Hit all introspection endpoints (public + admin)
 * 4. Connect via WebSocket, subscribe to events, and receive broadcasts
 * 5. Get proper 401/403 responses for unauthorized access
 *
 * This test boots a lightweight Express server with the real authentication
 * middleware, IntrospectionController, and ClientWebSocketServer — the same
 * stack the production App wires up — and exercises the full protocol over
 * real HTTP and WebSocket connections.
 *
 * Run via: NX_TUI=false npx nx run brightchain-api:test --outputStyle=stream
 *
 * @see docs/lumen-client-protocol.md
 * @see .kiro/specs/lumen-brightchain-client-protocol/requirements.md
 */

import {
  ClientWebSocketServer,
  EventNotificationSystem,
  IntrospectionController,
  IntrospectionControllerConfig,
} from '@brightchain/brightchain-api-lib';
import {
  createJwtAuthMiddleware,
  IAuthenticatedRequest,
} from '@brightchain/brightchain-api-lib/lib/middlewares/authentication';
import {
  ClientEventAccessTier,
  ClientEventType,
  IBlockStoreStats,
  IClientEvent,
  IEnergyAccountStatus,
  INetworkTopology,
  INodeStatus,
  IPoolACL,
  IPoolDetail,
  IPoolDiscoveryResult,
  IPoolInfo,
  PoolPermission,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import express, { NextFunction, Response } from 'express';
import { createServer, Server } from 'http';
import * as jwt from 'jsonwebtoken';
import { AddressInfo } from 'net';
import { WebSocket } from 'ws';

// IBrightChainApplication type for the controller constructor
type ControllerAppParam = ConstructorParameters<
  typeof IntrospectionController
>[0];

// ── Constants ────────────────────────────────────────────────────────────

const JWT_SECRET = 'e2e-test-jwt-secret-lumen-protocol-2026';
const TEST_NODE_ID = 'e2e-test-node-001';
const TEST_VERSION = '0.16.0-e2e';
const TEST_CAPABILITIES = ['blocks', 'pools', 'gossip', 'introspection'];

// Valid SHA3-512 hex member IDs (128 hex chars) required by Checksum.fromHex
const USER_MEMBER_ID =
  '6bc8c2c4cd93237c166a607b62f943d44ed33ca040c408c29681377c73f250c7385a659e88c8fa9958d1286ee9fa2b9463cb688da79f0bf413632fcb39958caf';
const ADMIN_MEMBER_ID =
  'b47a7963befa1ff6b7be5e72281a10e1bec33394b2aebf77f9430244a20a97c730bfbb2e65609594c2abb89480ddcfca83f2f96f7ff283bede510abae1c8da69';

// ── Test Timeout ─────────────────────────────────────────────────────────

jest.setTimeout(30_000);

// ── Helpers ──────────────────────────────────────────────────────────────

function signToken(
  memberId: string,
  username: string,
  type: MemberType,
  expiresIn: jwt.SignOptions['expiresIn'] = '1h',
): string {
  return jwt.sign({ memberId, username, type }, JWT_SECRET, { expiresIn });
}

/**
 * Build test pool ACLs with the correct IPoolACL shape.
 */
function makeTestAcl(
  poolId: string,
  members: Array<{ nodeId: string; permissions: PoolPermission[] }>,
  publicRead: boolean,
  publicWrite: boolean,
): IPoolACL<string> {
  return {
    poolId,
    owner: ADMIN_MEMBER_ID,
    members: members.map((m) => ({
      nodeId: m.nodeId,
      permissions: m.permissions,
      addedAt: new Date(),
      addedBy: ADMIN_MEMBER_ID,
    })),
    publicRead,
    publicWrite,
    approvalSignatures: [],
    version: 1,
    updatedAt: new Date(),
  };
}

/**
 * Build the mock services the IntrospectionController needs.
 * Returns real-shaped data so the full response envelope is exercised.
 */
function createTestConfig(): IntrospectionControllerConfig {
  const testPools = new Map<string, IPoolInfo<string>>([
    [
      'pool-public-1',
      {
        poolId: 'pool-public-1',
        blockCount: 100,
        totalSize: 1024000,
        memberCount: 3,
        encrypted: false,
        publicRead: true,
        publicWrite: false,
        hostingNodes: [TEST_NODE_ID],
      },
    ],
    [
      'pool-private-1',
      {
        poolId: 'pool-private-1',
        blockCount: 50,
        totalSize: 512000,
        memberCount: 1,
        encrypted: true,
        publicRead: false,
        publicWrite: false,
        hostingNodes: [TEST_NODE_ID],
      },
    ],
  ]);

  const testPoolDetails = new Map<string, IPoolDetail<string>>([
    [
      'pool-public-1',
      {
        ...testPools.get('pool-public-1')!,
        owner: ADMIN_MEMBER_ID,
        aclSummary: {
          memberCount: 3,
          adminCount: 1,
          publicRead: true,
          publicWrite: false,
          currentUserPermissions: [PoolPermission.Read],
        },
      },
    ],
  ]);

  const testAcls = new Map<string, IPoolACL<string>>([
    [
      'pool-public-1',
      makeTestAcl(
        'pool-public-1',
        [
          { nodeId: USER_MEMBER_ID, permissions: [PoolPermission.Read] },
          {
            nodeId: ADMIN_MEMBER_ID,
            permissions: [
              PoolPermission.Read,
              PoolPermission.Write,
              PoolPermission.Admin,
            ],
          },
        ],
        true,
        false,
      ),
    ],
  ]);

  // Partial mocks — only the methods the controller actually calls
  const availabilityService = {
    getLocalNodeId: () => TEST_NODE_ID,
    isInPartitionMode: () => true,
    getDisconnectedPeers: () => ['peer-disconnected-001'],
    getStatistics: async () => ({
      localCount: 500,
      remoteCount: 100,
      cachedCount: 50,
      orphanedCount: 10,
      unknownCount: 5,
    }),
  };

  const heartbeatMonitor = {
    isPeerReachable: () => true,
    getLastLatency: () => 42,
  };

  const webSocketMessageServer = {
    getConnectedNodes: () => ['peer-node-001', 'peer-node-002'],
  };

  const poolDiscoveryService = {
    discoverPools: async (): Promise<IPoolDiscoveryResult<string>> => ({
      pools: [testPools.get('pool-public-1')!],
      queriedPeers: ['peer-node-001'],
      unreachablePeers: [],
      timestamp: new Date().toISOString(),
    }),
  };

  return {
    version: TEST_VERSION,
    capabilities: TEST_CAPABILITIES,
    availabilityService:
      availabilityService as unknown as IntrospectionControllerConfig['availabilityService'],
    heartbeatMonitor:
      heartbeatMonitor as unknown as IntrospectionControllerConfig['heartbeatMonitor'],
    webSocketMessageServer:
      webSocketMessageServer as unknown as IntrospectionControllerConfig['webSocketMessageServer'],
    poolDiscoveryService:
      poolDiscoveryService as unknown as IntrospectionControllerConfig['poolDiscoveryService'],
    poolAclLookup: (poolId: string) => testAcls.get(poolId),
    localPoolIds: () => Array.from(testPools.keys()),
    poolMetadataLookup: (poolId: string) => testPools.get(poolId),
    poolDetailLookup: (poolId: string) => testPoolDetails.get(poolId),
  };
}

// ── Server Setup ─────────────────────────────────────────────────────────

interface TestServer {
  httpServer: Server;
  baseUrl: string;
  wsUrl: string;
  clientWsServer: ClientWebSocketServer;
  eventSystem: EventNotificationSystem;
}

/**
 * Boot a lightweight Express server with the real auth middleware,
 * IntrospectionController, and ClientWebSocketServer.
 */
function createTestServer(): Promise<TestServer> {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    // Mock application — satisfies BaseController constructor requirements
    // BaseController needs: db.connection, environment.mongo.useTransactions,
    // environment.jwtSecret, and services.get()
    const mockApplication = {
      environment: {
        jwtSecret: JWT_SECRET,
        debug: false,
        mongo: { useTransactions: false },
      },
      constants: {},
      db: {
        connection: {
          startSession: () =>
            Promise.resolve({ endSession: () => Promise.resolve() }),
        },
      },
      ready: true,
      plugins: { register: () => undefined },
      services: {
        get: (name: string) => {
          if (name === 'energyStore') {
            return {
              getOrCreate: async () => ({
                balance: 1000,
                availableBalance: 800,
                earned: 1500,
                spent: 500,
                reserved: 200,
              }),
            };
          }
          return undefined;
        },
      },
      getModel: () => undefined,
      start: () => Promise.resolve(),
      getController: () => undefined,
      setController: () => undefined,
    };

    const config = createTestConfig();

    // Create the IntrospectionController with the mock application
    const controller = new IntrospectionController(
      mockApplication as unknown as ControllerAppParam,
      config,
    );

    // Override the upstream authenticateRequest (which requires mongoose/UserModel)
    // with our lightweight JWT auth that just verifies the token and sets memberContext + user.
    const jwtAuth = createJwtAuthMiddleware({ jwtSecret: JWT_SECRET });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (controller as Record<string, any>)['authenticateRequest'] = (
      _route: unknown,
      req: IAuthenticatedRequest,
      _res: Response,
      next: NextFunction,
    ): Promise<void> => {
      return new Promise<void>((resolve) => {
        jwtAuth(req, _res, (err?: unknown) => {
          if (err) {
            next(err);
          } else {
            // The upstream BaseController checks req.user to decide 401
            // createJwtAuthMiddleware already sets req.user via (req as any).user
            next();
          }
          resolve();
        });
      });
    };

    // Mount introspection routes (mirrors production wiring)
    app.use('/api/introspection', controller.router);

    // Simple login endpoint for testing (simulates /api/user/login)
    app.post('/api/user/login', (req, res) => {
      const { username, password } = req.body;
      if (!username || !password) {
        res
          .status(400)
          .json({ success: false, message: 'Missing credentials' });
        return;
      }
      const memberId = USER_MEMBER_ID;
      const token = signToken(memberId, username, MemberType.User);
      res.json({
        success: true,
        message: 'Login successful',
        data: { token, memberId, energyBalance: 1000 },
      });
    });

    // Admin login endpoint for testing
    app.post('/api/user/admin-login', (req, res) => {
      const { username, password } = req.body;
      if (!username || !password) {
        res
          .status(400)
          .json({ success: false, message: 'Missing credentials' });
        return;
      }
      const memberId = ADMIN_MEMBER_ID;
      const token = signToken(memberId, username, MemberType.Admin);
      res.json({
        success: true,
        message: 'Login successful',
        data: { token, memberId, energyBalance: 5000 },
      });
    });

    const httpServer = createServer(app);

    // Wire up the ClientWebSocketServer (real implementation)
    const eventSystem = new EventNotificationSystem();
    const clientWsServer = new ClientWebSocketServer(
      httpServer,
      JWT_SECRET,
      eventSystem,
      {
        idleTimeoutMs: 60_000,
        tokenCheckIntervalMs: 5_000,
        tokenWarningBeforeMs: 10_000,
      },
    );

    // Listen on a random available port
    httpServer.listen(0, '127.0.0.1', () => {
      const addr = httpServer.address() as AddressInfo;
      const baseUrl = `http://127.0.0.1:${addr.port}`;
      const wsUrl = `ws://127.0.0.1:${addr.port}`;
      resolve({ httpServer, baseUrl, wsUrl, clientWsServer, eventSystem });
    });
  });
}

// ── Test Suite ───────────────────────────────────────────────────────────

describe('Lumen–BrightChain Client Protocol E2E', () => {
  let server: TestServer;
  let userToken: string;
  let adminToken: string;

  beforeAll(async () => {
    server = await createTestServer();
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.clientWsServer.close(() => {
        server.httpServer.close(() => resolve());
      });
    });
  });

  // ── Section 1: Authentication ──────────────────────────────────────

  describe('Authentication', () => {
    it('should login as a regular user and receive a JWT', async () => {
      const res = await fetch(`${server.baseUrl}/api/user/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'alice', password: 'secret' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.success).toBe(true);
      expect(body.data.token).toBeDefined();
      expect(body.data.memberId).toBe(USER_MEMBER_ID);
      expect(typeof body.data.energyBalance).toBe('number');

      userToken = body.data.token;
    });

    it('should login as an admin and receive a JWT', async () => {
      const res = await fetch(`${server.baseUrl}/api/user/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'admin', password: 'admin-secret' }),
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.token).toBeDefined();
      adminToken = body.data.token;
    });

    it('should reject requests without a token with 401', async () => {
      const res = await fetch(`${server.baseUrl}/api/introspection/status`);
      expect(res.status).toBe(401);
    });

    it('should reject requests with an expired token with 401', async () => {
      const expiredToken = signToken(
        USER_MEMBER_ID,
        'alice',
        MemberType.User,
        '-1s',
      );
      const res = await fetch(`${server.baseUrl}/api/introspection/status`, {
        headers: { Authorization: `Bearer ${expiredToken}` },
      });
      expect(res.status).toBe(401);
    });

    it('should reject requests with a wrong-secret token with 401', async () => {
      const badToken = jwt.sign(
        { memberId: 'x', username: 'x', type: MemberType.User },
        'wrong-secret',
        { expiresIn: '1h' },
      );
      const res = await fetch(`${server.baseUrl}/api/introspection/status`, {
        headers: { Authorization: `Bearer ${badToken}` },
      });
      expect(res.status).toBe(401);
    });
  });

  // ── Section 2: Public Introspection Endpoints ──────────────────────

  describe('Public Endpoints (User access)', () => {
    it('GET /status — returns node health with correct shape', async () => {
      const res = await fetch(`${server.baseUrl}/api/introspection/status`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      const status: INodeStatus<string> = body.data;
      expect(status.nodeId).toBe(TEST_NODE_ID);
      expect(status.healthy).toBe(true);
      expect(typeof status.uptime).toBe('number');
      expect(status.version).toBe(TEST_VERSION);
      expect(status.capabilities).toEqual(TEST_CAPABILITIES);
      expect(status.partitionMode).toBe(true);
      // User should NOT see disconnectedPeers
      expect(status.disconnectedPeers).toBeUndefined();
    });

    it('GET /pools — returns pools the user has Read permission on', async () => {
      const res = await fetch(`${server.baseUrl}/api/introspection/pools`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      const pools: IPoolInfo<string>[] = body.data;
      // User has Read on pool-public-1 (via ACL), not on pool-private-1
      expect(pools.length).toBe(1);
      expect(pools[0].poolId).toBe('pool-public-1');
    });

    it('GET /pools/:poolId — returns pool details for authorized pool', async () => {
      const res = await fetch(
        `${server.baseUrl}/api/introspection/pools/pool-public-1`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      const detail: IPoolDetail<string> = body.data;
      expect(detail.poolId).toBe('pool-public-1');
      expect(detail.owner).toBeDefined();
      expect(detail.aclSummary).toBeDefined();
      expect(detail.aclSummary.memberCount).toBeGreaterThan(0);
    });

    it('GET /pools/:poolId — returns 403 for unauthorized pool', async () => {
      const res = await fetch(
        `${server.baseUrl}/api/introspection/pools/pool-private-1`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );
      expect(res.status).toBe(403);
    });

    it('GET /energy — returns the user energy account', async () => {
      const res = await fetch(`${server.baseUrl}/api/introspection/energy`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      const energy: IEnergyAccountStatus<string> = body.data;
      expect(energy.memberId).toBe(USER_MEMBER_ID);
      expect(typeof energy.balance).toBe('number');
      expect(typeof energy.availableBalance).toBe('number');
      expect(typeof energy.earned).toBe('number');
      expect(typeof energy.spent).toBe('number');
      expect(typeof energy.reserved).toBe('number');
    });
  });

  // ── Section 3: Admin Endpoints ─────────────────────────────────────

  describe('Admin Endpoints', () => {
    it('GET /peers — admin sees connected peers', async () => {
      const res = await fetch(`${server.baseUrl}/api/introspection/peers`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      const topology: INetworkTopology<string> = body.data;
      expect(topology.localNodeId).toBe(TEST_NODE_ID);
      expect(topology.peers.length).toBe(2);
      expect(topology.totalConnected).toBeGreaterThan(0);
    });

    it('GET /peers — user gets 403', async () => {
      const res = await fetch(`${server.baseUrl}/api/introspection/peers`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('GET /stats — admin sees block store statistics', async () => {
      const res = await fetch(`${server.baseUrl}/api/introspection/stats`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      const stats: IBlockStoreStats = body.data;
      expect(typeof stats.totalBlocks).toBe('number');
      expect(stats.totalBlocks).toBeGreaterThan(0);
      expect(stats.blockCounts).toBeDefined();
    });

    it('GET /stats — user gets 403', async () => {
      const res = await fetch(`${server.baseUrl}/api/introspection/stats`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      expect(res.status).toBe(403);
    });

    it('GET /status — admin sees disconnectedPeers in partition mode', async () => {
      const res = await fetch(`${server.baseUrl}/api/introspection/status`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      const status: INodeStatus<string> = body.data;
      expect(status.partitionMode).toBe(true);
      expect(status.disconnectedPeers).toBeDefined();
      expect(status.disconnectedPeers!.length).toBeGreaterThan(0);
    });

    it('GET /pools — admin sees ALL pools regardless of ACL', async () => {
      const res = await fetch(`${server.baseUrl}/api/introspection/pools`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const body = await res.json();

      expect(res.status).toBe(200);
      const pools: IPoolInfo<string>[] = body.data;
      expect(pools.length).toBe(2);
    });

    it('GET /energy/:memberId — admin can view another member energy', async () => {
      const res = await fetch(
        `${server.baseUrl}/api/introspection/energy/${USER_MEMBER_ID}`,
        {
          headers: { Authorization: `Bearer ${adminToken}` },
        },
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.data.memberId).toBe(USER_MEMBER_ID);
    });

    it('GET /energy/:memberId — user gets 403', async () => {
      const res = await fetch(
        `${server.baseUrl}/api/introspection/energy/${ADMIN_MEMBER_ID}`,
        {
          headers: { Authorization: `Bearer ${userToken}` },
        },
      );
      expect(res.status).toBe(403);
    });

    it('POST /discover-pools — admin can discover pools', async () => {
      const res = await fetch(
        `${server.baseUrl}/api/introspection/discover-pools`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const body = await res.json();

      expect(res.status).toBe(200);
      const discovery: IPoolDiscoveryResult<string> = body.data;
      expect(discovery.pools).toBeDefined();
      expect(discovery.queriedPeers).toBeDefined();
      expect(discovery.unreachablePeers).toBeDefined();
      expect(discovery.timestamp).toBeDefined();
    });

    it('POST /discover-pools — user gets 403', async () => {
      const res = await fetch(
        `${server.baseUrl}/api/introspection/discover-pools`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        },
      );
      expect(res.status).toBe(403);
    });
  });

  // ── Section 4: WebSocket Channel ───────────────────────────────────

  describe('WebSocket Client Channel', () => {
    it('should connect with a valid JWT token', async () => {
      const ws = new WebSocket(`${server.wsUrl}/ws/client?token=${adminToken}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
        setTimeout(() => reject(new Error('WebSocket connect timeout')), 5000);
      });

      expect(ws.readyState).toBe(WebSocket.OPEN);
      ws.close();
      await new Promise<void>((r) => ws.on('close', () => r()));
    });

    it('should reject connection with invalid JWT', async () => {
      const ws = new WebSocket(
        `${server.wsUrl}/ws/client?token=invalid-garbage-token`,
      );

      const closeCode = await new Promise<number>((resolve) => {
        ws.on('close', (code) => resolve(code));
        ws.on('error', () => {
          /* expected */
        });
      });

      // Server closes with 4001 (auth failed) or connection may be rejected
      expect([4001, 1006]).toContain(closeCode);
    });

    it('should subscribe to events and receive broadcasts', async () => {
      const ws = new WebSocket(`${server.wsUrl}/ws/client?token=${adminToken}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
        setTimeout(() => reject(new Error('timeout')), 5000);
      });

      // Subscribe to pool events
      ws.send(
        JSON.stringify({
          action: 'subscribe',
          eventTypes: [
            ClientEventType.PoolCreated,
            ClientEventType.PoolChanged,
          ],
        }),
      );

      // Wait for subscription confirmation
      const subConfirm = await new Promise<Record<string, unknown>>(
        (resolve) => {
          ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'subscription_update') {
              resolve(msg);
            }
          });
        },
      );

      expect(subConfirm.action).toBe('subscribe');
      expect(
        (subConfirm.currentSubscriptions as string[]).length,
      ).toBeGreaterThan(0);

      // Broadcast an event from the server side
      const testEvent: IClientEvent<string> = {
        eventType: ClientEventType.PoolCreated,
        accessTier: ClientEventAccessTier.Admin,
        payload: { poolId: 'new-pool-123', action: 'created' },
        timestamp: new Date().toISOString(),
        correlationId: 'e2e-test-correlation-001',
        targetPoolId: 'new-pool-123',
      };

      server.clientWsServer.broadcastEvent(testEvent);

      // The admin client should receive it
      const received = await new Promise<IClientEvent<string>>(
        (resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Event receive timeout')),
            5000,
          );
          ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.eventType === ClientEventType.PoolCreated) {
              clearTimeout(timeout);
              resolve(msg);
            }
          });
        },
      );

      expect(received.eventType).toBe(ClientEventType.PoolCreated);
      expect(received.correlationId).toBe('e2e-test-correlation-001');
      expect(received.accessTier).toBe(ClientEventAccessTier.Admin);
      expect(received.payload).toBeDefined();

      ws.close();
      await new Promise<void>((r) => ws.on('close', () => r()));
    });

    it('should NOT deliver admin events to User-type subscribers', async () => {
      const ws = new WebSocket(`${server.wsUrl}/ws/client?token=${userToken}`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
        setTimeout(() => reject(new Error('timeout')), 5000);
      });

      // Subscribe to peer events (admin-tier)
      ws.send(
        JSON.stringify({
          action: 'subscribe',
          eventTypes: [ClientEventType.PeerConnected],
        }),
      );

      // Wait for subscription confirmation
      await new Promise<void>((resolve) => {
        ws.on('message', (data) => {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'subscription_update') resolve();
        });
      });

      // Broadcast an admin-tier event
      const adminEvent: IClientEvent<string> = {
        eventType: ClientEventType.PeerConnected,
        accessTier: ClientEventAccessTier.Admin,
        payload: { nodeId: 'new-peer' },
        timestamp: new Date().toISOString(),
        correlationId: 'e2e-admin-event-001',
      };

      server.clientWsServer.broadcastEvent(adminEvent);

      // User should NOT receive it — wait briefly and verify no message
      const receivedMessages: string[] = [];
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.eventType) receivedMessages.push(msg.eventType);
      });

      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      expect(receivedMessages).not.toContain(ClientEventType.PeerConnected);

      ws.close();
      await new Promise<void>((r) => ws.on('close', () => r()));
    });

    it('should authenticate via first message when no query param token', async () => {
      const ws = new WebSocket(`${server.wsUrl}/ws/client`);

      await new Promise<void>((resolve, reject) => {
        ws.on('open', () => resolve());
        ws.on('error', reject);
        setTimeout(() => reject(new Error('timeout')), 5000);
      });

      // Send auth message as first message
      ws.send(JSON.stringify({ type: 'auth', token: adminToken }));

      // Should receive auth_success
      const authResponse = await new Promise<Record<string, unknown>>(
        (resolve, reject) => {
          const timeout = setTimeout(
            () => reject(new Error('Auth response timeout')),
            5000,
          );
          ws.on('message', (data) => {
            const msg = JSON.parse(data.toString());
            if (msg.type === 'auth_success') {
              clearTimeout(timeout);
              resolve(msg);
            }
          });
        },
      );

      expect(authResponse.type).toBe('auth_success');

      ws.close();
      await new Promise<void>((r) => ws.on('close', () => r()));
    });
  });

  // ── Section 5: Protocol Completeness ───────────────────────────────

  describe('Protocol completeness check', () => {
    it('all public endpoints are accessible to authenticated users', async () => {
      const publicPaths = ['/status', '/pools', '/energy'];
      for (const path of publicPaths) {
        const res = await fetch(`${server.baseUrl}/api/introspection${path}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        expect(res.status).toBe(200);
      }
    });

    it('all admin endpoints reject User-type members with 403', async () => {
      const adminEndpoints = [
        { method: 'GET' as const, path: '/peers' },
        { method: 'GET' as const, path: '/stats' },
        { method: 'GET' as const, path: `/energy/${ADMIN_MEMBER_ID}` },
        { method: 'POST' as const, path: '/discover-pools' },
      ];
      for (const { method, path } of adminEndpoints) {
        const res = await fetch(`${server.baseUrl}/api/introspection${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
        });
        expect(res.status).toBe(403);
      }
    });

    it('all admin endpoints are accessible to Admin members', async () => {
      const adminEndpoints = [
        { method: 'GET' as const, path: '/peers' },
        { method: 'GET' as const, path: '/stats' },
        { method: 'GET' as const, path: `/energy/${ADMIN_MEMBER_ID}` },
        { method: 'POST' as const, path: '/discover-pools' },
      ];
      for (const { method, path } of adminEndpoints) {
        const res = await fetch(`${server.baseUrl}/api/introspection${path}`, {
          method,
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        });
        expect(res.status).toBe(200);
      }
    });
  });
});
