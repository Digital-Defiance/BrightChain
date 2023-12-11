import type {
  HeadRecord,
  IHeadRegistryDriver,
} from '@brightchain/brightchain-lib';

/** Default prefix under which all per-key head objects are stored. */
const DEFAULT_NAMESPACE = '__brightchain-heads';

/**
 * CloudHeadRegistryDriver — stores one JSON object per registry key in a
 * cloud container, using the same uploadObject/downloadObject/deleteObject/
 * listObjects primitives provided by CloudBlockStoreBase subclasses.
 *
 * Each key `"dbName:collectionName"` maps to one small object at:
 *   `<namespace>/<encodedKey>.json`
 *
 * This gives O(1) per-key writes without any global lock or full-collection
 * rewrite.
 */
export class CloudHeadRegistryDriver implements IHeadRegistryDriver {
  private readonly uploadObject: (
    key: string,
    data: Uint8Array,
  ) => Promise<void>;
  private readonly downloadObject: (key: string) => Promise<Uint8Array>;
  private readonly objectExists: (key: string) => Promise<boolean>;
  private readonly deleteObject: (key: string) => Promise<void>;
  private readonly listObjects: (
    prefix: string,
    maxResults?: number,
  ) => Promise<string[]>;
  private readonly prefix: string;

  constructor(options: {
    uploadObject: (key: string, data: Uint8Array) => Promise<void>;
    downloadObject: (key: string) => Promise<Uint8Array>;
    objectExists: (key: string) => Promise<boolean>;
    deleteObject: (key: string) => Promise<void>;
    listObjects: (prefix: string, maxResults?: number) => Promise<string[]>;
    namespace?: string;
  }) {
    this.uploadObject = options.uploadObject;
    this.downloadObject = options.downloadObject;
    this.objectExists = options.objectExists;
    this.deleteObject = options.deleteObject;
    this.listObjects = options.listObjects;
    this.prefix = (options.namespace ?? DEFAULT_NAMESPACE) + '/';
  }

  private keyToObjectPath(key: string): string {
    return this.prefix + encodeURIComponent(key) + '.json';
  }

  private objectPathToKey(objectPath: string): string {
    // Strip prefix and '.json' suffix, then decode
    const encoded = objectPath.slice(this.prefix.length, -5);
    return decodeURIComponent(encoded);
  }

  async readRecord(key: string): Promise<HeadRecord | null> {
    const path = this.keyToObjectPath(key);
    const exists = await this.objectExists(path);
    if (!exists) {
      return null;
    }
    const data = await this.downloadObject(path);
    const text = Buffer.from(data).toString('utf-8');
    const parsed: unknown = JSON.parse(text);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'blockId' in parsed &&
      typeof (parsed as Record<string, unknown>)['blockId'] === 'string' &&
      'timestamp' in parsed &&
      typeof (parsed as Record<string, unknown>)['timestamp'] === 'string'
    ) {
      return parsed as HeadRecord;
    }
    return null;
  }

  async writeRecord(key: string, record: HeadRecord): Promise<void> {
    const path = this.keyToObjectPath(key);
    const data = Buffer.from(JSON.stringify(record), 'utf-8');
    await this.uploadObject(path, data);
  }

  async deleteRecord(key: string): Promise<void> {
    const path = this.keyToObjectPath(key);
    try {
      await this.deleteObject(path);
    } catch (err: unknown) {
      // Ignore 404-like errors (object already gone)
      const error = err as { statusCode?: number; code?: string };
      if (error.statusCode === 404 || error.code === 'NoSuchKey') {
        return;
      }
      throw err;
    }
  }

  async listKeys(): Promise<string[]> {
    const paths = await this.listObjects(this.prefix);
    return paths
      .filter((p) => p.endsWith('.json'))
      .map((p) => this.objectPathToKey(p));
  }
}
