import { Model } from 'mongoose';
import { IBaseDocument } from '../documents/base';

export interface IDiscriminatorCollections<T extends IBaseDocument<any>> {
  byType: Record<string, Model<T>>;
  array: Array<Model<T>>;
}
