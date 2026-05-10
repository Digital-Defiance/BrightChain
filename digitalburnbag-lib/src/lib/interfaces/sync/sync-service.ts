import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ConflictResolution, SyncStatus } from '../../enumerations/sync-status';
import { IConflictInfo } from './conflict-info';
import { ISyncConfig } from './sync-config';
import { ISyncState } from './sync-state';

/**
 * Core sync service interface — platform-agnostic sync engine.
 *
 * Validates: Requirements 45.1–45.9
 */
export interface ISyncService<TID extends PlatformID> {
  /** Initialize the sync engine with configuration */
  initialize(config: ISyncConfig<TID>): Promise<void>;

  /** Start syncing (mount drive, start watcher, connect to server) */
  start(): Promise<void>;

  /** Stop syncing (unmount drive, stop watcher, disconnect) */
  stop(): Promise<void>;

  /** Pull remote changes from the server */
  pullRemoteChanges(): Promise<void>;

  /** Push local changes to the server */
  pushLocalChanges(): Promise<void>;

  /** Configure selective sync — choose which folders sync locally */
  setSelectiveSync(folderIds: TID[]): Promise<void>;

  /** Get the current selective sync folder list */
  getSelectiveSync(): TID[];

  /** Get sync status for a specific file or folder */
  getSyncStatus(itemId: TID): Promise<ISyncState<TID>>;

  /** Get all items currently syncing or in error state */
  getActiveSyncItems(): Promise<ISyncState<TID>[]>;

  /** Resolve a conflict for a specific file */
  resolveConflict(fileId: TID, resolution: ConflictResolution): Promise<void>;

  /** Get all current conflicts */
  getConflicts(): Promise<IConflictInfo<TID>[]>;

  /** Force re-sync of a specific item */
  forceSync(itemId: TID): Promise<void>;

  /** Register a callback for sync status changes */
  onStatusChange(handler: (itemId: TID, status: SyncStatus) => void): void;

  /** Check if the sync engine is currently running */
  isRunning(): boolean;

  /** Check if the client is currently online */
  isOnline(): boolean;
}
