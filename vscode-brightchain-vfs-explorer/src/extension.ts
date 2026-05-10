/**
 * Extension entry point for the BrightChain VFS Explorer.
 *
 * Instantiates all components, registers providers and commands,
 * and restores the previous authentication session on activation.
 */

import * as vscode from 'vscode';
import { ApiClient } from './api/api-client';
import { AuthManager } from './auth/auth-manager';
import { TokenStore } from './auth/token-store';
import { BrightchainFSProvider } from './providers/fs-provider';
import { BrightchainTreeProvider } from './providers/tree-provider';
import { MetadataCache } from './services/metadata-cache';
import { SearchProvider } from './services/search-provider';
import { SettingsManager } from './services/settings-manager';
import { VersionPanel } from './services/version-panel';
import { LoginWebview } from './ui/login-webview';
import { ProgressReporter } from './ui/progress-reporter';
import { StatusIndicator } from './ui/status-indicator';

/**
 * Auth guard: checks if the user is authenticated. If not, prompts
 * login and returns false. Returns true when authenticated.
 *
 * Exported for testability (Property 20).
 */
export async function requireAuth(
  authManager: AuthManager,
  loginWebview: LoginWebview,
): Promise<boolean> {
  if (authManager.state.authenticated) {
    return true;
  }
  const choice = await vscode.window.showWarningMessage(
    'You must sign in to BrightChain before using this command.',
    'Sign In',
  );
  if (choice === 'Sign In') {
    loginWebview.show();
  }
  return false;
}

