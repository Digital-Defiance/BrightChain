/**
 * @fileoverview Property-based test for document storage round-trip.
 *
 * **Feature: mongo-compatible-document-store, Property 3: Document storage round-trip**
 *
 * For any valid document object (with string, number, boolean, nested object,
 * and array fields), storing it via insertOne and retrieving it via findById
 * using the returned _id SHALL produce a document with field values equivalent
 * to the original.
 *
 * **Validates: Requirements 9.1, 9.2**
 */

import fc from 'fast-check';
import { MockBlockStore } from '../../__tests__/helpers/mockBlockStore';
import { BrightChainDb } from '../database';
import { BsonDocument } from '../types';

// Property tests can be slow due to async operations
jest.setTimeout(120000);

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/**
 * Arbitrary JSON-safe leaf value: string, number (finite), boolean, or null.
 * Avoids undefined (stripped by JSON), NaN/Infinity (not valid JSON),
 * and Date objects (serialize to strings).
 */
const arbLeaf: fc.Arbitrary<string | number | boolean | null> = fc.oneof(
  fc.string(),
  fc.integer({ min: -1_000_000, max: 1_000_000 }),
  fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true }),
  fc.boolean(),
  fc.constant(null),
);

/**
 * Arbitrary JSON-safe value tree (leaves, arrays, nested objects).
 * Depth is bounded to avoid excessively deep structures.
 */
const arbJsonValue: fc.Arbitrary<unknown> = fc.letrec((tie) => ({
  tree: fc.oneof(
    { depthSize: 'small', withCrossShrink: true },
    arbLeaf,
    fc.array(tie('tree'), { maxLength: 5 }),
    fc.dictionary(fc.string({ minLength: 1, maxLength: 10 }), tie('tree'), {
      maxKeys: 5,
    }),
  ),
})).tree;

/**
 * Arbitrary document with a mix of field types: string, number, boolean,
 * nested objects, and arrays. Field names are fixed to keep generation
 * focused; values vary across all JSON-safe types.
 *
 * Avoids generating an `_id` field — that is assigned by the store.
 */
const arbDocument: fc.Arbitrary<BsonDocument> = fc
  .record({
    strField: fc.string(),
    numField: fc.integer({ min: -100_000, max: 100_000 }),
    boolField: fc.boolean(),
    nested: fc.dictionary(
      fc.string({ minLength: 1, maxLength: 8 }),
      arbJsonValue,
      { maxKeys: 4 },
    ),
    arr: fc.array(arbJsonValue, { maxLength: 6 }),
  })
  .map((rec) => rec as BsonDocument);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function createDb(): BrightChainDb {
  const store = new MockBlockStore();
  return new BrightChainDb(store as any, {
    name: 'test-doc-roundtrip',
  });
}

/**
 * Strip `_id` from a document so we can compare stored vs original fields.
 */
function stripId(doc: Record<string, unknown>): Record<string, unknown> {
  const { _id, ...rest } = doc;
  return rest;
}

// ---------------------------------------------------------------------------
// Property 3: Document storage round-trip
// ---------------------------------------------------------------------------

describe('Feature: mongo-compatible-document-store, Property 3: Document storage round-trip', () => {
  /**
   * **Validates: Requirements 9.1, 9.2**
   *
   * For any valid document, inserting via insertOne and retrieving via
   * findById produces a document with equivalent field values to the
   * original (ignoring the assigned _id).
   */
  it('insertOne then findById returns equivalent document fields', async () => {
    await fc.assert(
      fc.asyncProperty(arbDocument, async (doc) => {
        const db = createDb();
        await db.connect();

        const collection = db.collection<BsonDocument>('roundtrip');

        // Insert the document
        const result = await collection.insertOne({ ...doc });
        expect(result.acknowledged).toBe(true);
        expect(result.insertedId).toBeDefined();

        // Retrieve by the returned _id
        const retrieved = await collection.findById(result.insertedId);
        expect(retrieved).not.toBeNull();

        // Compare fields (ignoring _id assigned by the store)
        expect(stripId(retrieved as Record<string, unknown>)).toEqual(
          stripId(doc as Record<string, unknown>),
        );

        await db.disconnect();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 9.1, 9.2**
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
            fc.dictionary(fc.string({ minLength: 1, maxLength: 5 }), arbLeaf, {
              maxKeys: 3,
            }),
          ),
          { maxLength: 5 },
        ),
      })
      .map((rec) => rec as BsonDocument);

    await fc.assert(
      fc.asyncProperty(arbDeeplyNested, async (doc) => {
        const db = createDb();
        await db.connect();

        const collection = db.collection<BsonDocument>('nested-roundtrip');

        const result = await collection.insertOne({ ...doc });
        const retrieved = await collection.findById(result.insertedId);

        expect(retrieved).not.toBeNull();
        expect(stripId(retrieved as Record<string, unknown>)).toEqual(
          stripId(doc as Record<string, unknown>),
        );

        await db.disconnect();
      }),
      { numRuns: 100 },
    );
  });
});
