import type {
  ConflictResolution,
  SyncStatus,
} from '@brightchain/digitalburnbag-lib';

/**
 * IPC channel names for communication between main and renderer processes.
 */
export const IpcChannels = {
  // Auth
  LOGIN: 'burnbag:login',
  LOGOUT: 'burnbag:logout',
  GET_AUTH_STATE: 'burnbag:get-auth-state',

  // Sync control
  START_SYNC: 'burnbag:start-sync',
  STOP_SYNC: 'burnbag:stop-sync',
  GET_SYNC_STATE: 'burnbag:get-sync-state',
  SET_ONLINE: 'burnbag:set-online',

  // Selective sync
  GET_SELECTIVE_SYNC: 'burnbag:get-selective-sync',
  SET_SELECTIVE_SYNC: 'burnbag:set-selective-sync',

  // Conflicts
  GET_CONFLICTS: 'burnbag:get-conflicts',
  RESOLVE_CONFLICT: 'burnbag:resolve-conflict',

  // Status events (main -> renderer)
  SYNC_STATUS_CHANGED: 'burnbag:sync-status-changed',
  SYNC_ERROR: 'burnbag:sync-error',
  CONNECTION_STATE_CHANGED: 'burnbag:connection-state-changed',

  // Settings
  GET_SETTINGS: 'burnbag:get-settings',
  UPDATE_SETTINGS: 'burnbag:update-settings',

  // Tray
  SHOW_WINDOW: 'burnbag:show-window',
  QUIT: 'burnbag:quit',
} as const;

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels];

/** Auth state exposed to the renderer. */
export interface IAuthState {
  loggedIn: boolean;
  userId?: string;
  apiBaseUrl?: string;
  displayName?: string;
}

/** Login request payload. */
export interface ILoginRequest {
  apiBaseUrl: string;
  email: string;
  password: string;
}

/** Overall sync state exposed to the renderer. */
export interface ISyncOverview {
  running: boolean;
  online: boolean;
  mountPath: string;
  activeSyncCount: number;
  conflictCount: number;
  queuedCount: number;
}

/** Sync status change event payload. */
export interface ISyncStatusEvent {
  itemId: string;
  status: SyncStatus;
  fileName?: string;
}

/** Conflict resolution request. */
export interface IResolveConflictRequest {
  fileId: string;
  resolution: ConflictResolution;
}

/** Desktop app settings persisted to disk. */
export interface IDesktopSettings {
  apiBaseUrl: string;
  mountPath: string;
  autoStart: boolean;
  startMinimized: boolean;
  encryptLocalCache: boolean;
  maxCacheSizeBytes: number;
  pollIntervalMs: number;
  maxConcurrentSyncs: number;
}

export const DEFAULT_SETTINGS: IDesktopSettings = {
  apiBaseUrl: 'https://api.brightchain.org',
  mountPath: '', // Set at runtime based on OS
  autoStart: true,
  startMinimized: false,
  encryptLocalCache: true,
  maxCacheSizeBytes: 10 * 1024 * 1024 * 1024, // 10 GB
  pollIntervalMs: 30_000,
  maxConcurrentSyncs: 4,
};
