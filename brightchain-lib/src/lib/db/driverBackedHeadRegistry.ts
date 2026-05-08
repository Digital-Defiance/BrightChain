/**
 * DriverBackedHeadRegistry — IHeadRegistry implemented on top of IHeadRegistryDriver.
 *
 * Holds an in-memory cache for reads (getHead is synchronous per the interface).
 * Every mutation writes only the affected key via the driver (O(1) per write).
 * load() hydrates the cache by listing all keys and reading each one.
 *
 * This replaces both PersistentHeadRegistry (single-JSON-file on disk) and
 * CloudHeadRegistry (single-JSON-blob in cloud), which both did a full
 * serialize-all-heads rewrite on every mutation.
 */
import type { IWriteProof } from '../interfaces/auth/writeProof';
import type {
  DeferredHeadUpdate,
  IHeadRegistry,
} from '../interfaces/storage/headRegistry';
import type {
  HeadRecord,
  IHeadRegistryDriver,
} from '../interfaces/storage/headRegistryDriver';
import type { BrightDateTimestamp } from '../types/brightDateTimestamp';
import { brightDateNow, dateToBrightDate } from '../utils/brightDateConversions';

export class DriverBackedHeadRegistry implements IHeadRegistry {
  private readonly heads = new Map<string, string>();
  private readonly timestamps = new Map<string, BrightDateTimestamp>();
  private readonly deferred: DeferredHeadUpdate[] = [];
  private readonly changeListeners = new Map<
    string,
    Set<(blockId: string) => void>
  >();
  protected readonly driver: IHeadRegistryDriver;

  constructor(driver: IHeadRegistryDriver) {
    this.driver = driver;
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
    _writeProof?: IWriteProof,
  ): Promise<void> {
    const key = this.makeKey(dbName, collectionName);
    const ts = brightDateNow();
    this.heads.set(key, blockId);
    this.timestamps.set(key, ts);
    await this.driver.writeRecord(key, {
      blockId,
      timestamp: ts,
    });
  }

  async removeHead(
    dbName: string,
    collectionName: string,
    _writeProof?: IWriteProof,
  ): Promise<void> {
    const key = this.makeKey(dbName, collectionName);
    this.heads.delete(key);
    this.timestamps.delete(key);
    await this.driver.deleteRecord(key);
  }

  async clear(): Promise<void> {
    const keys = await this.driver.listKeys();
    // Delete all persisted records in parallel
    await Promise.all(keys.map((k) => this.driver.deleteRecord(k)));
    this.heads.clear();
    this.timestamps.clear();
    this.deferred.length = 0;
  }

  async load(): Promise<void> {
    this.heads.clear();
    this.timestamps.clear();
    const keys = await this.driver.listKeys();
    const records = await Promise.all(
      keys.map((k) => this.driver.readRecord(k).then((r) => ({ k, r }))),
    );
    for (const { k, r } of records) {
      if (r) {
        this.heads.set(k, r.blockId);
        this.timestamps.set(k, r.timestamp);
      }
    }
  }

  getAllHeads(): Map<string, string> {
    return new Map(this.heads);
  }

  getHeadTimestamp(dbName: string, collectionName: string): BrightDateTimestamp | undefined {
    return this.timestamps.get(this.makeKey(dbName, collectionName));
  }

  async mergeHeadUpdate(
    dbName: string,
    collectionName: string,
    blockId: string,
    timestamp: BrightDateTimestamp,
  ): Promise<boolean> {
    const key = this.makeKey(dbName, collectionName);
    const localTs = this.timestamps.get(key);
    if (!localTs || timestamp > localTs) {
      this.heads.set(key, blockId);
      this.timestamps.set(key, timestamp);
      await this.driver.writeRecord(key, {
        blockId,
        timestamp,
      });
      this.notifyHeadChange(key, blockId);
      return true;
    }
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
    timestamp: BrightDateTimestamp,
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
        timestamp: ts ?? 0,
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
        record.timestamp,
      );
      if (applied) {
        merged++;
      } else {
        skipped++;
      }
    }
    return { merged, skipped };
  }
}
