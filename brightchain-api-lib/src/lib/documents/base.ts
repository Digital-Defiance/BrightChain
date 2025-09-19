import { Document, Types } from 'mongoose';
import { DefaultBackendIdType } from '../shared-types';

// Base document interface that extends Mongoose Document
export type IBaseDocument<
  T,
  I extends Types.ObjectId | string = DefaultBackendIdType,
> = Document<I> & T;
