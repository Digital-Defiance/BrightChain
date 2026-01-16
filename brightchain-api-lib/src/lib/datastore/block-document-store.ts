import { createHash, randomUUID } from 'crypto';
import { IBlockStore } from '@brightchain/brightchain-lib';
import {
  DocumentCollection,
  DocumentId,
  DocumentRecord,
  DocumentStore,
  QueryBuilder,
  QueryResultType,
} from './document-store';

class BlockQuery<T extends QueryResultType> implements QueryBuilder<T> {
  constructor(private readonly resolveValue: () => Promise<T | null>) {}

  private self(): this {
    return this;
  }

  select(): this {
    return this.self();
  }
  populate(): this {
    return this.self();
  }
  sort(): this {
    return this.self();
  }
  limit(): this {
    return this.self();
  }
  skip(): this {
    return this.self();
  }
  lean(): this {
    return this.self();
  }
  collation(): this {
    return this.self();
  }
  session(): this {
    return this.self();
  }
  where(): this {
    return this.self();
  }
  distinct(): this {
    return this.self();
  }

  async exec(): Promise<T | null> {
    return this.resolveValue();
  }

  then<TResult1 = T | null, TResult2 = never>(
    onfulfilled?: ((value: T | null) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null,
  ): Promise<TResult1 | TResult2> {
    return this.exec().then(onfulfilled, onrejected);
  }
}

function matchFilter<T extends DocumentRecord>(doc: T, filter: Partial<T> = {}): boolean {
  return Object.entries(filter).every(([key, value]) => {
    if (value === undefined) return true;
    return (doc as Record<string, unknown>)[key] === value;
  });
}

function toBlockId(id: DocumentId): string {
  return typeof id === 'string' ? id : Buffer.from(id).toString('hex');
}

function sha256Hex(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

async function encodeDoc(doc: DocumentRecord): Promise<Buffer> {
  return Buffer.from(JSON.stringify(doc), 'utf8');
}

function decodeDoc<T extends DocumentRecord>(buf: Buffer): T {
  return JSON.parse(buf.toString('utf8')) as T;
}

class BlockCollection<T extends DocumentRecord> implements DocumentCollection<T> {
  private readonly index = new Map<string, string>(); // _id -> blockId
  private readonly headBlockId: string; // deterministic anchor for the current index pointer
  private indexLoaded = false;
  private indexLoading: Promise<void> | undefined;

  constructor(private readonly store: IBlockStore, private readonly collectionName: string) {
    // Head anchor is deterministic from the collection name so we can discover the latest index pointer.
    this.headBlockId = createHash('sha256').update(`index-head:${collectionName}`).digest('hex');
  }

  private async ensureIndexLoaded(): Promise<void> {
    if (this.indexLoaded) return;
    if (!this.indexLoading) {
      this.indexLoading = (async () => {
        const headExists = await this.store.has(this.headBlockId);
        if (headExists) {
          const head = await this.store.get(this.headBlockId);
          const headData = head.data as Uint8Array;
          const headPayload = JSON.parse(Buffer.from(headData).toString('utf8')) as {
            indexId?: string;
          };
          if (headPayload?.indexId) {
            const indexBlock = await this.store.get(headPayload.indexId);
            const indexData = indexBlock.data as Uint8Array;
            const parsed = JSON.parse(Buffer.from(indexData).toString('utf8')) as {
              ids?: string[];
            };
            if (parsed?.ids) {
              for (const id of parsed.ids) {
                this.index.set(id, id);
              }
            }
          }
        }
        this.indexLoaded = true;
      })().finally(() => {
        this.indexLoading = undefined;
      });
    }
    return this.indexLoading;
  }

  private async persistIndex(): Promise<void> {
    const payload = Buffer.from(
      JSON.stringify({ ids: Array.from(this.index.keys()) }),
      'utf8',
    );
    if (payload.length > this.store.blockSize) {
      throw new Error(
        `Index too large for block size (${payload.length} > ${this.store.blockSize}) in ${this.collectionName}`,
      );
    }

    const indexBlockId = sha256Hex(payload);
    await this.store.put(indexBlockId, payload);

    const headPayload = Buffer.from(JSON.stringify({ indexId: indexBlockId }), 'utf8');
    if (headPayload.length > this.store.blockSize) {
      throw new Error(
        `Head too large for block size (${headPayload.length} > ${this.store.blockSize}) in ${this.collectionName}`,
      );
    }
    await this.store.put(this.headBlockId, headPayload);
  }

  private resolveBlockId(id?: DocumentId): string {
    return id ? toBlockId(id) : randomUUID().replace(/-/g, '');
  }

  private async writeDoc(doc: T, existingId?: string): Promise<T> {
    await this.ensureIndexLoaded();
    const blockId = this.resolveBlockId(existingId ?? (doc as DocumentRecord)._id);
    const data = await encodeDoc({ ...doc, _id: existingId ?? blockId });
    if (data.length > this.store.blockSize) {
      throw new Error(
        `Document too large for block size (${data.length} > ${this.store.blockSize}) in ${this.collectionName}`,
      );
    }
    await this.store.put(blockId, data);
    this.index.set(blockId, blockId);
    (doc as DocumentRecord)._id = blockId;
    await this.persistIndex();
    return doc;
  }

  private async readDoc(blockId: string): Promise<T | null> {
    await this.ensureIndexLoaded();
    if (!this.index.has(blockId)) return null;
    const block = await this.store.get(blockId);
    const blockData = block.data as Uint8Array;
    return decodeDoc<T>(Buffer.from(blockData));
  }

  private toSingleQuery(resolver: () => Promise<T | null>): QueryBuilder<T> {
    return new BlockQuery<T>(resolver) as QueryBuilder<T>;
  }

  private toManyQuery(resolver: () => Promise<T[]>): QueryBuilder<T[]> {
    return new BlockQuery<T[]>(resolver as () => Promise<T[] | null>) as QueryBuilder<T[]>;
  }

  find(filter?: Partial<T>): QueryBuilder<T[]> {
    return this.toManyQuery(async () => {
      await this.ensureIndexLoaded();
      const docs: T[] = [];
      for (const id of this.index.keys()) {
        const doc = await this.readDoc(id);
        if (doc && matchFilter(doc, filter)) docs.push(doc);
      }
      return docs;
    });
  }

  findOne(filter?: Partial<T>): QueryBuilder<T> {
    return this.toSingleQuery(async () => {
      await this.ensureIndexLoaded();
      for (const id of this.index.keys()) {
        const doc = await this.readDoc(id);
        if (doc && matchFilter(doc, filter)) return doc;
      }
      return null;
    });
  }

  findById(id: DocumentId): QueryBuilder<T> {
    const blockId = toBlockId(id);
    return this.toSingleQuery(() => this.readDoc(blockId));
  }

  findOneAndUpdate(filter: Partial<T>, update: Partial<T>): QueryBuilder<T> {
    return this.toSingleQuery(async () => {
      const doc = await this.findOne(filter).exec();
      if (!doc) return null;
      Object.assign(doc, update);
      await this.writeDoc(doc as T, toBlockId((doc as DocumentRecord)._id));
      return doc as T;
    });
  }

  findOneAndDelete(filter: Partial<T>): QueryBuilder<T> {
    return this.toSingleQuery(async () => {
      const doc = await this.findOne(filter).exec();
      if (!doc) return null;
      await this.deleteOne({ _id: (doc as DocumentRecord)._id } as Partial<T>);
      return doc as T;
    });
  }

  findByIdAndUpdate(id: DocumentId, update: Partial<T>): QueryBuilder<T> {
    return this.findOneAndUpdate({ _id: id } as Partial<T>, update);
  }

  findByIdAndDelete(id: DocumentId): QueryBuilder<T> {
    return this.findOneAndDelete({ _id: id } as Partial<T>);
  }

  async create(doc: T): Promise<T> {
    await this.ensureIndexLoaded();
    return this.writeDoc({ ...(doc as DocumentRecord) } as T);
  }

  async insertMany(docs: T[]): Promise<T[]> {
    await this.ensureIndexLoaded();
    const res: T[] = [];
    for (const doc of docs) {
      res.push(await this.create(doc));
    }
    return res;
  }

  async updateOne(filter: Partial<T>, update: Partial<T>) {
    const doc = await this.findOne(filter).exec();
    if (!doc) return { modifiedCount: 0, matchedCount: 0 };
    Object.assign(doc, update);
    await this.writeDoc(doc as T, toBlockId((doc as DocumentRecord)._id));
    return { modifiedCount: 1, matchedCount: 1 };
  }

  async updateMany(filter: Partial<T>, update: Partial<T>) {
    const docs = await this.find(filter).exec();
    let count = 0;
    if (docs) {
      for (const doc of docs) {
        Object.assign(doc, update);
        await this.writeDoc(doc as T, toBlockId((doc as DocumentRecord)._id));
        count += 1;
      }
    }
    return { modifiedCount: count, matchedCount: count };
  }

  async replaceOne(filter: Partial<T>, doc: T) {
    const existing = await this.findOne(filter).exec();
    if (!existing) return { modifiedCount: 0, matchedCount: 0 };
    await this.writeDoc(doc, toBlockId((existing as DocumentRecord)._id));
    return { modifiedCount: 1, matchedCount: 1 };
  }

  async deleteOne(filter: Partial<T>) {
    await this.ensureIndexLoaded();
    for (const id of this.index.keys()) {
      const doc = await this.readDoc(id);
      if (doc && matchFilter(doc, filter)) {
        await this.store.delete(id);
        this.index.delete(id);
        await this.persistIndex();
        return { deletedCount: 1 };
      }
    }
    return { deletedCount: 0 };
  }

  async deleteMany(filter: Partial<T>) {
    await this.ensureIndexLoaded();
    let deleted = 0;
    for (const id of Array.from(this.index.keys())) {
      const doc = await this.readDoc(id);
      if (doc && matchFilter(doc, filter)) {
        await this.store.delete(id);
        this.index.delete(id);
        deleted += 1;
      }
    }
    if (deleted > 0) {
      await this.persistIndex();
    }
    return { deletedCount: deleted };
  }

  async countDocuments(filter?: Partial<T>) {
    const docs = await this.find(filter).exec();
    return docs ? docs.length : 0;
  }

  async estimatedDocumentCount() {
    return this.index.size;
  }

  aggregate<U = unknown>(_pipeline: unknown[]): QueryBuilder<U[]> {
    return new BlockQuery<U[]>(async () => []) as QueryBuilder<U[]>;
  }

  distinct(field: keyof T): QueryBuilder<T[keyof T][]> {
    return new BlockQuery<T[keyof T][]>(async () => {
      const values = new Set<T[keyof T]>();
      for (const id of this.index.keys()) {
        const doc = await this.readDoc(id);
        if (doc && field in doc) values.add(doc[field]);
      }
      return Array.from(values);
    }) as QueryBuilder<T[keyof T][]>;
  }

  async exists(filter: Partial<T>) {
    await this.ensureIndexLoaded();
    const doc = await this.findOne(filter).exec();
    return doc ? { _id: (doc as DocumentRecord)._id as DocumentId } : null;
  }

  watch(): void {
    /* noop */
  }

  startSession(): unknown {
    return undefined;
  }
}

export class BlockDocumentStore implements DocumentStore {
  private readonly collections = new Map<string, BlockCollection<DocumentRecord>>();

  constructor(private readonly blockStore: IBlockStore) {}

  collection<T extends DocumentRecord>(name: string): DocumentCollection<T> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new BlockCollection<DocumentRecord>(this.blockStore, name));
    }
    return this.collections.get(name) as BlockCollection<T>;
  }
}
