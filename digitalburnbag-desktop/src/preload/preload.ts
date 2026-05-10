import { contextBridge, ipcRenderer } from 'electron';
import type {
  IAuthState,
  IDesktopSettings,
  ILoginRequest,
  IResolveConflictRequest,
  ISyncOverview,
  ISyncStatusEvent,
} from '../lib/ipc-channels';
import { IpcChannels } from '../lib/ipc-channels';

/**
 * Preload script — runs in a sandboxed context with access to Node.js APIs.
 * Exposes a typed API to the renderer via contextBridge.
 */
const api = {
  // Auth
  login: (request: ILoginRequest): Promise<IAuthState> =>
    ipcRenderer.invoke(IpcChannels.LOGIN, request),
  logout: (): Promise<void> => ipcRenderer.invoke(IpcChannels.LOGOUT),
  getAuthState: (): Promise<IAuthState> =>
    ipcRenderer.invoke(IpcChannels.GET_AUTH_STATE),

  // Sync control
  startSync: (): Promise<void> => ipcRenderer.invoke(IpcChannels.START_SYNC),
  stopSync: (): Promise<void> => ipcRenderer.invoke(IpcChannels.STOP_SYNC),
  getSyncState: (): Promise<ISyncOverview> =>
    ipcRenderer.invoke(IpcChannels.GET_SYNC_STATE),
  setOnline: (online: boolean): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.SET_ONLINE, online),

  // Selective sync
  getSelectiveSync: (): Promise<string[]> =>
    ipcRenderer.invoke(IpcChannels.GET_SELECTIVE_SYNC),
  setSelectiveSync: (folderIds: string[]): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.SET_SELECTIVE_SYNC, folderIds),

  // Conflicts
  getConflicts: (): Promise<unknown[]> =>
    ipcRenderer.invoke(IpcChannels.GET_CONFLICTS),
  resolveConflict: (req: IResolveConflictRequest): Promise<void> =>
    ipcRenderer.invoke(IpcChannels.RESOLVE_CONFLICT, req),

  // Settings
  getSettings: (): Promise<IDesktopSettings> =>
    ipcRenderer.invoke(IpcChannels.GET_SETTINGS),
  updateSettings: (
    updated: Partial<IDesktopSettings>,
  ): Promise<IDesktopSettings> =>
    ipcRenderer.invoke(IpcChannels.UPDATE_SETTINGS, updated),

  // Events from main process
  onSyncStatusChanged: (callback: (event: ISyncStatusEvent) => void): void => {
    ipcRenderer.on(IpcChannels.SYNC_STATUS_CHANGED, (_event, data) =>
      callback(data),
    );
  },
  onSyncError: (callback: (error: string) => void): void => {
    ipcRenderer.on(IpcChannels.SYNC_ERROR, (_event, data) => callback(data));
  },
  onConnectionStateChanged: (callback: (online: boolean) => void): void => {
    ipcRenderer.on(IpcChannels.CONNECTION_STATE_CHANGED, (_event, data) =>
      callback(data),
    );
  },

  // App control
  quit: (): void => {
    ipcRenderer.send(IpcChannels.QUIT);
  },
};

export type BurnbagDesktopApi = typeof api;

contextBridge.exposeInMainWorld('burnbag', api);
