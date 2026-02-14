import {
  DeferredHeadUpdate,
  IHeadRegistry,
} from '@brightchain/brightchain-lib';
import { promises as fs } from 'fs';
import { join } from 'path';

/**
 * Options for creating a PersistentHeadRegistry.
 */
export interface HeadRegistryOptions {
  /** Path to the directory where the registry file is stored */
  dataDir: string;
  /** File name for the registry (default: 'head-registry.json') */
  fileName?: string;
}

/**
 * In-memory HeadRegistry implementation.
 *
 * Preserves the existing HeadRegistry behavior (pure in-memory, no disk I/O)
 * while conforming to the IHeadRegistry interface. Mutating methods return
 * resolved Promises for interface compatibility with persistent implementations.
 *
 * Use `createIsolated()` for test scenarios that need an independent registry.
 */
export class InMemoryHeadRegistry implements IHeadRegistry {
  private readonly heads = new Map<string, string>();
  private readonly timestamps = new Map<string, Date>();
  private readonly deferred: DeferredHeadUpdate[] = [];

  private makeKey(dbName: string, collectionName: string): string {
    return `${dbName}:${collectionName}`;
  }

  getHead(dbName: string, collectionName: string): string | undefined {
    return this.heads.get(this.makeKey(dbName, collectionName));
  }

  async setHead(
    dbName: string,
    collectionName: string,
    blockId: string,
  ): Promise<void> {
    const key = this.makeKey(dbName, collectionName);
    this.heads.set(key, blockId);
    this.timestamps.set(key, new Date());
  }

  async removeHead(dbName: string, collectionName: string): Promise<void> {
    const key = this.makeKey(dbName, collectionName);
    this.heads.delete(key);
    this.timestamps.delete(key);
  }

  async clear(): Promise<void> {
    this.heads.clear();
    this.timestamps.clear();
    this.deferred.length = 0;
  }

  async load(): Promise<void> {
    // No-op for in-memory implementation
  }

  getAllHeads(): Map<string, string> {
    return new Map(this.heads);
  }

  getHeadTimestamp(dbName: string, collectionName: string): Date | undefined {
    return this.timestamps.get(this.makeKey(dbName, collectionName));
  }

  async mergeHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: Date,
  ): Promise<boolean> {
    const key = this.makeKey(dbName, collectionName);
    const localTimestamp = this.timestamps.get(key);

    // If no local head exists, or the remote timestamp is strictly newer, apply
    if (!localTimestamp || timestamp.getTime() > localTimestamp.getTime()) {
      this.heads.set(key, blockId);
      this.timestamps.set(key, timestamp);
      return true;
    }

    // Local is same age or newer — reject
    return false;
  }

  async deferHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: Date,
  ): Promise<void> {
    this.deferred.push({ dbName, collectionName, blockId, timestamp });
  }

  async applyDeferredUpdates(blockId: string): Promise<number> {
    let applied = 0;
    const remaining: DeferredHeadUpdate[] = [];

    for (const update of this.deferred) {
      if (update.blockId === blockId) {
        await this.mergeHeadUpdate(
          update.dbName,
          update.collectionName,
          update.blockId,
          update.timestamp,
        );
        applied++;
      } else {
        remaining.push(update);
      }
    }

    this.deferred.length = 0;
    this.deferred.push(...remaining);
    return applied;
  }

  getDeferredUpdates(): DeferredHeadUpdate[] {
    return [...this.deferred];
  }

  /**
   * Factory method that creates an independent InMemoryHeadRegistry instance.
   * Useful for tests that need isolated state.
   */
  static createIsolated(): InMemoryHeadRegistry {
    return new InMemoryHeadRegistry();
  }
}

/**
 * Persistent HeadRegistry that writes through to a JSON file on disk.
 *
 * The in-memory Map is the primary read path; disk is the persistence layer.
 * Every mutation (setHead, removeHead, clear) writes the full JSON to disk
 * before returning, ensuring durability across process restarts.
 *
 * File-level locking via `fs.open` with exclusive create prevents concurrent
 * write corruption when multiple processes share the same data directory.
 *
 * If the persisted file is missing or corrupt on load(), the registry starts
 * empty and logs a warning rather than crashing.
 */
export class PersistentHeadRegistry implements IHeadRegistry {
  private readonly heads = new Map<string, string>();
  private readonly timestamps = new Map<string, Date>();
  private readonly deferred: DeferredHeadUpdate[] = [];
  private readonly filePath: string;
  private readonly lockPath: string;

  constructor(options: HeadRegistryOptions) {
    this.filePath = join(
      options.dataDir,
      options.fileName ?? 'head-registry.json',
    );
    this.lockPath = this.filePath + '.lock';
  }

  private makeKey(dbName: string, collectionName: string): string {
    return `${dbName}:${collectionName}`;
  }

  getHead(dbName: string, collectionName: string): string | undefined {
    return this.heads.get(this.makeKey(dbName, collectionName));
  }

  async setHead(
    dbName: string,
    collectionName: string,
    blockId: string,
  ): Promise<void> {
    const key = this.makeKey(dbName, collectionName);
    this.heads.set(key, blockId);
    this.timestamps.set(key, new Date());
    await this.writeToDisk();
  }

  async removeHead(dbName: string, collectionName: string): Promise<void> {
    const key = this.makeKey(dbName, collectionName);
    this.heads.delete(key);
    this.timestamps.delete(key);
    await this.writeToDisk();
  }

