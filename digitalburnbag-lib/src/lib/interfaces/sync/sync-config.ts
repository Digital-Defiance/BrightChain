import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Configuration for the sync client.
 */
export interface ISyncConfig<TID extends PlatformID> {
  /** User ID of the sync client owner */
  userId: TID;
  /** API base URL for the BrightChain backend */
  apiBaseUrl: string;
  /** Local root directory for the virtual drive mount */
  mountPath: string;
  /** Folder IDs to sync locally (empty = sync all) */
  selectiveSyncFolderIds: TID[];
  /** Polling interval in ms for remote changes (fallback when WebSocket unavailable) */
  pollIntervalMs: number;
  /** Maximum local cache size in bytes */
  maxCacheSizeBytes: number;
  /** Whether to encrypt local cached files at rest */
  encryptLocalCache: boolean;
  /** Whether offline mode queuing is enabled */
  offlineModeEnabled: boolean;
  /** Maximum number of concurrent sync operations */
  maxConcurrentSyncs: number;
}
