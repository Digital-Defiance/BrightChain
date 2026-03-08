import { ModelName } from './enumerations/model-name';
import { SchemaCollection } from './enumerations/schema-collection';

// Re-export generic types from the Suite
export type {
  GuidV4Buffer,
  SignatureBuffer,
  ClientSession,
  DefaultBackendIdType,
} from '@brightchain/node-express-suite';

// Import generic interfaces from the Suite for narrowing
import type {
  IBlockStorageSchema as IBlockStorageSchemaBase,
  IBlockStorageModel as IBlockStorageModelBase,
  IBlockStorageSchemaEntry as IBlockStorageSchemaEntryBase,
} from '@brightchain/node-express-suite';

/**
 * Block storage schema definition narrowed with domain-specific ModelName enum.
 */
export interface IBlockStorageSchema<T> extends Omit<IBlockStorageSchemaBase<T>, 'name'> {
  name: ModelName;
}

/**
 * Block storage model definition narrowed with domain-specific ModelName enum.
 */
export interface IBlockStorageModel<T> {
  readonly modelName: ModelName;
  readonly schema: IBlockStorageSchema<T>;
}

/**
 * Block storage schema entry narrowed with domain-specific enums.
 */
export interface IBlockStorageSchemaEntry<T>
  extends Omit<IBlockStorageSchemaEntryBase<T>, 'collection' | 'model' | 'modelName' | 'schema'> {
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
