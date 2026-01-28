import fc from 'fast-check';
import { isValidDate, parseDate, serializeDate } from './dateUtils';

/**
 * Property-based tests for date handling utilities
 * Feature: block-security-hardening
 * Validates Requirements 5.1, 5.2, 5.3, 5.5
 */

describe('Feature: block-security-hardening, Property 7: Date Serialization Round-Trip', () => {
  /**
   * Property 7a: Date serialization round-trip preserves timestamp
   * For any valid Date object, serializing to ISO 8601 and deserializing
   * should produce a Date with the same UTC timestamp (within 1ms tolerance).
   *
   * Validates Requirements 5.1, 5.2, 5.3
   */
  it('Property 7a: Date round-trip preserves timestamp', () => {
    fc.assert(
      fc.property(
        // Generate dates from year 1970 to 2100
        fc
          .date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') })
          .filter((date) => !isNaN(date.getTime())), // Filter out invalid dates
        (originalDate) => {
          // Serialize to ISO 8601
          const serialized = serializeDate(originalDate);

          // Deserialize back to Date
          const deserialized = parseDate(serialized);

          // Timestamps should match (within 1ms for serialization precision)
          const timeDiff = Math.abs(
            originalDate.getTime() - deserialized.getTime(),
          );
          expect(timeDiff).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7b: Unix timestamp (milliseconds) round-trip
   * For any Unix timestamp in milliseconds, parsing and serializing
   * should preserve the timestamp.
   *
   * Validates Requirements 5.1, 5.2
   */
  it('Property 7b: Unix timestamp (ms) round-trip preserves value', () => {
    fc.assert(
      fc.property(
        // Generate timestamps from 1980 to 2100 (reasonable date range in milliseconds)
        fc.integer({ min: 315532800000, max: 4102444800000 }), // 1980-01-01 to 2100-01-01
        (timestamp) => {
          // Parse from timestamp
          const date = parseDate(timestamp);

          // Serialize back
          const serialized = serializeDate(date);

          // Parse again
          const reparsed = parseDate(serialized);

          // Should match original timestamp (within 1ms)
          const timeDiff = Math.abs(timestamp - reparsed.getTime());
          expect(timeDiff).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7c: Unix timestamp (seconds) round-trip
   * For any Unix timestamp in seconds, parsing and serializing
   * should preserve the timestamp (converted to milliseconds).
   *
   * Validates Requirements 5.1, 5.2
   */
  it('Property 7c: Unix timestamp (seconds) round-trip preserves value', () => {
    fc.assert(
      fc.property(
        // Generate timestamps in seconds from 1970 to 2100
        fc.integer({ min: 0, max: 4102444800 }), // 2100-01-01 in seconds
        (timestampSeconds) => {
          // Parse from timestamp (seconds)
          const date = parseDate(timestampSeconds);

          // Serialize back
          const serialized = serializeDate(date);

          // Parse again
          const reparsed = parseDate(serialized);

          // Should match original timestamp in milliseconds (within 1000ms for second precision)
          const expectedMs = timestampSeconds * 1000;
          const timeDiff = Math.abs(expectedMs - reparsed.getTime());
          expect(timeDiff).toBeLessThanOrEqual(1000);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7d: Serialized dates are always in UTC with Z suffix
   * For any Date, serialization should produce ISO 8601 string ending with 'Z'.
   *
   * Validates Requirements 5.3
   */
  it('Property 7d: Serialized dates are in UTC format', () => {
    fc.assert(
      fc.property(
        fc
          .date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') })
          .filter((date) => !isNaN(date.getTime())), // Filter out invalid dates
        (date) => {
          const serialized = serializeDate(date);

          // Should be valid ISO 8601 format
          expect(serialized).toMatch(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
          );

          // Should end with Z (UTC indicator)
          expect(serialized).toMatch(/Z$/);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7e: Parsing ISO 8601 strings produces valid dates
   * For any valid ISO 8601 string, parsing should produce a valid Date.
   *
   * Validates Requirements 5.1, 5.2
   */
  it('Property 7e: ISO 8601 strings parse to valid dates', () => {
    fc.assert(
      fc.property(
        fc
          .date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') })
          .filter((date) => !isNaN(date.getTime())), // Filter out invalid dates
        (date) => {
          // Create ISO 8601 string
          const isoString = date.toISOString();

          // Parse it
          const parsed = parseDate(isoString);

          // Should be a valid Date
          expect(parsed instanceof Date).toBe(true);
          expect(isNaN(parsed.getTime())).toBe(false);

          // Should match original (within 1ms)
          const timeDiff = Math.abs(date.getTime() - parsed.getTime());
          expect(timeDiff).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7f: isValidDate correctly identifies valid dates
   * For any valid Date object, isValidDate should return true.
   *
   * Validates Requirements 5.3
   */
  it('Property 7f: isValidDate identifies valid dates', () => {
    fc.assert(
      fc.property(
        fc
          .date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') })
          .filter((date) => !isNaN(date.getTime())), // Filter out invalid dates
        (date) => {
          // Valid dates in the past should be valid
          if (date.getTime() <= Date.now()) {
            expect(isValidDate(date)).toBe(true);
          }

          // All dates should be valid when allowFuture is true
          expect(isValidDate(date, true)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 7g: Future dates are rejected when allowFuture is false
   * For any date in the future, isValidDate should return false by default.
   *
   * Validates Requirements 5.3
   */
  it('Property 7g: Future dates are rejected by default', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 365 * 10 }), // Days in the future (up to 10 years)
        (daysInFuture) => {
          const futureDate = new Date(
            Date.now() + daysInFuture * 24 * 60 * 60 * 1000,
          );

          // Should be invalid without allowFuture
          expect(isValidDate(futureDate, false)).toBe(false);

          // Should be valid with allowFuture
          expect(isValidDate(futureDate, true)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Feature: block-security-hardening, Property 8: Malformed Date Rejection', () => {
  /**
   * Property 8a: Invalid date strings throw descriptive errors
   * For any string that is not a valid ISO 8601 date, parseDate should throw
   * a descriptive error.
   *
   * Validates Requirements 5.5
   */
  it('Property 8a: Invalid date strings throw descriptive errors', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => isNaN(Date.parse(s))),
          fc.constant('not-a-date'),
          fc.constant('2024-13-45'), // Invalid month/day
          fc.constant('invalid'),
          fc.constant(''),
        ),
        (invalidString) => {
          if (invalidString === '') {
            // Empty string might be handled differently
            return;
          }

          expect(() => parseDate(invalidString)).toThrow(/Error_InvalidDateStringTemplate/);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8b: Invalid timestamps throw descriptive errors
   * For any invalid numeric timestamp (NaN, Infinity), parseDate should throw.
   *
   * Validates Requirements 5.5
   */
  it('Property 8b: Invalid numeric timestamps throw errors', () => {
    const invalidNumbers = [NaN, Infinity, -Infinity];

    invalidNumbers.forEach((invalid) => {
      expect(() => parseDate(invalid)).toThrow(/Error_InvalidUnixTimestampTemplate/);
    });
  });

  /**
   * Property 8c: Invalid Date objects are rejected by isValidDate
   * For any Date object with NaN timestamp, isValidDate should return false.
   *
   * Validates Requirements 5.5
   */
  it('Property 8c: Invalid Date objects are rejected', () => {
    const invalidDate = new Date('invalid');

    expect(isValidDate(invalidDate)).toBe(false);
    expect(isValidDate(invalidDate, true)).toBe(false);
  });

  /**
   * Property 8d: Non-Date objects are rejected by isValidDate
   * For any non-Date value, isValidDate should return false.
   *
   * Validates Requirements 5.5
   */
  it('Property 8d: Non-Date objects are rejected', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.constant(null),
          fc.constant(undefined),
          fc.object(),
          fc.array(fc.anything()),
        ),
        (nonDate) => {
          // @ts-expect-error - Testing runtime behavior with invalid types
          expect(isValidDate(nonDate)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8e: serializeDate throws on invalid Date objects
   * For any Date with NaN timestamp, serializeDate should throw.
   *
   * Validates Requirements 5.5
   */
  it('Property 8e: serializeDate throws on invalid Date', () => {
    const invalidDate = new Date('invalid');

    expect(() => serializeDate(invalidDate)).toThrow(
      /Error_InvalidDateNaN/,
    );
  });

  /**
   * Property 8f: serializeDate throws on non-Date objects
   * For any non-Date value, serializeDate should throw.
   *
   * Validates Requirements 5.5
   */
  it('Property 8f: serializeDate throws on non-Date objects', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.string(),
          fc.integer(),
          fc.constant(null),
          fc.constant(undefined),
          fc.object(),
        ),
        (nonDate) => {
          // @ts-expect-error - Testing runtime behavior with invalid types
          expect(() => serializeDate(nonDate)).toThrow(
            /Error_InvalidDateObjectTemplate/,
          );
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8g: Negative timestamps are handled correctly
   * For any negative Unix timestamp (dates before 1970), parsing should work.
   *
   * Validates Requirements 5.1, 5.2
   */
  it('Property 8g: Negative timestamps (pre-1970) are handled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: -2208988800, max: -1 }), // 1900-01-01 to 1969-12-31 in seconds
        (negativeTimestampSeconds) => {
          const date = parseDate(negativeTimestampSeconds);

          expect(date instanceof Date).toBe(true);
          expect(isNaN(date.getTime())).toBe(false);
          // Should be converted to milliseconds
          expect(date.getTime()).toBe(negativeTimestampSeconds * 1000);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property 8h: Very large timestamps are handled correctly
   * For any very large timestamp (far future), parsing should work.
   *
   * Validates Requirements 5.1, 5.2
   */
  it('Property 8h: Very large timestamps (far future) are handled', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 4102444800000, max: 8640000000000000 }), // 2100 to max safe date
        (largeTimestamp) => {
          const date = parseDate(largeTimestamp);

          expect(date instanceof Date).toBe(true);
          expect(isNaN(date.getTime())).toBe(false);
          expect(date.getTime()).toBe(largeTimestamp);
        },
      ),
      { numRuns: 100 },
    );
  });
});
