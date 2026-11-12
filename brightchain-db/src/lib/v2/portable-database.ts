import { randomBytes, randomUUID } from 'node:crypto';
import { Cursor } from '../cursor';
import { DuplicateKeyError } from '../indexing';
import { matchesFilter } from '../queryEngine';
import type {
  BsonDocument,
  DeleteResult,
  FilterQuery,
  InsertManyResult,
  InsertOneResult,
  ReplaceResult,
} from '../types';
import {
  compareKeys,
  compareVersions,
  decodeDocument,
  decodeMetadata,
  digestPayload,
  encodeDocumentForWrite,
  encodeKey,
  encodeMetadata,
  MAX_U64,
  type Digest,
  type V2CollectionRoot,
  type V2DatabaseRoot,
  type V2Record,
  type V2Version,
} from './codec';
import { BrightDbV2DiskStore, type BrightDbV2DiskWriter } from './disk-store';
import { V2Tree } from './tree';

export interface PortableBrightDbOptions {
  /** Directory for the portable BrightDB v2 store. */
  path: string;
}

export type PortableWriteOperation =
  | { type: 'createCollection' | 'dropCollection'; collection: string }
  | { type: 'insert'; collection: string; document: BsonDocument }
  | { type: 'replace'; collection: string; id: string; document: BsonDocument }
  | { type: 'delete'; collection: string; id: string };

/** The read-only half of a collection. A snapshot exposes only this. */
export interface PortableReadCollection<T extends BsonDocument = BsonDocument> {
  readonly name: string;
  findById(id: string): Promise<T | null>;
  findOne(filter?: FilterQuery<T>): Promise<T | null>;
  find(filter?: FilterQuery<T>): Cursor<T>;
}

/** A visible change to one document between two database roots. */
export interface PortableChange<T extends BsonDocument = BsonDocument> {
  collection: string;
  id: string;
  type: 'added' | 'modified' | 'deleted';
  before?: T;
  after?: T;
}

/** Delivered to a subscriber when the database root has moved. */
export interface PortableChangeEvent {
  /** The last root this subscriber saw (the root at subscription time at first). */
  previous: string;
  /** The root now current. Several commits may be covered by one event. */
  root: string;
  /** The document-level changes between `previous` and `root`. */
  changes<T extends BsonDocument = BsonDocument>(): AsyncGenerator<PortableChange<T>>;
}

export interface PortableSubscribeOptions {
  /** How often to look for commits made by other processes. Default 250 ms. */
  intervalMs?: number;
  /** Called when the listener throws or the root cannot be read. */
  onError?: (error: unknown) => void;
}

export interface PortableCollection<T extends BsonDocument = BsonDocument>
  extends PortableReadCollection<T> {
  insertOne(document: T): Promise<InsertOneResult>;
  insertMany(documents: readonly T[]): Promise<InsertManyResult>;
  replaceById(id: string, document: T): Promise<ReplaceResult>;
  deleteById(id: string): Promise<DeleteResult>;
}

type BlockReader = Pick<BrightDbV2DiskStore, 'readBlock'>;
function readTree(store: BlockReader, kind: 'catalog' | 'primary'): V2Tree {
  return new V2Tree(
    {
      get: (digest) => store.readBlock(digest),
      put: async () => {
        throw new Error('Cannot write a BrightDB read snapshot');
      },
    },
    kind,
  );
}

async function readDatabaseRoot(
  store: BrightDbV2DiskStore,
): Promise<V2DatabaseRoot> {
  const head = await store.readHead();
  const root = decodeMetadata(await store.readBlock(head));
  if (root.kind !== 'database') {
    throw new Error('BrightDB HEAD does not reference a database root');
  }
  return root;
}

