import { PlatformID } from '@digitaldefiance/ecies-lib';
import { SyncStatus } from '../../enumerations/sync-status';

/**
 * Represents the sync state of a single file or folder.
 */
export interface ISyncState<TID extends PlatformID> {
  /** The file or folder ID */
  itemId: TID;
  /** Current sync status */
  status: SyncStatus;
  /** Progress percentage (0-100) when syncing */
  progress?: number;
  /** Bytes transferred so far */
  bytesTransferred?: number;
  /** Total bytes to transfer */
  bytesTotal?: number;
  /** Error message if status is Error */
  errorMessage?: string;
  /** Timestamp of last successful sync */
  lastSyncedAt?: Date | string;
  /** Server version hash for conflict detection */
  remoteVersionHash?: string;
  /** Local version hash for conflict detection */
  localVersionHash?: string;
}
