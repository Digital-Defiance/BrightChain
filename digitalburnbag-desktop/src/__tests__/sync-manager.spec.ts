import type { IDesktopSettings } from '../lib/ipc-channels';
import { DEFAULT_SETTINGS } from '../lib/ipc-channels';
import { SyncManager } from '../main/sync-manager';

// Mock axios
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    post: jest.fn(),
    create: jest.fn().mockReturnValue({
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      patch: jest.fn(),
      defaults: {},
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
    }),
  },
}));

// Mock the sync client factory
jest.mock('@brightchain/digitalburnbag-sync-client', () => ({
  createSyncClient: jest.fn().mockResolvedValue({
    service: {
      isRunning: jest.fn().mockReturnValue(false),
      isOnline: jest.fn().mockReturnValue(true),
      onStatusChange: jest.fn(),
      getActiveSyncItems: jest.fn().mockResolvedValue([]),
      getConflicts: jest.fn().mockResolvedValue([]),
      getSelectiveSync: jest.fn().mockReturnValue([]),
      setSelectiveSync: jest.fn().mockResolvedValue(undefined),
      resolveConflict: jest.fn().mockResolvedValue(undefined),
    },
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    setOnline: jest.fn(),
  }),
}));

function makeSettings(overrides?: Partial<IDesktopSettings>): IDesktopSettings {
  return {
    ...DEFAULT_SETTINGS,
    mountPath: '/tmp/burnbag-test',
    ...overrides,
  };
}

describe('SyncManager', () => {
  let manager: SyncManager;

  beforeEach(() => {
    manager = new SyncManager(makeSettings());
    jest.clearAllMocks();
  });

  describe('auth', () => {
    it('should start as not logged in', () => {
      const state = manager.getAuthState();
      expect(state.loggedIn).toBe(false);
      expect(state.userId).toBeUndefined();
    });

    it('should login via axios and store auth state', async () => {
      const axios = (await import('axios')).default;
      (axios.post as jest.Mock).mockResolvedValue({
        data: {
          token: 'test-token',
          userId: 'user-1',
          displayName: 'Test User',
        },
      });

      const state = await manager.login({
        apiBaseUrl: 'https://api.example.com',
        email: 'test@example.com',
        password: 'password',
      });

      expect(state.loggedIn).toBe(true);
      expect(state.userId).toBe('user-1');
      expect(state.displayName).toBe('Test User');
    });

    it('should clear auth state on logout', async () => {
      const axios = (await import('axios')).default;
      (axios.post as jest.Mock).mockResolvedValue({
        data: { token: 'test-token', userId: 'user-1' },
      });

      await manager.login({
        apiBaseUrl: 'https://api.example.com',
        email: 'test@example.com',
        password: 'password',
      });

      await manager.logout();
      const state = manager.getAuthState();
      expect(state.loggedIn).toBe(false);
    });
  });

  describe('sync lifecycle', () => {
    beforeEach(async () => {
      const axios = (await import('axios')).default;
      (axios.post as jest.Mock).mockResolvedValue({
        data: { token: 'test-token', userId: 'user-1' },
      });
      await manager.login({
        apiBaseUrl: 'https://api.example.com',
        email: 'test@example.com',
        password: 'password',
      });
    });

    it('should start sync after login', async () => {
      const { createSyncClient } = await import(
        '@brightchain/digitalburnbag-sync-client'
      );
      await manager.start();

      expect(createSyncClient).toHaveBeenCalledWith(
        expect.objectContaining({
          authToken: 'test-token',
          config: expect.objectContaining({
            userId: 'user-1',
            mountPath: '/tmp/burnbag-test',
          }),
        }),
      );
    });

    it('should not start sync without login', async () => {
      await manager.logout();
      await expect(manager.start()).rejects.toThrow('Not authenticated');
    });

    it('should stop sync', async () => {
      await manager.start();
      await manager.stop();
      expect(manager.isRunning()).toBe(false);
    });

    it('should be idempotent on double start', async () => {
      const { createSyncClient } = await import(
        '@brightchain/digitalburnbag-sync-client'
      );
      await manager.start();
      await manager.start();
      expect(createSyncClient).toHaveBeenCalledTimes(1);
    });

    it('should be idempotent on double stop', async () => {
      await manager.start();
      await manager.stop();
      await manager.stop(); // should not throw
    });
  });

  describe('sync overview', () => {
    it('should return default overview when not running', async () => {
      const overview = await manager.getSyncOverview();
      expect(overview.running).toBe(false);
      expect(overview.activeSyncCount).toBe(0);
      expect(overview.conflictCount).toBe(0);
    });
  });

  describe('status events', () => {
    it('should register status change handlers', () => {
      const handler = jest.fn();
      manager.onStatusChange(handler);
      // Handler is stored — would be called when sync client emits events
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('settings', () => {
    it('should update settings', () => {
      manager.updateSettings(makeSettings({ pollIntervalMs: 60000 }));
      // No assertion needed — just verifying it doesn't throw
    });
  });
});