async function readCollectionRoot(
  store: BlockReader,
  catalog: V2Tree,
  root: V2DatabaseRoot,
  name: string,
): Promise<V2CollectionRoot | null> {
  const record = await catalog.get(root.catalog, name);
  if (!record) return null;
  if (record.version.counter > root.clock) {
    throw new Error('BrightDB catalog version exceeds the database clock');
  }
  if (record.target === null) return null;
  const collection = decodeMetadata(await store.readBlock(record.target));
  if (
    collection.kind !== 'collection' ||
    compareVersions(collection.generation, record.version) !== 0
  ) {
    throw new Error(
      'BrightDB collection generation does not match its catalog entry',
    );
  }
  return collection;
}

function checkPrimaryVersion(
  record: V2Record,
  generation: V2Version,
  clock: bigint,
): void {
  if (
    record.version.counter > clock ||
    compareVersions(record.version, generation) <= 0
  ) {
    throw new Error(
      'BrightDB document version is outside its collection generation',
    );
  }
}

type PendingCollection =
  | {
      kind: 'live';
      root: V2CollectionRoot;
      created: boolean;
      changes: Map<string, V2Record>;
    }
  | { kind: 'missing'; dropVersion?: V2Version };

/** Stages catalog and primary index changes against one pinned database root. */
class WriteBatch {
  private readonly pending = new Map<string, PendingCollection>();
  private readonly documents = new Map<Digest, Uint8Array>();
  private readonly catalog: V2Tree;
  private readonly primary: V2Tree;
  private clock: bigint;

  constructor(
    private readonly store: BlockReader,
    private readonly writer: BrightDbV2DiskWriter,
    private readonly root: V2DatabaseRoot,
    private readonly writerId: string,
  ) {
    const blocks = {
      get: (digest: Digest) => store.readBlock(digest),
      put: async (digest: Digest, payload: Uint8Array) => {
        if ((await writer.writeBlock(payload)) !== digest) {
          throw new Error('BrightDB block writer returned a different digest');
        }
      },
    };
    this.catalog = new V2Tree(blocks, 'catalog');
    this.primary = new V2Tree(blocks, 'primary');
    this.clock = root.clock;
  }

  private nextVersion(): V2Version {
    if (this.clock === MAX_U64) {
      throw new Error('BrightDB database clock exhausted');
    }
    return { counter: ++this.clock, writerId: this.writerId };
  }

  private async collection(name: string): Promise<PendingCollection> {
    const pending = this.pending.get(name);
    if (pending) return pending;
    const root = await readCollectionRoot(
      this.store,
      this.catalog,
      this.root,
      name,
    );
    const loaded: PendingCollection = root
      ? { kind: 'live', root, created: false, changes: new Map() }
      : { kind: 'missing' };
    this.pending.set(name, loaded);
    return loaded;
  }

  private addCollection(
    name: string,
  ): Extract<PendingCollection, { kind: 'live' }> {
    const collection = {
      kind: 'live',
      root: {
        kind: 'collection',
        generation: this.nextVersion(),
        primary: null,
      },
      created: true,
      changes: new Map<string, V2Record>(),
    } as const;
    this.pending.set(name, collection);
    return collection;
  }

  async createCollection(name: string): Promise<void> {
    if ((await this.collection(name)).kind === 'live') {
      throw new Error(`BrightDB collection already exists: ${name}`);
    }
    this.addCollection(name);
  }

  async dropCollection(name: string): Promise<void> {
    if ((await this.collection(name)).kind === 'live') {
      this.pending.set(name, {
        kind: 'missing',
        dropVersion: this.nextVersion(),
      });
    }
  }

  private async document(
    collection: Extract<PendingCollection, { kind: 'live' }>,
    id: string,
  ): Promise<V2Record | undefined> {
    const pending = collection.changes.get(id);
    if (pending) return pending;
    const existing = await this.primary.get(collection.root.primary, id);
    if (existing) {
      checkPrimaryVersion(
        existing,
        collection.root.generation,
        this.root.clock,
      );
    }
    return existing;
  }

