import * as vscode from 'vscode';

/**
 * A cache entry wrapping data with an expiration timestamp.
 */
export interface ICacheEntry<T> {
  data: T;
  expiresAt: number; // Date.now() + ttlMs
}

/**
 * TTL-based cache for file metadata (FileStat) and directory contents.
 * Reduces redundant API calls for repeated stat/readDirectory operations.
 */
export class MetadataCache {
  private readonly ttlMs: number;
  private readonly fileStats = new Map<string, ICacheEntry<vscode.FileStat>>();
  private readonly dirContents = new Map<
    string,
    ICacheEntry<[string, vscode.FileType][]>
  >();

  constructor(ttlMs = 30_000) {
    this.ttlMs = ttlMs;
  }

  getFileStat(fileId: string): vscode.FileStat | undefined {
    const entry = this.fileStats.get(fileId);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.fileStats.delete(fileId);
      return undefined;
    }
    return entry.data;
  }

  setFileStat(fileId: string, stat: vscode.FileStat): void {
    this.fileStats.set(fileId, {
      data: stat,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  getDirContents(folderId: string): [string, vscode.FileType][] | undefined {
    const entry = this.dirContents.get(folderId);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.dirContents.delete(folderId);
      return undefined;
    }
    return entry.data;
  }

  setDirContents(
    folderId: string,
    contents: [string, vscode.FileType][],
  ): void {
    this.dirContents.set(folderId, {
      data: contents,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  /** Remove a specific entry from both caches. */
  invalidate(id: string): void {
    this.fileStats.delete(id);
    this.dirContents.delete(id);
  }

  /** Clear all cached entries. */
  invalidateAll(): void {
    this.fileStats.clear();
    this.dirContents.clear();
  }
}
