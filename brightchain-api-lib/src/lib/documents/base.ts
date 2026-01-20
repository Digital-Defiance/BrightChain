import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import { DefaultBackendIdType } from '../shared-types';

// Base document interface - no longer using Mongoose
export type IBaseDocument<
  T,
  TID extends PlatformID = DefaultBackendIdType,
> = T & {
  _id: TID;
};
