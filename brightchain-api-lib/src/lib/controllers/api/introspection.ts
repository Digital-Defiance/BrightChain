/**
 * @fileoverview Introspection Controller
 *
 * @see Requirements 1.1-1.5, 2.1-2.4, 3.1, 3.3, 4.1-4.3, 4.5,
 *      5.1, 6.1, 6.3, 7.1, 11.1, 11.2, 11.5
 */
import {
  Checksum,
  EnergyAccountStore,
  hasPermission,
  IBlockStoreStats,
  IEnergyAccountStatus,
  INetworkTopology,
  INodeStatus,
  IPeerInfo,
  IPoolACL,
  IPoolDetail,
  IPoolDiscoveryResult,
  IPoolInfo,
  NetworkTopologyDef,
  NodeStatusDef,
  PeerInfoDef,
  PoolPermission,
} from '@brightchain/brightchain-lib';
import { MemberType } from '@digitaldefiance/ecies-lib';
import { CoreLanguageCode } from '@digitaldefiance/i18n-lib';
import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import {
  ApiErrorResponse,
  ApiRequestHandler,
  IStatusCodeResponse,
  routeConfig,
  TypedHandlers,
} from '@digitaldefiance/node-express-suite';
import { AvailabilityService } from '../../availability/availabilityService';
import { HeartbeatMonitor } from '../../availability/heartbeatMonitor';
import { PoolDiscoveryService } from '../../availability/poolDiscoveryService';
import { IBrightChainApplication } from '../../interfaces/application';
import {
  IBlockStoreStatsApiResponse,
  IEnergyAccountApiResponse,
  INodeStatusApiResponse,
  IPeerListApiResponse,
  IPoolDetailApiResponse,
  IPoolDiscoveryApiResponse,
  IPoolListApiResponse,
} from '../../interfaces/introspectionApiResponses';
import {
  IMemberContext,
  requireMemberTypes,
} from '../../middlewares/authentication';
import { WebSocketMessageServer } from '../../services/webSocketMessageServer';
import { DefaultBackendIdType } from '../../shared-types';
import {
  forbiddenError,
  handleError,
  notFoundError,
  unauthorizedError,
} from '../../utils/errorResponse';
import { BaseController } from '../base';

type IntrospectionApiResponse =
  | INodeStatusApiResponse
  | IPeerListApiResponse
  | IPoolListApiResponse
  | IPoolDetailApiResponse
  | IBlockStoreStatsApiResponse
  | IEnergyAccountApiResponse
  | IPoolDiscoveryApiResponse
  | ApiErrorResponse;

interface IntrospectionHandlers extends TypedHandlers {
  getStatus: ApiRequestHandler<INodeStatusApiResponse | ApiErrorResponse>;
  listPeers: ApiRequestHandler<IPeerListApiResponse | ApiErrorResponse>;
  listPools: ApiRequestHandler<IPoolListApiResponse | ApiErrorResponse>;
  getPoolDetails: ApiRequestHandler<IPoolDetailApiResponse | ApiErrorResponse>;
  getBlockStoreStats: ApiRequestHandler<
    IBlockStoreStatsApiResponse | ApiErrorResponse
  >;
  getEnergy: ApiRequestHandler<IEnergyAccountApiResponse | ApiErrorResponse>;
  getMemberEnergy: ApiRequestHandler<
    IEnergyAccountApiResponse | ApiErrorResponse
  >;
  discoverPools: ApiRequestHandler<
    IPoolDiscoveryApiResponse | ApiErrorResponse
  >;
}

type HandlerRequest = Parameters<ApiRequestHandler<ApiErrorResponse>>[0];

function extractMemberContext(req: HandlerRequest): IMemberContext | undefined {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  return (req as Record<string, any>)['memberContext'] as
    | IMemberContext
    | undefined;
}

function extractParam(req: HandlerRequest, name: string): string | undefined {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const params = (req as Record<string, any>)['params'] as
    | Record<string, string>
    | undefined;
  return params?.[name];
}

