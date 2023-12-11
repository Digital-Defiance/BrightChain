import { AccountStatus, IUserBase } from '@digitaldefiance/suite-core-lib';
import { DefaultBackendIdType } from '../../shared-types';
import { StringLanguage } from '../request-user';

export type IUserBackend = IUserBase<
  DefaultBackendIdType,
  Date,
  StringLanguage,
  AccountStatus
>;
