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
import type { BrightDbV2KeyRing } from './encryption';
import { BrightDbV2WebCipher, WEB_ENCRYPTION_MARKER, wrapDecryptionError } from './web-cipher';
import {
  BrightDbV2MissingBlockError,
  BrightDbV2StorageError,
  type BrightDbV2DiskWriter,
  type BrightDbV2GarbageStorage,
  type BrightDbV2Storage,
} from './storage';

const BLOCKS = 'blocks';
const META = 'meta';
/** When each block was written (name to milliseconds), for garbage-collection grace periods. */
const TIMES = 'times';
const DB_VERSION = 2;
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
  /**
   * Encrypt every block and the head at rest with AES-256-GCM (spec section 10, the
   * same bytes as the Node and C++ builds), under a 32-byte master key or a key ring.
   * A database created with a key can only be opened with it, and one created
   * without cannot be opened with a key. Keys live in the page; whoever can run
   * code in the page or read the key can read the data, so this protects data at
   * rest in the browser profile, not against a compromised page.
   */
  encryption?: { key: Uint8Array } | { keyRing: BrightDbV2KeyRing };
}

export class IndexedDbV2Storage implements BrightDbV2Storage, BrightDbV2GarbageStorage {
  private readonly pending = new Map<string, Uint8Array>();
  private pendingBytes = 0;
  private chain: Promise<unknown> = Promise.resolve();

  private constructor(
    private readonly db: IDBDatabase,
    private readonly name: string,
    readonly writerId: Uint8Array,
    private readonly cipher: BrightDbV2WebCipher | null = null,
  ) {}

  /** True when blocks are encrypted at rest by this storage. */
  get encryptsAtRest(): boolean {
    return this.cipher !== null;
  }

  /** Open (and, unless `create` is false, create) the database stored under `name`. */
  static async open(name: string, options: IndexedDbV2Options = {}): Promise<IndexedDbV2Storage> {
    const factory = options.indexedDB ?? globalThis.indexedDB;
    if (!factory) throw new BrightDbV2StorageError('IndexedDB is not available here');
    const encryption = options.encryption;
    const cipher = encryption ? await BrightDbV2WebCipher.create('keyRing' in encryption ? encryption.keyRing : encryption.key) : null;
    const opening = factory.open(`brightdb-v2:${name}`, DB_VERSION);
    opening.onupgradeneeded = () => {
      const stores = opening.result.objectStoreNames;
      if (!stores.contains(BLOCKS)) opening.result.createObjectStore(BLOCKS);
      if (!stores.contains(META)) opening.result.createObjectStore(META);
      if (!stores.contains(TIMES)) opening.result.createObjectStore(TIMES);
    };
    const db = await request(opening);
    // Let another tab upgrade the database instead of blocking it.
    db.onversionchange = () => db.close();
    const read = <T>(key: string) => request<T | undefined>(db.transaction(META, 'readonly').objectStore(META).get(key));
    let writerId = await read<Uint8Array>('writerId');
    let head = await read<string | Uint8Array>('head');
    if (writerId && head) {
      const marker = await read<string>('encryption');
      if (marker !== undefined && marker !== WEB_ENCRYPTION_MARKER) {
        db.close();
        throw new BrightDbV2StorageError(`Unsupported BrightDB encryption profile: ${name}`);
      }
      if (marker !== undefined && !cipher) {
        db.close();
        throw new BrightDbV2StorageError(`BrightDB database is encrypted; open it with an encryption key: ${name}`);
      }
      if (marker === undefined && cipher) {
        db.close();
        throw new BrightDbV2StorageError(`BrightDB database is not encrypted; open it without an encryption key: ${name}`);
      }
    }
    if (!writerId || !head) {
      if (options.create === false) {
        db.close();
        throw new BrightDbV2StorageError(`No BrightDB v2 database named ${name}`);
      }
      // Initialize under a lock so two tabs opening at once do not both create one.
      await IndexedDbV2Storage.withNameLock(name, async () => {
        writerId = await read<Uint8Array>('writerId');
        head = await read<string | Uint8Array>('head');
        if (writerId && head) return;
        writerId = globalThis.crypto.getRandomValues(new Uint8Array(16));
        const root = encodeMetadata({
          kind: 'database',
          databaseId: Buffer.from(globalThis.crypto.getRandomValues(new Uint8Array(16))).toString('hex'),
          clock: 0n,
          catalog: null,
        });
        const digest = digestPayload(root);
        // Compute everything asynchronous before the transaction opens: it must not sit idle.
        const blockName = cipher ? await cipher.physicalName(digest) : digest;
        const storedRoot = cipher ? await cipher.seal(digest, root) : root;
        const storedHead = cipher ? await cipher.sealHead(digest) : digest;
        const tx = db.transaction([BLOCKS, META, TIMES], 'readwrite', { durability: 'strict' });
        tx.objectStore(BLOCKS).put(storedRoot, blockName);
        tx.objectStore(TIMES).put(Date.now(), blockName);
        tx.objectStore(META).put(writerId, 'writerId');
        if (cipher) tx.objectStore(META).put(WEB_ENCRYPTION_MARKER, 'encryption');
        tx.objectStore(META).put(storedHead, 'head');
        await done(tx);
      });
    }
    const storage = new IndexedDbV2Storage(db, name, writerId as Uint8Array, cipher);
    if (cipher) await storage.readBlock(await storage.readHead()); // fails early on a wrong key
    return storage;
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
    const head = await request<string | Uint8Array | undefined>(this.db.transaction(META, 'readonly').objectStore(META).get('head'));
    if (!head) throw new BrightDbV2StorageError(`No BrightDB v2 head in ${this.name}`);
    if (!this.cipher) return head as string;
    try {
      return await this.cipher.openHead(head as Uint8Array);
    } catch (error) {
      return wrapDecryptionError(error, 'Cannot decrypt HEAD');
    }
  }

