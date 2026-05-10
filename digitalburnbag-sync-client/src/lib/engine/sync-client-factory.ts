import type { ISyncConfig } from '@brightchain/digitalburnbag-lib';
import { SyncService } from '@brightchain/digitalburnbag-lib';
import axios from 'axios';
import * as path from 'path';
import { ChokidarFileWatcher } from '../adapters/chokidar-file-watcher';
import { FuseVirtualDrive } from '../adapters/fuse-virtual-drive';
import { HttpSyncApiClient } from '../adapters/http-sync-api-client';
import { LocalEciesEncryption } from '../adapters/local-ecies-encryption';
import {
  ISyncChangeHandler,
  WebSocketSyncTransport,
} from '../adapters/ws-sync-transport';
import { SqliteOfflineQueue } from '../storage/sqlite-offline-queue';

/**
 * Factory that wires all concrete adapters into a fully configured SyncService.
 */
export interface ISyncClientOptions {
  /** Sync configuration */
  config: ISyncConfig<string>;
  /** Auth token for API requests */
  authToken: string;
  /** Path to the SQLite database for the offline queue */
  dbPath?: string;
  /** ECIES key material for local encryption (required if encryptLocalCache is true) */
  keyMaterial?: Uint8Array;
  /** WebSocket URL for real-time sync (e.g. wss://api.brightchain.org). Omit to use polling only. */
  wsUrl?: string;
}

export interface ISyncClient {
  /** The configured sync service */
  service: SyncService<string>;
  /** The WebSocket transport (if wsUrl was provided) */
  wsTransport?: WebSocketSyncTransport;
  /** Start syncing */
  start(): Promise<void>;
  /** Stop syncing and clean up resources */
  stop(): Promise<void>;
  /** Set online/offline status */
  setOnline(online: boolean): void;
}

/**
 * Creates a fully wired sync client with all concrete adapters.
 */
export async function createSyncClient(
  options: ISyncClientOptions,
): Promise<ISyncClient> {
  const { config, authToken } = options;

  // Create HTTP client with auth
  const axiosInstance = axios.create({
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    timeout: 30000,
  });

  // Wire adapters
  const apiClient = new HttpSyncApiClient(axiosInstance, config.apiBaseUrl);
  const virtualDrive = new FuseVirtualDrive(apiClient);
  const fileWatcher = new ChokidarFileWatcher();
  const localEncryption = new LocalEciesEncryption();

  const dbPath =
    options.dbPath ??
    path.join(config.mountPath, '.burnbag-sync', 'offline-queue.db');
  const offlineQueue = new SqliteOfflineQueue(dbPath, apiClient);

  // Initialize components
  await offlineQueue.initialize();

  if (config.encryptLocalCache && options.keyMaterial) {
    await localEncryption.initialize(config.userId, options.keyMaterial);
  }

  // Create and initialize the sync service
  const service = new SyncService<string>(
    virtualDrive,
    fileWatcher,
    offlineQueue,
    localEncryption,
    apiClient,
  );
  await service.initialize(config);

  // Optionally wire WebSocket transport for real-time sync
  let wsTransport: WebSocketSyncTransport | undefined;
  if (options.wsUrl) {
    wsTransport = new WebSocketSyncTransport({
      wsUrl: options.wsUrl,
      authToken,
      userId: config.userId,
    });

    // Bridge WS events to SyncService.pullRemoteChanges()
    const changeHandler: ISyncChangeHandler = {
      onFileChanged: () => void service.pullRemoteChanges(),
      onFolderChanged: () => void service.pullRemoteChanges(),
      onFileDestroyed: () => void service.pullRemoteChanges(),
    };
    wsTransport.setHandler(changeHandler);
  }

  return {
    service,
    wsTransport,
    async start() {
      await service.start();
      wsTransport?.connect();
    },
    async stop() {
      wsTransport?.disconnect();
      await service.stop();
      localEncryption.destroy();
      offlineQueue.close();
    },
    setOnline(online: boolean) {
      service.setOnline(online);
      if (online) {
        wsTransport?.connect();
      } else {
        wsTransport?.disconnect();
      }
    },
  };
}
