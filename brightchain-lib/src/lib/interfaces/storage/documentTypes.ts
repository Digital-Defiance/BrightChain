/**
 * Platform-agnostic document store types.
 *
 * These types define the core document/schema contracts shared across
 * brightchain-lib, brightchain-api-lib, and brightchain-db.
 * They are intentionally free of any Node.js or Express dependencies.
 *
 * Additional storage-specific types (FilterQuery, UpdateOperators, IndexOptions,
 * CollectionSchema, etc.) live in brightchain-api-lib's document-types re-export
 * from @digitaldefiance/node-express-suite.
 */

/** A document ID – opaque string. */
export type DocumentId = string;

/** The shape of a stored document – any record with an optional _id. */
export type BsonDocument = Record<string, unknown> & { _id?: DocumentId };

/**
 * Per-field schema definition for collection validation.
 */
export interface FieldSchema {
  /** Expected type */
  type?:
    | 'string'
    | 'number'
    | 'boolean'
    | 'object'
    | 'array'
    | 'null'
    | 'date'
    | 'any'
    | 'branded-primitive'
    | 'branded-interface'
    | Array<
        | 'string'
        | 'number'
        | 'boolean'
        | 'object'
        | 'array'
        | 'null'
        | 'date'
        | 'any'
        | 'branded-primitive'
        | 'branded-interface'
      >;
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
  /** Branded primitive or interface ID to resolve from the Interface_Registry */
  ref?: string;
}

/**
 * A field-level validation error returned by schema validation.
 */
export interface ValidationFieldError {
  field: string;
  message: string;
  value?: unknown;
}
