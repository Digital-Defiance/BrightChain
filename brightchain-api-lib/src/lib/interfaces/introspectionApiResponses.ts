import {
  IBlockStoreStats,
  IEnergyAccountStatus,
  INetworkTopology,
  INodeStatus,
  IPoolDetail,
  IPoolDiscoveryResult,
  IPoolInfo,
} from '@brightchain/brightchain-lib';
import { IApiMessageResponse } from '@digitaldefiance/node-express-suite';

/**
 * API response for node status and health introspection.
 * Wraps the shared INodeStatus DTO with the standard API message envelope.
 *
 * @see Requirements 2.1, 10.2
 */
export interface INodeStatusApiResponse extends IApiMessageResponse {
  data: INodeStatus<string>;
}

/**
 * API response for connected peers listing.
 * Wraps the shared INetworkTopology DTO with the standard API message envelope.
 *
 * @see Requirements 3.1, 10.2
 */
export interface IPeerListApiResponse extends IApiMessageResponse {
  data: INetworkTopology<string>;
}

/**
 * API response for local pool listing.
 * Wraps an array of shared IPoolInfo DTOs with the standard API message envelope.
 *
 * @see Requirements 4.1, 10.2
 */
export interface IPoolListApiResponse extends IApiMessageResponse {
  data: IPoolInfo<string>[];
}

/**
 * API response for pool detail retrieval.
 * Wraps the shared IPoolDetail DTO with the standard API message envelope.
 *
 * @see Requirements 4.2, 10.2
 */
export interface IPoolDetailApiResponse extends IApiMessageResponse {
  data: IPoolDetail<string>;
}

/**
 * API response for pool discovery across connected nodes.
 * Wraps the shared IPoolDiscoveryResult DTO with the standard API message envelope.
 *
 * @see Requirements 7.1, 10.2
 */
export interface IPoolDiscoveryApiResponse extends IApiMessageResponse {
  data: IPoolDiscoveryResult<string>;
}

/**
 * API response for block store statistics.
 * Wraps the shared IBlockStoreStats DTO with the standard API message envelope.
 *
 * @see Requirements 5.1, 10.2
 */
export interface IBlockStoreStatsApiResponse extends IApiMessageResponse {
  data: IBlockStoreStats;
}

/**
 * API response for energy account status.
 * Wraps the shared IEnergyAccountStatus DTO with the standard API message envelope.
 *
 * @see Requirements 6.1, 10.2
 */
export interface IEnergyAccountApiResponse extends IApiMessageResponse {
  data: IEnergyAccountStatus<string>;
}
