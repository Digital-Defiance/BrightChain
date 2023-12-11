/**
 * Property-based tests for WorkUnitSerializer round-trip and error reporting.
 * Feature: proof-of-useful-work-ratelimit
 *
 * Properties tested:
 * - Property 10: Work Unit Serialization Round-Trip
 * - Property 11: Work Result Serialization Round-Trip
 * - Property 12: Malformed JSON Error Reporting
 */

import fc from 'fast-check';
import { DifficultyTier } from '../../enumerations/difficultyTier';
import {
  IWorkResult,
  IWorkUnit,
  WorkUnitOperation,
} from '../../interfaces/pouw';
import {
  parseWorkResult,
  parseWorkUnit,
  serializeWorkResult,
  serializeWorkUnit,
} from '../workUnitSerializer';

// ── Arbitraries ────────────────────────────────────────────────────────

/** Arbitrary for WorkUnitOperation enum values */
const arbWorkUnitOperation = fc.constantFrom(
  WorkUnitOperation.LeafHash,
  WorkUnitOperation.InteriorHash,
);

/** Arbitrary for DifficultyTier enum values */
const arbDifficultyTier = fc.constantFrom(
  DifficultyTier.Low,
  DifficultyTier.Medium,
  DifficultyTier.High,
);

/** Arbitrary for a valid ISO date string (avoids invalid Date edge cases) */
const arbISODateString = fc
  .integer({ min: 0, max: 4102444800000 }) // 1970-01-01 to 2100-01-01
  .map((ms) => new Date(ms).toISOString());

/** Arbitrary for a valid IWorkUnit */
const arbWorkUnit: fc.Arbitrary<IWorkUnit> = fc.record({
  id: fc.string({ minLength: 1, maxLength: 64 }),
  treeId: fc.string({ minLength: 1, maxLength: 64 }),
  treeLevel: fc.nat({ max: 100 }),
  treeIndex: fc.nat({ max: 1000 }),
  operation: arbWorkUnitOperation,
  inputData: fc.base64String({ minLength: 4, maxLength: 200 }),
  childCount: fc.nat({ max: 64 }),
  difficulty: arbDifficultyTier,
  challengeToken: fc.string({ minLength: 1, maxLength: 128 }),
  createdAt: arbISODateString,
  expiresAt: arbISODateString,
});

/** Arbitrary for a lowercase hex string of exactly 128 characters (SHA3-512) */
const arbHexHash = fc
  .array(
    fc.constantFrom(
      '0',
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      'a',
      'b',
      'c',
      'd',
      'e',
      'f',
    ),
    { minLength: 128, maxLength: 128 },
  )
  .map((chars) => chars.join(''));

/** Arbitrary for a valid IWorkResult */
const arbWorkResult: fc.Arbitrary<IWorkResult> = fc.record({
  workUnitId: fc.string({ minLength: 1, maxLength: 64 }),
  resultHash: arbHexHash,
  challengeToken: fc.string({ minLength: 1, maxLength: 128 }),
  computeTimeMs: fc.double({ min: 0, max: 1e9, noNaN: true }),
  completedAt: arbISODateString,
});

// ── Property 10 ────────────────────────────────────────────────────────

