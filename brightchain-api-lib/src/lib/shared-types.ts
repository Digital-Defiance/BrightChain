import { ModelName } from './enumerations/model-name';
import { SchemaCollection } from './enumerations/schema-collection';

// Re-export SignatureBuffer and GuidV4Buffer from node-ecies-lib for internal use
export type {
  GuidV4Buffer,
  SignatureBuffer,
} from '@digitaldefiance/node-ecies-lib';

// Database-agnostic type aliases (mongo removed)
/* eslint-disable @typescript-eslint/no-explicit-any */
export type ClientSession = any;
/* eslint-enable @typescript-eslint/no-explicit-any */

// Use Buffer as the default backend ID type for Node.js backend
// Buffer is part of the PlatformID union and works with all Node.js operations
import type { DefaultBackendIdType as DefaultBackendIdType_ } from './types/backend-id';
export type DefaultBackendIdType = DefaultBackendIdType_;

/**
 * Block storage schema definition (replaces Mongoose Schema)
 */
export interface IBlockStorageSchema<T> {
  name: ModelName;
  fields: Record<string, unknown>;
  indexes?: Array<{
    fields: Record<string, number | undefined>;
    options?: Record<string, unknown>;
  }>;
  validate?: (doc: Partial<T>) => void;
}

/**
 * Block storage model definition (replaces Mongoose Model)
 */
export interface IBlockStorageModel<T> {
  readonly modelName: ModelName;
  readonly schema: IBlockStorageSchema<T>;
}

/**
 * Block storage schema entry (replaces ISchema from node-express-suite)
 */
export interface IBlockStorageSchemaEntry<T> {
  collection: SchemaCollection;
  model: IBlockStorageModel<T>;
  modelName: ModelName;
  schema: IBlockStorageSchema<T>;
}

/**
 * Schema map type for validation schemas
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SchemaMap = Record<string, IBlockStorageSchemaEntry<any>>;
