/**
 * SettingsManager — reads and validates extension configuration.
 *
 * Exposes the `apiHostUrl` setting and emits `onConfigChanged` when
 * the `brightchainVfsExplorer` configuration section changes.
 *
 * Non-brightchain.org hostnames trigger a warning confirmation dialog;
 * dismissing the warning reverts the setting to its previous value.
 */

import * as vscode from 'vscode';

const CONFIG_SECTION = 'brightchainVfsExplorer';
const DEFAULT_HOST_URL = 'https://brightchain.org';

export class SettingsManager extends vscode.Disposable {
  private readonly _onConfigChanged = new vscode.EventEmitter<void>();
  readonly onConfigChanged: vscode.Event<void> = this._onConfigChanged.event;

  private readonly _disposables: vscode.Disposable[] = [];

  constructor() {
    super(() => this._dispose());

    const sub = vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration(CONFIG_SECTION)) {
        this._onConfigChanged.fire();
      }
    });
    this._disposables.push(sub);
  }

  /** Current API host URL from user settings (or the default). */
  get apiHostUrl(): string {
    return vscode.workspace
      .getConfiguration(CONFIG_SECTION)
      .get<string>('apiHostUrl', DEFAULT_HOST_URL);
  }

  /**
   * Validate a new host URL. If the hostname is not `brightchain.org`,
   * show a warning and ask the user to confirm. On dismiss, revert to
   * `previousUrl` and return `false`. On confirm, return `true`.
   *
   * URLs whose hostname *is* `brightchain.org` are accepted silently.
   */
  async validateAndApplyHostUrl(
    newUrl: string,
    previousUrl: string,
  ): Promise<boolean> {
    let hostname: string;
    try {
      hostname = new URL(newUrl).hostname;
    } catch {
      // Malformed URL — treat as non-brightchain.org
      hostname = '';
    }

    if (hostname === 'brightchain.org') {
      return true;
    }

    const confirm = 'Continue';
    const choice = await vscode.window.showWarningMessage(
      `You are connecting to a non-default API host: ${newUrl}. This may be unsafe.`,
      confirm,
    );

    if (choice === confirm) {
      return true;
    }

    // User dismissed — revert the setting
    await vscode.workspace
      .getConfiguration(CONFIG_SECTION)
      .update('apiHostUrl', previousUrl, vscode.ConfigurationTarget.Global);

    return false;
  }

  private _dispose(): void {
    this._onConfigChanged.dispose();
    for (const d of this._disposables) {
      d.dispose();
    }
    this._disposables.length = 0;
  }
}
