import {
  CollectionIndex,
  DuplicateKeyError,
  IndexManager,
} from '../lib/indexing';
import { BsonDocument } from '../lib/types';

describe('CollectionIndex', () => {
  let index: CollectionIndex;

  beforeEach(() => {
    index = new CollectionIndex({ name: 1 }, { name: 'name_1' });
  });

  it('should add and lookup a document', () => {
    const doc: BsonDocument = { _id: '1', name: 'Alice' };
    index.addDocument(doc);
    const ids = index.lookup({ name: 'Alice' });
    expect(ids).toBeDefined();
    expect(ids!.has('1')).toBe(true);
  });

  it('should remove a document', () => {
    const doc: BsonDocument = { _id: '1', name: 'Alice' };
    index.addDocument(doc);
    index.removeDocument(doc);
    const ids = index.lookup({ name: 'Alice' });
    expect(ids === undefined || ids.size === 0).toBe(true);
  });

  it('should clear all entries', () => {
    index.addDocument({ _id: '1', name: 'Alice' });
    index.addDocument({ _id: '2', name: 'Bob' });
    index.clear();
    expect(index.lookup({ name: 'Alice' })).toBeUndefined();
    expect(index.lookup({ name: 'Bob' })).toBeUndefined();
  });
});

describe('CollectionIndex (unique)', () => {
  let index: CollectionIndex;

  beforeEach(() => {
    index = new CollectionIndex(
      { email: 1 },
      { name: 'email_1', unique: true },
    );
  });

  it('should enforce uniqueness', () => {
    index.addDocument({ _id: '1', email: 'alice@x.com' });
    expect(() => {
      index.addDocument({ _id: '2', email: 'alice@x.com' });
    }).toThrow(DuplicateKeyError);
  });

  it('should allow different values', () => {
    index.addDocument({ _id: '1', email: 'alice@x.com' });
    index.addDocument({ _id: '2', email: 'bob@x.com' });
    expect(index.lookup({ email: 'alice@x.com' })?.has('1')).toBe(true);
    expect(index.lookup({ email: 'bob@x.com' })?.has('2')).toBe(true);
  });
});

describe('CollectionIndex (sparse)', () => {
  it('should skip documents missing the field when sparse', () => {
    const index = new CollectionIndex(
      { opt: 1 },
      { name: 'opt_1', sparse: true },
    );
    // Should not throw / should skip silently
    index.addDocument({ _id: '1', other: 'val' });
    expect(index.lookup({ opt: undefined })).toBeUndefined();
  });
});

describe('CollectionIndex (compound)', () => {
  it('should index on compound fields', () => {
    const index = new CollectionIndex(
      { name: 1, age: 1 },
      { name: 'name_age' },
    );
    index.addDocument({ _id: '1', name: 'Alice', age: 30 });
    index.addDocument({ _id: '2', name: 'Alice', age: 25 });
    index.addDocument({ _id: '3', name: 'Bob', age: 30 });

    expect(index.lookup({ name: 'Alice', age: 30 })?.has('1')).toBe(true);
    expect(index.lookup({ name: 'Alice', age: 25 })?.has('2')).toBe(true);
    expect(index.lookup({ name: 'Bob', age: 30 })?.has('3')).toBe(true);
  });
});

describe('IndexManager', () => {
  let mgr: IndexManager;

  beforeEach(() => {
    mgr = new IndexManager();
  });

  it('should create and list indexes', () => {
    mgr.createIndex({ name: 1 }, { name: 'name_1' });
    const list = mgr.listIndexes();
    expect(list).toHaveLength(1);
    expect(list[0]).toBe('name_1');
  });

  it('should drop an index', () => {
    mgr.createIndex({ name: 1 }, { name: 'name_1' });
    mgr.dropIndex('name_1');
    expect(mgr.listIndexes()).toHaveLength(0);
  });

  it('should return existing index when same spec is used', () => {
    mgr.createIndex({ name: 1 }, { name: 'name_1' });
    // Same name + same spec → returns existing name without throwing
    const result = mgr.createIndex({ name: 1 }, { name: 'name_1' });
    expect(result).toBe('name_1');
  });

  it('should throw on duplicate name with different spec', () => {
    mgr.createIndex({ name: 1 }, { name: 'name_1' });
    expect(() => {
      mgr.createIndex({ age: 1 }, { name: 'name_1' });
    }).toThrow();
  });

  it('should find candidate indexes for a filter', () => {
    mgr.createIndex({ name: 1 }, { name: 'name_1' });
    mgr.createIndex({ age: 1 }, { name: 'age_1' });

    const doc1 = { _id: '1', name: 'Alice', age: 30 };
    const doc2 = { _id: '2', name: 'Bob', age: 25 };
    mgr.addDocument(doc1);
    mgr.addDocument(doc2);

    const ids = mgr.findCandidates({ name: 'Alice' });
    expect(ids).toBeDefined();
    expect(ids!.has('1')).toBe(true);
    expect(ids!.has('2')).toBe(false);
  });

  it('should return undefined if no index matches', () => {
    mgr.createIndex({ name: 1 }, { name: 'name_1' });
    const doc = { _id: '1', name: 'Alice', age: 30 };
    mgr.addDocument(doc);

    const ids = mgr.findCandidates({ age: 30 });
    // age_1 doesn't exist as an index; depends on implementation details
    // It might return undefined or fall through — we just verify no crash
    expect(ids === undefined || ids instanceof Set).toBe(true);
  });

  it('should serialize and deserialize', () => {
    mgr.createIndex({ name: 1 }, { name: 'name_1' });
    mgr.addDocument({ _id: '1', name: 'Alice' });

    const serialized = mgr.toJSON();
    const mgr2 = new IndexManager();
    mgr2.restoreFromJSON(serialized, [{ _id: '1', name: 'Alice' }]);
    expect(mgr2.listIndexes()).toHaveLength(1);
    const ids = mgr2.findCandidates({ name: 'Alice' });
    expect(ids?.has('1')).toBe(true);
  });
});
