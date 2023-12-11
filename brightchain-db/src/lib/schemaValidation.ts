/**
 * Schema validation for BrightDB collections.
 *
 * Provides a lightweight JSON-Schema-like validator that can enforce
 * document structure on insert and update operations.
 *
 * Supported types: 'string', 'number', 'boolean', 'object', 'array', 'null', 'date', 'any'
 * Supported constraints:
 *   - required: array of required field names
 *   - properties: per-field type + constraints
 *   - minLength / maxLength: for strings and arrays
 *   - minimum / maximum: for numbers
 *   - pattern: regex pattern for strings
 *   - enum: allowed values
 *   - items: schema for array elements
 *   - additionalProperties: whether extra fields are allowed (default: true)
 */

import { ValidationError, ValidationFieldError } from './errors';
import type { BsonDocument, IndexOptions, IndexSpec } from './types';

// Lazy import for branded-interface registry to avoid hard dependency
let _getInterfaceById:
  | ((id: string) =>
      | {
          id: string;
          kind: string;
          definition: { validate: (v: unknown) => boolean };
        }
      | undefined)
  | undefined;

// ── Schema types ──

export type SchemaType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'null'
  | 'date'
  | 'any'
  | 'branded-primitive'
  | 'branded-interface';

export interface FieldSchema {
  /** Expected type */
  type?: SchemaType | SchemaType[];
  /** Whether this field is required (also settable at parent level via `required` array) */
  required?: boolean;
  /** Minimum value (number) or minimum length (string/array) */
  minimum?: number;
  /** Maximum value (number) or maximum length (string/array) */
  maximum?: number;
  /** Minimum string/array length */
  minLength?: number;
  /** Maximum string/array length */
  maxLength?: number;
  /** Regex pattern for string values */
  pattern?: string;
  /** Allowed values */
  enum?: unknown[];
  /** Schema for nested object properties */
  properties?: Record<string, FieldSchema>;
  /** Required fields in nested object */
  requiredFields?: string[];
  /** Schema for array items */
  items?: FieldSchema;
  /** Default value if field is missing */
  default?: unknown;
  /** Whether to allow extra properties (for objects) */
  additionalProperties?: boolean;
  /** Custom validation function */
  validate?: (value: unknown) => boolean | string;
  /** Reference name for branded-primitive or branded-interface types */
  ref?: string;
}

export interface CollectionSchema {
  /** Name of the schema (for error messages) */
  name?: string;
  /** Per-field definitions */
  properties: Record<string, FieldSchema>;
  /** Which fields are required */
  required?: string[];
  /** Allow fields not defined in properties (default: true) */
  additionalProperties?: boolean;
  /** When to validate: 'strict' = inserts and updates, 'moderate' = inserts only */
  validationLevel?: 'strict' | 'moderate' | 'off';
  /** What to do on failure: 'error' = throw, 'warn' = log and continue */
  validationAction?: 'error' | 'warn';
  /**
   * Indexes to create automatically when the schema is applied to a collection.
   * Each entry specifies the field(s) and options (e.g. unique constraint).
   */
  indexes?: Array<{ fields: IndexSpec; options?: IndexOptions }>;
}

// ── Validator ──

/**
 * Validate a document against a collection schema.
 *
 * @param doc - The document to validate
 * @param schema - The collection schema
 * @param collectionName - Collection name for error messages
 * @throws ValidationError if validationAction is 'error'
 * @returns Array of validation field errors (empty if valid)
 */
export function validateDocument(
  doc: BsonDocument,
  schema: CollectionSchema,
  collectionName: string,
): ValidationFieldError[] {
  if (schema.validationLevel === 'off') return [];

  const errors: ValidationFieldError[] = [];

  // Check required fields
  if (schema.required) {
    for (const field of schema.required) {
      if (field === '_id') continue; // _id is managed internally
      if (!(field in doc) || doc[field] === undefined) {
        errors.push({ field, message: `Required field "${field}" is missing` });
      }
    }
  }

  // Check defined properties
  if (schema.properties) {
    for (const [field, fieldSchema] of Object.entries(schema.properties)) {
      if (field === '_id') continue;
      const value = doc[field];

      if (value === undefined) {
        // Already checked in required above
        continue;
      }

      const fieldErrors = validateField(value, fieldSchema, field);
      errors.push(...fieldErrors);
    }
  }

  // Check additional properties
  if (schema.additionalProperties === false && schema.properties) {
    const allowed = new Set([...Object.keys(schema.properties), '_id']);
    for (const key of Object.keys(doc)) {
      if (!allowed.has(key)) {
        errors.push({
          field: key,
          message: `Additional property "${key}" is not allowed`,
          value: doc[key],
        });
      }
    }
  }

  if (errors.length > 0 && schema.validationAction !== 'warn') {
    throw new ValidationError(collectionName, errors);
  }

  return errors;
}

/**
 * Validate a single field value against a field schema.
 */
