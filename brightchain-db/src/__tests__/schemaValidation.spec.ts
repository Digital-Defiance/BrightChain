/**
 * Schema validation – unit tests.
 */

import { ValidationError } from '../lib/errors';
import {
  applyDefaults,
  CollectionSchema,
  validateDocument,
} from '../lib/schemaValidation';

const baseSchema: CollectionSchema = {
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 100 },
    age: { type: 'number', minimum: 0, maximum: 200 },
    email: { type: 'string', pattern: '^[^@]+@[^@]+$' },
    role: { type: 'string', enum: ['admin', 'user', 'guest'] },
  },
  required: ['name'],
};

describe('validateDocument', () => {
  it('should pass for a valid document', () => {
    const errors = validateDocument(
      { _id: '1', name: 'Alice', age: 30, email: 'a@b.com', role: 'admin' },
      baseSchema,
      'users',
    );
    expect(errors).toHaveLength(0);
  });

  it('should throw on missing required field', () => {
    expect(() =>
      validateDocument({ _id: '1', age: 20 }, baseSchema, 'users'),
    ).toThrow(ValidationError);
  });

  it('should report type mismatch', () => {
    expect(() =>
      validateDocument({ _id: '1', name: 123 }, baseSchema, 'users'),
    ).toThrow(ValidationError);
  });

  it('should reject string below minLength', () => {
    expect(() =>
      validateDocument({ _id: '1', name: '' }, baseSchema, 'users'),
    ).toThrow(ValidationError);
  });

  it('should reject string above maxLength', () => {
    expect(() =>
      validateDocument(
        { _id: '1', name: 'x'.repeat(101) },
        baseSchema,
        'users',
      ),
    ).toThrow(ValidationError);
  });

  it('should reject number below minimum', () => {
    expect(() =>
      validateDocument({ _id: '1', name: 'Al', age: -1 }, baseSchema, 'users'),
    ).toThrow(ValidationError);
  });

  it('should reject number above maximum', () => {
    expect(() =>
      validateDocument({ _id: '1', name: 'Al', age: 201 }, baseSchema, 'users'),
    ).toThrow(ValidationError);
  });

  it('should reject string not matching pattern', () => {
    expect(() =>
      validateDocument(
        { _id: '1', name: 'Al', email: 'no-at-sign' },
        baseSchema,
        'users',
      ),
    ).toThrow(ValidationError);
  });

  it('should reject value not in enum', () => {
    expect(() =>
      validateDocument(
        { _id: '1', name: 'Al', role: 'superadmin' },
        baseSchema,
        'users',
      ),
    ).toThrow(ValidationError);
  });

  it('should skip validation when validationLevel is off', () => {
    const schema: CollectionSchema = {
      ...baseSchema,
      validationLevel: 'off',
    };
    const errors = validateDocument({ name: 123 }, schema, 'users');
    expect(errors).toHaveLength(0);
  });

  it('should return errors when validationAction is warn', () => {
    const schema: CollectionSchema = {
      ...baseSchema,
      validationAction: 'warn',
    };
    const errors = validateDocument({ _id: '1' }, schema, 'users');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].field).toBe('name');
  });

  it('should reject additional properties when not allowed', () => {
    const schema: CollectionSchema = {
      properties: { name: { type: 'string' } },
      additionalProperties: false,
    };
    expect(() =>
      validateDocument({ _id: '1', name: 'Al', extra: true }, schema, 'test'),
    ).toThrow(ValidationError);
  });

  it('should allow additional properties by default', () => {
    const schema: CollectionSchema = {
      properties: { name: { type: 'string' } },
    };
    const errors = validateDocument(
      { _id: '1', name: 'Al', extra: true },
      schema,
      'test',
    );
    expect(errors).toHaveLength(0);
  });

  it('should validate nested objects', () => {
    const schema: CollectionSchema = {
      properties: {
        address: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            zip: { type: 'string', pattern: '^\\d{5}$' },
          },
          requiredFields: ['city'],
        },
      },
    };
    // Valid
    const errors = validateDocument(
      { address: { city: 'NYC', zip: '10001' } },
      schema,
      'test',
    );
    expect(errors).toHaveLength(0);
    // Missing required nested field
    expect(() =>
      validateDocument({ address: { zip: '10001' } }, schema, 'test'),
    ).toThrow(ValidationError);
  });

  it('should validate array items', () => {
    const schema: CollectionSchema = {
      properties: {
        tags: {
          type: 'array',
          items: { type: 'string' },
          minLength: 1,
          maxLength: 5,
        },
      },
    };
    // Valid
    const errors = validateDocument({ tags: ['a', 'b'] }, schema, 'test');
    expect(errors).toHaveLength(0);
    // Empty array below minLength
    expect(() => validateDocument({ tags: [] }, schema, 'test')).toThrow(
      ValidationError,
    );
    // Wrong item type
    expect(() => validateDocument({ tags: [1, 2] }, schema, 'test')).toThrow(
      ValidationError,
    );
  });

  it('should support custom validate function', () => {
    const schema: CollectionSchema = {
      properties: {
        even: {
          type: 'number',
          validate: (v) => (v as number) % 2 === 0 || 'must be even',
        },
      },
    };
    const errors = validateDocument({ even: 4 }, schema, 'test');
    expect(errors).toHaveLength(0);
    expect(() => validateDocument({ even: 3 }, schema, 'test')).toThrow(
      ValidationError,
    );
  });

  it('should support multi-type fields', () => {
    const schema: CollectionSchema = {
      properties: {
        value: { type: ['string', 'number'] },
      },
    };
    expect(validateDocument({ value: 'hi' }, schema, 'test')).toHaveLength(0);
    expect(validateDocument({ value: 42 }, schema, 'test')).toHaveLength(0);
    expect(() => validateDocument({ value: true }, schema, 'test')).toThrow(
      ValidationError,
    );
  });
});

describe('applyDefaults', () => {
  it('should fill in default values for missing fields', () => {
    const schema: CollectionSchema = {
      properties: {
        role: { type: 'string', default: 'user' },
        count: { type: 'number', default: 0 },
      },
    };
    const result = applyDefaults({ name: 'Al' }, schema);
    expect(result['role']).toBe('user');
    expect(result['count']).toBe(0);
    expect(result['name']).toBe('Al');
  });

  it('should not overwrite existing values', () => {
    const schema: CollectionSchema = {
      properties: {
        role: { type: 'string', default: 'user' },
      },
    };
    const result = applyDefaults({ role: 'admin' }, schema);
    expect(result['role']).toBe('admin');
  });

  it('should support function defaults', () => {
    let counter = 0;
    const schema: CollectionSchema = {
      properties: {
        seq: { type: 'number', default: () => ++counter },
      },
    };
    const r1 = applyDefaults({}, schema);
    const r2 = applyDefaults({}, schema);
    expect(r1['seq']).toBe(1);
    expect(r2['seq']).toBe(2);
  });

  it('should not modify the original document', () => {
    const schema: CollectionSchema = {
      properties: { x: { default: 1 } },
    };
    const original = { name: 'test' };
    const result = applyDefaults(original, schema);
    expect(original).not.toHaveProperty('x');
    expect(result).toHaveProperty('x', 1);
  });
});
