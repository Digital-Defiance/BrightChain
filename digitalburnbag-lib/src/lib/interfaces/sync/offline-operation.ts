import { PlatformID } from '@digitaldefiance/ecies-lib';
import { OfflineOperationType } from '../../enumerations/sync-status';

/**
 * A queued operation to be replayed when the network becomes available.
 */
export interface IOfflineOperation<TID extends PlatformID> {
  /** Unique operation ID */
  operationId: TID;
  /** Type of operation */
  operationType: OfflineOperationType;
  /** Target file or folder ID */
  targetId: TID;
  /** Local path of the affected item */
  localPath: string;
  /** Serialized operation payload (operation-specific data) */
  payload: string;
  /** Timestamp when the operation was queued */
  queuedAt: Date | string;
  /** Number of retry attempts so far */
  retryCount: number;
  /** Last error message if a retry failed */
  lastError?: string;
}