  private stageDocument(
    collection: Extract<PendingCollection, { kind: 'live' }>,
    id: string,
    target: Digest,
    payload: Uint8Array,
  ): void {
    collection.changes.set(id, {
      key: id,
      version: this.nextVersion(),
      target,
    });
    this.documents.set(target, payload);
  }

  async insert(name: string, document: BsonDocument): Promise<string> {
    const { key: id, payload } = encodeDocumentForWrite(document, () =>
      randomUUID().replaceAll('-', ''),
    );
    const existing = await this.collection(name);
    const collection =
      existing.kind === 'live' ? existing : this.addCollection(name);
    if ((await this.document(collection, id))?.target != null) {
      throw new DuplicateKeyError('_id_', id);
    }
    this.stageDocument(collection, id, digestPayload(payload), payload);
    return id;
  }

  async replace(
    name: string,
    id: string,
    document: BsonDocument,
  ): Promise<ReplaceResult> {
    encodeKey(id);
    const collection = await this.collection(name);
    const record =
      collection.kind === 'live'
        ? await this.document(collection, id)
        : undefined;
    if (collection.kind !== 'live' || record?.target == null) {
      return {
        acknowledged: true,
        matchedCount: 0,
        modifiedCount: 0,
        upsertedCount: 0,
      };
    }
    const { payload } = encodeDocumentForWrite(document, () => id, id);
    const target = digestPayload(payload);
    const changed = target !== record.target;
    if (changed) this.stageDocument(collection, id, target, payload);
    return {
      acknowledged: true,
      matchedCount: 1,
      modifiedCount: changed ? 1 : 0,
      upsertedCount: 0,
    };
  }

  async delete(name: string, id: string): Promise<DeleteResult> {
    encodeKey(id);
    const collection = await this.collection(name);
    if (
      collection.kind !== 'live' ||
      (await this.document(collection, id))?.target == null
    ) {
      return { acknowledged: true, deletedCount: 0 };
    }
    collection.changes.set(id, {
      key: id,
      version: this.nextVersion(),
      target: null,
    });
    return { acknowledged: true, deletedCount: 1 };
  }

  private *documentPayloads(): IterableIterator<Uint8Array> {
    for (const collection of this.pending.values()) {
      if (collection.kind !== 'live') continue;
      for (const { target } of collection.changes.values()) {
        if (target === null) continue;
        const payload = this.documents.get(target);
        if (payload) {
          this.documents.delete(target);
          yield payload;
        }
      }
    }
  }

  async persist(): Promise<Digest | null> {
    await this.writer.writeBlocks(this.documentPayloads());
    const catalogChanges: V2Record[] = [];
    for (const [key, collection] of this.pending) {
      if (collection.kind === 'missing') {
        if (collection.dropVersion) {
          catalogChanges.push({
            key,
            version: collection.dropVersion,
            target: null,
          });
        }
        continue;
      }
      if (!collection.created && collection.changes.size === 0) continue;

      const records = Array.from(collection.changes.values());
      const primary = await this.primary.setMany(
        collection.root.primary,
        records,
      );
      const target = await this.writer.writeBlock(
        encodeMetadata({ ...collection.root, primary }),
      );
      catalogChanges.push({ key, version: collection.root.generation, target });
    }

    if (catalogChanges.length === 0) return null;
    const catalog = await this.catalog.setMany(
      this.root.catalog,
      catalogChanges,
    );
    return this.writer.writeBlock(
      encodeMetadata({ ...this.root, clock: this.clock, catalog }),
    );
  }
}

/**
 * A read-only view of the database at one root. Every read resolves against
 * that root, however many commits have been published since.
 */
export class PortableSnapshot {
  /** @internal Use PortableBrightDb.at() or PortableBrightDb.snapshot(). */
  constructor(
    private readonly store: BrightDbV2DiskStore,
    private readonly catalog: V2Tree,
    private readonly primary: V2Tree,
    /** The SHA3-512 digest identifying this database state. */
    readonly root: Digest,
    private readonly rootBlock: V2DatabaseRoot,
  ) {}

