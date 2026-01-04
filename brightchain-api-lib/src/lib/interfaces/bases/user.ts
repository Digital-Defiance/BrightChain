import {
  AccountStatus,
  IUserBase,
} from '@digitaldefiance/suite-core-lib';
import { StringLanguage } from '../request-user';
import { DefaultBackendIdType } from '../../shared-types';

export type IUserBackend = IUserBase<
  DefaultBackendIdType,
  Date,
  StringLanguage,
  AccountStatus
>;
