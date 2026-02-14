/**
 * @fileoverview Property-based test for sort-skip-limit model equivalence.
 *
 * **Feature: mongo-compatible-document-store, Property 2: Sort-skip-limit model equivalence**
 *
 * For any array of documents, any sort specification (mapping field names to 1 or -1),
 * any non-negative skip value, and any non-negative limit value, the result of applying
 * sort → skip → limit through the Collection's find method SHALL equal the result of:
 * (1) sorting the array by the spec fields in order,
 * (2) dropping the first s elements,
 * (3) taking the first l elements.
 *
 * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
 */

import fc from 'fast-check';
import { MockBlockStore } from '../../__tests__/helpers/mockBlockStore';
import { BrightChainDb } from '../database';
import { BsonDocument, SortSpec } from '../types';

jest.setTimeout(120000);

// ---------------------------------------------------------------------------
// Reference implementation
// ---------------------------------------------------------------------------

/**
 * Compare two values using the same logic as queryEngine's compareValues.
 */
function refCompare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (a === null || a === undefined) return -1;
  if (b === null || b === undefined) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b);
  if (typeof a === 'boolean' && typeof b === 'boolean')
    return a === b ? 0 : a ? 1 : -1;
  return String(a).localeCompare(String(b));
}

/**
 * Reference sort → skip → limit implementation.
 */
function referenceQuery<T extends BsonDocument>(
  docs: T[],
  sort: Record<string, 1 | -1>,
  skip: number,
  limit: number,
): T[] {
  const sortEntries = Object.entries(sort);

  // Sort
  const sorted = [...docs].sort((a, b) => {
    for (const [field, direction] of sortEntries) {
      const va = a[field];
      const vb = b[field];
      const cmp = refCompare(va, vb);
      if (cmp !== 0) return cmp * direction;
    }
    return 0;
  });

  // Skip
  const skipped = sorted.slice(skip);

  // Limit
  const limited = skipped.slice(0, limit);

  return limited;
}

// ---------------------------------------------------------------------------
// Generators
// ---------------------------------------------------------------------------

/** Field names used in generated documents */
const FIELD_NAMES = ['x', 'y', 'z'] as const;

/** Arbitrary document with numeric and string fields */
const arbDocument: fc.Arbitrary<BsonDocument> = fc.record({
  x: fc.oneof(fc.integer({ min: -100, max: 100 }), fc.constant(null)),
  y: fc.oneof(
    fc.constantFrom('a', 'b', 'c', 'd', 'ab', 'bc', 'cd', ''),
    fc.constant(null),
  ),
  z: fc.oneof(fc.integer({ min: 0, max: 10 }), fc.constant(null)),
});

/** Arbitrary array of documents (0 to 20) */
const arbDocuments: fc.Arbitrary<BsonDocument[]> = fc.array(arbDocument, {
  minLength: 0,
  maxLength: 20,
});

/** Arbitrary sort spec using the known field names */
const arbSortSpec: fc.Arbitrary<Record<string, 1 | -1>> = fc
  .subarray([...FIELD_NAMES], { minLength: 0, maxLength: 3 })
  .chain((fields) =>
    fc
      .tuple(...fields.map(() => fc.constantFrom(1 as const, -1 as const)))
      .map((directions) => {
        const spec: Record<string, 1 | -1> = {};
        fields.forEach((f, i) => {
          spec[f] = directions[i];
        });
        return spec;
      }),
  );

/** Arbitrary skip value */
const arbSkip: fc.Arbitrary<number> = fc.integer({ min: 0, max: 50 });

/** Arbitrary limit value */
const arbLimit: fc.Arbitrary<number> = fc.integer({ min: 0, max: 50 });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/* eslint-disable @typescript-eslint/no-explicit-any */

function createDb(): BrightChainDb {
  const store = new MockBlockStore();
  return new BrightChainDb(store as any, { name: 'test-sort-skip-limit' });
}

/**
 * Strip _id from documents for comparison since _id is assigned by the store.
 */
function stripIds(docs: BsonDocument[]): Record<string, unknown>[] {
  return docs.map((doc) => {
    const { _id, ...rest } = doc;
    return rest;
  });
}

// ---------------------------------------------------------------------------
// Property 2: Sort-skip-limit model equivalence
// ---------------------------------------------------------------------------

describe('Feature: mongo-compatible-document-store, Property 2: Sort-skip-limit model equivalence', () => {
  /**
   * **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**
   *
   * For any array of documents, sort spec, skip, and limit values,
   * Collection.find() with those options produces the same result as
   * the reference implementation (manual sort → slice → slice).
   */
  it('find() with sort/skip/limit matches reference implementation', async () => {
    await fc.assert(
      fc.asyncProperty(
        arbDocuments,
        arbSortSpec,
        arbSkip,
        arbLimit,
        async (docs, sort, skip, limit) => {
          const db = createDb();
          await db.connect();

          const collection = db.collection<BsonDocument>('items');

          // Insert all documents
          for (const doc of docs) {
            await collection.insertOne({ ...doc });
          }

          // Query with sort/skip/limit
          const findOptions: {
            sort?: SortSpec<BsonDocument>;
            skip?: number;
            limit?: number;
          } = {};
          if (Object.keys(sort).length > 0) {
            findOptions.sort = sort as SortSpec<BsonDocument>;
          }
          findOptions.skip = skip;
          findOptions.limit = limit;

          const cursor = collection.find({}, findOptions);
          const actual = await cursor.toArray();

          // Compute expected via reference implementation
          // We need the docs as stored (with _id), so retrieve all first
          const allDocs = await collection.find({}).toArray();
          const expected = referenceQuery(allDocs, sort, skip, limit);

          // Compare stripping _id since reference uses stored docs
          expect(stripIds(actual)).toEqual(stripIds(expected));

          await db.disconnect();
        },
      ),
      { numRuns: 100 },
    );
  });
});