  private nameFor(digest: string): Promise<string> | string {
    return this.cipher ? this.cipher.physicalName(digest) : digest;
  }

  async readBlock(digest: string): Promise<Uint8Array> {
    const buffered = this.pending.get(digest);
    let bytes: Uint8Array | undefined = buffered;
    if (!bytes) {
      const stored = await request<Uint8Array | undefined>(
        this.db.transaction(BLOCKS, 'readonly').objectStore(BLOCKS).get(await this.nameFor(digest)),
      );
      if (!stored) throw new BrightDbV2MissingBlockError(digest);
      if (this.cipher) {
        try {
          bytes = await this.cipher.open(digest, stored);
        } catch (error) {
          return wrapDecryptionError(error, `BrightDB v2 block cannot be decrypted: ${digest}`);
        }
      } else {
        bytes = stored;
      }
    }
    if (digestPayload(bytes) !== digest) throw new BrightDbV2StorageError(`BrightDB block digest mismatch: ${digest}`);
    return bytes;
  }

  async hasBlock(digest: string): Promise<boolean> {
    if (this.pending.has(digest)) return true;
    return (await request(this.db.transaction(BLOCKS, 'readonly').objectStore(BLOCKS).count(await this.nameFor(digest)))) > 0;
  }

  async nameOf(digest: string): Promise<string> {
    return this.nameFor(digest);
  }

  async listBlocks(): Promise<Array<{ name: string; bytes: number; modifiedMs: number }>> {
    const tx = this.db.transaction([BLOCKS, TIMES], 'readonly');
    const times = new Map<string, number>();
    const timeKeys = await request(tx.objectStore(TIMES).getAllKeys());
    const timeValues = await request(tx.objectStore(TIMES).getAll());
    timeKeys.forEach((key, i) => times.set(String(key), Number(timeValues[i])));
    const out: Array<{ name: string; bytes: number; modifiedMs: number }> = [];
    await new Promise<void>((resolve, reject) => {
      const cursor = tx.objectStore(BLOCKS).openCursor();
      cursor.onerror = () => reject(cursor.error);
      cursor.onsuccess = () => {
        const at = cursor.result;
        if (!at) return resolve();
        const name = String(at.key);
        out.push({ name, bytes: (at.value as Uint8Array).length, modifiedMs: times.get(name) ?? 0 });
        at.continue();
      };
    });
    return out;
  }

  /** Delete blocks by stored name. Call only inside `withWriteLock`. */
  async deleteBlocks(names: string[]): Promise<void> {
    if (names.length === 0) return;
    const tx = this.db.transaction([BLOCKS, TIMES], 'readwrite', { durability: 'strict' });
    for (const name of names) {
      tx.objectStore(BLOCKS).delete(name);
      tx.objectStore(TIMES).delete(name);
    }
    await done(tx);
  }

  private async flush(): Promise<void> {
    if (this.pending.size === 0) return;
    // Name and seal first: a transaction must not sit idle while we wait on WebCrypto.
    const prepared: Array<{ name: string; stored: Uint8Array }> = [];
    for (const [digest, bytes] of this.pending) {
      prepared.push({ name: await this.nameFor(digest), stored: this.cipher ? await this.cipher.seal(digest, bytes) : bytes });
    }
    const now = Date.now();
    const tx = this.db.transaction([BLOCKS, TIMES], 'readwrite', { durability: 'strict' });
    for (const { name, stored } of prepared) {
      tx.objectStore(BLOCKS).put(stored, name);
      tx.objectStore(TIMES).put(now, name);
    }
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
          const storedHead = this.cipher ? await this.cipher.sealHead(digest) : digest;
          const tx = this.db.transaction(META, 'readwrite', { durability: 'strict' });
          tx.objectStore(META).put(storedHead, 'head');
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
