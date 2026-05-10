/**
 * StatusIndicator — manages a VS Code StatusBarItem that displays
 * the current BrightChain connection state.
 *
 * State rendering:
 *   - disconnected: "$(cloud) BrightChain: Disconnected", command = brightchain.login
 *   - connecting:   "$(sync~spin) BrightChain: Connecting..."
 *   - connected:    "$(cloud) BrightChain: Connected: {username}", context menu
 *   - error:        "$(error) BrightChain: Error"
 */

import * as vscode from 'vscode';
import type { AuthManager } from '../auth/auth-manager';
import type { ConnectionState, IAuthState } from '../auth/types';

/**
 * Render the status bar text for a given connection state.
 * Exported for testability.
 */
export function renderStatusText(
  state: ConnectionState,
  username?: string,
): string {
  switch (state) {
    case 'disconnected':
      return '$(cloud) BrightChain: Disconnected';
    case 'connecting':
      return '$(sync~spin) BrightChain: Connecting...';
    case 'connected':
      return username
        ? `$(cloud) BrightChain: Connected: ${username}`
        : '$(cloud) BrightChain: Connected';
    case 'error':
      return '$(error) BrightChain: Error';
  }
}

/**
 * Determine the click command for a given connection state.
 * Exported for testability.
 */
export function getStatusCommand(state: ConnectionState): string | undefined {
  switch (state) {
    case 'disconnected':
    case 'error':
      return 'brightchain.login';
    case 'connected':
      return 'brightchain.statusMenu';
    case 'connecting':
      return undefined;
  }
}

export class StatusIndicator extends vscode.Disposable {
  private readonly statusBarItem: vscode.StatusBarItem;
  private currentState: ConnectionState = 'disconnected';
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly auth: AuthManager) {
    super(() => this._dispose());

    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
    );

    // Listen for auth state changes
    this.disposables.push(
      auth.onAuthChanged((state) => this.updateState(state)),
    );

    // Set initial state
    this.setState('disconnected');
    this.statusBarItem.show();
  }

  /** React to AuthManager state changes. */
  private updateState(authState: IAuthState): void {
    if (authState.authenticated) {
      const username =
        authState.user?.displayName ?? authState.user?.username ?? undefined;
      this.setState('connected', username);
    } else {
      this.setState('disconnected');
    }
  }

  /** Programmatically set the connection state and update the status bar. */
  setState(state: ConnectionState, username?: string): void {
    this.currentState = state;
    this.statusBarItem.text = renderStatusText(state, username);
    this.statusBarItem.command = getStatusCommand(state);
  }

  /** Get the current connection state. */
  getState(): ConnectionState {
    return this.currentState;
  }

  private _dispose(): void {
    this.statusBarItem.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
