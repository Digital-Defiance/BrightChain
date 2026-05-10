import type {
  ConflictResolution,
  IConflictInfo,
  SyncStatus,
} from '@brightchain/digitalburnbag-lib';
import type { ISyncClient } from '@brightchain/digitalburnbag-sync-client';
import axios from 'axios';
import type {
  IAuthState,
  IDesktopSettings,
  ILoginRequest,
  ISyncOverview,
} from '../lib/ipc-channels';

/**
 * Manages the sync client lifecycle within the Electron main process.
 *
 * Handles:
 * - Authentication (login/logout, token storage)
 * - Creating and destroying the sync client
 * - Forwarding status events to the renderer via callbacks
 * - Exposing sync state for the tray menu and settings UI
 */
export class SyncManager {
  private settings: IDesktopSettings;
  private syncClient: ISyncClient | null = null;
  private authToken: string | null = null;
  private userId: string | null = null;
  private displayName: string | null = null;
  private statusHandlers: Array<(itemId: string, status: SyncStatus) => void> =
    [];

  constructor(settings: IDesktopSettings) {
    this.settings = { ...settings };
  }

  /** Authenticate with the BrightChain backend. */
  async login(request: ILoginRequest): Promise<IAuthState> {
    const response = await axios.post<{
      token: string;
      userId: string;
      displayName?: string;
    }>(`${request.apiBaseUrl}/api/user/login`, {
      email: request.email,
      password: request.password,
    });

    this.authToken = response.data.token;
    this.userId = response.data.userId;
    this.displayName = response.data.displayName ?? request.email;
    this.settings.apiBaseUrl = request.apiBaseUrl;

    return this.getAuthState();
  }

  /** Clear auth state and stop sync. */
  async logout(): Promise<void> {
    await this.stop();
    this.authToken = null;
    this.userId = null;
    this.displayName = null;
  }

  getAuthState(): IAuthState {
    return {
      loggedIn: this.authToken !== null,
      userId: this.userId ?? undefined,
      apiBaseUrl: this.settings.apiBaseUrl,
      displayName: this.displayName ?? undefined,
    };
  }

  /** Start the sync client. */
  async start(): Promise<void> {
    if (this.syncClient) return; // already running
    if (!this.authToken || !this.userId) {
      throw new Error('Not authenticated — call login() first');
    }

    this.syncClient = (await (
      await import('@brightchain/digitalburnbag-sync-client')
    ).createSyncClient({
      config: {
        userId: this.userId,
        apiBaseUrl: this.settings.apiBaseUrl,
        mountPath: this.settings.mountPath,
        selectiveSyncFolderIds: [],
        pollIntervalMs: this.settings.pollIntervalMs,
        maxCacheSizeBytes: this.settings.maxCacheSizeBytes,
        encryptLocalCache: this.settings.encryptLocalCache,
        offlineModeEnabled: true,
        maxConcurrentSyncs: this.settings.maxConcurrentSyncs,
      },
      authToken: this.authToken,
    })) as ISyncClient;

    // Forward status events
    this.syncClient!.service.onStatusChange((itemId, status) => {
      for (const handler of this.statusHandlers) {
        handler(itemId, status);
      }
    });

    await this.syncClient!.start();
  }

  /** Stop the sync client. */
  async stop(): Promise<void> {
    if (!this.syncClient) return;
    await this.syncClient.stop();
    this.syncClient = null;
  }

  isRunning(): boolean {
    return this.syncClient?.service.isRunning() ?? false;
  }

  setOnline(online: boolean): void {
    this.syncClient?.setOnline(online);
  }

  async getSyncOverview(): Promise<ISyncOverview> {
    if (!this.syncClient) {
      return {
        running: false,
        online: true,
        mountPath: this.settings.mountPath,
        activeSyncCount: 0,
        conflictCount: 0,
        queuedCount: 0,
      };
    }

    const service = this.syncClient.service;
    const active = await service.getActiveSyncItems();
    const conflicts = await service.getConflicts();

    return {
      running: service.isRunning(),
      online: service.isOnline(),
      mountPath: this.settings.mountPath,
      activeSyncCount: active.length,
      conflictCount: conflicts.length,
      queuedCount: active.filter((s) => s.status === ('queued' as SyncStatus))
        .length,
    };
  }

  getSelectiveSync(): string[] {
    return this.syncClient?.service.getSelectiveSync() ?? [];
  }

  async setSelectiveSync(folderIds: string[]): Promise<void> {
    await this.syncClient?.service.setSelectiveSync(folderIds);
  }

  async getConflicts(): Promise<IConflictInfo<string>[]> {
    return this.syncClient?.service.getConflicts() ?? [];
  }

  async resolveConflict(
    fileId: string,
    resolution: ConflictResolution,
  ): Promise<void> {
    await this.syncClient?.service.resolveConflict(fileId, resolution);
  }

  onStatusChange(handler: (itemId: string, status: SyncStatus) => void): void {
    this.statusHandlers.push(handler);
  }

  updateSettings(updated: IDesktopSettings): void {
    this.settings = { ...updated };
  }
}
