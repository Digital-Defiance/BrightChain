/**
 * LoginWebview — manages a VS Code WebviewPanel for authentication.
 *
 * Supports mnemonic direct-challenge and password login flows.
 * Communicates with the extension host via postMessage / onDidReceiveMessage.
 * The webview does NOT make direct HTTP requests.
 */

import * as vscode from 'vscode';
import type { AuthManager } from '../auth/auth-manager';
import type { HostToWebviewMessage, WebviewToHostMessage } from '../auth/types';
import { sanitizeErrorMessage } from '../util/error-sanitizer';

/**
 * Validate a mnemonic login form submission.
 * Returns an error message if invalid, or null if valid.
 * Exported for testability (Property 23).
 */
export function validateMnemonicForm(
  mnemonic: string,
  username?: string,
  email?: string,
): string | null {
  if (!mnemonic || mnemonic.trim().length === 0) {
    return 'Mnemonic phrase is required';
  }
  if (
    (!username || username.trim().length === 0) &&
    (!email || email.trim().length === 0)
  ) {
    return 'Username or email is required';
  }
  return null;
}

/**
 * Validate a password login form submission.
 * Returns an error message if invalid, or null if valid.
 * Exported for testability (Property 23).
 */
export function validatePasswordForm(
  usernameOrEmail: string,
  password: string,
): string | null {
  if (!usernameOrEmail || usernameOrEmail.trim().length === 0) {
    return 'Username or email is required';
  }
  if (!password || password.length === 0) {
    return 'Password is required';
  }
  return null;
}

