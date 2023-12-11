/**
 * Property 1: brandedField round-trip consistency
 *
 * For any registered BrandedPrimitiveDefinition and any string value,
 * brandedField(def) produces a FieldSchema such that validateDocument
 * returns zero errors iff def.validate(value) is true.
 *
 * Feature: brightchain-db-branded-schema, Property 1: brandedField round-trip consistency
 * Validates: Requirements 4.3, 2.2
 */

import {
  BlockIdPrimitive,
  PoolIdPrimitive,
  ShortHexGuidPrimitive,
  brandedField,
} from '@brightchain/brightchain-lib';
import type { BrandedPrimitiveDefinition } from '@digitaldefiance/branded-interface';
import * as fc from 'fast-check';
import { validateDocument } from '../lib/schemaValidation';
import type { CollectionSchema } from '../lib/types';

function schemaFor(def: BrandedPrimitiveDefinition<string>): CollectionSchema {
  return {
    properties: { f: brandedField(def) },
    validationAction: 'warn',
  };
}

describe('Property 1: brandedField round-trip consistency', () => {
  const cases = [
    { name: 'BlockIdPrimitive', def: BlockIdPrimitive },
    { name: 'PoolIdPrimitive', def: PoolIdPrimitive },
    { name: 'ShortHexGuidPrimitive', def: ShortHexGuidPrimitive },
  ] as const;

  for (const { name, def } of cases) {
    it(`validateDocument errors iff ${name}.validate(v) is false`, () => {
      const schema = schemaFor(def);
      fc.assert(
        fc.property(fc.string(), (v) => {
          const errors = validateDocument({ f: v }, schema, 'test');
          if (def.validate(v)) {
            expect(errors).toHaveLength(0);
          } else {
            expect(errors.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 },
      );
    });
  }
});
