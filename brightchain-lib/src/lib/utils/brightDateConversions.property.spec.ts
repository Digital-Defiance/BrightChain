// Feature: brightdate-default-timestamp, Property 1: BrightDateValue-to-Date Round-Trip
// Feature: brightdate-default-timestamp, Property 2: Date-to-BrightDateValue Round-Trip
// Feature: brightdate-default-timestamp, Property 7: normalizeToBrightDate Consistency
import * as fc from 'fast-check';
import {
  brightDateToDate,
  dateToBrightDate,
  normalizeToBrightDate,
} from './brightDateConversions';

/**
 * Property 1: BrightDateValue-to-Date Round-Trip
 *
 * For any valid BrightDateValue v in [-365250, 365250] (±1000 years from J2000),
 * converting to a Date via brightDateToDate(v) and back via dateToBrightDate(result)
 * SHALL produce a value within 0.000001 (1 microday) of the original.
 *
 * **Validates: Requirements 4.5**
 */
describe('Feature: brightdate-default-timestamp, Property 1: BrightDateValue-to-Date Round-Trip', () => {
  it('dateToBrightDate(brightDateToDate(v)) is within 0.000001 of v', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: -365250,
          max: 365250,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (v) => {
          const date = brightDateToDate(v);
          const roundTripped = dateToBrightDate(date);
          const diff = Math.abs(roundTripped - v);
          expect(diff).toBeLessThanOrEqual(0.000001);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 2: Date-to-BrightDateValue Round-Trip
 *
 * For any valid JavaScript Date d (within ±1000 years of J2000),
 * converting to BrightDateValue via dateToBrightDate(d) and back via
 * brightDateToDate(result) SHALL produce a Date whose getTime() differs
 * from the original by at most 86 milliseconds (1 microday).
 *
 * **Validates: Requirements 4.6**
 */
describe('Feature: brightdate-default-timestamp, Property 2: Date-to-BrightDateValue Round-Trip', () => {
  // J2000.0 epoch: January 1, 2000, 12:00:00 UTC
  const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0, 0);
  // ±1000 years in milliseconds
  const ONE_THOUSAND_YEARS_MS = 365250 * 24 * 60 * 60 * 1000;

  it('brightDateToDate(dateToBrightDate(d)).getTime() differs from d.getTime() by at most 86ms', () => {
    fc.assert(
      fc.property(
        fc
          .date({
            min: new Date(J2000_MS - ONE_THOUSAND_YEARS_MS),
            max: new Date(J2000_MS + ONE_THOUSAND_YEARS_MS),
          })
          .filter((d) => isFinite(d.getTime())),
        (d) => {
          const brightDateValue = dateToBrightDate(d);
          const roundTripped = brightDateToDate(brightDateValue);
          const diff = Math.abs(roundTripped.getTime() - d.getTime());
          expect(diff).toBeLessThanOrEqual(86);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 7: normalizeToBrightDate Consistency
 *
 * Part A (Idempotence): For any valid BrightDateValue v, normalizeToBrightDate(v)
 * SHALL return v exactly.
 *
 * Part B (Cross-type Consistency): For any valid Date d,
 * normalizeToBrightDate(d) SHALL equal normalizeToBrightDate(d.toISOString())
 * within 1 microday (0.000001) tolerance.
 *
 * **Validates: Requirements 3.3, 7.4, 10.4**
 */
describe('Feature: brightdate-default-timestamp, Property 7: normalizeToBrightDate Consistency', () => {
  // J2000.0 epoch: January 1, 2000, 12:00:00 UTC
  const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0, 0);
  // ±1000 years in milliseconds
  const ONE_THOUSAND_YEARS_MS = 365250 * 24 * 60 * 60 * 1000;

  it('normalizeToBrightDate(v) returns v exactly for any valid BrightDateValue (idempotence)', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: -365250,
          max: 365250,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (v) => {
          const result = normalizeToBrightDate(v);
          expect(result).toBe(v);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('normalizeToBrightDate(d) equals normalizeToBrightDate(d.toISOString()) within 1 microday', () => {
    fc.assert(
      fc.property(
        fc
          .date({
            min: new Date(J2000_MS - ONE_THOUSAND_YEARS_MS),
            max: new Date(J2000_MS + ONE_THOUSAND_YEARS_MS),
          })
          .filter((d) => isFinite(d.getTime())),
        (d) => {
          const fromDate = normalizeToBrightDate(d);
          const fromISO = normalizeToBrightDate(d.toISOString());
          const diff = Math.abs(fromDate - fromISO);
          expect(diff).toBeLessThanOrEqual(0.000001);
        },
      ),
      { numRuns: 100 },
    );
  });
});
