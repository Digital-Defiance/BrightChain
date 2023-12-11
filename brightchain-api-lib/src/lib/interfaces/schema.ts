import { IDiscriminatorCollections } from './discriminator-collections';

/**
 * Interface for each schema in the schema map.
 *
 * NOTE: This interface is a legacy holdover from the Mongoose era.
 * The `IBlockStorageSchemaEntry` in shared-types.ts is the current equivalent.
 */
export interface ISchema<T = unknown> {
  /**
   * The name of the collection, eg 'models'
   */
  collection: string;
  /**
   * The model for the schema
   */
  model: unknown;
  /**
   * The name of the model, eg 'Model'
   */
  modelName: string;
  /**
   * The schema for the model
   */
  schema: unknown;
  /**
   * Discriminators for the model
   */
  discriminators?: IDiscriminatorCollections<T>;
}