describe('Feature: proof-of-useful-work-ratelimit, Property 10: Work Unit Serialization Round-Trip', () => {
  /**
   * For any valid IWorkUnit, serializing to JSON and parsing back
   * produces a deeply equal object.
   *
   * **Validates: Requirements 15.3**
   */
  it('serialize then parse produces a deeply equal IWorkUnit', () => {
    fc.assert(
      fc.property(arbWorkUnit, (workUnit) => {
        const json = serializeWorkUnit(workUnit);
        const parsed = parseWorkUnit(json);
        expect(parsed).toEqual(workUnit);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 11 ────────────────────────────────────────────────────────

describe('Feature: proof-of-useful-work-ratelimit, Property 11: Work Result Serialization Round-Trip', () => {
  /**
   * For any valid IWorkResult, serializing to JSON and parsing back
   * produces a deeply equal object.
   *
   * **Validates: Requirements 15.4**
   */
  it('serialize then parse produces a deeply equal IWorkResult', () => {
    fc.assert(
      fc.property(arbWorkResult, (workResult) => {
        const json = serializeWorkResult(workResult);
        const parsed = parseWorkResult(json);
        expect(parsed).toEqual(workResult);
      }),
      { numRuns: 100 },
    );
  });
});

// ── Property 12 ────────────────────────────────────────────────────────

describe('Feature: proof-of-useful-work-ratelimit, Property 12: Malformed JSON Error Reporting', () => {
  /**
   * For any string that is not valid JSON, parseWorkUnit throws a
   * descriptive error and never returns a successfully parsed object.
   *
   * **Validates: Requirements 15.6**
   */
  it('parseWorkUnit throws on arbitrary non-JSON strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }).filter((s) => {
          try {
            JSON.parse(s);
            return false; // skip strings that happen to be valid JSON
          } catch {
            return true;
          }
        }),
        (malformed) => {
          expect(() => parseWorkUnit(malformed)).toThrow(/parse error/i);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * For any string that is not valid JSON, parseWorkResult throws a
   * descriptive error and never returns a successfully parsed object.
   *
   * **Validates: Requirements 15.6**
   */
  it('parseWorkResult throws on arbitrary non-JSON strings', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 200 }).filter((s) => {
          try {
            JSON.parse(s);
            return false;
          } catch {
            return true;
          }
        }),
        (malformed) => {
          expect(() => parseWorkResult(malformed)).toThrow(/parse error/i);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * For valid JSON that is not an object (arrays, numbers, booleans, null),
   * both parsers throw a descriptive error.
   *
   * **Validates: Requirements 15.6**
   */
  it('parsers throw on valid JSON that is not an object', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer().map((n) => JSON.stringify(n)),
          fc.boolean().map((b) => JSON.stringify(b)),
          fc.constant('null'),
          fc
            .array(fc.integer(), { minLength: 0, maxLength: 5 })
            .map((a) => JSON.stringify(a)),
          fc.constant(JSON.stringify('a string')),
        ),
        (jsonStr) => {
          expect(() => parseWorkUnit(jsonStr)).toThrow(/parse error/i);
          expect(() => parseWorkResult(jsonStr)).toThrow(/parse error/i);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * For JSON objects with missing required WorkUnit fields,
   * parseWorkUnit throws a descriptive error mentioning the missing field.
   *
   * **Validates: Requirements 15.6**
   */
  it('parseWorkUnit throws on objects with missing required fields', () => {
    const requiredWorkUnitFields = [
      'id',
      'treeId',
      'inputData',
      'challengeToken',
      'createdAt',
      'expiresAt',
      'treeLevel',
      'treeIndex',
      'childCount',
      'operation',
      'difficulty',
    ];

    fc.assert(
      fc.property(
        arbWorkUnit,
        fc.constantFrom(...requiredWorkUnitFields),
        (workUnit, fieldToRemove) => {
          const obj = { ...workUnit };
          delete (obj as Record<string, unknown>)[fieldToRemove];
          const json = JSON.stringify(obj);
          expect(() => parseWorkUnit(json)).toThrow(/parse error/i);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * For JSON objects with missing required WorkResult fields,
   * parseWorkResult throws a descriptive error mentioning the missing field.
   *
   * **Validates: Requirements 15.6**
   */
  it('parseWorkResult throws on objects with missing required fields', () => {
    const requiredWorkResultFields = [
      'workUnitId',
      'resultHash',
      'challengeToken',
      'completedAt',
      'computeTimeMs',
    ];

    fc.assert(
      fc.property(
        arbWorkResult,
        fc.constantFrom(...requiredWorkResultFields),
        (workResult, fieldToRemove) => {
          const obj = { ...workResult };
          delete (obj as Record<string, unknown>)[fieldToRemove];
          const json = JSON.stringify(obj);
          expect(() => parseWorkResult(json)).toThrow(/parse error/i);
        },
      ),
      { numRuns: 100 },
    );
  });
});
