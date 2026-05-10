import * as vscode from 'vscode';
import { SettingsManager } from './settings-manager';

// Access mock helpers
const mockWorkspace = vscode.workspace as typeof vscode.workspace & {
  _fireConfigChange(e: vscode.ConfigurationChangeEvent): void;
  _reset(): void;
};
const mockWindow = vscode.window as typeof vscode.window & {
  showWarningMessage: jest.Mock;
};

describe('SettingsManager', () => {
  let manager: SettingsManager;

  beforeEach(() => {
    mockWorkspace._reset();
    mockWindow.showWarningMessage.mockReset();
    manager = new SettingsManager();
  });

  afterEach(() => {
    manager.dispose();
  });

  describe('apiHostUrl', () => {
    it('returns the default URL when no config is set', () => {
      expect(manager.apiHostUrl).toBe('https://brightchain.org');
    });

    it('returns the configured URL when set', () => {
      const config = vscode.workspace.getConfiguration(
        'brightchainVfsExplorer',
      );

      (config as unknown as Record<string, Record<string, string>>)['_values'][
        'apiHostUrl'
      ] = 'https://custom.example.com';
      expect(manager.apiHostUrl).toBe('https://custom.example.com');
    });
  });

  describe('onConfigChanged', () => {
    it('fires when brightchainVfsExplorer config changes', () => {
      const listener = jest.fn();
      manager.onConfigChanged(listener);

      mockWorkspace._fireConfigChange({
        affectsConfiguration: (section: string) =>
          section === 'brightchainVfsExplorer',
      });

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it('does not fire for unrelated config changes', () => {
      const listener = jest.fn();
      manager.onConfigChanged(listener);

      mockWorkspace._fireConfigChange({
        affectsConfiguration: (section: string) =>
          section === 'someOtherExtension',
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('validateAndApplyHostUrl', () => {
    it('returns true for brightchain.org hostname without showing warning', async () => {
      const result = await manager.validateAndApplyHostUrl(
        'https://brightchain.org/api',
        'https://brightchain.org',
      );
      expect(result).toBe(true);
      expect(mockWindow.showWarningMessage).not.toHaveBeenCalled();
    });

    it('shows warning for non-brightchain.org hostname and returns true on confirm', async () => {
      mockWindow.showWarningMessage.mockResolvedValue('Continue');

      const result = await manager.validateAndApplyHostUrl(
        'https://evil.example.com',
        'https://brightchain.org',
      );

      expect(result).toBe(true);
      expect(mockWindow.showWarningMessage).toHaveBeenCalledTimes(1);
      expect(mockWindow.showWarningMessage).toHaveBeenCalledWith(
        expect.stringContaining('non-default API host'),
        'Continue',
      );
    });

    it('reverts setting and returns false when user dismisses warning', async () => {
      mockWindow.showWarningMessage.mockResolvedValue(undefined);

      const result = await manager.validateAndApplyHostUrl(
        'https://evil.example.com',
        'https://brightchain.org',
      );

      expect(result).toBe(false);
      // Verify the setting was reverted
      const config = vscode.workspace.getConfiguration(
        'brightchainVfsExplorer',
      );
      expect(config.get('apiHostUrl', '')).toBe('https://brightchain.org');
    });

    it('treats malformed URLs as non-brightchain.org', async () => {
      mockWindow.showWarningMessage.mockResolvedValue(undefined);

      const result = await manager.validateAndApplyHostUrl(
        'not-a-url',
        'https://brightchain.org',
      );

      expect(result).toBe(false);
      expect(mockWindow.showWarningMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispose', () => {
    it('stops emitting events after dispose', () => {
      const listener = jest.fn();
      manager.onConfigChanged(listener);
      manager.dispose();

      mockWorkspace._fireConfigChange({
        affectsConfiguration: (section: string) =>
          section === 'brightchainVfsExplorer',
      });

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