  async listCollections(): Promise<string[]> {
    const names: string[] = [];
    for await (const record of this.catalog.entries(this.rootBlock.catalog)) {
      if (record.version.counter > this.rootBlock.clock) {
        throw new Error('BrightDB catalog version exceeds the database clock');
      }
      if (record.target !== null) names.push(record.key);
    }
    return names;
  }

  private async readDocument<T extends BsonDocument>(
    record: V2Record,
    collection: V2CollectionRoot,
  ): Promise<T | null> {
    checkPrimaryVersion(record, collection.generation, this.rootBlock.clock);
    if (record.target === null) return null;
    return decodeDocument(
      await this.store.readBlock(record.target),
      record.key,
    ) as T;
  }

  private async *findMatching<T extends BsonDocument>(
    name: string,
    filter: FilterQuery<T>,
  ): AsyncGenerator<T> {
    const exactId = Object.entries(filter).find(([key]) => key === '_id')?.[1];
    if (typeof exactId === 'string') encodeKey(exactId);
    const collection = await readCollectionRoot(
      this.store,
      this.catalog,
      this.rootBlock,
      name,
    );
    if (!collection) return;

    if (typeof exactId === 'string') {
      const record = await this.primary.get(collection.primary, exactId);
      const document = record && (await this.readDocument<T>(record, collection));
      if (document && matchesFilter(document, filter)) yield document;
      return;
    }

    for await (const record of this.primary.entries(collection.primary)) {
      const document = await this.readDocument<T>(record, collection);
      if (document && matchesFilter(document, filter)) yield document;
    }
  }

  collection<T extends BsonDocument = BsonDocument>(
    name: string,
  ): PortableReadCollection<T> {
    encodeKey(name);
    return {
      name,
      findById: async (id) => {
        encodeKey(id);
        const collection = await readCollectionRoot(
          this.store,
          this.catalog,
          this.rootBlock,
          name,
        );
        if (!collection) return null;
        const record = await this.primary.get(collection.primary, id);
        return record ? this.readDocument<T>(record, collection) : null;
      },
      findOne: async (filter = {}) => {
        for await (const document of this.findMatching<T>(name, filter))
          return document;
        return null;
      },
      find: (filter = {}) =>
        new Cursor<T>(async () => {
          const documents: T[] = [];
          for await (const document of this.findMatching<T>(name, filter))
            documents.push(document);
          return documents;
        }),
    };
  }

  /** The collection root for a live collection, or null if it does not exist here. */
  async collectionRoot(name: string): Promise<V2CollectionRoot | null> {
    return readCollectionRoot(this.store, this.catalog, this.rootBlock, name);
  }

  /** @internal */
  async document<T extends BsonDocument>(
    record: V2Record,
    collection: V2CollectionRoot,
  ): Promise<T | null> {
    return this.readDocument<T>(record, collection);
  }
}

/** A standalone database using the portable BrightDB v2 disk format. */
export class PortableBrightDb {
  private readonly catalog: V2Tree;
  private readonly primary: V2Tree;
  private closed = false;

  private constructor(private readonly store: BrightDbV2DiskStore) {
    this.catalog = readTree(store, 'catalog');
    this.primary = readTree(store, 'primary');
  }

  static async open({
    path,
  }: PortableBrightDbOptions): Promise<PortableBrightDb> {
    const emptyRoot = encodeMetadata({
      kind: 'database',
      databaseId: randomBytes(16).toString('hex'),
      clock: 0n,
      catalog: null,
    });
    const store = await BrightDbV2DiskStore.openOrCreate(path, emptyRoot);
    await readDatabaseRoot(store);
    return new PortableBrightDb(store);
  }