export class LoginWebview extends vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];

  constructor(private readonly auth: AuthManager) {
    super(() => this._dispose());
  }

  /** Open or reveal the login webview panel. */
  show(): void {
    if (this.panel) {
      this.panel.reveal?.();
      return;
    }

    try {
      this.panel = vscode.window.createWebviewPanel(
        'brightchain-login',
        'BrightChain Login',
        vscode.ViewColumn.One,
        { enableScripts: true },
      );
    } catch (err) {
      vscode.window.showErrorMessage(
        `Failed to create webview panel: ${err instanceof Error ? err.message : String(err)}`,
      );
      return;
    }

    this.panel.webview.html = this.getHtmlContent();

    // Listen for messages from the webview
    this.disposables.push(
      this.panel.webview.onDidReceiveMessage((msg: WebviewToHostMessage) =>
        this.handleMessage(msg),
      ),
    );

    // Clean up when panel is closed
    this.disposables.push(
      this.panel.onDidDispose(() => {
        this.panel = undefined;
      }),
    );
  }

  /** Close the login panel. */
  close(): void {
    this.panel?.dispose();
    this.panel = undefined;
  }

  /** Send a message to the webview. */
  private postMessage(msg: HostToWebviewMessage): void {
    this.panel?.webview.postMessage(msg);
  }

  /** Handle messages from the webview. */
  private async handleMessage(msg: WebviewToHostMessage): Promise<void> {
    switch (msg.type) {
      case 'mnemonic-login': {
        const error = validateMnemonicForm(
          msg.mnemonic,
          msg.username,
          msg.email,
        );
        if (error) {
          this.postMessage({ type: 'login-error', message: error });
          return;
        }
        this.postMessage({ type: 'loading', loading: true });
        try {
          await this.auth.mnemonicLogin(msg.mnemonic, msg.username, msg.email);
          this.postMessage({ type: 'login-success' });
          this.close();
        } catch (err) {
          this.postMessage({
            type: 'login-error',
            message: sanitizeErrorMessage(err),
          });
        }
        break;
      }

      case 'password-login': {
        const error = validatePasswordForm(msg.usernameOrEmail, msg.password);
        if (error) {
          this.postMessage({ type: 'login-error', message: error });
          return;
        }
        this.postMessage({ type: 'loading', loading: true });
        try {
          await this.auth.passwordLogin(msg.usernameOrEmail, msg.password);
          this.postMessage({ type: 'login-success' });
          this.close();
        } catch (err) {
          this.postMessage({
            type: 'login-error',
            message: sanitizeErrorMessage(err),
          });
        }
        break;
      }

      case 'cancel':
        this.close();
        break;
    }
  }

  /** Generate the HTML content for the webview. */
  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BrightChain Login</title>
  <style>
    body {
      font-family: var(--vscode-font-family, sans-serif);
      color: var(--vscode-foreground, #ccc);
      background: var(--vscode-editor-background, #1e1e1e);
      padding: 20px;
      margin: 0;
    }
    .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
    .tab {
      padding: 8px 16px;
      cursor: pointer;
      border: 1px solid var(--vscode-button-border, #555);
      background: transparent;
      color: var(--vscode-foreground, #ccc);
      border-radius: 4px;
    }
    .tab.active {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
    }
    .form-group { margin-bottom: 12px; }
    label { display: block; margin-bottom: 4px; font-size: 13px; }
    input, textarea {
      width: 100%;
      padding: 6px 8px;
      box-sizing: border-box;
      background: var(--vscode-input-background, #3c3c3c);
      color: var(--vscode-input-foreground, #ccc);
      border: 1px solid var(--vscode-input-border, #555);
      border-radius: 3px;
      font-size: 13px;
    }
    textarea { resize: vertical; min-height: 80px; }
    .error { color: var(--vscode-errorForeground, #f44); font-size: 12px; margin-top: 4px; }
    .btn {
      padding: 8px 20px;
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #fff);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
    }
    .btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .hidden { display: none; }
    .loading { text-align: center; padding: 20px; }
    .spinner { display: inline-block; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <h2>BrightChain Login</h2>

  <div class="tabs">
    <button class="tab active" data-tab="mnemonic" onclick="switchTab('mnemonic')">Login with Mnemonic</button>
    <button class="tab" data-tab="password" onclick="switchTab('password')">Login with Password</button>
  </div>

  <form id="mnemonic-form" onsubmit="submitMnemonic(event)">
    <div class="form-group">
      <label for="mnemonic">Mnemonic Phrase</label>
      <textarea id="mnemonic" placeholder="Enter your BIP-39 mnemonic phrase..." required></textarea>
      <div id="mnemonic-error" class="error hidden"></div>
    </div>
    <div class="form-group">
      <label for="mn-username">Username (optional if email provided)</label>
      <input type="text" id="mn-username" placeholder="Username" />
    </div>
    <div class="form-group">
      <label for="mn-email">Email (optional if username provided)</label>
      <input type="email" id="mn-email" placeholder="Email" />
    </div>
    <div id="mn-identity-error" class="error hidden"></div>
    <button type="submit" class="btn" id="mn-submit">Login with Mnemonic</button>
  </form>

  <form id="password-form" class="hidden" onsubmit="submitPassword(event)">
    <div class="form-group">
      <label for="pw-username">Username or Email</label>
      <input type="text" id="pw-username" placeholder="Username or email" required />
      <div id="pw-username-error" class="error hidden"></div>
    </div>
    <div class="form-group">
      <label for="pw-password">Password</label>
      <input type="password" id="pw-password" placeholder="Password" required />
      <div id="pw-password-error" class="error hidden"></div>
    </div>
    <button type="submit" class="btn" id="pw-submit">Login with Password</button>
  </form>

  <div id="loading" class="loading hidden">
    <span class="spinner">&#x27F3;</span> Authenticating...
  </div>

  <div id="global-error" class="error hidden" style="margin-top: 16px;"></div>

  <script>
    const vscode = acquireVsCodeApi();

    function switchTab(tab) {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelector('[data-tab="' + tab + '"]').classList.add('active');
      document.getElementById('mnemonic-form').classList.toggle('hidden', tab !== 'mnemonic');
      document.getElementById('password-form').classList.toggle('hidden', tab !== 'password');
      clearErrors();
    }

    function clearErrors() {
      document.querySelectorAll('.error').forEach(e => { e.textContent = ''; e.classList.add('hidden'); });
    }

    function showError(id, msg) {
      const el = document.getElementById(id);
      if (el) { el.textContent = msg; el.classList.remove('hidden'); }
    }

    function setLoading(loading) {
      document.getElementById('loading').classList.toggle('hidden', !loading);
      document.getElementById('mn-submit').disabled = loading;
      document.getElementById('pw-submit').disabled = loading;
    }

    function submitMnemonic(e) {
      e.preventDefault();
      clearErrors();
      const mnemonic = document.getElementById('mnemonic').value.trim();
      const username = document.getElementById('mn-username').value.trim();
      const email = document.getElementById('mn-email').value.trim();
      if (!mnemonic) { showError('mnemonic-error', 'Mnemonic phrase is required'); return; }
      if (!username && !email) { showError('mn-identity-error', 'Username or email is required'); return; }
      vscode.postMessage({ type: 'mnemonic-login', mnemonic, username: username || undefined, email: email || undefined });
    }

    function submitPassword(e) {
      e.preventDefault();
      clearErrors();
      const usernameOrEmail = document.getElementById('pw-username').value.trim();
      const password = document.getElementById('pw-password').value;
      if (!usernameOrEmail) { showError('pw-username-error', 'Username or email is required'); return; }
      if (!password) { showError('pw-password-error', 'Password is required'); return; }
      vscode.postMessage({ type: 'password-login', usernameOrEmail, password });
    }

    window.addEventListener('message', event => {
      const msg = event.data;
      switch (msg.type) {
        case 'login-success':
          setLoading(false);
          break;
        case 'login-error':
          setLoading(false);
          showError('global-error', msg.message || 'Login failed');
          break;
        case 'loading':
          setLoading(msg.loading);
          break;
      }
    });
  </script>
</body>
</html>`;
  }

  private _dispose(): void {
    this.panel?.dispose();
    for (const d of this.disposables) {
      d.dispose();
    }
  }
}
