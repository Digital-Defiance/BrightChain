/**
 * CloudHeadRegistry — IHeadRegistry backed by cloud object storage.
 *
 * Stores the head registry as a single JSON blob in the cloud container,
 * using a well-known key. This ensures head pointers live alongside the
 * blocks and survive process restarts without local disk state.
 *
 * Reads are served from an in-memory cache. Every mutation flushes the
 * full registry to cloud storage before returning. load() fetches the
 * cloud blob into memory and is called by BrightDb.connect().
 *
 * Compatible with Azure Blob Storage, S3, and any cloud store that
 * provides the ICloudObjectIO primitives.
 */
import type {
  DeferredHeadUpdate,
  IHeadRegistry,
} from '@brightchain/brightchain-lib';

/**
 * Minimal interface for cloud I/O primitives.
 * CloudBlockStoreBase exposes these as protected methods — the store
 * passes itself (or a bound adapter) when creating the registry.
 */
export interface ICloudObjectIO {
  uploadObject(key: string, data: Uint8Array): Promise<void>;
  downloadObject(key: string): Promise<Uint8Array>;
  objectExists(key: string): Promise<boolean>;
}

/** Well-known blob key for the head registry */
const REGISTRY_KEY = '__brightchain_head_registry.json';

interface RegistryEntry {
  blockId: string;
  timestamp?: string;
}

export class CloudHeadRegistry implements IHeadRegistry {
  private readonly heads = new Map<string, string>();
  private readonly timestamps = new Map<string, Date>();
  private readonly deferred: DeferredHeadUpdate[] = [];
  private readonly io: ICloudObjectIO;

  constructor(io: ICloudObjectIO) {
    this.io = io;
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
    await this.flush();
  }

  async removeHead(dbName: string, collectionName: string): Promise<void> {
    const key = this.makeKey(dbName, collectionName);
    this.heads.delete(key);
    this.timestamps.delete(key);
    await this.flush();
  }

  async clear(): Promise<void> {
    this.heads.clear();
    this.timestamps.clear();
    this.deferred.length = 0;
    await this.flush();
  }

  async load(): Promise<void> {
    try {
      const exists = await this.io.objectExists(REGISTRY_KEY);
      if (!exists) {
        console.log('[CloudHeadRegistry] No registry blob found in cloud, starting empty.');
        this.heads.clear();
        this.timestamps.clear();
        return;
      }

      const raw = await this.io.downloadObject(REGISTRY_KEY);
      const json = new TextDecoder().decode(raw);
      const parsed: Record<string, unknown> = JSON.parse(json);

      this.heads.clear();
      this.timestamps.clear();

      for (const [key, value] of Object.entries(parsed)) {
        if (typeof value === 'string') {
          this.heads.set(key, value);
        } else if (
          value !== null &&
          typeof value === 'object' &&
          'blockId' in value &&
          typeof (value as Record<string, unknown>)['blockId'] === 'string'
        ) {
          const entry = value as RegistryEntry;
          this.heads.set(key, entry.blockId);
          if (entry.timestamp) {
            this.timestamps.set(key, new Date(entry.timestamp));
          }
        }
      }
      console.log(`[CloudHeadRegistry] Loaded ${this.heads.size} head(s) from cloud.`);
    } catch (err: unknown) {
      console.warn(
        '[CloudHeadRegistry] Failed to load from cloud, starting empty:',
        err instanceof Error ? err.message : String(err),
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

    if (!localTimestamp || timestamp.getTime() > localTimestamp.getTime()) {
      this.heads.set(key, blockId);
      this.timestamps.set(key, timestamp);
      await this.flush();
      return true;
    }
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

  /** Serialize the in-memory state and upload to cloud storage. */
  private async flush(): Promise<void> {
    const data: Record<string, RegistryEntry> = {};
    for (const [key, blockId] of this.heads) {
      const ts = this.timestamps.get(key);
      data[key] = {
        blockId,
        ...(ts ? { timestamp: ts.toISOString() } : {}),
      };
    }
    const json = JSON.stringify(data, null, 2);
    const bytes = new TextEncoder().encode(json);
    console.log(`[CloudHeadRegistry] Flushing ${this.heads.size} head(s) to cloud.`);
    await this.io.uploadObject(REGISTRY_KEY, bytes);
  }
}
