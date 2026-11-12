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
  type V2IndexDefinition,
  type V2Record,
  type V2Version,
} from './codec';
import {
  readAttachment,
  streamAttachment,
  validateFileReferences,
  writeAttachment,
  type AttachmentRef,
} from './attachments';
import {
  BrightDbV2DiskStore,
  BrightDbV2StorageError,
  type BrightDbV2DiskWriter,
  type BrightDbV2Storage,
} from './disk-store';
import {
  decodeIndexId,
  extractIndexKeys,
  indexRange,
  type IndexQuery,
} from './index-key';
import { BrightDbV2AesCipher } from './encryption';
import { V2IndexTree } from './index-tree';
import type { BrightDbV2BlockSource } from './block-source';
import { copyDatabase, mergeReplica, type PortableMergeResult } from './merge';
import { V2Tree } from './tree';

export interface PortableBrightDbOptions {
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
  encryption?: { key: Uint8Array };
}

export type PortableWriteOperation =
  | { type: 'createCollection' | 'dropCollection'; collection: string }
  | { type: 'insert'; collection: string; document: BsonDocument }
  | { type: 'replace'; collection: string; id: string; document: BsonDocument }
  | { type: 'delete'; collection: string; id: string }
  | { type: 'createIndex'; collection: string; name: string; fields: readonly string[] }
  | { type: 'dropIndex'; collection: string; name: string };

/** The read-only half of a collection. A snapshot exposes only this. */
export interface PortableReadCollection<T extends BsonDocument = BsonDocument> {
  readonly name: string;
  findById(id: string): Promise<T | null>;
  findOne(filter?: FilterQuery<T>): Promise<T | null>;
  find(filter?: FilterQuery<T>): Cursor<T>;
  /** Index definitions on this collection, by name. */
  listIndexes(): Promise<Array<{ name: string; fields: string[] }>>;
  /**
   * Documents found through an ordered index, in index order. Each document
   * appears once even when an array field gives it several entries.
   */
  findByIndex(name: string, query?: IndexQuery): Promise<T[]>;
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
  /** Build an index over the existing documents and keep it current from then on. */
  createIndex(name: string, fields: readonly string[]): Promise<void>;
  dropIndex(name: string): Promise<void>;
}

type BlockReader = Pick<BrightDbV2Storage, 'readBlock'>;
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

function readIndexTree(store: BlockReader): V2IndexTree {
  return new V2IndexTree({
    get: (digest) => store.readBlock(digest),
    put: async () => {
      throw new Error('Cannot write a BrightDB read snapshot');
    },
  });
}

async function readIndexDefinitions(
  store: BlockReader,
  collection: V2CollectionRoot,
): Promise<V2IndexDefinition[]> {
  if (collection.indexes === null) return [];
  const set = decodeMetadata(
    await store.readBlock(collection.indexes),
    collection.indexes,
  );
  if (set.kind !== 'indexes') {
    throw new Error('BrightDB collection indexes do not reference an index set');
  }
  return [...set.definitions];
}