export interface IntrospectionControllerConfig {
  availabilityService: AvailabilityService;
  heartbeatMonitor: HeartbeatMonitor;
  webSocketMessageServer: WebSocketMessageServer;
  poolDiscoveryService: PoolDiscoveryService;
  poolAclLookup: (poolId: string) => IPoolACL<string> | undefined;
  localPoolIds: () => string[];
  poolMetadataLookup: (poolId: string) => IPoolInfo<string> | undefined;
  poolDetailLookup: (poolId: string) => IPoolDetail<string> | undefined;
  version: string;
  capabilities: string[];
}

export class IntrospectionController<
  TID extends PlatformID = DefaultBackendIdType,
> extends BaseController<
  TID,
  IntrospectionApiResponse,
  IntrospectionHandlers,
  CoreLanguageCode
> {
  private config: IntrospectionControllerConfig;
  private readonly startTime: Date;

  constructor(
    application: IBrightChainApplication<TID>,
    config: IntrospectionControllerConfig,
  ) {
    super(application);
    this.config = config;
    this.startTime = new Date();
  }

  setConfig(config: IntrospectionControllerConfig): void {
    this.config = config;
  }

  getConfig(): IntrospectionControllerConfig {
    return this.config;
  }

  protected initRouteDefinitions(): void {
    const adminMiddleware = [
      requireMemberTypes(MemberType.Admin, MemberType.System),
    ];

    this.routeDefinitions = [
      routeConfig('get', '/status', {
        handlerKey: 'getStatus',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/pools', {
        handlerKey: 'listPools',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/pools/:poolId', {
        handlerKey: 'getPoolDetails',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      routeConfig('get', '/energy', {
        handlerKey: 'getEnergy',
        useAuthentication: true,
        useCryptoAuthentication: false,
      }),
      {
        method: 'get' as const,
        path: '/peers',
        handlerKey: 'listPeers' as keyof IntrospectionHandlers,
        useAuthentication: true,
        useCryptoAuthentication: false,
        middleware: adminMiddleware,
      },
      {
        method: 'get' as const,
        path: '/stats',
        handlerKey: 'getBlockStoreStats' as keyof IntrospectionHandlers,
        useAuthentication: true,
        useCryptoAuthentication: false,
        middleware: adminMiddleware,
      },
      {
        method: 'get' as const,
        path: '/energy/:memberId',
        handlerKey: 'getMemberEnergy' as keyof IntrospectionHandlers,
        useAuthentication: true,
        useCryptoAuthentication: false,
        middleware: adminMiddleware,
      },
      {
        method: 'post' as const,
        path: '/discover-pools',
        handlerKey: 'discoverPools' as keyof IntrospectionHandlers,
        useAuthentication: true,
        useCryptoAuthentication: false,
        middleware: adminMiddleware,
      },
    ];

    this.handlers = {
      getStatus: this.handleGetStatus.bind(this),
      listPeers: this.handleListPeers.bind(this),
      listPools: this.handleListPools.bind(this),
      getPoolDetails: this.handleGetPoolDetails.bind(this),
      getBlockStoreStats: this.handleGetBlockStoreStats.bind(this),
      getEnergy: this.handleGetEnergy.bind(this),
      getMemberEnergy: this.handleGetMemberEnergy.bind(this),
      discoverPools: this.handleDiscoverPools.bind(this),
    };
  }

  private isAdmin(memberContext: IMemberContext): boolean {
    return (
      memberContext.type === MemberType.Admin ||
      memberContext.type === MemberType.System
    );
  }

  private async handleGetStatus(
    req: HandlerRequest,
  ): Promise<IStatusCodeResponse<INodeStatusApiResponse | ApiErrorResponse>> {
    const memberContext = extractMemberContext(req);
    if (!memberContext) return unauthorizedError();
    try {
      const { availabilityService, version, capabilities } = this.config;
      const uptimeSeconds = Math.floor(
        (Date.now() - this.startTime.getTime()) / 1000,
      );
      const partitionMode = availabilityService.isInPartitionMode();
      const statusData: INodeStatus<string> = {
        nodeId: availabilityService.getLocalNodeId(),
        healthy: true,
        uptime: uptimeSeconds,
        version,
        capabilities,
        partitionMode,
      };
      if (partitionMode && this.isAdmin(memberContext)) {
        statusData.disconnectedPeers =
          availabilityService.getDisconnectedPeers();
      }
      const status = NodeStatusDef.create(
        statusData as INodeStatus<string> & Record<string, unknown>,
      );
      return {
        statusCode: 200,
        response: {
          message: 'Node status retrieved',
          data: status,
        } as INodeStatusApiResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private async handleListPeers(
    req: HandlerRequest,
  ): Promise<IStatusCodeResponse<IPeerListApiResponse | ApiErrorResponse>> {
    const memberContext = extractMemberContext(req);
    if (!memberContext) return unauthorizedError();
    try {
      const { webSocketMessageServer, heartbeatMonitor, availabilityService } =
        this.config;
      const connectedNodeIds = webSocketMessageServer.getConnectedNodes();
      const peers = connectedNodeIds.map((nodeId) => {
        const reachable = heartbeatMonitor.isPeerReachable(nodeId);
        const latencyMs = heartbeatMonitor.getLastLatency(nodeId);
        const peerData: IPeerInfo<string> & Record<string, unknown> = {
          nodeId,
          connected: reachable,
          lastSeen: new Date().toISOString(),
        };
        if (latencyMs !== undefined) {
          peerData['latencyMs'] = latencyMs;
        }
        return PeerInfoDef.create(peerData);
      });
      const topologyData: INetworkTopology<string> & Record<string, unknown> = {
        localNodeId: availabilityService.getLocalNodeId(),
        peers,
        totalConnected: peers.filter((p) => p['connected']).length,
      };
      const topology = NetworkTopologyDef.create(topologyData);
      return {
        statusCode: 200,
        response: {
          message: 'Peer list retrieved',
          data: topology,
        } as IPeerListApiResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private async handleListPools(
    req: HandlerRequest,
  ): Promise<IStatusCodeResponse<IPoolListApiResponse | ApiErrorResponse>> {
    const memberContext = extractMemberContext(req);
    if (!memberContext) return unauthorizedError();
    try {
      const { localPoolIds, poolMetadataLookup, poolAclLookup } = this.config;
      const allPoolIds = localPoolIds();
      const admin = this.isAdmin(memberContext);
      const pools: IPoolInfo<string>[] = [];
      for (const poolId of allPoolIds) {
        if (!admin) {
          const acl = poolAclLookup(poolId);
          if (
            !acl ||
            !hasPermission(acl, memberContext.memberId, PoolPermission.Read)
          ) {
            continue;
          }
        }
        const meta = poolMetadataLookup(poolId);
        if (meta) pools.push(meta);
      }
      return {
        statusCode: 200,
        response: {
          message: 'Pool list retrieved',
          data: pools,
        } as IPoolListApiResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private async handleGetPoolDetails(
    req: HandlerRequest,
  ): Promise<IStatusCodeResponse<IPoolDetailApiResponse | ApiErrorResponse>> {
    const memberContext = extractMemberContext(req);
    if (!memberContext) return unauthorizedError();
    try {
      const poolId = extractParam(req, 'poolId');
      if (!poolId) {
        return {
          statusCode: 400,
          response: {
            message: 'Missing required parameter: poolId',
            error: 'Missing required parameter: poolId',
          } as ApiErrorResponse,
        };
      }
      const { poolAclLookup, poolDetailLookup } = this.config;
      if (!this.isAdmin(memberContext)) {
        const acl = poolAclLookup(poolId);
        if (
          !acl ||
          !hasPermission(acl, memberContext.memberId, PoolPermission.Read)
        ) {
          return forbiddenError('You do not have Read permission on this pool');
        }
      }
      const detail = poolDetailLookup(poolId);
      if (!detail) return notFoundError('Pool', poolId);
      return {
        statusCode: 200,
        response: {
          message: 'Pool details retrieved',
          data: detail,
        } as IPoolDetailApiResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private async handleGetBlockStoreStats(
    req: HandlerRequest,
  ): Promise<
    IStatusCodeResponse<IBlockStoreStatsApiResponse | ApiErrorResponse>
  > {
    const memberContext = extractMemberContext(req);
    if (!memberContext) return unauthorizedError();
    try {
      const { availabilityService } = this.config;
      const rawStats = await availabilityService.getStatistics();
      const stats: IBlockStoreStats = {
        totalCapacity: 0,
        currentUsage: 0,
        availableSpace: 0,
        blockCounts: {
          local: rawStats.localCount,
          remote: rawStats.remoteCount,
          cached: rawStats.cachedCount,
          orphaned: rawStats.orphanedCount,
          unknown: rawStats.unknownCount,
        },
        totalBlocks:
          rawStats.localCount +
          rawStats.remoteCount +
          rawStats.cachedCount +
          rawStats.orphanedCount +
          rawStats.unknownCount,
      };
      return {
        statusCode: 200,
        response: {
          message: 'Block store statistics retrieved',
          data: stats,
        } as IBlockStoreStatsApiResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private async handleGetEnergy(
    req: HandlerRequest,
  ): Promise<
    IStatusCodeResponse<IEnergyAccountApiResponse | ApiErrorResponse>
  > {
    const memberContext = extractMemberContext(req);
    if (!memberContext) return unauthorizedError();
    try {
      const energyStore =
        this.application.services.get<EnergyAccountStore>('energyStore');
      const memberChecksum = Checksum.fromHex(memberContext.memberId);
      const account = await energyStore.getOrCreate(memberChecksum);
      const status: IEnergyAccountStatus<string> = {
        memberId: memberContext.memberId,
        balance: account.balance,
        availableBalance: account.availableBalance,
        earned: account.earned,
        spent: account.spent,
        reserved: account.reserved,
      };
      return {
        statusCode: 200,
        response: {
          message: 'Energy account retrieved',
          data: status,
        } as IEnergyAccountApiResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private async handleGetMemberEnergy(
    req: HandlerRequest,
  ): Promise<
    IStatusCodeResponse<IEnergyAccountApiResponse | ApiErrorResponse>
  > {
    const memberContext = extractMemberContext(req);
    if (!memberContext) return unauthorizedError();
    try {
      const memberId = extractParam(req, 'memberId');
      if (!memberId) {
        return {
          statusCode: 400,
          response: {
            message: 'Missing required parameter: memberId',
            error: 'Missing required parameter: memberId',
          } as ApiErrorResponse,
        };
      }
      const energyStore =
        this.application.services.get<EnergyAccountStore>('energyStore');
      const memberChecksum = Checksum.fromHex(memberId);
      const account = await energyStore.getOrCreate(memberChecksum);
      const status: IEnergyAccountStatus<string> = {
        memberId,
        balance: account.balance,
        availableBalance: account.availableBalance,
        earned: account.earned,
        spent: account.spent,
        reserved: account.reserved,
      };
      return {
        statusCode: 200,
        response: {
          message: 'Energy account retrieved',
          data: status,
        } as IEnergyAccountApiResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }

  private async handleDiscoverPools(
    req: HandlerRequest,
  ): Promise<
    IStatusCodeResponse<IPoolDiscoveryApiResponse | ApiErrorResponse>
  > {
    const memberContext = extractMemberContext(req);
    if (!memberContext) return unauthorizedError();
    try {
      const { poolDiscoveryService } = this.config;
      const result: IPoolDiscoveryResult<string> =
        await poolDiscoveryService.discoverPools(memberContext);
      return {
        statusCode: 200,
        response: {
          message: 'Pool discovery completed',
          data: result,
        } as IPoolDiscoveryApiResponse,
      };
    } catch (error) {
      return handleError(error);
    }
  }
}
