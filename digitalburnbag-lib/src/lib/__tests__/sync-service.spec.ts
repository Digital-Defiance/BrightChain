import {
  ConflictResolution,
  FileSystemEventType,
  SyncStatus,
} from '../enumerations/sync-status';
import type { IFileSystemWatcher } from '../interfaces/sync/file-system-watcher';
import type { ILocalEncryption } from '../interfaces/sync/local-encryption';
import type { IOfflineQueue } from '../interfaces/sync/offline-queue';
import type { ISyncConfig } from '../interfaces/sync/sync-config';
import type { ISyncEvent } from '../interfaces/sync/sync-event';
import type { IVirtualDriveMount } from '../interfaces/sync/virtual-drive-mount';
import {
  IRemoteChange,
  ISyncApiClient,
  SyncService,
} from '../services/sync-service';

type TID = string;

let idCounter = 0;
function newId(): string {
  return `test-id-${++idCounter}`;
}

// --- Mock factories ---

function createMockVirtualDrive(): jest.Mocked<IVirtualDriveMount<TID>> {
  return {
    mount: jest.fn().mockResolvedValue(undefined),
    unmount: jest.fn().mockResolvedValue(undefined),
    isMounted: jest.fn().mockReturnValue(false),
    getMountPath: jest.fn().mockReturnValue('/mnt/burnbag'),
    hydrateFile: jest.fn().mockResolvedValue(undefined),
    dehydrateFile: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockFileWatcher(): jest.Mocked<IFileSystemWatcher<TID>> {
  return {
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    isWatching: jest.fn().mockReturnValue(false),
    onEvent: jest.fn(),
    offEvent: jest.fn(),
  };
}

function createMockOfflineQueue(): jest.Mocked<IOfflineQueue<TID>> {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
    dequeue: jest.fn().mockResolvedValue(undefined),
    peek: jest.fn().mockResolvedValue(undefined),
    getAll: jest.fn().mockResolvedValue([]),
    remove: jest.fn().mockResolvedValue(undefined),
    clear: jest.fn().mockResolvedValue(undefined),
    size: jest.fn().mockResolvedValue(0),
    replayAll: jest.fn().mockResolvedValue({ succeeded: 0, failed: 0 }),
  };
}

function createMockLocalEncryption(): jest.Mocked<ILocalEncryption<TID>> {
  return {
    initialize: jest.fn().mockResolvedValue(undefined),
    encryptFile: jest.fn().mockResolvedValue(undefined),
    decryptFile: jest.fn().mockResolvedValue(undefined),
    encrypt: jest.fn().mockResolvedValue(new Uint8Array(32)),
    decrypt: jest.fn().mockResolvedValue(new Uint8Array(32)),
    destroy: jest.fn(),
  };
}

function createMockApiClient(): jest.Mocked<ISyncApiClient<TID>> {
  return {
    getRemoteChanges: jest.fn().mockResolvedValue([]),
    downloadFile: jest.fn().mockResolvedValue(undefined),
    downloadFileContent: jest.fn().mockResolvedValue(new Uint8Array(0)),
    uploadFile: jest.fn().mockResolvedValue(undefined),
    uploadFileContent: jest.fn().mockResolvedValue(undefined),
    propagateLocalChange: jest.fn().mockResolvedValue(undefined),
    listFolder: jest.fn().mockResolvedValue([]),
    listRootFolder: jest.fn().mockResolvedValue([]),
    createRemoteFolder: jest.fn().mockResolvedValue(newId()),
    deleteRemoteEntry: jest.fn().mockResolvedValue(undefined),
    renameRemoteEntry: jest.fn().mockResolvedValue(undefined),
  };
}

function makeConfig(overrides?: Partial<ISyncConfig<TID>>): ISyncConfig<TID> {
  return {
    userId: newId(),
    apiBaseUrl: 'https://api.example.com',
    mountPath: '/mnt/burnbag',
    selectiveSyncFolderIds: [],
    pollIntervalMs: 30000,
    maxCacheSizeBytes: 1024 * 1024 * 1024,
    encryptLocalCache: false,
    offlineModeEnabled: true,
    maxConcurrentSyncs: 4,
    ...overrides,
  };
}

function makeRemoteChange(
  overrides?: Partial<IRemoteChange<TID>>,
): IRemoteChange<TID> {
  return {
    fileId: newId(),
    folderId: newId(),
    localPath: '/mnt/burnbag/test.txt',
    remoteVersionHash: 'abc123',
    remoteModifiedAt: new Date(),
    remoteModifiedBy: newId(),
    ...overrides,
  };
}

describe('SyncService', () => {
  let service: SyncService<TID>;
  let virtualDrive: jest.Mocked<IVirtualDriveMount<TID>>;
  let fileWatcher: jest.Mocked<IFileSystemWatcher<TID>>;
  let offlineQueue: jest.Mocked<IOfflineQueue<TID>>;
  let localEncryption: jest.Mocked<ILocalEncryption<TID>>;
  let apiClient: jest.Mocked<ISyncApiClient<TID>>;

  beforeEach(() => {
    idCounter = 0;
    virtualDrive = createMockVirtualDrive();
    fileWatcher = createMockFileWatcher();
    offlineQueue = createMockOfflineQueue();
    localEncryption = createMockLocalEncryption();
    apiClient = createMockApiClient();
    service = new SyncService(
      virtualDrive,
      fileWatcher,
      offlineQueue,
      localEncryption,
      apiClient,
    );
  });

  afterEach(async () => {
    if (service.isRunning()) {
      await service.stop();
    }
    jest.useRealTimers();
  });

  // --- 39.1: Project structure & basic lifecycle ---

  describe('initialization and lifecycle', () => {
    it('should initialize with config', async () => {
      const config = makeConfig();
      await service.initialize(config);
      expect(service.isRunning()).toBe(false);
    });

    it('should throw if start() called before initialize()', async () => {
      await expect(service.start()).rejects.toThrow(
        'SyncService not initialized',
      );
    });

    it('should mount drive and start watcher on start()', async () => {
      await service.initialize(makeConfig());
      await service.start();
      expect(virtualDrive.mount).toHaveBeenCalled();
      expect(fileWatcher.start).toHaveBeenCalledWith('/mnt/burnbag');
      expect(fileWatcher.onEvent).toHaveBeenCalled();
      expect(service.isRunning()).toBe(true);
    });

    it('should be idempotent on double start()', async () => {
      await service.initialize(makeConfig());
      await service.start();
      await service.start();
      expect(virtualDrive.mount).toHaveBeenCalledTimes(1);
    });

    it('should unmount drive and stop watcher on stop()', async () => {
      await service.initialize(makeConfig());
      await service.start();
      await service.stop();
      expect(fileWatcher.stop).toHaveBeenCalled();
      expect(virtualDrive.unmount).toHaveBeenCalled();
      expect(service.isRunning()).toBe(false);
    });

    it('should be idempotent on double stop()', async () => {
      await service.initialize(makeConfig());
      await service.start();
      await service.stop();
      await service.stop();
      expect(virtualDrive.unmount).toHaveBeenCalledTimes(1);
    });

    it('should replay offline queue on start when online', async () => {
      await service.initialize(makeConfig());
      await service.start();
      expect(offlineQueue.replayAll).toHaveBeenCalled();
    });
  });

  // --- 39.1: File system event watcher & API propagation ---

  describe('local change propagation', () => {
    it('should propagate local events to API when online', async () => {
      await service.initialize(makeConfig());
      await service.start();

      const handler = fileWatcher.onEvent.mock.calls[0][0];
      const event: ISyncEvent<TID> = {
        eventId: newId(),
        eventType: FileSystemEventType.Modified,
        localPath: '/mnt/burnbag/doc.txt',
        fileId: newId(),
        timestamp: new Date(),
        isDirectory: false,
      };

      handler(event);
      await new Promise((r) => setTimeout(r, 10));
      expect(apiClient.propagateLocalChange).toHaveBeenCalledWith(event);
    });

    it('should queue events when offline', async () => {
      await service.initialize(makeConfig());
      await service.start();
      service.setOnline(false);

      const handler = fileWatcher.onEvent.mock.calls[0][0];
      const fileId = newId();
      const event: ISyncEvent<TID> = {
        eventId: newId(),
        eventType: FileSystemEventType.Created,
        localPath: '/mnt/burnbag/new.txt',
        fileId,
        timestamp: new Date(),
        isDirectory: false,
      };

      handler(event);
      await new Promise((r) => setTimeout(r, 10));

      expect(offlineQueue.enqueue).toHaveBeenCalled();
      expect(apiClient.propagateLocalChange).not.toHaveBeenCalled();
    });
  });

  // --- 39.2: Sync engine ---

  describe('pullRemoteChanges', () => {
    it('should download files for selectively synced folders', async () => {
      const folderId = newId();
      const config = makeConfig({ selectiveSyncFolderIds: [folderId] });
      await service.initialize(config);

      const change = makeRemoteChange({ folderId });
      apiClient.getRemoteChanges.mockResolvedValue([change]);

      await service.pullRemoteChanges();

      expect(apiClient.downloadFile).toHaveBeenCalledWith(
        change.fileId,
        change.localPath,
      );
    });

    it('should mark non-synced folders as cloud-only', async () => {
      const syncedFolder = newId();
      const otherFolder = newId();
      const config = makeConfig({
        selectiveSyncFolderIds: [syncedFolder],
      });
      await service.initialize(config);

      const change = makeRemoteChange({ folderId: otherFolder });
      apiClient.getRemoteChanges.mockResolvedValue([change]);

      await service.pullRemoteChanges();

      expect(apiClient.downloadFile).not.toHaveBeenCalled();
      const status = await service.getSyncStatus(change.fileId);
      expect(status.status).toBe(SyncStatus.CloudOnly);
    });

    it('should sync all folders when selectiveSyncFolderIds is empty', async () => {
      await service.initialize(makeConfig({ selectiveSyncFolderIds: [] }));

      const change = makeRemoteChange();
      apiClient.getRemoteChanges.mockResolvedValue([change]);

      await service.pullRemoteChanges();

      expect(apiClient.downloadFile).toHaveBeenCalled();
    });

    it('should encrypt downloaded files when encryptLocalCache is true', async () => {
      await service.initialize(
        makeConfig({ encryptLocalCache: true, selectiveSyncFolderIds: [] }),
      );

      const change = makeRemoteChange();
      apiClient.getRemoteChanges.mockResolvedValue([change]);

      await service.pullRemoteChanges();

      expect(localEncryption.encryptFile).toHaveBeenCalledWith(
        change.localPath,
      );
    });

    it('should not pull when offline', async () => {
      await service.initialize(makeConfig());
      service.setOnline(false);

      await service.pullRemoteChanges();

      expect(apiClient.getRemoteChanges).not.toHaveBeenCalled();
    });
  });

  describe('selective sync', () => {
    it('should update selective sync folder list', async () => {
      await service.initialize(makeConfig());
      const folders = [newId(), newId()];
      await service.setSelectiveSync(folders);
      expect(service.getSelectiveSync()).toEqual(folders);
    });

    it('should throw if setSelectiveSync called before initialize', async () => {
      await expect(service.setSelectiveSync([])).rejects.toThrow(
        'SyncService not initialized',
      );
    });
  });

  describe('sync status indicators', () => {
    it('should return CloudOnly for unknown items', async () => {
      await service.initialize(makeConfig());
      const status = await service.getSyncStatus(newId());
      expect(status.status).toBe(SyncStatus.CloudOnly);
    });

    it('should track active sync items (synced items are not active)', async () => {
      await service.initialize(makeConfig({ selectiveSyncFolderIds: [] }));

      const change = makeRemoteChange();
      apiClient.getRemoteChanges.mockResolvedValue([change]);
      await service.pullRemoteChanges();

      const active = await service.getActiveSyncItems();
      expect(active.length).toBe(0);
    });

    it('should notify status change handlers', async () => {
      await service.initialize(makeConfig({ selectiveSyncFolderIds: [] }));

      const handler = jest.fn();
      service.onStatusChange(handler);

      const change = makeRemoteChange();
      apiClient.getRemoteChanges.mockResolvedValue([change]);
      await service.pullRemoteChanges();

      expect(handler).toHaveBeenCalledWith(change.fileId, SyncStatus.Syncing);
      expect(handler).toHaveBeenCalledWith(change.fileId, SyncStatus.Synced);
    });
  });

  // --- 39.2: Conflict resolution ---

  describe('conflict resolution', () => {
    it('should throw when resolving a non-existent conflict', async () => {
      await service.initialize(makeConfig());
      await expect(
        service.resolveConflict(newId(), ConflictResolution.KeepLocal),
      ).rejects.toThrow('No conflict found');
    });

    it('should throw for KeepRemote on non-existent conflict', async () => {
      await service.initialize(makeConfig());
      await expect(
        service.resolveConflict(newId(), ConflictResolution.KeepRemote),
      ).rejects.toThrow('No conflict found');
    });

    it('should return empty conflicts list initially', async () => {
      await service.initialize(makeConfig());
      const conflicts = await service.getConflicts();
      expect(conflicts).toEqual([]);
    });
  });

  // --- 39.3: Offline mode ---

  describe('offline mode', () => {
    it('should report online status', () => {
      expect(service.isOnline()).toBe(true);
    });

    it('should switch to offline mode', () => {
      service.setOnline(false);
      expect(service.isOnline()).toBe(false);
    });

    it('should replay queue when coming back online while running', async () => {
      await service.initialize(makeConfig());
      await service.start();
      offlineQueue.replayAll.mockClear();

      service.setOnline(false);
      service.setOnline(true);

      expect(offlineQueue.replayAll).toHaveBeenCalled();
    });

    it('should not replay queue when going online while not running', () => {
      service.setOnline(false);
      service.setOnline(true);
      expect(offlineQueue.replayAll).not.toHaveBeenCalled();
    });
  });

  // --- 39.3: Local encryption ---

  describe('local encryption', () => {
    it('should not encrypt when encryptLocalCache is false', async () => {
      await service.initialize(
        makeConfig({ encryptLocalCache: false, selectiveSyncFolderIds: [] }),
      );

      const change = makeRemoteChange();
      apiClient.getRemoteChanges.mockResolvedValue([change]);
      await service.pullRemoteChanges();

      expect(localEncryption.encryptFile).not.toHaveBeenCalled();
    });

    it('should encrypt when encryptLocalCache is true', async () => {
      await service.initialize(
        makeConfig({ encryptLocalCache: true, selectiveSyncFolderIds: [] }),
      );

      const change = makeRemoteChange();
      apiClient.getRemoteChanges.mockResolvedValue([change]);
      await service.pullRemoteChanges();

      expect(localEncryption.encryptFile).toHaveBeenCalledWith(
        change.localPath,
      );
    });
  });

  // --- 39.2: forceSync ---

  describe('forceSync', () => {
    it('should handle forceSync for unknown item', async () => {
      await service.initialize(makeConfig());
      const itemId = newId();

      await service.forceSync(itemId);

      expect(apiClient.downloadFile).toHaveBeenCalled();
    });

    it('should set error status on forceSync failure', async () => {
      await service.initialize(makeConfig());
      const itemId = newId();
      apiClient.downloadFile.mockRejectedValue(new Error('network error'));

      await service.forceSync(itemId);

      const status = await service.getSyncStatus(itemId);
      expect(status.status).toBe(SyncStatus.Error);
    });
  });

  // --- pushLocalChanges ---

  describe('pushLocalChanges', () => {
    it('should replay offline queue when online', async () => {
      await service.initialize(makeConfig());
      offlineQueue.replayAll.mockClear();

      await service.pushLocalChanges();

      expect(offlineQueue.replayAll).toHaveBeenCalled();
    });

    it('should not replay when offline', async () => {
      await service.initialize(makeConfig());
      service.setOnline(false);
      offlineQueue.replayAll.mockClear();

      await service.pushLocalChanges();

      expect(offlineQueue.replayAll).not.toHaveBeenCalled();
    });
  });
});
