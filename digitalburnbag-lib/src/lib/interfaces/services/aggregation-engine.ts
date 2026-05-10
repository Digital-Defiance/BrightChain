import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IHeartbeatCheckResult } from '../canary-provider/canary-provider-adapter';
import type {
  IAggregatedHeartbeatStatus,
  IAggregationConfig,
} from '../canary-provider/canary-provider-registry';

/**
 * Service interface for computing aggregate heartbeat status across
 * multiple providers for a user using the configured aggregation strategy.
 */
export interface IAggregationEngine<TID extends PlatformID = string> {
  /** Compute aggregate status from individual provider results */
  aggregate(
    results: Map<TID, IHeartbeatCheckResult<TID>>,
    config: IAggregationConfig,
  ): IAggregatedHeartbeatStatus<TID>;
}
