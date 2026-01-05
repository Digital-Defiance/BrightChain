import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { Types } from 'mongoose';
import { StringLanguage } from '../request-user';

export type IUserBackendObject = IUserBase<
  Types.ObjectId,
  Date,
  StringLanguage,
  AccountStatus
>;
