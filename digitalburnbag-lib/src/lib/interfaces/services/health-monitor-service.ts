import { PlatformID } from '@digitaldefiance/ecies-lib';
import type {
  HeartbeatSignalType,
  IHeartbeatCheckResult,
} from '../canary-provider/canary-provider-adapter';
import type { IStatusHistoryEntry } from '../canary-provider/status-history-entry';

/**
 * Options for querying status history entries.
 */
export interface IStatusHistoryQueryOptions {
  /** Filter by signal types */
  signalTypes?: HeartbeatSignalType[];
  /** Return entries after this date */
  since?: Date;
  /** Return entries before this date */
  until?: Date;
  /** Maximum number of entries to return */
  limit?: number;
}

/**
 * Service interface for orchestrating scheduled heartbeat checks,
 * token refresh, failure policy evaluation, and status history persistence.
 */
export interface IHealthMonitorService<TID extends PlatformID = string> {
  /** Start monitoring a connection at its configured interval */
  startMonitoring(connectionId: TID): Promise<void>;

  /** Stop monitoring a connection */
  stopMonitoring(connectionId: TID): Promise<void>;

  /** Execute a single heartbeat check for a connection */
  executeCheck(connectionId: TID): Promise<IHeartbeatCheckResult<TID>>;

  /** Refresh OAuth2 tokens if within 10 minutes of expiry */
  refreshTokensIfNeeded(connectionId: TID): Promise<boolean>;

  /** Get status history for a connection with optional filters */
  getStatusHistory(
    connectionId: TID,
    options?: IStatusHistoryQueryOptions,
  ): Promise<IStatusHistoryEntry<TID>[]>;
}
