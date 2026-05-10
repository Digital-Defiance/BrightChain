import { PlatformID } from '@digitaldefiance/ecies-lib';
import { ConflictResolution, SyncStatus } from '../enumerations/sync-status';
import type { IConflictInfo } from '../interfaces/sync/conflict-info';
import type { IFileSystemWatcher } from '../interfaces/sync/file-system-watcher';
import type { ILocalEncryption } from '../interfaces/sync/local-encryption';
import type { IOfflineQueue } from '../interfaces/sync/offline-queue';
import type { ISyncConfig } from '../interfaces/sync/sync-config';
import type { ISyncEvent } from '../interfaces/sync/sync-event';
import type { ISyncService } from '../interfaces/sync/sync-service';
import type { ISyncState } from '../interfaces/sync/sync-state';
import type { IVirtualDriveMount } from '../interfaces/sync/virtual-drive-mount';

/**
 * Platform-agnostic sync engine.
 * Coordinates the virtual drive mount, file watcher, offline queue,
 * and local encryption to keep local files in sync with the server.
 *
 * Platform-specific implementations (FUSE, ProjFS, etc.) are injected
 * via the constructor dependencies.
 */
export class SyncService<TID extends PlatformID> implements ISyncService<TID> {
  private config: ISyncConfig<TID> | undefined;
  private running = false;
  private online = true;
  private syncStates = new Map<string, ISyncState<TID>>();
  private conflicts = new Map<string, IConflictInfo<TID>>();
  private statusHandlers: Array<(itemId: TID, status: SyncStatus) => void> = [];
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  constructor(
    private readonly virtualDrive: IVirtualDriveMount<TID>,
    private readonly fileWatcher: IFileSystemWatcher<TID>,
    private readonly offlineQueue: IOfflineQueue<TID>,
    private readonly localEncryption: ILocalEncryption<TID>,
    private readonly apiClient: ISyncApiClient<TID>,
  ) {}

  async initialize(config: ISyncConfig<TID>): Promise<void> {
    this.config = config;
    if (config.encryptLocalCache) {
      // Key material would be derived from the user's ECIES key
      // The actual key derivation is handled by the caller
    }
  }

  async start(): Promise<void> {
    if (!this.config) {
      throw new Error('SyncService not initialized — call initialize() first');
    }
    if (this.running) return;

    // Mount the virtual drive
    await this.virtualDrive.mount(this.config);

    // Start watching for local file system changes
    await this.fileWatcher.start(this.config.mountPath);
    this.fileWatcher.onEvent(this.handleLocalEvent.bind(this));

    // Start polling for remote changes (fallback for WebSocket)
    this.pollTimer = setInterval(
      () => void this.pullRemoteChanges(),
      this.config.pollIntervalMs,
    );

    // Replay any queued offline operations
    if (this.online) {
      await this.offlineQueue.replayAll();
    }

    this.running = true;
  }

  async stop(): Promise<void> {
    if (!this.running) return;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    await this.fileWatcher.stop();
    await this.virtualDrive.unmount();
    this.running = false;
  }

  async pullRemoteChanges(): Promise<void> {
    if (!this.config || !this.online) return;

    const remoteChanges = await this.apiClient.getRemoteChanges(
      this.config.userId,
      this.getLastSyncTimestamp(),
    );

    for (const change of remoteChanges) {
      const localState = this.syncStates.get(String(change.fileId));

      // Conflict detection: local has unsaved changes for the same file
      if (
        localState &&
        localState.status === SyncStatus.LocalOnly &&
        localState.localVersionHash !== change.remoteVersionHash
      ) {
        this.registerConflict(change);
        continue;
      }

      this.updateSyncState(change.fileId, SyncStatus.Syncing);

      if (this.isSelectivelySynced(change.folderId)) {
        await this.apiClient.downloadFile(change.fileId, change.localPath);
        if (this.config.encryptLocalCache) {
          await this.localEncryption.encryptFile(change.localPath);
        }
        this.updateSyncState(change.fileId, SyncStatus.Synced);
      } else {
        // Cloud-only: just update metadata placeholder
        this.updateSyncState(change.fileId, SyncStatus.CloudOnly);
      }
    }
  }

  async pushLocalChanges(): Promise<void> {
    if (!this.config) return;

    if (!this.online) {
      // All local changes are already queued via handleLocalEvent
      return;
    }

    await this.offlineQueue.replayAll();
  }