  private requireOpen(): void {
    if (this.closed) throw new Error('BrightDB database is closed');
  }

  /** Prevent new operations on this handle. Operations already started may finish. */
  close(): void {
    this.closed = true;
    for (const stop of [...this.subscribers]) stop();
  }

  private readonly subscribers = new Set<() => void>();

  /**
   * Call `listener` after the database root moves, whether the commit came
   * from this handle or from another process using the same directory. A
   * burst of commits can arrive as one event; `event.changes()` diffs the
   * whole span. Events for one subscriber are delivered one at a time and in
   * order. Returns a function that stops the subscription.
   */
  async subscribe(
    listener: (event: PortableChangeEvent) => void | Promise<void>,
    { intervalMs = 250, onError }: PortableSubscribeOptions = {},
  ): Promise<() => void> {
    this.requireOpen();
    let last = await this.store.readHead();
    let stopped = false;
    let running = false;
    let again = false;
    const check = async (): Promise<void> => {
      if (stopped) return;
      if (running) {
        again = true;
        return;
      }
      running = true;
      try {
        do {
          again = false;
          const root = await this.store.readHead();
          if (root !== last) {
            const previous = last;
            last = root;
            await listener({
              previous,
              root,
              changes: <T extends BsonDocument = BsonDocument>() =>
                this.diff<T>(previous, root),
            });
          }
        } while (again && !stopped);
      } catch (error) {
        onError?.(error);
      } finally {
        running = false;
      }
    };
    const timer = setInterval(() => void check(), intervalMs);
    timer.unref();
    const wake = () => void check();
    this.wakeups.add(wake);
    const stop = () => {
      stopped = true;
      clearInterval(timer);
      this.wakeups.delete(wake);
      this.subscribers.delete(stop);
    };
    this.subscribers.add(stop);
    return stop;
  }

  private readonly wakeups = new Set<() => void>();

  /** The digest of the current database state. Equal roots mean equal data. */
  async root(): Promise<string> {
    this.requireOpen();
    return this.store.readHead();
  }

  /** A read-only view of the database as it is right now. */
  async snapshot(): Promise<PortableSnapshot> {
    this.requireOpen();
    return this.at(await this.store.readHead());
  }

  /**
   * A read-only view of the database at an earlier root. Every root ever
   * published stays readable while its blocks exist (there is no garbage
   * collection yet). Throws if the root is not a database root or its
   * blocks are missing.
   */
  async at(root: string): Promise<PortableSnapshot> {
    this.requireOpen();
    const rootBlock = decodeMetadata(await this.store.readBlock(root), root);
    if (rootBlock.kind !== 'database') {
      throw new Error('Digest does not identify a BrightDB database root');
    }
    const current = await readDatabaseRoot(this.store);
    if (rootBlock.databaseId !== current.databaseId) {
      throw new Error('Root belongs to a different BrightDB database');
    }
    return new PortableSnapshot(
      this.store,
      this.catalog,
      this.primary,
      root,
      rootBlock,
    );
  }

  /**
   * The document-level changes from one root to another. Pages whose digests
   * match are skipped without being read, so the cost follows the size of the
   * change. A dropped or recreated collection reports all of its old documents
   * as deleted and all of its new documents as added.
   */
  async *diff<T extends BsonDocument = BsonDocument>(
    from: string,
    to: string,
  ): AsyncGenerator<PortableChange<T>> {
    const before = await this.at(from);
    const after = await this.at(to);
    const names = new Set([
      ...(await before.listCollections()),
      ...(await after.listCollections()),
    ]);
    for (const name of [...names].sort(compareKeys)) {
      const a = await before.collectionRoot(name);
      const b = await after.collectionRoot(name);
      const sameGeneration =
        a && b && compareVersions(a.generation, b.generation) === 0;
      const changes = sameGeneration
        ? this.primary.diff(a.primary, b.primary)
        : this.generationReplaced(a, b);
      for await (const change of changes) {
        const oldDoc =
          change.before?.target != null && a
            ? await before.document<T>(change.before, a)
            : null;
        const newDoc =
          change.after?.target != null && b
            ? await after.document<T>(change.after, b)
            : null;
        const type = !oldDoc
          ? newDoc
            ? 'added'
            : null
          : newDoc
            ? 'modified'
            : 'deleted';
        if (type === null) continue;
        yield {
          collection: name,
          id: change.key,
          type,
          ...(oldDoc ? { before: oldDoc } : {}),
          ...(newDoc ? { after: newDoc } : {}),
        };
      }
    }
  }

