/**
 * BrightDB v2 in the browser: blocks and the head live in IndexedDB, and one
 * writer at a time is enforced across tabs with the Web Locks API (falling
 * back to one writer per page where it is missing). Platform neutral: it uses
 * only the standard `indexedDB` and `navigator.locks` globals.
 *
 * Blocks written during a commit are buffered and saved in a single IndexedDB
 * transaction before the head moves, so a reload mid-commit shows either the
 * old head or the new one, never a head whose blocks are missing.
 */
import { digestPayload, encodeMetadata } from './codec';
import {
  BrightDbV2MissingBlockError,
  BrightDbV2StorageError,
  type BrightDbV2DiskWriter,
  type BrightDbV2Storage,
} from './storage';

const BLOCKS = 'blocks';
const META = 'meta';
/** Save buffered blocks once they pass this many bytes, so a large file does not sit in memory. */
const FLUSH_BYTES = 32 * 1024 * 1024;

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function done(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'));
  });
}

export interface IndexedDbV2Options {
  /** Use a specific IDBFactory instead of the global `indexedDB`. */
  indexedDB?: IDBFactory;
  /** Create a new empty database when none exists. Default true. */
  create?: boolean;
}

export class IndexedDbV2Storage implements BrightDbV2Storage {
  readonly encryptsAtRest = false;
  private readonly pending = new Map<string, Uint8Array>();
  private pendingBytes = 0;
  private chain: Promise<unknown> = Promise.resolve();

  private constructor(
    private readonly db: IDBDatabase,
    private readonly name: string,
    readonly writerId: Uint8Array,
  ) {}

  /** Open (and, unless `create` is false, create) the database stored under `name`. */
  static async open(name: string, options: IndexedDbV2Options = {}): Promise<IndexedDbV2Storage> {
    const factory = options.indexedDB ?? globalThis.indexedDB;
    if (!factory) throw new BrightDbV2StorageError('IndexedDB is not available here');
    const opening = factory.open(`brightdb-v2:${name}`, 1);
    opening.onupgradeneeded = () => {
      opening.result.createObjectStore(BLOCKS);
      opening.result.createObjectStore(META);
    };
    const db = await request(opening);
    const read = <T>(key: string) => request<T | undefined>(db.transaction(META, 'readonly').objectStore(META).get(key));
    let writerId = await read<Uint8Array>('writerId');
    let head = await read<string>('head');
    if (!writerId || !head) {
      if (options.create === false) {
        db.close();
        throw new BrightDbV2StorageError(`No BrightDB v2 database named ${name}`);
      }
      // Initialize under a lock so two tabs opening at once do not both create one.
      await IndexedDbV2Storage.withNameLock(name, async () => {
        writerId = await read<Uint8Array>('writerId');
        head = await read<string>('head');
        if (writerId && head) return;
        writerId = globalThis.crypto.getRandomValues(new Uint8Array(16));
        const root = encodeMetadata({
          kind: 'database',
          databaseId: Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(16))).toString('hex'),
          clock: 0n,
          catalog: null,
        });
        head = digestPayload(root);
        const tx = db.transaction([BLOCKS, META], 'readwrite', { durability: 'strict' });
        tx.objectStore(BLOCKS).put(root, head);
        tx.objectStore(META).put(writerId, 'writerId');
        tx.objectStore(META).put(head, 'head');
        await done(tx);
      });
    }
    return new IndexedDbV2Storage(db, name, writerId as Uint8Array);
  }

  /** Close the underlying connection. */
  close(): void {
    this.db.close();
  }

  private static async withNameLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const locks = (globalThis.navigator as Navigator | undefined)?.locks;
    if (!locks) return fn();
    return locks.request(`brightdb-v2:${name}`, { mode: 'exclusive' }, fn) as Promise<T>;
  }

  async readHead(): Promise<string> {
    const head = await request<string | undefined>(this.db.transaction(META, 'readonly').objectStore(META).get('head'));
    if (!head) throw new BrightDbV2StorageError(`No BrightDB v2 head in ${this.name}`);
    return head;
  }

  async readBlock(digest: string): Promise<Uint8Array> {
    const buffered = this.pending.get(digest);
    const bytes =
      buffered ?? (await request<Uint8Array | undefined>(this.db.transaction(BLOCKS, 'readonly').objectStore(BLOCKS).get(digest)));
    if (!bytes) throw new BrightDbV2MissingBlockError(digest);
    if (digestPayload(bytes) !== digest) throw new BrightDbV2StorageError(`BrightDB block digest mismatch: ${digest}`);
    return bytes;
  }

  async hasBlock(digest: string): Promise<boolean> {
    if (this.pending.has(digest)) return true;
    return (await request(this.db.transaction(BLOCKS, 'readonly').objectStore(BLOCKS).count(digest))) > 0;
  }

  private async flush(): Promise<void> {
    if (this.pending.size === 0) return;
    const tx = this.db.transaction(BLOCKS, 'readwrite', { durability: 'strict' });
    const store = tx.objectStore(BLOCKS);
    for (const [digest, bytes] of this.pending) store.put(bytes, digest);
    await done(tx);
    this.pending.clear();
    this.pendingBytes = 0;
  }

  withWriteLock<T>(write: (writer: BrightDbV2DiskWriter) => Promise<T>): Promise<T> {
    const scope = async (): Promise<T> => {
      const writer: BrightDbV2DiskWriter = {
        writeBlock: async (payload) => {
          const digest = digestPayload(payload);
          if (!this.pending.has(digest)) {
            this.pending.set(digest, Uint8Array.from(payload));
            this.pendingBytes += payload.length;
            if (this.pendingBytes >= FLUSH_BYTES) await this.flush();
          }
          return digest;
        },
        writeBlocks: async (payloads) => {
          for (const payload of payloads) await writer.writeBlock(payload);
        },
        syncBlocks: () => this.flush(),
        publishHead: async (digest) => {
          await this.flush();
          if (!(await this.hasBlock(digest))) throw new BrightDbV2MissingBlockError(digest);
          const tx = this.db.transaction(META, 'readwrite', { durability: 'strict' });
          tx.objectStore(META).put(digest, 'head');
          await done(tx);
        },
      };
      try {
        return await write(writer);
      } finally {
        // Anything not saved by now belongs to a commit that did not finish.
        this.pending.clear();
        this.pendingBytes = 0;
      }
    };
    const run = this.chain.then(() => IndexedDbV2Storage.withNameLock(this.name, scope));
    this.chain = run.catch(() => undefined);
    return run;
  }
}
