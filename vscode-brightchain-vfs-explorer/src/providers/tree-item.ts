/**
 * BrightchainTreeItem — custom TreeItem for the BrightChain explorer sidebar.
 *
 * File items open via `brightchain://` URI when clicked.
 * Folder items are collapsible and expand to show children.
 * Both set `contextValue` for VS Code context menu contributions.
 */

import * as vscode from 'vscode';
import { toFileUri } from '../util/uri';

export class BrightchainTreeItem extends vscode.TreeItem {
  constructor(
    public readonly itemType: 'file' | 'folder',
    public readonly itemId: string,
    public override readonly label: string,
    public readonly mimeType?: string,
    public readonly parentFolderId?: string,
  ) {
    super(
      label,
      itemType === 'folder'
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None,
    );

    if (itemType === 'file') {
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [toFileUri(itemId, label)],
      };
      this.contextValue = 'brightchain-file';
    } else {
      this.contextValue = 'brightchain-folder';
    }
  }
}
