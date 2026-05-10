/**
 * BrightchainTreeProvider — TreeDataProvider for the BrightChain explorer sidebar.
 *
 * Fetches folder contents from the API when authenticated, maps them to
 * BrightchainTreeItem instances, and populates MetadataCache with
 * [name, FileType] tuples for the FSProvider. Listens for auth state
 * changes to refresh the tree automatically.
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../api/api-client';
import type { AuthManager } from '../auth/auth-manager';
import type { MetadataCache } from '../services/metadata-cache';
import { BrightchainTreeItem } from './tree-item';

/** Default folder ID used when fetching the root of the tree. */
const ROOT_FOLDER_ID = 'root';

export class BrightchainTreeProvider
  implements vscode.TreeDataProvider<BrightchainTreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    BrightchainTreeItem | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private readonly _authDisposable: vscode.Disposable;

  constructor(
    private readonly api: ApiClient,
    private readonly auth: AuthManager,
    private readonly cache: MetadataCache,
  ) {
    this._authDisposable = auth.onAuthChanged(() =>
      this._onDidChangeTreeData.fire(undefined),
    );
  }

  getTreeItem(element: BrightchainTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: BrightchainTreeItem,
  ): Promise<BrightchainTreeItem[]> {
    if (!this.auth.state.authenticated) {
      return [];
    }

    const folderId =
      element?.itemType === 'folder' ? element.itemId : ROOT_FOLDER_ID;

    try {
      const contents = await this.api.getFolderContents(folderId);

      // Populate MetadataCache with [name, FileType] tuples for FSProvider
      const tuples: [string, vscode.FileType][] = [
        ...contents.folders.map(
          (f) =>
            [f.name, vscode.FileType.Directory] as [string, vscode.FileType],
        ),
        ...contents.files.map(
          (f) =>
            [f.fileName, vscode.FileType.File] as [string, vscode.FileType],
        ),
      ];
      this.cache.setDirContents(folderId, tuples);

      // Map DTOs to tree items (folders first, then files)
      const items: BrightchainTreeItem[] = [
        ...contents.folders.map(
          (f) =>
            new BrightchainTreeItem(
              'folder',
              f.id,
              f.name,
              undefined,
              folderId,
            ),
        ),
        ...contents.files.map(
          (f) =>
            new BrightchainTreeItem(
              'file',
              f.id,
              f.fileName,
              f.mimeType,
              folderId,
            ),
        ),
      ];

      return items;
    } catch {
      // On error (network, auth, etc.) return empty to avoid breaking the tree
      return [];
    }
  }

  getParent(
    _element: BrightchainTreeItem,
  ): vscode.ProviderResult<BrightchainTreeItem> {
    // Flat parent tracking not needed for basic implementation
    return undefined;
  }

  /** Refresh a specific folder or the entire tree. */
  refresh(element?: BrightchainTreeItem): void {
    this._onDidChangeTreeData.fire(element);
  }

  /** Dispose of event listeners. */
  dispose(): void {
    this._authDisposable.dispose();
    this._onDidChangeTreeData.dispose();
  }
}
