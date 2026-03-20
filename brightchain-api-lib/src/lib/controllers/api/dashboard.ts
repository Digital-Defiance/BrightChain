import {
  HealthStatus,
  IAdminBlockStoreStats,
  IAdminBrightTrustMember,
  IAdminBrightTrustStatus,
  IAdminChatStats,
  IAdminClientSession,
  IAdminDashboardData,
  IAdminDbStats,
  IAdminDependencyHealth,
  IAdminHubStats,
  IAdminMailStats,
  IAdminPassStats,
  IAdminPoolInfo,
  IAdminSystemMetrics,
  IAvailabilityService,
  IDependencyStatus,
  INodeInfo,
  NodeIdSource,
  NodeStatus,
} from '@brightchain/brightchain-lib';
import type { BrightDb } from '@brightchain/db';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  TypedHandlers,
  routeConfig,
} from '@digitaldefiance/node-express-suite';
import { readFileSync } from 'fs';
import { hostname } from 'os';
import { join } from 'path';
import { IBrightChainApplication } from '../../interfaces/application';
import { IAdminDashboardApiResponse } from '../../interfaces/responses';
import { DefaultBackendIdType } from '../../shared-types';
import { handleError } from '../../utils/errorResponse';
import { BaseController } from '../base';

/**
 * Load version from package.json at runtime.
 * Falls back to 'unknown' if package.json cannot be read.
 */
