import { randomUUID } from 'crypto';
import { DefaultBackendIdType } from '../shared-types';
import {
  DocumentCollection,
  DocumentId,
  DocumentRecord,
  DocumentStore,
  QueryBuilder,
} from './document-store';

// In-memory implementation of QueryBuilder for document queries
class MemoryQuery<T extends DocumentRecord> implements QueryBuilder<T> {
  private readonly resolveValue: () => Promise<T | T[] | null>;

  constructor(resolveValue: () => Promise<T | T[] | null>) {
    this.resolveValue = resolveValue;
  }

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

  async exec(): Promise<T | T[] | null> {
    return this.resolveValue();
  }

  then<TResult1 = T | T[] | null, TResult2 = never>(
    onfulfilled?: ((value: T | T[] | null) => TResult1 | PromiseLike<TResult1>) | undefined | null,
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

function ensureId(doc: DocumentRecord): DocumentRecord {
  if (!doc._id) {
    doc._id = randomUUID() as DefaultBackendIdType;
  }
  return doc;
}

class MemoryCollection<T extends DocumentRecord> implements DocumentCollection<T> {
  private readonly data: T[] = [];

  private querySingle(filter?: Partial<T>): QueryBuilder<T> {
    return new MemoryQuery<T>(async () => {
      const found = this.data.find((doc) => matchFilter(doc, filter));
      return found ?? null;
    });
  }

  private queryMany(filter?: Partial<T>): QueryBuilder<T[]> {
    return new MemoryQuery<T[]>(async () => this.data.filter((doc) => matchFilter(doc, filter)));
  }

  find(filter?: Partial<T>): QueryBuilder<T[]> {
    return this.queryMany(filter);
  }

  findOne(filter?: Partial<T>): QueryBuilder<T> {
    return this.querySingle(filter);
  }

  findById(id: DocumentId): QueryBuilder<T> {
    return this.querySingle({ _id: id } as Partial<T>);
  }

  findOneAndUpdate(filter: Partial<T>, update: Partial<T>): QueryBuilder<T> {
    return new MemoryQuery<T>(async () => {
      const doc = this.data.find((d) => matchFilter(d, filter));
      if (!doc) return null;
      Object.assign(doc, update);
      return doc;
    });
  }

  findOneAndDelete(filter: Partial<T>): QueryBuilder<T> {
    return new MemoryQuery<T>(async () => {
      const idx = this.data.findIndex((d) => matchFilter(d, filter));
      if (idx === -1) return null;
      const [removed] = this.data.splice(idx, 1);
      return removed ?? null;
    });
  }

  findByIdAndUpdate(id: DocumentId, update: Partial<T>): QueryBuilder<T> {
    return this.findOneAndUpdate({ _id: id } as Partial<T>, update);
  }

  findByIdAndDelete(id: DocumentId): QueryBuilder<T> {
    return this.findOneAndDelete({ _id: id } as Partial<T>);
  }

  async create(doc: T): Promise<T> {
    const withId = ensureId({ ...(doc as DocumentRecord) }) as T;
    this.data.push(withId);
    return withId;
  }

  async insertMany(docs: T[]): Promise<T[]> {
    const inserted = docs.map((d) => ensureId({ ...(d as DocumentRecord) }) as T);
    this.data.push(...inserted);
    return inserted;
  }

  async updateOne(filter: Partial<T>, update: Partial<T>) {
    const doc = this.data.find((d) => matchFilter(d, filter));
    if (!doc) return { modifiedCount: 0, matchedCount: 0 };
    Object.assign(doc, update);
    return { modifiedCount: 1, matchedCount: 1 };
  }

  async updateMany(filter: Partial<T>, update: Partial<T>) {
    const matches = this.data.filter((d) => matchFilter(d, filter));
    matches.forEach((doc) => Object.assign(doc, update));
    return { modifiedCount: matches.length, matchedCount: matches.length };
  }

  async replaceOne(filter: Partial<T>, doc: T) {
    const idx = this.data.findIndex((d) => matchFilter(d, filter));
    if (idx === -1) return { modifiedCount: 0, matchedCount: 0 };
    this.data[idx] = ensureId({ ...(doc as DocumentRecord) }) as T;
    return { modifiedCount: 1, matchedCount: 1 };
  }

  async deleteOne(filter: Partial<T>) {
    const idx = this.data.findIndex((d) => matchFilter(d, filter));
    if (idx === -1) return { deletedCount: 0 };
    this.data.splice(idx, 1);
    return { deletedCount: 1 };
  }

  async deleteMany(filter: Partial<T>) {
    const before = this.data.length;
    const remaining = this.data.filter((d) => !matchFilter(d, filter));
    const deletedCount = before - remaining.length;
    this.data.length = 0;
    this.data.push(...remaining);
    return { deletedCount };
  }

  async countDocuments(filter?: Partial<T>) {
    return this.data.filter((d) => matchFilter(d, filter)).length;
  }

  async estimatedDocumentCount() {
    return this.data.length;
  }

  aggregate<U = unknown>(_pipeline: unknown[]): QueryBuilder<U[]> {
    return new MemoryQuery<U[]>(async () => []);
  }

  distinct(field: keyof T): QueryBuilder<T[keyof T][]> {
    return new MemoryQuery<T[keyof T][]>(async () => {
      const values = new Set<T[keyof T]>();
      for (const doc of this.data) {
        const value = doc[field];
        if (value !== undefined) values.add(value as T[keyof T]);
      }
      return Array.from(values);
    });
  }

  async exists(filter: Partial<T>) {
    const doc = this.data.find((d) => matchFilter(d, filter));
    return doc? { _id: (doc as DocumentRecord)._id as DocumentId } : null;
  }

  watch(): void {
    /* noop */
  }

  startSession(): unknown {
    return undefined;
  }
}

export class MemoryDocumentStore implements DocumentStore {
  private readonly collections = new Map<string, MemoryCollection<DocumentRecord>>();

  collection<T extends DocumentRecord>(name: string): DocumentCollection<T> {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection<DocumentRecord>());
    }
    return this.collections.get(name) as MemoryCollection<T>;
  }
}
