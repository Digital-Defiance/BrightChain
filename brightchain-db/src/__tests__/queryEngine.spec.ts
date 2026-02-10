import {
  applyProjection,
  compareValues,
  deepEquals,
  matchesFilter,
  sortDocuments,
} from '../lib/queryEngine';
import { BsonDocument, FilterQuery } from '../lib/types';

describe('queryEngine', () => {
  // ── deepEquals ──
  describe('deepEquals', () => {
    it('should handle primitives', () => {
      expect(deepEquals(1, 1)).toBe(true);
      expect(deepEquals('a', 'a')).toBe(true);
      expect(deepEquals(true, true)).toBe(true);
      expect(deepEquals(null, null)).toBe(true);
      expect(deepEquals(undefined, undefined)).toBe(true);
      expect(deepEquals(1, 2)).toBe(false);
      expect(deepEquals('a', 'b')).toBe(false);
    });

    it('should handle arrays', () => {
      expect(deepEquals([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEquals([1, 2], [1, 2, 3])).toBe(false);
    });

    it('should handle objects', () => {
      expect(deepEquals({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(deepEquals({ a: 1 }, { a: 2 })).toBe(false);
    });

    it('should handle nested objects', () => {
      expect(deepEquals({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true);
    });

    it('should handle dates', () => {
      const d = new Date('2024-01-01');
      expect(deepEquals(d, new Date('2024-01-01'))).toBe(true);
      expect(deepEquals(d, new Date('2024-01-02'))).toBe(false);
    });
  });

  // ── compareValues ──
  describe('compareValues', () => {
    it('should compare numbers', () => {
      expect(compareValues(1, 2)).toBeLessThan(0);
      expect(compareValues(2, 1)).toBeGreaterThan(0);
      expect(compareValues(1, 1)).toBe(0);
    });

    it('should compare strings', () => {
      expect(compareValues('a', 'b')).toBeLessThan(0);
      expect(compareValues('b', 'a')).toBeGreaterThan(0);
    });
  });

  // ── matchesFilter ──
  describe('matchesFilter', () => {
    const doc: BsonDocument = {
      _id: '1',
      name: 'Alice',
      age: 30,
      email: 'alice@example.com',
      tags: ['admin', 'user'],
      address: { city: 'NYC', zip: '10001' },
    };

    it('should match exact fields', () => {
      expect(matchesFilter(doc, { name: 'Alice' })).toBe(true);
      expect(matchesFilter(doc, { name: 'Bob' })).toBe(false);
    });

    it('should match empty filter', () => {
      expect(matchesFilter(doc, {})).toBe(true);
    });

    it('should match $eq', () => {
      expect(matchesFilter(doc, { age: { $eq: 30 } })).toBe(true);
      expect(matchesFilter(doc, { age: { $eq: 25 } })).toBe(false);
    });

    it('should match $ne', () => {
      expect(matchesFilter(doc, { age: { $ne: 25 } })).toBe(true);
      expect(matchesFilter(doc, { age: { $ne: 30 } })).toBe(false);
    });

    it('should match $gt / $gte / $lt / $lte', () => {
      expect(matchesFilter(doc, { age: { $gt: 25 } })).toBe(true);
      expect(matchesFilter(doc, { age: { $gt: 30 } })).toBe(false);
      expect(matchesFilter(doc, { age: { $gte: 30 } })).toBe(true);
      expect(matchesFilter(doc, { age: { $lt: 35 } })).toBe(true);
      expect(matchesFilter(doc, { age: { $lt: 30 } })).toBe(false);
      expect(matchesFilter(doc, { age: { $lte: 30 } })).toBe(true);
    });

    it('should match $in / $nin', () => {
      expect(matchesFilter(doc, { name: { $in: ['Alice', 'Bob'] } })).toBe(
        true,
      );
      expect(matchesFilter(doc, { name: { $in: ['Bob', 'Carol'] } })).toBe(
        false,
      );
      expect(matchesFilter(doc, { name: { $nin: ['Bob', 'Carol'] } })).toBe(
        true,
      );
      expect(matchesFilter(doc, { name: { $nin: ['Alice', 'Bob'] } })).toBe(
        false,
      );
    });

    it('should match $regex', () => {
      expect(matchesFilter(doc, { name: { $regex: /^Ali/ } })).toBe(true);
      expect(matchesFilter(doc, { name: { $regex: '^Ali' } })).toBe(true);
      expect(matchesFilter(doc, { name: { $regex: /^Bob/ } })).toBe(false);
    });

    it('should match $exists', () => {
      expect(matchesFilter(doc, { name: { $exists: true } })).toBe(true);
      expect(
        matchesFilter(doc, {
          missing: { $exists: false },
        } as FilterQuery<BsonDocument>),
      ).toBe(true);
      expect(matchesFilter(doc, { name: { $exists: false } })).toBe(false);
    });

    it('should match $and', () => {
      expect(
        matchesFilter(doc, { $and: [{ name: 'Alice' }, { age: 30 }] }),
      ).toBe(true);
      expect(
        matchesFilter(doc, { $and: [{ name: 'Alice' }, { age: 25 }] }),
      ).toBe(false);
    });

    it('should match $or', () => {
      expect(
        matchesFilter(doc, { $or: [{ name: 'Alice' }, { name: 'Bob' }] }),
      ).toBe(true);
      expect(
        matchesFilter(doc, { $or: [{ name: 'Bob' }, { name: 'Carol' }] }),
      ).toBe(false);
    });

    it('should match $nor', () => {
      expect(
        matchesFilter(doc, { $nor: [{ name: 'Bob' }, { name: 'Carol' }] }),
      ).toBe(true);
      expect(
        matchesFilter(doc, { $nor: [{ name: 'Alice' }, { name: 'Carol' }] }),
      ).toBe(false);
    });

    it('should match nested fields', () => {
      expect(
        matchesFilter(doc, {
          'address.city': 'NYC',
        } as FilterQuery<BsonDocument>),
      ).toBe(true);
      expect(
        matchesFilter(doc, {
          'address.city': 'LA',
        } as FilterQuery<BsonDocument>),
      ).toBe(false);
    });

    it('should match array elements', () => {
      expect(matchesFilter(doc, { tags: 'admin' })).toBe(true);
      expect(matchesFilter(doc, { tags: 'superadmin' })).toBe(false);
    });

    it('should match $size', () => {
      expect(matchesFilter(doc, { tags: { $size: 2 } })).toBe(true);
      expect(matchesFilter(doc, { tags: { $size: 3 } })).toBe(false);
    });

    it('should match $all', () => {
      expect(matchesFilter(doc, { tags: { $all: ['admin', 'user'] } })).toBe(
        true,
      );
      expect(
        matchesFilter(doc, { tags: { $all: ['admin', 'superadmin'] } }),
      ).toBe(false);
    });

    it('should match $not operator', () => {
      expect(matchesFilter(doc, { age: { $not: { $gt: 40 } } })).toBe(true);
      expect(matchesFilter(doc, { age: { $not: { $lt: 40 } } })).toBe(false);
    });
  });

  // ── applyProjection ──
  describe('applyProjection', () => {
    const doc: BsonDocument = {
      _id: '1',
      name: 'Alice',
      age: 30,
      email: 'a@b.c',
    };

    it('should include specified fields (inclusion)', () => {
      const result = applyProjection(doc, { name: 1 });
      expect(result).toEqual({ _id: '1', name: 'Alice' });
    });

    it('should exclude specified fields (exclusion)', () => {
      const result = applyProjection(doc, { email: 0 });
      expect(result).toEqual({ _id: '1', name: 'Alice', age: 30 });
    });

    it('should exclude _id if requested', () => {
      const result = applyProjection(doc, { name: 1, _id: 0 });
      expect(result).toEqual({ name: 'Alice' });
    });

    it('should return full doc with empty projection', () => {
      const result = applyProjection(doc, {});
      expect(result).toEqual(doc);
    });
  });

  // ── sortDocuments ──
  describe('sortDocuments', () => {
    const docs: BsonDocument[] = [
      { _id: '1', name: 'Charlie', age: 25 },
      { _id: '2', name: 'Alice', age: 30 },
      { _id: '3', name: 'Bob', age: 20 },
    ];

    it('should sort ascending', () => {
      const sorted = sortDocuments(docs, { name: 1 });
      expect(sorted.map((d) => d['name'])).toEqual(['Alice', 'Bob', 'Charlie']);
    });

    it('should sort descending', () => {
      const sorted = sortDocuments(docs, { age: -1 });
      expect(sorted.map((d) => d['age'])).toEqual([30, 25, 20]);
    });

    it('should handle compound sort', () => {
      const docsWithDups: BsonDocument[] = [
        { _id: '1', city: 'NYC', name: 'Bob' },
        { _id: '2', city: 'LA', name: 'Alice' },
        { _id: '3', city: 'NYC', name: 'Alice' },
      ];
      const sorted = sortDocuments(docsWithDups, { city: 1, name: 1 });
      expect(sorted.map((d) => `${d['city']}-${d['name']}`)).toEqual([
        'LA-Alice',
        'NYC-Alice',
        'NYC-Bob',
      ]);
    });
  });
});
