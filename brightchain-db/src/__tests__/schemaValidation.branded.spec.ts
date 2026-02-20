/**
 * Unit tests for the branded-type dispatch block in validateField().
 *
 * Covers the error paths introduced by Requirement 2:
 *   - missing ref
 *   - unregistered ref
 *   - kind mismatch (interface ref used with branded-primitive field type)
 *   - valid branded-interface delegation
 */

import {
  createBrandedInterface,
  createBrandedPrimitive,
} from '@digitaldefiance/branded-interface';
import { ValidationError } from '../lib/errors';
import { validateDocument } from '../lib/schemaValidation';
import type { CollectionSchema } from '../lib/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal schema with a single branded-primitive field. */
function primitiveSchema(ref?: string): CollectionSchema {
  return {
    properties: {
      value: {
        type: 'branded-primitive',
        ...(ref !== undefined ? { ref } : {}),
      },
    },
    validationAction: 'warn',
  };
}

/** A minimal schema with a single branded-interface field. */
function interfaceSchema(ref?: string): CollectionSchema {
  return {
    properties: {
      value: {
        type: 'branded-interface',
        ...(ref !== undefined ? { ref } : {}),
      },
    },
    validationAction: 'warn',
  };
}

// ---------------------------------------------------------------------------
// Setup: register a test primitive and a test interface before each suite
// ---------------------------------------------------------------------------

const TEST_PRIMITIVE_ID = '__test_branded_unit_primitive__';
const TEST_INTERFACE_ID = '__test_branded_unit_interface__';

beforeAll(() => {
  // Register a simple test primitive (accepts any non-empty string)
  createBrandedPrimitive<string>(
    TEST_PRIMITIVE_ID,
    'string',
    (v) => v.length > 0,
  );

  // Register a simple test interface (accepts any plain object)
  createBrandedInterface(TEST_INTERFACE_ID, {});
});

// ---------------------------------------------------------------------------
// 2.2 — Error path: missing ref
// ---------------------------------------------------------------------------

describe('validateField — branded-primitive with no ref', () => {
  it('returns an error with a descriptive message when ref is absent', () => {
    const errors = validateDocument(
      { value: 'hello' },
      primitiveSchema(),
      'test',
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('value');
    expect(errors[0].message).toMatch(/ref/i);
  });

  it('returns an error for branded-interface with no ref', () => {
    const errors = validateDocument({ value: {} }, interfaceSchema(), 'test');
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('value');
    expect(errors[0].message).toMatch(/ref/i);
  });
});

// ---------------------------------------------------------------------------
// 2.2 — Error path: unregistered ref
// ---------------------------------------------------------------------------

describe('validateField — branded-primitive with unregistered ref', () => {
  it('returns an error naming the unregistered ref', () => {
    const errors = validateDocument(
      { value: 'hello' },
      primitiveSchema('__definitely_not_registered__'),
      'test',
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('value');
    expect(errors[0].message).toContain('__definitely_not_registered__');
  });
});

// ---------------------------------------------------------------------------
// 2.2 — Error path: kind mismatch (interface ref used with branded-primitive)
// ---------------------------------------------------------------------------

describe('validateField — kind mismatch', () => {
  it('returns a kind-mismatch error when ref points to an interface but type is branded-primitive', () => {
    // TEST_INTERFACE_ID is registered as kind='interface'
    const errors = validateDocument(
      { value: {} },
      primitiveSchema(TEST_INTERFACE_ID),
      'test',
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('value');
    expect(errors[0].message).toMatch(/kind/i);
    expect(errors[0].message).toContain(TEST_INTERFACE_ID);
  });

  it('returns a kind-mismatch error when ref points to a primitive but type is branded-interface', () => {
    // TEST_PRIMITIVE_ID is registered as kind='primitive'
    const errors = validateDocument(
      { value: 'hello' },
      interfaceSchema(TEST_PRIMITIVE_ID),
      'test',
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('value');
    expect(errors[0].message).toMatch(/kind/i);
    expect(errors[0].message).toContain(TEST_PRIMITIVE_ID);
  });
});

// ---------------------------------------------------------------------------
// 2.2 — Happy path: valid branded-interface delegation
// ---------------------------------------------------------------------------

describe('validateField — valid branded-interface delegation', () => {
  it('returns no errors when the value satisfies the registered interface', () => {
    // TEST_INTERFACE_ID accepts any plain object (empty schema)
    const errors = validateDocument(
      { value: { foo: 'bar' } },
      interfaceSchema(TEST_INTERFACE_ID),
      'test',
    );
    expect(errors).toHaveLength(0);
  });

  it('returns an error when the value does not satisfy the registered interface', () => {
    // A non-object value should fail the interface validate()
    const errors = validateDocument(
      { value: 'not-an-object' },
      interfaceSchema(TEST_INTERFACE_ID),
      'test',
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('value');
  });
});

// ---------------------------------------------------------------------------
// 2.2 — Happy path: valid branded-primitive delegation
// ---------------------------------------------------------------------------

describe('validateField — valid branded-primitive delegation', () => {
  it('returns no errors for a value that passes the primitive validate()', () => {
    const errors = validateDocument(
      { value: 'non-empty' },
      primitiveSchema(TEST_PRIMITIVE_ID),
      'test',
    );
    expect(errors).toHaveLength(0);
  });

  it('returns an error for a value that fails the primitive validate()', () => {
    // Empty string fails our test primitive (length > 0)
    const errors = validateDocument(
      { value: '' },
      primitiveSchema(TEST_PRIMITIVE_ID),
      'test',
    );
    expect(errors).toHaveLength(1);
    expect(errors[0].field).toBe('value');
    expect(errors[0].message).toContain(TEST_PRIMITIVE_ID);
  });

  it('throws ValidationError when validationAction is error (default)', () => {
    const schema: CollectionSchema = {
      properties: {
        value: { type: 'branded-primitive', ref: TEST_PRIMITIVE_ID },
      },
    };
    expect(() => validateDocument({ value: '' }, schema, 'test')).toThrow(
      ValidationError,
    );
  });
});
