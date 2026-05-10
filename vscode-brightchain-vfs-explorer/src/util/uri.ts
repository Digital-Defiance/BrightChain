/**
 * URI parse/build helpers for the `brightchain://` URI scheme.
 *
 * Scheme layout:
 *   Files:   brightchain://files/{fileId}/{fileName}
 *   Folders: brightchain://folders/{folderId}/
 *   Root:    brightchain://folders/root/
 */

import * as vscode from 'vscode';

/** Parsed representation of a `brightchain://` URI. */
export interface IParsedBrightchainUri {
  type: 'file' | 'folder';
  /** UUID string (or `'root'` for the root folder). */
  id: string;
  /** Decoded file name for files; `undefined` for folders. */
  name?: string;
}

/**
 * Parse a `brightchain://` URI into its constituent parts.
 *
 * @param uri - A VS Code URI with scheme `brightchain`.
 * @returns The parsed type, id, and optional name.
 * @throws {Error} If the URI has no path segments (missing id).
 */
export function parseBrightchainUri(uri: vscode.Uri): IParsedBrightchainUri {
  const type = uri.authority === 'files' ? 'file' : 'folder';
  const segments = uri.path.split('/').filter((s) => s !== '');

  if (segments.length === 0) {
    throw new Error(
      `Invalid brightchain URI: missing id segment – ${uri.toString()}`,
    );
  }

  const id = segments[0];
  const name = segments[1] ? decodeURIComponent(segments[1]) : undefined;

  return { type, id, name };
}

/**
 * Build a `brightchain://files/{fileId}/{fileName}` URI.
 *
 * The file name is URI-encoded so that special characters survive the
 * round-trip through `vscode.Uri.parse` → `parseBrightchainUri`.
 */
export function toFileUri(fileId: string, fileName: string): vscode.Uri {
  // Build the URI structurally instead of parsing a string.
  // vscode.Uri.parse (and the URL constructor used in test mocks) applies
  // RFC 3986 path normalization which resolves '.' / '..' segments —
  // even percent-encoded ones — breaking filenames like "." or "..".
  // Using Uri.from avoids all path normalization.
  return vscode.Uri.from({
    scheme: 'brightchain',
    authority: 'files',
    path: `/${fileId}/${encodeURIComponent(fileName)}`,
  });
}

/**
 * Build a `brightchain://folders/{folderId}/` URI.
 *
 * Folder URIs always end with `/` to distinguish them from file URIs.
 */
export function toFolderUri(folderId: string): vscode.Uri {
  return vscode.Uri.parse(`brightchain://folders/${folderId}/`);
}
