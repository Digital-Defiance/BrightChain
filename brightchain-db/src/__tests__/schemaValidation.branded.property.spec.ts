/**
 * Property-based tests for branded-type dispatch in validateDocument().
 *
 * Feature: brightchain-db-branded-schema
 *
 * Property 3: validateDocument branded-primitive integration
 *   Validates: Requirements 2.1, 2.2, 2.7
 *
 * Property 4: Unregistered ref always produces an error
 *   Validates: Requirements 2.5
 */

import { BlockIdPrimitive } from '@brightchain/brightchain-lib';
import * as fc from 'fast-check';
import { validateDocument } from '../lib/schemaValidation';
import type { CollectionSchema } from '../lib/types';

// ---------------------------------------------------------------------------
// Schema helpers
// ---------------------------------------------------------------------------

/** Single-field schema using BlockIdPrimitive via branded-primitive type. */
const blockIdSchema: CollectionSchema = {
  properties: {
    f: { type: 'branded-primitive', ref: BlockIdPrimitive.id },
  },
  validationAction: 'warn',
};

/** Single-field schema with an unregistered ref. */
function unregisteredRefSchema(ref: string): CollectionSchema {
  return {
    properties: {
      f: { type: 'branded-primitive', ref },
    },
    validationAction: 'warn',
  };
}

// ---------------------------------------------------------------------------
// Property 3: validateDocument branded-primitive integration
// ---------------------------------------------------------------------------

describe('Property 3: validateDocument branded-primitive integration', () => {
  /**
   * For any string value, validateDocument with a branded-primitive field
   * referencing BlockIdPrimitive returns zero errors iff BlockIdPrimitive.validate(v).
   *
   * Feature: brightchain-db-branded-schema, Property 3: validateDocument branded-primitive integration
   * Validates: Requirements 2.1, 2.2, 2.7
   */
  it('returns errors iff BlockIdPrimitive.validate(v) is false', () => {
    fc.assert(
      fc.property(fc.string(), (v) => {
        const errors = validateDocument({ f: v }, blockIdSchema, 'test');
        const primitiveAccepts = BlockIdPrimitive.validate(v);
        if (primitiveAccepts) {
          expect(errors).toHaveLength(0);
        } else {
          expect(errors.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('always passes for a known-valid BlockId (64 hex chars)', () => {
    const validId = 'a'.repeat(64);
    expect(BlockIdPrimitive.validate(validId)).toBe(true);
    const errors = validateDocument({ f: validId }, blockIdSchema, 'test');
    expect(errors).toHaveLength(0);
  });

  it('always fails for an empty string', () => {
    const errors = validateDocument({ f: '' }, blockIdSchema, 'test');
    expect(errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Property 4: Unregistered ref always produces an error
// ---------------------------------------------------------------------------

describe('Property 4: Unregistered ref always produces an error', () => {
  // Known registered IDs to exclude from the generator
  const knownIds = new Set([
    BlockIdPrimitive.id,
    'PoolId',
    'ShortHexGuid',
    'EmailString',
    'Iso8601Timestamp',
    '__test_branded_unit_primitive__',
    '__test_branded_unit_interface__',
  ]);

  /**
   * For any non-empty ref string that is not registered in the Interface_Registry,
   * validateDocument always returns at least one error regardless of value.
   * (undefined values are excluded — validateDocument skips absent fields by design)
   *
   * Feature: brightchain-db-branded-schema, Property 4: Unregistered ref always produces an error
   * Validates: Requirements 2.5
   */
  it('always errors for any value when ref is not registered', () => {
    fc.assert(
      fc.property(
        // Non-empty strings that aren't registered IDs
        fc.string({ minLength: 1 }).filter((s) => !knownIds.has(s)),
        // Any defined value (undefined would be skipped by validateDocument)
        fc.anything().filter((v) => v !== undefined),
        (ref, value) => {
          const errors = validateDocument(
            { f: value },
            unregisteredRefSchema(ref),
            'test',
          );
          expect(errors.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
