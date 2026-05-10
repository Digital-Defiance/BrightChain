/**
 * SearchProvider — integrates with the Digital Burnbag search API
 * and presents results in a VS Code QuickPick.
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../api/api-client';
import type { IFileMetadataDTO, ISearchFilters } from '../api/types';
import { toFileUri } from '../util/uri';

/**
 * Convert a file metadata DTO to a QuickPick item.
 * Exported for testability.
 */
export function fileToQuickPickItem(
  file: IFileMetadataDTO,
): vscode.QuickPickItem & { fileId: string } {
  return {
    label: file.fileName,
    description: file.mimeType,
    detail: `ID: ${file.id}`,
    fileId: file.id,
  };
}

export class SearchProvider extends vscode.Disposable {
  constructor(private readonly api: ApiClient) {
    super(() => {
      /* no-op */
    });
  }

  /**
   * Show a QuickPick search interface.
   * The user types a query, results are fetched and displayed.
   * Selecting a result opens the file.
   */
  async search(filters?: ISearchFilters): Promise<void> {
    const query = await vscode.window.showInputBox({
      prompt: 'Search BrightChain files',
      placeHolder: 'Enter search query...',
    });

    if (!query) {
      return;
    }

    const results = await this.api.searchFiles(query, filters);

    if (results.results.length === 0) {
      vscode.window.showInformationMessage(
        'No files found matching your query.',
      );
      return;
    }

    const items = results.results.map(fileToQuickPickItem);

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: `Found ${results.totalCount} result(s)`,
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      const uri = toFileUri(selected.fileId, selected.label);
      await vscode.commands.executeCommand('vscode.open', uri);
    }
  }
}