  async setSelectiveSync(folderIds: TID[]): Promise<void> {
    if (!this.config) {
      throw new Error('SyncService not initialized');
    }
    this.config.selectiveSyncFolderIds = folderIds;
  }

  getSelectiveSync(): TID[] {
    return this.config?.selectiveSyncFolderIds ?? [];
  }

  async getSyncStatus(itemId: TID): Promise<ISyncState<TID>> {
    const state = this.syncStates.get(String(itemId));
    if (state) return state;

    return {
      itemId,
      status: SyncStatus.CloudOnly,
    };
  }

  async getActiveSyncItems(): Promise<ISyncState<TID>[]> {
    return Array.from(this.syncStates.values()).filter(
      (s) =>
        s.status === SyncStatus.Syncing ||
        s.status === SyncStatus.Error ||
        s.status === SyncStatus.Conflict ||
        s.status === SyncStatus.Queued,
    );
  }

  async resolveConflict(
    fileId: TID,
    resolution: ConflictResolution,
  ): Promise<void> {
    const conflict = this.conflicts.get(String(fileId));
    if (!conflict) {
      throw new Error(`No conflict found for file ${String(fileId)}`);
    }

    switch (resolution) {
      case ConflictResolution.KeepLocal:
        await this.apiClient.uploadFile(fileId, conflict.localPath);
        break;
      case ConflictResolution.KeepRemote:
        await this.apiClient.downloadFile(fileId, conflict.localPath);
        break;
      case ConflictResolution.KeepBoth:
        await this.apiClient.downloadFile(
          fileId,
          conflict.localPath + '.remote',
        );
        break;
      case ConflictResolution.Merge:
        // Merge is only supported for text files — delegate to caller
        throw new Error('Merge resolution requires external merge tool');
    }

    this.conflicts.delete(String(fileId));
    this.updateSyncState(fileId, SyncStatus.Synced);
  }

  async getConflicts(): Promise<IConflictInfo<TID>[]> {
    return Array.from(this.conflicts.values());
  }

  async forceSync(itemId: TID): Promise<void> {
    this.updateSyncState(itemId, SyncStatus.Syncing);
    try {
      const state = this.syncStates.get(String(itemId));
      if (state?.localVersionHash) {
        await this.apiClient.uploadFile(itemId, '');
      } else {
        await this.apiClient.downloadFile(itemId, '');
      }
      this.updateSyncState(itemId, SyncStatus.Synced);
    } catch {
      this.updateSyncState(itemId, SyncStatus.Error);
    }
  }

  onStatusChange(handler: (itemId: TID, status: SyncStatus) => void): void {
    this.statusHandlers.push(handler);
  }

  isRunning(): boolean {
    return this.running;
  }

  isOnline(): boolean {
    return this.online;
  }

  /** Called by the network monitor when connectivity changes */
  setOnline(online: boolean): void {
    this.online = online;
    if (online && this.running) {
      void this.offlineQueue.replayAll();
    }
  }

  // --- Private helpers ---

  private handleLocalEvent(event: ISyncEvent<TID>): void {
    if (!this.config) return;

    if (!this.online) {
      // Queue for later replay
      void this.offlineQueue.enqueue({
        operationId: event.eventId,
        operationType: mapEventToOperation(event.eventType),
        targetId: event.fileId ?? event.folderId ?? event.eventId,
        localPath: event.localPath,
        payload: JSON.stringify(event),
        queuedAt: new Date(),
        retryCount: 0,
      });
      if (event.fileId) {
        this.updateSyncState(event.fileId, SyncStatus.Queued);
      }
      return;
    }

    // Online: propagate immediately
    if (event.fileId) {
      this.updateSyncState(event.fileId, SyncStatus.Syncing);
      void this.apiClient
        .propagateLocalChange(event)
        .then(() => {
          if (event.fileId) {
            this.updateSyncState(event.fileId, SyncStatus.Synced);
          }
        })
        .catch(() => {
          if (event.fileId) {
            this.updateSyncState(event.fileId, SyncStatus.Error);
          }
        });
    }
  }

  private updateSyncState(itemId: TID, status: SyncStatus): void {
    const existing = this.syncStates.get(String(itemId));
    const updated: ISyncState<TID> = {
      ...existing,
      itemId,
      status,
      lastSyncedAt:
        status === SyncStatus.Synced ? new Date() : existing?.lastSyncedAt,
    };
    this.syncStates.set(String(itemId), updated);
    for (const handler of this.statusHandlers) {
      handler(itemId, status);
    }
  }

