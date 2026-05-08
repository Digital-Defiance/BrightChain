// Feature: brightdate-default-timestamp, Property 4: Ordering Preservation (Metamorphic)
// Feature: brightdate-default-timestamp, Property 5: compareBrightDates Antisymmetry
// Feature: brightdate-default-timestamp, Property 6: isInBrightDateRange Correctness
import * as fc from 'fast-check';
import { compareBrightDates, isInBrightDateRange } from './brightDateComparison';
import { brightDateToDate } from './brightDateConversions';

/**
 * Property 4: Ordering Preservation (Metamorphic)
 *
 * For any two BrightDateValues a and b in [-365250, 365250] that differ by at
 * least 1 millisecond (1/86400000 days ≈ 1.157e-8 days), so the difference is
 * representable in Date.getTime() resolution:
 * Math.sign(compareBrightDates(a, b)) SHALL equal
 * Math.sign(brightDateToDate(a).getTime() - brightDateToDate(b).getTime()).
 *
 * That is, numeric ordering of BrightDateValues preserves chronological ordering
 * for values distinguishable at millisecond resolution.
 *
 * **Validates: Requirements 3.4, 9.1, 9.4**
 */
describe('Feature: brightdate-default-timestamp, Property 4: Ordering Preservation (Metamorphic)', () => {
  // 1 millisecond expressed in days (the resolution of Date.getTime())
  const ONE_MS_IN_DAYS = 1 / 86400000;

  it('Math.sign(compareBrightDates(a, b)) equals Math.sign(brightDateToDate(a).getTime() - brightDateToDate(b).getTime())', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: -365250,
          max: 365250,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc.double({
          min: -365250,
          max: 365250,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        (a, b) => {
          // Skip pairs that are indistinguishable at millisecond resolution —
          // Date.getTime() cannot represent differences smaller than 1ms.
          fc.pre(Math.abs(a - b) >= ONE_MS_IN_DAYS);

          const numericSign = Math.sign(compareBrightDates(a, b));
          const chronologicalSign = Math.sign(
            brightDateToDate(a).getTime() - brightDateToDate(b).getTime(),
          );
          expect(numericSign).toBe(chronologicalSign);
        },
      ),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 5: compareBrightDates Antisymmetry
 *
 * For any two BrightDateValues a and b:
 * - compareBrightDates(a, a) SHALL equal 0 (reflexivity)
 * - Math.sign(compareBrightDates(a, b)) SHALL equal -Math.sign(compareBrightDates(b, a)) (antisymmetry)
 *
 * **Validates: Requirements 9.2**
 */
describe('Feature: brightdate-default-timestamp, Property 5: compareBrightDates Antisymmetry', () => {
  const brightDateArb = fc.double({
    min: -365250,
    max: 365250,
    noNaN: true,
    noDefaultInfinity: true,
  });

  it('compareBrightDates(a, a) === 0 (reflexivity)', () => {
    fc.assert(
      fc.property(brightDateArb, (a) => {
        expect(compareBrightDates(a, a)).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('Math.sign(compareBrightDates(a, b)) === -Math.sign(compareBrightDates(b, a)) (antisymmetry)', () => {
    fc.assert(
      fc.property(brightDateArb, brightDateArb, (a, b) => {
        const forward = Math.sign(compareBrightDates(a, b));
        const backward = Math.sign(compareBrightDates(b, a));
        // Use == 0 check to treat +0 and -0 as equal (both mean "equal dates")
        expect(forward + backward).toBe(0);
      }),
      { numRuns: 100 },
    );
  });
});

/**
 * Property 6: isInBrightDateRange Correctness
 *
 * For any BrightDateValue t and range bounds start <= end,
 * isInBrightDateRange(t, start, end) SHALL return true if and only if
 * start <= t && t <= end.
 *
 * **Validates: Requirements 9.3**
 */
describe('Feature: brightdate-default-timestamp, Property 6: isInBrightDateRange Correctness', () => {
  it('isInBrightDateRange(t, start, end) returns true iff start <= t && t <= end', () => {
    fc.assert(
      fc.property(
        fc.double({
          min: -365250,
          max: 365250,
          noNaN: true,
          noDefaultInfinity: true,
        }),
        fc
          .tuple(
            fc.double({
              min: -365250,
              max: 365250,
              noNaN: true,
              noDefaultInfinity: true,
            }),
            fc.double({
              min: -365250,
              max: 365250,
              noNaN: true,
              noDefaultInfinity: true,
            }),
          )
          .map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]),
        (t, [start, end]) => {
          const result = isInBrightDateRange(t, start, end);
          const expected = start <= t && t <= end;
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });
});
