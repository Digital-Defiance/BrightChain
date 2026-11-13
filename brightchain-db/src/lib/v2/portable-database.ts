/**
 * The Node entry point for BrightDB v2: a database in a local directory (or any
 * storage), with fork, clone, garbage collection and encryption at rest. The
 * platform-neutral core lives in portable-core.ts, which browsers use directly.
 */
import { randomBytes } from 'node:crypto';
import './node-hash';
import { decodeMetadata, encodeMetadata } from './codec';
import {
  BrightDbV2DiskStore,
  BrightDbV2StorageError,
  type BrightDbV2Storage,
} from './disk-store';
import type { BrightDbV2BlockSource } from './block-source';
import { BrightDbV2AesCipher, type BrightDbV2KeyRing } from './encryption';
import { copyDatabase } from './merge';
import { PortableBrightDbCore, readDatabaseRoot } from './portable-core';
import { collectReachable } from './reachable';

export {
  PortableSnapshot,
  type PortableChange,
  type PortableChangeEvent,
  type PortableCollection,
  type PortableReadCollection,
  type PortableSubscribeOptions,
  type PortableWriteOperation,
} from './portable-core';

export interface PortableBrightDbOptions {
  /**
   * Write new blocks into pack files (one fsync per commit instead of one per
   * block), which makes bulk imports several times faster. Adds a `PACKED`
   * marker to the directory. Software that does not support packs cannot read
   * packed blocks, so turn this on only where every reader supports it.
   * Existing loose blocks keep working. See `compactPacks`.
   */
  packed?: boolean;
  /** Directory for the portable BrightDB v2 store. Give this or `storage`. */
  path?: string;
  /**
   * Use another storage instead of a directory, such as an adapter over a
   * BrightChain pool. It must already hold an initialized database. A storage
   * that reports `encryptsAtRest` cannot be combined with `encryption`.
   */
  storage?: BrightDbV2Storage;
  /**
   * Encrypt every block at rest with AES-256-GCM, under a 32-byte master key.
   * Setting this on a storage that already encrypts, as a BrightChain pool
   * does, is refused so blocks are never encrypted twice. A directory created with a key can only be opened
   * with the same key, and one created without cannot be opened with a key.
   */
  encryption?: { key: Uint8Array } | { keyRing: BrightDbV2KeyRing };
}

/** A standalone database in a local directory, or in any BrightDbV2Storage. */
export class PortableBrightDb extends PortableBrightDbCore {
  private constructor(store: BrightDbV2Storage) {
    super(store);
  }

  static async open({
    path,
    storage,
    encryption,
    packed,
  }: PortableBrightDbOptions): Promise<PortableBrightDb> {
    if (storage) {
      if (path !== undefined) {
        throw new Error('Give either a path or a storage, not both');
      }
      if (encryption && storage.encryptsAtRest) {
        throw new BrightDbV2StorageError(
          'This storage already encrypts at rest; do not also set encryption',
        );
      }
      if (encryption) {
        throw new BrightDbV2StorageError(
          'BrightDB encryption applies only to its own directory store; the storage must encrypt itself',
        );
      }
      await readDatabaseRoot(storage);
      return new PortableBrightDb(storage);
    }
    if (path === undefined) throw new Error('Give a path or a storage');
    const emptyRoot = encodeMetadata({
      kind: 'database',
      databaseId: randomBytes(16).toString('hex'),
      clock: 0n,
      catalog: null,
    });
    const store = await BrightDbV2DiskStore.openOrCreate(
      path,
      emptyRoot,
      undefined,
      encryption ? new BrightDbV2AesCipher('keyRing' in encryption ? encryption.keyRing : encryption.key) : null,
    );
    if (packed) await store.enablePacks();
    await readDatabaseRoot(store);
    return new PortableBrightDb(store);
  }

  /**
   * Create a directory holding a copy of the database a block source serves
   * (for example an `HttpBlockSource`), with its own writer ID. The two are then
   * replicas that can write and `merge` each other. This is how a machine joins
   * a database it has never held.
   */
  static async cloneFrom(
    path: string,
    source: BrightDbV2BlockSource,
    options: { encryption?: { key: Uint8Array } | { keyRing: BrightDbV2KeyRing }; packed?: boolean } = {},
  ): Promise<PortableBrightDb> {
    const head = await source.readHead();
    const root = decodeMetadata(await source.readBlock(head), head);
    if (root.kind !== 'database') {
      throw new BrightDbV2StorageError('The source head does not reference a database root');
    }
    const encryption = options.encryption;
    const store = await BrightDbV2DiskStore.create(
      path,
      encodeMetadata({ kind: 'database', databaseId: root.databaseId, clock: 0n, catalog: null }),
      undefined,
      encryption ? new BrightDbV2AesCipher('keyRing' in encryption ? encryption.keyRing : encryption.key) : null,
    );
    if (options.packed) await store.enablePacks();
    await store.withWriteLock(async (writer) => {
      await copyDatabase(store, writer, source, head);
      await writer.publishHead(head);
    });
    return new PortableBrightDb(store);
  }

