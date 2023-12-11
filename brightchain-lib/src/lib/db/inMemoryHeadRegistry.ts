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
