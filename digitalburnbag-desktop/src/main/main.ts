import { app, BrowserWindow, ipcMain, Menu, nativeImage, Tray } from 'electron';
import * as os from 'os';
import * as path from 'path';
import {
  DEFAULT_SETTINGS,
  IpcChannels,
  type IDesktopSettings,
  type ILoginRequest,
  type IResolveConflictRequest,
} from '../lib/ipc-channels';
import { SyncManager } from './sync-manager';

/**
 * Electron main process entry point for the Digital Burnbag desktop client.
 *
 * Responsibilities:
 * - Application lifecycle (single instance lock, auto-launch)
 * - System tray icon with context menu
 * - Settings window (BrowserWindow)
 * - IPC bridge between renderer and SyncManager
 * - Persistent settings via electron-store
 */

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let syncManager: SyncManager | null = null;
let settings: IDesktopSettings = { ...DEFAULT_SETTINGS };

// Default mount path per platform
function getDefaultMountPath(): string {
  const home = os.homedir();
  switch (process.platform) {
    case 'darwin':
      return path.join(home, 'BrightChain Burnbag');
    case 'win32':
      return path.join(home, 'BrightChain Burnbag');
    case 'linux':
      return path.join(home, 'brightchain-burnbag');
    default:
      return path.join(home, 'brightchain-burnbag');
  }
}

function loadSettings(): IDesktopSettings {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Store = require('electron-store');
    const store = new Store({ name: 'burnbag-settings' });
    const saved = store.get('settings') as
      | Partial<IDesktopSettings>
      | undefined;
    return {
      ...DEFAULT_SETTINGS,
      mountPath: getDefaultMountPath(),
      ...saved,
    };
  } catch {
    return { ...DEFAULT_SETTINGS, mountPath: getDefaultMountPath() };
  }
}

function saveSettings(updated: IDesktopSettings): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Store = require('electron-store');
    const store = new Store({ name: 'burnbag-settings' });
    store.set('settings', updated);
  } catch {
    // Settings persistence unavailable
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 480,
    height: 640,
    show: !settings.startMinimized,
    resizable: true,
    title: 'Digital Burnbag',
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // In production, load the bundled renderer HTML.
  // In development, load from a dev server URL.
  const rendererPath = path.join(__dirname, '..', 'renderer', 'index.html');
  mainWindow.loadFile(rendererPath).catch(() => {
    // Renderer not built yet — show a placeholder
    mainWindow?.loadURL(
      'data:text/html,<h2>Digital Burnbag Desktop</h2><p>Renderer not built.</p>',
    );
  });

  mainWindow.on('close', (event) => {
    // Minimize to tray instead of quitting
    event.preventDefault();
    mainWindow?.hide();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function createTray(): void {
  // Create a simple 16x16 tray icon (placeholder — real icon would be a .png asset)
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  tray.setToolTip('Digital Burnbag');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Digital Burnbag',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Sync Status',
      enabled: false,
      id: 'sync-status',
    },
    { type: 'separator' },
    {
      label: 'Pause Sync',
      id: 'pause-sync',
      click: () => {
        syncManager?.stop().catch(console.error);
      },
    },
    {
      label: 'Resume Sync',
      id: 'resume-sync',
      click: () => {
        syncManager?.start().catch(console.error);
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        syncManager
          ?.stop()
          .then(() => {
            app.exit(0);
          })
          .catch(() => {
            app.exit(0);
          });
      },
    },
  ]);

  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function registerIpcHandlers(): void {
  // Auth
  ipcMain.handle(IpcChannels.LOGIN, async (_event, request: ILoginRequest) => {
    return syncManager?.login(request);
  });

  ipcMain.handle(IpcChannels.LOGOUT, async () => {
    return syncManager?.logout();
  });

  ipcMain.handle(IpcChannels.GET_AUTH_STATE, () => {
    return syncManager?.getAuthState() ?? { loggedIn: false };
  });

  // Sync control
  ipcMain.handle(IpcChannels.START_SYNC, async () => {
    return syncManager?.start();
  });

  ipcMain.handle(IpcChannels.STOP_SYNC, async () => {
    return syncManager?.stop();
  });

  ipcMain.handle(IpcChannels.GET_SYNC_STATE, async () => {
    return syncManager?.getSyncOverview();
  });

  ipcMain.handle(IpcChannels.SET_ONLINE, async (_event, online: boolean) => {
    syncManager?.setOnline(online);
  });

  // Selective sync
  ipcMain.handle(IpcChannels.GET_SELECTIVE_SYNC, async () => {
    return syncManager?.getSelectiveSync() ?? [];
  });

  ipcMain.handle(
    IpcChannels.SET_SELECTIVE_SYNC,
    async (_event, folderIds: string[]) => {
      return syncManager?.setSelectiveSync(folderIds);
    },
  );

  // Conflicts
  ipcMain.handle(IpcChannels.GET_CONFLICTS, async () => {
    return syncManager?.getConflicts() ?? [];
  });

  ipcMain.handle(
    IpcChannels.RESOLVE_CONFLICT,
    async (_event, req: IResolveConflictRequest) => {
      return syncManager?.resolveConflict(req.fileId, req.resolution);
    },
  );

  // Settings
  ipcMain.handle(IpcChannels.GET_SETTINGS, () => {
    return settings;
  });

  ipcMain.handle(
    IpcChannels.UPDATE_SETTINGS,
    async (_event, updated: Partial<IDesktopSettings>) => {
      settings = { ...settings, ...updated };
      saveSettings(settings);
      // Restart sync with new settings if running
      if (syncManager?.isRunning()) {
        await syncManager.stop();
        await syncManager.start();
      }
      return settings;
    },
  );

  // Quit
  ipcMain.on(IpcChannels.QUIT, () => {
    syncManager
      ?.stop()
      .then(() => app.exit(0))
      .catch(() => app.exit(0));
  });
}

async function bootstrap(): Promise<void> {
  // Single instance lock
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
    return;
  }

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  await app.whenReady();

  settings = loadSettings();
  syncManager = new SyncManager(settings);

  createTray();
  createWindow();
  registerIpcHandlers();

  // Forward sync status events to the renderer
  syncManager.onStatusChange((itemId, status) => {
    mainWindow?.webContents.send(IpcChannels.SYNC_STATUS_CHANGED, {
      itemId,
      status,
    });
  });

  // Auto-start sync if logged in
  const authState = syncManager.getAuthState();
  if (authState.loggedIn && settings.autoStart) {
    await syncManager.start().catch(console.error);
  }
}

// Don't quit when all windows are closed (tray app)
app.on('window-all-closed', () => {
  // no-op: keep app running in tray
});

bootstrap().catch(console.error);

export { bootstrap, createTray, createWindow };
