import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../../shared-types';
import { StringLanguage } from '../request-user';

export type IUserBackendObject = IUserBase<
  DefaultBackendIdType,
  Date,
  StringLanguage,
  AccountStatus
>;
