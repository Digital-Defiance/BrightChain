import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  HeartbeatSignalType,
  IHeartbeatCheckResult,
} from './canary-provider-adapter';

/**
 * A single audit record for a heartbeat check.
 * Stored in the status_history BrightDB collection.
 */
export interface IStatusHistoryEntry<TID extends PlatformID = string> {
  /** Unique identifier for this history entry */
  id: TID;
  /** The provider connection this check belongs to */
  connectionId: TID;
  /** The user who owns the connection */
  userId: TID;
  /** When the heartbeat check was executed */
  timestamp: Date;
  /** The signal type detected by this check */
  signalType: HeartbeatSignalType;
  /** Number of events found in the query window */
  eventCount: number;
  /** Confidence score (0–1) for the signal determination */
  confidence: number;
  /** Time since last detected activity in milliseconds, null if never recorded */
  timeSinceLastActivityMs: number | null;
  /** HTTP status code returned by the provider API, if applicable */
  httpStatusCode?: number;
  /** Error message if the check failed */
  errorMessage?: string;
  /** Raw check result for debugging */
  rawResult?: Partial<IHeartbeatCheckResult<TID>>;
  /** When this record was persisted */
  createdAt: Date;
}
