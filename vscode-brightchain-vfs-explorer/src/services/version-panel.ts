/**
 * VersionPanel — displays file version history in a VS Code QuickPick.
 *
 * Fetches versions via ApiClient.getVersions, displays them with
 * version number, timestamp, uploader, and size. Destroyed versions
 * are marked as unavailable.
 */

import * as vscode from 'vscode';
import type { ApiClient } from '../api/api-client';
import type { IFileVersionDTO } from '../api/types';

/**
 * Format a file size in bytes to a human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format a date value to a human-readable timestamp string.
 */
export function formatTimestamp(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

export interface IVersionQuickPickItem extends vscode.QuickPickItem {
  versionId: string;
  versionNumber: number;
  isDestroyed: boolean;
}

/**
 * Convert a file version DTO to a QuickPick item.
 * Exported for testability (Property 22).
 */
export function versionToQuickPickItem(
  version: IFileVersionDTO,
): IVersionQuickPickItem {
  const isDestroyed = version.vaultState === 'destroyed';
  const timestamp = formatTimestamp(version.createdAt);
  const size = formatFileSize(version.sizeBytes);

  const label = isDestroyed
    ? `$(trash) v${version.versionNumber} — Destroyed`
    : `v${version.versionNumber}`;

  const description = `${timestamp} | ${size} | Uploader: ${version.uploaderId}`;

  return {
    label,
    description,
    detail: isDestroyed
      ? 'This version has been permanently destroyed and cannot be restored.'
      : undefined,
    versionId: version.id,
    versionNumber: version.versionNumber,
    isDestroyed,
  };
}

export class VersionPanel extends vscode.Disposable {
  constructor(private readonly api: ApiClient) {
    super(() => {
      /* no-op */
    });
  }

  /**
   * Show version history for a file in a QuickPick.
   */
  async showVersions(fileId: string): Promise<void> {
    const versions = await this.api.getVersions(fileId);

    if (versions.length === 0) {
      vscode.window.showInformationMessage(
        'No version history available for this file.',
      );
      return;
    }

    const items = versions.map(versionToQuickPickItem);

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a version to restore or download',
    });

    if (!selected || selected.isDestroyed) {
      return;
    }

    // Show action picker for the selected version
    const action = await vscode.window.showQuickPick(
      [
        { label: '$(history) Restore', action: 'restore' as const },
        { label: '$(cloud-download) Download', action: 'download' as const },
      ],
      { placeHolder: `Action for v${selected.versionNumber}` },
    );

    if (!action) {
      return;
    }

    if (action.action === 'restore') {
      await this.api.restoreVersion(fileId, selected.versionId);
      vscode.window.showInformationMessage(
        `Restored to version ${selected.versionNumber}.`,
      );
    }
    // Download action would be handled by the command handler
  }
}
