/**
 * BrightchainFSProvider — FileSystemProvider for the `brightchain://` URI scheme.
 *
 * Maps VS Code file-system operations (stat, readFile, writeFile, delete,
 * rename, createDirectory, readDirectory) to Digital Burnbag API calls via
 * ApiClient. Uses MetadataCache to reduce redundant API calls for stat and
 * readDirectory. Fires onDidChangeFile events so the tree and open editors
 * stay synchronized.
 */

import { createHash } from 'crypto';
import * as vscode from 'vscode';
import type { ApiClient } from '../api/api-client';
import type { MetadataCache } from '../services/metadata-cache';
import { parseBrightchainUri } from '../util/uri';

/** Default chunk size for uploads: 1 MB */
const DEFAULT_CHUNK_SIZE = 1024 * 1024;

export class BrightchainFSProvider implements vscode.FileSystemProvider {
  private readonly _onDidChangeFile = new vscode.EventEmitter<
    vscode.FileChangeEvent[]
  >();
  readonly onDidChangeFile = this._onDidChangeFile.event;

  constructor(
    private readonly api: ApiClient,
    private readonly cache: MetadataCache,
  ) {}

  // -------------------------------------------------------------------------
  // watch — no-op, return disposable that does nothing
  // -------------------------------------------------------------------------

  watch(_uri: vscode.Uri): vscode.Disposable {
    return new vscode.Disposable(() => {
      /* no-op */
    });
  }

  // -------------------------------------------------------------------------
  // stat — return FileStat for a file or folder
  // -------------------------------------------------------------------------

  async stat(uri: vscode.Uri): Promise<vscode.FileStat> {
    const parsed = parseBrightchainUri(uri);

    // Check cache first
    const cached = this.cache.getFileStat(parsed.id);
    if (cached) {
      return cached;
    }

    if (parsed.type === 'folder') {
      // For folders, fetch contents to confirm existence and build a stat
      const contents = await this.api.getFolderContents(parsed.id);
      // Use the first folder's metadata if available, otherwise synthesize
      const stat: vscode.FileStat = {
        type: vscode.FileType.Directory,
        ctime: 0,
        mtime: 0,
        size: 0,
      };
      // Cache the directory contents while we're at it
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
      this.cache.setDirContents(parsed.id, tuples);
      this.cache.setFileStat(parsed.id, stat);
      return stat;
    }

    // File — fetch metadata from API
    const meta = await this.api.getFileMetadata(parsed.id);
    const stat: vscode.FileStat = {
      type: vscode.FileType.File,
      ctime: new Date(meta.createdAt).getTime(),
      mtime: new Date(meta.updatedAt).getTime(),
      size: meta.sizeBytes,
    };
    this.cache.setFileStat(parsed.id, stat);
    return stat;
  }

  // -------------------------------------------------------------------------
  // readDirectory — return [name, FileType] tuples for a folder
  // -------------------------------------------------------------------------

  async readDirectory(uri: vscode.Uri): Promise<[string, vscode.FileType][]> {
    const parsed = parseBrightchainUri(uri);

    // Check cache first
    const cached = this.cache.getDirContents(parsed.id);
    if (cached) {
      return cached;
    }

    const contents = await this.api.getFolderContents(parsed.id);
    const tuples: [string, vscode.FileType][] = [
      ...contents.folders.map(
        (f) => [f.name, vscode.FileType.Directory] as [string, vscode.FileType],
      ),
      ...contents.files.map(
        (f) => [f.fileName, vscode.FileType.File] as [string, vscode.FileType],
      ),
    ];
    this.cache.setDirContents(parsed.id, tuples);
    return tuples;
  }

  // -------------------------------------------------------------------------
  // readFile — fetch binary content from API
  // -------------------------------------------------------------------------

  async readFile(uri: vscode.Uri): Promise<Uint8Array> {
    const parsed = parseBrightchainUri(uri);
    return this.api.getFileContent(parsed.id);
  }

  // -------------------------------------------------------------------------
  // writeFile — chunked upload flow: init → chunks → finalize
  // -------------------------------------------------------------------------

  async writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    _options: { create: boolean; overwrite: boolean },
  ): Promise<void> {
    const parsed = parseBrightchainUri(uri);
    const fileName = parsed.name ?? 'untitled';
    const mimeType = 'application/octet-stream';
    // Use the folder from the URI authority or default to 'root'
    const targetFolderId = parsed.type === 'folder' ? parsed.id : 'root';

    // 1. Init upload session
    const session = await this.api.initUpload({
      fileName,
      fileSize: content.byteLength,
      mimeType,
      targetFolderId,
    });

    const chunkSize =
      session.chunkSize > 0 ? session.chunkSize : DEFAULT_CHUNK_SIZE;
    const totalChunks =
      session.totalChunks > 0
        ? session.totalChunks
        : Math.max(1, Math.ceil(content.byteLength / chunkSize));

    // 2. Upload chunks
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, content.byteLength);
      const chunk = content.slice(start, end);

      const checksum = createHash('sha256').update(chunk).digest('hex');
      await this.api.uploadChunk(session.sessionId, i, chunk, checksum);
    }

    // 3. Finalize
    await this.api.finalizeUpload(session.sessionId);

    // Invalidate cache for the parent folder
    this.cache.invalidate(targetFolderId);
    this.cache.invalidate(parsed.id);

    // Fire change event
    this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  // -------------------------------------------------------------------------
  // delete — call API, fire onDidChangeFile
  // -------------------------------------------------------------------------

  async delete(
    uri: vscode.Uri,
    _options: { recursive: boolean },
  ): Promise<void> {
    const parsed = parseBrightchainUri(uri);
    await this.api.deleteFile(parsed.id);

    this.cache.invalidate(parsed.id);

    this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Deleted, uri }]);
  }

  // -------------------------------------------------------------------------
  // rename — move or rename via API, fire onDidChangeFile
  // -------------------------------------------------------------------------

  async rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    _options: { overwrite: boolean },
  ): Promise<void> {
    const oldParsed = parseBrightchainUri(oldUri);
    const newParsed = parseBrightchainUri(newUri);

    // If the parent folder changed, move the item
    if (oldParsed.id !== newParsed.id && newParsed.type === 'folder') {
      await this.api.moveItem(oldParsed.id, newParsed.id);
    } else if (newParsed.name && newParsed.name !== oldParsed.name) {
      // Rename via updateFile
      await this.api.updateFile(oldParsed.id, { fileName: newParsed.name });
    }

    this.cache.invalidate(oldParsed.id);
    this.cache.invalidate(newParsed.id);

    this._onDidChangeFile.fire([
      { type: vscode.FileChangeType.Deleted, uri: oldUri },
      { type: vscode.FileChangeType.Created, uri: newUri },
    ]);
  }

  // -------------------------------------------------------------------------
  // createDirectory — create folder via API, fire onDidChangeFile
  // -------------------------------------------------------------------------

  async createDirectory(uri: vscode.Uri): Promise<void> {
    const parsed = parseBrightchainUri(uri);
    const folderName = parsed.name ?? parsed.id;
    // The parent folder is encoded in the URI path; for simplicity
    // we use 'root' as the parent when creating from a folder URI
    const parentFolderId = 'root';

    await this.api.createFolder(parentFolderId, folderName);

    this.cache.invalidate(parentFolderId);

    this._onDidChangeFile.fire([{ type: vscode.FileChangeType.Created, uri }]);
  }
}
