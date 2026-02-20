/**
 * @fileoverview Property-based test for JSON serialization round-trip.
 *
 * **Feature: mongo-compatible-document-store, Property 4: JSON serialization round-trip**
 *
 * For any valid document object stored via insertOne and retrieved via findById,
 * serializing the retrieved document to JSON via JSON.stringify and deserializing
 * via JSON.parse SHALL produce an object with field values equivalent to the
 * original document (excluding _id).
 *
 * **Validates: Requirements 9.3**
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
 * Date objects (serialize to strings), and -0 (normalized to 0 by JSON).
 */
const arbLeaf: fc.Arbitrary<string | number | boolean | null> = fc.oneof(
  fc.string(),
  fc.integer({ min: -1_000_000, max: 1_000_000 }),
  fc
    .double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true })
    .map((n) => (n === 0 ? 0 : n)),
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
    name: 'test-json-roundtrip',
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
// Property 4: JSON serialization round-trip
// ---------------------------------------------------------------------------

describe('Feature: mongo-compatible-document-store, Property 4: JSON serialization round-trip', () => {
  /**
   * **Validates: Requirements 9.3**
   *
   * For any valid document, inserting via insertOne, retrieving via findById,
   * then serializing to JSON via JSON.stringify and deserializing via
   * JSON.parse produces an object with equivalent field values to the
   * original (ignoring the assigned _id).
   */
  it('insertOne then findById then JSON round-trip returns equivalent document fields', async () => {
    await fc.assert(
      fc.asyncProperty(arbDocument, async (doc) => {
        const db = createDb();
        await db.connect();

        const collection = db.collection<BsonDocument>('json-roundtrip');

        // Insert the document
        const result = await collection.insertOne({ ...doc });
        expect(result.acknowledged).toBe(true);
        expect(result.insertedId).toBeDefined();

        // Retrieve by the returned _id
        const retrieved = await collection.findById(result.insertedId);
        expect(retrieved).not.toBeNull();

        // JSON round-trip: stringify then parse
        const jsonString = JSON.stringify(retrieved);
        const parsed = JSON.parse(jsonString) as Record<string, unknown>;

        // Compare fields (ignoring _id assigned by the store)
        expect(stripId(parsed)).toEqual(
          stripId(doc as Record<string, unknown>),
        );

        await db.disconnect();
      }),
      { numRuns: 100 },
    );
  });
});
