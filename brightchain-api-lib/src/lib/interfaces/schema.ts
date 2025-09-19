import { Model, Schema } from 'mongoose';
import { IBaseDocument } from '../documents/base';
import { IDiscriminatorCollections } from './discriminator-collections';

/**
 * Interface for each schema in the schema map
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface ISchema<T extends IBaseDocument<any>> {
  /**
   * The name of the collection, eg 'models'
   */
  collection: string;
  /**
   * The model for the schema
   */

  model: Model<T>;
  /**
   * The name of the model, eg 'Model'
   */
  modelName: string;
  /**
   * The schema for the model
   */
  schema: Schema;
  /**
   * Discriminators for the model
   */
  discriminators?: IDiscriminatorCollections<T>;
}
