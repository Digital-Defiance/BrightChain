import type { IPoolInfo } from './poolInfo';

/**
 * Aggregated pool discovery results from querying connected peers.
 *
 * @see Requirements 7.1, 7.4, 10.1
 */
export interface IPoolDiscoveryResult<TID = string> {
  pools: IPoolInfo<TID>[];
  queriedPeers: TID[];
  unreachablePeers: TID[];
  timestamp: string; // ISO 8601
}
