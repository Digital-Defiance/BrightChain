// Feature: brightdate-default-timestamp, Property 3: JSON Serialization Round-Trip
import * as fc from 'fast-check';
import { brightDateReplacer, brightDateReviver } from './brightDateJson';

/**
 * Property 3: JSON Serialization Round-Trip
 *
 * For any valid BrightDateValue v (finite number in [-365250, 365250]),
 * serializing an object { createdAt: v } with brightDateReplacer and
 * deserializing with brightDateReviver SHALL produce an object whose
 * `createdAt` field is exactly equal (===) to v.
 *
 * The result must be bit-exact — JSON number round-trip through float64
 * must preserve the value without any loss of precision.
 *
 * **Validates: Requirements 5.5**
 */
describe('Feature: brightdate-default-timestamp, Property 3: JSON Serialization Round-Trip', () => {
  const brightDateArb = fc.double({
    min: -365250,
    max: 365250,
    noNaN: true,
    noDefaultInfinity: true,
  });

  it('JSON.parse(JSON.stringify({ createdAt: v }, brightDateReplacer), brightDateReviver).createdAt === v', () => {
    fc.assert(
      fc.property(brightDateArb, (v) => {
        const serialized = JSON.stringify({ createdAt: v }, brightDateReplacer);
        const deserialized = JSON.parse(serialized, brightDateReviver) as {
          createdAt: number;
        };
        // Use === semantics as specified (note: -0 === 0 is true in JS,
        // and JSON cannot represent -0, so we use === not Object.is)
        expect(deserialized.createdAt === v).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  it('non-timestamp fields are NOT annotated and survive the round-trip as plain numbers', () => {
    fc.assert(
      fc.property(
        brightDateArb,
        fc.integer({ min: 0, max: 2 ** 31 - 1 }),
        (v, size) => {
          const obj = { createdAt: v, size };
          const serialized = JSON.stringify(obj, brightDateReplacer);
          const deserialized = JSON.parse(serialized, brightDateReviver) as {
            createdAt: number;
            size: number;
          };

          // Timestamp field round-trips exactly (using === not Object.is — -0 === 0 per spec)
          expect(deserialized.createdAt === v).toBe(true);

          // Non-timestamp field is NOT wrapped — survives as a plain number
          expect(deserialized.size).toBe(size);
          expect(typeof deserialized.size).toBe('number');
        },
      ),
      { numRuns: 100 },
    );
  });
});