  /** Changes when a collection was dropped, created or recreated between roots. */
  private async *generationReplaced(
    a: V2CollectionRoot | null,
    b: V2CollectionRoot | null,
  ): AsyncGenerator<{ key: string; before?: V2Record; after?: V2Record }> {
    if (a) {
      for await (const record of this.primary.entries(a.primary)) {
        yield { key: record.key, before: record };
      }
    }
    if (b) {
      for await (const record of this.primary.entries(b.primary)) {
        yield { key: record.key, after: record };
      }
    }
  }

  private async commit<T>(
    stage: (batch: WriteBatch) => Promise<T>,
  ): Promise<T> {
    this.requireOpen();
    return this.store.withWriteLock(async (writer) => {
      const root = await readDatabaseRoot(this.store);
      const batch = new WriteBatch(
        this.store,
        writer,
        root,
        Buffer.from(this.store.writerId).toString('hex'),
      );
      const result = await stage(batch);
      const head = await batch.persist();
      if (head !== null) await writer.publishHead(head);
      return result;
    }).then((result) => {
      // Tell this handle's subscribers now instead of at their next poll.
      for (const wake of this.wakeups) wake();
      return result;
    });
  }

  /** Apply a batch in order and publish all of its changes as one commit. */
  async writeBatch(
    operations: readonly PortableWriteOperation[],
  ): Promise<void> {
    await this.commit(async (batch) => {
      for (const operation of operations) {
        const { collection } = operation;
        switch (operation.type) {
          case 'createCollection':
            await batch.createCollection(collection);
            break;
          case 'dropCollection':
            await batch.dropCollection(collection);
            break;
          case 'insert':
            await batch.insert(collection, operation.document);
            break;
          case 'replace':
            await batch.replace(collection, operation.id, operation.document);
            break;
          case 'delete':
            await batch.delete(collection, operation.id);
            break;
          default:
            throw new Error('Unsupported BrightDB write operation');
        }
      }
    });
  }

  async listCollections(): Promise<string[]> {
    return (await this.snapshot()).listCollections();
  }

  collection<T extends BsonDocument = BsonDocument>(
    name: string,
  ): PortableCollection<T> {
    this.requireOpen();
    encodeKey(name);
    // Each read pins the root that is current when it starts.
    const read = async () => (await this.snapshot()).collection<T>(name);
    return {
      name,
      findById: async (id) => (await read()).findById(id),
      findOne: async (filter = {}) => (await read()).findOne(filter),
      find: (filter = {}) =>
        new Cursor<T>(async () => (await (await read()).find(filter).toArray())),
      insertOne: (document) =>
        this.commit(async (batch) => ({
          acknowledged: true,
          insertedId: await batch.insert(name, document),
        })),
      insertMany: (documents) =>
        this.commit(async (batch) => {
          const insertedIds: Record<number, string> = {};
          for (const [index, document] of documents.entries()) {
            insertedIds[index] = await batch.insert(name, document);
          }
          return {
            acknowledged: true,
            insertedCount: documents.length,
            insertedIds,
          };
        }),
      replaceById: (id, document) =>
        this.commit((batch) => batch.replace(name, id, document)),
      deleteById: (id) => this.commit((batch) => batch.delete(name, id)),
    };
  }
}