  private registerConflict(change: IRemoteChange<TID>): void {
    const conflict: IConflictInfo<TID> = {
      fileId: change.fileId,
      localPath: change.localPath,
      localModifiedAt: new Date(),
      remoteModifiedAt: change.remoteModifiedAt,
      localHash:
        this.syncStates.get(String(change.fileId))?.localVersionHash ?? '',
      remoteHash: change.remoteVersionHash,
      remoteModifiedBy: change.remoteModifiedBy,
    };
    this.conflicts.set(String(change.fileId), conflict);
    this.updateSyncState(change.fileId, SyncStatus.Conflict);
  }

  private isSelectivelySynced(folderId: TID): boolean {
    if (!this.config) return false;
    if (this.config.selectiveSyncFolderIds.length === 0) return true;
    return this.config.selectiveSyncFolderIds.some(
      (id) => String(id) === String(folderId),
    );
  }

  private getLastSyncTimestamp(): Date {
    let latest = new Date(0);
    for (const state of this.syncStates.values()) {
      if (state.lastSyncedAt) {
        const d =
          typeof state.lastSyncedAt === 'string'
            ? new Date(state.lastSyncedAt)
            : state.lastSyncedAt;
        if (d > latest) latest = d;
      }
    }
    return latest;
  }
}

// --- Supporting types used only by the sync service implementation ---

import {
  FileSystemEventType,
  OfflineOperationType,
} from '../enumerations/sync-status';

/**
 * Minimal API client interface consumed by the sync engine.
 * The actual HTTP/WebSocket implementation lives in the sync-client library.
 */
/** Lightweight file entry returned by listFolder for FUSE readdir/getattr. */
export interface IRemoteFileEntry<TID extends PlatformID> {
  id: TID;
  name: string;
  isDirectory: boolean;
  sizeBytes: number;
  mimeType?: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  /** Whether the file content is available locally (hydrated) */
  hydrated?: boolean;
}

/**
 * API client interface consumed by the sync engine and FUSE virtual drive.
 * The actual HTTP/WebSocket implementation lives in the sync-client library.
 */
export interface ISyncApiClient<TID extends PlatformID> {
  getRemoteChanges(userId: TID, since: Date): Promise<IRemoteChange<TID>[]>;
  downloadFile(fileId: TID, localPath: string): Promise<void>;
  /** Download file content as a buffer (for FUSE read without writing to disk). */
  downloadFileContent(fileId: TID): Promise<Uint8Array>;
  uploadFile(fileId: TID, localPath: string): Promise<void>;
  /** Upload file content from a buffer (for FUSE write without reading from disk). */
  uploadFileContent(fileId: TID, content: Uint8Array): Promise<void>;
  propagateLocalChange(event: ISyncEvent<TID>): Promise<void>;
  /** List files and subfolders in a remote folder. */
  listFolder(folderId: TID): Promise<IRemoteFileEntry<TID>[]>;
  /** List the root folder contents for a user. */
  listRootFolder(userId: TID): Promise<IRemoteFileEntry<TID>[]>;
  /** Create a remote folder. Returns the new folder ID. */
  createRemoteFolder(parentFolderId: TID, name: string): Promise<TID>;
  /** Delete a remote file or folder. */
  deleteRemoteEntry(entryId: TID, isDirectory: boolean): Promise<void>;
  /** Rename a remote file or folder. */
  renameRemoteEntry(entryId: TID, newName: string): Promise<void>;
}

export interface IRemoteChange<TID extends PlatformID> {
  fileId: TID;
  folderId: TID;
  localPath: string;
  remoteVersionHash: string;
  remoteModifiedAt: Date | string;
  remoteModifiedBy: TID;
}

function mapEventToOperation(
  eventType: FileSystemEventType,
): OfflineOperationType {
  switch (eventType) {
    case FileSystemEventType.Created:
      return OfflineOperationType.Upload;
    case FileSystemEventType.Modified:
      return OfflineOperationType.Upload;
    case FileSystemEventType.Deleted:
      return OfflineOperationType.Delete;
    case FileSystemEventType.Moved:
      return OfflineOperationType.Move;
    case FileSystemEventType.Renamed:
      return OfflineOperationType.Rename;
  }
}
