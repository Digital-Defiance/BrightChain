import { DEFAULT_SETTINGS, IpcChannels } from '../lib/ipc-channels';

describe('IPC Channels', () => {
  it('should define all required channel names', () => {
    expect(IpcChannels.LOGIN).toBe('burnbag:login');
    expect(IpcChannels.LOGOUT).toBe('burnbag:logout');
    expect(IpcChannels.START_SYNC).toBe('burnbag:start-sync');
    expect(IpcChannels.STOP_SYNC).toBe('burnbag:stop-sync');
    expect(IpcChannels.GET_SYNC_STATE).toBe('burnbag:get-sync-state');
    expect(IpcChannels.GET_SETTINGS).toBe('burnbag:get-settings');
    expect(IpcChannels.UPDATE_SETTINGS).toBe('burnbag:update-settings');
    expect(IpcChannels.SYNC_STATUS_CHANGED).toBe('burnbag:sync-status-changed');
    expect(IpcChannels.QUIT).toBe('burnbag:quit');
  });

  it('should have sensible default settings', () => {
    expect(DEFAULT_SETTINGS.autoStart).toBe(true);
    expect(DEFAULT_SETTINGS.encryptLocalCache).toBe(true);
    expect(DEFAULT_SETTINGS.maxCacheSizeBytes).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.pollIntervalMs).toBeGreaterThan(0);
    expect(DEFAULT_SETTINGS.maxConcurrentSyncs).toBeGreaterThan(0);
  });
});
