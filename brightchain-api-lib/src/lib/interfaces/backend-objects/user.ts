import {
  AccountStatus,
  CanaryStatus,
  IUserBase,
  StringLanguage,
} from '@brightchain/brightchain-lib';
import { Types } from 'mongoose';

export type IUserBackendObject = IUserBase<
  Types.ObjectId,
  Date,
  StringLanguage,
  AccountStatus,
  CanaryStatus
>;