async function readDatabaseRoot(
  store: BrightDbV2Storage,
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

interface LiveCollection {
  kind: 'live';
  root: V2CollectionRoot;
  created: boolean;
  changes: Map<string, V2Record>;
  /** Index definitions as of this batch; null until first needed. */
  definitions: V2IndexDefinition[] | null;
  /** Net entry changes per index, relative to the index root in the base state. */
  indexAdds: Map<string, Map<string, Buffer>>;
  indexRemoves: Map<string, Map<string, Buffer>>;
  indexesChanged: boolean;
}

type PendingCollection =
  | LiveCollection
  | { kind: 'missing'; dropVersion?: V2Version };

function liveCollection(root: V2CollectionRoot, created: boolean): LiveCollection {
  return {
    kind: 'live',
    root,
    created,
    changes: new Map(),
    definitions: created ? [] : null,
    indexAdds: new Map(),
    indexRemoves: new Map(),
    indexesChanged: false,
  };
}

/** Stages catalog and primary index changes against one pinned database root. */
class WriteBatch {
  private readonly pending = new Map<string, PendingCollection>();
  private readonly documents = new Map<Digest, Uint8Array>();
  private readonly catalog: V2Tree;
  private readonly primary: V2Tree;
  private readonly indexTree: V2IndexTree;
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
    this.indexTree = new V2IndexTree(blocks);
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
      ? liveCollection(root, false)
      : { kind: 'missing' };
    this.pending.set(name, loaded);
    return loaded;
  }

  private addCollection(name: string): LiveCollection {
    const collection = liveCollection(
      {
        kind: 'collection',
        generation: this.nextVersion(),
        primary: null,
        indexes: null,
      },
      true,
    );
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
    collection: LiveCollection,
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
    collection: LiveCollection,
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
    await validateFileReferences(this.store as BrightDbV2Storage, document);
    const existing = await this.collection(name);
    const collection =
      existing.kind === 'live' ? existing : this.addCollection(name);
    if ((await this.document(collection, id))?.target != null) {
      throw new DuplicateKeyError('_id_', id);
    }
    await this.maintainIndexes(collection, id, null, payload);
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
    await validateFileReferences(this.store as BrightDbV2Storage, document);
    const target = digestPayload(payload);
    const changed = target !== record.target;
    if (changed) {
      await this.maintainIndexes(collection, id, record.target, payload);
      this.stageDocument(collection, id, target, payload);
    }
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
    const existing = await this.document(collection, id);
    await this.maintainIndexes(collection, id, existing?.target ?? null, null);
    collection.changes.set(id, {
      key: id,
      version: this.nextVersion(),
      target: null,
    });
    return { acknowledged: true, deletedCount: 1 };
  }


  private async documentBytes(digest: Digest): Promise<Uint8Array> {
    return this.documents.get(digest) ?? (await this.store.readBlock(digest));
  }

  private async definitions(
    collection: LiveCollection,
  ): Promise<V2IndexDefinition[]> {
    if (collection.definitions === null) {
      collection.definitions = await readIndexDefinitions(
        this.store,
        collection.root,
      );
    }
    return collection.definitions;
  }

  private noteEntry(
    collection: LiveCollection,
    index: string,
    key: Buffer,
    kind: 'add' | 'remove',
  ): void {
    const hex = key.toString('hex');
    const adds = collection.indexAdds.get(index) ?? new Map<string, Buffer>();
    const removes = collection.indexRemoves.get(index) ?? new Map<string, Buffer>();
    collection.indexAdds.set(index, adds);
    collection.indexRemoves.set(index, removes);
    if (kind === 'add') {
      // Re-adding an entry removed earlier in this batch cancels the removal.
      if (!removes.delete(hex)) adds.set(hex, key);
    } else if (!adds.delete(hex)) {
      removes.set(hex, key);
    }
    collection.indexesChanged = true;
  }

  /** Move index entries from a document's old content to its new content. */
  private async maintainIndexes(
    collection: LiveCollection,
    id: string,
    oldTarget: Digest | null,
    newPayload: Uint8Array | null,
  ): Promise<void> {
    const definitions = await this.definitions(collection);
    if (definitions.length === 0) return;
    const oldDocument =
      oldTarget === null
        ? null
        : decodeDocument(await this.documentBytes(oldTarget), id);
    const newDocument =
      newPayload === null ? null : decodeDocument(newPayload, id);
    for (const definition of definitions) {
      const before = oldDocument
        ? extractIndexKeys(oldDocument, definition.fields, id)
        : [];
      const after = newDocument
        ? extractIndexKeys(newDocument, definition.fields, id)
        : [];
      const beforeSet = new Set(before.map((key) => key.toString('hex')));
      const afterSet = new Set(after.map((key) => key.toString('hex')));
      for (const key of before) {
        if (!afterSet.has(key.toString('hex'))) {
          this.noteEntry(collection, definition.name, key, 'remove');
        }
      }
      for (const key of after) {
        if (!beforeSet.has(key.toString('hex'))) {
          this.noteEntry(collection, definition.name, key, 'add');
        }
      }
    }
  }

  async createIndex(
    name: string,
    indexName: string,
    fields: readonly string[],
  ): Promise<void> {
    encodeKey(indexName);
    const existing = await this.collection(name);
    // Like inserting, creating an index creates a missing collection.
    const collection = existing.kind === 'live' ? existing : this.addCollection(name);
    const definitions = await this.definitions(collection);
    if (definitions.some((definition) => definition.name === indexName)) {
      throw new Error(`BrightDB index already exists: ${indexName}`);
    }
    // Validates names and field paths before any scan.
    encodeMetadata({
      kind: 'indexes',
      definitions: [{ name: indexName, fields, root: null }],
    });

    const entries = new Map<string, Buffer>();
    const addDocument = (id: string, document: unknown) => {
      for (const key of extractIndexKeys(document, [...fields], id)) {
        entries.set(key.toString('hex'), key);
      }
    };
    const seen = new Set<string>();
    for await (const record of this.primary.entries(collection.root.primary)) {
      seen.add(record.key);
      const effective = collection.changes.get(record.key) ?? record;
      if (effective.target !== null) {
        addDocument(
          record.key,
          decodeDocument(await this.documentBytes(effective.target), record.key),
        );
      }
    }
    for (const [id, record] of collection.changes) {
      if (!seen.has(id) && record.target !== null) {
        addDocument(
          id,
          decodeDocument(await this.documentBytes(record.target), id),
        );
      }
    }
    definitions.push({ name: indexName, fields: [...fields], root: null });
    collection.indexAdds.set(indexName, entries);
    collection.indexRemoves.set(indexName, new Map());
    collection.indexesChanged = true;
  }

  async dropIndex(name: string, indexName: string): Promise<void> {
    const collection = await this.collection(name);
    if (collection.kind !== 'live') {
      throw new Error(`BrightDB collection does not exist: ${name}`);
    }
    const definitions = await this.definitions(collection);
    const position = definitions.findIndex((d) => d.name === indexName);
    if (position < 0) throw new Error(`BrightDB index does not exist: ${indexName}`);
    definitions.splice(position, 1);
    collection.indexAdds.delete(indexName);
    collection.indexRemoves.delete(indexName);
    collection.indexesChanged = true;
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
      if (
        !collection.created &&
        collection.changes.size === 0 &&
        !collection.indexesChanged
      ) {
        continue;
      }

      const records = Array.from(collection.changes.values());
      const primary = await this.primary.setMany(
        collection.root.primary,
        records,
      );
      let indexes = collection.root.indexes;
      if (collection.indexesChanged) {
        const updated: V2IndexDefinition[] = [];
        for (const definition of collection.definitions ?? []) {
          const root = await this.indexTree.apply(
            definition.root,
            [...(collection.indexAdds.get(definition.name)?.values() ?? [])],
            [...(collection.indexRemoves.get(definition.name)?.values() ?? [])],
          );
          updated.push({ ...definition, root });
        }
        indexes =
          updated.length === 0
            ? null
            : await this.writer.writeBlock(
                encodeMetadata({ kind: 'indexes', definitions: updated }),
              );
      }
      const target = await this.writer.writeBlock(
        encodeMetadata({ ...collection.root, primary, indexes }),
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
    private readonly store: BrightDbV2Storage,
    private readonly catalog: V2Tree,
    private readonly primary: V2Tree,
    private readonly indexTree: V2IndexTree,
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
      listIndexes: async () => {
        const collection = await readCollectionRoot(
          this.store,
          this.catalog,
          this.rootBlock,
          name,
        );
        if (!collection) return [];
        return (await readIndexDefinitions(this.store, collection)).map(
          ({ name: indexName, fields }) => ({ name: indexName, fields: [...fields] }),
        );
      },
      findByIndex: async (indexName, query = {}) => {
        const collection = await readCollectionRoot(
          this.store,
          this.catalog,
          this.rootBlock,
          name,
        );
        if (!collection) throw new Error(`BrightDB collection does not exist: ${name}`);
        const definition = (await readIndexDefinitions(this.store, collection)).find(
          (candidate) => candidate.name === indexName,
        );
        if (!definition) throw new Error(`BrightDB index does not exist: ${indexName}`);
        const { lo, hi } = indexRange(definition.fields.length, query);
        const limit = query.limit ?? Number.POSITIVE_INFINITY;
        const seen = new Set<string>();
        const documents: T[] = [];
        for await (const entry of this.indexTree.range(
          definition.root,
          lo,
          hi,
          query.descending === true,
        )) {
          if (documents.length >= limit) break;
          const id = decodeIndexId(entry, definition.fields.length);
          if (seen.has(id)) continue;
          seen.add(id);
          const record = await this.primary.get(collection.primary, id);
          const document = record ? await this.readDocument<T>(record, collection) : null;
          if (!document) {
            throw new Error(`BrightDB index ${indexName} references a missing document`);
          }
          documents.push(document);
        }
        return documents;
      },
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
  private readonly indexTree: V2IndexTree;
  private closed = false;

  private constructor(private readonly store: BrightDbV2Storage) {
    this.catalog = readTree(store, 'catalog');
    this.primary = readTree(store, 'primary');
    this.indexTree = readIndexTree(store);
  }

  static async open({
    path,
    storage,
    encryption,
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
      encryption ? new BrightDbV2AesCipher(encryption.key) : null,
    );
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

  /**
   * Store a file of any size and return a reference to put under `_files` in a
   * document. Pass a stream to avoid holding the file in memory. Files over
   * 1 MiB are split into chunks under a tree of manifests. The blocks are durable at once but
   * are not part of the database until a committed document references them.
   */
  async putAttachment(
    bytes: Uint8Array | AsyncIterable<Uint8Array>,
    options: { type?: string } = {},
  ): Promise<AttachmentRef> {
    this.requireOpen();
    return this.store.withWriteLock((writer) =>
      writeAttachment(writer, bytes, options.type),
    );
  }

  /** Read a whole file. Use `streamAttachment` to avoid holding it in memory. */
  async getAttachment(ref: Pick<AttachmentRef, 'digest'>): Promise<Buffer> {
    this.requireOpen();
    return readAttachment(this.store, ref.digest);
  }

  /** The file's chunks in order, each fetched and verified as it is read. */
  streamAttachment(ref: Pick<AttachmentRef, 'digest'>): AsyncGenerator<Buffer> {
    this.requireOpen();
    return streamAttachment(this.store, ref.digest);
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
    await store.withWriteLock(async (writer) => {
      await copyDatabase(store, writer, this.store, head);
      await writer.publishHead(head);
    });
    return new PortableBrightDb(store);
  }

  /**
   * Merge another replica of this database into this one. The other replica can
   * be a database handle or any block source, such as an `HttpBlockSource`. Its
   * current root is used unless `options.root` names an earlier one. Per
   * document the greater version wins, a deletion beats an equal version, and
   * for equal live versions the greater digest wins. A collection that was
   * dropped or recreated with a greater generation replaces the older one.
   * Merging in either direction, or in any order, gives the same root. Nothing
   * is published if any block the merge needs is missing or fails its digest.
   */
  async merge(
    other: PortableBrightDb | BrightDbV2BlockSource,
    options: { root?: string } = {},
  ): Promise<PortableMergeResult> {
    this.requireOpen();
    // A database, a storage and an HTTP source all answer "current root" and "block by digest".
    const source: BrightDbV2BlockSource = other instanceof PortableBrightDb ? other.store : other;
    const remoteHead = options.root ?? (await source.readHead());
    const result = await this.store.withWriteLock(async (writer) => {
      const previous = await this.store.readHead();
      const merged = await mergeReplica(this.store, writer, source, remoteHead);
      if (!merged) return { previous, root: previous, adopted: 0 };
      await writer.publishHead(merged.root);
      return { previous, root: merged.root, adopted: merged.adopted };
    });
    for (const wake of this.wakeups) wake();
    return result;
  }

  /**
   * This database as a block source, for `serveBlocks` or another database's
   * `merge`. Blocks come out as plaintext, even from an encrypted directory.
   */
  blockSource(): BrightDbV2BlockSource {
    this.requireOpen();
    return this.store;
  }

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
      this.indexTree,
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
          case 'createIndex':
            await batch.createIndex(collection, operation.name, operation.fields);
            break;
          case 'dropIndex':
            await batch.dropIndex(collection, operation.name);
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
      createIndex: (indexName, fields) =>
        this.commit((batch) => batch.createIndex(name, indexName, fields)),
      dropIndex: (indexName) =>
        this.commit((batch) => batch.dropIndex(name, indexName)),
      listIndexes: async () => (await read()).listIndexes(),
      findByIndex: async (indexName, query) =>
        (await read()).findByIndex(indexName, query),
    };
  }
}