function loadVersion(): string {
  try {
    const possiblePaths = [
      join(__dirname, '..', '..', '..', '..', 'package.json'),
      join(__dirname, '..', '..', '..', 'package.json'),
      join(process.cwd(), 'brightchain-api-lib', 'package.json'),
    ];
    for (const pkgPath of possiblePaths) {
      try {
        const content = readFileSync(pkgPath, 'utf-8');
        const pkg = JSON.parse(content);
        if (pkg.version) return pkg.version;
      } catch {
        // Try next path
      }
    }
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

type DashboardApiResponse = IAdminDashboardApiResponse | ApiErrorResponse;

interface DashboardHandlers extends TypedHandlers {
  getDashboard: ApiRequestHandler<
    IAdminDashboardApiResponse | ApiErrorResponse
  >;
}

/**
 * Controller for the admin server dashboard endpoint.
 *
 * Aggregates runtime metrics from existing services into a single JSON response.
 * Each data section is gathered independently with its own try/catch so a failure
 * in one area does not prevent the rest of the dashboard data from being returned.
 *
 * ## Endpoints
 *
 * ### GET /api/admin/dashboard
 * Returns aggregated server metrics including nodes, WebSocket connections,
 * system metrics, database stats, BrightTrust status, pool info, dependency health,
 * and service summary statistics.
 *
 * @requirements 1.3, 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 5.1, 5.2, 5.3,
 *   6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 8.1, 8.2, 8.3, 9.1, 9.2, 11.1,
 *   12.1, 13.6, 14.1, 15.1, 16.1, 17.1
 */
export class DashboardController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  DashboardApiResponse,
  DashboardHandlers,
  CoreLanguageCode
> {
  private static readonly VERSION: string = loadVersion();
  private availabilityService: IAvailabilityService | null = null;
  private localNodeIdOverride: string | null = null;
  private localNodeIdSourceOverride: NodeIdSource = NodeIdSource.GENERATED;

  constructor(application: IBrightChainApplication<TID>) {
    super(application);
  }

  /**
   * Set the AvailabilityService instance for dependency injection.
   */
  public setAvailabilityService(service: IAvailabilityService): void {
    this.availabilityService = service;
  }

  /**
   * Set the local node ID directly (used when AvailabilityService is not wired).
   * This ensures the dashboard always reports a proper node identity.
   */
  public setLocalNodeId(nodeId: string, source?: NodeIdSource): void {
    this.localNodeIdOverride = nodeId;
    if (source !== undefined) {
      this.localNodeIdSourceOverride = source;
    }
  }

  protected initRouteDefinitions(): void {
    this.routeDefinitions = [
      routeConfig('get', '/', {
        handlerKey: 'getDashboard',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
    ];

    this.handlers = {
      getDashboard: this.handleGetDashboard.bind(this),
    };
  }

  /**
   * GET /api/admin/dashboard
   * Aggregates data from all services into a single dashboard response.
   */
  private async handleGetDashboard(): Promise<{
    statusCode: number;
    response: IAdminDashboardApiResponse | ApiErrorResponse;
  }> {
    try {
      // --- Nodes (Req 2.1, 2.2, 2.3) ---
      const { nodes, localNodeId, nodeIdSource, disconnectedPeers } = this.gatherNodeData();

      // --- Lumen client sessions (Req 3.1, 3.2) ---
      const { lumenClientCount, lumenClientSessions } =
        this.gatherLumenClientData();

      // --- Node-to-node connections (Req 4.1, 4.2) ---
      const { nodeConnectionCount, connectedNodeIds } =
        this.gatherNodeConnectionData();

      // --- System metrics (Req 5.1, 5.2, 5.3) ---
      const system = this.gatherSystemMetrics();

      // --- DB stats (Req 6.1, 6.2, 6.3, 12.1) ---
      const db = await this.gatherDbStats();

      // --- BrightTrust (Req 7.1, 7.2, 7.3) ---
      const brightTrust = await this.gatherBrightTrustStatus();

      // --- Pool info (Req 8.1, 8.2, 8.3) ---
      const pools = this.gatherPoolInfo();

      // --- Dependency health (Req 9.1, 9.2) ---
      const dependencies = await this.gatherDependencyHealth();

      // --- Block store stats (Req 13.6) ---
      const blockStore = await this.gatherBlockStoreStats();

      // --- BrightHub stats (Req 14.1) ---
      const hub = await this.gatherHubStats();

      // --- BrightChat stats (Req 15.1) ---
      const chat = await this.gatherChatStats();

      // --- BrightPass stats (Req 16.1) ---
      const pass = await this.gatherPassStats();

      // --- BrightMail stats (Req 17.1) ---
      const mail = await this.gatherMailStats();

      const dashboardData: IAdminDashboardData = {
        nodes,
        localNodeId,
        nodeIdSource,
        hostname: hostname(),
        disconnectedPeers,
        lumenClientCount,
        lumenClientSessions,
        nodeConnectionCount,
        connectedNodeIds,
        system,
        db,
        brightTrust,
        pools,
        dependencies,
        blockStore,
        hub,
        chat,
        pass,
        mail,
        timestamp: new Date().toISOString(),
      };

      return {
        statusCode: 200,
        response: {
          message: 'OK',
          ...dashboardData,
        },
      };
    } catch (_error) {
      return handleError(_error);
    }
  }

  /**
   * Gather node data from AvailabilityService and NodesController.
   * Falls back to the environment-provided node ID when the
   * AvailabilityService has not been wired up (single-node / dev mode).
   */
  private gatherNodeData(): {
    nodes: INodeInfo[];
    localNodeId: string | null;
    nodeIdSource: NodeIdSource;
    disconnectedPeers: string[];
  } {
    try {
      const availabilityService = this.availabilityService;
      const nodes: INodeInfo[] = [];
      let localNodeId: string | null = null;
      let nodeIdSource: NodeIdSource = this.localNodeIdSourceOverride;
      let disconnectedPeers: string[] = [];

      if (availabilityService) {
        localNodeId = availabilityService.getLocalNodeId();
        nodeIdSource = NodeIdSource.AVAILABILITY_SERVICE;

        if (localNodeId) {
          nodes.push({
            nodeId: localNodeId,
            status: NodeStatus.ONLINE,
            capabilities: ['block_storage', 'message_routing'],
            lastSeen: new Date().toISOString(),
          });
        }

        if (availabilityService.isInPartitionMode()) {
          disconnectedPeers = availabilityService.getDisconnectedPeers();
          for (const peerId of disconnectedPeers) {
            nodes.push({
              nodeId: peerId,
              status: NodeStatus.UNREACHABLE,
              capabilities: ['block_storage'],
              lastSeen: new Date().toISOString(),
            });
          }
        }
      } else {
        // No AvailabilityService wired — use the node ID set during app
        // initialization (from NODE_ID env var or auto-generated GuidV4).
        localNodeId = this.localNodeIdOverride;
        if (localNodeId) {
          nodes.push({
            nodeId: localNodeId,
            status: NodeStatus.ONLINE,
            capabilities: ['block_storage', 'message_routing'],
            lastSeen: new Date().toISOString(),
          });
        }
      }

      // Also include registered nodes from NodesController if available
      try {
        const nodesController = this.application.getController<{
          isNodeRegistered?: (id: string) => boolean;
        }>('nodes');
        // NodesController doesn't expose a list of registered nodes directly,
        // so we rely on AvailabilityService for the node list
        void nodesController;
      } catch {
        // NodesController not available
      }

      return { nodes, localNodeId, nodeIdSource, disconnectedPeers };
    } catch {
      return { nodes: [], localNodeId: null, nodeIdSource: this.localNodeIdSourceOverride, disconnectedPeers: [] };
    }
  }

  /**
   * Gather Lumen client session data from ClientWebSocketServer.
   */
  private gatherLumenClientData(): {
    lumenClientCount: number;
    lumenClientSessions: IAdminClientSession[];
  } {
    try {
      const app = this.application as unknown as {
        getClientWebSocketServer?: () => {
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
      };

      const clientWsServer = app.getClientWebSocketServer?.();
      if (!clientWsServer) {
        return { lumenClientCount: 0, lumenClientSessions: [] };
      }

      const count = clientWsServer.getConnectedClientCount();
      const sessions = clientWsServer.getSessions();
      const lumenClientSessions: IAdminClientSession[] = [];

      for (const [, session] of sessions) {
        lumenClientSessions.push({
          memberId: session.memberContext.memberId,
          username: session.memberContext.username,
          memberType: String(session.memberContext.type),
          rooms: Array.from(session.rooms),
        });
      }

      return { lumenClientCount: count, lumenClientSessions };
    } catch {
      return { lumenClientCount: 0, lumenClientSessions: [] };
    }
  }

  /**
   * Gather node-to-node connection data from WebSocketMessageServer.
   */
  private gatherNodeConnectionData(): {
    nodeConnectionCount: number;
    connectedNodeIds: string[];
  } {
    try {
      const app = this.application as unknown as {
        getWebSocketServer?: () => {
          getConnectedNodes: () => string[];
        } | null;
      };

      const wsServer = app.getWebSocketServer?.();
      if (!wsServer) {
        return { nodeConnectionCount: 0, connectedNodeIds: [] };
      }

      const connectedNodeIds = wsServer.getConnectedNodes();
      return {
        nodeConnectionCount: connectedNodeIds.length,
        connectedNodeIds,
      };
    } catch {
      return { nodeConnectionCount: 0, connectedNodeIds: [] };
    }
  }

  /**
   * Gather system metrics from process.
   */
  private gatherSystemMetrics(): IAdminSystemMetrics {
    try {
      const mem = process.memoryUsage();
      return {
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal,
        rssBytes: mem.rss,
        externalBytes: mem.external,
        uptimeSeconds: Math.floor(process.uptime()),
        nodeVersion: process.version,
        appVersion: DashboardController.VERSION,
      };
    } catch {
      return {
        heapUsedBytes: 0,
        heapTotalBytes: 0,
        rssBytes: 0,
        externalBytes: 0,
        uptimeSeconds: 0,
        nodeVersion: process.version,
        appVersion: DashboardController.VERSION,
      };
    }
  }

  /**
   * Gather database statistics from BrightDB.
   */
  private async gatherDbStats(): Promise<IAdminDbStats> {
    try {
      const brightDb = this.application.services.get('db') as
        | BrightDb
        | undefined;
      if (!brightDb) {
        return {
          users: null,
          roles: null,
          usersByStatus: null,
          error: 'Database unavailable',
        };
      }

      const usersCollection = brightDb.collection('users');
      const rolesCollection = brightDb.collection('roles');

      const [usersCount, rolesCount] = await Promise.all([
        usersCollection.countDocuments(),
        rolesCollection.countDocuments(),
      ]);

      // Breakdown by AccountStatus (Req 12.1)
      let usersByStatus: IAdminDbStats['usersByStatus'] = null;
      try {
        const [activeCount, lockedCount, pendingCount] = await Promise.all([
          usersCollection.countDocuments({ accountStatus: 'Active' }),
          usersCollection.countDocuments({ accountStatus: 'AdminLock' }),
          usersCollection.countDocuments({
            accountStatus: 'PendingEmailVerification',
          }),
        ]);
        usersByStatus = {
          active: activeCount,
          locked: lockedCount,
          pendingEmailVerification: pendingCount,
        };
      } catch {
        // usersByStatus stays null on error
      }

      return {
        users: usersCount,
        roles: rolesCount,
        usersByStatus,
      };
    } catch (error) {
      return {
        users: null,
        roles: null,
        usersByStatus: null,
        error: error instanceof Error ? error.message : 'Database unavailable',
      };
    }
  }

  /**
   * Gather BrightTrust status from BrightTrustStateMachine.
   */
  private async gatherBrightTrustStatus(): Promise<IAdminBrightTrustStatus> {
    const inactiveFallback: IAdminBrightTrustStatus = {
      active: false,
      memberCount: 0,
      threshold: 0,
      members: [],
    };

    try {
      const qsm = this.application.services.get('brightTrustStateMachine') as
        | {
            getMode: () => Promise<string>;
            getCurrentEpoch: () => Promise<{
              memberIds: unknown[];
              threshold: number;
            }>;
            getConfiguredThreshold: () => number;
          }
        | undefined;

      if (!qsm) {
        return inactiveFallback;
      }

      const mode = await qsm.getMode();
      const isActive = mode !== 'uninitialized';

      if (!isActive) {
        return inactiveFallback;
      }

      const threshold = qsm.getConfiguredThreshold();

      // Get active members from the BrightTrust database adapter
      const brightTrustDb = this.application.services.get(
        'brightTrustDbAdapter',
      ) as
        | {
            listActiveMembers: () => Promise<
              Array<{
                metadata: { name: string; role?: string };
                isActive: boolean;
              }>
            >;
          }
        | undefined;

      const members: IAdminBrightTrustMember[] = [];
      let memberCount = 0;

      if (brightTrustDb) {
        try {
          const activeMembers = await brightTrustDb.listActiveMembers();
          memberCount = activeMembers.length;
          for (const member of activeMembers) {
            members.push({
              name: member.metadata.name,
              role: member.metadata.role,
            });
          }
        } catch {
          // Fall back to epoch data for member count
          try {
            const epoch = await qsm.getCurrentEpoch();
            memberCount = epoch.memberIds.length;
          } catch {
            // memberCount stays 0
          }
        }
      }

      return {
        active: isActive,
        memberCount,
        threshold,
        members,
      };
    } catch {
      return inactiveFallback;
    }
  }

  /**
   * Gather pool info from PoolDiscoveryService or AvailabilityService.
   */
  private gatherPoolInfo(): IAdminPoolInfo[] {
    try {
      const pools: IAdminPoolInfo[] = [];

      // Try to get pool info from PoolDiscoveryService cache
      const poolDiscoveryService = this.application.services.get(
        'poolDiscoveryService',
      ) as
        | {
            getRemotePoolCache: () => Map<
              string,
              { poolId: string; blockCount?: number; totalSize?: number }
            >;
          }
        | undefined;

      if (poolDiscoveryService) {
        const cache = poolDiscoveryService.getRemotePoolCache();
        for (const [, entry] of cache) {
          pools.push({
            poolId: entry.poolId,
            metadata: {
              blockCount: entry.blockCount,
              totalSize: entry.totalSize,
            },
          });
        }
      }

      // Always include the BrightTrust-system pool if BrightTrust is configured
      const qsm = this.application.services.get('brightTrustStateMachine');
      if (qsm && !pools.some((p) => p.poolId === 'brightTrust-system')) {
        pools.push({ poolId: 'brightTrust-system' });
      }

      return pools;
    } catch {
      return [];
    }
  }

  /**
   * Check the health of a single dependency.
   */
  private async checkDependencyHealth(
    name: string,
    checkFn: () => Promise<boolean>,
  ): Promise<IDependencyStatus> {
    const startTime = Date.now();
    try {
      const isHealthy = await checkFn();
      const latencyMs = Date.now() - startTime;
      return {
        name,
        status: isHealthy ? HealthStatus.HEALTHY : HealthStatus.UNHEALTHY,
        latencyMs,
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      return {
        name,
        status: HealthStatus.UNHEALTHY,
        latencyMs,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Gather dependency health checks (reusing HealthController pattern).
   */
  private async gatherDependencyHealth(): Promise<IAdminDependencyHealth> {
    try {
      const [blockStoreHealth, messageServiceHealth, webSocketServerHealth] =
        await Promise.all([
          this.checkDependencyHealth('blockStore', async () => {
            try {
              const blockStore = this.application.services.get('blockStore');
              return blockStore !== undefined;
            } catch {
              return false;
            }
          }),
          this.checkDependencyHealth('messageService', async () => {
            try {
              const messageService =
                this.application.services.get('messageService');
              return messageService !== undefined;
            } catch {
              return false;
            }
          }),
          this.checkDependencyHealth('webSocketServer', async () => {
            try {
              const wsServer = this.application.services.get('webSocketServer');
              return wsServer !== undefined;
            } catch {
              return false;
            }
          }),
        ]);

      return {
        blockStore: blockStoreHealth,
        messageService: messageServiceHealth,
        webSocketServer: webSocketServerHealth,
      };
    } catch {
      return {
        blockStore: {
          name: 'blockStore',
          status: HealthStatus.UNHEALTHY,
          message: 'Health check failed',
        },
        messageService: {
          name: 'messageService',
          status: HealthStatus.UNHEALTHY,
          message: 'Health check failed',
        },
        webSocketServer: {
          name: 'webSocketServer',
          status: HealthStatus.UNHEALTHY,
          message: 'Health check failed',
        },
      };
    }
  }

  /**
   * Gather block store summary statistics (Req 13.6).
   */
  private async gatherBlockStoreStats(): Promise<IAdminBlockStoreStats> {
    try {
      const blockStore = this.application.services.get('blockStore');
      if (!blockStore) {
        return { totalBlocks: 0, totalSizeBytes: 0, countByDurability: {} };
      }

      // Try getMetadataStore().values() for MemoryBlockStore
      const store = blockStore as {
        getMetadataStore?: () => {
          size?: () => number;
          values?: () => IterableIterator<{
            size: number;
            durabilityLevel: string;
          }>;
        };
      };

      if (typeof store.getMetadataStore === 'function') {
        const ms = store.getMetadataStore();
        if (typeof ms?.values === 'function') {
          let totalBlocks = 0;
          let totalSizeBytes = 0;
          const countByDurability: Record<string, number> = {};
          for (const meta of ms.values()) {
            totalBlocks++;
            totalSizeBytes += meta.size ?? 0;
            const level = meta.durabilityLevel ?? 'unknown';
            countByDurability[level] = (countByDurability[level] ?? 0) + 1;
          }
          return { totalBlocks, totalSizeBytes, countByDurability };
        }
        if (typeof ms?.size === 'function') {
          return {
            totalBlocks: ms.size(),
            totalSizeBytes: 0,
            countByDurability: {},
          };
        }
      }

      return { totalBlocks: 0, totalSizeBytes: 0, countByDurability: {} };
    } catch {
      return { totalBlocks: 0, totalSizeBytes: 0, countByDurability: {} };
    }
  }

  /**
   * Gather BrightHub summary statistics (Req 14.1).
   */
  private async gatherHubStats(): Promise<IAdminHubStats> {
    try {
      const postService = this.application.services.get('postService') as
        | {
            getStats?: () => Promise<{
              totalPosts: number;
              activeUsersLast30Days: number;
            }>;
          }
        | undefined;

      if (postService?.getStats) {
        return await postService.getStats();
      }

      return { totalPosts: 0, activeUsersLast30Days: 0 };
    } catch {
      return { totalPosts: 0, activeUsersLast30Days: 0 };
    }
  }

  /**
   * Gather BrightChat summary statistics (Req 15.1).
   */
  private async gatherChatStats(): Promise<IAdminChatStats> {
    try {
      const conversationService = this.application.services.get(
        'conversationService',
      ) as
        | {
            getStats?: () => Promise<{
              totalConversations: number;
              totalMessages: number;
            }>;
          }
        | undefined;

      if (conversationService?.getStats) {
        return await conversationService.getStats();
      }

      return { totalConversations: 0, totalMessages: 0 };
    } catch {
      return { totalConversations: 0, totalMessages: 0 };
    }
  }

  /**
   * Gather BrightPass summary statistics (Req 16.1).
   */
  private async gatherPassStats(): Promise<IAdminPassStats> {
    try {
      const passService = this.application.services.get('passService') as
        | {
            getStats?: () => Promise<{
              totalVaults: number;
              sharedVaults: number;
            }>;
          }
        | undefined;

      if (passService?.getStats) {
        return await passService.getStats();
      }

      return { totalVaults: 0, sharedVaults: 0 };
    } catch {
      return { totalVaults: 0, sharedVaults: 0 };
    }
  }

  /**
   * Gather BrightMail summary statistics (Req 17.1).
   */
  private async gatherMailStats(): Promise<IAdminMailStats> {
    try {
      const mailService = this.application.services.get(
        'messagePassingService',
      ) as
        | {
            getEmailStats?: () => Promise<{
              totalEmails: number;
              deliveryFailures: number;
              emailsLast24Hours: number;
            }>;
          }
        | undefined;

      if (mailService?.getEmailStats) {
        return await mailService.getEmailStats();
      }

      return { totalEmails: 0, deliveryFailures: 0, emailsLast24Hours: 0 };
    } catch {
      return { totalEmails: 0, deliveryFailures: 0, emailsLast24Hours: 0 };
    }
  }
}