function validateField(
  value: unknown,
  schema: FieldSchema,
  fieldPath: string,
): ValidationFieldError[] {
  const errors: ValidationFieldError[] = [];

  // Type check
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((t) => matchesSchemaType(value, t))) {
      errors.push({
        field: fieldPath,
        message: `Expected type ${types.join(' | ')}, got ${getValueType(value)}`,
        value,
      });
      return errors; // Stop further checks if type is wrong
    }

    // Branded type validation via @digitaldefiance/branded-interface registry
    const singleType = types.length === 1 ? types[0] : undefined;
    if (
      singleType === 'branded-primitive' ||
      singleType === 'branded-interface'
    ) {
      const brandedErrors = validateBrandedField(
        value,
        schema,
        fieldPath,
        singleType,
      );
      if (brandedErrors.length > 0) {
        errors.push(...brandedErrors);
        return errors;
      }
    }
  }

  // Enum check
  if (schema.enum) {
    if (!schema.enum.some((e) => e === value)) {
      errors.push({
        field: fieldPath,
        message: `Value must be one of: ${schema.enum.map(String).join(', ')}`,
        value,
      });
    }
  }

  // String constraints
  if (typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        field: fieldPath,
        message: `String length ${value.length} is less than minimum ${schema.minLength}`,
        value,
      });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        field: fieldPath,
        message: `String length ${value.length} exceeds maximum ${schema.maxLength}`,
        value,
      });
    }
    if (schema.pattern) {
      const re = new RegExp(schema.pattern);
      if (!re.test(value)) {
        errors.push({
          field: fieldPath,
          message: `String does not match pattern "${schema.pattern}"`,
          value,
        });
      }
    }
  }

  // Number constraints
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({
        field: fieldPath,
        message: `Value ${value} is less than minimum ${schema.minimum}`,
        value,
      });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({
        field: fieldPath,
        message: `Value ${value} exceeds maximum ${schema.maximum}`,
        value,
      });
    }
  }

  // Array constraints
  if (Array.isArray(value)) {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        field: fieldPath,
        message: `Array length ${value.length} is less than minimum ${schema.minLength}`,
        value,
      });
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        field: fieldPath,
        message: `Array length ${value.length} exceeds maximum ${schema.maxLength}`,
        value,
      });
    }
    if (schema.items) {
      for (let i = 0; i < value.length; i++) {
        const itemErrors = validateField(
          value[i],
          schema.items,
          `${fieldPath}[${i}]`,
        );
        errors.push(...itemErrors);
      }
    }
  }

  // Nested object constraints
  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date)
  ) {
    const obj = value as Record<string, unknown>;

    if (schema.requiredFields) {
      for (const req of schema.requiredFields) {
        if (!(req in obj)) {
          errors.push({
            field: `${fieldPath}.${req}`,
            message: `Required field "${req}" is missing`,
          });
        }
      }
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (obj[key] !== undefined) {
          const propErrors = validateField(
            obj[key],
            propSchema,
            `${fieldPath}.${key}`,
          );
          errors.push(...propErrors);
        }
      }
    }

    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(obj)) {
        if (!allowed.has(key)) {
          errors.push({
            field: `${fieldPath}.${key}`,
            message: `Additional property "${key}" is not allowed`,
            value: obj[key],
          });
        }
      }
    }
  }

  // Custom validation
  if (schema.validate) {
    const result = schema.validate(value);
    if (result !== true) {
      errors.push({
        field: fieldPath,
        message:
          typeof result === 'string' ? result : `Custom validation failed`,
        value,
      });
    }
  }

  return errors;
}

/**
 * Apply default values from schema to a document (mutates a copy).
 */
export function applyDefaults(
  doc: BsonDocument,
  schema: CollectionSchema,
): BsonDocument {
  if (!schema.properties) return doc;
  const result = { ...doc };

  for (const [field, fieldSchema] of Object.entries(schema.properties)) {
    if (field === '_id') continue;
    if (result[field] === undefined && fieldSchema.default !== undefined) {
      result[field] =
        typeof fieldSchema.default === 'function'
          ? (fieldSchema.default as () => unknown)()
          : fieldSchema.default;
    }
  }

  return result;
}

// ── Helpers ──

/**
 * Validate a branded-primitive or branded-interface field against the
 * @digitaldefiance/branded-interface registry.
 */
function validateBrandedField(
  value: unknown,
  schema: FieldSchema,
  fieldPath: string,
  schemaType: 'branded-primitive' | 'branded-interface',
): ValidationFieldError[] {
  const errors: ValidationFieldError[] = [];
  const ref = schema.ref;

  if (!ref) {
    errors.push({
      field: fieldPath,
      message: `Field type "${schemaType}" requires a "ref" pointing to a registered branded type`,
      value,
    });
    return errors;
  }

  // Lazy-load the registry lookup to avoid hard dependency
  if (!_getInterfaceById) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@digitaldefiance/branded-interface');
      _getInterfaceById = mod.getInterfaceById;
    } catch {
      // Library not available — skip branded validation
      return errors;
    }
  }

  const entry = _getInterfaceById!(ref);
  if (!entry) {
    errors.push({
      field: fieldPath,
      message: `Branded type ref "${ref}" is not registered`,
      value,
    });
    return errors;
  }

  // Kind mismatch check
  const expectedKind =
    schemaType === 'branded-primitive' ? 'primitive' : 'interface';
  if (entry.kind !== expectedKind) {
    errors.push({
      field: fieldPath,
      message: `Branded type ref "${ref}" is kind "${entry.kind}" but field type is "${schemaType}" (expected kind "${expectedKind}")`,
      value,
    });
    return errors;
  }

  // Delegate to the registered definition's validate function
  if (entry.definition && typeof entry.definition.validate === 'function') {
    if (!entry.definition.validate(value)) {
      errors.push({
        field: fieldPath,
        message: `Value failed validation for branded type "${ref}"`,
        value,
      });
    }
  }

  return errors;
}

function matchesSchemaType(value: unknown, type: SchemaType): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'null':
      return value === null;
    case 'date':
      return value instanceof Date;
    case 'array':
      return Array.isArray(value);
    case 'object':
      return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value) &&
        !(value instanceof Date)
      );
    case 'any':
      return true;
    case 'branded-primitive':
      return true; // Defer to branded validation for actual type checking
    case 'branded-interface':
      return true; // Defer to branded validation for actual type checking
    default:
      return false;
  }
}

function getValueType(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (Array.isArray(value)) return 'array';
  if (value instanceof Date) return 'date';
  return typeof value;
}