export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  // --- Core infrastructure ---
  const settingsManager = new SettingsManager();
  const tokenStore = new TokenStore(context.secrets);
  const authManager = new AuthManager(tokenStore, settingsManager);
  const apiClient = new ApiClient(settingsManager, authManager);
  const metadataCache = new MetadataCache();

  // Wire ApiClient as the IAuthApiDelegate on AuthManager
  authManager.setApiDelegate(apiClient);

  // --- Providers ---
  const treeProvider = new BrightchainTreeProvider(
    apiClient,
    authManager,
    metadataCache,
  );
  const fsProvider = new BrightchainFSProvider(apiClient, metadataCache);

  // --- UI components ---
  const statusIndicator = new StatusIndicator(authManager);
  const loginWebview = new LoginWebview(authManager);
  const searchProvider = new SearchProvider(apiClient);
  const versionPanel = new VersionPanel(apiClient);
  const progressReporter = new ProgressReporter();

  // --- Register providers ---
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider(
      'brightchain-explorer',
      treeProvider,
    ),
    vscode.workspace.registerFileSystemProvider('brightchain', fsProvider, {
      isCaseSensitive: true,
    }),
    settingsManager,
    statusIndicator,
    loginWebview,
    searchProvider,
    versionPanel,
    progressReporter,
    treeProvider,
  );

  // --- Register commands ---

  // Output channel for diagnostics
  const outputChannel = vscode.window.createOutputChannel('BrightChain VFS');
  context.subscriptions.push(outputChannel);

  // 1. brightchain.login — no auth guard
  context.subscriptions.push(
    vscode.commands.registerCommand('brightchain.login', () => {
      try {
        outputChannel.appendLine(
          '[login] Command triggered, calling loginWebview.show()',
        );
        loginWebview.show();
        outputChannel.appendLine('[login] loginWebview.show() completed');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        outputChannel.appendLine(`[login] ERROR: ${msg}`);
        vscode.window.showErrorMessage(`BrightChain login failed: ${msg}`);
      }
    }),
  );

  // 2. brightchain.logout
  context.subscriptions.push(
    vscode.commands.registerCommand('brightchain.logout', async () => {
      if (!(await requireAuth(authManager, loginWebview))) return;
      await authManager.logout();
      treeProvider.refresh();
      vscode.window.showInformationMessage('Signed out of BrightChain.');
    }),
  );

  // 3. brightchain.uploadFile
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'brightchain.uploadFile',
      async (item?: { itemId?: string }) => {
        if (!(await requireAuth(authManager, loginWebview))) return;

        const files = await vscode.window.showOpenDialog({
          canSelectMany: false,
          openLabel: 'Upload',
        });
        if (!files || files.length === 0) return;

        const fileUri = files[0];
        const content = await vscode.workspace.fs.readFile(fileUri);
        const fileName = fileUri.path.split('/').pop() ?? 'untitled';
        const targetFolderId = item?.itemId ?? 'root';

        try {
          await progressReporter.withProgress(
            'Uploading file...',
            async (report, token) => {
              const session = await apiClient.initUpload({
                fileName,
                fileSize: content.byteLength,
                mimeType: 'application/octet-stream',
                targetFolderId,
              });

              const chunkSize =
                session.chunkSize > 0 ? session.chunkSize : 1024 * 1024;
              const totalChunks =
                session.totalChunks > 0
                  ? session.totalChunks
                  : Math.max(1, Math.ceil(content.byteLength / chunkSize));

              const { createHash } = await import('crypto');

              for (let i = 0; i < totalChunks; i++) {
                if (token.isCancellationRequested) return;
                const start = i * chunkSize;
                const end = Math.min(start + chunkSize, content.byteLength);
                const chunk = content.slice(start, end);
                const checksum = createHash('sha256')
                  .update(chunk)
                  .digest('hex');
                await apiClient.uploadChunk(
                  session.sessionId,
                  i,
                  chunk,
                  checksum,
                );
                report((i + 1) / totalChunks, `Chunk ${i + 1}/${totalChunks}`);
              }

              await apiClient.finalizeUpload(session.sessionId);
            },
          );

          treeProvider.refresh();
          vscode.window.showInformationMessage(
            `Uploaded ${fileName} successfully.`,
          );
        } catch (err) {
          statusIndicator.setState('error');
          vscode.window.showErrorMessage(
            `Upload failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
    ),
  );

  // 4. brightchain.downloadFile
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'brightchain.downloadFile',
      async (item?: { itemId?: string; label?: string }) => {
        if (!(await requireAuth(authManager, loginWebview))) return;

        const fileId = item?.itemId;
        if (!fileId) {
          vscode.window.showErrorMessage('No file selected for download.');
          return;
        }

        const saveUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(item?.label ?? 'download'),
        });
        if (!saveUri) return;

        try {
          await progressReporter.withProgress(
            'Downloading file...',
            async (report) => {
              report(0.1, 'Fetching file content...');
              const content = await apiClient.getFileContent(fileId);
              report(0.9, 'Writing to disk...');
              await vscode.workspace.fs.writeFile(saveUri, content);
              report(1, 'Done');
            },
          );

          const openAction = await vscode.window.showInformationMessage(
            `Downloaded to ${saveUri.fsPath}`,
            'Open File',
          );
          if (openAction === 'Open File') {
            await vscode.commands.executeCommand('vscode.open', saveUri);
          }
        } catch (err) {
          statusIndicator.setState('error');
          vscode.window.showErrorMessage(
            `Download failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
    ),
  );

  // 5. brightchain.searchFiles
  context.subscriptions.push(
    vscode.commands.registerCommand('brightchain.searchFiles', async () => {
      if (!(await requireAuth(authManager, loginWebview))) return;
      try {
        await searchProvider.search();
      } catch (err) {
        statusIndicator.setState('error');
        vscode.window.showErrorMessage(
          `Search failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }),
  );

  // 6. brightchain.viewVersions
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'brightchain.viewVersions',
      async (item?: { itemId?: string }) => {
        if (!(await requireAuth(authManager, loginWebview))) return;

        const fileId = item?.itemId;
        if (!fileId) {
          vscode.window.showErrorMessage(
            'No file selected for version history.',
          );
          return;
        }

        try {
          await versionPanel.showVersions(fileId);
        } catch (err) {
          statusIndicator.setState('error');
          vscode.window.showErrorMessage(
            `Version history failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
    ),
  );

  // 7. brightchain.newFolder
  context.subscriptions.push(
    vscode.commands.registerCommand(
      'brightchain.newFolder',
      async (item?: { itemId?: string }) => {
        if (!(await requireAuth(authManager, loginWebview))) return;

        const folderName = await vscode.window.showInputBox({
          prompt: 'Enter new folder name',
          placeHolder: 'New Folder',
        });
        if (!folderName) return;

        const parentFolderId = item?.itemId ?? 'root';

        try {
          await apiClient.createFolder(parentFolderId, folderName);
          treeProvider.refresh();
          vscode.window.showInformationMessage(
            `Created folder "${folderName}".`,
          );
        } catch (err) {
          statusIndicator.setState('error');
          vscode.window.showErrorMessage(
            `Folder creation failed: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      },
    ),
  );

  // 8. brightchain.refreshExplorer
  context.subscriptions.push(
    vscode.commands.registerCommand('brightchain.refreshExplorer', async () => {
      if (!(await requireAuth(authManager, loginWebview))) return;
      metadataCache.invalidateAll();
      treeProvider.refresh();
    }),
  );

  // --- Restore session on activation ---
  await authManager.restoreSession();
}

export function deactivate(): void {
  // Cleanup handled by disposables pushed to context.subscriptions
}
