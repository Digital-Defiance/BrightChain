/**
 * In-memory HeadRegistry implementation.
 *
 * Preserves the existing HeadRegistry behavior (pure in-memory, no disk I/O)
 * while conforming to the IHeadRegistry interface. Mutating methods return
 * resolved Promises for interface compatibility with persistent implementations.
 *
 * Use `createIsolated()` for test scenarios that need an independent registry.
 */
import type {
  DeferredHeadUpdate,
  IHeadRegistry,
} from '../interfaces/storage/headRegistry';
import type { HeadRecord } from '../interfaces/storage/headRegistryDriver';

export class InMemoryHeadRegistry implements IHeadRegistry {
  private readonly heads = new Map<string, string>();
  private readonly timestamps = new Map<string, Date>();
  private readonly deferred: DeferredHeadUpdate[] = [];
  private readonly changeListeners = new Map<
    string,
    Set<(blockId: string) => void>
  >();

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
      this.notifyHeadChange(key, blockId);
      return true;
    }

    // Local is same age or newer — reject
    return false;
  }

  private notifyHeadChange(key: string, blockId: string): void {
    const listeners = this.changeListeners.get(key);
    if (listeners) {
      for (const cb of listeners) {
        cb(blockId);
      }
    }
  }

  onHeadChange(
    dbName: string,
    collectionName: string,
    callback: (blockId: string) => void,
  ): () => void {
    const key = this.makeKey(dbName, collectionName);
    if (!this.changeListeners.has(key)) {
      this.changeListeners.set(key, new Set());
    }

    this.changeListeners.get(key)!.add(callback);
    return () => {
      this.changeListeners.get(key)?.delete(callback);
    };
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

  exportSnapshot(): ReadonlyMap<string, HeadRecord> {
    const result = new Map<string, HeadRecord>();
    for (const [key, blockId] of this.heads) {
      const ts = this.timestamps.get(key);
      result.set(key, {
        blockId,
        timestamp: ts ? ts.toISOString() : new Date(0).toISOString(),
      });
    }
    return result;
  }

  async mergeSnapshot(
    snapshot: Iterable<readonly [string, HeadRecord]>,
  ): Promise<{ merged: number; skipped: number }> {
    let merged = 0;
    let skipped = 0;
    for (const [key, record] of snapshot) {
      const colon = key.indexOf(':');
      const dbName = colon === -1 ? key : key.slice(0, colon);
      const collectionName = colon === -1 ? '' : key.slice(colon + 1);
      const applied = await this.mergeHeadUpdate(
        dbName,
        collectionName,
        record.blockId,
        new Date(record.timestamp),
      );
      if (applied) {
        merged++;
      } else {
        skipped++;
      }
    }
    return { merged, skipped };
  }

  /**
   * Factory method that creates an independent InMemoryHeadRegistry instance.
   * Useful for tests that need isolated state.
   */
  static createIsolated(): InMemoryHeadRegistry {
    return new InMemoryHeadRegistry();
  }
}
