import { DefaultBackendIdType } from '../shared-types';

// Base document interface - no longer using Mongoose
export type IBaseDocument<
  T,
  I extends string = DefaultBackendIdType,
> = T & {
  _id: I;
};