  async clear(): Promise<void> {
    this.heads.clear();
    this.timestamps.clear();
    this.deferred.length = 0;
    await this.writeToDisk();
  }

  async load(): Promise<void> {
    try {
      const content = await fs.readFile(this.filePath, 'utf-8');
      const parsed: unknown = JSON.parse(content);

      if (
        parsed === null ||
        typeof parsed !== 'object' ||
        Array.isArray(parsed)
      ) {
        console.warn(
          `[PersistentHeadRegistry] Registry file is not a JSON object, starting empty: ${this.filePath}`,
        );
        this.heads.clear();
        this.timestamps.clear();
        return;
      }

      this.heads.clear();
      this.timestamps.clear();
      const record = parsed as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        if (typeof value === 'string') {
          // Legacy format: plain blockId string, no timestamp
          this.heads.set(key, value);
        } else if (
          value !== null &&
          typeof value === 'object' &&
          'blockId' in value &&
          typeof (value as Record<string, unknown>)['blockId'] === 'string'
        ) {
          // New format: { blockId, timestamp }
          const entry = value as Record<string, unknown>;
          this.heads.set(key, entry['blockId'] as string);
          if (typeof entry['timestamp'] === 'string') {
            this.timestamps.set(key, new Date(entry['timestamp']));
          }
        }
      }
    } catch (err: unknown) {
      const error = err as NodeJS.ErrnoException;
      if (error.code === 'ENOENT') {
        // File doesn't exist yet — start empty (not a warning)
        this.heads.clear();
        this.timestamps.clear();
        return;
      }
      console.warn(
        `[PersistentHeadRegistry] Failed to load registry file, starting empty: ${this.filePath}`,
        error.message ?? error,
      );
      this.heads.clear();
      this.timestamps.clear();
    }
  }

  getAllHeads(): Map<string, string> {
    return new Map(this.heads);
  }

  getHeadTimestamp(dbName: string, collectionName: string): Date | undefined {
    return this.timestamps.get(this.makeKey(dbName, collectionName));
  }

  async mergeHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: Date,
  ): Promise<boolean> {
    const key = this.makeKey(dbName, collectionName);
    const localTimestamp = this.timestamps.get(key);

    // If no local head exists, or the remote timestamp is strictly newer, apply
    if (!localTimestamp || timestamp.getTime() > localTimestamp.getTime()) {
      this.heads.set(key, blockId);
      this.timestamps.set(key, timestamp);
      await this.writeToDisk();
      return true;
    }

    // Local is same age or newer — reject
    return false;
  }

  async deferHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: Date,
  ): Promise<void> {
    this.deferred.push({ dbName, collectionName, blockId, timestamp });
  }

  async applyDeferredUpdates(blockId: string): Promise<number> {
    let applied = 0;
    const remaining: DeferredHeadUpdate[] = [];

    for (const update of this.deferred) {
      if (update.blockId === blockId) {
        await this.mergeHeadUpdate(
          update.dbName,
          update.collectionName,
          update.blockId,
          update.timestamp,
        );
        applied++;
      } else {
        remaining.push(update);
      }
    }

    this.deferred.length = 0;
    this.deferred.push(...remaining);
    return applied;
  }

  getDeferredUpdates(): DeferredHeadUpdate[] {
    return [...this.deferred];
  }

  /**
   * Write the current in-memory state to disk with file-level locking.
   *
   * Locking strategy: create a `.lock` file with exclusive flag (`wx`).
   * If the lock file already exists, retry with a short delay.
   * The lock file is always removed after writing, even on error.
   */
  private async writeToDisk(): Promise<void> {
    await this.acquireLock();
    try {
      const data: Record<string, { blockId: string; timestamp?: string }> = {};
      for (const [key, value] of this.heads) {
        const ts = this.timestamps.get(key);
        data[key] = {
          blockId: value,
          ...(ts ? { timestamp: ts.toISOString() } : {}),
        };
      }
      const json = JSON.stringify(data, null, 2);
      // Write to a temp file then rename for atomicity
      const tmpPath = this.filePath + '.tmp';
      await fs.writeFile(tmpPath, json, 'utf-8');
      await fs.rename(tmpPath, this.filePath);
    } finally {
      await this.releaseLock();
    }
  }

  private async acquireLock(maxRetries = 50, retryDelayMs = 20): Promise<void> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const handle = await fs.open(this.lockPath, 'wx');
        await handle.close();
        return;
      } catch (err: unknown) {
        const error = err as NodeJS.ErrnoException;
        if (error.code === 'EEXIST') {
          // Lock held by another writer — wait and retry
          await this.delay(retryDelayMs);
          continue;
        }
        throw error;
      }
    }
    // If we exhausted retries, force-remove stale lock and try once more
    try {
      await fs.unlink(this.lockPath);
    } catch {
      // Ignore — lock may have been released between check and unlink
    }
    const handle = await fs.open(this.lockPath, 'wx');
    await handle.close();
  }

  private async releaseLock(): Promise<void> {
    try {
      await fs.unlink(this.lockPath);
    } catch {
      // Ignore — lock file may already be gone
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Factory method that creates a PersistentHeadRegistry for the given directory.
   * Useful for tests that need an isolated persistent registry.
   */
  static create(options: HeadRegistryOptions): PersistentHeadRegistry {
    return new PersistentHeadRegistry(options);
  }
}