  /**
   * Copy this database into a new directory as an independent replica. The
   * copy keeps the database ID and gets its own writer ID, so both sides can
   * write and later `merge` each other.
   */
  async fork(path: string): Promise<PortableBrightDb> {
    this.requireOpen();
    const source = this.store;
    if (!(source instanceof BrightDbV2DiskStore)) {
      throw new Error('fork copies into a new directory and needs a directory store');
    }
    const head = await this.store.readHead();
    const root = await readDatabaseRoot(this.store);
    const store = await BrightDbV2DiskStore.create(
      path,
      encodeMetadata({
        kind: 'database',
        databaseId: root.databaseId,
        clock: 0n,
        catalog: null,
      }),
      undefined,
      source.cipher,
    );
    if (source.isPacked) await store.enablePacks();
    await store.withWriteLock(async (writer) => {
      await copyDatabase(store, writer, this.store, head);
      await writer.publishHead(head);
    });
    return new PortableBrightDb(store);
  }

  /**
   * Merge every pack file into one, so many small commits do not leave many
   * small files to open. Runs under the write lock. Needs a packed directory store.
   */
  async compactPacks(): Promise<{ before: number; after: number }> {
    this.requireOpen();
    const store = this.store;
    if (!(store instanceof BrightDbV2DiskStore) || !store.isPacked) {
      throw new Error('Compaction needs a packed directory store');
    }
    return store.withWriteLock(() => store.compactPacks());
  }

  /**
   * Delete blocks that no retained root reaches. The current root is always
   * kept, plus any roots in `keepRoots` (older states you still want to read),
   * and everything they reach, including documents, indexes and attachments.
   * Blocks written less than `graceMs` ago (default one hour) are kept even if
   * unreachable, so a file stored with `putAttachment` has time to be
   * referenced by a document. Runs under the write lock, so no commit is in
   * flight. `dryRun` reports what would be removed without removing it.
   * Needs a directory store.
   */
  override async collectGarbage(
    options: { keepRoots?: readonly string[]; graceMs?: number; dryRun?: boolean } = {},
  ): Promise<{ keptReachable: number; keptRecent: number; removed: number; bytesFreed: number }> {
    this.requireOpen();
    const store = this.store;
    if (!(store instanceof BrightDbV2DiskStore)) {
      return super.collectGarbage(options); // any storage that can list and delete blocks
    }
    const graceMs = options.graceMs ?? 3_600_000;
    return store.withWriteLock(async () => {
      const roots = [await store.readHead(), ...(options.keepRoots ?? [])];
      const reachable = await collectReachable(store, roots);
      const keep = new Set([...reachable].map((digest) => store.fileNameOf(digest)));
      const now = Date.now();
      const result = { keptReachable: 0, keptRecent: 0, removed: 0, bytesFreed: 0 };
      const doomed: string[] = [];
      for (const file of await store.listBlockFiles()) {
        if (keep.has(file.name)) {
          result.keptReachable++;
        } else if (now - file.modifiedMs < graceMs) {
          result.keptRecent++;
        } else {
          result.removed++;
          result.bytesFreed += file.bytes;
          doomed.push(file.name);
        }
      }
      if (!options.dryRun) await store.deleteBlockFiles(doomed);
      return result;
    });
  }

  /**
   * After a key rotation, rewrite every block reachable from the current root
   * (and `keepRoots`) under the current data key, so the old key can be removed
   * from the ring. File names do not change, each file is replaced atomically,
   * and the run is safe to repeat or resume after a crash. Blocks no root
   * reaches are not touched: run `collectGarbage` first (or after) so none is
   * left sealed with the old key. The HEAD file is re-sealed at the end if it
   * still uses an old key. Runs under the write lock. Needs an encrypted
   * directory store.
   */
  async resealBlocks(
    options: { keepRoots?: readonly string[]; dryRun?: boolean } = {},
  ): Promise<{ resealed: number; alreadyCurrent: number; headResealed: boolean }> {
    this.requireOpen();
    const store = this.store;
    if (!(store instanceof BrightDbV2DiskStore) || !store.isEncrypted) {
      throw new Error('Re-sealing needs an encrypted directory store');
    }
    return store.withWriteLock(async (writer) => {
      const head = await store.readHead();
      const reachable = await collectReachable(store, [head, ...(options.keepRoots ?? [])]);
      const counts = await store.resealBlocks(reachable, options.dryRun);
      const result = { ...counts, headResealed: false };
      if (!options.dryRun && (await store.headNeedsReseal())) {
        await writer.publishHead(head);
        result.headResealed = true;
      }
      return result;
    });
  }
}
