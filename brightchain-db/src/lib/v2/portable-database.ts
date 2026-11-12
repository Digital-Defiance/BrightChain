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

export interface PortableCollection<T extends BsonDocument = BsonDocument> {
  readonly name: string;
  findById(id: string): Promise<T | null>;
  findOne(filter?: FilterQuery<T>): Promise<T | null>;
  find(filter?: FilterQuery<T>): Cursor<T>;
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
    this.requireOpen();
    const root = await readDatabaseRoot(this.store);
    const names: string[] = [];
    for await (const record of this.catalog.entries(root.catalog)) {
      if (record.version.counter > root.clock) {
        throw new Error('BrightDB catalog version exceeds the database clock');
      }
      if (record.target !== null) names.push(record.key);
    }
    return names;
  }

  private async readDocument<T extends BsonDocument>(
    record: V2Record,
    collection: V2CollectionRoot,
    root: V2DatabaseRoot,
  ): Promise<T | null> {
    checkPrimaryVersion(record, collection.generation, root.clock);
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
    this.requireOpen();
    const exactId = Object.entries(filter).find(([key]) => key === '_id')?.[1];
    if (typeof exactId === 'string') encodeKey(exactId);
    const root = await readDatabaseRoot(this.store);
    const collection = await readCollectionRoot(
      this.store,
      this.catalog,
      root,
      name,
    );
    if (!collection) return;

    if (typeof exactId === 'string') {
      const record = await this.primary.get(collection.primary, exactId);
      const document =
        record && (await this.readDocument<T>(record, collection, root));
      if (document && matchesFilter(document, filter)) yield document;
      return;
    }

    for await (const record of this.primary.entries(collection.primary)) {
      const document = await this.readDocument<T>(record, collection, root);
      if (document && matchesFilter(document, filter)) yield document;
    }
  }

  collection<T extends BsonDocument = BsonDocument>(
    name: string,
  ): PortableCollection<T> {
    this.requireOpen();
    encodeKey(name);
    return {
      name,
      findById: async (id) => {
        this.requireOpen();
        encodeKey(id);
        const root = await readDatabaseRoot(this.store);
        const collection = await readCollectionRoot(
          this.store,
          this.catalog,
          root,
          name,
        );
        if (!collection) return null;
        const record = await this.primary.get(collection.primary, id);
        return record ? this.readDocument<T>(record, collection, root) : null;
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
