/**
 * @fileoverview Property-based test for document storage round-trip.
 *
 * **Feature: db-core-to-lib, Property 4: Document storage round-trip**
 *
 * For any valid BsonDocument (with string, number, boolean, nested object,
 * and array fields), inserting it via insertOne on a Collection backed by
 * MemoryBlockStore and retrieving it via findById using the returned _id
 * should produce a document with field values equivalent to the original
 * (ignoring the assigned _id).
 *
 * **Validates: Requirements 8.5, 3.4**
 */

import fc from 'fast-check';
import { BlockSize } from '../../enumerations/blockSize';
import type { BsonDocument } from '../../interfaces/storage/documentTypes';
import { MemoryBlockStore } from '../../stores/memoryBlockStore';
import { InMemoryDatabase } from '../inMemoryDatabase';

/**
 * Arbitrary for a JSON-safe leaf value (string, number, boolean, null).
 * Avoids undefined, Date, RegExp, Symbol, BigInt, NaN, Infinity, -Infinity
 * which do not round-trip through JSON serialization in the block store.
 */
const arbJsonLeaf: fc.Arbitrary<string | number | boolean | null> = fc.oneof(
  fc.string({ minLength: 0, maxLength: 50 }),
  fc.integer({ min: -1_000_000, max: 1_000_000 }),
  fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
  fc.boolean(),
  fc.constant(null),
);

/**
 * Arbitrary for a JSON-compatible value tree (leaf, nested object, or array).
 * Depth is bounded to keep generated documents reasonably sized.
 */
const arbJsonValue: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
  leaf: arbJsonLeaf,
  array: fc.array(tie('value'), { minLength: 0, maxLength: 5 }),
  object: fc.dictionary(
    fc.string({ minLength: 1, maxLength: 10 }).filter((k) => k !== '_id'),
    tie('value'),
    { minKeys: 0, maxKeys: 5 },
  ),
  value: fc.oneof(
    { depthSize: 'small' },
    tie('leaf'),
    tie('array'),
    tie('object'),
  ),
})).value;

/**
 * Arbitrary for a BsonDocument with 1–8 fields of JSON-compatible values.
 * The _id field is intentionally omitted so the Collection assigns one.
 */
const arbBsonDocument: fc.Arbitrary<BsonDocument> = fc
  .dictionary(
    fc.string({ minLength: 1, maxLength: 15 }).filter((k) => k !== '_id'),
    arbJsonValue,
    { minKeys: 1, maxKeys: 8 },
  )
  .map((dict) => dict as BsonDocument);

describe('Feature: db-core-to-lib, Property 4: Document storage round-trip', () => {
  /**
   * **Validates: Requirements 8.5, 3.4**
   *
   * For any generated BsonDocument, inserting via insertOne and retrieving
   * via findById should return a document whose original fields are all
   * present and equivalent.
   */
  it('insertOne then findById returns equivalent document fields', async () => {
    await fc.assert(
      fc.asyncProperty(arbBsonDocument, async (doc) => {
        const store = new MemoryBlockStore(BlockSize.Small);
        const db = new InMemoryDatabase(store, { name: 'roundtrip-test' });
        await db.connect();

        const collection = db.collection<BsonDocument>('test');
        const result = await collection.insertOne(doc);
        const insertedId = result.insertedId;

        const retrieved = await collection.findById(insertedId);
        expect(retrieved).not.toBeNull();

        // Verify every original field is present and equivalent
        for (const key of Object.keys(doc)) {
          if (key === '_id') continue;
          expect(retrieved![key]).toEqual(doc[key]);
        }

        // Verify the retrieved document has the assigned _id
        expect(retrieved!._id).toBe(insertedId);

        await db.disconnect();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 8.5, 3.4**
   *
   * Nested objects and arrays are preserved through the storage round-trip.
   * This test uses deeper nesting to stress the serialization layer.
   */
  it('preserves nested objects and arrays through round-trip', async () => {
    const arbDeeplyNested: fc.Arbitrary<BsonDocument> = fc
      .record({
        level1: fc.record({
          level2: fc.record({
            value: fc.string(),
            items: fc.array(fc.integer({ min: -100, max: 100 }), {
              maxLength: 5,
            }),
          }),
          tags: fc.array(fc.string(), { maxLength: 4 }),
        }),
        mixedArray: fc.array(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.dictionary(
              fc.string({ minLength: 1, maxLength: 5 }),
              arbJsonLeaf,
              { maxKeys: 3 },
            ),
          ),
          { maxLength: 5 },
        ),
      })
      .map((rec) => rec as BsonDocument);

    await fc.assert(
      fc.asyncProperty(arbDeeplyNested, async (doc) => {
        const store = new MemoryBlockStore(BlockSize.Small);
        const db = new InMemoryDatabase(store, {
          name: 'nested-roundtrip-test',
        });
        await db.connect();

        const collection = db.collection<BsonDocument>('nested-roundtrip');

        const result = await collection.insertOne({ ...doc });
        const retrieved = await collection.findById(result.insertedId);

        expect(retrieved).not.toBeNull();

        // Compare fields (ignoring _id assigned by the store)
        for (const key of Object.keys(doc)) {
          if (key === '_id') continue;
          expect(retrieved![key]).toEqual(doc[key]);
        }

        await db.disconnect();
      }),
      { numRuns: 100 },
    );
  });
});
