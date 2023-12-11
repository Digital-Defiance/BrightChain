import fc from 'fast-check';
import BlockDataType from '../enumerations/blockDataType';
import { BlockSize, validBlockSizes } from '../enumerations/blockSize';
import BlockType from '../enumerations/blockType';
import {
  isBlockMetadataJson,
  isEphemeralBlockMetadataJson,
  JsonValidationError,
  parseBlockMetadataJson,
  parseEphemeralBlockMetadataJson,
} from './typeGuards';

/**
 * Property-based tests for type guard utilities
 * Feature: block-security-hardening
 * Validates Requirements 4.1, 4.2, 4.3, 4.4
 */

/**
 * Arbitrary for valid BlockSize values
 */
const arbBlockSize = fc.constantFrom(...validBlockSizes);

/**
 * Arbitrary for valid BlockType values (excluding Unknown)
 * BlockType.Unknown (-1) represents uninitialized/invalid blocks and should not be used in metadata
 */
const arbBlockType = fc.constantFrom(
  ...Object.values(BlockType).filter(
    (v) => typeof v === 'number' && v !== BlockType.Unknown,
  ),
);

/**
 * Arbitrary for valid BlockDataType values
 */
const arbBlockDataType = fc.constantFrom(
  ...Object.values(BlockDataType).filter((v) => typeof v === 'number'),
);

/**
 * Arbitrary for valid date values (ISO 8601 string or Unix timestamp)
 * Constrained to valid JavaScript Date range to avoid Invalid Date errors
 * Filters out any NaN dates that might be generated
 */
const arbDateValue = fc.oneof(
  // ISO 8601 string - constrain to valid date range and filter out invalid dates
  fc
    .date({ min: new Date('1970-01-01'), max: new Date('2099-12-31') })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString()),
  // Unix timestamp in milliseconds - constrain to valid range and filter out NaN
  fc
    .date({ min: new Date('1970-01-01'), max: new Date('2099-12-31') })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.getTime()),
);

/**
 * Arbitrary for valid BlockMetadataJson
 */
const arbBlockMetadataJson = fc.record({
  size: arbBlockSize,
  type: arbBlockType,
  dataType: arbBlockDataType,
  lengthWithoutPadding: fc.nat(),
  dateCreated: arbDateValue,
});

/**
 * Arbitrary for valid EphemeralBlockMetadataJson
 */
const arbEphemeralBlockMetadataJson = fc.record({
  size: arbBlockSize,
  type: arbBlockType,
  dataType: arbBlockDataType,
  lengthWithoutPadding: fc.nat(),
  dateCreated: arbDateValue,
  creator: fc.string({ minLength: 1, maxLength: 100 }),
});

