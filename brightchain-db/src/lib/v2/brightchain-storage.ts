/**
 * BrightDB v2 over a BrightChain pool: the blocks live in an `IPooledBlockStore`
 * pool and the database head in an `IHeadRegistry`. The pool names a block by
 * the SHA3-512 of the bytes it receives, which is exactly a v2 logical digest,
 * so no name mapping is needed. Pools whose store changes the bytes (as an
 * encrypting pool does) name blocks differently and are refused with a clear
 * error until the pool can store a block under a caller-chosen name.
 */
import type {
  IHeadRegistry,
  IPooledBlockStore,
  PoolId,
} from '@brightchain/brightchain-lib';
import { randomBytes } from 'node:crypto';
import type { BrightDbV2BlockSource } from './block-source';
import { digestPayload, encodeMetadata } from './codec';
import { copyDatabase } from './merge';
import {
  BrightDbV2MissingBlockError,
  BrightDbV2StorageError,
  type BrightDbV2DiskWriter,
  type BrightDbV2Storage,
} from './disk-store';

/** The head registry collection that holds a database's current root in a pool. Scoped by pool, because the registry is not. */
export const V2_HEAD_COLLECTION = '__brightdb_v2_head__';
export const headCollection = (poolId: string): string => `${V2_HEAD_COLLECTION}:${poolId}`;

export interface BrightChainV2StorageOptions {
  store: IPooledBlockStore;
  poolId: PoolId;
  headRegistry: IHeadRegistry;
  /** Database name in the head registry. */
  dbName: string;
  /** 16 nonzero bytes identifying this writer. Defaults to a random value for each construction. */
  writerId?: Uint8Array;
  /**
   * Declare that the pool encrypts blocks. BrightDB then refuses its own
   * `encryption` option. Writing to such a pool is not supported yet, because
   * the pool names blocks by their ciphertext hash and v2 names them by their
   * plaintext digest.
   */
  poolEncrypts?: boolean;
}

const locks = new WeakMap<object, Map<string, Promise<unknown>>>();

function isNotFound(error: unknown): boolean {
  const type = (error as { type?: string; name?: string } | null)?.type;
  const name = (error as { name?: string } | null)?.name;
  return type === 'KeyNotFound' || name === 'StoreError' || /not found/iu.test(String((error as Error)?.message));
}

export class BrightChainV2Storage implements BrightDbV2Storage {
  readonly writerId: Uint8Array;
  readonly encryptsAtRest: boolean;
  private readonly lockKey: string;

  constructor(private readonly options: BrightChainV2StorageOptions) {
    const id = options.writerId ?? randomBytes(16);
    if (id.length !== 16 || id.every((byte) => byte === 0)) {
      throw new BrightDbV2StorageError('A writer ID must be 16 nonzero bytes');
    }
    this.writerId = Uint8Array.from(id);
    this.encryptsAtRest = options.poolEncrypts === true;
    this.lockKey = `${options.poolId}:${options.dbName}`;
  }

  /**
   * Open the database in this pool, creating an empty one if the head registry
   * has none. Pass the result to `PortableBrightDb.open({ storage })`.
   */
  static async openOrCreate(options: BrightChainV2StorageOptions): Promise<BrightChainV2Storage> {
    const storage = new BrightChainV2Storage(options);
    if (storage.options.headRegistry.getHead(options.dbName, headCollection(options.poolId)) === undefined) {
      await storage.withWriteLock(async (writer) => {
        // Re-check under the lock so two openers do not both initialize.
        if (options.headRegistry.getHead(options.dbName, headCollection(options.poolId)) !== undefined) return;
        const root = await writer.writeBlock(
          encodeMetadata({
            kind: 'database',
            databaseId: randomBytes(16).toString('hex'),
            clock: 0n,
            catalog: null,
          }),
        );
        await writer.publishHead(root);
      });
    }
    return storage;
  }

  /**
   * Join an existing database held by another node: copy its current state from
   * `source` into this pool and make it the head. Does nothing if the pool
   * already has the database. Afterwards the two nodes are replicas that can
   * write and `merge` each other.
   */
  static async joinFrom(
    options: BrightChainV2StorageOptions,
    source: BrightDbV2BlockSource,
  ): Promise<BrightChainV2Storage> {
    const storage = new BrightChainV2Storage(options);
    await storage.withWriteLock(async (writer) => {
      if (options.headRegistry.getHead(options.dbName, headCollection(options.poolId)) !== undefined) return;
      const head = await source.readHead();
      await copyDatabase(storage, writer, source, head);
      await writer.publishHead(head);
    });
    return storage;
  }

  async readHead(): Promise<string> {
    const head = this.options.headRegistry.getHead(this.options.dbName, headCollection(this.options.poolId));
    if (head === undefined) {
      throw new BrightDbV2StorageError(
        `No BrightDB v2 database named ${this.options.dbName} in pool ${this.options.poolId}`,
      );
    }
    return head;
  }

  async hasBlock(digest: string): Promise<boolean> {
    return this.options.store.hasInPool(this.options.poolId, digest);
  }

  async readBlock(digest: string): Promise<Uint8Array> {
    let bytes: Uint8Array;
    try {
      bytes = await this.options.store.getFromPool(this.options.poolId, digest);
    } catch (error) {
      if (isNotFound(error) && !(await this.hasBlock(digest))) {
        throw new BrightDbV2MissingBlockError(digest, { cause: error });
      }
      throw error;
    }
    if (digestPayload(bytes) !== digest) {
      throw new BrightDbV2StorageError(`BrightChain block digest mismatch: ${digest}`);
    }
    return bytes;
  }

  private async putBlock(payload: Uint8Array): Promise<string> {
    if (this.encryptsAtRest) {
      throw new BrightDbV2StorageError(
        'Writing BrightDB v2 to an encrypting pool is not supported yet: the pool names blocks by ciphertext hash',
      );
    }
    const expected = digestPayload(payload);
    const id = await this.options.store.putInPool(this.options.poolId, payload);
    if (id !== expected) {
      throw new BrightDbV2StorageError(
        'The pool named a block differently from its BrightDB digest, so it cannot hold a v2 database',
      );
    }
    return id;
  }

  /** One writer at a time per database in this process. Other nodes converge through merge. */
  withWriteLock<T>(write: (writer: BrightDbV2DiskWriter) => Promise<T>): Promise<T> {
    let byKey = locks.get(this.options.headRegistry);
    if (!byKey) locks.set(this.options.headRegistry, (byKey = new Map()));
    const previous = byKey.get(this.lockKey) ?? Promise.resolve();
    const writer: BrightDbV2DiskWriter = {
      writeBlock: (payload) => this.putBlock(payload),
      writeBlocks: async (payloads) => {
        for (const payload of payloads) await this.putBlock(payload);
      },
      syncBlocks: async () => undefined,
      publishHead: async (digest) => {
        if (!(await this.hasBlock(digest))) throw new BrightDbV2MissingBlockError(digest);
        await this.options.headRegistry.setHead(this.options.dbName, headCollection(this.options.poolId), digest);
      },
    };
    const run = previous.then(() => write(writer));
    byKey.set(
      this.lockKey,
      run.catch(() => undefined),
    );
    return run;
  }
}
