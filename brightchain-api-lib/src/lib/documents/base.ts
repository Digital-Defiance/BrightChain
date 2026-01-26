import { PlatformID } from '@digitaldefiance/node-ecies-lib';
import type { DefaultBackendIdType } from '../types/backend-id';

// Base document interface - no longer using Mongoose
export type IBaseDocument<
  T,
  TID extends PlatformID = DefaultBackendIdType,
> = T & {
  _id: TID;
};