describe('Feature: block-security-hardening, Property 5: JSON Deserialization Type Safety', () => {
  /**
   * Property 5a: Valid BlockMetadataJson passes type guard
   * For any valid BlockMetadataJson object, isBlockMetadataJson should return true
   *
   * Validates Requirements 4.1, 4.2
   */
  it('Property 5a: Valid BlockMetadataJson passes type guard', () => {
    fc.assert(
      fc.property(arbBlockMetadataJson, (data) => {
        expect(() => isBlockMetadataJson(data)).not.toThrow();
        expect(isBlockMetadataJson(data)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5b: Missing required field throws JsonValidationError
   * For any BlockMetadataJson with a required field removed, validation should fail
   *
   * Validates Requirements 4.1, 4.4
   */
  it('Property 5b: Missing required field throws JsonValidationError', () => {
    fc.assert(
      fc.property(
        arbBlockMetadataJson,
        fc.constantFrom(
          'size',
          'type',
          'dataType',
          'lengthWithoutPadding',
          'dateCreated',
        ),
        (data, fieldToRemove) => {
          const incomplete = { ...data };
          delete (incomplete as Record<string, unknown>)[fieldToRemove];

          expect(() => isBlockMetadataJson(incomplete)).toThrow(
            JsonValidationError,
          );

          try {
            isBlockMetadataJson(incomplete);
          } catch (error) {
            expect(error).toBeInstanceOf(JsonValidationError);
            expect((error as JsonValidationError).field).toBe(fieldToRemove);
            expect((error as JsonValidationError).message).toContain(
              fieldToRemove,
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5c: Invalid field type throws JsonValidationError
   * For any BlockMetadataJson with an invalid field type, validation should fail
   *
   * Validates Requirements 4.1, 4.4
   */
  it('Property 5c: Invalid size value throws JsonValidationError', () => {
    fc.assert(
      fc.property(
        arbBlockMetadataJson,
        fc.oneof(
          fc.constant(null),
          fc.constant(undefined),
          fc.string(),
          fc.integer().filter((n) => !validBlockSizes.includes(n as BlockSize)),
        ),
        (data, invalidSize) => {
          const invalid = { ...data, size: invalidSize };

          expect(() => isBlockMetadataJson(invalid)).toThrow(
            JsonValidationError,
          );

          try {
            isBlockMetadataJson(invalid);
          } catch (error) {
            expect(error).toBeInstanceOf(JsonValidationError);
            expect((error as JsonValidationError).field).toBe('size');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5d: Negative lengthWithoutPadding throws JsonValidationError
   * For any BlockMetadataJson with negative lengthWithoutPadding, validation should fail
   *
   * Validates Requirements 4.1, 4.4
   */
  it('Property 5d: Negative lengthWithoutPadding throws JsonValidationError', () => {
    fc.assert(
      fc.property(
        arbBlockMetadataJson,
        fc.integer({ max: -1 }),
        (data, negativeLength) => {
          const invalid = { ...data, lengthWithoutPadding: negativeLength };

          expect(() => isBlockMetadataJson(invalid)).toThrow(
            JsonValidationError,
          );

          try {
            isBlockMetadataJson(invalid);
          } catch (error) {
            expect(error).toBeInstanceOf(JsonValidationError);
            expect((error as JsonValidationError).field).toBe(
              'lengthWithoutPadding',
            );
            expect((error as JsonValidationError).reason).toContain(
              'non-negative',
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5e: Non-integer lengthWithoutPadding throws JsonValidationError
   * For any BlockMetadataJson with non-integer lengthWithoutPadding, validation should fail
   *
   * Validates Requirements 4.1, 4.4
   */
  it('Property 5e: Non-integer lengthWithoutPadding throws JsonValidationError', () => {
    fc.assert(
      fc.property(
        arbBlockMetadataJson,
        fc
          .double({ min: 0.1, max: 1000.9, noNaN: true })
          .filter((n) => !Number.isInteger(n)),
        (data, floatLength) => {
          const invalid = { ...data, lengthWithoutPadding: floatLength };

          expect(() => isBlockMetadataJson(invalid)).toThrow(
            JsonValidationError,
          );

          try {
            isBlockMetadataJson(invalid);
          } catch (error) {
            expect(error).toBeInstanceOf(JsonValidationError);
            expect((error as JsonValidationError).field).toBe(
              'lengthWithoutPadding',
            );
            expect((error as JsonValidationError).reason).toContain('integer');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5f: Invalid date value throws JsonValidationError
   * For any BlockMetadataJson with invalid date, validation should fail
   *
   * Validates Requirements 4.1, 4.4
   */
  it('Property 5f: Invalid date value throws JsonValidationError', () => {
    fc.assert(
      fc.property(
        arbBlockMetadataJson,
        fc.oneof(
          fc.constant('not-a-date'),
          fc.constant('2024-13-45'), // Invalid month/day
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
        ),
        (data, invalidDate) => {
          const invalid = { ...data, dateCreated: invalidDate };

          expect(() => isBlockMetadataJson(invalid)).toThrow(
            JsonValidationError,
          );

          try {
            isBlockMetadataJson(invalid);
          } catch (error) {
            expect(error).toBeInstanceOf(JsonValidationError);
            expect((error as JsonValidationError).field).toBe('dateCreated');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5g: Valid EphemeralBlockMetadataJson passes type guard
   * For any valid EphemeralBlockMetadataJson object, isEphemeralBlockMetadataJson should return true
   *
   * Validates Requirements 4.1, 4.3
   */
  it('Property 5g: Valid EphemeralBlockMetadataJson passes type guard', () => {
    fc.assert(
      fc.property(arbEphemeralBlockMetadataJson, (data) => {
        expect(() => isEphemeralBlockMetadataJson(data)).not.toThrow();
        expect(isEphemeralBlockMetadataJson(data)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5h: Missing creator field throws JsonValidationError
   * For any EphemeralBlockMetadataJson without creator, validation should fail
   *
   * Validates Requirements 4.3, 4.4
   */
  it('Property 5h: Missing creator field throws JsonValidationError', () => {
    fc.assert(
      fc.property(arbEphemeralBlockMetadataJson, (data) => {
        const incomplete = { ...data };
        delete (incomplete as Record<string, unknown>)['creator'];

        expect(() => isEphemeralBlockMetadataJson(incomplete)).toThrow(
          JsonValidationError,
        );

        try {
          isEphemeralBlockMetadataJson(incomplete);
        } catch (error) {
          expect(error).toBeInstanceOf(JsonValidationError);
          expect((error as JsonValidationError).field).toBe('creator');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5i: Empty creator string throws JsonValidationError
   * For any EphemeralBlockMetadataJson with empty creator, validation should fail
   *
   * Validates Requirements 4.3, 4.4
   */
  it('Property 5i: Empty creator string throws JsonValidationError', () => {
    fc.assert(
      fc.property(arbEphemeralBlockMetadataJson, (data) => {
        const invalid = { ...data, creator: '' };

        expect(() => isEphemeralBlockMetadataJson(invalid)).toThrow(
          JsonValidationError,
        );

        try {
          isEphemeralBlockMetadataJson(invalid);
        } catch (error) {
          expect(error).toBeInstanceOf(JsonValidationError);
          expect((error as JsonValidationError).field).toBe('creator');
          expect((error as JsonValidationError).reason).toContain('empty');
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5j: Non-string creator throws JsonValidationError
   * For any EphemeralBlockMetadataJson with non-string creator, validation should fail
   *
   * Validates Requirements 4.3, 4.4
   */
  it('Property 5j: Non-string creator throws JsonValidationError', () => {
    fc.assert(
      fc.property(
        arbEphemeralBlockMetadataJson,
        fc.oneof(
          fc.integer(),
          fc.constant(null),
          fc.constant(undefined),
          fc.constant({}),
        ),
        (data, invalidCreator) => {
          const invalid = { ...data, creator: invalidCreator };

          expect(() => isEphemeralBlockMetadataJson(invalid)).toThrow(
            JsonValidationError,
          );

          try {
            isEphemeralBlockMetadataJson(invalid);
          } catch (error) {
            expect(error).toBeInstanceOf(JsonValidationError);
            expect((error as JsonValidationError).field).toBe('creator');
            expect((error as JsonValidationError).reason).toContain('string');
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5k: parseBlockMetadataJson parses valid JSON
   * For any valid BlockMetadataJson, parseBlockMetadataJson should successfully parse
   *
   * Validates Requirements 4.1, 4.2
   */
  it('Property 5k: parseBlockMetadataJson parses valid JSON', () => {
    fc.assert(
      fc.property(arbBlockMetadataJson, (data) => {
        const json = JSON.stringify(data);
        const parsed = parseBlockMetadataJson(json);

        expect(parsed.size).toBe(data.size);
        expect(parsed.type).toBe(data.type);
        expect(parsed.dataType).toBe(data.dataType);
        expect(parsed.lengthWithoutPadding).toBe(data.lengthWithoutPadding);
        expect(parsed.dateCreated).toEqual(data.dateCreated);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5l: parseBlockMetadataJson throws on invalid JSON syntax
   * For any invalid JSON string, parseBlockMetadataJson should throw JsonValidationError
   *
   * Validates Requirements 4.1, 4.4
   */
  it('Property 5l: parseBlockMetadataJson throws on invalid JSON syntax', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant('{invalid json}'),
          fc.constant('not json at all'),
          fc.constant('{'),
          fc.constant('{"unclosed": '),
        ),
        (invalidJson) => {
          expect(() => parseBlockMetadataJson(invalidJson)).toThrow(
            JsonValidationError,
          );

          try {
            parseBlockMetadataJson(invalidJson);
          } catch (error) {
            expect(error).toBeInstanceOf(JsonValidationError);
            expect((error as JsonValidationError).message).toContain(
              'JSON parsing failed',
            );
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  /**
   * Property 5m: parseEphemeralBlockMetadataJson parses valid JSON
   * For any valid EphemeralBlockMetadataJson, parseEphemeralBlockMetadataJson should successfully parse
   *
   * Validates Requirements 4.1, 4.3
   */
  it('Property 5m: parseEphemeralBlockMetadataJson parses valid JSON', () => {
    fc.assert(
      fc.property(arbEphemeralBlockMetadataJson, (data) => {
        const json = JSON.stringify(data);
        const parsed = parseEphemeralBlockMetadataJson(json);

        expect(parsed.size).toBe(data.size);
        expect(parsed.type).toBe(data.type);
        expect(parsed.dataType).toBe(data.dataType);
        expect(parsed.lengthWithoutPadding).toBe(data.lengthWithoutPadding);
        expect(parsed.dateCreated).toEqual(data.dateCreated);
        expect(parsed.creator).toBe(data.creator);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property 5n: Non-object data throws JsonValidationError
   * For any non-object value, type guards should throw JsonValidationError
   *
   * Validates Requirements 4.1, 4.4
   */
  it('Property 5n: Non-object data throws JsonValidationError', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.constant(null),
          fc.constant(undefined),
          fc.boolean(),
        ),
        (nonObject) => {
          expect(() => isBlockMetadataJson(nonObject)).toThrow(
            JsonValidationError,
          );

          try {
            isBlockMetadataJson(nonObject);
          } catch (error) {
            expect(error).toBeInstanceOf(JsonValidationError);
            expect((error as JsonValidationError).field).toBe('data');
            expect((error as JsonValidationError).reason).toContain(
              'non-null object',
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
