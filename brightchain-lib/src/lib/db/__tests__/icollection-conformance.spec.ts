/**
 * @fileoverview ICollection conformance test for relocated Collection.
 *
 * Verifies that the relocated Collection implements all ICollection methods
 * and that basic CRUD, indexing, aggregation, and lifecycle operations work
 * correctly when backed by InMemoryDatabase + MemoryBlockStore.
 *
 * _Requirements: 8.3_
 */

import type { ICollection } from '@digitaldefiance/suite-core-lib';
import { BlockSize } from '../../enumerations/blockSize';
import type { BsonDocument } from '../../interfaces/storage/documentTypes';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { InMemoryDatabase } from '../inMemoryDatabase';

describe('ICollection conformance: relocated Collection', () => {
  let db: InMemoryDatabase;
  let store: MemoryBlockStore;
  let coll: ICollection<BsonDocument>;

  beforeEach(async () => {
    store = new MemoryBlockStore(BlockSize.Small);
    db = new InMemoryDatabase(store, { name: 'icollection-conformance' });
    await db.connect();
    coll = db.collection('test-coll');
  });

  afterEach(async () => {
    if (db.isConnected()) {
      await db.disconnect();
    }
  });

  // ── 1. Method existence ──

  describe('ICollection method existence', () => {
    it('should have all ICollection methods', () => {
      const requiredMethods: Array<keyof ICollection> = [
        'insertOne',
        'insertMany',
        'find',
        'findOne',
        'findById',
        'updateOne',
        'updateMany',
        'deleteOne',
        'deleteMany',
        'countDocuments',
        'createIndex',
        'dropIndex',
        'listIndexes',
        'aggregate',
        'drop',
        'bulkWrite',
        'distinct',
        'estimatedDocumentCount',
        'replaceOne',
        'watch',
        'setSchema',
        'getSchema',
        'removeSchema',
        'validateDoc',
        'getWriteConcern',
        'setWriteConcern',
        'getReadPreference',
        'setReadPreference',
        'createTextIndex',
        'dropTextIndex',
        'hasTextIndex',
      ];

      for (const method of requiredMethods) {
        expect(typeof coll[method]).toBe('function');
      }
    });
  });

  // ── 2. Basic CRUD: insertOne → findById → updateOne → deleteOne ──

  describe('basic CRUD lifecycle', () => {
    it('insertOne then findById should retrieve the document', async () => {
      const result = await coll.insertOne({ name: 'Alice', age: 30 });
      expect(result.insertedId).toBeDefined();

      const doc = await coll.findById(result.insertedId);
      expect(doc).not.toBeNull();
      expect(doc!['name']).toBe('Alice');
      expect(doc!['age']).toBe(30);
    });

    it('updateOne should modify the document', async () => {
      const { insertedId } = await coll.insertOne({ name: 'Bob', age: 25 });

      const updateResult = await coll.updateOne(
        { _id: insertedId },
        { $set: { age: 26 } },
      );
      expect(updateResult.modifiedCount).toBe(1);

      const updated = await coll.findById(insertedId);
      expect(updated!['age']).toBe(26);
    });

    it('deleteOne should remove the document', async () => {
      const { insertedId } = await coll.insertOne({ name: 'Charlie' });

      const deleteResult = await coll.deleteOne({ _id: insertedId });
      expect(deleteResult.deletedCount).toBe(1);

      const gone = await coll.findById(insertedId);
      expect(gone).toBeNull();
    });
  });

  // ── 3. insertMany + find ──

  describe('insertMany and find', () => {
    it('insertMany should insert multiple documents', async () => {
      const result = await coll.insertMany([
        { color: 'red' },
        { color: 'green' },
        { color: 'blue' },
      ]);
      expect(result.insertedCount).toBe(3);
    });

    it('find should retrieve matching documents', async () => {
      await coll.insertMany([
        { type: 'fruit', name: 'apple' },
        { type: 'fruit', name: 'banana' },
        { type: 'veggie', name: 'carrot' },
      ]);

      const fruits = await coll.find({ type: 'fruit' });
      expect(fruits).toHaveLength(2);
    });
  });

  // ── 4. countDocuments ──

  describe('countDocuments', () => {
    it('should return correct count', async () => {
      expect(await coll.countDocuments()).toBe(0);

      await coll.insertMany([{ x: 1 }, { x: 2 }, { x: 3 }]);
      expect(await coll.countDocuments()).toBe(3);

      await coll.deleteOne({ x: 2 });
      expect(await coll.countDocuments()).toBe(2);
    });
  });

  // ── 5. createIndex / dropIndex / listIndexes ──

  describe('index management', () => {
    it('createIndex should return an index name', async () => {
      const indexName = await coll.createIndex({ name: 1 });
      expect(typeof indexName).toBe('string');
      expect(indexName.length).toBeGreaterThan(0);
    });

    it('listIndexes should include created index', async () => {
      const indexName = await coll.createIndex({ score: -1 });
      const indexes = coll.listIndexes();
      expect(indexes).toContain(indexName);
    });

    it('dropIndex should remove the index', async () => {
      const indexName = await coll.createIndex({ tag: 1 });
      expect(coll.listIndexes()).toContain(indexName);

      await coll.dropIndex(indexName);
      expect(coll.listIndexes()).not.toContain(indexName);
    });
  });

  // ── 6. drop() clears the collection ──

  describe('drop', () => {
    it('should clear all documents from the collection', async () => {
      await coll.insertMany([{ a: 1 }, { a: 2 }, { a: 3 }]);
      expect(await coll.countDocuments()).toBe(3);

      await coll.drop();
      expect(await coll.countDocuments()).toBe(0);
    });
  });

  // ── 7. aggregate ──

  describe('aggregate', () => {
    it('should return results from a pipeline', async () => {
      await coll.insertMany([
        { category: 'A', value: 10 },
        { category: 'B', value: 20 },
        { category: 'A', value: 30 },
      ]);

      const results = await coll.aggregate([{ $match: { category: 'A' } }]);
      expect(results).toHaveLength(2);
      for (const doc of results) {
        expect(doc['category']).toBe('A');
      }
    });
  });
});
