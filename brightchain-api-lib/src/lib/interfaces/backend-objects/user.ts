import {
  AccountStatus,
  IUserBase,
} from '@digitaldefiance/suite-core-lib';
import { StringLanguage } from '../request-user';
import { Types } from 'mongoose';

export type IUserBackendObject = IUserBase<
  Types.ObjectId,
  Date,
  StringLanguage,
  AccountStatus
>;
